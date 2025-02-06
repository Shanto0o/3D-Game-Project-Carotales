import Player from "./Player.js"
import OrbsManager from "./OrbsManager.js";

let canvas;
let engine;
let scene;
let inputStates = {};
let player;
let orbsManager;
let score = 0;
let timeLeft = 30; // Temps de départ en secondes

window.onload = startGame;

function startGame() {
    canvas = document.querySelector("#renderCanvas");
    engine = new BABYLON.Engine(canvas, true);
    scene = createScene();

    modifySettings();

    engine.runRenderLoop(() => {
        let deltaTime = engine.getDeltaTime() / 1000; // Temps en secondes

        player.move(inputStates);
        orbsManager.checkCollisions(player.mesh, () => {
            score += 10;
            timeLeft += 3;
            document.getElementById("score").textContent = score;
            document.getElementById("timer").textContent = timeLeft;
        });

        scene.render();
    });

    startTimer();
}

function createScene() {
    let scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.3);

    createLights(scene);
    let ground = createGround(scene);
    let camera = createFollowCamera(scene,);

    player = new Player(scene);
    orbsManager = new OrbsManager(scene, 5);

    return scene;
}

function createGround(scene) {
    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, scene);
    return ground;
}

function createLights(scene) {
    new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
}

function createFollowCamera(scene) {
    let camera = new BABYLON.FollowCamera("playerFollowCamera", new BABYLON.Vector3(0, 3, -10), scene);
    camera.heightOffset = 10;
    camera.radius = 10;
    camera.rotationOffset = 180;
    camera.cameraAcceleration = 0.1;
    camera.maxCameraSpeed = 5;
    return camera;
}

function modifySettings() {
    window.addEventListener("keydown", (event) => {
        if (event.key === "ArrowUp") inputStates.up = true;
        if (event.key === "ArrowDown") inputStates.down = true;
        if (event.key === "ArrowLeft") inputStates.left = true;
        if (event.key === "ArrowRight") inputStates.right = true;
    });

    window.addEventListener("keyup", (event) => {
        if (event.key === "ArrowUp") inputStates.up = false;
        if (event.key === "ArrowDown") inputStates.down = false;
        if (event.key === "ArrowLeft") inputStates.left = false;
        if (event.key === "ArrowRight") inputStates.right = false;
    });

    window.addEventListener("resize", () => engine.resize());
}

function startTimer() {
    setInterval(() => {
        timeLeft--;
        document.getElementById("timer").textContent = timeLeft;

        if (timeLeft <= 0) {
            alert("Game Over! Score: " + score);
            engine.stopRenderLoop();
        }
    }, 1000);
}
