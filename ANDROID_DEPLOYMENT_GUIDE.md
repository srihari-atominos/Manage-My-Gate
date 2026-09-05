# Nahom (Manage-My-Gate) - Android Application Deployment & Release Architecture Specification

**Organization:** Atominos Consulting Private Limited  
**Target Application:** Nahom Mobile App (Manage-My-Gate Ecosystem)  
**Android Package Identifier:** `com.atominosconsulting.nahom`  
**EAS Cloud Project ID:** `94a573d9-5e93-4827-8fbd-605e0ef3a50a`  
**Mobile Framework:** React Native 0.81.5 / Expo SDK 54.0.0 / Expo Router v6  
**JavaScript Runtime:** Hermes Engine (Bytecode Ahead-Of-Time Compiled)  
**Target OS Support:** Android 7.0 (API Level 24) to Android 15 (API Level 35)  
**Current Production Version:** Version `1.0.0` (Remote Version Code: `6` Verified)  
**Next Deployment Target:** Version Code: `7+` (Auto-Increment Managed)  
**Official Word Document:** `d:\atominos\GatedCommunity\Nahom_Android_App_Deployment_Guide.docx`

---

## 1. Executive Summary & Application Identity

This specification establishes the official, reproducible engineering standard for building, signing, validating, and deploying the **Nahom** mobile application (`mobile/mobile-app`) to internal testing channels and the **Google Play Store**.

Nahom serves as the operational mobile interface for four primary user groups:
1. **Residents & Villa Owners:** Digital visitor pass generation, gate access approvals, amenity reservations, society maintenance billing, and ticketing.
2. **Gate Security Guards:** QR pass scanning, visitor entry/exit validation, and intercom communications.
3. **Compound Facility Managers:** Notice board broadcasting and maintenance operations.

> [!NOTE]
> **Production Status Confirmed:** Production Build #6 (`f9ae6dff-817b-4655-a296-408adbf9ff69`) has completed compilation and signing in the EAS Cloud environment. The production `.aab` (Android App Bundle) is archived and ready for immediate deployment to Google Play Console.

### 1.1 Key Project Repositories & System Mapping

| System Attribute | Configuration / Path | Description |
| :--- | :--- | :--- |
| **Mobile Project Root** | `mobile/mobile-app` | Primary Expo / React Native codebase |
| **App Manifest** | `mobile/mobile-app/app.json` | Package ID, permissions, plugins & icons |
| **EAS Build Config** | `mobile/mobile-app/eas.json` | Preview & Production build profiles |
| **Production REST API** | `https://managemygate.e3esg.com/api/v1` | Secure Node.js / Express backend |
| **Production WebSocket** | `https://managemygate.e3esg.com` | Socket.io server for real-time gate push |
| **Payment Gateway** | Razorpay Mobile SDK | Maintenance dues collection |
| **EAS Owner Account** | `atominos-consulting-private-limited` | Managed cloud builder organization |

---

## 2. Pre-Deployment Configuration & Permissions Analysis

### 2.1 Hardware Capabilities & Android Manifest

All native Android permissions are declared in `mobile/mobile-app/app.json`. During compilation, Expo config plugins inject these requirements into the compiled `AndroidManifest.xml`:

- `android.permission.CAMERA`: Enables security guards to scan visitor QR passes at compound gates, and residents to capture photos for maintenance complaints.
- `android.permission.RECORD_AUDIO`: Enables 2-way gate intercom audio communication between guards and residents.
- `READ_MEDIA_IMAGES` / Scoped Storage: Handles photo selection for amenity bookings and support tickets.
- Hardware Schemes: Configured for `tel:` (direct guard phone calls) and `whatsapp:` (instant messaging).

### 2.2 Manifest Specification (`app.json`)

```json
{
  "expo": {
    "name": "Nahom",
    "slug": "atominos",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "mobile-app",
    "userInterfaceStyle": "automatic",
    "jsEngine": "hermes",
    "android": {
      "package": "com.atominosconsulting.nahom",
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": [
        "android.permission.RECORD_AUDIO",
        "android.permission.CAMERA"
      ]
    },
    "plugins": [
      "expo-router",
      ["expo-splash-screen", { "image": "./assets/images/splash.png", "backgroundColor": "#ffffff" }],
      ["expo-image-picker", { "cameraPermission": "Camera access required for visitor QR and maintenance complaints." }],
      ["expo-camera", { "cameraPermission": "Camera access required to verify gate passes." }]
    ],
    "extra": {
      "eas": { "projectId": "94a573d9-5e93-4827-8fbd-605e0ef3a50a" }
    },
    "owner": "atominos-consulting-private-limited"
  }
}
```

