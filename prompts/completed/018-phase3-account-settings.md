<objective>
Implement account settings screen for the Becky CRM mobile app.

Users need the ability to manage their profile, preferences, and account settings from the mobile app.
</objective>

<context>
**Project:** Becky CRM Mobile App
**Location:** `/Users/epsommer/projects/apps/becky-mobile`
**Tech Stack:** React Native, Expo, TypeScript
**Design System:** Neomorphic

**Existing Infrastructure:**
- Account settings panel exists (Line 226)
- Preferences panel exists (Line 233)
- Theme toggle exists but UI not visible

**Feature Gap Checklist:** `./analyses/feature-gap-checklist.md`
- Lines 226-230: Account Settings items
- Lines 233-238: Calendar Preferences items
- Lines 247-252: System Preferences items
</context>

<research>
Before implementing, examine:
1. Existing settings panels in mobile
2. Web account settings
3. API endpoints for settings
4. AuthContext for user data
5. ThemeContext for theme settings

For maximum efficiency, perform multiple searches simultaneously.
</research>

<requirements>
1. **Profile Settings:**
   - Edit name
   - Edit email (with verification)
   - Profile photo
   - Business name

2. **Security:**
   - Change password
   - View active sessions
   - Biometric login toggle

3. **Calendar Preferences:**
   - Default view (day/week/month)
   - Time format (12h/24h)
   - Week start day
   - Working hours

4. **Notification Settings:**
   - Push notification toggle
   - Email notification toggle
   - Reminder settings

5. **Theme Settings:**
   - Light/Dark/Auto toggle
   - Accent color selection (optional)

6. **Data & Privacy:**
   - Export all data
   - Delete account
   - Privacy settings

7. **App Info:**
   - Version number
   - Support links
   - Logout
</requirements>

<implementation>
Create comprehensive settings screen:
- `./components/screens/SettingsScreen.tsx`
- Sections using neomorphic cards
- Navigation to sub-screens if needed
</implementation>

<output>
Create/modify files:
- `./components/screens/SettingsScreen.tsx` - Main settings
- Sub-screens as needed
- Update `./analyses/feature-gap-checklist.md`:
  - Change lines 226-230, 233-238, 247-252 from `[ ]` to `[x]` as appropriate
</output>

<verification>
Before completing, verify:
1. Settings screen accessible
2. Profile edits save correctly
3. Theme toggle works
4. Preferences save and persist
5. Logout works
6. Checklist items updated
</verification>

<success_criteria>
- Comprehensive settings screen
- All key settings functional
- Persistence across app restarts
- Approximately 10-15 checklist items marked complete
</success_criteria>
