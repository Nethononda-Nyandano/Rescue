# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Authentication and AI diagnosis setup

- Configure `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_SUPABASE_URL`, and `EXPO_PUBLIC_SUPABASE_KEY` for the app. Enable Google as a social connection in Clerk, enable email-code verification for passwordless email sign-in, and register the native callback URLs generated for the `resq` and `resqmechanic` app schemes.
- Apply `supabase/migrations/20261031000100_ai_diagnoses.sql` to the Supabase project. The migration adds `profiles.full_name` and a private `ai_diagnoses` table; diagnosis rows are accessed only through the server function.
- Set the Edge Function secrets `CLERK_JWT_ISSUER` (the exact issuer URL from the Clerk JWT settings) and `GEMINI_API_KEY`. Optionally set `CLERK_JWKS_URL` if the JWKS URL differs from `<issuer>/.well-known/jwks.json`, or `GEMINI_MODEL` to select a supported Gemini model.
- Deploy `supabase/functions/diagnosis` with `supabase functions deploy diagnosis --no-verify-jwt`. The function config disables Supabase JWT verification because the client sends Clerk tokens; the handler verifies each token against Clerk's JWKS. Client and mechanic AI requests, including supported JPEG/PNG/WebP photos (up to 4 MB), go through this authenticated function; never add Gemini or Supabase service-role keys to either Expo app.
- If diagnosis history reports that the function is not deployed (HTTP 404 / `NOT_FOUND`), deploy it to the same Supabase project configured in the app, then confirm the migration and function secrets above are applied. A 401 indicates the Clerk token or `CLERK_JWT_ISSUER` configuration needs attention; a 5xx history error should be checked against the function logs and `ai_diagnoses` migration.
- If a Gemini key was previously placed in an Expo `.env`, source file, build configuration, or shared artifact, revoke and rotate it in Google AI Studio before deploying. Only set the replacement as the server-side `GEMINI_API_KEY` function secret.
- Test the server-side input and safety rules with `deno test supabase/functions/diagnosis/validation_test.ts`.

## Road ETAs and South African fuel references

- Assigned rescue ETAs and mechanic incoming-request figures use measured road-route duration and distance. Google routing is traffic-aware when available; the Open Source Routing Machine fallback provides a road estimate without live traffic. If location or routing fails, the apps show that the route is unavailable rather than generating a fixed-speed ETA or straight-line route.
- Client fuel requests require an explicit inland or coastal price zone. The reference table in `src/utils/fuelPrices.ts` reflects November 2026 prices effective 4 November through 1 December; the next adjustment takes effect 2 December. Petrol 93/95 are pump prices, while diesel 50ppm/500ppm values are wholesale references, not pump prices. Sources: [DMPR notice](https://www.gov.za/news/media-statements/minister-gwede-mantashe-announces-adjustment-fuel-prices-effective-4-0) and [published price table](https://www.thesouthafrican.com/news/here-are-the-official-petrol-and-diesel-prices-for-november-2026).
- Prices are monthly and intentionally stop being offered when that reference expires. Update the date, prices, tests, and source links in `src/utils/fuelPrices.ts` at each official adjustment; do not extend a prior month’s prices. The app requires the selected zone and reference date at request time.
- For Google traffic routing, enable the Google Routes API (and Directions API for its fallback) for `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`. If those services are unavailable, OSRM may provide non-traffic-aware road figures; if neither returns a valid route, no ETA or road distance is presented.

## All-rounder mechanic and rescue alert sounds

- Clients can request an `All-rounder Mechanic` for engine, gearbox, lights, electrical, and other roadside concerns. A problem description is required and is stored in the existing rescue request `notes` field. The shown amount is an indicative dispatch estimate; the mechanic confirms diagnosis and repair costs after inspection.
- Mechanics must select the existing `diagnostics` service during onboarding to receive all-rounder requests. Only matching service types are shown to online mechanics without an active job.
- Both Expo apps use `expo-notifications` for local rescue alerts and the system default notification sound. Enable the `Rescue updates` preference and grant OS notification permission; Android notification channel and device sound settings can mute or change alerts.
- These are client-side alerts for events observed while the app is connected; remote push delivery while an app is fully closed is not configured. Rebuild the native app after adding or changing the notifications module/configuration, and verify sounds on a physical device.
