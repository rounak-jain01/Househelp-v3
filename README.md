# HomeHelp

HomeHelp is an Android-only React Native / Expo application for booking verified household Helps (maids/service providers) for fixed-price hourly services.

The current pilot uses a single mobile application with role-based flows:

- **Customer** – books a Help, tracks the booking, receives the start OTP, monitors the job timer, cancels where allowed, and can request extra time.
- **Help / Maid** – completes onboarding, manages availability, receives booking requests, accepts/rejects them, navigates to the customer, verifies the customer start OTP, starts the job timer, accepts/rejects extra-time requests, and completes the booking.

---

## 1. Current Project Status

The project has reached a working pilot state with:

- Firebase Phone Authentication
- Customer profile/address setup
- Help onboarding
- Help verification bypassed for pilot development using `verificationStatus: "verified"`
- Firestore-backed service categories
- Customer booking creation
- Automatic Help assignment
- Simultaneous booking requests to eligible Helps
- First-valid-acceptance-wins behavior
- Customer booking status tracking
- Help booking request screen
- Accepted booking / active booking screen
- Customer start OTP generation and verification
- Job start timestamp and live booked-hours timer
- Manual job completion
- Customer cancellation with mandatory reason
- Extra-time request flow
- Help extra-time response backend
- Help availability toggle / scheduled slots
- Help current-location updates
- Google Maps directions deep link
- Distance / ETA support through Google Maps Distance Matrix API
- Maid/customer bilingual UI strategy for the Help side
- EAS project configuration for Android builds

### Important current pilot limitation

The application is currently a pilot and does not include:

- Online payment gateway
- Commission collection
- Admin dashboard
- Production-grade founder verification workflow
- Background continuous location tracking
- Automatic job completion when the timer reaches zero
- Advanced booking history filters
- Full production monitoring/analytics setup

---

# 2. Technology Stack

## Frontend

- Expo SDK 57
- React 19.2.3
- React Native 0.86.3
- Expo Router
- React Native Firebase
- Firebase Authentication
- Firebase Firestore
- Firebase Storage
- Firebase Cloud Functions callable client
- Expo Location
- Expo Notifications
- Expo Image Picker

## Backend

- Firebase
- Cloud Functions 2nd generation
- Node.js 22
- Firestore
- Firebase Admin SDK
- Firebase Cloud Messaging
- Google Maps APIs

## Build

- EAS Build
- Android package/application ID:

```text
com.homehelp.app
```

---

# 3. Project Structure

```text
Homehelp/
│
├── frontend/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── otp.tsx
│   │   │   ├── permissions.tsx
│   │   │   ├── phone.tsx
│   │   │   ├── profile.tsx
│   │   │   └── welcome.tsx
│   │   │
│   │   ├── customer/
│   │   │   ├── book/
│   │   │   ├── index.tsx
│   │   │   ├── booking/
│   │   │   │   └── [bookingId].tsx
│   │   │   └── profile.tsx
│   │   │
│   │   └── maid/
│   │       ├── index.tsx
│   │       ├── onboarding.tsx
│   │       ├── availability.tsx
│   │       ├── profile.tsx
│   │       ├── booking-request/
│   │       │   └── [bookingId].tsx
│   │       └── booking/
│   │           └── [bookingId].tsx
│   │
│   └── src/
│       ├── components/
│       │   ├── BottomSheetActions.tsx
│       │   └── BottomSheetMessage.tsx
│       │
│       ├── features/
│       │   ├── auth/
│       │   ├── customer/
│       │   │   ├── BookHelpScreen.tsx
│       │   │   ├── BookingWaitingScreen.tsx
│       │   │   ├── CustomerHomeScreen.tsx
│       │   │   ├── CustomerProfileScreen.tsx
│       │   │   └── CustomerProfileSetupScreen.tsx
│       │   │
│       │   └── maid/
│       │       ├── MaidOnboardingScreen.tsx
│       │       ├── MaidHomeScreen.tsx
│       │       ├── MaidAvailabilityScreen.tsx
│       │       ├── MaidProfileScreen.tsx
│       │       ├── MaidBookingRequestScreen.tsx
│       │       ├── MaidActiveBookingScreen.tsx
│       │       └── MaidLanguageContext.tsx
│       │
│       ├── services/
│       │   ├── firebase/
│       │   │   ├── bookingService.ts
│       │   │   ├── categoryService.ts
│       │   │   ├── customerService.ts
│       │   │   ├── maidService.ts
│       │   │   ├── userService.ts
│       │   │   ├── availabilityService.ts
│       │   │   ├── maidBookingRequestService.ts
│       │   │   └── customerBookingLifecycleService.ts
│       │   │
│       │   └── location/
│       │       └── maidLocationService.ts
│       │
│       └── utils/
│           └── getGreeting.ts
│
└── backend/
    ├── firebase.json
    ├── firestore.rules
    └── functions/
        ├── src/
        │   ├── index.ts
        │   ├── assignmentService.ts
        │   └── bookingLifecycleService.ts
        ├── package.json
        └── tsconfig.json
```

