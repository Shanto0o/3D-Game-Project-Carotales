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

    let camera = createThirdPersonCamera(scene, player.mesh);

    engine.runRenderLoop(() => {
        player.move(inputStates, camera);

        scene.render();

        orbsManager.checkCollisions(player, () => {
            score += 10;
            timeLeft += 3;
            document.getElementById("score").textContent = score;
            document.getElementById("timer").textContent = timeLeft;
        });

    });

    startTimer();

}


function createScene() {
    let scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.3);

    createLights(scene);
    let ground = createGround(scene);

    player = new Player(scene);
    orbsManager = new OrbsManager(scene, 20);

    return scene;
}

function createGround(scene) {
    const groundOptions = { width: 200, height: 200, subdivisions: 20 , onReady : onGroundCreated };
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

function createThirdPersonCamera(scene, target) {
    let camera = new BABYLON.ArcRotateCamera(
        "ThirdPersonCamera",
        BABYLON.Tools.ToRadians(0), BABYLON.Tools.ToRadians(45),
        10, target.position, scene
    );

    camera.attachControl(canvas, false); // Désactive le contrôle initial
    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 20;
    camera.wheelPrecision = 0;
    camera.panningSensibility = -10;
    camera.checkCollisions = false;
    camera.lockedTarget = target;
    camera.inertia = 0;
    camera.angularSensibilityX = 2000; // Sensibilité horizontale (augmenter pour réduire la vitesse)
    camera.angularSensibilityY = 4000; // Sensibilité verticale (augmenter pour réduire la vitesse)

    // Definir max camera angle pour le y 
    camera.upperBetaLimit = Math.PI / 2;
    camera.lowerBetaLimit = 0.8;


    scene.activeCamera = camera;
    enablePointerLock(scene); // Active le mode "Pointer Lock"

    return camera;
}




function modifySettings() {
    window.addEventListener("keydown", (event) => {
        if (event.key === "z") inputStates.up = true;
        if (event.key === "s") inputStates.down = true;
        if (event.key === "q") inputStates.left = true;
        if (event.key === "d") inputStates.right = true;
    });

    window.addEventListener("keyup", (event) => {
        if (event.key === "z") inputStates.up = false;
        if (event.key === "s") inputStates.down = false;
        if (event.key === "q") inputStates.left = false;
        if (event.key === "d") inputStates.right = false;
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


function enablePointerLock(scene) {
    scene.onPointerDown = () => {
        if (!document.pointerLockElement) {
            canvas.requestPointerLock(); // Capture le pointeur
        }
    };

    document.addEventListener("pointerlockchange", () => {
        if (document.pointerLockElement) {
            scene.activeCamera.attachControl(canvas, true); // Active la caméra
        } else {
            scene.activeCamera.detachControl(canvas); // Désactive si on quitte
        }
    });
}


