import { FileBarChart } from 'lucide-react';

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
                <p className="text-muted-foreground">
                    View hospital performance metrics and generate reports.
                </p>
            </div>

            <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed rounded-lg">
                <div className="flex flex-col items-center gap-4 text-center max-w-sm">
                    <div className="p-4 bg-primary/10 rounded-full">
                        <FileBarChart className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Reports Module Coming Soon</h3>
                    <p className="text-muted-foreground">
                        We are currently building comprehensive reporting tools for you. check back later!
                    </p>
                </div>
            </div>
        </div>
    );
}
