<objective>
Implement offline support and data caching for the Becky CRM mobile app.

This is the final Phase 4 feature, enabling the app to work without constant internet connectivity.
</objective>

<context>
**Project:** Becky CRM Mobile App
**Location:** `/Users/epsommer/projects/apps/becky-mobile`
**Tech Stack:** React Native, Expo, TypeScript
**Design System:** Neomorphic

**Existing Infrastructure:**
- WatermelonDB is already in dependencies (Line 14-15 of package.json)
- AsyncStorage available
- API integration patterns established

**Feature Gap Checklist:** `./analyses/feature-gap-checklist.md`
- Line 285: `[ ] Offline support/caching - Not clear if implemented`
- Line 288: `[ ] Background sync - Not clear`
</context>

<research>
Before implementing, examine:
1. WatermelonDB setup and usage patterns
2. Current AsyncStorage usage
3. API service layer structure
4. Sync patterns for offline-first apps
5. What data needs offline access most

For maximum efficiency, perform multiple searches simultaneously.
</research>

<requirements>
1. **Local Database:**
   - Use WatermelonDB (already installed)
   - Define schemas for key entities
   - Clients, events, receipts, etc.

2. **Data Sync:**
   - Sync when online
   - Queue changes when offline
   - Conflict resolution strategy
   - Background sync when possible

3. **Offline Indicators:**
   - Show offline status
   - Indicate pending changes
   - Show last sync time

4. **Caching Strategy:**
   - Cache API responses
   - Invalidate stale data
   - Prioritize frequently accessed data

5. **Optimistic Updates:**
   - Update UI immediately
   - Sync to server in background
   - Rollback on failure

6. **Selective Offline:**
   - Full offline for core features
   - Graceful degradation for others
   - Clear messaging about limitations
</requirements>

<implementation>
Build on WatermelonDB:
- Define schemas in `./database/`
- Create sync service
- Wrap API calls with offline support

Create offline infrastructure:
- `./database/schema.ts`
- `./database/models/`
- `./services/sync.ts`
- `./hooks/useOffline.ts`
</implementation>

<output>
Create/modify files:
- `./database/schema.ts` - WatermelonDB schema
- `./database/models/` - Model definitions
- `./services/sync.ts` - Sync service
- `./hooks/useOffline.ts` - Offline state hook
- Update API calls to use local DB first
- Update `./analyses/feature-gap-checklist.md`:
  - Change lines 285, 288 from `[ ]` to `[x]`
</output>

<verification>
Before completing, verify:
1. Data persists when offline
2. Changes queue when offline
3. Sync occurs when back online
4. Conflicts handled gracefully
5. Offline indicator shows status
6. Core features work offline
7. Checklist items updated
</verification>

<success_criteria>
- WatermelonDB schema and models working
- Sync service functional
- Core features work offline
- Two checklist items marked complete
</success_criteria>
