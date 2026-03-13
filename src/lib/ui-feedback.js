const uiAudioState = {
  context: null,
};

export function playUiFeedbackSound(type = 'success') {
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    if (!uiAudioState.context) {
      uiAudioState.context = new AudioContextCtor();
    }

    if (uiAudioState.context.state === 'suspended') {
      uiAudioState.context.resume();
    }

    const soundProfiles = {
      created: { frequency: 640, wave: 'triangle', peakGain: 0.034, attack: 0.018, release: 0.145 },
      edited: { frequency: 600, wave: 'triangle', peakGain: 0.032, attack: 0.018, release: 0.145 },
      deleted: { frequency: 440, wave: 'sine', peakGain: 0.03, attack: 0.016, release: 0.14 },
      cancelled: { frequency: 410, wave: 'sine', peakGain: 0.03, attack: 0.016, release: 0.14 },
      select: { frequency: 720, wave: 'triangle', peakGain: 0.024, attack: 0.014, release: 0.1 },
      tab: { frequency: 620, wave: 'triangle', peakGain: 0.045, attack: 0.018, release: 0.16 },
      success: { frequency: 580, wave: 'triangle', peakGain: 0.03, attack: 0.018, release: 0.14 },
    };
    const profile = soundProfiles[type] || soundProfiles.success;

    const now = uiAudioState.context.currentTime;
    const oscillator = uiAudioState.context.createOscillator();
    const gainNode = uiAudioState.context.createGain();

    oscillator.type = profile.wave;
    oscillator.frequency.setValueAtTime(profile.frequency, now);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(profile.peakGain, now + profile.attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + profile.release);

    oscillator.connect(gainNode);
    gainNode.connect(uiAudioState.context.destination);

    oscillator.start(now);
    oscillator.stop(now + profile.release + 0.01);
  } catch {
    // Audio feedback is optional and should never block UX flows.
  }
}