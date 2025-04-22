
export default class Enemy {

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

    this.mesh = BABYLON.MeshBuilder.CreateBox('enemyCollider', { size: 2 }, scene);
    this.mesh.isVisible = false;
    this.mesh.position.copyFrom(this.startPos);

    this.model = new BABYLON.TransformNode('enemyModel', scene);
    this.model.parent = this.mesh;
    this.model.position = BABYLON.Vector3.Zero();
    this.model.scaling = new BABYLON.Vector3(1, 1, 1);
    BABYLON.SceneLoader.ImportMesh('', 'images/', 'bee.glb', scene, meshes => {
      meshes.forEach(m => {
        m.receiveShadows = true;

        if (!m.parent) m.parent = this.model;
      });
    });

    this.aggregate = new BABYLON.PhysicsAggregate(
      this.mesh,
      BABYLON.PhysicsShapeType.BOX,
      { mass: 0 },
      scene
    );
    this.aggregate.body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);
  }


  freeze(duration = 5000) {
    if (this.frozen) return;
    this.frozen = true;
    this.aggregate.body.setMotionType(BABYLON.PhysicsMotionType.STATIC);
  
    const emitter = new BABYLON.TransformNode("freezeEmitter", this.scene);
    emitter.parent = this.mesh;
    emitter.position = new BABYLON.Vector3(0, -0.5, 0);
  
    const ps = new BABYLON.ParticleSystem("freezePS", 800, this.scene);
    ps.particleTexture = new BABYLON.Texture("images/flare.png", this.scene);
  
    const box = new BABYLON.BoxParticleEmitter();
    box.minEmitBox = new BABYLON.Vector3(-3, 0, -3);
    box.maxEmitBox = new BABYLON.Vector3(3, 1.5, 3);
    ps.particleEmitterType = box;
  
    ps.color1     = new BABYLON.Color4(0.0, 0.5, 1.0, 1.0);
    ps.color2     = new BABYLON.Color4(0.0, 0.3, 0.8, 0.8);
    ps.colorDead  = new BABYLON.Color4(0.0, 0.0, 0.2, 0.0);
  
    ps.minSize      = 0.3;
    ps.maxSize      = 0.6;
    ps.minLifeTime  = 0.5;
    ps.maxLifeTime  = 1.2;
    ps.emitRate     = 600;
    ps.direction1   = new BABYLON.Vector3(-0.5, 1.5, -0.5);
    ps.direction2   = new BABYLON.Vector3(0.5, 2.0, 0.5);
    ps.minEmitPower = 1;
    ps.maxEmitPower = 4;
    ps.updateSpeed  = 0.02;
  
    ps.emitter = emitter;
    ps.start();
  
    setTimeout(() => {
      ps.stop();
      setTimeout(() => {
        ps.dispose();
        emitter.dispose();
      }, 1000);
      this.frozen = false;
      this.aggregate.body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);
    }, duration);
  }


  update(player) {
    if (this.frozen) {
      const pos = this.mesh.position.clone();
      const rot = this.mesh.rotationQuaternion ?? BABYLON.Quaternion.Identity();
      this.aggregate.body.setTargetTransform(pos, rot);
      return;
    }

    if (this.mesh.position.y < this.voidThreshold) {
      this.dispose();
      return;
    }

    const toPlayer = player.mesh.position.subtract(this.mesh.position);
    const dist = toPlayer.length();
    if (dist < this.range) {
      this.state = 'CHASE';
    } else if (this.state === 'CHASE' && dist >= this.range) {
      this.state = 'PATROL';
      this.currentWaypoint = 0;
    }

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

    if (dir) {
      const move = dir.scale(this.speed);
      const newPos = this.mesh.position.add(move);

      if (this.aggregate.body.wakeUp) {
        this.aggregate.body.wakeUp();
      }

      this.aggregate.body.setTargetTransform(
        newPos,
        this.mesh.rotationQuaternion ?? BABYLON.Quaternion.Identity()
      );

      const yaw = Math.atan2(dir.x, dir.z);
      this.mesh.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(0, yaw, 0);
    }
  }

  dispose() {
    this.model.dispose();
    this.mesh.dispose();
    this.aggregate.dispose();
    this._dead = true;
  }

  reset() {
    this.mesh.position.copyFrom(this.startPos);

    this.currentWaypoint = 0;
    this.state = 'PATROL';

    if (this.aggregate && this.aggregate.body.setTargetTransform) {
      this.aggregate.body.setTargetTransform(
        this.startPos.clone(),
        this.mesh.rotationQuaternion ?? BABYLON.Quaternion.Identity()
      );
    }
  }
}
