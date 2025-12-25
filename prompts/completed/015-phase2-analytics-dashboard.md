<objective>
Implement analytics dashboard for the Becky CRM mobile app.

This is the final high-priority feature from Phase 2. A comprehensive analytics dashboard provides business insights - revenue, growth, client metrics - that are missing from the mobile app.
</objective>

<context>
**Project:** Becky CRM Mobile App
**Location:** `/Users/epsommer/projects/apps/becky-mobile`
**Tech Stack:** React Native, Expo, TypeScript
**Design System:** Neomorphic

**Web Reference:** Web app has:
- Dashboard with KPIs
- `/api/analytics/revenue` endpoint
- `/api/analytics/growth` endpoint
- ConversationAnalytics component
- Data visualizations (charts)

**Existing Infrastructure:**
- Mobile has simplified ClientPage as dashboard
- Basic navigation structure exists
- Neomorphic card components available

**Feature Gap Checklist:** `./analyses/feature-gap-checklist.md`
- Lines 299-307: Analytics & Reporting all `[ ]`
- Line 30: `[ ] Client analytics/insights - Not implemented`
- Line 77: `[ ] Billing analytics - Not implemented`
</context>

<research>
Before implementing, examine:
1. Web dashboard and analytics components
2. API analytics endpoints
3. Current mobile "dashboard" structure
4. React Native charting libraries (react-native-chart-kit, victory-native)
5. KPIs displayed on web

For maximum efficiency, perform multiple searches simultaneously.
</research>

<requirements>
1. **Dashboard Screen:**
   - Dedicated analytics/dashboard tab or screen
   - Pull-to-refresh for latest data
   - Date range selector (this week, this month, this year, custom)

2. **Key Metrics Cards:**
   - Revenue (total, by period)
   - Growth metrics (new clients, client retention)
   - Active clients count
   - Pending invoices/receipts
   - Upcoming events count
   - Outstanding amounts

3. **Revenue Analytics:**
   - Revenue by time period (chart)
   - Revenue by service line (breakdown)
   - Comparison to previous period
   - Revenue trends

4. **Client Analytics:**
   - New clients over time
   - Client status distribution (active, prospect, etc.)
   - Top clients by revenue
   - Client acquisition trends

5. **Activity Metrics:**
   - Conversations by type
   - Response time metrics (if available)
   - Event completion rate
   - Billable hours (ties to time tracker)

6. **Visualizations:**
   - Line charts for trends
   - Bar charts for comparisons
   - Pie/donut charts for distributions
   - Keep charts simple and readable on mobile
</requirements>

<implementation>
Choose charting library:
- react-native-chart-kit (simpler, good for basic charts)
- victory-native (more powerful, larger bundle)
- react-native-svg-charts (flexible)

Structure:
- `./components/screens/AnalyticsDashboard.tsx` - Main screen
- `./components/analytics/` - Chart and metric components
- `./hooks/useAnalytics.ts` - Data fetching
- `./services/analytics.ts` - API calls

Mobile considerations:
- Optimize chart sizes for phone screens
- Use scrollable sections for more data
- Consider skeleton loading for charts
- Horizontal scroll for wide charts if needed
</implementation>

<output>
Create/modify files:
- `./components/screens/AnalyticsDashboard.tsx` - Dashboard screen
- `./components/analytics/RevenueChart.tsx` - Revenue visualization
- `./components/analytics/ClientMetrics.tsx` - Client metrics
- `./components/analytics/MetricCard.tsx` - KPI card component
- `./hooks/useAnalytics.ts` - Analytics data hook
- `./services/analytics.ts` - API service
- Add to navigation
- Update `./analyses/feature-gap-checklist.md`:
  - Change lines 299-307 from `[ ]` to `[x]` as appropriate
  - Change lines 30, 77 from `[ ]` to `[x]`
</output>

<verification>
Before completing, verify:
1. Dashboard screen accessible from navigation
2. KPI cards display correct data
3. Revenue chart renders properly
4. Client metrics display
5. Date range selector works
6. Pull-to-refresh updates data
7. Loading states for charts
8. Error handling for API failures
9. Charts readable on mobile screen sizes
10. Checklist items updated
</verification>

<success_criteria>
- Full analytics dashboard functional
- Key business metrics visible
- Charts render correctly on mobile
- Data from API displays accurately
- Approximately 10 checklist items marked complete
</success_criteria>
