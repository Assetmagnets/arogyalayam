# HMS - Enterprise Hospital Management System

A comprehensive, production-ready Hospital Management System built for Indian healthcare providers.

## 🏥 Features

### Phase 1 MVP (Current)
- **Patient Management**: Registration with duplicate detection, UHID generation, search
- **Appointment Scheduling**: Slot management, booking, check-in, queue management
- **Basic EMR**: Consultation notes, vitals recording (VitalsForm component)
- **Cash Billing**: Invoice generation, payments

### Technology Stack

**Backend:**
- Node.js + Express.js + TypeScript
- Prisma ORM with PostgreSQL (Neon DB)
- JWT Authentication with refresh token rotation
- RBAC with permission caching
- Zod validation

**Frontend:**
- React 18 + TypeScript
- Vite build tool
- Tailwind CSS + shadcn/ui components
- React Query for data fetching
- React Router for navigation

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (recommend [Neon](https://neon.tech) for serverless)
- pnpm, npm, or yarn

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   # Copy example env and update with your values
   cp .env.example .env
   
   # Edit .env with your database URL
   # DATABASE_URL="postgresql://user:password@hostname.neon.tech/hms?sslmode=require"
   ```

4. **Generate Prisma client:**
   ```bash
   npm run prisma:generate
   ```

5. **Run database migrations:**
   ```bash
   npm run prisma:migrate
   ```

6. **Seed the database:**
   ```bash
   npx prisma db seed
   ```

7. **Start development server:**
   ```bash
   npm run dev
   ```

The backend will be available at http://localhost:3001

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

The frontend will be available at http://localhost:5173

## 📋 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/refresh` - Refresh tokens
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user

### Patients
- `GET /api/v1/patients` - List patients (with search/pagination)
- `GET /api/v1/patients/:id` - Get patient details
- `POST /api/v1/patients` - Register new patient
- `PUT /api/v1/patients/:id` - Update patient
- `DELETE /api/v1/patients/:id` - Soft delete patient
- `POST /api/v1/patients/check-duplicates` - Check for duplicates

### Appointments
- `GET /api/v1/appointments` - List appointments
- `GET /api/v1/appointments/slots` - Get available slots
- `POST /api/v1/appointments` - Book appointment
- `PATCH /api/v1/appointments/:id/check-in` - Check in patient
- `PATCH /api/v1/appointments/:id/cancel` - Cancel appointment

### Doctors
- `GET /api/v1/doctors` - List doctors
- `GET /api/v1/doctors/:id` - Get doctor details
- `GET /api/v1/doctors/:id/schedule` - Get doctor schedule
- `POST /api/v1/doctors/:id/schedule` - Update schedule

## 🔐 Demo Credentials

After seeding the database, you can login with:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hms-hospital.com | Admin@123 |
| Doctor | dr.sharma@hms-hospital.com | Doctor@123 |
| Receptionist | reception@hms-hospital.com | Reception@123 |

## 📁 Project Structure

```
HMS/
├── backend/
│   ├── src/
│   │   ├── config/        # Environment, database, auth
│   │   ├── middleware/    # Auth, validation, error handling
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── types/         # TypeScript types
│   ├── prisma/
│   │   ├── schema.prisma  # Database schema
│   │   └── seed.ts        # Database seeding
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   ├── lib/           # Utilities
│   │   └── pages/         # Page components
│   └── package.json
│
├── src/                   # Shared code (types, business services)
│   ├── types/
│   └── business/
│
└── prisma/                # Original Prisma schema
```

## 🇮🇳 India-Specific Features

- **UHID Generation**: Hospital-specific patient ID format (HOS-YYMM-NNNN)
- **Aadhaar Integration**: 12-digit validation with masking for display
- **ABHA Support**: Ayushman Bharat Health Account
- **PMJAY Integration**: Ready for Ayushman Bharat claims
- **Indian Mobile Validation**: 10-digit starting with 6-9
- **PIN Code Validation**: 6-digit Indian postal codes
- **GST/PAN Support**: Tax compliance fields

## 📄 License

MIT License - see LICENSE file for details.
