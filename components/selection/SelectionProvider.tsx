/**
 * SelectionProvider - Context for managing selection state across lists
 *
 * Features:
 * - Multi-item selection state
 * - Selection mode toggle (normal vs selection)
 * - Select all / deselect all
 * - Selection count tracking
 * - Haptic feedback on selection
 *
 * Usage:
 * ```tsx
 * <SelectionProvider entityType="receipts">
 *   <ReceiptList />
 *   <BatchActionBar />
 * </SelectionProvider>
 * ```
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import * as Haptics from 'expo-haptics';

export type EntityType = 'receipts' | 'invoices' | 'clients' | 'messages' | 'conversations';

export interface SelectionContextValue {
  /** The type of entity being selected */
  entityType: EntityType;
  /** Whether selection mode is active */
  isSelectionMode: boolean;
  /** Set of selected item IDs */
  selectedIds: Set<string>;
  /** Number of selected items */
  selectedCount: number;
  /** Total number of items available for selection */
  totalCount: number;
  /** Whether all items are selected */
  allSelected: boolean;
  /** Enter selection mode */
  enterSelectionMode: () => void;
  /** Exit selection mode and clear selections */
  exitSelectionMode: () => void;
  /** Toggle selection for a single item */
  toggleSelection: (id: string) => void;
  /** Select a single item (enter selection mode if not already) */
  selectItem: (id: string) => void;
  /** Deselect a single item */
  deselectItem: (id: string) => void;
  /** Select all items */
  selectAll: (ids: string[]) => void;
  /** Deselect all items */
  deselectAll: () => void;
  /** Check if an item is selected */
  isSelected: (id: string) => boolean;
  /** Set total count of selectable items */
  setTotalCount: (count: number) => void;
  /** Get array of selected IDs */
  getSelectedIds: () => string[];
}

const SelectionContext = createContext<SelectionContextValue | undefined>(undefined);

export interface SelectionProviderProps {
  children: ReactNode;
  /** Type of entity being selected */
  entityType: EntityType;
  /** Whether to use haptic feedback */
  hapticFeedback?: boolean;
  /** Initial selection mode state */
  initialSelectionMode?: boolean;
}

export function SelectionProvider({
  children,
  entityType,
  hapticFeedback = true,
  initialSelectionMode = false,
}: SelectionProviderProps) {
  const [isSelectionMode, setIsSelectionMode] = useState(initialSelectionMode);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [totalCount, setTotalCount] = useState(0);

  // Provide haptic feedback
  const triggerHaptic = useCallback(async (type: 'light' | 'medium' | 'selection' = 'light') => {
    if (!hapticFeedback) return;
    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'selection':
          await Haptics.selectionAsync();
          break;
      }
    } catch (error) {
      // Haptics not available on this device
      console.log('[SelectionProvider] Haptics not available');
    }
  }, [hapticFeedback]);

  // Enter selection mode
  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
    triggerHaptic('medium');
  }, [triggerHaptic]);

  // Exit selection mode and clear all selections
  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    triggerHaptic('light');
  }, [triggerHaptic]);

  // Toggle selection for a single item
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
    triggerHaptic('selection');
  }, [triggerHaptic]);

  // Select a single item (enters selection mode if not already)
  const selectItem = useCallback((id: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
    }
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
    triggerHaptic('selection');
  }, [isSelectionMode, triggerHaptic]);

  // Deselect a single item
  const deselectItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    triggerHaptic('selection');
  }, [triggerHaptic]);

  // Select all items
  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
    triggerHaptic('medium');
  }, [triggerHaptic]);

  // Deselect all items
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
    triggerHaptic('light');
  }, [triggerHaptic]);

  // Check if an item is selected
  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  // Get array of selected IDs
  const getSelectedIds = useCallback(() => {
    return Array.from(selectedIds);
  }, [selectedIds]);

  // Compute derived values
  const selectedCount = selectedIds.size;
  const allSelected = totalCount > 0 && selectedCount === totalCount;

  const value = useMemo<SelectionContextValue>(
    () => ({
      entityType,
      isSelectionMode,
      selectedIds,
      selectedCount,
      totalCount,
      allSelected,
      enterSelectionMode,
      exitSelectionMode,
      toggleSelection,
      selectItem,
      deselectItem,
      selectAll,
      deselectAll,
      isSelected,
      setTotalCount,
      getSelectedIds,
    }),
    [
      entityType,
      isSelectionMode,
      selectedIds,
      selectedCount,
      totalCount,
      allSelected,
      enterSelectionMode,
      exitSelectionMode,
      toggleSelection,
      selectItem,
      deselectItem,
      selectAll,
      deselectAll,
      isSelected,
      setTotalCount,
      getSelectedIds,
    ]
  );

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

/**
 * Hook to access selection context
 * Throws if used outside of SelectionProvider
 */
export function useSelection(): SelectionContextValue {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
}

/**
 * Hook to optionally access selection context
 * Returns undefined if used outside of SelectionProvider
 */
export function useSelectionOptional(): SelectionContextValue | undefined {
  return useContext(SelectionContext);
}

export default SelectionProvider;
