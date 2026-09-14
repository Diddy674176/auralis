import type { MediaLimitsInfo } from '../types';

export function detectMediaLimits(): MediaLimitsInfo {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const mediaSessionSupported = typeof navigator !== 'undefined' && 'mediaSession' in navigator;

  if (isIOS) {
    return {
      platform: 'ios',
      speechContinuesWhenLocked: 'unreliable',
      mediaSessionSupported,
      tips: [
        'iOS Safari often pauses Web Speech when the screen locks. Install Auralis to your Home Screen (Share → Add to Home Screen) for better results.',
        'Keep Low Power Mode off while listening for longer sessions.',
        'Lock-screen controls via Media Session are limited on iOS for speechSynthesis; premium audio-element TTS will work better when configured.',
        'Do not switch away immediately after pressing Play — wait for the first sentence to start.',
      ],
    };
  }
  if (isAndroid) {
    return {
      platform: 'android',
      speechContinuesWhenLocked: 'likely',
      mediaSessionSupported,
      tips: [
        'Chrome on Android usually continues speech with the screen locked if Media Session is active.',
        'Install the PWA (Chrome menu → Install app / Add to Home screen) for the most reliable background playback.',
        'Battery optimization can still kill background tabs — exclude Chrome/Auralis if audio stops.',
        'Bluetooth / headphone buttons should map to play/pause and skip when Media Session is supported.',
      ],
    };
  }
  return {
    platform: 'desktop',
    speechContinuesWhenLocked: 'unknown',
    mediaSessionSupported,
    tips: [
      'Desktop browsers generally keep speechSynthesis running while the tab is open.',
      'Media Session appears in the OS media controls (e.g. Windows Now Playing, macOS Control Center).',
      'For true audiobook-style offline listening, configure premium TTS (audio blobs) via VITE_TTS_PROXY_URL later.',
    ],
  };
}
