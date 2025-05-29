export default class OrbsManager {
    constructor(scene) {
        this.scene = scene;
        this.orbs = [];
    }

    createOrbsAtPositions(positions) {
        positions.forEach(pos => {
            BABYLON.SceneLoader.ImportMesh("", "./images/", "carotte.glb", this.scene, (meshes) => {
                let orb = meshes[0];
                orb.position.set(pos.x, pos.y !== undefined ? pos.y : 1, pos.z);
                orb.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);
                orb.receiveShadows = true;


                this.orbs.push(orb);
            });
        });
    }

    checkCollisions(player, onCollision) {
        const collisionDistance = 3;
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
