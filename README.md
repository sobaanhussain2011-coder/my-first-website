# VoiceNote

Speak → text appears live. Use it inside this app, **or inside other apps**.

## Connect to other apps (important)

### A) Send / Copy (works right away)
1. Speak in VoiceNote
2. Tap **Send to any app** → pick WhatsApp, Instagram, Gmail, etc.
3. Or **Copy** and paste anywhere

### B) VoiceNote Keyboard (types INTO other apps)
This is the feature that makes the app useful system-wide on Android:

1. Build & install: `npx expo run:android`
2. Open VoiceNote once and allow microphone
3. Tap **Enable Keyboard**
4. Turn **ON** “VoiceNote Keyboard”
5. Open WhatsApp / any app → tap a text box
6. Switch keyboard to **VoiceNote Keyboard**
7. Speak — words type into that app

## Run

```bash
npm install
npx expo run:android
```

Web preview (UI only):

```bash
npx expo start --web
```

## Quality checks

```bash
npm run typecheck
npx expo-doctor
```

## Stack

- Expo + React Native (TypeScript)
- Live speech: `expo-speech-recognition`
- System keyboard (IME): `plugins/withVoiceKeyboard` + Android `VoiceNoteIME`
