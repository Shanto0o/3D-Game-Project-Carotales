// js/AudioManager.js
export default class AudioManager {
    constructor(scene) {
      this.scene = scene;
      this.sounds = new Map();
    }
  
    /**
     * Charge un son et le stocke sous la clé `key`.
     * @param {string} key     Identifiant unique du son
     * @param {string} url     Chemin vers le fichier audio
     * @param {object} options Options Babylon.Sound (autoplay, loop, volume…)
     * @returns {Promise<void>}
     */
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
  
    /**
     * Joue un son déjà chargé sous la clé `key`.
     * Si le son n’est pas encore chargé, on le charge à la volée puis on le joue.
     * @param {string} key
     * @param {string} [url]   URL si jamais non chargé
     */
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
  
