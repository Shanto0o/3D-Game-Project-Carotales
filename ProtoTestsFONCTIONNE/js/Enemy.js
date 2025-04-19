// js/Enemy.js

export default class Enemy {
  /**
   * @param {BABYLON.Scene} scene 
   * @param {BABYLON.Vector3[]} path  Tableau de waypoints à suivre
   * @param {number} speed      Vitesse de déplacement horizontal
   * @param {number} detectionRange  Portée de détection du joueur
   */
  constructor(scene, path, speed = 0.1, detectionRange = 10) {
    this.scene = scene;
    this.path = path;
    this.speed = speed;
    this.range  = detectionRange;
    this.state  = 'PATROL';       // états : PATROL, CHASE, RETURN
    this.currentWaypoint = 0;

    this.startPos = path[0].clone();

    // propriétés pour la gravité
    this.gravity   = 0.009;
    this.velocityY = 0;

    // seuil sous lequel on considère que l'ennemi est tombé
    this.voidThreshold = -5;

    this.frozen = false;       // <<< pour geler l'ennemi

    // création du mesh (simple boîte rouge)
    this.mesh = BABYLON.MeshBuilder.CreateBox(
      'enemy', { size: 2 }, scene
    );
    const mat = new BABYLON.StandardMaterial('matE', scene);
    mat.diffuseColor = new BABYLON.Color3(1, 0, 0);
    this.mesh.material = mat;

    // position initiale au premier waypoint
    this.mesh.position.copyFrom(path[0]);
    this.mesh.ellipsoid = new BABYLON.Vector3(1, 1, 1);
    this.mesh.ellipsoidOffset = new BABYLON.Vector3(0, 1, 0);
    this.mesh.checkCollisions = true;
  }

  freeze(duration = 5000) {        // <<< NEW
    if (this.frozen) return;       // déjà figé
    this.frozen = true;
    let currentspeed = this.speed; // sauvegarde de la vitesse courante
    this.speed = 0;               // on fige l'ennemi

    setTimeout(() => {             // auto‑dégel
      this.frozen = false;
      this.speed = currentspeed;  // on remet la vitesse d'origine
    }, duration);
  }
  

  /**
   * @param {Player} player 
   */
  update(player) {
    if (this.frozen) return;
    const pos = this.mesh.position;
    const playerPos = player.mesh.position;
    const toPlayer = playerPos.subtract(pos);
    const dist = toPlayer.length();

    // gestion de la chute
    this.mesh.position.y += this.velocityY;
    this.velocityY -= this.gravity;
    if (this.mesh.position.y < this.voidThreshold) {
      this.dispose();
      return;
    }
    // détection sol pour réinitialiser la gravité si posé
    const ray = new BABYLON.Ray(
      this.mesh.position, new BABYLON.Vector3(0, -1, 0), 5
    );
    const pick = this.scene.pickWithRay(ray, m => m.checkCollisions);
    if (pick.hit) {
      const groundY = pick.pickedPoint.y + 1;
      if (this.mesh.position.y < groundY) {
        this.mesh.position.y = groundY;
        this.velocityY = 0;
      }
    }

    // changement d'état
    if (dist < this.range && this.state !== 'CHASE') {
      this.state = 'CHASE';
    } else if (this.state === 'CHASE' && dist >= this.range) {
        // on perd l'aggro : on respawn à la position de départ
        this.mesh.position.copyFrom(this.startPos);
        this.currentWaypoint = 0;
        this.state = 'PATROL';
        this.velocityY = 0;
        // on sort de la fonction pour éviter tout mouvement supplémentaire
        return;
      }

    // comportement selon l'état
    let target, dir;
    if (this.state === 'PATROL') {
      target = this.path[this.currentWaypoint];
      dir = target.subtract(pos).normalize();
      // si on est proche du waypoint, on passe au suivant
      if (BABYLON.Vector3.Distance(pos, target) < 0.5) {
        this.currentWaypoint = (this.currentWaypoint + 1) % this.path.length;
      }
    }
    else if (this.state === 'CHASE') {
      dir = toPlayer.normalize();
    }
    else if (this.state === 'RETURN') {
      target = this.path[this.currentWaypoint];
      dir = target.subtract(pos).normalize();
      // si on retrouve le waypoint, on repasse en PATROL
      if (BABYLON.Vector3.Distance(pos, target) < 0.5) {
        this.state = 'PATROL';
      }
    }

    // appliquer le déplacement horizontal
    if (dir) {
      const move = dir.scale(this.speed);
      this.mesh.moveWithCollisions(new BABYLON.Vector3(
        move.x, 0, move.z
      ));
      // rotation face à la direction du mouvement
      this.mesh.rotation.y = Math.atan2(move.x, move.z);
    }
  }

  dispose() {
    this.mesh.dispose();
    this._dead = true;
  }
}
