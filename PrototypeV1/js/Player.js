export default class Player {
    constructor(scene) {
        this.mesh = BABYLON.MeshBuilder.CreateCylinder("player", { diameter: 1, height: 2 }, scene);
        this.mesh.position.y = 1;
        this.speed = 0.3;
    }

    move(inputStates) {
        if (inputStates.up) this.mesh.position.z += this.speed;
        if (inputStates.down) this.mesh.position.z -= this.speed;
        if (inputStates.left) this.mesh.position.x -= this.speed;
        if (inputStates.right) this.mesh.position.x += this.speed;
    }
}
