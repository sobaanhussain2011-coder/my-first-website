# VoiceNote

Simple React Native (Expo) app: press **START**, speak, and your words appear in the message **live** while you talk.

## What it does

- Tap the big **START** button to capture voice
- Text appears in the message box **as you speak** (not after you finish)
- Tap **STOP** to end
- Choose language: English / Hindi / Urdu
- Clear message anytime

## Tech

- Expo + React Native
- `expo-speech-recognition` with `interimResults: true` and `continuous: true` for live transcription

## Run

```bash
npm install
npx expo start
```

### Important (phone / Play Store)

Live speech recognition needs a **development build** (or production build), not Expo Go:

```bash
npx expo run:android
# or
npx expo run:ios
```

Then install the built app on your phone.

## Play Store later

When you are ready to publish, create a release build and upload the Android App Bundle (`.aab`) to Google Play. Your friend can help polish the design before that.
