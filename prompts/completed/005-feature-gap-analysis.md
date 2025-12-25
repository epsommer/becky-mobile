<objective>
Perform a comprehensive feature gap analysis comparing the Becky CRM mobile app (React Native) with the Becky CRM web app (Next.js). The goal is to identify all functionality that exists in the web version but is missing, incomplete, or needs updating in the mobile version.

This analysis will serve as the implementation roadmap for achieving feature parity between platforms.
</objective>

<context>
Two related projects need comparison:

**Web App (Source of Truth):**
- Location: `/Users/epsommer/projects/web/evangelo-sommer`
- Tech Stack: Next.js, React 19, Prisma, TypeScript
- Key directories: `src/components/`, `src/app/`, `src/hooks/`, `src/lib/`

**Mobile App (Target for Parity):**
- Location: `/Users/epsommer/projects/apps/becky-mobile`
- Tech Stack: React Native, Expo, TypeScript
- Key directories: `components/`, `screens/`, `hooks/`, `context/`

**Already Implemented in Mobile (confirmed by user):**
- Time Manager fundamental changes
- Delete confirmation modals
- Basic component structure exists

Note: Platform differences are expected (web modals → mobile sheets, web sidebar → mobile navigation). Focus on **functional** gaps, not UI pattern differences.
</context>

<research>
Thoroughly analyze both codebases by examining:

1. **Web App Components** - Read key files in:
   - `/Users/epsommer/projects/web/evangelo-sommer/src/components/`
   - `/Users/epsommer/projects/web/evangelo-sommer/src/app/`
   - `/Users/epsommer/projects/web/evangelo-sommer/src/hooks/`

2. **Mobile App Components** - Read key files in:
   - `/Users/epsommer/projects/apps/becky-mobile/components/`
   - `/Users/epsommer/projects/apps/becky-mobile/components/screens/`
   - `/Users/epsommer/projects/apps/becky-mobile/components/calendar/`
   - `/Users/epsommer/projects/apps/becky-mobile/hooks/`

3. **API Integration** - Compare:
   - Web API routes in `src/app/api/`
   - Mobile API calls and services

For maximum efficiency, invoke multiple file reads and searches simultaneously rather than sequentially.
</research>

<analysis_requirements>
Create a comprehensive checklist covering these categories:

### 1. Core Features
- Client management (CRUD, profiles, search)
- Conversation/messaging features
- Billing and receipts
- Testimonials system
- Calendar/Time Manager

### 2. Calendar/Time Manager Specifics
Compare all calendar functionality:
- Event creation/editing/deletion
- Drag-drop interactions
- Resize functionality
- View modes (day, week, month, year)
- Recurring events
- Event conflicts/overlap handling
- Quick entry/creation

### 3. UI Components
- Modals and sheets
- Form components
- Navigation patterns
- Theming/dark mode support
- Neomorphic design elements

### 4. Integrations
- Google Calendar sync
- Notion integration
- Other external services

### 5. Settings & Preferences
- Account settings
- Notifications
- Calendar preferences
- System preferences

### 6. Data & State Management
- Context providers
- Hooks (custom hooks parity)
- API service layer
- Caching/offline support

### 7. Advanced Features
- AI-powered features (drafts, insights)
- Analytics/reporting
- Import/export functionality
</analysis_requirements>

<output_format>
Save the analysis to: `./analyses/feature-gap-checklist.md`

Structure the output as:

```markdown
# Becky Mobile Feature Gap Analysis
Generated: [date]

## Summary
- Total features analyzed: X
- Fully implemented: X
- Partially implemented: X
- Not implemented: X
- Not applicable (platform-specific): X

## Checklist by Category

### 1. Core Features

#### Client Management
- [ ] Feature name - Brief description of gap
- [x] Feature name - Already implemented
- [~] Feature name - Partially implemented (notes)

[Continue for all categories...]

## Priority Recommendations
1. Critical gaps (blocking core functionality)
2. High priority (important user workflows)
3. Medium priority (nice-to-have features)
4. Low priority (can defer)

## Implementation Notes
[Any important technical considerations for implementing missing features]
```

Use these markers:
- `[ ]` - Not implemented
- `[x]` - Fully implemented
- `[~]` - Partially implemented (add notes)
- `[N/A]` - Not applicable for mobile
</output_format>

<verification>
Before completing, verify:
1. All major web components have been examined
2. All mobile components have been cross-referenced
3. Each checklist item has accurate status
4. Categories are comprehensive and nothing major is missed
5. Priority recommendations are actionable
</verification>

<success_criteria>
- Complete comparison of both codebases performed
- Every major feature category analyzed
- Clear checklist with accurate [ ]/[x]/[~] markers
- Priority recommendations provided
- Analysis saved to specified location
- Checklist is actionable for future implementation work
</success_criteria>
