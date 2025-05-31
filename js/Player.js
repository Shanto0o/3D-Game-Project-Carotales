export default class Player {
  constructor(scene, opts, cheat) {
    this.scene = scene;
    this.mesh = BABYLON.MeshBuilder.CreateCapsule("playerCollision", { diameter: 2, height: 0.5 }, scene);
    this.mesh.position.y = 3;
    this.mesh.scaling = new BABYLON.Vector3(4, 4, 4);
    this.speed = 16;
    this.speedMult = 1.0;
    this.am = null;

    // Footstep particles
    this._footTimer = 0;
    this._stepInterval = 0.3; // seconds between steps

    this.footstepPS = new BABYLON.ParticleSystem("footstep", 20, scene);
    this.footstepPS.particleTexture = new BABYLON.Texture("images/dust.png", scene);
    // lifetime and size
    this.footstepPS.minLifeTime = 0.2;
    this.footstepPS.maxLifeTime = 0.5;
    this.footstepPS.minSize = 0.05;
    this.footstepPS.maxSize = 0.1;
    // manual emission
    this.footstepPS.emitRate = 0;
    this.footstepPS.manualEmitCount = 0;
    // colors
    this.footstepPS.color1 = new BABYLON.Color4(0.8, 0.8, 0.8, 1);
    this.footstepPS.color2 = new BABYLON.Color4(0.5, 0.5, 0.5, 1);
    // directions
    this.footstepPS.direction1 = new BABYLON.Vector3(-1, 0.2, -1);
    this.footstepPS.direction2 = new BABYLON.Vector3(1, 0.2, 1);
    // start for manual emit
    this.footstepPS.start();

    this.debugFly = cheat;

    this.accessoriesConfig = opts.accessoriesConfig ?? opts;

    // map des catégories
    this.accessoryCategory = {
      Couronne: "Tete", Anneau: "Tete", Perruque: "Tete",
      Nez:      "Visage",
      Aile:    "Dos",
      Chaussure: "Pieds",
      SacCarotte: "Dos",
      LunCarottes: "Yeux",
      Lunettes: "Yeux",
      guirCar : "Oreilles",
      guirNoel : "Oreilles",
      bouclesOreilles : "Oreilles",
      // …
    };
    this.categories = ["Tete", "Visage", "Dos","Pieds","Yeux","Oreilles"];

    this.controller = new BABYLON.PhysicsCharacterController(
      this.mesh.position,
      { capsuleHeight: 2, capsuleRadius: 0.5 },
      scene
    );
    this.orientation = BABYLON.Quaternion.Identity();

    this.wantJump = 0;
    this.jumpSpeed = 10.0;
    this.jumpHeight = 7.0;
    this.gravity = new BABYLON.Vector3(0, -30, 0);
    this.state = "ON_GROUND";
    // after this.state = "ON_GROUND";
    this._suppCount = 0;
    this._unsuppCount = 0;
    this._SUPP_THRESHOLD = 1;
    this._UNSUPP_THRESHOLD = 4;

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
      jump: null,
    };
    this.isWalking = false;

    BABYLON.SceneLoader.ImportMesh(
      "",
      "images/",
      "Accessoire.glb",
      scene,
      (meshes, particleSystems, skeletons, animationGroups) => {
        console.log(animationGroups);
        animationGroups.forEach(ag => ag.stop());

        this.hideAllAccessories(meshes);

        meshes.forEach((mesh) => {

          const baseName = mesh.name.split("_")[0];

          Object.entries(this.accessoriesConfig).forEach(([name, enabled]) => {
          if (mesh.name === name || baseName === name) {
            console.log(`Activating accessory: ${mesh.name}`);
                        mesh.isVisible = enabled;
          }
        });
        });
        

        animationGroups.forEach((ag) => {
          console.log("Animation group:", ag.name);
          if (ag.name === "walktest") {
            console.log("Found walk animation group : ", ag.name);
            this.animationGroups.walk = ag;
          }
          else if (ag.name === "Idle") {
            console.log("Found idle animation group : ", ag.name);
            this.animationGroups.idle = ag;
          }
          else if (ag.name === "RealJump") {
            console.log("Found jump animation group : ", ag.name);
            this.animationGroups.jump = ag;
          }
        
          else if (ag.name === "coup") {
            console.log("Found coup animation group : ", ag.name);
            this.animationGroups.coup = ag;
          }
          else if (ag.name === "boule") {
            console.log("Found boule animation group : ", ag.name);
            this.animationGroups.boule = ag;
          }
        });
        if (this.animationGroups.idle) {
          this.animationGroups.idle.play(true);
          this.currentAnim = this.animationGroups.idle;
        } 

        meshes.forEach((mesh) => {
          console.log("Player mesh:", mesh.name);
          if (mesh.name === "__root__") {
            if (mesh.material) {
              mesh.material = mesh.material.clone(mesh.material.name + "_inst");
            }
            mesh.parent = this.mesh;
            shadowGen.addShadowCaster(mesh);
            mesh.scaling = new BABYLON.Vector3(0.5, 0.5, -0.5);
            mesh.position = new BABYLON.Vector3(0, -0.25, 0);
          }
        });
      }
    );
  }

  hideAllAccessories(meshes) {
    this.categories.forEach(cat => {
      Object.entries(this.accessoryCategory)
        .filter(([, c]) => c === cat)
        .forEach(([name]) => {
          meshes
            .filter(m => m.name.startsWith(name))
            .forEach(m => m.isVisible = false);
        });
    });
  }

  setAccessoriesConfig(config) {
    this.accessoriesConfig = config;
    this.updateAccessoriesVisibility();
  }

  updateAccessoriesVisibility() {
    // cache tout d’abord (au cas où on réappelle plusieurs fois)
    this.hideAllAccessories(this.scene.meshes);

    // affiche ceux marqués à true
    Object.entries(this.accessoriesConfig).forEach(([name, enabled]) => {
      if (!enabled) return;
      this.scene.meshes
        .filter(m => m.name.startsWith(name))
        .forEach(m => m.isVisible = true);
    });
  }

  reset_position(scene, level) {
    if (level === 3) {
      this.controller.setPosition(new BABYLON.Vector3(10,10,10));
    }
    else {
      this.controller.setPosition(new BABYLON.Vector3(0, 10, 0));
    }
    console.log("reset_position");
  }

  getNextState(supportInfo) {
    const SUPPORTED = BABYLON.CharacterSupportedState.SUPPORTED;
    const isSupp = supportInfo.supportedState === SUPPORTED;

    if (isSupp) {
      this._suppCount++;
      this._unsuppCount = 0;
    } else {
      this._unsuppCount++;
      this._suppCount = 0;
    }

    if (this.state === "IN_AIR") {
      if (this.debugFly || this._unsuppCount < this._UNSUPP_THRESHOLD * 10) {
        if (this.wantJump > 0) {
          this.wantJump--;
          return (this.state = "START_JUMP");
        }
      }
      if (this._suppCount >= this._SUPP_THRESHOLD) {
        return (this.state = "ON_GROUND");
      }
      return "IN_AIR";
    }

    if (this.state === "ON_GROUND") {
      if (this._unsuppCount >= this._UNSUPP_THRESHOLD) {
        return (this.state = "IN_AIR");
      }
      if (this.wantJump > 0) {
        this.wantJump--;
        return (this.state = "START_JUMP");
      }
      return "ON_GROUND";
    }

    if (this.state === "START_JUMP") {
      this.currentAnim?.stop();
      this.animationGroups.jump?.play(false);
      this.currentAnim = this.animationGroups.jump;
      this.am.play("jump");
      return (this.state = "IN_AIR");
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
      let desiredVelocity = this.inputDirection
        .scale(this.jumpSpeed)
        .applyRotationQuaternion(this.orientation);
      let outputVelocity = this.controller.calculateMovement(
        deltaTime,
        forwardWorld,
        upWorld,
        currentVelocity,
        BABYLON.Vector3.ZeroReadOnly,
        desiredVelocity,
        upWorld
      );
      outputVelocity.addInPlace(upWorld.scale(-outputVelocity.dot(upWorld)));
      outputVelocity.addInPlace(upWorld.scale(currentVelocity.dot(upWorld)));
      outputVelocity.addInPlace(this.gravity.scale(deltaTime));
      return outputVelocity;
    } else if (this.state === "ON_GROUND") {
      const footPos = this.mesh.position.clone().addInPlace(new BABYLON.Vector3(0, -1, 0));
      const ray = new BABYLON.Ray(footPos, BABYLON.Vector3.Down(), 0.6);
      const pick = this.scene.pickWithRay(ray, (m) => m.name === "movingPlatform");

      let platformVel = BABYLON.Vector3.Zero();
      if (pick.hit && pick.pickedMesh.userVelocity) {
        platformVel = pick.pickedMesh.userVelocity.clone();
      }

      const inputVel = this.inputDirection.lengthSquared() > 0
        ? this.inputDirection
            .scale(this.speed * this.speedMult)
            .applyRotationQuaternion(this.orientation)
        : BABYLON.Vector3.Zero();

      if (inputVel.lengthSquared() > 0) {
        return inputVel;
      } else {
        return platformVel;
      }
    } else if (this.state == "START_JUMP") {
      let u = Math.sqrt(2 * this.gravity.length() * this.jumpHeight);
      let curRelVel = currentVelocity.dot(upWorld);
      return currentVelocity.add(upWorld.scale(u - curRelVel));
    }
    return BABYLON.Vector3.Zero();
  }

  move(inputStates, camera) {
    const forward = new BABYLON.Vector3(-Math.cos(camera.alpha), 0, -Math.sin(camera.alpha));
    const right = new BABYLON.Vector3(-Math.sin(camera.alpha), 0, Math.cos(camera.alpha));

    const v = (inputStates.up ? 1 : 0) - (inputStates.down ? 1 : 0);
    const h = (inputStates.right ? 1 : 0) - (inputStates.left ? 1 : 0);

    this.inputDirection = forward.scale(v).add(right.scale(h));
    if (inputStates.jump) {
      this.wantJump++;
    }

    const isMoving = this.inputDirection.lengthSquared() > 0.0001;
    if (isMoving) {
      this.inputDirection.normalize();
      const targetAngle = Math.atan2(-this.inputDirection.x, -this.inputDirection.z);
      let delta = (targetAngle - this.mesh.rotation.y + Math.PI) % (2 * Math.PI) - Math.PI;
      this.mesh.rotation.y += delta * 0.2;
    }

    if (this.state === "ON_GROUND") {
      if (isMoving && this.currentAnim.name !== "walktest") {
        this.currentAnim?.stop();
        this.animationGroups.walk?.play(true);
        this.currentAnim = this.animationGroups.walk;
        this.isWalking = true;
      } else if (!isMoving && this.currentAnim.name !== "Idle") {
        this.currentAnim?.stop();
        this.animationGroups.idle?.play(true);
        this.currentAnim = this.animationGroups.idle;
        this.isWalking = false;
      }
    }

    // Footstep dust particles
    const dt = this.scene.getEngine().getDeltaTime() / 1000;
    if (this.isWalking && this.state === "ON_GROUND") {
      this._footTimer += dt;
      if (this._footTimer >= this._stepInterval) {
        this._footTimer = 0;
        const footPos = this.mesh.position.clone().add(new BABYLON.Vector3(0, -1, 0));
        this.footstepPS.emitter = footPos;
        this.footstepPS.manualEmitCount = 15;
      }
    } else {
      this._footTimer = 0;
    }
  }
}
