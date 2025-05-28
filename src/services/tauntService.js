/**
 * Taunt Service - Manages sound effects for player taunts
 * Handles audio playback, cooldown management, and sound file organization
 */

class TauntService {
  constructor() {
    this.sounds = new Map();
    this.lastTauntTime = 0;
    this.cooldownDuration = 30000; // 30 seconds
    this.isInitialized = false;
    this.currentAudio = null;

    // Initialize sound library
    this.initializeSounds();
  }

  /**
   * Initialize all available taunt sounds
   */
  initializeSounds() {
    // Categorized sound library for better UX
    this.soundCategories = {
      'Gangsta': [
        { id: 'gangsta-paradise', file: 'gangsta paradise.mp3', name: 'Gangsta Paradise' },
        { id: 'gangsta-rap', file: 'gangsta rap.mp3', name: 'Gangsta Rap' },
        { id: 'ice-cube', file: 'ice cube gangsta.mp3', name: 'Ice Cube' },
        { id: 'grillz', file: 'grillz.mp3', name: 'Grillz' },
        { id: 'damn-feels-good', file: 'damn it feels good.mp3', name: 'Damn It Feels Good' }
      ],
      'Ghetto': [
        { id: 'ghetto', file: 'ghetto.mp3', name: 'Ghetto' },
        { id: 'ghetto-smosh', file: 'ghetto smosh.mp3', name: 'Ghetto Smosh' },
        { id: 'ghetto-walmart', file: 'ghetto walmart.mp3', name: 'Ghetto Walmart' },
        { id: 'im-in-ghetto', file: 'im in the ghetto.mp3', name: 'I\'m In The Ghetto' },
        { id: 'in-ghetto', file: 'in the ghetto.mp3', name: 'In The Ghetto' },
        { id: 'incel-ghetto', file: 'incel ghetto.mp3', name: 'Incel Ghetto' }
      ],
      'Taunts': [
        { id: 'taunt', file: 'taunt.mp3', name: 'Classic Taunt' },
        { id: 'taunt1', file: 'taunt1.mp3', name: 'Taunt 1' },
        { id: 'taunt2', file: 'taunt2.mp3', name: 'Taunt 2' },
        { id: 'shadowtaunt', file: 'shadowtaunt.mp3', name: 'Shadow Taunt' },
        { id: 'do-better', file: 'do better.mp3', name: 'Do Better' },
        { id: 'get-out', file: 'get out.mp3', name: 'Get Out' }
      ],
      'Reactions': [
        { id: 'nice-shot', file: 'nice shot.mp3', name: 'Nice Shot' },
        { id: 'omg', file: 'omg.mp3', name: 'OMG' },
        { id: 'mama-mia', file: 'mama mia.mp3', name: 'Mama Mia' },
        { id: 'looking-cool', file: 'looking cool.mp3', name: 'Looking Cool' },
        { id: 'let-me-know', file: 'let me know.mp3', name: 'Let Me Know' },
        { id: 'hurry-up', file: 'hurry up.mp3', name: 'Hurry Up' }
      ],
      'Funny': [
        { id: 'fart', file: 'fart.mp3', name: 'Fart' },
        { id: 'meow', file: 'meow.mp3', name: 'Meow' },
        { id: 'gobble', file: 'gobble.mp3', name: 'Gobble' },
        { id: 'weee', file: 'weee.mp3', name: 'Weee' },
        { id: 'goofy-car', file: 'goofy car.mp3', name: 'Goofy Car' },
        { id: 'dance-moves', file: 'dance moves.mp3', name: 'Dance Moves' }
      ],
      'Aggressive': [
        { id: 'bastardo', file: 'bastardo.mp3', name: 'Bastardo' },
        { id: 'dogshit', file: 'dogshit.mp3', name: 'Dogshit' },
        { id: 'dont-f-with-me', file: 'dont f with me.mp3', name: 'Don\'t F With Me' },
        { id: 'annoy', file: 'annoy.mp3', name: 'Annoy' },
        { id: 'yelling', file: 'yelling.mp3', name: 'Yelling' },
        { id: 'porco', file: 'porco.mp3', name: 'Porco' }
      ],
      'Sound Effects': [
        { id: 'boom', file: 'boom sound.mp3', name: 'Boom' },
        { id: 'kaboom', file: 'kaboom.mp3', name: 'Kaboom' },
        { id: 'pew-pew', file: 'pew pew.mp3', name: 'Pew Pew' },
        { id: 'tung-tung', file: 'tung tung.mp3', name: 'Tung Tung' },
        { id: 'linganguli', file: 'linganguli.mp3', name: 'Linganguli' }
      ],
      'Misc': [
        { id: 'byeya', file: 'byeya.mp3', name: 'Bye Ya' },
        { id: 'did-you-pray', file: 'did you pray.mp3', name: 'Did You Pray' },
        { id: 'facetta', file: 'facetta.mp3', name: 'Facetta' },
        { id: 'movie', file: 'movie.mp3', name: 'Movie' },
        { id: 'noo-la-polizia', file: 'noo la polizia.mp3', name: 'Noo La Polizia' },
        { id: 'porn', file: 'porn.mp3', name: 'Porn' },
        { id: 'drmundo', file: 'drmundo.mp3', name: 'Dr Mundo' },
        { id: 'singed', file: 'singed.mp3', name: 'Singed' },
        { id: 'subaru', file: 'subaru.mp3', name: 'Subaru' }
      ]
    };

    // Create flat map for quick access
    this.soundMap = new Map();
    Object.values(this.soundCategories).forEach(category => {
      category.forEach(sound => {
        this.soundMap.set(sound.id, sound);
      });
    });

    console.log(`🎵 TauntService initialized with ${this.soundMap.size} sounds`);
    this.isInitialized = true;
  }