### 2.3 Build-Time Environment Variable Matrix

Production environment variables are configured in `mobile/mobile-app/eas.json` and compiled directly into the binary:

```json
"env": {
  "EXPO_PUBLIC_API_URL": "https://managemygate.e3esg.com/api/v1",
  "EXPO_PUBLIC_SOCKET_URL": "https://managemygate.e3esg.com",
  "EXPO_PUBLIC_RAZORPAY_KEY_ID": "rzp_live_xxxxxxxxxxxxxxxx"
}
```

> [!WARNING]
> Never embed secret keys (such as `RAZORPAY_KEY_SECRET` or `JWT_SECRET`) in client code or mobile configuration. Only public keys (e.g. `rzp_live` key ID) may be embedded on client devices. All payment signature verification executes server-side on Node.js.

---

## 3. Cryptographic Signing & Keystore Architecture

Google Play Store enforces **Google Play App Signing**:
1. **Upload Key:** Managed by the developer (or EAS Cloud) to sign the `.aab` before uploading to Google.
2. **Google Play App Signing Key:** Securely generated and stored in Google Cloud HSM. Google inspects the upload key, generates optimized device-specific APKs, and signs them with this master key.

### 3.1 EAS Cloud Managed Keystore

EAS manages the Android Upload Keystore in encrypted Expo Vaults under the organization account `atominos-consulting-private-limited`. To inspect or back up the keystore:

```bash
cd mobile/mobile-app
eas credentials --platform android
```

This displays the SHA-1 / SHA-256 certificate fingerprints and provides an option to export the `.jks` file.

### 3.2 Manual / Offline Keystore Generation (Fallback)

To generate a local signing key using Java Keytool:

```bash
keytool -genkeypair -v -keystore nahom-release-key.keystore \
  -alias nahom-key-alias -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Atominos Consulting, OU=Mobile Engineering, O=Atominos Consulting Private Limited, L=Chennai, ST=Tamil Nadu, C=IN"
```

---

## 4. EAS Cloud Build Pipelines & Execution Workflows

The mobile project defines three distinct build profiles inside `mobile/mobile-app/eas.json`:

| Build Profile | Output Format | Distribution Channel | Usage Purpose |
| :--- | :--- | :--- | :--- |
| **`preview`** | APK (Universal) | Internal QA Testing | Direct sideload on physical Android test devices |
| **`production`** | AAB (App Bundle)| Google Play Store | Store release with remote auto-incrementing `versionCode` |
| **`development`** | Dev Client APK | Engineering Debug | Connects to Metro bundler with debug tooling |

### 4.1 Compiling an Internal Test APK (`preview`)

To build a standalone APK for QA testers without going through Google Play:

```bash
cd mobile/mobile-app
eas build --platform android --profile preview
```

Upon completion (~8-12 minutes), EAS generates a download link and terminal QR code to install the APK directly on any Android device.

### 4.2 Compiling the Production App Bundle (`production`)

To build the official release `.aab` for Google Play Store:

```bash
cd mobile/mobile-app
eas build --platform android --profile production
```

EAS automatically increments the remote version code (e.g. from 6 to 7), compiles Hermes bytecode, packages assets, and outputs the signed `.aab`.

### 4.3 Verified Production Build Record (#6)

