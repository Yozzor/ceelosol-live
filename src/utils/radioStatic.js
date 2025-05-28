/**
 * Radio Static Generator
 * Creates radio static sound effect using Web Audio API
 */

class RadioStaticGenerator {
  constructor() {
    this.audioContext = null;
    this.staticBuffer = null;
    this.isInitialized = false;
  }

  // Initialize audio context and generate static buffer
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Generate static noise buffer
      this.staticBuffer = this.generateStaticBuffer(0.5); // 0.5 seconds of static
      
      this.isInitialized = true;
      console.log('📻 Radio static generator initialized');
    } catch (error) {
      console.error('Failed to initialize radio static:', error);
    }
  }

  // Generate white noise buffer for static effect
  generateStaticBuffer(duration) {
    const sampleRate = this.audioContext.sampleRate;
    const bufferLength = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferLength, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate white noise
    for (let i = 0; i < bufferLength; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3; // Reduced volume
    }

    return buffer;
  }

  // Play static sound effect
  async playStatic(volume = 0.2) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.audioContext || !this.staticBuffer) {
      console.warn('Radio static not available');
      return;
    }

    try {
      // Resume audio context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create source and gain nodes
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      // Configure nodes
      source.buffer = this.staticBuffer;
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      
      // Connect nodes
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Play the static
      source.start();
      
      console.log('📻 Playing radio static');
    } catch (error) {
      console.error('Failed to play radio static:', error);
    }
  }

  // Play static with fade effect
  async playStaticWithFade(duration = 0.5, volume = 0.2) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.audioContext || !this.staticBuffer) {
      console.warn('Radio static not available');
      return;
    }

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = this.staticBuffer;
      
      // Fade in and out
      const currentTime = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      source.start();
      
      console.log('📻 Playing radio static with fade');
    } catch (error) {
      console.error('Failed to play radio static with fade:', error);
    }
  }
}

// Create singleton instance
const radioStatic = new RadioStaticGenerator();

export default radioStatic;
