const {
  withAndroidManifest,
  withDangerousMod,
  AndroidConfig,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Adds VoiceNote Keyboard (Android IME) so users can type by voice
 * into WhatsApp, Instagram, Gmail, Chrome, and any other text field.
 */
function withVoiceKeyboard(config) {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    if (!app.service) app.service = [];

    const already = app.service.some(
      (s) => s.$?.["android:name"] === ".ime.VoiceNoteIME"
    );

    if (!already) {
      app.service.push({
        $: {
          "android:name": ".ime.VoiceNoteIME",
          "android:label": "VoiceNote Keyboard",
          "android:permission": "android.permission.BIND_INPUT_METHOD",
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [
              {
                $: { "android:name": "android.view.InputMethod" },
              },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.view.im",
              "android:resource": "@xml/method",
            },
          },
        ],
      });
    }

    return config;
  });

  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const packageDir = path.join(
        projectRoot,
        "android/app/src/main/java/com/voicenote/app/ime"
      );
      const resRoot = path.join(projectRoot, "android/app/src/main/res");
      const srcRoot = path.join(projectRoot, "native-android/voicekeyboard");

      fs.mkdirSync(packageDir, { recursive: true });
      fs.mkdirSync(path.join(resRoot, "layout"), { recursive: true });
      fs.mkdirSync(path.join(resRoot, "xml"), { recursive: true });
      fs.mkdirSync(path.join(resRoot, "values"), { recursive: true });

      const copies = [
        [
          path.join(srcRoot, "java/com/voicenote/app/ime/VoiceNoteIME.kt"),
          path.join(packageDir, "VoiceNoteIME.kt"),
        ],
        [
          path.join(srcRoot, "res/layout/voice_keyboard_view.xml"),
          path.join(resRoot, "layout/voice_keyboard_view.xml"),
        ],
        [
          path.join(srcRoot, "res/xml/method.xml"),
          path.join(resRoot, "xml/method.xml"),
        ],
        [
          path.join(srcRoot, "res/values/ime_strings.xml"),
          path.join(resRoot, "values/ime_strings.xml"),
        ],
      ];

      for (const [from, to] of copies) {
        if (!fs.existsSync(from)) {
          throw new Error(`Voice keyboard source missing: ${from}`);
        }
        fs.copyFileSync(from, to);
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withVoiceKeyboard;
