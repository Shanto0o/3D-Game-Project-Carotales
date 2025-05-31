// MoutonsManager.js
import Mouton from './Mouton.js';       

export default class MoutonsManager {
  constructor(scene, audioManager, caveBounds) {
    this.scene = scene;
    this.am = audioManager;
    this.bounds = caveBounds; // { min: Vector3, max: Vector3 }
    this.moutons = [];
  }

  createMoutons(configs) {
    configs.forEach(cfg => {
      const m = new Mouton(
        this.scene,
        cfg.path,
        cfg.speed,
        cfg.range,
        this.am,
        this.bounds
      );
      this.moutons.push(m);
    });
  }

  updateAll(player) {
    this.moutons = this.moutons.filter(m => !m._dead);
    this.moutons.forEach(m => m.update(player));
  }

  resetAll() {
    this.moutons.forEach(m => m.reset());
  }
}
