// js/Player.js
export default class Player {
  constructor(scene) {
    this.scene = scene;
    // Collision capsule
    this.mesh = BABYLON.MeshBuilder.CreateCapsule("playerCollision", { diameter: 2, height: 2 }, scene);
    this.mesh.position.y = 10;
    this.mesh.scaling = new BABYLON.Vector3(4, 4, 4);
    this.speed = 0.3;

    // Saut / gravité
    this.jumpSpeed = 0.19;
    this.gravity = 0.0035;
    this.velocityY = 0;
    this.isJumping = false;
    this.currentSpeedMult = 1;

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
      "", "images/", "bunny_animation.glb", scene,
      (meshes, particleSystems, skeletons, animationGroups) => {
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
          mesh.parent = this.mesh;
          mesh.scaling = new BABYLON.Vector3(4, 4, -4);
          mesh.position = BABYLON.Vector3.Zero();
          mesh.rotation = BABYLON.Vector3.Zero();
        });
      }
    );
  }

  jump() {
    if (!this.isJumping) {
      this.velocityY = this.jumpSpeed;
      this.isJumping = true;

      // Play jump animation once
      this.currentAnim?.stop();
      this.animationGroups.jump?.play(false);
      this.currentAnim = this.animationGroups.jump;

      // Pour forcer un nouveau départ de la marche après atterrissage
      this.isWalking = false;
    }
  }

  update() {
    // Appliquer la gravité
    this.mesh.position.y += this.velocityY;
    this.velocityY -= this.gravity;

    // Détection du sol et atterrissage
    const ray = new BABYLON.Ray(this.mesh.position, new BABYLON.Vector3(0, -1, 0), 10);
    const pickInfo = this.scene.pickWithRay(ray, m => m.checkCollisions && m !== this.mesh);
    if (pickInfo.hit) {
      const groundY = pickInfo.pickedPoint.y + 1;
      if (this.mesh.position.y < groundY) {
        // On a touché le sol
        this.mesh.position.y = groundY;
        this.velocityY = 0;
        if (this.isJumping) {
          // Atterrissage : repasser en idle
          this.isJumping = false;
          this.currentAnim?.stop();
          this.animationGroups.idle?.play(true);
          this.currentAnim = this.animationGroups.idle;
          this.isWalking = false;
        }
      }
    }
  }

  move(inputStates, camera) {
    // 0) Mettre à jour physique / gestion atterrissage avant de décider des anims
    this.update();

    // 1) Calculer forward & right à partir de la caméra
    const forward = camera.getForwardRay().direction.clone();
    forward.y = 0; forward.normalize();
    const right = new BABYLON.Vector3(forward.z, 0, -forward.x);

    // 2) Construire le vecteur de mouvement selon les entrées
    const speed = 0.13 * this.currentSpeedMult;
    const movement = new BABYLON.Vector3();
    if (inputStates.up)    movement.addInPlace(forward.scale(speed));
    if (inputStates.down)  movement.addInPlace(forward.scale(-speed));
    if (inputStates.left)  movement.addInPlace(right.scale(-speed));
    if (inputStates.right) movement.addInPlace(right.scale(speed));
    if (inputStates.jump)  this.jump();

    // 3) Orientation du joueur si on bouge
    if (movement.lengthSquared() > 0.0001) {
      const targetAngle = Math.atan2(-movement.x, -movement.z);
      this.mesh.rotation.y = BABYLON.Scalar.Lerp(
        this.mesh.rotation.y,
        targetAngle,
        0.1
      );
    }

    // 4) Gestion des animations walk/idle (uniquement si on n’est pas en l’air)
    if (!this.isJumping) {
      const isMoving = movement.lengthSquared() > 0.0001;
      if (isMoving && !this.isWalking) {
        this.currentAnim?.stop();
        this.animationGroups.walk?.play(true);
        this.currentAnim = this.animationGroups.walk;
        this.isWalking = true;
      } else if (!isMoving && this.isWalking) {
        this.currentAnim?.stop();
        this.animationGroups.idle?.play(true);
        this.currentAnim = this.animationGroups.idle;
        this.isWalking = false;
      }
    }

    // 5) Appliquer le déplacement horizontal avec collisions
    this.mesh.moveWithCollisions(new BABYLON.Vector3(
      movement.x, 0, movement.z
    ));
  }
}
