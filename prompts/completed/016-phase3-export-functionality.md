<objective>
Implement export functionality (CSV, PDF) for the Becky CRM mobile app.

This is the first feature in Phase 3 (Enhanced Features). Users need to export their data - receipts, client lists, analytics - for record-keeping and external use.
</objective>

<context>
**Project:** Becky CRM Mobile App
**Location:** `/Users/epsommer/projects/apps/becky-mobile`
**Tech Stack:** React Native, Expo, TypeScript
**Design System:** Neomorphic

**Existing Infrastructure:**
- Receipt data available
- Client data available
- Analytics data (from 015)

**Feature Gap Checklist:** `./analyses/feature-gap-checklist.md`
- Line 74: `[ ] Receipt export (CSV, PDF) - Not implemented`
- Line 307: `[ ] Export capabilities - Not implemented`
- Lines 311-315: Import/Export items
</context>

<research>
Before implementing, examine:
1. Expo file system and sharing capabilities
2. Libraries for PDF generation (expo-print, react-native-html-to-pdf)
3. CSV generation approaches
4. Native share sheet integration
5. How web handles exports

For maximum efficiency, perform multiple searches simultaneously.
</research>

<requirements>
1. **Export Types:**
   - CSV export for tabular data
   - PDF export for receipts/invoices
   - Native share integration

2. **Receipt/Invoice Export:**
   - Individual receipt to PDF
   - Bulk receipts to CSV
   - Invoice to PDF
   - Include all relevant details

3. **Client Export:**
   - Client list to CSV
   - Include contact info, status, service lines
   - Filter before export

4. **Analytics Export:**
   - Export chart data as CSV
   - Date range selection before export

5. **Export UI:**
   - Export button in relevant screens
   - Format selection (CSV/PDF)
   - Date range for bulk exports
   - Progress indicator for large exports
   - Share sheet on completion

6. **Mobile Integration:**
   - Use native share sheet
   - Save to Files app option
   - Email directly option
</requirements>

<implementation>
Use Expo/RN capabilities:
- expo-file-system for file operations
- expo-sharing for share sheet
- expo-print for PDF generation
- Manual CSV string building or library

Create modular export service:
- `./services/export.ts` - Export utilities
- `./components/ExportButton.tsx` - Reusable button
</implementation>

<output>
Create/modify files:
- `./services/export.ts` - Export service
- `./components/ExportButton.tsx` - Export button component
- Integrate into receipt/billing screens
- Integrate into client list
- Integrate into analytics
- Update `./analyses/feature-gap-checklist.md`:
  - Change lines 74, 307, 311-315 from `[ ]` to `[x]` as appropriate
</output>

<verification>
Before completing, verify:
1. CSV export generates valid CSV
2. PDF export creates readable PDF
3. Share sheet opens with file
4. Can save to Files
5. Can share via email/other apps
6. Export includes correct data
7. Bulk exports handle large datasets
8. Checklist items updated
</verification>

<success_criteria>
- CSV and PDF export functional
- Integrated into key screens
- Native share sheet works
- Files are valid and complete
- Approximately 5 checklist items marked complete
</success_criteria>
