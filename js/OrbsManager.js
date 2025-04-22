export default class OrbsManager {
    constructor(scene) {
        this.scene = scene;
        this.orbs = [];
    }

    createOrbsAtPositions(positions) {
        positions.forEach(pos => {
            BABYLON.SceneLoader.ImportMesh("", "./images/", "carotte.glb", this.scene, (meshes) => {
                let orb = meshes[0]; // On suppose que le premier mesh est la carotte
                orb.position.set(pos.x, pos.y !== undefined ? pos.y : 1, pos.z);
                orb.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5); // Ajustez l'échelle si nécessaire

                // ** Ombres **
                orb.receiveShadows = true;                             // reçoit l’ombre


                this.orbs.push(orb);
            });
        });
    }

    // Utilisation d'un test de distance plutôt que de intersectsMesh pour la détection de collision
    checkCollisions(player, onCollision) {
        const collisionDistance = 3; // Seuil de distance pour récupérer une orbe
        for (let i = this.orbs.length - 1; i >= 0; i--) {
            let orb = this.orbs[i];
            let dist = BABYLON.Vector3.Distance(player.mesh.position, orb.position);
            if (dist < collisionDistance) {
                orb.dispose();
                this.orbs.splice(i, 1);
                onCollision();
            }
        }
    }
}
