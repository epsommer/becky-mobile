<objective>
Implement household management for the Becky CRM mobile app.

This feature allows users to group related clients (family members, business partners) into households for better relationship management.
</objective>

<context>
**Project:** Becky CRM Mobile App
**Location:** `/Users/epsommer/projects/apps/becky-mobile`
**Tech Stack:** React Native, Expo, TypeScript
**Design System:** Neomorphic

**Web Reference:** Web has full household/relationship support.

**Feature Gap Checklist:** `./analyses/feature-gap-checklist.md`
- Line 26: `[ ] Household management - Not implemented`
</context>

<research>
Before implementing, examine:
1. Web household implementation
2. API endpoints for households
3. Client data model (relationship fields)
4. Client detail screen in mobile
5. How households are displayed on web

For maximum efficiency, perform multiple searches simultaneously.
</research>

<requirements>
1. **Household Creation:**
   - Create new household
   - Name the household
   - Add primary contact
   - Add additional members

2. **Household Display:**
   - Show household badge on client cards
   - Household section in client detail
   - List all household members
   - Link to other members

3. **Household Management:**
   - Add client to existing household
   - Remove client from household
   - Change primary contact
   - Delete household (ungroups members)

4. **Relationship Types:**
   - Define relationship (spouse, child, parent, etc.)
   - Display relationship on client card

5. **Billing Integration:**
   - Option to bill household vs individual
   - Household billing summary
</requirements>

<implementation>
Enhance client components:
- Add household section to client detail
- Create household selector modal
- Add relationship display to client cards

Create household service:
- `./services/households.ts`
- `./hooks/useHouseholds.ts`
</implementation>

<output>
Create/modify files:
- `./services/households.ts` - Household API service
- `./hooks/useHouseholds.ts` - Household hook
- `./components/modals/HouseholdModal.tsx` - Household management
- Modify client detail screen
- Update `./analyses/feature-gap-checklist.md`:
  - Change line 26 from `[ ]` to `[x]`
</output>

<verification>
Before completing, verify:
1. Can create household
2. Can add/remove clients
3. Household displays on client cards
4. Can navigate between household members
5. Relationships display correctly
6. Checklist updated
</verification>

<success_criteria>
- Household CRUD operations work
- Integrated into client management
- Relationships visible and navigable
- One checklist item marked complete
</success_criteria>
