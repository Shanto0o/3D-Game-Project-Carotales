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

    player = new Player(scene);
    orbsManager = new OrbsManager(scene, 5);

    let followCamera = createFollowCamera(scene, player.mesh);

    return scene;
}

function createGround(scene) {
    const groundOptions = { width: 1000, height: 1000, subdivisions: 20 , onReady : onGroundCreated };
    const ground = BABYLON.MeshBuilder.CreateGroundFromHeightMap("gdhm", "images/hmap1.png", groundOptions, scene);

    function onGroundCreated() {
        const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
        groundMaterial.diffuseTexture = new BABYLON.Texture("images/grass.jpg", scene);
        ground.material = groundMaterial;
        ground.checkCollisions = true;
    }

    return ground;
}

function createLights(scene) {
    new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
}

function createFollowCamera(scene, target) {
    let camera = new BABYLON.FollowCamera("followCamera", new BABYLON.Vector3(0, 10, -10), scene);
    camera.radius = 20;
    camera.heightOffset = 10;
    camera.rotationOffset = 180;
    camera.cameraAcceleration = 0.1;
    camera.maxCameraSpeed = 5;
    camera.lockedTarget = target;

    scene.activeCamera = camera;
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