---

# 4. User Roles

## Customer

Customers:

1. Sign in with phone number + OTP.
2. Complete profile.
3. Save service address.
4. Select service categories.
5. Select duration.
6. Select scheduled date/time.
7. Confirm booking.
8. Wait for Help assignment.
9. See Help details after acceptance.
10. Give the Help the customer start code on arrival.
11. Job starts only after valid OTP verification.
12. Monitor booked time.
13. Request extra time after the booked duration finishes.
14. View final completed state.

## Help / Maid

Helps:

1. Sign in with phone number + OTP.
2. Complete onboarding.
3. Add required profile information.
4. Select service categories.
5. Configure service area.
6. Set availability.
7. Receive booking requests.
8. Accept or reject a request.
9. Open the active booking.
10. Navigate to the customer.
11. Ask customer for the 6-digit start code.
12. Enter the code.
13. Start the job.
14. Work for the booked duration.
15. Respond to extra-time requests.
16. Mark the booking completed.

---

# 5. Authentication

Authentication uses Firebase Phone Authentication.

There is no password-based login in the pilot.

Basic flow:

```text
Phone number
    ↓
Firebase OTP
    ↓
OTP verification
    ↓
Existing user?
 ┌──────────────┴──────────────┐
Yes                           No
 ↓                              ↓
Role/profile flow        Role selection
```

Role-based routing is handled by the application.

---

# 6. Customer Booking Flow

```text
Customer Home
      ↓
Book Help
      ↓
Select categories
      ↓
Select 1–4 hours
      ↓
Select date/time
      ↓
Confirm booking
      ↓
booking.status = "pending"
      ↓
Backend assignment
      ↓
Help request(s)
      ↓
First valid acceptance
      ↓
booking.status = "confirmed"
      ↓
Start OTP generated
      ↓
Customer sees Help details
      ↓
Help arrives
      ↓
Customer provides OTP
      ↓
Help verifies OTP
      ↓
booking.status = "in_progress"
      ↓
Timer starts from startedAt
      ↓
Booked duration finishes
      ↓
Optional extra-time request
      ↓
Help accepts/rejects
      ↓
Help marks completed
      ↓
booking.status = "completed"
```

---

# 7. Booking Statuses

Current booking status values:

```text
pending
assigned
confirmed
in_progress
completed
cancelled
no_maid_found
```

### Meaning

| Status | Meaning |
|---|---|
| `pending` | Booking created and searching for a Help |
| `assigned` | Request is being offered to eligible Help(s) |
| `confirmed` | A Help accepted |
| `in_progress` | Start OTP successfully verified |
| `completed` | Help manually completed the job |
| `cancelled` | Customer/admin cancelled the booking |
| `no_maid_found` | No eligible Help accepted |

The pilot intentionally does **not** automatically set a booking to `completed` when the timer reaches zero. The Help completes the job manually.

---

# 8. Booking Assignment Logic

The backend filters Helps according to:

