/**
 * useBatchOperations - Hook for performing batch operations on entities
 *
 * Features:
 * - Batch delete, send, mark paid, archive operations
 * - Progress tracking
 * - Partial failure handling
 * - Loading state management
 * - Confirmation dialogs
 *
 * Usage:
 * ```tsx
 * const {
 *   batchDelete,
 *   batchSend,
 *   batchMarkPaid,
 *   loading,
 *   progress,
 * } = useBatchOperations('receipts', {
 *   onSuccess: () => refetch(),
 *   onError: (error) => showToast(error),
 * });
 * ```
 */
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { billingApi } from '../lib/api/endpoints/billing';
import { clientsApi } from '../lib/api/endpoints';
import { EntityType } from '../components/selection';

export interface BatchOperationResult {
  success: boolean;
  successCount: number;
  failedCount: number;
  failedIds: string[];
  errors: Array<{ id: string; error: string }>;
}

export interface BatchOperationProgress {
  current: number;
  total: number;
  percent: number;
}

export interface UseBatchOperationsOptions {
  /** Callback when batch operation completes successfully */
  onSuccess?: (result: BatchOperationResult) => void;
  /** Callback when batch operation fails */
  onError?: (error: string, result?: BatchOperationResult) => void;
  /** Callback for progress updates */
  onProgress?: (progress: BatchOperationProgress) => void;
  /** Whether to show confirmation dialogs */
  showConfirmation?: boolean;
}

export interface UseBatchOperationsResult {
  /** Delete multiple items */
  batchDelete: (ids: string[]) => Promise<BatchOperationResult | null>;
  /** Send multiple items (receipts/invoices) */
  batchSend: (ids: string[]) => Promise<BatchOperationResult | null>;
  /** Mark multiple items as paid (receipts/invoices) */
  batchMarkPaid: (ids: string[]) => Promise<BatchOperationResult | null>;
  /** Archive multiple items */
  batchArchive: (ids: string[]) => Promise<BatchOperationResult | null>;
  /** Whether any operation is in progress */
  loading: boolean;
  /** Current loading action key */
  loadingAction: string | null;
  /** Current progress of the batch operation */
  progress: BatchOperationProgress | null;
}

