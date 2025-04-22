// js/Player.js
export default class Player {
  constructor(scene) {
    this.scene = scene;
    // Collision capsule
    this.mesh = BABYLON.MeshBuilder.CreateCapsule("playerCollision", { diameter: 2, height: 0.5 }, scene);
    this.mesh.position.y = 10;
    this.mesh.scaling = new BABYLON.Vector3(4, 4, 4);
    this.speed = 12.0;
    this.speedMult = 1.0;    // ← nouveau
    this.am = null;


    this.debugFly = false;  // ← nouveau
   
    this.controller = new BABYLON.PhysicsCharacterController(this.mesh.position, {capsuleHeight: 2, capsuleRadius: 0.5}, scene);
    this.orientation = BABYLON.Quaternion.Identity();

    // Saut / gravité
    this.wantJump = 0;
    this.jumpSpeed = 10.0;
    this.jumpHeight = 7.0;
    this.gravity = new BABYLON.Vector3(0, -30, 0);
    this.state = "ON_GROUND"; // ON_GROUND, IN_AIR, START_JUMP

    this.inputDirection = new BABYLON.Vector3(0, 0, 0);
    this.forwardLocalSpace = new BABYLON.Vector3(0, 0, 1);

    // Collisions capsule
    this.mesh.ellipsoid = new BABYLON.Vector3(1, 1, 1);
    this.mesh.ellipsoidOffset = new BABYLON.Vector3(0, 1, 0);
    this.mesh.checkCollisions = true;
    this.mesh.isVisible = false;

    // Zone de ramassage
    this.pickupBox = BABYLON.MeshBuilder.CreateBox("pickupBox", { size: 5 }, scene);
    this.pickupBox.isVisible = false;
    this.pickupBox.parent = this.mesh;

    // Stockage des animations
    this.animationGroups = {
      idle: null,
      walk: null,
      jump: null
    };
    this.isWalking = false;

    // Importer le lapin animé
    BABYLON.SceneLoader.ImportMesh(
      "", "images/", "bunny.glb", scene,
      (meshes, particleSystems, skeletons, animationGroups) => {
        console.log(animationGroups)
        animationGroups.forEach(ag => {
          if (ag.name === "walk.1")       this.animationGroups.walk = ag;
          else if (ag.name === "aucun.2") this.animationGroups.idle = ag;
          else if (ag.name === "jump.1")  this.animationGroups.jump = ag;
        });
        // Lancer l’animation idle par défaut
        if (this.animationGroups.idle) {
          this.animationGroups.idle.play(true);
          this.currentAnim = this.animationGroups.idle;
        }

        // Parentage et ajustements
        meshes.forEach(mesh => {
          if (mesh.material) {
            mesh.material = mesh.material.clone(mesh.material.name + "_inst");
          }
          // ** Ombres ** : reçoit et projette
          mesh.receiveShadows = true;
          mesh.parent = this.mesh;
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

  
    // State handling
    // depending on character state and support, set the new state
    getNextState(supportInfo) {
      if (this.debugFly && this.wantJump > 0) {
        this.wantJump--;
        return "START_JUMP";
      }
      if (this.state == "IN_AIR") {
        // Atterrissage : repasser en idle
        this.isJumping = false;
        if (!(this.currentAnim.name == "jump.1")) {
          this.currentAnim?.stop();
          this.animationGroups.idle?.play(true);
          this.currentAnim = this.animationGroups.idle;
          this.isWalking = false;
        }
        if (supportInfo.supportedState == BABYLON.CharacterSupportedState.SUPPORTED) {
          return "ON_GROUND";
        }
        return "IN_AIR";
      } else if (this.state == "ON_GROUND") {
        if (supportInfo.supportedState != BABYLON.CharacterSupportedState.SUPPORTED) {
          return "IN_AIR";
        }

        if (this.wantJump > 0) {
          this.wantJump--;
          return "START_JUMP";
        }
        return "ON_GROUND";
      } else if (this.state == "START_JUMP") {
        // Play jump animation once
        this.currentAnim?.stop();
        this.animationGroups.jump?.play(false);
        this.currentAnim = this.animationGroups.jump;
        this.am.play("jump");

        return "IN_AIR";
      }
    }

    // From aiming direction and state, compute a desired velocity
    // That velocity depends on current state (in air, on ground, jumping, ...) and surface properties
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
          // Restore to original vertical component
          outputVelocity.addInPlace(upWorld.scale(-outputVelocity.dot(upWorld)));
          outputVelocity.addInPlace(upWorld.scale(currentVelocity.dot(upWorld)));
          // Add gravity
          outputVelocity.addInPlace(this.gravity.scale(deltaTime));
          return outputVelocity;
      } else if (this.state == "ON_GROUND") {
        let surfaceVelocity = supportInfo.averageSurfaceVelocity;

        if (supportInfo.supportedMesh
        ) {
          
          surfaceVelocity = supportInfo.supportedMesh.userVelocity;
        }




        let desiredVelocity = this.inputDirection
    .scale(this.speed * this.speedMult)
    .applyRotationQuaternion(this.orientation);
    
        // Si aucune entrée et surface se déplace, on veut matcher sa vitesse
        if (this.inputDirection.lengthSquared() === 0 && supportInfo.averageSurfaceVelocity) {
            desiredVelocity = supportInfo.averageSurfaceVelocity.clone();
        }
    
        let outputVelocity = this.controller.calculateMovement(
          deltaTime,
          forwardWorld,
          supportInfo.averageSurfaceNormal,
          currentVelocity,
          surfaceVelocity,
          desiredVelocity,
          upWorld
        );
    
        // Application d’une friction douce : va vers la vitesse de la surface si pas d’entrée
        if (this.inputDirection.lengthSquared() === 0) {
            const blendFactor = 0.9; // friction (plus haut = plus collant)
            outputVelocity = BABYLON.Vector3.Lerp(outputVelocity, supportInfo.averageSurfaceVelocity, blendFactor);
        }
    
        
        // Projection horizontale
        outputVelocity.subtractInPlace(surfaceVelocity);

        const inv1k = 1e-3;
        if (outputVelocity.dot(upWorld) > inv1k) {
          let velLen = outputVelocity.length();
          outputVelocity.normalizeFromLength(velLen);

          let horizLen = velLen / supportInfo.averageSurfaceNormal.dot(upWorld);

          let c = supportInfo.averageSurfaceNormal.cross(outputVelocity);
          outputVelocity = c.cross(upWorld);
          outputVelocity.scaleInPlace(horizLen);
        }

        outputVelocity.addInPlace(surfaceVelocity);
        return outputVelocity;
    }
     else if (this.state == "START_JUMP") {
        
        let u = Math.sqrt(2 * this.gravity.length() * this.jumpHeight);
        let curRelVel = currentVelocity.dot(upWorld);
        return currentVelocity.add(upWorld.scale(u - curRelVel));
      }
      return Vector3.Zero();
    }

  move(inputStates, camera) {
    
    // Construire le vecteur de mouvement selon les entrées
    this.inputDirection = new BABYLON.Vector3(0,0,0);
    if (inputStates.up)    {this.inputDirection.z += Math.sin(Math.PI*2 - camera.alpha); this. inputDirection.x += Math.cos(Math.PI - camera.alpha);}
    if (inputStates.down)  {this.inputDirection.z += Math.cos(Math.PI/2 - camera.alpha); this.inputDirection.x += Math.sin(Math.PI/2 - camera.alpha);}
    if (inputStates.left)  {this. inputDirection.z += Math.cos(3*Math.PI - camera.alpha); this.inputDirection.x += Math.sin(3*Math.PI - camera.alpha);}
    if (inputStates.right) {this. inputDirection.z += Math.cos(Math.PI*2 - camera.alpha); this.inputDirection.x += Math.sin(Math.PI*2 - camera.alpha);}
    if (inputStates.jump)  this.wantJump ++;
    

    // Orientation du joueur si on bouge
    const isMoving = this.inputDirection.lengthSquared() > 0.0001;
    if (isMoving) {
      const targetAngle = Math.atan2(-this.inputDirection.x, -this.inputDirection.z);
      this.mesh.rotation.y = BABYLON.Scalar.Lerp(
        this.mesh.rotation.y,
        targetAngle,
        0.2
      );
    }
    // Gestion des animations walk/idle (uniquement si on est au sol)
    if (this.state == "ON_GROUND") {
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