- `verificationStatus === "verified"`
- Requested categories are supported by the Help
- Help serves the booking area
- Help is available for the requested time
- Help does not have a conflicting active booking

Category matching is exact by category ID.

Example:

```text
Booking categories:
["cleaning", "cooking"]

Help serviceCategories:
["cleaning", "cooking", "laundry"]
```

This Help qualifies.

But:

```text
Booking:
["cooking"]

Help:
["cleaning"]
```

does not qualify.

### Current acceptance behavior

The current pilot uses:

```text
All eligible Helps receive the request
                ↓
First valid acceptance wins
                ↓
Booking becomes confirmed
                ↓
Other pending requests expire
```

This is different from an older round-robin-only implementation and represents the current pilot behavior.

---

# 9. Category Data

Categories are stored in:

```text
categories/{categoryId}
```

Example:

```json
{
  "name": "Cooking",
  "ratePerHour": 160,
  "isActive": true
}
```

Categories are intentionally database-driven so services can be added/disabled without hardcoding pricing throughout the application.

The customer booking price is calculated from:

```text
sum(selected category hourly rates) × booked duration
```

### Critical category ID rule

The ID saved in:

```text
maids/{maidId}.serviceCategories
```

must match the category ID saved in:

```text
bookings/{bookingId}.categories
```

The displayed category name is not what the backend uses for matching.

For example, these are different:

```text
"cooking"
"Cooking"
```

If an existing Help profile contains one ID while the category document uses another ID, the Help can become ineligible and the customer may see:

```text
No maid found
```

Whenever category documents are manually changed in Firestore, verify the actual document IDs and existing `serviceCategories` values.

---

# 10. Firestore Core Collections

## `users`

Customer profile.

Typical fields:

```text
userId
role
phoneNumber
name
address
createdAt
```

Address contains:

```text
formatted
latitude
longitude
landmark
```

Coordinates are important for maps and distance calculation.

---

## `maids`

Help profile.

Typical fields:

```text
maidId
role
phoneNumber
name
alternatePhoneNumber
gender
dateOfBirth
photoUrl
idDocumentUrl
verificationStatus
serviceCategories
serviceArea
isAvailableNow
availabilitySlots
availabilityOverride
currentLocation
lastAssignedAt
createdAt
```

`currentLocation` contains location data such as:

```text
latitude
longitude
accuracy
heading
speed
updatedAt
```

---

## `bookings`

Core booking document.

Typical fields:

```text
customerId
maidId
winningMaidId
categories
duration
scheduledDateTime
totalPrice
status
customerAddress
customerName
createdAt
startedAt
completedAt
cancelledAt
cancellationReason
maidDetails
```

Extra-time fields now include:

```text
extraTimeStatus
requestedExtraMinutes
approvedExtraMinutes
totalDurationMinutes
extraTimeRequestedAt
extraTimeRespondedAt
```

---

## `bookings/{bookingId}/maidRequests/{maidId}`

Used for Help booking requests.

The request contains information such as:

```text
maidId
bookingId
customerName
customerAddress
categories
duration
scheduledDateTime
totalPrice
distanceMeters
estimatedTravelSeconds
distanceText
etaText
requestExpiresAt
response
responseReason
updatedAt
```

Valid responses include:

```text
pending
accepted
rejected
expired
```

---

## `bookings/{bookingId}/customerSecrets/startOtp`

Customer-only start OTP data.

The plaintext OTP is deliberately kept outside the main booking document so that the assigned Help cannot simply read it from the booking.

The main booking stores the OTP hash used for verification.

---

# 11. Start OTP Security

When a booking becomes confirmed:

1. Backend generates a 6-digit OTP.
2. Backend hashes the OTP.
3. Hash is stored on the booking.
4. Plain OTP is stored in the customer-only secret document.
5. Customer sees the OTP.
6. Customer gives the OTP to the Help when the Help arrives.
7. Help enters the OTP.
8. Callable Cloud Function validates the OTP.
9. On success:
   - booking becomes `in_progress`
   - `startedAt` is written
   - timer begins from `startedAt`

