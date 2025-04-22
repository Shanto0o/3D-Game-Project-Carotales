export default class AudioManager {
    constructor(scene) {
      this.scene = scene;
      this.sounds = new Map();
    }

    async load(key, url, options = {}) {
      return new Promise((resolve, reject) => {
        if (this.sounds.has(key)) return resolve();
        const sound = new BABYLON.Sound(key, url, this.scene, () => {
          this.sounds.set(key, sound);
          resolve();
        }, options, (msg, err) => {
          console.error(`AudioManager: échec chargement ${key}`, err);
          reject(err);
        });
      });
    }
  
    async play(key, url = null) {
      if (!this.sounds.has(key)) {
        if (!url) {
          console.warn(`AudioManager: son "${key}" inconnu et pas d'URL fournie`);
          return;
        }
        await this.load(key, url, { autoplay: false, volume: 0.8 });
      }
      const snd = this.sounds.get(key);
      snd.play();
    }
  }
  
