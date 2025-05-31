// AudioManager.js  
export default class AudioManager {
  constructor(scene) {
    this.scene = scene;
    // Map<key, BABYLON.Sound>
    this.sounds = new Map();
    // Map<key, number> : volume de base (tel que passé dans options.volume)
    this.baseVolumes = new Map();
    // multiplicateur global pour tous les effets (0.0 à 1.0)
    this.effectMultiplier = 1.0;
  }

  /**
   * Charge un son et le conserve dans this.sounds.
   * options.volume est facultatif ; s’il est absent, Babylon.js utilisera 1.0 par défaut.
   * On stocke dans baseVolumes la valeur du volume de base pour ce key.
   */
  async load(key, url, options = {}) {
    return new Promise((resolve, reject) => {
      if (this.sounds.has(key)) {
        // Si déjà chargé, on met à jour la baseVolumes si nécessaire et on résout
        const existingBase = this.baseVolumes.get(key);
        const newBase = (options.volume !== undefined) ? options.volume : existingBase;
        if (newBase !== existingBase) {
          this.baseVolumes.set(key, newBase);
          // Et on réapplique l’effet actuel sur ce son pour que le niveau soit cohérent
          const snd = this.sounds.get(key);
          snd.setVolume(newBase * this.effectMultiplier);
        }
        return resolve();
      }

      // On crée le nouveau son
      const sound = new BABYLON.Sound(
        key,
        url,
        this.scene,
        () => {
          // Dès que le son est chargé :
          // 1) on enregistre le son dans la map
          this.sounds.set(key, sound);

          // 2) on détermine le volume de base : si options.volume est défini, on l’utilise,
          //    sinon on lit sound.getVolume() (qui vaut généralement 1.0 par défaut).
          const baseVol = (options.volume !== undefined) ? options.volume : sound.getVolume();
          this.baseVolumes.set(key, baseVol);

          // 3) on applique immédiatement l’effet global (au cas où effectMultiplier ≠ 1.0)
          sound.setVolume(baseVol * this.effectMultiplier);

          resolve();
        },
        options,
        (msg, err) => {
          console.error(`AudioManager: échec chargement « ${key} »`, err);
          reject(err);
        }
      );
    });
  }

  /**
   * Joue un son déjà chargé (ou le charge puis le joue si besoin).
   * @param {string} key — identifiant du son
   * @param {?string} url — URL pour recharger si key inconnu
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

  /**
   * Définit le multiplicateur global pour tous les effets.
   * Chaque son enregistré verra son volume recalculé en baseVolumes.get(key) * multiplier.
   * @param {number} multiplier — valeur entre 0 et 1
   */
  setEffectVolume(multiplier) {
    this.effectMultiplier = multiplier;
    for (const [key, sound] of this.sounds.entries()) {
      const baseVol = this.baseVolumes.get(key) ?? sound.getVolume();
      sound.setVolume(baseVol * this.effectMultiplier);
    }
  }

  /**
   * (Optionnel) Méthode pour récupérer la valeur courante du multiplicateur
   */
  getEffectVolume() {
    return this.effectMultiplier;
  }
}
