// js/EnemiesManager.js
import Enemy from './Enemy.js';

export default class EnemiesManager {
  constructor(scene) {
    this.scene = scene;
    this.enemies = [];
  }

  /**
   * @param {Array<{path: BABYLON.Vector3[], speed?:number, range?:number}>} configs 
   */
  createEnemies(configs) {
    configs.forEach(cfg => {
      const e = new Enemy(
        this.scene,
        cfg.path,
        cfg.speed,
        cfg.range
      );
      this.enemies.push(e);
    });
  }

  /**
   * À appeler chaque frame dans votre render-loop
   * @param {Player} player 
   */
  updateAll(player) {
    this.enemies = this.enemies.filter(e => !e._dead);
    this.enemies.forEach(e => e.update(player));
  }
}
