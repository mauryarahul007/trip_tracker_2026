import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isSpeechRecognitionSupported,
  requestSpeechPermissions,
  startSpeechRecognition,
} from './speechRecognition';

describe('speechRecognition utility', () => {
  const originalWindow = (globalThis as any).window;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    (globalThis as any).window = originalWindow;
  });

  it('detects when SpeechRecognition is not supported', async () => {
    (globalThis as any).window = {};
    const supported = await isSpeechRecognitionSupported();
    expect(supported).toBe(false);
  });

  it('detects when SpeechRecognition or webkitSpeechRecognition is supported on web', async () => {
    (globalThis as any).window = {
      webkitSpeechRecognition: vi.fn(),
    };
    const supported = await isSpeechRecognitionSupported();
    expect(supported).toBe(true);
  });

  it('returns true for web speech permissions request by default', async () => {
    const granted = await requestSpeechPermissions();
    expect(granted).toBe(true);
  });

  it('reports error when starting speech recognition without supported browser engine', () => {
    (globalThis as any).window = {};
    const onError = vi.fn();
    const controller = startSpeechRecognition({
      onResult: vi.fn(),
      onError,
    });

    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining('not supported'),
      'not-supported'
    );
    expect(controller.isListening()).toBe(false);
  });

  it('starts and handles web speech recognition results and alternatives', () => {
    const mockRecognitionInstance = {
      continuous: false,
      interimResults: false,
      maxAlternatives: 1,
      lang: '',
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
      onstart: null as (() => void) | null,
      onresult: null as ((ev: any) => void) | null,
      onend: null as (() => void) | null,
      onerror: null as ((err: any) => void) | null,
    };

    function MockSpeechCtor() {
      return mockRecognitionInstance;
    }
    (globalThis as any).window = {
      webkitSpeechRecognition: MockSpeechCtor,
    };

    const onStart = vi.fn();
    const onResult = vi.fn();
    const onEnd = vi.fn();

    const controller = startSpeechRecognition({
      language: 'en-IN',
      continuous: true,
      maxAlternatives: 3,
      silenceTimeoutMs: 2000,
      onStart,
      onResult,
      onEnd,
    });

    expect(mockRecognitionInstance.start).toHaveBeenCalled();
    expect(controller.isListening()).toBe(true);

    // Simulate speech start
    mockRecognitionInstance.onstart?.();
    expect(onStart).toHaveBeenCalled();

    // Simulate interim result with multiple alternatives
    mockRecognitionInstance.onresult?.({
      results: [
        {
          isFinal: false,
          length: 2,
          0: { transcript: 'cab 450' },
          1: { transcript: 'cab for fifty' },
        },
      ],
    });

    expect(onResult).toHaveBeenCalledWith({
      transcript: 'cab 450',
      alternatives: ['cab 450', 'cab for fifty'],
      isFinal: false,
    });

    // Test silence timer auto-stops
    vi.advanceTimersByTime(2100);
    expect(mockRecognitionInstance.stop).toHaveBeenCalled();

    // Simulate speech end
    mockRecognitionInstance.onend?.();
    expect(onEnd).toHaveBeenCalled();
    expect(controller.isListening()).toBe(false);
  });
});