export function useBatchOperations(
  entityType: EntityType,
  options: UseBatchOperationsOptions = {}
): UseBatchOperationsResult {
  const {
    onSuccess,
    onError,
    onProgress,
    showConfirmation = true,
  } = options;

  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [progress, setProgress] = useState<BatchOperationProgress | null>(null);

  // Helper to update and report progress
  const updateProgress = useCallback(
    (current: number, total: number) => {
      const progressData: BatchOperationProgress = {
        current,
        total,
        percent: Math.round((current / total) * 100),
      };
      setProgress(progressData);
      onProgress?.(progressData);
    },
    [onProgress]
  );

  // Helper to show confirmation dialog
  const showConfirmationDialog = useCallback(
    (
      title: string,
      message: string,
      confirmText: string
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        if (!showConfirmation) {
          resolve(true);
          return;
        }

        Alert.alert(title, message, [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: confirmText,
            style: 'destructive',
            onPress: () => resolve(true),
          },
        ]);
      });
    },
    [showConfirmation]
  );

  // Batch delete operation
  const batchDelete = useCallback(
    async (ids: string[]): Promise<BatchOperationResult | null> => {
      const count = ids.length;
      if (count === 0) return null;

      const entityLabel = entityType === 'clients' ? 'client' : entityType.slice(0, -1);
      const confirmed = await showConfirmationDialog(
        `Delete ${count} ${entityLabel}${count > 1 ? 's' : ''}?`,
        `This will permanently delete ${count} ${entityLabel}${count > 1 ? 's' : ''} and all associated data. This action cannot be undone.`,
        `Delete ${count}`
      );

      if (!confirmed) return null;

      setLoading(true);
      setLoadingAction('delete');
      setProgress({ current: 0, total: count, percent: 0 });

      const result: BatchOperationResult = {
        success: true,
        successCount: 0,
        failedCount: 0,
        failedIds: [],
        errors: [],
      };

      try {
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          try {
            let response;
            switch (entityType) {
              case 'receipts':
                response = await billingApi.deleteReceipt(id);
                break;
              case 'invoices':
                response = await billingApi.deleteInvoice(id);
                break;
              case 'clients':
                response = await clientsApi.deleteClient(id);
                break;
              default:
                throw new Error(`Delete not supported for entity type: ${entityType}`);
            }

            if (response.success) {
              result.successCount++;
            } else {
              result.failedCount++;
              result.failedIds.push(id);
              result.errors.push({ id, error: 'Delete failed' });
            }
          } catch (err) {
            result.failedCount++;
            result.failedIds.push(id);
            result.errors.push({
              id,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
          }

          updateProgress(i + 1, count);
        }

        result.success = result.failedCount === 0;

        if (result.success) {
          onSuccess?.(result);
        } else if (result.successCount > 0) {
          // Partial success
          onSuccess?.(result);
          Alert.alert(
            'Partial Success',
            `Deleted ${result.successCount} of ${count} items. ${result.failedCount} failed.`
          );
        } else {
          onError?.('All delete operations failed', result);
        }

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Batch delete failed';
        onError?.(errorMessage, result);
        return result;
      } finally {
        setLoading(false);
        setLoadingAction(null);
        setProgress(null);
      }
    },
    [entityType, showConfirmationDialog, updateProgress, onSuccess, onError]
  );

  // Batch send operation (receipts/invoices)
  const batchSend = useCallback(
    async (ids: string[]): Promise<BatchOperationResult | null> => {
      const count = ids.length;
      if (count === 0) return null;

      if (entityType !== 'receipts' && entityType !== 'invoices') {
        onError?.('Send operation not supported for this entity type');
        return null;
      }

      const entityLabel = entityType.slice(0, -1);
      const confirmed = await showConfirmationDialog(
        `Send ${count} ${entityLabel}${count > 1 ? 's' : ''}?`,
        `This will send ${count} ${entityLabel}${count > 1 ? 's' : ''} via email to their respective clients.`,
        `Send ${count}`
      );

      if (!confirmed) return null;

      setLoading(true);
      setLoadingAction('send');
      setProgress({ current: 0, total: count, percent: 0 });

      const result: BatchOperationResult = {
        success: true,
        successCount: 0,
        failedCount: 0,
        failedIds: [],
        errors: [],
      };

      try {
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          try {
            const response =
              entityType === 'receipts'
                ? await billingApi.sendReceipt(id)
                : await billingApi.sendInvoice(id);

            if (response.success) {
              result.successCount++;
            } else {
              result.failedCount++;
              result.failedIds.push(id);
              result.errors.push({ id, error: 'Send failed' });
            }
          } catch (err) {
            result.failedCount++;
            result.failedIds.push(id);
            result.errors.push({
              id,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
          }

          updateProgress(i + 1, count);
        }

        result.success = result.failedCount === 0;

        if (result.success) {
          onSuccess?.(result);
          Alert.alert('Success', `Sent ${result.successCount} ${entityLabel}${result.successCount > 1 ? 's' : ''} successfully.`);
        } else if (result.successCount > 0) {
          onSuccess?.(result);
          Alert.alert(
            'Partial Success',
            `Sent ${result.successCount} of ${count} items. ${result.failedCount} failed.`
          );
        } else {
          onError?.('All send operations failed', result);
        }

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Batch send failed';
        onError?.(errorMessage, result);
        return result;
      } finally {
        setLoading(false);
        setLoadingAction(null);
        setProgress(null);
      }
    },
    [entityType, showConfirmationDialog, updateProgress, onSuccess, onError]
  );

  // Batch mark paid operation (receipts/invoices)
  const batchMarkPaid = useCallback(
    async (ids: string[]): Promise<BatchOperationResult | null> => {
      const count = ids.length;
      if (count === 0) return null;

      if (entityType !== 'receipts' && entityType !== 'invoices') {
        onError?.('Mark paid operation not supported for this entity type');
        return null;
      }

      const entityLabel = entityType.slice(0, -1);
      const confirmed = await showConfirmationDialog(
        `Mark ${count} ${entityLabel}${count > 1 ? 's' : ''} as Paid?`,
        `This will mark ${count} ${entityLabel}${count > 1 ? 's' : ''} as paid with today's date.`,
        `Mark Paid`
      );

      if (!confirmed) return null;

      setLoading(true);
      setLoadingAction('markPaid');
      setProgress({ current: 0, total: count, percent: 0 });

      const result: BatchOperationResult = {
        success: true,
        successCount: 0,
        failedCount: 0,
        failedIds: [],
        errors: [],
      };

      try {
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          try {
            let response;
            if (entityType === 'receipts') {
              response = await billingApi.updateReceipt(id, { status: 'paid' });
            } else {
              response = await billingApi.markInvoicePaid(id);
            }

            if (response.success) {
              result.successCount++;
            } else {
              result.failedCount++;
              result.failedIds.push(id);
              result.errors.push({ id, error: 'Mark paid failed' });
            }
          } catch (err) {
            result.failedCount++;
            result.failedIds.push(id);
            result.errors.push({
              id,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
          }

          updateProgress(i + 1, count);
        }

        result.success = result.failedCount === 0;

        if (result.success) {
          onSuccess?.(result);
          Alert.alert('Success', `Marked ${result.successCount} ${entityLabel}${result.successCount > 1 ? 's' : ''} as paid.`);
        } else if (result.successCount > 0) {
          onSuccess?.(result);
          Alert.alert(
            'Partial Success',
            `Marked ${result.successCount} of ${count} items as paid. ${result.failedCount} failed.`
          );
        } else {
          onError?.('All mark paid operations failed', result);
        }

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Batch mark paid failed';
        onError?.(errorMessage, result);
        return result;
      } finally {
        setLoading(false);
        setLoadingAction(null);
        setProgress(null);
      }
    },
    [entityType, showConfirmationDialog, updateProgress, onSuccess, onError]
  );

  // Batch archive operation
  const batchArchive = useCallback(
    async (ids: string[]): Promise<BatchOperationResult | null> => {
      const count = ids.length;
      if (count === 0) return null;

      if (entityType !== 'receipts' && entityType !== 'invoices') {
        onError?.('Archive operation not supported for this entity type');
        return null;
      }

      const entityLabel = entityType.slice(0, -1);
      const confirmed = await showConfirmationDialog(
        `Archive ${count} ${entityLabel}${count > 1 ? 's' : ''}?`,
        `This will archive ${count} ${entityLabel}${count > 1 ? 's' : ''}. Archived items can be restored later.`,
        `Archive ${count}`
      );

      if (!confirmed) return null;

      setLoading(true);
      setLoadingAction('archive');
      setProgress({ current: 0, total: count, percent: 0 });

      const result: BatchOperationResult = {
        success: true,
        successCount: 0,
        failedCount: 0,
        failedIds: [],
        errors: [],
      };

      try {
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          try {
            const response =
              entityType === 'receipts'
                ? await billingApi.archiveReceipt(id)
                : await billingApi.archiveInvoice(id);

            if (response.success) {
              result.successCount++;
            } else {
              result.failedCount++;
              result.failedIds.push(id);
              result.errors.push({ id, error: 'Archive failed' });
            }
          } catch (err) {
            result.failedCount++;
            result.failedIds.push(id);
            result.errors.push({
              id,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
          }

          updateProgress(i + 1, count);
        }

        result.success = result.failedCount === 0;

        if (result.success) {
          onSuccess?.(result);
          Alert.alert('Success', `Archived ${result.successCount} ${entityLabel}${result.successCount > 1 ? 's' : ''}.`);
        } else if (result.successCount > 0) {
          onSuccess?.(result);
          Alert.alert(
            'Partial Success',
            `Archived ${result.successCount} of ${count} items. ${result.failedCount} failed.`
          );
        } else {
          onError?.('All archive operations failed', result);
        }

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Batch archive failed';
        onError?.(errorMessage, result);
        return result;
      } finally {
        setLoading(false);
        setLoadingAction(null);
        setProgress(null);
      }
    },
    [entityType, showConfirmationDialog, updateProgress, onSuccess, onError]
  );

  return {
    batchDelete,
    batchSend,
    batchMarkPaid,
    batchArchive,
    loading,
    loadingAction,
    progress,
  };
}

export default useBatchOperations;