Failed attempts are rate-limited and can be locked temporarily.

---

# 12. Customer Cancellation

Customer cancellation is controlled by backend validation.

Cancellation is allowed only when the scheduled start is more than 1 hour away.

If the cancellation window is closed, the UI disables cancellation and explains why.

A cancellation requires a reason.

Current reasons include:

```text
Changed my plans
Booked by mistake
Found another Help
Schedule no longer works
Other
```

Cancellation is performed through a callable Cloud Function rather than allowing arbitrary booking status edits from the client.

---

# 13. Extra-Time Feature

Extra time was added after the normal booked duration is complete.

Example:

```text
Booked: 2 hours

Timer reaches:
00:00:00

Customer:
+30 min
+1 hour
+2 hours
```

### Important rule

The customer cannot request extra time before the original booked duration finishes.

The UI shows disabled buttons while the timer is still running.

After the timer reaches zero:

```text
Booked time completed
       ↓
Request extra time
       ↓
Waiting for Help
```

### Backend fields

```text
extraTimeStatus:
  none
  requested
  accepted
  rejected

requestedExtraMinutes
approvedExtraMinutes
totalDurationMinutes
```

Example:

```text
Original duration: 2 hours
Extra time: 1 hour

totalDurationMinutes = 180
```

The timer uses the approved total duration.

### Callable functions

```text
requestExtraTime
respondToExtraTime
```

These are implemented in:

```text
backend/functions/src/bookingLifecycleService.ts
```

---

# 14. Help Availability

Help availability has two concepts:

## Available Now

A quick ON/OFF setting.

Typical fields:

```text
isAvailableNow
availabilityOverride
```

## Scheduled Slots

Stored in:

```text
availabilitySlots
```

Example:

```json
{
  "id": "slot-1",
  "date": "2026-09-10",
  "startTime": "10:00",
  "endTime": "14:00"
}
```

Assignment checks whether the Help is available for the requested booking time.

---

# 15. Help Location

Current-location service:

```text
frontend/src/services/location/maidLocationService.ts
```

It supports:

- Foreground location permission
- Current location retrieval
- Updating `maids/{maidId}.currentLocation`
- Periodic foreground tracking
- Location refresh operations

The pilot does not use continuous background location tracking.

---

# 16. Maps / Travel

The backend can calculate travel information using Google Maps APIs.

Booking request data can include:

```text
distanceMeters
estimatedTravelSeconds
distanceText
etaText
```

The Help active booking also provides a Google Maps directions deep link using the customer's stored coordinates.

For reliable routing/distance behavior, customer address coordinates should exist.

---

# 17. Help Language

The Help side has global bilingual support:

```text
English
Hindi
```

Language state is handled through:

```text
MaidLanguageContext.tsx
```

The selected language is intended to affect all Help screens rather than each screen having an independent language switch.

The customer side remains English-focused for the current pilot.

---

# 18. Current Important Routes

## Customer

```text
/customer
/customer/book
/customer/booking/[bookingId]
/customer/profile
```

## Help

```text
/maid
/maid/onboarding
/maid/availability
/maid/profile
/maid/booking-request/[bookingId]
/maid/booking/[bookingId]
```

### Route distinction

Incoming request:

```text
/maid/booking-request/{bookingId}
```

Accepted/active booking:

```text
/maid/booking/{bookingId}
```

---

# 19. Main Firebase Backend Modules

## `assignmentService.ts`

Responsible for:

- Finding eligible Helps
- Checking category matches
- Checking availability
- Checking booking conflicts
- Calculating travel information
- Creating `maidRequests`
- Sending notifications
- Handling first-valid acceptance
- Updating booking assignment state
- Expiring pending requests

## `bookingLifecycleService.ts`

Responsible for:

- Booking confirmation OTP
- Customer cancellation
- Start-job OTP verification
- Job completion
- Extra-time request
- Extra-time accept/reject

## `index.ts`

Exports Cloud Functions from the backend.

---

# 20. Firestore Security Model

The pilot uses Firestore rules to restrict direct client manipulation of sensitive booking state.

