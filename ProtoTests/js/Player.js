export default class Player {
    constructor(scene) {
        this.scene = scene;
        this.mesh = BABYLON.MeshBuilder.CreateCylinder("player", { diameter: 2, height: 2 }, scene);
        this.mesh.position.y = 1;
        this.speed = 0.3;

        // Création du Bounding Box pour la portée de récupération
        this.pickupBox = BABYLON.MeshBuilder.CreateBox("pickupBox", { size: 5 }, scene); // Box avec taille 5
        this.pickupBox.isVisible = true; // Box invisible
        this.pickupBox.position = this.mesh.position;

        // Faire en sorte que pickupBox suive le joueur
        this.pickupBox.parent = this.mesh;
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

        this.mesh.moveWithCollisions(movement);

        // Mise à jour de la position de la pickupBox
        this.pickupBox.position = this.mesh.position;
    }

    checkCollisionsWithOrbs(orbs, onCollision) {
        // Vérification des collisions entre le joueur (pickupBox) et les orbes
        orbs.forEach((orb, index) => {
            if (this.pickupBox.intersectsMesh(orb, false)) { // Vérification de l'intersection
                orb.dispose(); // Retirer l'orbe
                orbs.splice(index, 1); // Retirer de la liste des orbes
                onCollision(); // Appeler la fonction de collision
            }
        });
    }
}
