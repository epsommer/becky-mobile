<objective>
Implement a complete contact-to-client conversion system in becky-mobile that allows users to:
1. View synced device contacts with per-contact action buttons
2. Select contacts (individually or batch) to convert into clients
3. Review and edit contact information in a confirmation modal before creating clients
4. Navigate to SMS conversations and view contact details from the contact list

This feature bridges the gap between imported device contacts and the CRM client database, enabling efficient client onboarding from existing phone contacts.
</objective>

<context>
The becky-mobile app is a React Native/Expo CRM application for managing clients, billing, and communications. The codebase already has:

- Contact sync functionality via `ContactImportPanel` and `useContactImport` hook
- Local contacts stored in WatermelonDB via `LocalContact` model
- `ContactsListScreen` showing synced contacts with batch selection capability
- Client API endpoints in `lib/api/endpoints/clients.ts` with `createClient` method
- Client detail pages accessible via `onViewClientDetail` callback
- Theme system with tokens for consistent styling

Key files to reference:
- `@components/screens/ContactsListScreen.tsx` - Current contacts list with selection
- `@components/ContactImportPanel.tsx` - Import trigger and stats
- `@lib/database/models/LocalContact.ts` - Contact data model
- `@lib/api/endpoints/clients.ts` - Client creation API
- `@components/screens/ClientDetailScreen.tsx` - Client detail page structure
- `@lib/api/types.ts` - Type definitions including CreateClientData

The current `ContactsListScreen` has:
- FlatList rendering contacts with checkboxes for selection
- Batch action bar showing "X selected" with "Create Clients" button
- Search and filter functionality
- Synced/unsynced status indicators
</context>

<requirements>
<per_contact_actions>
Each contact row in the list must display three action buttons:

1. **Create Client** (person-add icon)
   - Opens the batch confirmation modal with just this contact pre-selected
   - Same flow as batch selection but for single contact

2. **Open SMS** (chatbubble icon)
   - Uses `expo-linking` to open the device's default SMS app
   - Pass the contact's phone number to pre-fill the recipient
   - Handle case where contact has no phone number (disable or show tooltip)

3. **View Contact Info** (information-circle icon)
   - Opens a modal or bottom sheet displaying contact details
   - Show: name, phone(s), email(s), company, address if available
   - Include button to open device contacts app OR replicate info in app
   - Use `expo-contacts` to fetch full contact details by deviceContactId

Action buttons should be compact (icon-only with 32-36px touch target) and appear on the right side of each contact row, replacing the current sync status badge area.
</per_contact_actions>

<batch_confirmation_modal>
Create a new `BatchClientCreationModal` component with:

**Header Section:**
- Title: "Create X Clients" (where X is count)
- Subtitle showing brief summary: "From your device contacts"
- Close/cancel button

**Contact List Preview:**
- Scrollable list of selected contacts
- Each row shows:
  - Contact name (editable inline or tap-to-edit)
  - Phone number (editable)
  - Email (editable)
  - Checkbox to include/exclude from batch
- Visual indicator for missing required fields (e.g., no name)

**Editable Fields:**
Tap on any field to edit before creating:
- Name (required - highlight if missing)
- Phone (optional but recommended)
- Email (optional but recommended)
- Default client status: "prospect"

**Footer Actions:**
- Cancel button (secondary style)
- "Create X Clients" button (primary style, shows final count)
- Disabled if no contacts selected or all have validation errors

**Validation:**
- At minimum, each contact must have a name
- Show inline validation errors for missing name
- Allow proceeding with incomplete phone/email (these are optional)
</batch_confirmation_modal>

<client_creation_flow>
When user confirms batch creation:

1. Show loading state with progress indicator
2. Map each contact to `CreateClientData`:
   ```typescript
   {
     name: contact.editedName || contact.displayName,
     email: contact.editedEmail || contact.email,
     phone: contact.editedPhone || contact.phone,
     company: contact.company,
     status: 'prospect',
     // Optional: store reference to original contact
     metadata: { sourceContactId: contact.deviceContactId }
   }
   ```
3. Call `clientsApi.createClient()` for each contact
4. Track successes and failures
5. On completion:
   - Show success toast/banner with count
   - Update LocalContact records to mark as "matched" with new clientId
   - Stay on contacts screen (do not navigate away)
   - Refresh the contacts list to show updated sync status

**Error Handling:**
- If some clients fail to create, show partial success message
- Display which contacts failed and why
- Allow retry for failed contacts
</client_creation_flow>

