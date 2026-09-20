import { Capacitor } from '@capacitor/core';

export interface SpeechRecognitionResultPayload {
  transcript: string;
  alternatives: string[];
  isFinal: boolean;
}

export interface SpeechListenOptions {
  language?: string;
  continuous?: boolean;
  maxAlternatives?: number;
  silenceTimeoutMs?: number;
  onStart?: () => void;
  onResult: (payload: SpeechRecognitionResultPayload) => void;
  onError?: (error: string, errorCode?: string) => void;
  onEnd?: () => void;
}

export interface SpeechRecognitionController {
  stop: () => void;
  abort: () => void;
  isListening: () => boolean;
}

/**
 * Checks if speech recognition is available on the current platform (Native or Web).
 */
export async function isSpeechRecognitionSupported(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
      const result = await SpeechRecognition.available();
      return !!result.available;
    } catch {
      return false;
    }
  }

  if (typeof window === 'undefined') return false;
  const w = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/**
 * Requests microphone / speech recognition permissions.
 */
export async function requestSpeechPermissions(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
      const perm = await SpeechRecognition.requestPermissions();
      return perm.speechRecognition === 'granted';
    } catch {
      return false;
    }
  }

  // On web, permissions are requested automatically on start()
  return true;
}

/**
 * Starts a speech recognition session across native or web platforms.
 */
export function startSpeechRecognition(options: SpeechListenOptions): SpeechRecognitionController {
  const {
    language = 'en-IN',
    continuous = true,
    maxAlternatives = 3,
    silenceTimeoutMs = 2400,
    onStart,
    onResult,
    onError,
    onEnd,
  } = options;

  let active = true;
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let nativeListenerHandle: { remove: () => void } | null = null;
  let webRecognitionInstance: any = null;

  const resetSilenceTimer = () => {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
    if (silenceTimeoutMs > 0 && active) {
      silenceTimer = setTimeout(() => {
        if (active) {
          controller.stop();
        }
      }, silenceTimeoutMs);
    }
  };

  const clearSilenceTimer = () => {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  };

  const cleanup = () => {
    const wasActive = active;
    active = false;
    clearSilenceTimer();
    if (nativeListenerHandle) {
      try {
        nativeListenerHandle.remove();
      } catch {}
      nativeListenerHandle = null;
    }
    if (webRecognitionInstance) {
      try {
        webRecognitionInstance.abort();
      } catch {}
      webRecognitionInstance = null;
    }
    if (wasActive) {
      onEnd?.();
    }
  };

  const controller: SpeechRecognitionController = {
    stop: () => {
      if (!active) return;
      clearSilenceTimer();

      if (Capacitor.isNativePlatform()) {
        import('@capacitor-community/speech-recognition')
          .then(({ SpeechRecognition }) => {
            SpeechRecognition.stop().catch(() => {});
          })
          .catch(() => {})
          .finally(() => {
            cleanup();
          });
      } else if (webRecognitionInstance) {
        try {
          webRecognitionInstance.stop();
        } catch {
          cleanup();
        }
      } else {
        cleanup();
      }
    },
    abort: () => {
      if (!active) return;
      cleanup();
    },
    isListening: () => active,
  };

  // Launch platform-specific handler
  if (Capacitor.isNativePlatform()) {
    (async () => {
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        const availableStatus = await SpeechRecognition.available();
        if (!availableStatus.available) {
          onError?.('Speech recognition is not available on this device.', 'unavailable');
          cleanup();
          return;
        }

        const perm = await SpeechRecognition.requestPermissions();
        if (perm.speechRecognition !== 'granted') {
          onError?.('Microphone or speech permission was denied.', 'permission-denied');
          cleanup();
          return;
        }

        nativeListenerHandle = await SpeechRecognition.addListener(
          'partialResults',
          (data: { matches?: string[] }) => {
            if (!active) return;
            const matches = data.matches || [];
            if (matches.length > 0) {
              resetSilenceTimer();
              onResult({
                transcript: matches[0],
                alternatives: matches,
                isFinal: false,
              });
            }
          }
        );

        onStart?.();
        resetSilenceTimer();

        await SpeechRecognition.start({
          language,
          maxResults: maxAlternatives,
          prompt: 'Speak now to add expense...',
          partialResults: true,
          popup: false,
        });
      } catch (err: any) {
        if (!active) return;
        onError?.(err?.message || 'Failed to start native speech recognition.', 'native-error');
        cleanup();
      }
    })();
  } else {
    // Web Speech API
    if (typeof window === 'undefined') {
      onError?.('Speech recognition is not supported in this environment.', 'no-window');
      cleanup();
      return controller;
    }

    const w = window as unknown as {
      SpeechRecognition?: new () => any;
      webkitSpeechRecognition?: new () => any;
    };
    const SpeechCtor = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SpeechCtor) {
      onError?.('Speech recognition is not supported in this browser.', 'not-supported');
      cleanup();
      return controller;
    }

    try {
      const rec = new SpeechCtor();
      rec.continuous = continuous;
      rec.interimResults = true;
      rec.maxAlternatives = maxAlternatives;
      rec.lang = language;

      rec.onstart = () => {
        if (!active) return;
        onStart?.();
        resetSilenceTimer();
      };

      rec.onresult = (event: any) => {
        if (!active) return;
        resetSilenceTimer();

        const allAlternatives: string[] = [];
        let combinedPrimaryTranscript = '';
        let isFinalBatch = false;

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result) continue;
          if (result.isFinal) isFinalBatch = true;

          // Primary transcript
          if (result[0]?.transcript) {
            combinedPrimaryTranscript += result[0].transcript + ' ';
          }

          // Collect all alternatives for this segment
          for (let j = 0; j < result.length; j++) {
            const alt = result[j]?.transcript?.trim();
            if (alt && !allAlternatives.includes(alt)) {
              allAlternatives.push(alt);
            }
          }
        }

        const primaryTrimmed = combinedPrimaryTranscript.trim();
        if (primaryTrimmed) {
          if (!allAlternatives.includes(primaryTrimmed)) {
            allAlternatives.unshift(primaryTrimmed);
          }
          onResult({
            transcript: primaryTrimmed,
            alternatives: allAlternatives,
            isFinal: isFinalBatch,
          });
        }
      };

      rec.onerror = (err: any) => {
        if (!active) return;
        const code = err?.error || 'unknown';
        if (code === 'not-allowed') {
          onError?.('Microphone access was denied. Please allow microphone access or type below.', code);
        } else if (code === 'no-speech') {
          onError?.("Didn't catch that. Tap mic to try again or type below.", code);
        } else if (code !== 'aborted') {
          onError?.(`Voice input error (${code}). Tap mic to retry.`, code);
        }
        cleanup();
      };

      rec.onend = () => {
        cleanup();
      };

      webRecognitionInstance = rec;
      rec.start();
    } catch (e: any) {
      onError?.(e?.message || 'Failed to start speech recognition.', 'start-failed');
      cleanup();
    }
  }

  return controller;
}
