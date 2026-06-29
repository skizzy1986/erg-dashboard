---
id: WO-006
title: Capacitor plugins — BLE shim + lifecycle + network + notifications
status: ready
author: coach
created: 2026-06-29
targets: [web/package.json, web/android/app/src/main/AndroidManifest.xml, web/src/main.jsx, web/capacitor.config.json]
reversible: true
depends_on: []
acceptance:
  - PM5 BLE connects and streams live data inside the Android APK
  - app pause disconnects BLE; app resume re-enables offline queue drain
  - navigator.onLine replaced by @capacitor/network for offline queue logic
  - local notification fires on manual test trigger (no real cron needed for acceptance)
  - npm run build passes with no TypeScript/ESLint errors
  - npx cap sync android completes without errors
---

# WO-006 · Capacitor plugins — BLE shim + lifecycle + network + notifications

## Goal

Install and wire four Capacitor plugins to make the Android build functionally complete.
Without this work, the PM5 BLE connection (`src/services/pm5Bluetooth.js`) silently fails
on Android — `navigator.bluetooth` is `undefined` in the Android System WebView. All other
web APIs (Vibration, localStorage, Service Worker) work as-is and do not require changes.

## Background (research findings — WO-006 research session 2026-06-29)

### Critical: Web Bluetooth not supported in Android WebView

`navigator.bluetooth` is `undefined` at runtime in Capacitor's Android WebView. This is a
confirmed Chromium limitation (crbug.com/1100993, open since 2020, no ship date). The PM5
live session view (`ErgLiveView.jsx`) is entirely non-functional on Android without a native
BLE plugin.

**Chosen plugin:** `@capgo/capacitor-bluetooth-low-energy@^8.1.0`
Rationale: provides `BluetoothLowEnergy.shimWebBluetooth()` which installs a JS shim over
`navigator.bluetooth`, so the existing `pm5Bluetooth.js` code continues to work without
rewriting all BLE call sites. The shim resolves `requestDevice()` to the first matching
scanned device (no picker UI) — acceptable because the PM5 is typically the only BLE device
in range during a session.

Alternative (`@capacitor-community/bluetooth-le@^8.2.0`) is more established but requires
rewriting all BLE code from `navigator.bluetooth.*` to `BleClient.*`. Defer that migration
until the shim proves unreliable.

### CapacitorHttp trap (do not enable)

`CapacitorHttp` intercepts `fetch`/`XHR` at the native layer and breaks Supabase Realtime
(WebSocket upgrade fails). The current `web/capacitor.config.json` does not enable it —
preserve that. Never add a `plugins.CapacitorHttp` key to the config.

### androidScheme already correct

`"androidScheme": "https"` in `web/capacitor.config.json` is already set. This is required
for Supabase REST calls to work without CORS errors. Do not change it.

### navigator.vibrate() works in Android WebView

No BLE-equivalent breakage here. The Vibration API is supported in the Android System
WebView. `@capacitor/haptics` is not required for this work order.

## Scope

**In:**
- Install `@capgo/capacitor-bluetooth-low-energy`, `@capacitor/app`, `@capacitor/network`,
  `@capacitor/local-notifications` into `web/package.json`
- Add required Android permissions to `web/android/app/src/main/AndroidManifest.xml`
- Call `BluetoothLowEnergy.shimWebBluetooth()` once at app startup (before any BLE code runs)
- Replace `navigator.onLine` / `window.addEventListener('online')` in
  `web/src/hooks/useOfflineQueue.js` with `@capacitor/network`
- Wire `@capacitor/app` pause/resume events in the appropriate app entry point
- Add a one-shot local notification scheduling function (not wired to a real cron schedule —
  the acceptance test triggers it manually)

**Out:**
- `@capacitor/browser` (OAuth) — deferred to Strava/Garmin integration work orders
- `@atroo/capacitor-secure-storage-plugin` — deferred to OAuth work orders
- `@capacitor/push-notifications` (FCM) — deferred; requires Firebase project setup by Bridge
- Full migration from `navigator.bluetooth` to `BleClient.*` — deferred
- iOS support — not in scope; no `ios/` directory exists
- `@capacitor/haptics` — not required; `navigator.vibrate()` works in the WebView

## Implementation

### 1. Install packages

```bash
cd web
npm install @capgo/capacitor-bluetooth-low-energy@^8.1.0 \
            @capacitor/app@^8.0.0 \
            @capacitor/network@^8.0.0 \
            @capacitor/local-notifications@^8.0.0
npx cap sync android
```

### 2. Android permissions — `web/android/app/src/main/AndroidManifest.xml`