  /**
   * Check if player can send a taunt (cooldown check)
   */
  canSendTaunt() {
    const now = Date.now();
    const timeSinceLastTaunt = now - this.lastTauntTime;
    return timeSinceLastTaunt >= this.cooldownDuration;
  }

  /**
   * Get remaining cooldown time in seconds
   */
  getRemainingCooldown() {
    if (this.canSendTaunt()) return 0;
    const now = Date.now();
    const remaining = this.cooldownDuration - (now - this.lastTauntTime);
    return Math.ceil(remaining / 1000);
  }

  /**
   * Play a taunt sound locally
   */
  async playTaunt(soundId) {
    try {
      const sound = this.soundMap.get(soundId);
      if (!sound) {
        console.error(`🎵 Sound not found: ${soundId}`);
        return false;
      }

      // Stop any currently playing taunt
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      }

      // Create and play new audio
      const audioPath = `/assets/sounds/${sound.file}`;
      this.currentAudio = new Audio(audioPath);
      this.currentAudio.volume = 0.7; // Reasonable volume

      await this.currentAudio.play();
      console.log(`🎵 Playing taunt: ${sound.name}`);

      return true;
    } catch (error) {
      console.error(`🎵 Error playing taunt ${soundId}:`, error);
      return false;
    }
  }

  /**
   * Send a taunt (updates cooldown)
   */
  sendTaunt(soundId) {
    if (!this.canSendTaunt()) {
      console.warn(`🎵 Taunt on cooldown. ${this.getRemainingCooldown()}s remaining`);
      return false;
    }

    this.lastTauntTime = Date.now();
    console.log(`🎵 Taunt sent: ${soundId}`);
    return true;
  }

  /**
   * Get all sound categories for UI
   */
  getSoundCategories() {
    return this.soundCategories;
  }

  /**
   * Get sound info by ID
   */
  getSoundInfo(soundId) {
    return this.soundMap.get(soundId);
  }

  /**
   * Stop any currently playing taunt
   */
  stopCurrentTaunt() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }
}

// Export singleton instance
const tauntService = new TauntService();
export default tauntService;
