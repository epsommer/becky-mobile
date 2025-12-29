<objective>
Implement the action sidebar/bottom sheet system and confirmation modals for the React Native calendar, including:
1. Bottom sheet action menu with year calendar
2. Recurring event confirmation modals
3. Multiday event confirmation modals
4. Delete confirmation modals

This implementation is based on:
- Research findings from ./research/web-action-sidebar-analysis.md
- Research findings from ./research/web-recurring-multiday-events-analysis.md
- Implementation plan from ./analyses/rn-calendar-implementation-plan.md
</objective>

<context>
Read the implementation plan and research before starting:
@./analyses/rn-calendar-implementation-plan.md
@./research/web-action-sidebar-analysis.md
@./research/web-recurring-multiday-events-analysis.md

Reference existing components:
@./components/calendar/
@./components/modals/
@./components/screens/TimeManagerScreen.tsx
</context>

<requirements>

## 1. Bottom Sheet Action Menu

### Library Setup
Install and configure bottom sheet library as specified in plan:
```bash
# Install as specified in implementation plan
```

### Component Location
`./components/calendar/ActionBottomSheet.tsx`

### Features

**Snap Points**
- Collapsed: Just handle visible (60px)
- Half: Year calendar + quick actions (50% of screen)
- Full: All content + additional options (90% of screen)

**Content Structure**
```
┌─────────────────────────────┐
│         ══════ (handle)     │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │    Year Calendar Grid   │ │
│ │    ◄ 2025 ►             │ │
│ │ Jan Feb Mar Apr May Jun │ │
│ │ Jul Aug Sep Oct Nov Dec │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Quick Actions:              │
│ [+Event] [+Client] [Today]  │
├─────────────────────────────┤
│ View Toggle:                │
│ [Day] [Week] [Month] [Year] │
└─────────────────────────────┘
```

**Year Calendar Component**
- 12-month grid showing current year
- Tap month to navigate main calendar
- Current month highlighted
- Today indicator
- Navigate years with arrows

**Quick Actions**
- Create Event button
- Create Client appointment button
- Jump to Today button

**View Toggle**
- Day, Week, Month, Year view buttons
- Current view highlighted

### Gesture Behavior
- Drag handle to change snap point
- Swipe down from collapsed to dismiss (optional)
- Tap outside to collapse to minimum
- Prevent gesture conflicts with calendar scroll

### State Management
```typescript
interface ActionSheetState {
  snapIndex: number; // 0=collapsed, 1=half, 2=full
  isAnimating: boolean;
}
```

## 2. Recurring Event Confirmation Modals

### Edit Recurring Event Modal
Location: `./components/modals/EditRecurringEventModal.tsx`

**Trigger**
- When user edits an event that is part of a recurring series

**Options to Present**
1. "This event only" - Creates exception, modifies single instance
2. "This and future events" - Modifies this and all future instances
3. "All events" - Modifies entire series including past

**UI Structure**
```
┌─────────────────────────────────┐
│ Edit Recurring Event            │
├─────────────────────────────────┤
│ This event repeats weekly.      │
│ What would you like to edit?    │
│                                 │
│ ○ This event only               │
│ ○ This and future events        │
│ ○ All events in series          │
│                                 │
│ [Cancel]            [Continue]  │
└─────────────────────────────────┘
```

### Delete Recurring Event Modal
Location: `./components/modals/DeleteRecurringEventModal.tsx`

**Trigger**
- When user deletes an event that is part of a recurring series

**Options to Present**
1. "This event only" - Creates exception
2. "This and future events" - Ends recurrence at this point
3. "All events" - Deletes entire series

**UI Structure**
```
┌─────────────────────────────────┐
│ Delete Recurring Event          │
├─────────────────────────────────┤
│ ⚠️ This event repeats weekly.   │
│ What would you like to delete?  │
│                                 │
│ ○ This event only               │
│ ○ This and future events        │
│ ○ All events in series          │
│                                 │
│ [Cancel]      [Delete] (red)    │
└─────────────────────────────────┘
```

**Destructive Styling**
- Delete button in red/destructive color
- Warning icon for series deletion
- Confirmation text for "All events" option

## 3. Multiday Event Modals

### Create/Edit Multiday Event Validation
Location: Extend existing EventModal or create `./components/modals/MultidayEventModal.tsx`

**Validations**
- End date must be after start date
- Show error if dates are invalid
- Auto-switch to all-day when spanning midnight