Examples of protected transitions:

- Customer cancellation is handled through callable backend logic.
- Start-job transition is handled by backend OTP validation.
- Completion is handled through the assigned Help's callable operation.
- Customer start secrets are customer-only.
- Help booking requests restrict writable fields.

The goal is to keep critical state transitions server-authoritative.

---

# 21. Environment / Firebase Notes

Firebase project:

```text
homehelp-bfefb
```

Backend Cloud Functions region:

```text
asia-south1
```

Frontend callable functions must use:

```text
asia-south1
```

For example:

```ts
const functions = getFunctions(
  undefined,
  "asia-south1",
);
```

This is important because using the default region can lead to callable errors such as:

```text
NOT_FOUND
```

---

# 22. Google Maps Secret

The backend uses the secret:

```text
GOOGLE_MAPS_API_KEY
```

It is stored as a Firebase Functions secret and used for server-side distance calculations.

Do not hardcode the API key into source files.

---

# 23. Development Commands

## Frontend

Enter:

```powershell
cd C:\Users\rouna\OneDrive\Desktop\Homehelp\frontend
```

TypeScript check:

```powershell
npx tsc --noEmit
```

Expected result when clean:

```text
(no output)
```

Run Android locally:

```powershell
npx expo run:android
```

Restart Metro cache:

```powershell
npx expo start -c
```

---

# 24. Backend Commands

The Node package lives under:

```text
backend/functions
```

Build:

```powershell
cd C:\Users\rouna\OneDrive\Desktop\Homehelp\backend\functions
npm run build
```

Deploy:

```powershell
cd C:\Users\rouna\OneDrive\Desktop\Homehelp\backend
$env:FUNCTIONS_DISCOVERY_TIMEOUT="30"
firebase deploy --only functions
```

Firestore rules + functions:

```powershell
firebase deploy --only firestore:rules,functions
```

Do not run `npm run build` from:

```text
backend/
```

because the Node `package.json` is under:

```text
backend/functions/
```

---

# 25. Windows Native Build Fix

A long CMake path issue was encountered during Android native builds.

Current solution is in:

```text
frontend/android/app/build.gradle
```

inside:

```gradle
android {
    ...
}
```

with:

```gradle
externalNativeBuild {
    cmake {
        buildStagingDirectory = file("C:/HomehelpCxx")
    }
}
```

Do not replace this with:

```text
android.cxxBuildStagingDirectory
```

because that is not the correct Gradle configuration for this project.

---

# 26. EAS Build

The EAS project has been created and linked:

```text
@rounak_jain_01/homehelp
```

EAS project ID:

```text
4a3e07c5-4f59-4ac8-8ccb-2e88b2cc1cea
```

Android-only EAS configuration has been generated.

Current `eas.json`:

```json
{
  "cli": {
    "version": ">= 23.2.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Preview / internal Android build

```powershell
eas build --platform android --profile preview
```

This is the preferred build for pilot APK distribution/testing.

### Production build

```powershell
eas build --platform android --profile production
```

This produces the production Android app bundle flow for store distribution.

### Android signing

On the first build, EAS may ask:

```text
Generate a new Android Keystore? (Y/n)
```

For this new project, choose:

```text
Y
```

EAS can manage the signing credentials for the project.

---

# 27. Current Deployment State

Backend Cloud Functions have been deployed successfully.

Frontend TypeScript has been checked successfully after the latest route/lifecycle fixes.

The EAS project has been created and configured for Android.

The Android preview build process has been initiated.

Do not assume a completed APK until the EAS build reports success.

---

# 28. Recommended Pilot Test

Use two Android sessions/devices:

### Device A – Customer

1. Login
2. Complete customer profile
3. Confirm address coordinates
4. Create booking
5. Verify `pending`
6. Verify Help assignment
7. Verify Help details appear
8. Verify start OTP appears
9. Wait for/perform Help arrival
10. Verify job starts only after OTP
11. Verify timer
12. Let booked timer reach zero
13. Request extra time
14. Verify request remains pending

### Device B – Help

1. Login
2. Complete onboarding
3. Confirm selected categories
4. Turn availability ON
5. Confirm current location updates
6. Receive booking request
7. Accept
8. Confirm active booking screen
9. Open directions
10. Enter customer's OTP
11. Verify `in_progress`
12. Verify timer
13. Receive extra-time request after booked duration
14. Accept or reject
15. Verify updated duration when accepted
16. Mark job completed
17. Verify customer sees completed

---

# 29. Troubleshooting

## `No maid found`

Check these first:

```text
maid.verificationStatus
maid.serviceCategories
maid.serviceArea
maid.isAvailableNow
maid.availabilitySlots
maid.availabilityOverride
maid.currentLocation
booking.categories
booking.customerAddress.coordinates
```

Most importantly, compare category IDs exactly.

Example:

```text
booking.categories = ["cooking"]
maid.serviceCategories = ["cooking"]
```

works.

But:

```text
booking.categories = ["Cooking"]
maid.serviceCategories = ["cooking"]
```

does not match.

---

## Callable function `NOT_FOUND`

For backend region `asia-south1`, initialize Functions with:

```ts
getFunctions(undefined, "asia-south1")
```

rather than the default region.

---

## Unmatched Expo Router route

Check that the file path exactly matches the route.

Active Help booking:

```text
frontend/app/maid/booking/[bookingId].tsx
```

Incoming request:

```text
frontend/app/maid/booking-request/[bookingId].tsx
```

Customer booking:

```text
frontend/app/customer/booking/[bookingId].tsx
```

Restart Metro after route creation if necessary:

```powershell
npx expo start -c
```

---

## OTP keyboard overlaps input

Use:

```tsx
KeyboardAvoidingView
```

with:

```tsx
behavior={Platform.OS === "ios" ? "padding" : "height"}
```

and a scrollable content area.

---

# 30. Design Principles

The pilot UI intentionally follows these principles:

- Simple and professional
- Clear states
- Large touch targets for Help-side screens
- No unnecessary marketing-style visuals
- No `Alert.alert` for normal product actions
- Bottom-sheet / inline messaging for important confirmations
- English + Hindi on Help side
- Clear booking status progression
- Server-authoritative sensitive state changes
- Realtime Firestore listeners wherever live status matters

---

# 31. Important Business Rules

## Booking

- Customer can book 1–4 hours.
- Booking time must be at least 2 hours from current time.
- One Help must cover all selected categories.
- Customer pays the Help directly by cash/UPI in the pilot.
- No gateway or platform commission is currently implemented.

## Cancellation

- Customer cancellation allowed only more than 1 hour before scheduled start.
- Help has no in-app self-cancel option in the pilot.
- Help cancellation is handled through admin/founder support.

## Start

- Job does not start automatically at scheduled time.
- Help must enter the customer's 6-digit start OTP.
- `startedAt` is recorded when OTP verification succeeds.
- Booked hours start from `startedAt`.

## Completion

- Help manually marks the job completed.
- Timer reaching zero does not automatically complete the booking.

## Extra time

- Customer can request extra time only after the current booked duration ends.
- Help must approve the request.
- Approved extra time extends the total booked duration.
- Final completion remains manual.

---

# 32. Next Major Production Improvements

Before a real public launch, the following should be strengthened:

1. Production-grade admin/founder verification workflow.
2. More restrictive Firestore rules for Help profile reads.
3. Stronger transaction-level booking conflict protection during simultaneous accepts.
4. Better notification reliability and token lifecycle cleanup.
5. Customer booking history and Help job history.
6. Real-time Help/customer status notifications.
7. Payment/settlement architecture if the business model changes.
8. Error reporting and analytics.
9. Formal production environment separation.
10. Comprehensive QA for race conditions and network failures.

---

# 33. Project Principle

The most important development rule for HomeHelp is:

> Every implemented feature should work end-to-end against Firebase/backend state. UI-only mock behavior is not considered complete.

The application should be built incrementally, one focused module at a time, while keeping the architecture modular and maintainable.
