# Smart Lab Result Portal (MedClinicX HealthIntel)

MedClinicX HealthIntel is a secure digital laboratory experience and clinical intelligence platform. It turns static laboratory files (PDFs/emails) into a longitudinal health history system. The application serves patients, doctors, and laboratory administrators in a unified, HIPAA-compliant workflow.

---

## Key Features & Capabilities

### 1. Patient Dashboard Command Center
- **Health Score & Goals**: A visual completion radial ring tracking preventive health goals (such as annual diagnostics and vital logs).
- **Longitudinal Trend Analytics**: A custom, responsive SVG line chart analyzing historical biomarkers (e.g. cholesterol levels dropping from 210 to 170 mg/dL) with glowing nodes and hover tooltips.
- **Smart Document Vault**: Category folder archives (`Imaging`, `Prescriptions`, `Vaccinations`, `Insurance`) that support parsing, indexing, and downloading.
- **Secure Messaging Channel**: Direct consultation channel to primary care physicians (e.g., Dr. Robert Chen) supporting template queries and quick dispatches.
- **Wearables Integration Hub**: Syncs steps, sleep duration, and rest heart rates from Apple Health / Fitbit with animated heart rhythm SVG wave visualizers.
- **EHR Connect Gateway**: Live status updates for Mayo Clinic, Epic MyChart, and Kaiser EMR pipelines.

### 2. Clinical Provider Workspace
- **Patient Directory**: Instantly displays all registered clinic patients and alerts for reviews awaiting release.
- **Longitudinal Clinical History**: Unified timeline logging the patient's reports, consultations, visits, and medication updates chronologically.
- **Clinical Chat Console**: Secure messaging gateway to communicate recommendations directly to patients.
- **Sign-off presets**: Quick clinical annotation templates (e.g., "Vitamin D Low", "Normal Review", "High Cholesterol").

### 3. Lab Admin Management Portal
- **Lab Results Builder**: Dynamic form builder to select patients, title diagnostic panels, choose collection dates, and add multiple result parameters with custom units and reference ranges.
- **Report Release Workflow**: Authorizes and releases newly parsed completed panels directly to the patient's active dashboard.
- **EHR Integration Gateways**: Live HL7/FHIR observation message transmission log stream showing control messages (`MSH`, `PID`, `OBR`, `OBX`) automatically routing to Epic, Cerner, and Kaiser databases.

---

## Technology Stack
- **Core Framework**: Next.js 15 (Turbopack) & React 19
- **Type Safety**: TypeScript
- **Database ORM**: Prisma
- **Database Engine**: SQLite (`dev.db`)
- **Styling**: Tailwind CSS & Vanilla CSS
- **Icons**: Lucide React

---

## Database Schema Model relations
- `User`: Handles identity credentials and roles (`PATIENT`, `DOCTOR`, `LAB_ADMIN`).
- `Patient`: Ties demographics, medical documents, timeline events, chat messages, wellness goals, and synced wearable logs.
- `Doctor`: Links specialties, clinical reports sign-offs, and communication logs.
- `Report` & `LabResult`: Houses the biometric metrics (value, reference range, status).
- `TimelineEvent`: Tracks medical events chronologically.
- `Message`: Secure text messages between patients and doctors.
- `Document`: Category folders metadata for clinical uploads.
- `Goal` & `WearableData`: Wellness compliance checklist and fit trackers.
- `AuditLog`: Cryptographic audits tracking logins and report accesses for CLIA/HIPAA compliance.

---

## Onboarding Demo Accounts
To test the application instantly without manual login credentials, use the pre-seeded cookie bypass accounts on the landing page:
- **Sarah Ahmed** (`sarah@example.com`) — *Patient Persona*
- **Dr. Robert Chen** (`doctor@example.com`) — *Physician Persona*
- **Alice Vance** (`admin@example.com`) — *Lab Admin Persona*

---

## Local Development & Setup

### 1. Database Setup
To push the database schema, compile types, and seed initial records:
```bash
# Apply schema models to SQLite
npx prisma db push

# Populate mock data
node prisma/seed.js
```

### 2. Run Development Server
```bash
# Starts Next.js dev server (automatically binds to port 3001/3002 if 3000 is occupied)
npm run dev
```

### 3. Production Build Compilation
Verify types and page generation compile without issues:
```bash
npm run build
```