- **Build ID:** `f9ae6dff-817b-4655-a296-408adbf9ff69`
- **Application Version:** `1.0.0`
- **Version Code:** `6`
- **Distribution:** Store (`production` profile)
- **Status:** **Finished (Success)**
- **Artifact URL:** [Download Production AAB](https://expo.dev/artifacts/eas/k_KVMr2R9LLdY4MhobMBVsumMRbKetvezc8ZCeGgWwo.aab)
- **Build Logs:** [View EAS Cloud Logs](https://expo.dev/accounts/atominos-consulting-private-limited/projects/atominos/builds/f9ae6dff-817b-4655-a296-408adbf9ff69)

---

## 5. Alternative Local Gradle Build Workflow (Offline / Bare)

For local workstation builds without cloud dependencies:

```bash
cd mobile/mobile-app

# 1. Clean prebuild native Android directory
npx expo prebuild --platform android --clean

# 2. Build standalone Release APK
cd android
./gradlew assembleRelease

# 3. Build Google Play Release App Bundle
./gradlew bundleRelease
```

Generated outputs:
- **Release APK:** `mobile/mobile-app/android/app/build/outputs/apk/release/app-release.apk`
- **Release AAB:** `mobile/mobile-app/android/app/build/outputs/bundle/release/app-release.aab`

---

## 6. Google Play Console Setup & Compliance Specification

### 6.1 Store Listing Information

- **App Title:** `Nahom - Gated Community Gate` (Max 30 characters)
- **Short Description:** `Smart gated community visitor passes, gate approvals, complaints & payments.` (Max 80 characters)
- **Full Description:** Comprehensive copy detailing digital visitor passes, QR scanning, amenity booking, maintenance complaint logging, and digital bill payments.
- **Category:** House & Home / Lifestyle
- **Default Language:** English (United States), with Arabic (Saudi Arabia) localization.

### 6.2 Store Graphics Assets

- **High-Res App Icon:** 512x512 PNG, 32-bit color, no transparency (`mobile/mobile-app/assets/images/play-store-icon.png`).
- **Adaptive Icon Foreground:** 432x432 PNG (`mobile/mobile-app/assets/images/adaptive-icon.png`).
- **Feature Graphic:** 1024x500 PNG banner.
- **Phone Screenshots:** Minimum 4 high-resolution screenshots (1080x2400) showing Login, Resident Dashboard, Visitor Pass QR, and Amenity Booking.

### 6.3 Mandatory Policy Declarations

| Policy Requirement | Submitted Value / URL | Notes |
| :--- | :--- | :--- |
| **Privacy Policy URL** | `https://managemygate.e3esg.com/privacy-policy` | Matches `Nahom_Privacy_Policy.pdf` in repository root |
| **Terms of Service URL**| `https://managemygate.e3esg.com/terms-and-conditions` | Matches `Nahom_Terms_and_Conditions.pdf` in repository root |
| **App Access Credentials** | Login: `resident_demo@managemygate.com`<br>Password: `DemoPassword@2026`<br>OTP Code: `123456` | Mandatory for Google reviewers |
| **Ads Declaration** | "No, my app does not contain ads" | Compliant |
| **Content Rating** | Everyone (PEGI 3, ESRB Everyone) | Via IARC questionnaire |
| **Target Audience** | 18 and older | Excludes children |
| **Financial Features** | Yes (Society maintenance dues collection via Razorpay) | Select "Bills & Utilities Payment" |
| **Account Deletion URL** | `https://managemygate.e3esg.com/account-deletion` | Mandatory under Google Play rules |

---

## 7. Release Tracks & Phased Rollout Strategy

Deployments progress through four release tracks:
1. **Internal Testing Track:** Instant distribution (zero Google review time) for up to 100 internal QA team members.
2. **Closed Testing Track (Alpha):** Designated beta resident tester group for acceptance validation.
3. **Open Testing Track (Beta):** Optional public opt-in testing.
4. **Production Track:** Phased Rollout strategy:
   - **Day 1:** Roll out to **10%** of users. Monitor crash rate and backend logs.
   - **Day 2:** Increase rollout to **25%** if crash-free sessions exceed 99.5%.
   - **Day 3:** Increase rollout to **50%**.
   - **Day 4:** Promote to **100%** general availability.

---

## 8. Automated Submission via EAS Submit

Automate uploading compiled bundles directly into Google Play tracks:

### 8.1 Service Account Setup
1. In Google Cloud Console, enable the **Google Play Android Developer API**.
2. Create a Service Account and download the JSON key (`google-service-account.json`).
3. In Google Play Console under **Users & Permissions**, invite the Service Account email with **Release Manager** permissions.

### 8.2 EAS Submit Configuration (`eas.json`)

```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./google-service-account.json",
      "track": "internal",
      "releaseStatus": "completed"
    }
  }
}
```

### 8.3 One-Command Build and Deploy

```bash
cd mobile/mobile-app
eas build --platform android --profile production --auto-submit
```

---

## 9. Over-The-Air (OTA) Updates via EAS Update

EAS Update deploys instant JavaScript bugfixes and UI adjustments without requiring a new Google Play binary review:

| Update Method | Eligible Code Changes | Delivery Speed |
| :--- | :--- | :--- |
| **EAS Update (OTA)** | React components, Redux slices, styling tweaks, API logic | Immediate upon app restart |
| **Google Play Binary Release** | Native modules, app permissions, app icons/splash, Expo SDK upgrades | Requires full `.aab` compilation and 1-3 day Google review |

Command to publish an instant production hotfix:

```bash
cd mobile/mobile-app
eas update --branch production --message "Hotfix: resolve visitor pass QR scanner timeout"
```

---

## 10. 15-Point Pre-Deployment Smoke Test Matrix

| Test ID | Functional Area | Test Action | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-01** | Multi-Auth (Password) | Login with resident email & password | Token saved in SecureStore; navigates to dashboard |
| **TC-02** | Multi-Auth (Phone OTP) | Request OTP for mobile number & verify | Authenticates session and stores profile |
| **TC-03** | Auto-Bootstrap Auth | Kill app process and reopen | Restores session without prompting for login |
| **TC-04** | Visitor Pass Creation | Create 1-day visitor pass | Pass generated; QR code rendered immediately |
| **TC-05** | Camera QR Scanning | Open gate scanner as security guard | Camera initializes; decodes QR pass in <500ms |
| **TC-06** | Pass Approval Push | Simulate visitor arrival at gate | Resident receives real-time approval banner |
| **TC-07** | Villa Context Switch | Switch between multiple owned villas | Updates active villa state across all tabs |
| **TC-08** | Maintenance Ticket | Capture photo and submit plumbing complaint | Image uploads to `/uploads`; ticket logged |
| **TC-09** | Amenity Booking | Select tennis court slot and confirm | Slot locked; listed under 'My Bookings' |
| **TC-10** | Razorpay Payment | Initiate maintenance bill checkout | Razorpay checkout opens; payment status updates |
| **TC-11** | Notice Board | Open notice board and view notice | Broadcast displays with attachments & timestamps |
| **TC-12** | RTL / Arabic Support | Switch device locale to Arabic | Layout mirrors seamlessly using logical classes |
| **TC-13** | Offline Resiliency | Disconnect Wi-Fi during API call | Displays graceful error toast without crash |
| **TC-14** | Hardware Back Button | Press Android back button across screens | Navigates back correctly without unexpected exit |
| **TC-15** | Deep Link Scheme | Open `mobile-app://` link from WhatsApp | Deep links to exact route via Expo Router |

---

## 11. Troubleshooting & Disaster Recovery

### Cleartext HTTP Traffic Not Permitted
- **Symptom:** API calls fail with `java.io.IOException: Cleartext HTTP traffic to ... not permitted`.
- **Fix:** Ensure all URLs use secure HTTPS (`https://managemygate.e3esg.com/api/v1`).

### Hermes Runtime Crash on Production Builds
- **Symptom:** App works in Expo Go but crashes immediately upon launch in release APK/AAB.
- **Fix:** Check `adb logcat *:E`. Ensure all dependencies match Expo SDK 54 via `npx expo install --check`.

### Google Play Rejection for Inaccessible Test Accounts
- **Symptom:** Google rejects submission with "We were unable to sign in to your app".
- **Fix:** Verify the demo account (`resident_demo@managemygate.com`) has a static OTP bypass (`123456`) enabled in `auth.services.js`.

### Emergency Keystore Recovery
- **Protocol:** Because Google Play App Signing is active, a misplaced upload key will never permanently break app updates. The organization owner requests an **Upload Key Reset** directly in Play Console under **App Integrity**. Google resets the key within 48 hours.

---

## 12. Operations Runbook & CLI Cheat Sheet

```bash
# Check EAS login and organization membership
eas whoami

# Inspect previous Android builds
eas build:list --platform android

# Build internal testing APK (direct download for QA)
eas build -p android --profile preview

# Build official Google Play store release bundle (.aab)
eas build -p android --profile production

# Submit existing AAB to Google Play Store
eas submit -p android --path <path-to-aab-file-or-url>

# One-command build and automated submission
eas build -p android --profile production --auto-submit

# Publish instant Over-The-Air hotfix
eas update --branch production --message "Hotfix description"

# Inspect and export Android signing credentials
eas credentials -p android
```