Add inside `<manifest>`, before `<application>`:

```xml
<!-- BLE (PM5 ergometer) -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
    android:usesPermissionFlags="neverForLocation"
    tools:targetApi="s" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-feature android:name="android.hardware.bluetooth_le" android:required="true" />

<!-- Network status (@capacitor/network) -->
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Vibration (already present or add if missing) -->
<uses-permission android:name="android.permission.VIBRATE" />

<!-- Local notifications (Android 13+) — runtime permission requested in JS -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Exact alarms for scheduled notifications (Android 12+) -->
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
```

Ensure `xmlns:tools="http://schemas.android.com/tools"` is present on the `<manifest>` tag
(required for `tools:targetApi`).

### 3. BLE shim — `web/src/main.jsx`

Call the shim once, before the React tree mounts. The shim installs `navigator.bluetooth`,
so any code that checks it (including `pm5Bluetooth.js`) will find it populated.

```jsx
import { Capacitor } from '@capacitor/core';
import { BluetoothLowEnergy } from '@capgo/capacitor-bluetooth-low-energy';

if (Capacitor.isNativePlatform()) {
  BluetoothLowEnergy.shimWebBluetooth();
}
```

Place this block after imports, before `ReactDOM.createRoot(...)`.

The `Capacitor.isNativePlatform()` guard ensures the shim only runs inside the Android app —
the web PWA continues to use the real Web Bluetooth API unchanged.

### 4. Replace navigator.onLine — `web/src/hooks/useOfflineQueue.js`

Current code uses `navigator.onLine` and `window.addEventListener('online', ...)`.

Replace with `@capacitor/network`:

```js
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
```

In the hook:
- On mount: call `Network.getStatus()` to get initial `{ connected, connectionType }`.
  Use `connected` where `navigator.onLine` was used.
- For the event listener: replace `window.addEventListener('online', handler)` with
  `Network.addListener('networkStatusChange', ({ connected }) => handler(connected))`.
- On unmount: call the returned `handle.remove()` from `addListener`.

Web fallback: wrap in `if (Capacitor.isNativePlatform())` and keep the `navigator.onLine`
path for the browser/PWA context. Both paths must work — the app runs as both a PWA and an
Android APK.

The `connectionType` value ('wifi' | 'cellular' | 'none') is available for future use
(e.g., defer bulk sync on cellular). Not required for this work order — just expose
`connected` for now.

### 5. App lifecycle — choose the appropriate entry point

Wire `@capacitor/app` events. The right location depends on where BLE state and the offline
queue hook live. Look at `web/src/App.jsx` (or `web/src/main.jsx`) for the top-level
component. Add a `useEffect` in the top-level component:

```js
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

useEffect(() => {
  if (!Capacitor.isNativePlatform()) return;

  const pauseHandle = App.addListener('pause', () => {
    // Disconnect BLE: call whatever disconnect fn pm5Bluetooth.js / usePM5 exposes
    // e.g. pm5.disconnect() or set a flag the hook checks
  });

  const resumeHandle = App.addListener('resume', () => {
    // Trigger offline queue drain — the useOfflineQueue hook already listens for
    // 'online' events; alternatively call its drain fn directly if exported
  });

  return () => {
    pauseHandle.then(h => h.remove());
    resumeHandle.then(h => h.remove());
  };
}, []);
```

Inspect `web/src/services/pm5Bluetooth.js` and `web/src/hooks/usePM5.js` to find the
correct disconnect call. Inspect `web/src/hooks/useOfflineQueue.js` to find whether the
drain function is exported or triggered automatically by network status change.

### 6. Local notifications — add scheduling utility

Create `web/src/utils/notifications.js`:

```js
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export async function requestNotificationPermission() {
  if (!Capacitor.isNativePlatform()) return 'granted';
  const { display } = await LocalNotifications.checkPermissions();
  if (display === 'granted') return 'granted';
  const { display: result } = await LocalNotifications.requestPermissions();
  return result;
}

export async function scheduleReadinessAlert() {
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return;

  await LocalNotifications.schedule({
    notifications: [
      {
        id: 1001,
        title: 'Readiness check',
        body: 'Check your TSB and plan today\'s session.',
        schedule: { every: 'day', allowWhileIdle: true },
        channelId: 'readiness',
      },
    ],
  });
}

export async function scheduleSessionReminder(sessionLabel, atDate) {
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return;

  await LocalNotifications.schedule({
    notifications: [
      {
        id: Date.now(),
        title: 'Session reminder',
        body: sessionLabel,
        schedule: { at: atDate, allowWhileIdle: true },
      },
    ],
  });
}
```

