'use server'

import { ConflictResolutionService, ConflictResolutionData } from '@/lib/conflict-resolution-service'
import { revalidatePath } from 'next/cache'

/**
 * Server action to save a conflict resolution
 */
export async function saveConflictResolution(data: ConflictResolutionData) {
  try {
    const resolution = await ConflictResolutionService.saveResolution(data)
    revalidatePath('/time-manager')
    return { success: true, data: resolution }
  } catch (error) {
    console.error('Failed to save conflict resolution:', error)
    return { success: false, error: 'Failed to save conflict resolution' }
  }
}

/**
 * Server action to check if a conflict has been resolved
 */
export async function isConflictResolved(conflictId: string) {
  try {
    const isResolved = await ConflictResolutionService.isConflictResolved(conflictId)
    return { success: true, data: isResolved }
  } catch (error) {
    console.error('Failed to check conflict resolution:', error)
    return { success: false, error: 'Failed to check conflict resolution' }
  }
}

/**
 * Server action to get conflict resolutions for multiple conflict IDs
 */
export async function getConflictResolutions(conflictIds: string[]) {
  try {
    const resolutions = await ConflictResolutionService.getResolutions(conflictIds)
    return { success: true, data: resolutions }
  } catch (error) {
    console.error('Failed to get conflict resolutions:', error)
    return { success: false, error: 'Failed to get conflict resolutions' }
  }
}

/**
 * Server action to filter out resolved conflicts
 */
export async function filterResolvedConflicts<T extends { id: string }>(conflicts: T[]) {
  try {
    const filteredConflicts = await ConflictResolutionService.filterResolvedConflicts(conflicts)
    return { success: true, data: filteredConflicts }
  } catch (error) {
    console.error('Failed to filter resolved conflicts:', error)
    return { success: false, data: conflicts } // Return all conflicts if filtering fails
  }
}

/**
 * Server action to remove a conflict resolution
 */
export async function removeConflictResolution(conflictId: string) {
  try {
    await ConflictResolutionService.removeResolution(conflictId)
    revalidatePath('/time-manager')
    return { success: true }
  } catch (error) {
    console.error('Failed to remove conflict resolution:', error)
    return { success: false, error: 'Failed to remove conflict resolution' }
  }
}

/**
 * Server action to clean up expired resolutions
 */
export async function cleanupExpiredResolutions() {
  try {
    await ConflictResolutionService.cleanupExpiredResolutions()
    return { success: true }
  } catch (error) {
    console.error('Failed to cleanup expired resolutions:', error)
    return { success: false, error: 'Failed to cleanup expired resolutions' }
  }
}