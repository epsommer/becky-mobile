<objective>
Implement rich text editor and file upload functionality for the Becky CRM mobile app.

This Phase 4 feature enables better message formatting and document attachments.
</objective>

<context>
**Project:** Becky CRM Mobile App
**Location:** `/Users/epsommer/projects/apps/becky-mobile`
**Tech Stack:** React Native, Expo, TypeScript
**Design System:** Neomorphic

**Web Reference:** Web has RichTextEditor and RobustFileUploader.

**Feature Gap Checklist:** `./analyses/feature-gap-checklist.md`
- Line 180: `[ ] Rich text editor - Not implemented`
- Line 181: `[ ] File uploader - Not implemented`
- Line 49: `[ ] File upload/import for conversations - Not implemented`
</context>

<research>
Before implementing, examine:
1. Web RichTextEditor implementation
2. Web RobustFileUploader
3. React Native rich text options (react-native-pell-rich-editor, etc.)
4. Expo document picker and image picker
5. File upload API endpoints

For maximum efficiency, perform multiple searches simultaneously.
</research>

<requirements>
1. **Rich Text Editor:**
   - Bold, italic, underline
   - Bullet/numbered lists
   - Headings
   - Links
   - Mobile-friendly toolbar
   - Markdown support (optional)

2. **File Upload:**
   - Document picker integration
   - Image picker integration
   - Camera capture option
   - File type validation
   - Size limits
   - Upload progress indicator

3. **File Management:**
   - View attached files
   - Preview images
   - Download files
   - Delete attachments

4. **Integration Points:**
   - Message composition
   - Notes/descriptions
   - Client documents
</requirements>

<implementation>
Choose appropriate libraries:
- Rich text: react-native-pell-rich-editor or similar
- File: expo-document-picker, expo-image-picker

Create components:
- `./components/forms/RichTextEditor.tsx`
- `./components/forms/FileUploader.tsx`
- `./services/fileUpload.ts`
</implementation>

<output>
Create/modify files:
- `./components/forms/RichTextEditor.tsx`
- `./components/forms/FileUploader.tsx`
- `./services/fileUpload.ts`
- Integrate into message composition
- Update `./analyses/feature-gap-checklist.md`:
  - Change lines 180, 181, 49 from `[ ]` to `[x]`
</output>

<verification>
Before completing, verify:
1. Rich text formatting works
2. Can pick and upload files
3. Progress indicator shows
4. Files attach to messages
5. Can view/download attachments
6. Checklist items updated
</verification>

<success_criteria>
- Rich text editor functional
- File upload working
- Integrated into relevant screens
- Three checklist items marked complete
</success_criteria>
