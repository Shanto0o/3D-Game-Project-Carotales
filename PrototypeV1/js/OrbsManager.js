export default class OrbsManager {
    constructor(scene, count) {
        this.scene = scene;
        this.orbs = [];
        this.createOrbs(count);
    }

    createOrbs(count) {
        for (let i = 0; i < count; i++) {
            let orb = BABYLON.MeshBuilder.CreateSphere("orb", { diameter: 0.5 }, this.scene);
            orb.position.set(Math.random() * 8 - 4, 0.5, Math.random() * 8 - 4);
            orb.material = new BABYLON.StandardMaterial("orbMat", this.scene);
            orb.material.emissiveColor = new BABYLON.Color3(1, 1, 0);
            this.orbs.push(orb);
        }
    }

    checkCollisions(playerMesh, onCollision) {
        this.orbs.forEach((orb, index) => {
            if (playerMesh.intersectsMesh(orb, false)) {
                orb.dispose();
                this.orbs.splice(index, 1);
                onCollision();
                this.createOrbs(1);
            }
        });
    }
}
