// js/Enemy.js


export default class Enemy {
  /**
   * @param {BABYLON.Scene} scene
   * @param {BABYLON.Vector3[]} path   Waypoints array
   * @param {number} speed             Units moved per physics tick (≈0.1)
   * @param {number} detectionRange    Detection radius
   */
  constructor(scene, path, speed = 0.1, detectionRange = 10) {
    this.scene = scene;
    this.path = path;
    this.speed = speed;
    this.range = detectionRange;
    this.state = 'PATROL';
    this.currentWaypoint = 0;
    this.startPos = path[0].clone();
    this.frozen = false;
    this.voidThreshold = -5;

    // Invisible collider
    this.mesh = BABYLON.MeshBuilder.CreateBox('enemyCollider', { size: 2 }, scene);
    this.mesh.isVisible = false;
    this.mesh.position.copyFrom(this.startPos);

    // Visual model node
    this.model = new BABYLON.TransformNode('enemyModel', scene);
    this.model.parent = this.mesh;
    this.model.position = BABYLON.Vector3.Zero();
    this.model.scaling = new BABYLON.Vector3(1, 1, 1);
    BABYLON.SceneLoader.ImportMesh('', 'images/', 'bee.glb', scene, meshes => {
      meshes.forEach(m => {
        if (!m.parent) m.parent = this.model;
      });
    });

    // Kinematic physics for Havok
    this.aggregate = new BABYLON.PhysicsAggregate(
      this.mesh,
      BABYLON.PhysicsShapeType.BOX,
      { mass: 0 }, // kinematic body
      scene
    );
    this.aggregate.body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);
  }

  /**
   * Temporarily freeze movement
   */
  freeze(duration = 5000) {
    if (this.frozen) return;
    this.frozen = true;
    // Passe la physique en STATIC pour bloquer toute interpolation kinematique
    this.aggregate.body.setMotionType(BABYLON.PhysicsMotionType.STATIC);
    setTimeout(() => {
      this.frozen = false;
      // On remet en ANIMATED pour reprendre la patrouille ou la poursuite
      this.aggregate.body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);
    }, duration);
  }

  /**
   * Called each physics step
   * @param {Player} player
   */
  update(player) {
    // If frozen, keep the target transform locked at current position & rotation
    if (this.frozen) {
      const pos = this.mesh.position.clone();
      const rot = this.mesh.rotationQuaternion ?? BABYLON.Quaternion.Identity();
      this.aggregate.body.setTargetTransform(pos, rot);
      return;
    }

    // Dispose if fallen too low
    if (this.mesh.position.y < this.voidThreshold) {
      this.dispose();
      return;
    }

    // Check player distance
    const toPlayer = player.mesh.position.subtract(this.mesh.position);
    const dist = toPlayer.length();
    if (dist < this.range) {
      this.state = 'CHASE';
    } else if (this.state === 'CHASE' && dist >= this.range) {
      this.state = 'PATROL';
      this.currentWaypoint = 0;
    }

    // Determine movement direction
    let dir = null;
    if (this.state === 'PATROL') {
      const target = this.path[this.currentWaypoint];
      dir = target.subtract(this.mesh.position).normalize();
      if (BABYLON.Vector3.Distance(this.mesh.position, target) < 0.5) {
        this.currentWaypoint = (this.currentWaypoint + 1) % this.path.length;
      }
    } else if (this.state === 'CHASE') {
      dir = toPlayer.normalize();
    }

    // Move via kinematic target transform, then orient mesh
    if (dir) {
      const move = dir.scale(this.speed);
      const newPos = this.mesh.position.add(move);

      // Ensure the body is active
      if (this.aggregate.body.wakeUp) {
        this.aggregate.body.wakeUp();
      }

      // Move collider
      this.aggregate.body.setTargetTransform(
        newPos,
        this.mesh.rotationQuaternion ?? BABYLON.Quaternion.Identity()
      );

      // Face movement direction: compute yaw and apply quaternion
      const yaw = Math.atan2(dir.x, dir.z);
      this.mesh.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(0, yaw, 0);
    }
  }

  /** Clean up */
  dispose() {
    this.model.dispose();
    this.mesh.dispose();
    this.aggregate.dispose();
    this._dead = true;
  }

  reset() {
    // Remet la position collider au point de spawn
    this.mesh.position.copyFrom(this.startPos);

    // Réinitialise la cible de patrouille
    this.currentWaypoint = 0;
    this.state = 'PATROL';

    // Pour le corps kinematic Havok : on fixe directement la transform
    if (this.aggregate && this.aggregate.body.setTargetTransform) {
      this.aggregate.body.setTargetTransform(
        this.startPos.clone(),
        this.mesh.rotationQuaternion ?? BABYLON.Quaternion.Identity()
      );
    }
  }
}
