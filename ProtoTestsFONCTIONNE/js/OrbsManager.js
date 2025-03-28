export default class OrbsManager {
    constructor(scene) {
        this.scene = scene;
        this.orbs = [];    }

    createOrbsAtPositions(positions) {
        positions.forEach(pos => {
          let orb = BABYLON.MeshBuilder.CreateSphere("orb", { diameter: 1 }, this.scene);
          // On peut fixer une hauteur par défaut, ici 1, ou utiliser pos.y si défini
          orb.position.set(pos.x, pos.y !== undefined ? pos.y : 1, pos.z);
          orb.material = new BABYLON.StandardMaterial("orbMat", this.scene);
          orb.material.emissiveColor = new BABYLON.Color3(1, 1, 0);
          this.orbs.push(orb);
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
