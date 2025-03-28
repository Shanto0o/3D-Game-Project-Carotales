export default class Player {
    constructor(scene) {
        this.scene = scene;
        this.mesh = BABYLON.MeshBuilder.CreateCylinder("player", { diameter: 2, height: 2 }, scene);
        this.mesh.position.y = 1;
        this.speed = 0.3;

        // Propriétés pour le saut
        this.jumpSpeed = 0.3;    // Force du saut
        this.gravity = 0.01;     // Gravité appliquée
        this.velocityY = 0;      // Vitesse verticale actuelle
        this.isJumping = false;  // Indique si le joueur est en train de sauter

        // Création du Bounding Box pour la portée de récupération
        this.pickupBox = BABYLON.MeshBuilder.CreateBox("pickupBox", { size: 5 }, scene);
        this.pickupBox.isVisible = false;
        this.pickupBox.parent = this.mesh;
    }

    jump() {
        if (!this.isJumping) {
            this.velocityY = this.jumpSpeed;
            this.isJumping = true;
        }
    }

    update() {
        // Mise à jour de la position verticale
        if (this.isJumping) {
            this.mesh.position.y += this.velocityY;
            this.velocityY -= this.gravity;

            // Si le joueur touche le sol, réinitialiser la position et les variables de saut
            if (this.mesh.position.y <= 1) {
                this.mesh.position.y = 1;
                this.isJumping = false;
                this.velocityY = 0;
            }
        }
    }

    move(inputStates, camera) {
        let forward = camera.getForwardRay().direction;
        forward.y = 0;
        forward.normalize();

        let speed = 0.2;
        let movement = new BABYLON.Vector3(0, 0, 0);

        if (inputStates.up) {
            this.mesh.rotation.y = Math.atan2(forward.x, forward.z);
            movement.addInPlace(forward.scale(speed));
        }
        if (inputStates.down) {
            this.mesh.rotation.y = Math.atan2(forward.x, forward.z) + Math.PI;
            movement.addInPlace(forward.scale(-speed));
        }

        let right = new BABYLON.Vector3(forward.z, 0, -forward.x);
        if (inputStates.left) movement.addInPlace(right.scale(-speed));
        if (inputStates.right) movement.addInPlace(right.scale(speed));

        // Détection du saut via inputStates.jump
        if (inputStates.jump) {
            this.jump();
        }

        // Déplacement horizontal avec collisions (le mouvement vertical est géré séparément)
        this.mesh.moveWithCollisions(new BABYLON.Vector3(movement.x, 0, movement.z));

        // Mise à jour verticale (saut et gravité)
        this.update();
    }
}
