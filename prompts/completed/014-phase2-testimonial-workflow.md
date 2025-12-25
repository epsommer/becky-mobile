<objective>
Implement testimonial approval workflow for the Becky CRM mobile app.

This is a high-priority feature from Phase 2. The mobile app can display testimonials but lacks the ability to approve, reject, feature, or manage testimonial visibility.
</objective>

<context>
**Project:** Becky CRM Mobile App
**Location:** `/Users/epsommer/projects/apps/becky-mobile`
**Tech Stack:** React Native, Expo, TypeScript
**Design System:** Neomorphic

**Web Reference:** Web app has:
- Approve/reject buttons on testimonials
- Featured testimonial toggle
- Public/private visibility toggle
- Star ratings display
- ImportTestimonialModal

**Existing Infrastructure:**
- Testimonial list exists
- Testimonial request modal exists
- Basic filtering by status exists
- useTestimonials hook exists

**Feature Gap Checklist:** `./analyses/feature-gap-checklist.md`
- Lines 83-92: Multiple testimonial items marked `[ ]`
</context>

<research>
Before implementing, examine:
1. Web testimonial management UI
2. Existing testimonial list in mobile
3. useTestimonials hook functionality
4. API endpoints for testimonial updates
5. Testimonial data model (status, featured, visibility fields)

For maximum efficiency, perform multiple searches simultaneously.
</research>

<requirements>
1. **Testimonial Card Enhancement:**
   - Display star rating
   - Show submitted date
   - Show client name/photo
   - Display testimonial text (expandable if long)
   - Status badge (pending, approved, rejected)

2. **Approval Actions:**
   - Quick approve button
   - Quick reject button
   - Confirmation for reject (with optional reason)
   - Bulk approve/reject using selection mode (from 013)

3. **Featured Toggle:**
   - "Feature" toggle on testimonial
   - Featured testimonials highlighted in list
   - Only approved testimonials can be featured

4. **Visibility Toggle:**
   - Public/private toggle
   - Clear indicator of current visibility
   - Only approved testimonials can be public

5. **Testimonial Details:**
   - Tap testimonial to see full details
   - Edit capability for minor adjustments
   - Delete option with confirmation
   - Service line association

6. **Filtering Enhancement:**
   - Filter by: All, Pending, Approved, Rejected
   - Filter by: Featured, Not Featured
   - Filter by: Public, Private
   - Sort by date, rating
</requirements>

<implementation>
Enhance existing components:
- Modify testimonial list items
- Add action buttons/swipe actions
- Create testimonial detail modal if needed

Mobile patterns:
- Swipe left for reject, right for approve
- Or: action buttons in card footer
- Quick toggle switches for featured/visibility
</implementation>

<output>
Create/modify files:
- Enhance testimonial list component
- Add/modify testimonial card component
- Create testimonial detail modal if needed
- Update useTestimonials hook if needed
- Update `./analyses/feature-gap-checklist.md`:
  - Change lines 83-92 from `[ ]` to `[x]` as appropriate
</output>

<verification>
Before completing, verify:
1. Testimonials display with star ratings
2. Can approve testimonials
3. Can reject testimonials (with confirmation)
4. Featured toggle works
5. Visibility toggle works
6. Enhanced filtering works
7. Testimonial deletion works (with confirmation)
8. API calls complete successfully
9. Checklist items updated
</verification>

<success_criteria>
- Full testimonial lifecycle management
- Approve/reject/feature/visibility controls
- Enhanced display with ratings
- Mobile-friendly actions
- Approximately 8-10 checklist items marked complete
</success_criteria>
