# VoiceNote

React Native app: tap **START**, speak, and words appear **live** in your message.

## Status

**Code is ready now.**  
Checks passed:
- TypeScript (`tsc`) — clean
- Expo doctor — 21/21 passed
- Web export bundle — success

To use live voice on a phone, build once:

```bash
npm install
npx expo run:android
```

## Features

- Live speech → text (not record-then-convert)
- English / Hindi / Urdu
- Copy message
- Clear message
- Auto-continue listening on Android session ends
- Listening pulse animation

## Scripts

```bash
npm run typecheck
npm run web
npm run export:web
```

## Play Store later

Still needed before a 10/10 store launch:
1. Test on a real Android phone
2. Polish design with your friend
3. App icon + screenshots
4. Google Play Developer account ($25)
5. Release build (`.aab`) upload
