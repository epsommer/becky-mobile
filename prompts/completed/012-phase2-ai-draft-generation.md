<objective>
Implement AI draft generation for messages in the Becky CRM mobile app.

This is a high-priority feature from Phase 2. The web app has AI-powered draft generation that helps users compose messages quickly - a significant productivity boost.
</objective>

<context>
**Project:** Becky CRM Mobile App
**Location:** `/Users/epsommer/projects/apps/becky-mobile`
**Tech Stack:** React Native, Expo, TypeScript
**Design System:** Neomorphic

**Web Reference:** Web app has:
- `SidebarDraftAI` component
- `MasterTimelineDraftAI` component
- `/api/ai/analyze-context` endpoint
- Draft message API integration

**Existing Infrastructure:**
- Conversation/messaging screens exist
- Message timeline implemented
- API integration patterns established

**Feature Gap Checklist:** `./analyses/feature-gap-checklist.md`
- Lines 293-297: AI-Powered Features all `[ ]`
- Line 51: `[ ] Master timeline with AI draft - Not implemented`
</context>

<research>
Before implementing, examine:
1. Web AI draft components (SidebarDraftAI, MasterTimelineDraftAI)
2. `/api/ai/analyze-context` endpoint
3. How drafts are generated and displayed on web
4. Existing conversation/message screens in mobile
5. Message creation flow in mobile app

For maximum efficiency, perform multiple searches simultaneously.
</research>

<requirements>
1. **AI Draft Button/Trigger:**
   - Add "Generate Draft" button in message composition
   - Accessible from conversation view
   - Clear visual indicator (sparkle icon, etc.)

2. **Context Analysis:**
   - Send relevant context to AI:
     - Client information
     - Recent conversation history
     - Message type (follow-up, response, etc.)
     - Any selected text or prompts
   - Use existing API endpoint

3. **Draft Display:**
   - Show generated draft in editable text area
   - "Use Draft" to accept
   - "Regenerate" to get new draft
   - "Dismiss" to close
   - Edit draft before using

4. **Draft Types:**
   - Follow-up messages
   - Response to client inquiry
   - Meeting confirmation
   - General outreach
   - User should be able to select type or let AI infer

5. **UX Considerations:**
   - Loading state during generation
   - Streaming response if API supports
   - Keyboard-friendly on mobile
   - Quick access without many taps

6. **Integration:**
   - Works in conversation view
   - Works in message composer
   - Optional: Quick access from client profile
</requirements>

<implementation>
Mobile-specific considerations:
- Consider bottom sheet for draft preview
- Optimize for thumb-zone interaction
- Keep UI simple - mobile doesn't need sidebar approach
- Consider haptic feedback on generation complete

Create modular structure:
- `./components/ai/AIDraftGenerator.tsx` - Main component
- `./services/aiDraft.ts` - API service
- `./hooks/useAIDraft.ts` - React hook
</implementation>

<output>
Create/modify files:
- `./components/ai/AIDraftGenerator.tsx` - Draft generation UI
- `./services/aiDraft.ts` - AI draft API service
- `./hooks/useAIDraft.ts` - Hook for components
- Integrate into conversation/message screens
- Update `./analyses/feature-gap-checklist.md`:
  - Change lines 293-297 from `[ ]` to `[x]` as appropriate
  - Change line 51 from `[ ]` to `[x]`
</output>

<verification>
Before completing, verify:
1. AI draft button visible in message composition
2. Context sent correctly to API
3. Draft displays in editable format
4. Can accept, regenerate, or dismiss draft
5. Draft inserts into message correctly
6. Loading states work properly
7. Error handling for API failures
8. Checklist items updated
</verification>

<success_criteria>
- AI draft generation accessible from messaging
- Drafts are contextually relevant
- Smooth UX for mobile interaction
- Integrated into existing message workflow
- Approximately 5-6 checklist items marked complete
</success_criteria>
