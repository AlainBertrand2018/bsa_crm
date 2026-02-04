# User Manual & Quality Assurance Guide
## BSA CRM System (Vite + Firestore)

This manual provides instructions for testing the core functionality of the BSA CRM application, ensuring robust connectivity between the frontend, the Supabase-to-Firestore shim, and the Firestore database.

### 1. Pre-Test Procedures
*   **Clear Browser State**: Before starting any test, ensure you are logged out.
*   **Credential Handling**:
    *   Navigate to `/login`.
    *   **CRITICAL**: Completely clear the email and password fields before typing credentials.
    *   Use the provided admin credentials (e.g., `alain.bertrand.mu@gmail.com`).

### 2. Core Workflow Testing

#### A. Authentication & Onboarding
1.  **Login**: Verify that you can log in and reach the Dashboard.
2.  **Onboarding Verification**:
    *   If the user has not completed onboarding, verify the redirect to `/onboarding`.
    *   Complete the form (Business Details + 3 Products).
    *   Verify that `users`, `businesses`, and `user_products` collections are updated in Firestore.

#### B. Client Management
1.  **Create Client**: Navigate to `/clients` and add a new client with full details (Name, Company, Email, Phone, Address, BRN).
2.  **Verify Listing**: Ensure the client appears in the table with all details correctly rendered (no "N/A" for known data).

#### C. Quotation to Receipt Workflow (The Main Loop)
1.  **Create Quotation**:
    *   Select the newly created client.
    *   Add products from your inventory.
    *   Save and download the PDF. **Verify that BOTH business and client details are printed correctly.**
2.  **Convert to Invoice**:
    *   Change Quotation status to **"Won"**.
    *   Verify that an Invoice is automatically generated (check `/invoices`).
3.  **Register Payment (Receipt)**:
    *   Find the new Invoice in `/invoices`.
    *   Click **"Register Payment"**.
    *   Enter an amount (e.g., partial or full).
    *   Verify that the Invoice status updates (to "Partly Paid" or "Fully Paid").
    *   Verify that a Receipt is created in `/receipts`.
    *   Download the Receipt PDF and verify the **Date column** and **Client specifics**.

#### D. Data Integrity Audit (Developer Check)
*   **Snake vs Camel Case**: Check browser console logs (Shim logs) to ensure data mapping is happening correctly.
*   **Firestore IDs**: Ensure that every record has a valid Firestore document ID (accessible via `.id` in the frontend).

---
## Developer Notes on Firestore Connectivity
The application uses a shim layer (`supabaseService.ts`) to translate traditional Supabase-style calls into Firestore operations.
*   **Collections**: `users`, `businesses`, `clients`, `user_products`, `quotations`, `invoices`, `receipts`, `statements`.
*   **Joins**: Simulated via the shim (e.g., when fetching an invoice, the shim simultaneously fetches the client record to "join" the data).
