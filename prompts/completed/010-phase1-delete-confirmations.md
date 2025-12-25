<objective>
Implement delete confirmation modals throughout the Becky CRM mobile app.

This is the fifth item in Phase 1. The analysis noted delete confirmations were "mentioned as implemented but not found in code" - this prompt ensures consistent delete confirmations exist across all destructive actions.
</objective>

<context>
**Project:** Becky CRM Mobile App
**Location:** `/Users/epsommer/projects/apps/becky-mobile`
**Tech Stack:** React Native, Expo, TypeScript
**Design System:** Neomorphic

**Existing Infrastructure:**
- Various delete actions exist (clients, events, receipts, etc.)
- Modal patterns established in other modals
- May have partial implementation

**Feature Gap Checklist:** `./analyses/feature-gap-checklist.md`
- Line 163: `[ ] Delete confirmation modals - Mentioned as implemented but not found in code`
</context>

<research>
Before implementing, examine:
1. All locations where delete actions exist
2. Any existing confirmation modal patterns
3. How delete is currently handled (with or without confirmation)
4. React Native Alert API as alternative to custom modal
5. Existing modal patterns for consistency

Search for: "delete", "remove", "onDelete", "handleDelete" across the codebase.
</research>

<requirements>
1. **DeleteConfirmationModal Component:**
   - Generic, reusable confirmation modal
   - Props:
     - `visible: boolean`
     - `title: string` (e.g., "Delete Client?")
     - `message: string` (e.g., "This action cannot be undone.")
     - `itemName?: string` (name of item being deleted)
     - `onConfirm: () => void`
     - `onCancel: () => void`
     - `confirmText?: string` (default: "Delete")
     - `cancelText?: string` (default: "Cancel")
     - `destructive?: boolean` (styles confirm button as destructive)
   - Neomorphic styling
   - Clear visual hierarchy

2. **Integration Points:**
   Ensure delete confirmation exists for:
   - Client deletion
   - Event deletion (non-recurring - recurring has its own modal)
   - Receipt deletion
   - Invoice deletion (from 008 prompt)
   - Testimonial deletion
   - Time entry deletion
   - Any other destructive actions found in research

3. **Consistent UX:**
   - Same modal pattern everywhere
   - Confirm button on right (or platform convention)
   - Destructive actions have red/warning styling
   - Cancel is always safe and obvious

4. **Alternative: React Native Alert:**
   - For simpler cases, Alert.alert() may be appropriate
   - Document when to use modal vs Alert
   - Ensure consistency in choice
</requirements>

<implementation>
Create single reusable component:
- `./components/modals/DeleteConfirmationModal.tsx`

Or use React Native's built-in Alert for simpler UX:
```typescript
Alert.alert(
  "Delete Client?",
  "This action cannot be undone.",
  [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: handleDelete }
  ]
);
```

Choose approach based on:
- Design system requirements (neomorphic may require custom)
- Consistency with existing modals
- User expectation on platform
</implementation>

<output>
Create/modify files:
- `./components/modals/DeleteConfirmationModal.tsx` - Reusable component (if custom modal chosen)
- Integrate into all delete action points
- Update `./analyses/feature-gap-checklist.md`:
  - Change line 163 from `[ ]` to `[x]`
</output>

<verification>
Before completing, verify:
1. Delete confirmation appears for all destructive actions
2. Modal/Alert displays item being deleted
3. Cancel safely aborts deletion
4. Confirm executes deletion
5. No delete can happen without confirmation
6. Styling matches design system
7. Checklist updated
</verification>

<success_criteria>
- Reusable delete confirmation component/pattern
- All destructive actions protected by confirmation
- Consistent UX across the app
- One checklist item marked complete
</success_criteria>
