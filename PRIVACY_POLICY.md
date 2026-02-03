# Privacy Policy for DUPR Mobile App

**Effective Date:** 2026-02-02

## Overview

This Privacy Policy describes how the DUPR Mobile App ("the App") collects, uses, and protects your information. Your privacy is important to us, and we are committed to transparency about our data practices.

## Information We Collect

### Authentication Data
- **DUPR Authentication Token**: When you log in through the DUPR dashboard, we store an authentication token locally on your device using secure storage (Expo SecureStore). This token allows the App to access DUPR's player search API on your behalf.

### Player Search Data
- **Search Queries**: When you search for players, the App sends your search queries to DUPR's API. These queries are not stored permanently on your device.
- **Player Registry**: The App maintains a local registry of players you've successfully looked up to improve future search performance. This registry includes player names, DUPR IDs, ratings, and location information.

### Player Overrides
- **Manual Ratings**: You can manually override player ratings. These overrides are stored locally on your device using AsyncStorage.

## How We Use Your Information

- **Authentication**: Your DUPR token is used solely to authenticate API requests to DUPR's servers.
- **Player Lookup**: Player search data is used to retrieve ratings and information from DUPR's database.
- **Offline Performance**: The player registry and overrides enable the App to work more efficiently and provide faster results.

## Data Storage

### Local Storage Only
- **All data is stored locally on your device**. We do not transmit your data to any third-party servers beyond DUPR's API (which is required for player lookups).
- **Secure Storage**: Authentication tokens are stored using Expo SecureStore, which uses the device's native secure storage mechanisms (Keychain on iOS, EncryptedSharedPreferences on Android).
- **Non-Secure Storage**: Player registry and overrides are stored using AsyncStorage for performance reasons.

### No Cloud Backup
- The App does not automatically back up your data to any cloud service.
- If you uninstall the App, all locally stored data will be deleted.

## Data Sharing

### No Third-Party Sharing
- **We do not sell, rent, or share your personal information with third parties**.
- The only external service the App communicates with is DUPR's official API (api.dupr.gg) for player search functionality.

### DUPR API
- When you use the player search feature, your search queries are sent to DUPR's API.
- Please refer to [DUPR's Privacy Policy](https://dupr.gg/privacy) for information about how DUPR handles your data.

## Data Retention

- **Authentication Tokens**: Stored until you log out or uninstall the App.
- **Player Registry**: Stored indefinitely on your device until you clear app data or uninstall the App.
- **Player Overrides**: Stored indefinitely on your device until you delete them manually or uninstall the App.

## Your Rights

### Access and Control
- You can view all player overrides in the Settings screen.
- You can delete individual overrides at any time.
- You can log out at any time, which will remove your authentication token from secure storage.

### Data Deletion
- To delete all app data, you can:
  1. Log out from the Settings screen (removes authentication token)
  2. Clear app data through your device settings
  3. Uninstall the App

## Security

### Measures We Take
- Authentication tokens are stored using platform-specific secure storage.
- All API communication with DUPR uses HTTPS encryption.
- The App does not store your DUPR username or password.

### Limitations
- While we implement security best practices, no method of electronic storage is 100% secure.
- You are responsible for keeping your device secure and protecting your DUPR account credentials.

## Children's Privacy

The App is not intended for use by individuals under the age of 13. We do not knowingly collect personal information from children under 13.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by:
- Posting the new Privacy Policy in the App repository
- Updating the "Effective Date" at the top of this policy

We encourage you to review this Privacy Policy periodically for any changes.

## Open Source

This App is open source. You can review the source code to verify our privacy practices at:
[GitHub Repository URL - to be added]

## Contact Information

If you have questions or concerns about this Privacy Policy, please contact:
[Contact information - to be added]

## Disclaimer

This App is an independent project and is not officially affiliated with, endorsed by, or sponsored by DUPR. DUPR is a trademark of DUPR LLC.
