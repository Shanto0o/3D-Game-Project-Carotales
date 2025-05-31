export default class Mouton {
  /**
   * @param {BABYLON.Scene} scene
   * @param {BABYLON.Vector3[]} path            // waypoints
   * @param {number} speed
   * @param {number} detectionRange
   * @param {AudioManager} audioManager
   * @param {{min: BABYLON.Vector3, max: BABYLON.Vector3}} caveBounds
   */
  constructor(scene, path, speed = 0.05, detectionRange = 10, audioManager, caveBounds) {
    this.scene = scene;
    this.path = path;
    this.speed = speed;
    this.range = detectionRange;
    this.am = audioManager;

    // Normalize cave bounds so min always has the smallest components
    const { min, max } = caveBounds;
    this.caveBounds = {
      min: new BABYLON.Vector3(
        Math.min(min.x, max.x),
        Math.min(min.y, max.y),
        Math.min(min.z, max.z)
      ),
      max: new BABYLON.Vector3(
        Math.max(min.x, max.x),
        Math.max(min.y, max.y),
        Math.max(min.z, max.z)
      )
    };

    this.state = 'PATROL';
    this.currentWaypoint = 0;
    this.startPos = path[0].clone();
    this.frozen = false;
    this.voidThreshold = -5;
    this._dead = false;
    

    // Collider mesh
    this.mesh = BABYLON.MeshBuilder.CreateBox('sheepCollider', { size: 2 }, scene);
    this.mesh.isVisible = false;
    this.mesh.position.copyFrom(this.startPos);

    // Physics & shadows
    const shadowGen = this.scene._shadowGenerator;
    shadowGen.addShadowCaster(this.mesh);
    this.aggregate = new BABYLON.PhysicsAggregate(
      this.mesh,
      BABYLON.PhysicsShapeType.BOX,
      { mass: 0 },
      scene
    );
    this.aggregate.body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);

    // Visible model
    this.model = new BABYLON.TransformNode('sheepModel', scene);
    this.model.parent = this.mesh;
    this.model.position = BABYLON.Vector3.Zero();
    BABYLON.SceneLoader.ImportMesh(
  '', 
  'images/', 
  'mouton.glb', 
  scene, 
  (meshes, particleSystems, skeletons, animationGroups) => {
    // Ajout des ombres et collisions comme avant
    meshes.forEach(m => {
      shadowGen.addShadowCaster(m);
      m.checkCollisions = true;
      if (!m.parent) m.parent = this.model;
    });
    this.model.rotation.y = Math.PI / 2;

    // On cherche l'animation "Run" et on la démarre en boucle
    const runGroup = animationGroups.find(g => g.name === 'Run');
    if (runGroup) {
      runGroup.start(true);   // true => loop
    } else {
      console.warn('Animation "Run" introuvable');
    }
  }
);
  }

  update(player) {
    if (this._dead) return;

    // if frozen, keep in place
    if (this.frozen) {
      const pos = this.mesh.position.clone();
      const rot = this.mesh.rotationQuaternion ?? BABYLON.Quaternion.Identity();
      this.aggregate.body.setTargetTransform(pos, rot);
      return;
    }

    // fall detection
    if (this.mesh.position.y < this.voidThreshold) {
      this.dispose();
      return;
    }

    // distance to player
    const toPlayer = player.mesh.position.subtract(this.mesh.position);
    const dist = toPlayer.length();
    const oldState = this.state;

    // state transitions
    if (this.state === 'PATROL' && dist < this.range) {
      this.state = 'CHASE';
    } else if (this.state === 'CHASE' && dist >= this.range) {
      this.state = 'PATROL';
      this.currentWaypoint = 0; // reset path
    }

    // sound transitions
    if (this.am && this.state !== oldState) {
      const bg = this.scene.getSoundByName('BackgroundMusic');
      if (this.state === 'PATROL') {
        const angry = this.am.sounds.get('angry');
        if (angry) angry.stop();
        if (bg && !bg.isPlaying) bg.play();
      } else if (this.state === 'CHASE') {
        if (bg && bg.isPlaying) bg.pause();
        this.am.play('trigger');
        const angry = this.am.sounds.get('angry');
        if (angry && !angry.isPlaying) angry.play();
      }
    }

    // determine movement direction
    let dir = null;
    if (this.state === 'PATROL') {
      const target = this.path[this.currentWaypoint];
      dir = target.subtract(this.mesh.position).normalize();
      if (BABYLON.Vector3.Distance(this.mesh.position, target) < 0.5) {
        this.currentWaypoint = (this.currentWaypoint + 1) % this.path.length;
      }
    } else if (this.state === 'CHASE') {
  // on ignore la composante Y pour ne pas monter/descendre
  dir = new BABYLON.Vector3(toPlayer.x, 0, toPlayer.z).normalize();
}

    if (dir) {
  const move = dir.scale(this.speed);
  // on ne change que X et Z, on garde la Y en l'état
  const newPos = this.mesh.position.add(move);
  newPos.y = this.mesh.position.y;

  // on ne borne plus que X et Z
  newPos.x = Math.min(Math.max(newPos.x, this.caveBounds.min.x), this.caveBounds.max.x);
  newPos.z = Math.min(Math.max(newPos.z, this.caveBounds.min.z), this.caveBounds.max.z);

  const newRot = BABYLON.Quaternion.FromEulerAngles(
    0,
    Math.atan2(dir.x, dir.z),
    0
  );

  this.aggregate.body.setTargetTransform(newPos, newRot);
  this.mesh.rotationQuaternion = newRot;
}
  }

  freeze(duration = 5000) {
    if (this.frozen) return;
    this.frozen = true;
    this.aggregate.body.setMotionType(BABYLON.PhysicsMotionType.STATIC);
    // ... particle effect code unchanged ...
    setTimeout(() => {
      this.frozen = false;
      this.aggregate.body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);
    }, duration);
  }

  dispose() {
    if (this._dead) return;
    this._dead = true;
    this.model.dispose();
    this.mesh.dispose();
    this.aggregate.dispose();
  }

  reset() {
    this._dead = false;
    this.mesh.position.copyFrom(this.startPos);
    this.currentWaypoint = 0;
    this.state = 'PATROL';
    this.aggregate.body.setTargetTransform(
      this.startPos.clone(),
      this.mesh.rotationQuaternion ?? BABYLON.Quaternion.Identity()
    );
  }
}
