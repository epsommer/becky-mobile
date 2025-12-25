/**
 * Household Hooks
 *
 * Custom React hooks for managing household data in the Becky CRM mobile app.
 * Provides state management, data fetching, and CRUD operations for households.
 *
 * @module hooks/useHouseholds
 */

import { useState, useEffect, useCallback } from 'react';
import {
  householdsApi,
  Household,
  HouseholdMemberSummary,
  CreateHouseholdData,
  UpdateHouseholdData,
  AddMemberData,
  UpdateMemberData,
} from '../services/households';

// ============================================================================
// Hook: useHouseholds - List all households
// ============================================================================

interface UseHouseholdsResult {
  households: Household[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage a list of all households
 *
 * @example
 * ```tsx
 * function HouseholdList() {
 *   const { households, loading, error, refetch } = useHouseholds();
 *
 *   if (loading) return <Text>Loading...</Text>;
 *   if (error) return <Text>Error: {error}</Text>;
 *
 *   return (
 *     <FlatList
 *       data={households}
 *       renderItem={({ item }) => <HouseholdCard household={item} />}
 *       onRefresh={refetch}
 *     />
 *   );
 * }
 * ```
 */
export function useHouseholds(): UseHouseholdsResult {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHouseholds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await householdsApi.getHouseholds();
      if (response.success && response.data) {
        setHouseholds(response.data);
      } else {
        console.error('[useHouseholds] Failed to load households:', response);
        setHouseholds([]);
        setError(response.error || 'Failed to load households');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load households';
      setError(message);
      console.error('[useHouseholds] Error fetching households:', err);
      setHouseholds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHouseholds();
  }, [fetchHouseholds]);

  return {
    households,
    loading,
    error,
    refetch: fetchHouseholds,
  };
}

// ============================================================================
// Hook: useHousehold - Single household with members
// ============================================================================

interface UseHouseholdResult {
  household: Household | null;
  members: HouseholdMemberSummary[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch a single household with its members
 *
 * @param householdId - ID of the household to fetch (null to skip fetch)
 *
 * @example
 * ```tsx
 * function HouseholdDetail({ householdId }: { householdId: string }) {
 *   const { household, members, loading, error } = useHousehold(householdId);
 *
 *   if (loading) return <Text>Loading...</Text>;
 *   if (!household) return <Text>Household not found</Text>;
 *
 *   return (
 *     <View>
 *       <Text>{household.name}</Text>
 *       <Text>{household.accountType}</Text>
 *       {members.map(member => (
 *         <MemberCard key={member.id} member={member} />
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useHousehold(householdId: string | null): UseHouseholdResult {
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHousehold = useCallback(async () => {
    if (!householdId) {
      setHousehold(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await householdsApi.getHousehold(householdId);
      if (response.success && response.data) {
        setHousehold(response.data);
      } else {
        console.error('[useHousehold] Failed to load household:', response);
        setHousehold(null);
        setError(response.error || 'Failed to load household');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load household';
      setError(message);
      console.error('[useHousehold] Error fetching household:', err);
      setHousehold(null);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetchHousehold();
  }, [fetchHousehold]);

  return {
    household,
    members: household?.members || [],
    loading,
    error,
    refetch: fetchHousehold,
  };
}

// ============================================================================
// Hook: useClientHousehold - Get household for a specific client
// ============================================================================

interface UseClientHouseholdResult {
  household: Household | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch the household a client belongs to
 *
 * @param clientId - ID of the client (null to skip fetch)
 *
 * @example
 * ```tsx
 * function ClientHouseholdBadge({ clientId }: { clientId: string }) {
 *   const { household, loading } = useClientHousehold(clientId);
 *
 *   if (loading || !household) return null;
 *
 *   return (
 *     <Badge>
 *       <Text>{household.name}</Text>
 *     </Badge>
 *   );
 * }
 * ```
 */
export function useClientHousehold(clientId: string | null): UseClientHouseholdResult {
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClientHousehold = useCallback(async () => {
    if (!clientId) {
      setHousehold(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await householdsApi.getClientHousehold(clientId);
      if (response.success) {
        setHousehold(response.data || null);
      } else {
        console.error('[useClientHousehold] Failed to load client household:', response);
        setHousehold(null);
        // Don't set error for 404 - client may not have a household
        if (response.error && !response.error.includes('not found')) {
          setError(response.error);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load client household';
      // Don't set error for network issues when checking household
      console.error('[useClientHousehold] Error fetching client household:', err);
      setHousehold(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClientHousehold();
  }, [fetchClientHousehold]);

  return {
    household,
    loading,
    error,
    refetch: fetchClientHousehold,
  };
}

// ============================================================================
// Hook: useHouseholdMutations - CRUD operations
// ============================================================================

interface HouseholdMutations {
  createHousehold: (data: CreateHouseholdData) => Promise<Household | null>;
  updateHousehold: (householdId: string, data: UpdateHouseholdData) => Promise<Household | null>;
  deleteHousehold: (householdId: string) => Promise<boolean>;
  addMember: (householdId: string, data: AddMemberData) => Promise<Household | null>;
  updateMember: (
    householdId: string,
    clientId: string,
    data: UpdateMemberData
  ) => Promise<Household | null>;
  removeMember: (householdId: string, clientId: string) => Promise<Household | null>;
  setPrimaryContact: (householdId: string, clientId: string) => Promise<Household | null>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook providing mutation functions for household CRUD operations
 *
 * @example
 * ```tsx
 * function HouseholdManager() {
 *   const {
 *     createHousehold,
 *     addMember,
 *     removeMember,
 *     loading,
 *     error
 *   } = useHouseholdMutations();
 *
 *   const handleCreate = async () => {
 *     const household = await createHousehold({
 *       name: 'Smith Household',
 *       accountType: 'FAMILY',
 *     });
 *     if (household) {
 *       console.log('Created:', household.id);
 *     }
 *   };
 *
 *   const handleAddMember = async (householdId: string, clientId: string) => {
 *     await addMember(householdId, {
 *       clientId,
 *       relationshipRole: 'Spouse',
 *     });
 *   };
 *
 *   return (
 *     <View>
 *       <Button onPress={handleCreate} disabled={loading}>
 *         Create Household
 *       </Button>
 *       {error && <Text style={{ color: 'red' }}>{error}</Text>}
 *     </View>
 *   );
 * }
 * ```
 */
export function useHouseholdMutations(): HouseholdMutations {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createHousehold = useCallback(
    async (data: CreateHouseholdData): Promise<Household | null> => {
      try {
        setLoading(true);
        setError(null);
        const response = await householdsApi.createHousehold(data);
        if (response.success && response.data) {
          console.log('[useHouseholdMutations] Household created:', response.data.id);
          return response.data;
        }
        console.error('[useHouseholdMutations] Failed to create household:', response);
        setError(response.error || 'Failed to create household');
        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create household';
        setError(message);
        console.error('[useHouseholdMutations] Error creating household:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateHousehold = useCallback(
    async (householdId: string, data: UpdateHouseholdData): Promise<Household | null> => {
      try {
        setLoading(true);
        setError(null);
        const response = await householdsApi.updateHousehold(householdId, data);
        if (response.success && response.data) {
          console.log('[useHouseholdMutations] Household updated:', householdId);
          return response.data;
        }
        console.error('[useHouseholdMutations] Failed to update household:', response);
        setError(response.error || 'Failed to update household');
        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update household';
        setError(message);
        console.error('[useHouseholdMutations] Error updating household:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteHousehold = useCallback(async (householdId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const response = await householdsApi.deleteHousehold(householdId);
      if (response.success) {
        console.log('[useHouseholdMutations] Household deleted:', householdId);
        return true;
      }
      console.error('[useHouseholdMutations] Failed to delete household:', response);
      setError(response.error || 'Failed to delete household');
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete household';
      setError(message);
      console.error('[useHouseholdMutations] Error deleting household:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const addMember = useCallback(
    async (householdId: string, data: AddMemberData): Promise<Household | null> => {
      try {
        setLoading(true);
        setError(null);
        const response = await householdsApi.addMember(householdId, data);
        if (response.success && response.data) {
          console.log('[useHouseholdMutations] Member added to household:', householdId);
          return response.data;
        }
        console.error('[useHouseholdMutations] Failed to add member:', response);
        setError(response.error || 'Failed to add member');
        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add member';
        setError(message);
        console.error('[useHouseholdMutations] Error adding member:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateMember = useCallback(
    async (
      householdId: string,
      clientId: string,
      data: UpdateMemberData
    ): Promise<Household | null> => {
      try {
        setLoading(true);
        setError(null);
        const response = await householdsApi.updateMember(householdId, clientId, data);
        if (response.success && response.data) {
          console.log('[useHouseholdMutations] Member updated in household:', householdId);
          return response.data;
        }
        console.error('[useHouseholdMutations] Failed to update member:', response);
        setError(response.error || 'Failed to update member');
        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update member';
        setError(message);
        console.error('[useHouseholdMutations] Error updating member:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const removeMember = useCallback(
    async (householdId: string, clientId: string): Promise<Household | null> => {
      try {
        setLoading(true);
        setError(null);
        const response = await householdsApi.removeMember(householdId, clientId);
        if (response.success && response.data) {
          console.log('[useHouseholdMutations] Member removed from household:', householdId);
          return response.data;
        }
        console.error('[useHouseholdMutations] Failed to remove member:', response);
        setError(response.error || 'Failed to remove member');
        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove member';
        setError(message);
        console.error('[useHouseholdMutations] Error removing member:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const setPrimaryContact = useCallback(
    async (householdId: string, clientId: string): Promise<Household | null> => {
      try {
        setLoading(true);
        setError(null);
        const response = await householdsApi.setPrimaryContact(householdId, clientId);
        if (response.success && response.data) {
          console.log(
            '[useHouseholdMutations] Primary contact set for household:',
            householdId
          );
          return response.data;
        }
        console.error('[useHouseholdMutations] Failed to set primary contact:', response);
        setError(response.error || 'Failed to set primary contact');
        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to set primary contact';
        setError(message);
        console.error('[useHouseholdMutations] Error setting primary contact:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    createHousehold,
    updateHousehold,
    deleteHousehold,
    addMember,
    updateMember,
    removeMember,
    setPrimaryContact,
    loading,
    error,
  };
}
