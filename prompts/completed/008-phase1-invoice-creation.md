<objective>
Implement invoice creation and management for the Becky CRM mobile app.

This is the third critical gap from the feature analysis. The mobile app has receipt functionality but lacks invoice creation - a core billing feature that many service businesses require.
</objective>

<context>
**Project:** Becky CRM Mobile App
**Location:** `/Users/epsommer/projects/apps/becky-mobile`
**Tech Stack:** React Native, Expo, TypeScript
**Design System:** Neomorphic

**Web Reference:** Web app has `InvoiceModal` - use as reference for fields and workflow.

**Existing Infrastructure:**
- Receipt modal exists (`ReceiptModal`) - similar pattern can be followed
- Billing screen exists with receipt list
- Service line selector component available
- Line items management already implemented for receipts

**Feature Gap Checklist:** `./analyses/feature-gap-checklist.md`
- Line 66: `[ ] Invoice creation - Not implemented`
- Line 67: `[ ] Invoice management - Not implemented`
</context>

<research>
Before implementing, examine:
1. Web InvoiceModal for fields and workflow
2. Existing ReceiptModal implementation (similar pattern)
3. Billing screen structure
4. API endpoints for invoices
5. Line items component (reusable)
6. Service line selector usage

For maximum efficiency, perform multiple searches simultaneously.
</research>

<requirements>
1. **InvoiceModal Component:**
   - Client selector (required)
   - Service line selector
   - Invoice number (auto-generated or manual)
   - Invoice date
   - Due date
   - Line items (reuse existing component if possible):
     - Description
     - Quantity
     - Unit price
     - Amount (calculated)
   - Subtotal, tax (if applicable), total
   - Notes/terms section
   - Status: Draft, Sent, Paid, Overdue

2. **Invoice List:**
   - Add to billing screen or create tab
   - Filter by status
   - Sort by date, amount, client
   - Quick actions (send, mark paid, duplicate)

3. **Invoice Actions:**
   - Save as draft
   - Send invoice (email integration or share)
   - Mark as paid
   - Edit existing invoice
   - Delete invoice

4. **Data Flow:**
   - Create invoice hook (`useInvoices`) if doesn't exist
   - API integration for CRUD operations
   - Optimistic updates for better UX
</requirements>

<implementation>
Build on existing receipt patterns:
- Follow ReceiptModal structure
- Reuse line items components
- Match billing screen navigation patterns
- Use neomorphic components

Create modular structure:
- `./components/modals/InvoiceModal.tsx`
- `./hooks/useInvoices.ts` (if needed)
- Types for invoice data structures
</implementation>

<output>
Create/modify files:
- `./components/modals/InvoiceModal.tsx` - Invoice creation/editing modal
- `./hooks/useInvoices.ts` - Invoice data hook (if needed)
- Modify billing screen to include invoices
- Update `./analyses/feature-gap-checklist.md`:
  - Change lines 66, 67 from `[ ]` to `[x]`
</output>

<verification>
Before completing, verify:
1. Invoice modal opens and displays all fields
2. Line items calculate correctly
3. Can save draft, send, mark paid
4. Invoice list displays and filters work
5. Edit and delete operations work
6. API integration functional (or documented if API needs work)
7. Checklist updated
</verification>

<success_criteria>
- Full invoice creation workflow functional
- Invoice list with filtering and sorting
- Integrated into billing screen
- Follows existing patterns and design system
- Two checklist items marked complete
</success_criteria>
