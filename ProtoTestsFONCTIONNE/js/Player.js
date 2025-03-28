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
      
      // Rendre le mesh de collision invisible tout en conservant ses collisions
      this.mesh.isVisible = false;

      // Création du Bounding Box pour la détection d'objets à portée
      this.pickupBox = BABYLON.MeshBuilder.CreateBox("pickupBox", { size: 5 }, scene);
      this.pickupBox.isVisible = false;
      this.pickupBox.parent = this.mesh;

      // Importation du modèle 3D glb pour le Player depuis le dossier "images"
      // On ne le parentera pas directement au mesh de collision pour éviter qu'il hérite de l'invisibilité.
      this.playerModel = null;
      BABYLON.SceneLoader.ImportMesh("", "images/", "bunny.glb", scene, (meshes) => {
          this.playerModel = meshes[0];
          // Positionnement initial du modèle en synchronisation avec le mesh de collision
          this.playerModel.scaling = new BABYLON.Vector3(4, 4, -4);  
          this.playerModel.position = this.mesh.position.clone();
          this.playerModel.rotation = this.mesh.rotation.clone();
      });
  }

  jump() {
      if (!this.isJumping) {
          this.velocityY = this.jumpSpeed;
          this.isJumping = true;
      }
  }

  update() {
      // Mise à jour du mouvement vertical
      this.mesh.position.y += this.velocityY;
      this.velocityY -= this.gravity;

      // Raycast pour détecter le sol ou une plateforme
      let ray = new BABYLON.Ray(this.mesh.position, new BABYLON.Vector3(0, -1, 0), 10);
      let pickInfo = this.scene.pickWithRay(ray, (mesh) => {
          return mesh.checkCollisions && mesh !== this.mesh;
      });

      if (pickInfo && pickInfo.hit) {
          let groundY = pickInfo.pickedPoint.y;
          let offset = 1; // Ajustez cet offset selon la taille du joueur
          let targetY = groundY + offset;
          
          if (this.mesh.position.y < targetY) {
              this.mesh.position.y = targetY;
              this.velocityY = 0;
              this.isJumping = false;
          }
      }

      // Synchroniser le modèle avec le mesh de collision
      if (this.playerModel) {
          this.playerModel.position.copyFrom(this.mesh.position);
          this.playerModel.rotation.copyFrom(this.mesh.rotation);
      }
  }

  move(inputStates, camera) {
      let forward = camera.getForwardRay().direction;
      forward.y = 0;
      forward.normalize();

      // Réduire la vitesse pour des déplacements plus lents
      let speed = 0.13;
      let movement = new BABYLON.Vector3(0, 0, 0);

      // Calcul de l'angle cible pour une rotation fluide du joueur
      let targetAngle = Math.atan2(forward.x, forward.z);
      this.mesh.rotation.y = BABYLON.Scalar.Lerp(this.mesh.rotation.y, targetAngle, 0.1);

      if (inputStates.up) {
          movement.addInPlace(forward.scale(speed));
      }
      if (inputStates.down) {
          movement.addInPlace(forward.scale(-speed));
      }

      let right = new BABYLON.Vector3(forward.z, 0, -forward.x);
      if (inputStates.left) movement.addInPlace(right.scale(-speed));
      if (inputStates.right) movement.addInPlace(right.scale(speed));

      if (inputStates.jump) {
          this.jump();
      }

      // Déplacement horizontal avec collisions
      this.mesh.moveWithCollisions(new BABYLON.Vector3(movement.x, 0, movement.z));

      // Mise à jour verticale (gravité et saut)
      this.update();
  }
}
