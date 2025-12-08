import { getPrismaClient } from '@/lib/prisma'
import type { ConflictResolution, ConflictResolutionType } from '@prisma/client'

export interface ConflictResolutionData {
  conflictId: string
  conflictType: string
  resolutionType: ConflictResolutionType
  affectedEventIds: string[]
  userId?: string
  resolutionData?: any
  conflictMessage?: string
  expiresAt?: Date
}

export class ConflictResolutionService {
  /**
   * Save a conflict resolution to the database
   */
  static async saveResolution(data: ConflictResolutionData): Promise<ConflictResolution> {
    console.log(`🔥 ConflictResolutionService: Saving resolution for conflict ${data.conflictId}`)

    const prisma = getPrismaClient()
    if (!prisma) {
      throw new Error('Database not available')
    }

    const resolution = await prisma.conflictResolution.upsert({
      where: {
        conflictId: data.conflictId
      },
      update: {
        resolutionType: data.resolutionType,
        affectedEventIds: JSON.stringify(data.affectedEventIds),
        resolutionData: data.resolutionData || {},
        resolvedAt: new Date(),
        expiresAt: data.expiresAt
      },
      create: {
        conflictId: data.conflictId,
        conflictType: data.conflictType,
        userId: data.userId,
        resolutionType: data.resolutionType,
        affectedEventIds: JSON.stringify(data.affectedEventIds),
        resolutionData: data.resolutionData || {},
        conflictMessage: data.conflictMessage,
        expiresAt: data.expiresAt
      }
    })

    console.log(`✅ ConflictResolutionService: Resolution saved with ID ${resolution.id}`)
    return resolution
  }

  /**
   * Check if a conflict has been resolved by the user
   */
  static async isConflictResolved(conflictId: string): Promise<boolean> {
    const prisma = getPrismaClient()
    if (!prisma) return false

    const resolution = await prisma.conflictResolution.findUnique({
      where: {
        conflictId: conflictId
      }
    })

    // Check if resolution exists and hasn't expired
    if (resolution) {
      if (resolution.expiresAt && resolution.expiresAt < new Date()) {
        // Resolution has expired, clean it up
        await this.removeResolution(conflictId)
        return false
      }
      return true
    }

    return false
  }

  /**
   * Get a conflict resolution by conflict ID
   */
  static async getResolution(conflictId: string): Promise<ConflictResolution | null> {
    const prisma = getPrismaClient()
    if (!prisma) return null

    return await prisma.conflictResolution.findUnique({
      where: {
        conflictId: conflictId
      }
    })
  }

  /**
   * Get all resolutions for a set of conflict IDs
   */
  static async getResolutions(conflictIds: string[]): Promise<ConflictResolution[]> {
    const prisma = getPrismaClient()
    if (!prisma) return []

    return await prisma.conflictResolution.findMany({
      where: {
        conflictId: {
          in: conflictIds
        }
      }
    })
  }

  /**
   * Remove a conflict resolution (when conflicts change)
   */
  static async removeResolution(conflictId: string): Promise<void> {
    console.log(`🔥 ConflictResolutionService: Removing resolution for conflict ${conflictId}`)

    const prisma = getPrismaClient()
    if (!prisma) return

    await prisma.conflictResolution.delete({
      where: {
        conflictId: conflictId
      }
    }).catch(() => {
      // Ignore if already deleted
    })
  }

  /**
   * Remove multiple conflict resolutions
   */
  static async removeResolutions(conflictIds: string[]): Promise<void> {
    console.log(`🔥 ConflictResolutionService: Removing ${conflictIds.length} resolutions`)

    const prisma = getPrismaClient()
    if (!prisma) return

    await prisma.conflictResolution.deleteMany({
      where: {
        conflictId: {
          in: conflictIds
        }
      }
    })
  }

  /**
   * Clean up expired resolutions
   */
  static async cleanupExpiredResolutions(): Promise<void> {
    const prisma = getPrismaClient()
    if (!prisma) return

    const now = new Date()

    const deleted = await prisma.conflictResolution.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    })

    console.log(`🧹 ConflictResolutionService: Cleaned up ${deleted.count} expired resolutions`)
  }

  /**
   * Filter out conflicts that have been resolved by the user
   */
  static async filterResolvedConflicts<T extends { id: string }>(conflicts: T[]): Promise<T[]> {
    if (conflicts.length === 0) return conflicts

    const conflictIds = conflicts.map(c => c.id)
    const resolutions = await this.getResolutions(conflictIds)
    const resolvedIds = new Set(resolutions.map(r => r.conflictId))

    console.log(`🔥 ConflictResolutionService: Filtering ${conflicts.length} conflicts, ${resolvedIds.size} already resolved`)

    return conflicts.filter(conflict => !resolvedIds.has(conflict.id))
  }

  /**
   * Get resolution history for audit purposes
   */
  static async getResolutionHistory(limit: number = 100): Promise<ConflictResolution[]> {
    const prisma = getPrismaClient()
    if (!prisma) return []

    return await prisma.conflictResolution.findMany({
      take: limit,
      orderBy: {
        resolvedAt: 'desc'
      }
    })
  }
}