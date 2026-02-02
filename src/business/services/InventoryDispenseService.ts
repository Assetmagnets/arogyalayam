// ============================================================================
// HMS - Enterprise Hospital Management System
// Inventory Dispense Service
// Implements: FEFO (First Expiry First Out) Algorithm
// ============================================================================

import { PrismaClient, Prisma, InventoryBatch, BatchStatus } from '@prisma/client';
import {
    DispenseRequest,
    DispenseRequestSchema,
    DispenseResult,
} from '../../types';

// ============================================================================
// TYPES
// ============================================================================

interface BatchDispenseRecord {
    batchId: string;
    batchNumber: string;
    quantityDispensed: number;
    expiryDate: Date;
    unitPrice: number;
}

interface AvailableBatch {
    id: string;
    batchNumber: string;
    expiryDate: Date;
    currentQty: number;
    sellingPrice: Prisma.Decimal;
    inventoryItemId: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class InventoryDispenseService {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    // ==========================================================================
    // FEFO ALGORITHM IMPLEMENTATION
    // ==========================================================================

    /**
     * Dispense inventory using FEFO (First Expiry First Out) algorithm
     * 
     * Algorithm:
     * 1. Receive dispense request (drugId, quantity, hospitalId)
     * 2. Fetch all batches WHERE drugId = request.drugId 
     *    AND expiryDate > NOW() AND quantity > 0
     *    ORDER BY expiryDate ASC (earliest expiry first)
     * 3. For each batch in batches:
     *    a. If remaining quantity to dispense <= batch.quantity:
     *       - Deduct from this batch
     *       - Return success
     *    b. Else:
     *       - Consume entire batch
     *       - Subtract batch.quantity from remaining
     *       - Continue to next batch
     * 4. If remaining > 0 after all batches:
     *    - Rollback transaction
     *    - Return insufficient stock error
     * 
     * @param request - Dispense request with drugId, quantity, hospitalId
     * @returns DispenseResult with dispensed batch details or error
     */
    async dispenseByFEFO(request: DispenseRequest): Promise<DispenseResult> {
        // Step 1: Validate input
        const validationResult = DispenseRequestSchema.safeParse(request);

        if (!validationResult.success) {
            return {
                success: false,
                dispensedBatches: [],
                totalDispensed: 0,
                remainingRequest: request.quantity,
                error: `Validation failed: ${validationResult.error.errors.map((e: { message: string }) => e.message).join(', ')}`,
            };
        }

        const { drugId, quantity, hospitalId } = validationResult.data;

        // Execute dispense within a transaction for atomicity
        try {
            const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                // Step 2: Get inventory item for this drug at this hospital
                const inventoryItem = await tx.inventoryItem.findFirst({
                    where: {
                        hospitalId,
                        drugId,
                        deletedAt: null,
                        isActive: true,
                    },
                });

                if (!inventoryItem) {
                    throw new InventoryError(
                        'ITEM_NOT_FOUND',
                        `Drug not found in inventory for this hospital`
                    );
                }

                // Step 3: Fetch all available batches sorted by expiry date (FEFO)
                const availableBatches = await tx.inventoryBatch.findMany({
                    where: {
                        inventoryItemId: inventoryItem.id,
                        expiryDate: {
                            gt: new Date(), // Not expired
                        },
                        currentQty: {
                            gt: 0, // Has stock
                        },
                        status: {
                            in: ['AVAILABLE', 'LOW_STOCK'],
                        },
                    },
                    orderBy: {
                        expiryDate: 'asc', // First Expiry First Out
                    },
                });

                if (availableBatches.length === 0) {
                    throw new InventoryError(
                        'NO_STOCK',
                        'No available stock for this drug'
                    );
                }

                // Calculate total available quantity
                const totalAvailable = availableBatches.reduce(
                    (sum: number, batch: { currentQty: number }) => sum + batch.currentQty,
                    0
                );

                if (totalAvailable < quantity) {
                    throw new InventoryError(
                        'INSUFFICIENT_STOCK',
                        `Insufficient stock. Requested: ${quantity}, Available: ${totalAvailable}`
                    );
                }

                // Step 4: Dispense from batches using FEFO
                const dispensedBatches: BatchDispenseRecord[] = [];
                let remainingToDispense = quantity;

                for (const batch of availableBatches) {
                    if (remainingToDispense <= 0) break;

                    // Calculate how much to take from this batch
                    const quantityFromBatch = Math.min(batch.currentQty, remainingToDispense);
                    const newBatchQty = batch.currentQty - quantityFromBatch;

                    // Update batch quantity
                    await tx.inventoryBatch.update({
                        where: { id: batch.id },
                        data: {
                            currentQty: newBatchQty,
                            status: this.determineBatchStatus(newBatchQty, batch.expiryDate),
                            updatedAt: new Date(),
                        },
                    });

                    // Record the dispense
                    dispensedBatches.push({
                        batchId: batch.id,
                        batchNumber: batch.batchNumber,
                        quantityDispensed: quantityFromBatch,
                        expiryDate: batch.expiryDate,
                        unitPrice: Number(batch.sellingPrice),
                    });

                    remainingToDispense -= quantityFromBatch;
                }

                // Step 5: Update inventory item's current stock
                await this.updateInventoryItemStock(tx, inventoryItem.id);

                return {
                    success: true,
                    dispensedBatches,
                    totalDispensed: quantity - remainingToDispense,
                    remainingRequest: remainingToDispense,
                };
            }, {
                maxWait: 5000, // 5 seconds max wait for transaction
                timeout: 10000, // 10 seconds timeout
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // Prevent race conditions
            });

            return result;
        } catch (error) {
            if (error instanceof InventoryError) {
                return {
                    success: false,
                    dispensedBatches: [],
                    totalDispensed: 0,
                    remainingRequest: quantity,
                    error: error.message,
                };
            }

            // Handle Prisma-specific errors
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2034') {
                    // Transaction conflict - retry recommended
                    return {
                        success: false,
                        dispensedBatches: [],
                        totalDispensed: 0,
                        remainingRequest: quantity,
                        error: 'Transaction conflict. Please retry.',
                    };
                }
            }

            throw error; // Re-throw unexpected errors
        }
    }

    // ==========================================================================
    // BATCH DISPENSE FOR PRESCRIPTION
    // ==========================================================================

    /**
     * Dispense multiple drugs from a prescription
     * All-or-nothing transaction - if any drug fails, entire dispense is rolled back
     * 
     * @param prescriptionId - Prescription ID
     * @param hospitalId - Hospital ID
     * @param items - Array of items to dispense
     * @param userId - User performing dispense
     * @returns Combined dispense result
     */
    async dispenseFromPrescription(
        prescriptionId: string,
        hospitalId: string,
        items: Array<{ drugId: string; quantity: number }>,
        userId: string
    ): Promise<{
        success: boolean;
        dispenseId?: string;
        results: DispenseResult[];
        totalAmount: number;
        error?: string;
    }> {
        try {
            const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                const allResults: DispenseResult[] = [];
                const allDispensedBatches: Array<{
                    batchId: string;
                    quantity: number;
                    unitPrice: number;
                }> = [];
                let totalAmount = 0;

                // Process each item
                for (const item of items) {
                    // Get inventory item
                    const inventoryItem = await tx.inventoryItem.findFirst({
                        where: {
                            hospitalId,
                            drugId: item.drugId,
                            deletedAt: null,
                            isActive: true,
                        },
                    });

                    if (!inventoryItem) {
                        throw new InventoryError(
                            'ITEM_NOT_FOUND',
                            `Drug ${item.drugId} not found in inventory`
                        );
                    }

                    // Fetch available batches (FEFO)
                    const availableBatches = await tx.inventoryBatch.findMany({
                        where: {
                            inventoryItemId: inventoryItem.id,
                            expiryDate: { gt: new Date() },
                            currentQty: { gt: 0 },
                            status: { in: ['AVAILABLE', 'LOW_STOCK'] },
                        },
                        orderBy: { expiryDate: 'asc' },
                    });

                    const totalAvailable = availableBatches.reduce(
                        (sum: number, batch: { currentQty: number }) => sum + batch.currentQty,
                        0
                    );

                    if (totalAvailable < item.quantity) {
                        throw new InventoryError(
                            'INSUFFICIENT_STOCK',
                            `Insufficient stock for drug ${item.drugId}. Requested: ${item.quantity}, Available: ${totalAvailable}`
                        );
                    }

                    // Dispense using FEFO
                    const dispensedBatches: BatchDispenseRecord[] = [];
                    let remaining = item.quantity;

                    for (const batch of availableBatches) {
                        if (remaining <= 0) break;

                        const qty = Math.min(batch.currentQty, remaining);
                        const newQty = batch.currentQty - qty;

                        await tx.inventoryBatch.update({
                            where: { id: batch.id },
                            data: {
                                currentQty: newQty,
                                status: this.determineBatchStatus(newQty, batch.expiryDate),
                            },
                        });

                        dispensedBatches.push({
                            batchId: batch.id,
                            batchNumber: batch.batchNumber,
                            quantityDispensed: qty,
                            expiryDate: batch.expiryDate,
                            unitPrice: Number(batch.sellingPrice),
                        });

                        allDispensedBatches.push({
                            batchId: batch.id,
                            quantity: qty,
                            unitPrice: Number(batch.sellingPrice),
                        });

                        totalAmount += qty * Number(batch.sellingPrice);
                        remaining -= qty;
                    }

                    // Update inventory stock
                    await this.updateInventoryItemStock(tx, inventoryItem.id);

                    allResults.push({
                        success: true,
                        dispensedBatches,
                        totalDispensed: item.quantity,
                        remainingRequest: 0,
                    });
                }

                // Create dispense record
                const dispenseNo = await this.generateDispenseNumber(tx, hospitalId);

                const dispense = await tx.inventoryDispense.create({
                    data: {
                        dispenseNo,
                        prescriptionId,
                        dispenseType: 'PRESCRIPTION',
                        subtotal: totalAmount,
                        discountAmount: 0,
                        taxAmount: 0,
                        totalAmount,
                        createdBy: userId,
                        updatedBy: userId,
                        items: {
                            create: allDispensedBatches.map((batch) => ({
                                batchId: batch.batchId,
                                quantity: batch.quantity,
                                unitPrice: batch.unitPrice,
                                totalPrice: batch.quantity * batch.unitPrice,
                            })),
                        },
                    },
                });

                // Update prescription status
                await tx.prescription.update({
                    where: { id: prescriptionId },
                    data: {
                        isDispensed: true,
                        dispensedAt: new Date(),
                        dispensedBy: userId,
                    },
                });

                return {
                    success: true,
                    dispenseId: dispense.id,
                    results: allResults,
                    totalAmount,
                };
            }, {
                maxWait: 10000,
                timeout: 30000,
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            });

            return result;
        } catch (error) {
            if (error instanceof InventoryError) {
                return {
                    success: false,
                    results: [],
                    totalAmount: 0,
                    error: error.message,
                };
            }
            throw error;
        }
    }

    // ==========================================================================
    // STOCK CHECK
    // ==========================================================================

    /**
     * Check stock availability for a drug
     */
    async checkStockAvailability(
        hospitalId: string,
        drugId: string,
        requiredQuantity: number
    ): Promise<{
        isAvailable: boolean;
        availableQuantity: number;
        batches: Array<{
            batchNumber: string;
            quantity: number;
            expiryDate: Date;
        }>;
        shortfall: number;
    }> {
        const inventoryItem = await this.prisma.inventoryItem.findFirst({
            where: {
                hospitalId,
                drugId,
                deletedAt: null,
                isActive: true,
            },
        });

        if (!inventoryItem) {
            return {
                isAvailable: false,
                availableQuantity: 0,
                batches: [],
                shortfall: requiredQuantity,
            };
        }

        const batches = await this.prisma.inventoryBatch.findMany({
            where: {
                inventoryItemId: inventoryItem.id,
                expiryDate: { gt: new Date() },
                currentQty: { gt: 0 },
                status: { in: ['AVAILABLE', 'LOW_STOCK'] },
            },
            orderBy: { expiryDate: 'asc' },
            select: {
                batchNumber: true,
                currentQty: true,
                expiryDate: true,
            },
        });

        const totalAvailable = batches.reduce((sum: number, b: { currentQty: number }) => sum + b.currentQty, 0);

        return {
            isAvailable: totalAvailable >= requiredQuantity,
            availableQuantity: totalAvailable,
            batches: batches.map((b: { batchNumber: string; currentQty: number; expiryDate: Date }) => ({
                batchNumber: b.batchNumber,
                quantity: b.currentQty,
                expiryDate: b.expiryDate,
            })),
            shortfall: Math.max(0, requiredQuantity - totalAvailable),
        };
    }

    // ==========================================================================
    // EXPIRY ALERTS
    // ==========================================================================

    /**
     * Get items expiring within specified days
     * Typically run as a daily cron job
     */
    async getExpiringItems(
        hospitalId: string,
        daysThreshold: number = 30
    ): Promise<Array<{
        drugId: string;
        drugName: string;
        batchNumber: string;
        quantity: number;
        expiryDate: Date;
        daysUntilExpiry: number;
        alertLevel: 'CRITICAL' | 'WARNING' | 'INFO';
    }>> {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

        const expiringBatches = await this.prisma.inventoryBatch.findMany({
            where: {
                inventoryItem: {
                    hospitalId,
                    deletedAt: null,
                    isActive: true,
                },
                expiryDate: {
                    gt: new Date(),
                    lte: thresholdDate,
                },
                currentQty: { gt: 0 },
            },
            include: {
                inventoryItem: {
                    include: {
                        drug: {
                            select: {
                                id: true,
                                genericName: true,
                                brandName: true,
                            },
                        },
                    },
                },
            },
            orderBy: { expiryDate: 'asc' },
        });

        const now = new Date();

        return expiringBatches.map((batch: InventoryBatch & { inventoryItem: { drugId: string; drug: { id: string; genericName: string; brandName: string | null } } }) => {
            const daysUntilExpiry = Math.ceil(
                (batch.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            let alertLevel: 'CRITICAL' | 'WARNING' | 'INFO';
            if (daysUntilExpiry <= 7) {
                alertLevel = 'CRITICAL';
            } else if (daysUntilExpiry <= 14) {
                alertLevel = 'WARNING';
            } else {
                alertLevel = 'INFO';
            }

            return {
                drugId: batch.inventoryItem.drugId,
                drugName: batch.inventoryItem.drug.brandName || batch.inventoryItem.drug.genericName,
                batchNumber: batch.batchNumber,
                quantity: batch.currentQty,
                expiryDate: batch.expiryDate,
                daysUntilExpiry,
                alertLevel,
            };
        });
    }

    // ==========================================================================
    // HELPER METHODS
    // ==========================================================================

    /**
     * Determine batch status based on quantity and expiry
     */
    private determineBatchStatus(quantity: number, expiryDate: Date): BatchStatus {
        const now = new Date();

        if (expiryDate <= now) {
            return 'EXPIRED';
        }

        if (quantity <= 0) {
            return 'OUT_OF_STOCK';
        }

        // Consider low stock if quantity is less than 10
        // This threshold could be configurable per item
        if (quantity < 10) {
            return 'LOW_STOCK';
        }

        return 'AVAILABLE';
    }

    /**
     * Update inventory item's aggregated stock from batches
     */
    private async updateInventoryItemStock(
        tx: Prisma.TransactionClient,
        inventoryItemId: string
    ): Promise<void> {
        // Calculate totals from all active batches
        const aggregation = await tx.inventoryBatch.aggregate({
            where: {
                inventoryItemId,
                expiryDate: { gt: new Date() },
                status: { in: ['AVAILABLE', 'LOW_STOCK'] },
            },
            _sum: {
                currentQty: true,
                reservedQty: true,
            },
        });

        const currentStock = aggregation._sum.currentQty || 0;
        const reservedStock = aggregation._sum.reservedQty || 0;

        await tx.inventoryItem.update({
            where: { id: inventoryItemId },
            data: {
                currentStock,
                reservedStock,
                availableStock: currentStock - reservedStock,
            },
        });
    }

    /**
     * Generate unique dispense number
     */
    private async generateDispenseNumber(
        tx: Prisma.TransactionClient,
        hospitalId: string
    ): Promise<string> {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

        // Count today's dispenses
        const count = await tx.inventoryDispense.count({
            where: {
                dispenseDate: {
                    gte: new Date(today.setHours(0, 0, 0, 0)),
                    lt: new Date(today.setHours(23, 59, 59, 999)),
                },
            },
        });

        return `DSP-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
    }
}

// ============================================================================
// CUSTOM ERROR CLASS
// ============================================================================

class InventoryError extends Error {
    code: string;

    constructor(code: string, message: string) {
        super(message);
        this.code = code;
        this.name = 'InventoryError';
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new InventoryDispenseService instance
 */
export function createInventoryDispenseService(
    prisma: PrismaClient
): InventoryDispenseService {
    return new InventoryDispenseService(prisma);
}

export default InventoryDispenseService;
