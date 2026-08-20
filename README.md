# VoiceNote + Walnut & Brass

This repo now also contains **Walnut & Brass**, a full-stack chess web app.

See `walnut-brass.md`, then:

```bash
cd backend && npx prisma migrate dev --name init && npm run dev
cd frontend && npm run dev
```

# VoiceNote

Dark VoiceNote app (React Native / Expo) matching the product design:

- Live speech → text
- Home / Recordings / Favorites / Settings
- Copy, Save, Share to any app
- Android **VoiceNote Keyboard** to type into WhatsApp & more

## Run on Android phone

```bash
npm install
npx expo run:android
```

## Checks

```bash
npm run typecheck
npx expo-doctor
```

## Keyboard (other apps)

1. Install phone build
2. Allow microphone in app
3. Settings → **Enable VoiceNote Keyboard**
4. Open WhatsApp (or any app) → switch keyboard → speak
