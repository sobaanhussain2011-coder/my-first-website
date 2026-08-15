package com.voicenote.app.ime

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.TextView
import android.inputmethodservice.InputMethodService
import androidx.core.content.ContextCompat
import com.voicenote.app.R
import java.util.Locale

/**
 * System keyboard so VoiceNote can type into WhatsApp, Instagram, Chrome, etc.
 */
class VoiceNoteIME : InputMethodService() {
  private var statusView: TextView? = null
  private var micButton: Button? = null
  private var speechRecognizer: SpeechRecognizer? = null
  private var listening = false
  private var lastPartial: String = ""
  private val mainHandler = Handler(Looper.getMainLooper())

  override fun onCreateInputView(): View {
    val view = layoutInflater.inflate(R.layout.voice_keyboard_view, null)
    statusView = view.findViewById(R.id.voice_keyboard_status)
    micButton = view.findViewById(R.id.voice_keyboard_mic)

    view.findViewById<Button>(R.id.voice_keyboard_mic).setOnClickListener {
      if (listening) stopListening() else startListening()
    }
    view.findViewById<Button>(R.id.voice_keyboard_delete).setOnClickListener {
      currentInputConnection?.deleteSurroundingText(1, 0)
    }
    view.findViewById<Button>(R.id.voice_keyboard_space).setOnClickListener {
      currentInputConnection?.commitText(" ", 1)
    }
    view.findViewById<Button>(R.id.voice_keyboard_enter).setOnClickListener {
      val ic = currentInputConnection ?: return@setOnClickListener
      if (!ic.performEditorAction(EditorInfo.IME_ACTION_DONE)) {
        ic.commitText("\n", 1)
      }
    }
    view.findViewById<Button>(R.id.voice_keyboard_switch).setOnClickListener {
      val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
      imm.showInputMethodPicker()
    }

    ensureRecognizer()
    return view
  }

  override fun onFinishInputView(finishingInput: Boolean) {
    stopListening()
    super.onFinishInputView(finishingInput)
  }

  override fun onDestroy() {
    stopListening()
    speechRecognizer?.destroy()
    speechRecognizer = null
    super.onDestroy()
  }

  private fun ensureRecognizer() {
    if (speechRecognizer != null) return
    if (!SpeechRecognizer.isRecognitionAvailable(this)) {
      setStatus("Speech recognition not available on this phone")
      return
    }
    speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this).apply {
      setRecognitionListener(object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {
          setStatus("Listening… speak now")
        }

        override fun onBeginningOfSpeech() {
          setStatus("Listening…")
        }

        override fun onRmsChanged(rmsdB: Float) {}

        override fun onBufferReceived(buffer: ByteArray?) {}

        override fun onEndOfSpeech() {
          setStatus("Processing…")
        }

        override fun onError(error: Int) {
          listening = false
          lastPartial = ""
          updateMicLabel()
          if (error == SpeechRecognizer.ERROR_CLIENT ||
            error == SpeechRecognizer.ERROR_NO_MATCH ||
            error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT
          ) {
            setStatus("Tap START and speak again")
          } else {
            setStatus("Mic error ($error). Check microphone permission.")
          }
        }

        override fun onResults(results: Bundle?) {
          listening = false
          updateMicLabel()
          val texts = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
          val spoken = texts?.firstOrNull()?.trim().orEmpty()
          if (spoken.isNotEmpty()) {
            // Replace any live partial with final text
            commitFinal(spoken)
            setStatus("Typed into this app. Tap START to continue.")
          } else {
            setStatus("No words caught. Try again.")
          }
          lastPartial = ""
        }

        override fun onPartialResults(partialResults: Bundle?) {
          val texts =
            partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
          val spoken = texts?.firstOrNull()?.trim().orEmpty()
          if (spoken.isNotEmpty()) {
            commitPartial(spoken)
            setStatus("Writing live…")
          }
        }

        override fun onEvent(eventType: Int, params: Bundle?) {}
      })
    }
  }

  private fun startListening() {
    val micOk =
      ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
        PackageManager.PERMISSION_GRANTED
    if (!micOk) {
      setStatus("Open VoiceNote app once and allow microphone")
      return
    }

    ensureRecognizer()
    val recognizer = speechRecognizer ?: run {
      setStatus("Speech recognition unavailable")
      return
    }

    lastPartial = ""
    listening = true
    updateMicLabel()
    setStatus("Starting…")

    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
      putExtra(
        RecognizerIntent.EXTRA_LANGUAGE_MODEL,
        RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
      )
      putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
      putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
      putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
    }
    try {
      recognizer.startListening(intent)
    } catch (_: Exception) {
      listening = false
      updateMicLabel()
      setStatus("Could not start microphone")
    }
  }

  private fun stopListening() {
    if (!listening && lastPartial.isEmpty()) {
      speechRecognizer?.cancel()
      return
    }
    listening = false
    updateMicLabel()
    try {
      speechRecognizer?.stopListening()
    } catch (_: Exception) {
      // ignore
    }
    lastPartial = ""
    mainHandler.post { setStatus("Ready — tap START to speak") }
  }

  private fun commitPartial(text: String) {
    val ic: InputConnection = currentInputConnection ?: return
    if (lastPartial.isNotEmpty()) {
      ic.deleteSurroundingText(lastPartial.length, 0)
    }
    ic.commitText(text, 1)
    lastPartial = text
  }

  private fun commitFinal(text: String) {
    val ic: InputConnection = currentInputConnection ?: return
    if (lastPartial.isNotEmpty()) {
      ic.deleteSurroundingText(lastPartial.length, 0)
      lastPartial = ""
    }
    val toCommit = if (text.endsWith(" ")) text else "$text "
    ic.commitText(toCommit, 1)
  }

  private fun setStatus(message: String) {
    statusView?.text = message
  }

  private fun updateMicLabel() {
    micButton?.text = if (listening) "STOP" else "START"
  }
}
