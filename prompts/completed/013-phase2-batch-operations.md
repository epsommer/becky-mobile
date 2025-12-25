<objective>
Implement batch operations for receipts and other entities in the Becky CRM mobile app.

This is a high-priority feature from Phase 2. Batch operations (bulk send, bulk delete, etc.) significantly improve efficiency for users managing multiple items.
</objective>

<context>
**Project:** Becky CRM Mobile App
**Location:** `/Users/epsommer/projects/apps/becky-mobile`
**Tech Stack:** React Native, Expo, TypeScript
**Design System:** Neomorphic

**Web Reference:** Web app has:
- Batch operations for receipts (bulk send, bulk delete)
- BatchMessageProcessor for messages
- Selection mode for lists

**Existing Infrastructure:**
- Receipt list exists
- Client list exists
- Conversation list exists

**Feature Gap Checklist:** `./analyses/feature-gap-checklist.md`
- Line 22: `[~] Batch operations (bulk delete, bulk signup) - Web only`
- Line 48: `[ ] Batch message processing - Not implemented`
- Line 69: `[ ] Batch operations (bulk send, bulk delete) - Not implemented`
</context>

<research>
Before implementing, examine:
1. Web batch operation implementations
2. Existing list components in mobile
3. Common mobile patterns for selection mode (long-press, checkboxes)
4. API endpoints for batch operations
5. How swipe actions are implemented (if any)

For maximum efficiency, perform multiple searches simultaneously.
</research>

<requirements>
1. **Selection Mode:**
   - Enter selection mode via long-press or "Select" button
   - Visual indicator for selected items (checkbox, highlight)
   - "Select All" option
   - Selection count display
   - Exit selection mode (X button or tap outside)

2. **Batch Actions Bar:**
   - Appears when items selected
   - Actions based on entity type:
     - Receipts: Send, Delete, Mark Paid, Archive
     - Clients: Delete, Export (if supported)
     - Messages: Delete, Archive
   - Confirmation before destructive actions

3. **Receipt Batch Operations:**
   - Bulk send receipts via email
   - Bulk delete with confirmation
   - Bulk mark as paid
   - Bulk archive

4. **Client Batch Operations:**
   - Bulk delete with confirmation
   - Bulk status change (optional)

5. **Mobile UX Patterns:**
   - Consider swipe actions for single items
   - Long-press to enter selection mode
   - Floating action bar for batch actions
   - Clear visual feedback for selected state

6. **Performance:**
   - Handle large selections efficiently
   - Show progress for batch operations
   - Handle partial failures gracefully
</requirements>

<implementation>
Create reusable selection system:
- `./components/selection/SelectionProvider.tsx` - Context for selection state
- `./components/selection/SelectableList.tsx` - Wrapper for lists
- `./components/selection/BatchActionBar.tsx` - Action bar component

Mobile patterns:
- Use Animated API for smooth action bar appearance
- Consider haptic feedback on selection
- Ensure thumb-friendly tap targets
</implementation>

<output>
Create/modify files:
- `./components/selection/SelectionProvider.tsx` - Selection context
- `./components/selection/SelectableList.tsx` - Selectable list wrapper
- `./components/selection/BatchActionBar.tsx` - Batch actions UI
- Integrate into receipt list
- Integrate into client list
- Update `./analyses/feature-gap-checklist.md`:
  - Change lines 22, 48, 69 from `[ ]`/`[~]` to `[x]`
</output>

<verification>
Before completing, verify:
1. Can enter selection mode via long-press
2. Can select multiple items
3. Select All works
4. Batch action bar appears with correct actions
5. Batch delete works with confirmation
6. Batch send works for receipts
7. Partial failures handled gracefully
8. Can exit selection mode cleanly
9. Checklist items updated
</verification>

<success_criteria>
- Reusable selection system implemented
- Batch operations work for receipts
- Mobile-friendly selection UX
- Progress and error handling for batch ops
- Three checklist items marked complete
</success_criteria>
