import {
  saveConflictResolution,
  isConflictResolved,
  getConflictResolutions,
  filterResolvedConflicts as filterResolvedConflictsAction,
  removeConflictResolution,
  cleanupExpiredResolutions
} from '@/app/actions/conflict-resolution'

export interface ConflictResolutionData {
  conflictId: string
  conflictType: string
  resolutionType: 'ACCEPT' | 'DELETE' | 'RESCHEDULE' | 'OVERRIDE' | 'IGNORE'
  affectedEventIds: string[]
  userId?: string
  resolutionData?: any
  conflictMessage?: string
  expiresAt?: Date
}

/**
 * Client-side ConflictResolutionService that uses server actions
 * This prevents database initialization issues on the client-side
 */
export class ConflictResolutionClientService {
  /**
   * Save a conflict resolution to the database
   */
  static async saveResolution(data: ConflictResolutionData) {
    console.log(`🔥 ConflictResolutionClientService: Saving resolution for conflict ${data.conflictId}`)

    const result = await saveConflictResolution(data)

    if (result.success) {
      console.log(`✅ ConflictResolutionClientService: Resolution saved`)
      return result.data
    } else {
      throw new Error(result.error || 'Failed to save resolution')
    }
  }

  /**
   * Check if a conflict has been resolved by the user
   */
  static async isConflictResolved(conflictId: string): Promise<boolean> {
    const result = await isConflictResolved(conflictId)

    if (result.success) {
      return result.data || false
    } else {
      console.error('Failed to check conflict resolution:', result.error)
      return false
    }
  }

  /**
   * Get all resolutions for a set of conflict IDs
   */
  static async getResolutions(conflictIds: string[]) {
    const result = await getConflictResolutions(conflictIds)

    if (result.success) {
      return result.data
    } else {
      console.error('Failed to get conflict resolutions:', result.error)
      return []
    }
  }

  /**
   * Remove a conflict resolution (when conflicts change)
   */
  static async removeResolution(conflictId: string): Promise<void> {
    console.log(`🔥 ConflictResolutionClientService: Removing resolution for conflict ${conflictId}`)

    const result = await removeConflictResolution(conflictId)

    if (!result.success) {
      console.error('Failed to remove conflict resolution:', result.error)
    }
  }

  /**
   * Filter out conflicts that have been resolved by the user
   */
  static async filterResolvedConflicts<T extends { id: string }>(conflicts: T[]): Promise<T[]> {
    if (conflicts.length === 0) return conflicts

    console.log(`🔥 ConflictResolutionClientService: Filtering ${conflicts.length} conflicts`)

    const result = await filterResolvedConflictsAction(conflicts)

    if (result.success) {
      const filteredConflicts = result.data as T[]
      const resolvedCount = conflicts.length - filteredConflicts.length
      console.log(`🔥 ConflictResolutionClientService: Filtered ${resolvedCount} resolved conflicts`)
      return filteredConflicts
    } else {
      console.error('Failed to filter resolved conflicts, returning all conflicts')
      return conflicts
    }
  }

  /**
   * Clean up expired resolutions
   */
  static async cleanupExpiredResolutions(): Promise<void> {
    const result = await cleanupExpiredResolutions()

    if (!result.success) {
      console.error('Failed to cleanup expired resolutions:', result.error)
    }
  }
}