<view_contact_info_modal>
Create a `ContactInfoModal` component:

**Layout:**
- Modal overlay with slide-up animation
- Contact avatar placeholder or initials
- Full name prominently displayed

**Information Display:**
Use a clean template layout showing:
- Phone numbers (with type labels: mobile, home, work)
- Email addresses (with type labels)
- Company/organization
- Physical address if available
- Notes field if available from device

**Actions:**
- "Open in Contacts" button - uses `expo-linking` to open device contacts app
- "Create Client" button - pre-fills the confirmation modal with this contact
- Close button
</view_contact_info_modal>

<sms_integration>
For the SMS action:

```typescript
import * as Linking from 'expo-linking';

const openSMS = async (phoneNumber: string) => {
  const url = Platform.OS === 'ios'
    ? `sms:${phoneNumber}`
    : `sms:${phoneNumber}?body=`;

  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    Alert.alert('Unable to open SMS', 'This device cannot send SMS messages.');
  }
};
```

Handle edge cases:
- Contact without phone number: disable button, show muted state
- Invalid phone format: attempt to normalize before opening
</sms_integration>
</requirements>

<implementation>
**New Files to Create:**

1. `components/modals/BatchClientCreationModal.tsx`
   - Main confirmation modal for batch client creation
   - Handles editable contact preview
   - Manages creation process and progress

2. `components/modals/ContactInfoModal.tsx`
   - Full contact details view
   - Template-based information display
   - Actions to open contacts app or create client

3. `hooks/useContactActions.ts`
   - Encapsulates SMS opening, contact info fetching
   - Handles client creation from contacts
   - Manages loading/error states

**Files to Modify:**

1. `components/screens/ContactsListScreen.tsx`
   - Add action buttons to each contact row
   - Integrate new modals
   - Connect batch action bar to confirmation modal
   - Update after client creation to refresh sync status

**Best Practices to Follow:**

1. **UI Pattern Inspiration (like other CRMs):**
   - HubSpot: Hover actions on contact rows
   - Salesforce: Quick action buttons with icons
   - Use swipe-to-reveal actions as optional enhancement

2. **Mobile-First Patterns:**
   - Bottom sheets for modals (feel more native)
   - Haptic feedback on action button press
   - Pull-to-refresh on contact list

3. **Accessibility:**
   - All action buttons need accessible labels
   - Modal focus management
   - Sufficient touch targets (minimum 44px on iOS)

4. **Performance:**
   - Use `FlatList` virtualization for large contact lists
   - Lazy load full contact details only when viewing info modal
   - Batch API calls where possible (if backend supports)
</implementation>

<output>
Create/modify files at these relative paths:
- `./components/modals/BatchClientCreationModal.tsx` - Batch creation confirmation modal
- `./components/modals/ContactInfoModal.tsx` - Contact details view modal
- `./hooks/useContactActions.ts` - Contact action utilities hook
- `./components/screens/ContactsListScreen.tsx` - Updated with action buttons and modal integration

Ensure all components:
- Use the existing theme system via `useTheme()` hook
- Follow established styling patterns from other modals in the codebase
- Include TypeScript types for all props and state
- Handle loading, error, and empty states appropriately
</output>

<verification>
Before completing, verify:

1. **Per-contact actions work:**
   - Create Client button opens batch modal with single contact
   - SMS button opens device SMS app with phone number
   - View Info button shows contact details modal

2. **Batch creation flow:**
   - Selecting multiple contacts and tapping "Create Clients" opens confirmation modal
   - Contact info is editable in the modal
   - Validation prevents creating clients without names
   - Creation shows progress and handles errors gracefully
   - Success updates sync status on contacts

3. **Modals function correctly:**
   - Proper open/close animations
   - Keyboard handling for editable fields
   - Accessible and properly themed

4. **Edge cases handled:**
   - Contacts without phone numbers
   - Contacts without email
   - API errors during creation
   - Large batch selections (10+ contacts)
</verification>

<success_criteria>
- Users can convert any synced contact to a client with 2 taps (select + confirm)
- Batch selection allows creating multiple clients efficiently
- Contact information is reviewable and editable before client creation
- SMS integration provides quick communication pathway
- Contact info modal serves as quick reference without leaving the app
- All actions provide appropriate feedback (loading states, success/error messages)
- UI follows established patterns and theming from the rest of the app
</success_criteria>