**Date Range Picker**
- Start date picker
- End date picker
- Duration display (e.g., "3 days")

### Date Conflict Warning
When multiday event overlaps with existing events:
```
┌─────────────────────────────────┐
│ Schedule Conflict               │
├─────────────────────────────────┤
│ This event overlaps with:       │
│ • Meeting with John (Apr 5)     │
│ • Client call (Apr 6)           │
│                                 │
│ Continue anyway?                │
│                                 │
│ [Go Back]          [Continue]   │
└─────────────────────────────────┘
```

## 4. Shared Modal Components

### Base Modal Component
Create or extend: `./components/modals/BaseConfirmationModal.tsx`

**Props Interface**
```typescript
interface BaseConfirmationModalProps {
  visible: boolean;
  title: string;
  message?: string;
  options?: ModalOption[];
  confirmLabel: string;
  cancelLabel: string;
  isDestructive?: boolean;
  onConfirm: (selectedOption?: string) => void;
  onCancel: () => void;
}

interface ModalOption {
  id: string;
  label: string;
  description?: string;
}
```

**Styling**
- Consistent with app theme
- Backdrop with blur or dimming
- Slide-up or fade animation
- Accessible focus management

### Radio Option List Component
`./components/modals/RadioOptionList.tsx`

For presenting mutually exclusive options in modals.

## 5. Integration with Event System

### Hook: useRecurringEventActions
`./hooks/useRecurringEventActions.ts`

```typescript
interface UseRecurringEventActionsReturn {
  showEditModal: (event: Event) => void;
  showDeleteModal: (event: Event) => void;
  handleEditChoice: (choice: 'single' | 'future' | 'all', changes: Partial<Event>) => Promise<void>;
  handleDeleteChoice: (choice: 'single' | 'future' | 'all') => Promise<void>;
  isProcessing: boolean;
}
```

### Hook: useMultidayEventActions
`./hooks/useMultidayEventActions.ts`

```typescript
interface UseMultidayEventActionsReturn {
  validateDateRange: (start: Date, end: Date) => ValidationResult;
  checkConflicts: (start: Date, end: Date) => Event[];
  showConflictWarning: (conflicts: Event[]) => void;
}
```

## 6. Accessibility

- All modals must trap focus
- Escape/back button dismisses modals
- Screen reader announces modal content
- Radio options are properly labeled
- Destructive actions have confirmation

</requirements>

<implementation_steps>
1. Install bottom sheet library
2. Create ActionBottomSheet component
3. Implement YearCalendarMini component
4. Create BaseConfirmationModal component
5. Create RadioOptionList component
6. Implement EditRecurringEventModal
7. Implement DeleteRecurringEventModal
8. Extend event modals for multiday handling
9. Create useRecurringEventActions hook
10. Create useMultidayEventActions hook
11. Integrate bottom sheet with TimeManager
12. Connect modals to event actions
13. Test all modal flows
14. Add accessibility features
</implementation_steps>

<output>
Files to create:
- `./components/calendar/ActionBottomSheet.tsx`
- `./components/calendar/YearCalendarMini.tsx`
- `./components/modals/BaseConfirmationModal.tsx`
- `./components/modals/RadioOptionList.tsx`
- `./components/modals/EditRecurringEventModal.tsx`
- `./components/modals/DeleteRecurringEventModal.tsx`
- `./hooks/useRecurringEventActions.ts`
- `./hooks/useMultidayEventActions.ts`

Files to modify:
- `./components/screens/TimeManagerScreen.tsx` (integrate bottom sheet)
- `./components/calendar/EventModal.tsx` (add multiday support if exists)
</output>

<verification>
Before declaring complete:
1. Test bottom sheet opens and snaps correctly
2. Test year calendar navigation and month selection
3. Test quick action buttons work
4. Test view toggle switches calendar view
5. Test edit recurring event modal shows all options
6. Test delete recurring event modal with destructive styling
7. Test multiday event date validation
8. Test conflict detection and warning
9. Verify accessibility with VoiceOver/TalkBack
10. Test on both iOS and Android
</verification>

<success_criteria>
- Bottom sheet action menu fully functional
- Year calendar navigation works
- All confirmation modals implemented
- Recurring event edit/delete flows complete
- Multiday event validation working
- Proper destructive action styling
- Full accessibility support
- Clean integration with existing calendar system
</success_criteria>
