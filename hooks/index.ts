/**
 * Hooks index - Export all custom hooks
 */

// Calendar event hooks
export { useRecurringEventActions } from './useRecurringEventActions';
export type { RecurringEditOption, RecurringDeleteOption } from './useRecurringEventActions';

export { useMultidayEventActions } from './useMultidayEventActions';
export type { ValidationResult, ConflictEvent } from './useMultidayEventActions';

// Other hooks - add exports as needed
export { useContactActions } from './useContactActions';
export { useHouseholds } from './useHouseholds';
