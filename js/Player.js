export default class Player {
  constructor(scene) {
    this.scene = scene;
    this.mesh = BABYLON.MeshBuilder.CreateCapsule("playerCollision", { diameter: 2, height: 0.5 }, scene);
    this.mesh.position.y = 3;
    this.mesh.scaling = new BABYLON.Vector3(4, 4, 4);
    this.speed = 12;
    this.speedMult = 1.0; 
    this.am = null;


    this.debugFly = false; 
   
    this.controller = new BABYLON.PhysicsCharacterController(this.mesh.position, {capsuleHeight: 2, capsuleRadius: 0.5}, scene);
    this.orientation = BABYLON.Quaternion.Identity();

    this.wantJump = 0;
    this.jumpSpeed = 10.0;
    this.jumpHeight = 7.0;
    this.gravity = new BABYLON.Vector3(0, -30, 0);
    this.state = "ON_GROUND";
    // Après this.state = "ON_GROUND";
this._suppCount = 0;
this._unsuppCount = 0;
this._SUPP_THRESHOLD = 3;    // nombre de frames pour valider "on ground"
this._UNSUPP_THRESHOLD = 3;  // nombre de frames pour valider "in air"

    this.inputDirection = new BABYLON.Vector3(0, 0, 0);
    this.forwardLocalSpace = new BABYLON.Vector3(0, 0, 1);

    this.mesh.ellipsoid = new BABYLON.Vector3(1, 1, 1);
    this.mesh.ellipsoidOffset = new BABYLON.Vector3(0, 1, 0);
    this.mesh.checkCollisions = true;
    this.mesh.isVisible = false;

    const shadowGen = this.scene._shadowGenerator;
    shadowGen.addShadowCaster(this.mesh);

    this.pickupBox = BABYLON.MeshBuilder.CreateBox("pickupBox", { size: 5 }, scene);
    this.pickupBox.isVisible = false;
    this.pickupBox.parent = this.mesh;

    this.animationGroups = {
      idle: null,
      walk: null,
      jump: null
    };
    this.isWalking = false;

    BABYLON.SceneLoader.ImportMesh(
      "", "images/", "bunny.glb", scene,
      (meshes, particleSystems, skeletons, animationGroups) => {
        console.log(animationGroups)
        animationGroups.forEach(ag => {
          if (ag.name === "walk.1")       this.animationGroups.walk = ag;
          else if (ag.name === "aucun.2") this.animationGroups.idle = ag;
          else if (ag.name === "jump.1")  this.animationGroups.jump = ag;
        });
        if (this.animationGroups.idle) {
          this.animationGroups.idle.play(true);
          this.currentAnim = this.animationGroups.idle;
        }

        meshes.forEach(mesh => {
          if (mesh.material) {
            mesh.material = mesh.material.clone(mesh.material.name + "_inst");
          }
          mesh.parent = this.mesh;
          shadowGen.addShadowCaster(mesh);
          mesh.scaling = new BABYLON.Vector3(4, 4, -4);
          mesh.position = BABYLON.Vector3.Zero();
          mesh.rotation = BABYLON.Vector3.Zero();
        });
      }
    );
  }



  reset_position(scene) {
    this.controller.setPosition(new BABYLON.Vector3(0, 10, 0));
    console.log("reset_position");
  }

  
    getNextState(supportInfo) {
  const SUPPORTED = BABYLON.CharacterSupportedState.SUPPORTED;
  const isSupp   = supportInfo.supportedState === SUPPORTED;

  // 1) Mise à jour des compteurs
  if (isSupp) {
    this._suppCount++;
    this._unsuppCount = 0;
  } else {
    this._unsuppCount++;
    this._suppCount = 0;
  }

  // 2) Transition selon l’hystérésis
  if (this.state === "IN_AIR") {
    if (this.debugFly) {
      if (this.wantJump > 0) {
      this.wantJump--;
      return this.state = "START_JUMP";
    }}

    // Si on est “dans les airs” et qu’on a X frames de sol stable, on remet au sol
    if (this._suppCount >= this._SUPP_THRESHOLD) {
      return this.state = "ON_GROUND";
    }
    return "IN_AIR";
  }

  if (this.state === "ON_GROUND") {
    // Si on est “au sol” et qu’on a X frames sans sol, on décolle
    if (this._unsuppCount >= this._UNSUPP_THRESHOLD) {
      return this.state = "IN_AIR";
    }
    // Sinon, gestion du jump
    if (this.wantJump > 0) {
      this.wantJump--;
      return this.state = "START_JUMP";
    }
    return "ON_GROUND";
  }

  // START_JUMP inchangé
  if (this.state === "START_JUMP") {
    this.currentAnim?.stop();
    this.animationGroups.jump?.play(false);
    this.currentAnim = this.animationGroups.jump;
    this.am.play("jump");
    return this.state = "IN_AIR";
  }
}


    getDesiredVelocity(deltaTime, supportInfo, currentVelocity) {
      let nextState = this.getNextState(supportInfo);
      if (nextState != this.state) {
          this.state = nextState;
      }

      let upWorld = this.gravity.normalizeToNew();
      upWorld.scaleInPlace(-1.0);
      let forwardWorld = this.forwardLocalSpace.applyRotationQuaternion(this.orientation);
      if (this.state == "IN_AIR") {
          let desiredVelocity = this.inputDirection.scale(this.jumpSpeed).applyRotationQuaternion(this.orientation);
          let outputVelocity = this.controller.calculateMovement(deltaTime, forwardWorld, upWorld, currentVelocity, BABYLON.Vector3.ZeroReadOnly, desiredVelocity, upWorld);
          outputVelocity.addInPlace(upWorld.scale(-outputVelocity.dot(upWorld)));
          outputVelocity.addInPlace(upWorld.scale(currentVelocity.dot(upWorld)));
          outputVelocity.addInPlace(this.gravity.scale(deltaTime));
          return outputVelocity;
      }else if (this.state === "ON_GROUND") {
  // 1) Raycast sous les pieds pour récupérer la plateforme
  const footPos = this.mesh.position.clone().addInPlace(new BABYLON.Vector3(0, -1, 0));
  const ray     = new BABYLON.Ray(footPos, BABYLON.Vector3.Down(), 0.6);
  const pick    = this.scene.pickWithRay(ray, m => m.name === "movingPlatform");

  // 2) Récupère sa vélocité (userVelocity)
  let platformVel = BABYLON.Vector3.Zero();
  if (pick.hit && pick.pickedMesh.userVelocity) {
    platformVel = pick.pickedMesh.userVelocity.clone();
  }

  // 3) Calcule ta vélocité d'input
  const inputVel = this.inputDirection.lengthSquared() > 0
    ? this.inputDirection
        .scale(this.speed * this.speedMult)
        .applyRotationQuaternion(this.orientation)
    : BABYLON.Vector3.Zero();

  // 4) Si tu bouges, renvoie seulement inputVel.
  //    Sinon, renvoie exactement platformVel.
  if (inputVel.lengthSquared() > 0) {
    return inputVel;
  } else {
    return platformVel;
  }
}else if (this.state == "START_JUMP") {

    let u = Math.sqrt(2 * this.gravity.length() * this.jumpHeight);
    let curRelVel = currentVelocity.dot(upWorld);
        return currentVelocity.add(upWorld.scale(u - curRelVel));
      }
      return Vector3.Zero();
    }

  move(inputStates, camera) {
  // 1) Vecteurs forward & right relatifs à la caméra
  const forward = new BABYLON.Vector3(
    -Math.cos(camera.alpha),
    0,
    -Math.sin(camera.alpha)
  );
  const right = new BABYLON.Vector3(
    -Math.sin(camera.alpha),
    0,
    Math.cos(camera.alpha)
  );

  // 2) Lecture des entrées (avant/arrière = v, droite/gauche = h)
  const v = (inputStates.up    ? 1 : 0) - (inputStates.down  ? 1 : 0);
  const h = (inputStates.right ? 1 : 0) - (inputStates.left  ? 1 : 0);

  // 3) Construction du vecteur de direction et gestion du saut
  this.inputDirection = forward.scale(v).add(right.scale(h));
  if (inputStates.jump) {
    this.wantJump++;
  }

  const isMoving = this.inputDirection.lengthSquared() > 0.0001;
  if (isMoving) {
    this.inputDirection.normalize();
    // 4) Calcul de l'angle cible pour faire face à la direction de déplacement
    const targetAngle = Math.atan2(
      -this.inputDirection.x,
      -this.inputDirection.z
    );
    // 5) Interpolation cyclique (plus court chemin)
    let delta = (targetAngle - this.mesh.rotation.y + Math.PI) % (2 * Math.PI) - Math.PI;
    this.mesh.rotation.y += delta * 0.2;
  }

  // 6) Gestion des animations au sol
  if (this.state === "ON_GROUND") {
    if (isMoving && this.currentAnim.name !== "walk.1") {
      this.currentAnim?.stop();
      this.animationGroups.walk?.play(true);
      this.currentAnim = this.animationGroups.walk;
      this.isWalking = true;
    } else if (!isMoving && this.currentAnim.name !== "aucun.2") {
      this.currentAnim?.stop();
      this.animationGroups.idle?.play(true);
      this.currentAnim = this.animationGroups.idle;
      this.isWalking = false;
    }
  }
}


}
