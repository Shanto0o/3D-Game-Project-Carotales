import Enemy from './Enemy.js';

export default class EnemiesManager {
  constructor(scene) {
    this.scene = scene;
    this.enemies = [];
  }


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

  updateAll(player) {
    this.enemies = this.enemies.filter(e => !e._dead);
    this.enemies.forEach(e => e.update(player));
  }

  resetAll() {
    this.enemies.forEach(e => {
      if (typeof e.reset === 'function') {
        e.reset();
      }
    });
  }
}
