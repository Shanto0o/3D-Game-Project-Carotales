// js/Enemy.js
export default class Enemy {
  /**
   * @param {BABYLON.Scene} scene
   * @param {BABYLON.Vector3[]} path   Tableau de waypoints à suivre
   * @param {number} speed             Vitesse de déplacement horizontal
   * @param {number} detectionRange    Portée de détection du joueur
   */
  constructor(scene, path, speed = 0.1, detectionRange = 10) {
    this.scene = scene;
    this.path = path;
    this.speed = speed;
    this.range = detectionRange;
    this.state = 'PATROL';       // états : PATROL, CHASE, RETURN
    this.currentWaypoint = 0;
    this.startPos = path[0].clone();

    // Gravité et physique
    this.gravity = 0.009;
    this.velocityY = 0;
    this.voidThreshold = -5;
    this.frozen = false;

    // 1) Boîte de collision invisible
    this.mesh = BABYLON.MeshBuilder.CreateBox(
      'enemyCollider', { size: 2 }, scene
    );
    this.mesh.isVisible = false;
    this.mesh.checkCollisions = true;
    this.mesh.ellipsoid = new BABYLON.Vector3(1, 1, 1);
    this.mesh.ellipsoidOffset = new BABYLON.Vector3(0, 1, 0);
    this.mesh.position.copyFrom(this.startPos);

    // 2) TransformNode pour positionner et scaler le modèle
    this.model = new BABYLON.TransformNode('enemyModel', scene);
    this.model.parent = this.mesh;
    // Centrer et échelle globale du modèle
    this.model.position = BABYLON.Vector3.Zero();
    this.model.scaling = new BABYLON.Vector3(1,1,1);

    // 3) Import du modèle glTF (bee.glb)
    BABYLON.SceneLoader.ImportMesh(
      '',           // importer tous les meshes
      'images/',    // dossier contenant bee.glb
      'bee.glb',    // nom du fichier
      scene,
      (meshes) => {
        // Parent uniquement les meshes racines pour conserver leur transform local
        meshes.forEach(m => {
          if (!m.parent) {
            m.parent = this.model;
          }
        });
      }
    );
  }

  /**
   * Gèle l'ennemi pendant une durée (ms)
   */
  freeze(duration = 5000) {
    if (this.frozen) return;
    this.frozen = true;
    const savedSpeed = this.speed;
    this.speed = 0;
    setTimeout(() => {
      this.frozen = false;
      this.speed = savedSpeed;
    }, duration);
  }

  /**
   * Mise à jour chaque frame
   * @param {Player} player
   */
  update(player) {
    if (this.frozen) return;

    // Gravité Y
    this.mesh.position.y += this.velocityY;
    this.velocityY -= this.gravity;
    if (this.mesh.position.y < this.voidThreshold) {
      this.dispose();
      return;
    }

    // Détection du sol
    const ray = new BABYLON.Ray(
      this.mesh.position,
      new BABYLON.Vector3(0, -1, 0),
      5
    );
    const pick = this.scene.pickWithRay(ray, m => m.checkCollisions);
    if (pick.hit) {
      const groundY = pick.pickedPoint.y + 1;
      if (this.mesh.position.y < groundY) {
        this.mesh.position.y = groundY;
        this.velocityY = 0;
      }
    }

    // Calcul de la distance au joueur
    const toPlayer = player.mesh.position.subtract(this.mesh.position);
    const dist = toPlayer.length();

    // États PATROL ↔ CHASE ↔ RETURN
    if (dist < this.range && this.state !== 'CHASE') {
      this.state = 'CHASE';
    } else if (this.state === 'CHASE' && dist >= this.range) {
      this.mesh.position.copyFrom(this.startPos);
      this.currentWaypoint = 0;
      this.state = 'PATROL';
      this.velocityY = 0;
      return;
    }

    // Détermination de la direction
    let dir;
    if (this.state === 'PATROL') {
      const target = this.path[this.currentWaypoint];
      dir = target.subtract(this.mesh.position).normalize();
      if (BABYLON.Vector3.Distance(this.mesh.position, target) < 0.5) {
        this.currentWaypoint = (this.currentWaypoint + 1) % this.path.length;
      }
    } else if (this.state === 'CHASE') {
      dir = toPlayer.normalize();
    } else if (this.state === 'RETURN') {
      const target = this.path[this.currentWaypoint];
      dir = target.subtract(this.mesh.position).normalize();
      if (BABYLON.Vector3.Distance(this.mesh.position, target) < 0.5) {
        this.state = 'PATROL';
      }
    }

    // Mouvement horizontal + rotation
    if (dir) {
      const move = dir.scale(this.speed);
      this.mesh.moveWithCollisions(new BABYLON.Vector3(move.x, 0, move.z));
      this.mesh.rotation.y = Math.atan2(move.x, move.z);
    }
  }

  /**
   * Nettoyage du mesh et du modèle
   */
  dispose() {
    this.model.dispose();
    this.mesh.dispose();
    this._dead = true;
  }
}
