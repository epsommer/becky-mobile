## Google Play export checklist

1) Install tooling  
- `npm install -g eas-cli` (or use `npx eas --version` if already installed).  
- Make sure you are logged in: `eas login`.

2) Configure unique IDs (already set, change if you prefer)  
- Android package: `com.epsommer.beckycrm` (app.json).  
- iOS bundle ID: `com.epsommer.beckycrm` (app.json) — keep aligned for consistency.

3) Build an Android App Bundle (AAB)  
- From the repo root: `cd projects/apps/becky-mobile`.  
- `eas build -p android --profile production`.  
- The production profile is set to create an AAB and auto-increment version numbers.

4) Sign in for Play uploads  
- In `eas.json`, set `submit.production.android.serviceAccountKeyPath` to your Play Console service account JSON (store it securely, not in git).  
- Run: `eas submit -p android --profile production` (after the build completes) to push to the Internal track.

5) Play Console requirements (manual)  
- Create the app entry in Play Console with the same package ID.  
- Provide: app name (“Becky CRM”), short/long descriptions, category, content rating questionnaire, and privacy policy URL.  
- Upload graphics: 512x512 icon (./assets/icon.png is available), feature graphic (1024x500), and at least 2 phone screenshots.  
- Ensure versionCode increments on every release (handled by `autoIncrement`, but keep an eye on it).

6) Optional testing  
- Use the Internal track first, invite testers, and validate install/permissions.  
- When ready, promote the build to Closed/Open/Production.
