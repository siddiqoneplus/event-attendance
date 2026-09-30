# Smart Attendance PRO

A modern, responsive, QR Code-Based Event Attendance Management System.

## Features Implemented
- **Role-based Access**: Separate Admin and Employee (Scanner) dashboards, secured with JWT and Next.js Middleware.
- **Dynamic Database**: Powered by Prisma ORM and SQLite (local dev friendly).
- **Admin Capabilities**:
  - Event Creation and Management.
  - Bulk Participant Upload via Excel (`.xlsx`, `.csv`).
  - Column Mapping during import.
  - Live Real-time Attendance Dashboard.
  - Attendance Report Export to Excel.
  - Event-specific QR code generation and printing.
  - Custom Roll Number identification rules configuration.
  - Employee user management.
- **Employee Capabilities**:
  - Securely access active events.
  - Mobile-friendly HTML5 QR Code Scanner using the device camera.
  - Server-side validations (Event active, Participant registered, Prevent duplicates).
- **Premium UI/UX**:
  - Built with Tailwind CSS.
  - Glassmorphism UI elements.
  - Smooth micro-animations and gradients.
  - Fully responsive, mobile-first scanner.

## Quick Start
The development server is already running on port `3001` (to avoid conflicts).
You can access the application here: http://localhost:3001

### Demo Credentials
First, hit the setup endpoint to generate demo users: http://localhost:3001/api/setup

**Admin:**
- Username: `admin`
- Password: `admin`

**Employee (Staff Scanner):**
- Username: `employee1`
- Password: `employee1`

## Workflow Testing
1. Login as Admin.
2. Go to **Events** -> **Create Event**. Make sure to set the status to "ACTIVE".
3. Click **Manage** on the event.
4. Go to the **Participants** tab and upload an Excel file. Map the columns correctly and confirm.
5. In a new browser window/tab, login as Employee (`employee1`).
6. Select the active event and open the QR scanner.
7. You can test scanning using QR codes generated from the Admin's **Generate Event QR** tab.
8. Watch the Admin's **Live Dashboard** update as scans are recorded!
