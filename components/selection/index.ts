/**
 * Selection components for batch operations
 *
 * This module provides a reusable selection system for implementing
 * batch operations on lists of items (receipts, clients, messages, etc.)
 *
 * Usage:
 * ```tsx
 * import {
 *   SelectionProvider,
 *   useSelection,
 *   SelectableItem,
 *   BatchActionBar,
 * } from '@/components/selection';
 *
 * function MyList() {
 *   const items = [...];
 *
 *   return (
 *     <SelectionProvider entityType="receipts">
 *       <View style={{ flex: 1 }}>
 *         {items.map(item => (
 *           <SelectableItem key={item.id} id={item.id}>
 *             <ItemCard item={item} />
 *           </SelectableItem>
 *         ))}
 *       </View>
 *       <BatchActionBar
 *         availableIds={items.map(i => i.id)}
 *         onBatchDelete={handleDelete}
 *       />
 *     </SelectionProvider>
 *   );
 * }
 * ```
 */

export {
  SelectionProvider,
  useSelection,
  useSelectionOptional,
  type EntityType,
  type SelectionContextValue,
  type SelectionProviderProps,
} from './SelectionProvider';

export {
  default as BatchActionBar,
  type BatchAction,
  type BatchActionBarProps,
} from './BatchActionBar';

export {
  default as SelectableItem,
  type SelectableItemProps,
} from './SelectableItem';