Register the notification channel on Android in the same file or in app startup:

```js
export async function createNotificationChannels() {
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.createChannel({
    id: 'readiness',
    name: 'Readiness Alerts',
    importance: 3,
    sound: 'default',
  });
}
```

Call `createNotificationChannels()` once at app startup (in `main.jsx`, after the BLE shim).

**Do not wire the daily alert to an automatic call yet** — the acceptance test triggers
`scheduleReadinessAlert()` manually from the browser console or a dev-only button.

## Files to modify

| File | Change |
|------|--------|
| `web/package.json` | Add four new dependencies |
| `web/android/app/src/main/AndroidManifest.xml` | Add BLE + network + notification permissions |
| `web/src/main.jsx` | BLE shim + notification channel creation at startup |
| `web/src/hooks/useOfflineQueue.js` | Replace `navigator.onLine` with `@capacitor/network` |
| `web/src/App.jsx` (or top-level component) | Wire `@capacitor/app` pause/resume listeners |

## Files to create

| File | Purpose |
|------|---------|
| `web/src/utils/notifications.js` | Permission request + scheduling helpers |

## Acceptance

1. **PM5 BLE on Android:** Build the APK (`npm run build && npx cap sync android && cd android && ./gradlew :app:assembleDebug`). Install on device or emulator with BLE support. Open ErgLiveView. Tap "Connect". PM5 connects and streams watts/pace/stroke rate.
2. **BLE shim guard:** Open the app in Chrome (desktop, web PWA). `navigator.bluetooth` returns the real Web Bluetooth API, not the shim. No console errors.
3. **Offline queue — network plugin:** Put the device in airplane mode. Log a session. Bring network back. Confirm the queued session syncs to Supabase without a manual page reload.
4. **App lifecycle:** Background the Android app while PM5 is connected. BLE connection is released (no GATT error on next connect). Foreground the app — offline queue drain runs.
5. **Notification permission:** Call `requestNotificationPermission()` from console. Android system permission dialog appears (first run only). Grants.
6. **Notification fires:** Call `scheduleReadinessAlert()` from console. Wait or advance device clock. Notification appears in system tray.
7. **Build clean:** `npm run build` passes. `npm run lint` passes. `npx cap sync android` passes. `./gradlew :app:assembleDebug` produces an APK without ProGuard errors.

## Rollback

All changes are additive:
- Remove the four packages from `web/package.json` and run `npm install`.
- Revert `web/src/main.jsx` shim call and channel creation.
- Revert `useOfflineQueue.js` to `navigator.onLine`.
- Revert App lifecycle `useEffect`.
- Delete `web/src/utils/notifications.js`.
- Remove the new AndroidManifest.xml permission lines.
- Run `npx cap sync android`.

No schema changes. No Supabase secrets. No cron entries.

## Future plugins (not in scope for this WO)

These are captured here for the next author. Do not install them in this work order.

| Plugin | When | Notes |
|--------|------|-------|
| `@capacitor/browser@^8.0.0` | Strava/Garmin OAuth WOs | Chrome Custom Tabs for OAuth flows; pair with `appUrlOpen` deep link listener |
| `@atroo/capacitor-secure-storage-plugin@^8.0.0` | Strava/Garmin OAuth WOs | Android Keystore for refresh tokens; `@capacitor/preferences` is plaintext, not suitable |
| `@capacitor/push-notifications@^8.0.0` | Coach alerts WO | Requires Bridge to create Firebase project + `google-services.json` first |
| `@capacitor-community/bluetooth-le@^8.2.0` | BLE reliability WO | Full BLE rewrite replacing shim; do only if shim proves unreliable |

## Authority notes

- Do not enable `CapacitorHttp` in `web/capacitor.config.json` — it breaks Supabase Realtime.
- Do not install `@capacitor/status-bar` — deprecated for Android 16 edge-to-edge; SystemBars is built into `@capacitor/core` v8.
- The BLE shim guard (`Capacitor.isNativePlatform()`) is load-bearing — remove it and the web PWA loses real Web Bluetooth.
- `@capacitor/preferences` (SharedPreferences) is NOT suitable for OAuth tokens — it stores plaintext on disk. Use `@atroo/capacitor-secure-storage-plugin` when OAuth lands.
- The `SCHEDULE_EXACT_ALARM` permission is required on Android 12+ for notifications to fire at a predictable time. Without it, alarms are inexact (may be delayed by minutes to hours by the OS).
- Use `every: 'day'` for recurring daily notifications, not `on: { hour: 8 }` — the `on` property is unreliable on Android per multiple community reports.
