# Shared mobile and web design

The website uses the mobile app's light green/white palette, Nunito font, rounded cards, and original green owl mascot. Existing admin pages remain available through the profile menu. Primary navigation is Dashboard, Riwayat and Tambah Perangkat; on small screens it moves to a fixed bottom bar.

Login, dashboard, device headings and history use the existing mobile artwork copied into `public/mascot/`. No new image generation was needed. Font license: `public/fonts/OFL-Nunito.txt`.

Dashboard and Ringkasan show live temperature, humidity, light, pH, TDS, MCB power/energy and water flow. Trend lines use actual readings. Missing readings stay unavailable. Global history is grouped per panel per local hour and retains raw samples in expandable details.

Manual control uses the shared backend `/home-assistant/devices/:id/relays/manual` endpoint. ON remains ON until OFF. Calibration-based nutrient/pH dosing retains its own limits. Switches follow HA feedback and become unavailable on request failure. MCB mapping and energy sensor setup remain available to admins in the collapsed MCB settings.

Deploy together with the backend changes for manual relays, global history and flow readings. These changes do not deploy the site or operate real hardware.

Validation:

```powershell
npm run build
$env:PLAYWRIGHT_MODULE = 'path/to/playwright'
$env:UI_BASE_URL = 'http://127.0.0.1:3107'
node scripts/check-web-theme.cjs
```

The browser script mocks all API traffic and blocks external requests. It checks login/logout, fixed light theme even with an old dark preference, navigation, admin access, global history, manual ON persistence/OFF, MCB, failure states, add-device dialog, and layouts at 1440, 390 and 320 pixels. Screenshots are saved under `../artifacts/ui/web-mobile-theme`.


## Website sidebar preference

Website navigation now uses a fixed desktop sidebar with primary and admin links, plus the existing profile/logout menu. At 850px and below it becomes a native modal drawer opened with Buka menu; native dialog focus containment, Escape, and the close button are supported. Website bottom navigation is removed. Mobile Flutter navigation is unchanged. Production build and mocked browser checks cover desktop and 390/320px navigation, including opening/closing the drawer.
