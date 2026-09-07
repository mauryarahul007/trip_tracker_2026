/**
 * Web Audio API Sound Synthesizer for Travel-Themed Tactile Interactions
 * 
 * Provides crisp, zero-dependency procedural sound effects:
 * - Ticket tear / perforated paper rip
 * - Rubber stamp thud
 * - Subtle haptic click
 */

class SoundEffectManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    // Check user preference or system muted state
    try {
      const stored = localStorage.getItem('trip_tracker_sound_enabled');
      if (stored !== null) {
        this.enabled = stored === 'true';
      }
    } catch {
      this.enabled = true;
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    try {
      localStorage.setItem('trip_tracker_sound_enabled', String(val));
    } catch {}
  }

  public isSoundEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Perforated Paper Tear / Ticket Rip sound
   * Synthesized using pink/brown filtered noise burst with quick amplitude modulation
   */
  public playTicketTear() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const duration = 0.28;
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Generate crackling noise reminiscent of tearing perforated fibrous paper
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Lowpass integration to produce brown/pink fibrous noise
        lastOut = (lastOut + 0.04 * white) / 1.04;
        // Micro-tears: random amplitude spikes to simulate perforated teeth ripping
        const toothSpike = Math.random() < 0.08 ? (Math.random() * 1.5 - 0.75) : 0;
        data[i] = (lastOut * 2.8 + toothSpike) * Math.exp(-i / (bufferSize * 0.45));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Bandpass filter to isolate paper friction frequencies (700Hz - 3.2kHz)
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + duration);
      filter.Q.value = 1.2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
    } catch {
      // Graceful fallback on audio failure
    }
  }

  /**
   * Rubber Stamp Thud sound
   * Deep tactile thud when a passport stamp or settled stamp hits the paper
   */
  public playStampThud() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(42, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }

  /**
   * Soft Tactile Mechanical Click (Odometer / Quick actions)
   */
  public playTick() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.03);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }
}

export const soundEffects = new SoundEffectManager();

export const playTicketTear = () => soundEffects.playTicketTear();
export const playStampThud = () => soundEffects.playStampThud();
export const playTick = () => soundEffects.playTick();
