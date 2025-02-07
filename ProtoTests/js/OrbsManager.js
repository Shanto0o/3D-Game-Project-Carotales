export default class OrbsManager {
    constructor(scene, count) {
        this.scene = scene;
        this.orbs = [];
        this.createOrbs(count);
    }

    createOrbs(count) {
        for (let i = 0; i < count; i++) {
            let orb = BABYLON.MeshBuilder.CreateSphere("orb", { diameter: 1 }, this.scene);
            orb.position.set(Math.random() * 200 - 100, 0.5, Math.random() * 200 - 100);
            orb.material = new BABYLON.StandardMaterial("orbMat", this.scene);
            orb.material.emissiveColor = new BABYLON.Color3(1, 1, 0);
            this.orbs.push(orb);
        }
    }

    checkCollisions(player, onCollision) {
        if (!player.pickupRange) return; // Vérifie si pickupRange est bien défini
    
        this.orbs.forEach((orb, index) => {
            if (player.pickupRange.intersectsMesh(orb, false)) {
                orb.dispose();
                this.orbs.splice(index, 1);
                onCollision();
                this.createOrbs(1); // Générer un nouvel orbe
            }
        });
    }
    
}


