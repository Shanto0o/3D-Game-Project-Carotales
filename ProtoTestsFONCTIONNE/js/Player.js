export default class Player {
    constructor(scene) {
      this.scene = scene;
      // Création du mesh de collision (capsule)
      this.mesh = BABYLON.MeshBuilder.CreateCapsule("playerCollision", { diameter: 2, height: 2 }, scene);
      this.mesh.position.y = 10;
      this.speed = 0.3;
  
      // Propriétés pour le saut et la gravité
      this.jumpSpeed = 0.35;
      this.gravity = 0.009;
      this.velocityY = 0;
      this.isJumping = false;
  
      // Définir un ellipsoïde de collision pour mieux gérer le glissement sur des pentes
      this.mesh.ellipsoid = new BABYLON.Vector3(1, 1, 1);
      this.mesh.ellipsoidOffset = new BABYLON.Vector3(0, 1, 0);
      this.mesh.checkCollisions = true;
      // Rendre la capsule invisible
      this.mesh.isVisible = false;
  
      // Bounding box pour la détection d'objets à portée
      this.pickupBox = BABYLON.MeshBuilder.CreateBox("pickupBox", { size: 5 }, scene);
      this.pickupBox.isVisible = false;
      this.pickupBox.parent = this.mesh;
  
      // Importation du modèle 3D du lapin et parentage pour suivre la capsule
      BABYLON.SceneLoader.ImportMesh("", "images/", "bunny.glb", scene, (meshes) => {
        meshes.forEach(mesh => {
          // Clone le matériau pour éviter de modifier la référence originale
          if (mesh.material) {
            mesh.material = mesh.material.clone(mesh.material.name + "_inst");
          }
          // Parentage du mesh au collision mesh pour suivre automatiquement position et rotation
          mesh.parent = this.mesh;
          // Ajustement de l'échelle et remise à l'origine locale
          mesh.scaling = new BABYLON.Vector3(4, 4, -4);
          mesh.position = BABYLON.Vector3.Zero();
          mesh.rotation = BABYLON.Vector3.Zero();
        });
      });
    }
  
    jump() {
      if (!this.isJumping) {
        this.velocityY = this.jumpSpeed;
        this.isJumping = true;
      }
    }
  
    update() {
      // Mouvement vertical (gravité)
      this.mesh.position.y += this.velocityY;
      this.velocityY -= this.gravity;
  
      // Détection du sol via un rayon
      const ray = new BABYLON.Ray(this.mesh.position, new BABYLON.Vector3(0, -1, 0), 10);
      const pickInfo = this.scene.pickWithRay(ray, m => m.checkCollisions && m !== this.mesh);
      if (pickInfo.hit) {
        const groundY = pickInfo.pickedPoint.y + 1; // offset hauteur du joueur
        if (this.mesh.position.y < groundY) {
          this.mesh.position.y = groundY;
          this.velocityY = 0;
          this.isJumping = false;
        }
      }
    }
  
    move(inputStates, camera) {
      // Calcul des vecteurs avant et droite
      const forward = camera.getForwardRay().direction.clone();
      forward.y = 0;
      forward.normalize();
      const speed = 0.13;
      const movement = new BABYLON.Vector3();
  
      // Rotation fluide vers la direction de déplacement
      const targetAngle = Math.atan2(forward.x, forward.z);
      this.mesh.rotation.y = BABYLON.Scalar.Lerp(this.mesh.rotation.y, targetAngle, 0.1);
  
      if (inputStates.up)    movement.addInPlace(forward.scale(speed));
      if (inputStates.down)  movement.addInPlace(forward.scale(-speed));
      const right = new BABYLON.Vector3(forward.z, 0, -forward.x);
      if (inputStates.left)  movement.addInPlace(right.scale(-speed));
      if (inputStates.right) movement.addInPlace(right.scale(speed));
      if (inputStates.jump)  this.jump();
  
      // Déplacement horizontal avec collisions
      this.mesh.moveWithCollisions(new BABYLON.Vector3(movement.x, 0, movement.z));
      // Mise à jour verticale
      this.update();
    }

    
  }
  
