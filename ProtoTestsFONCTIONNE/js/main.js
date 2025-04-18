import Player from "./Player.js";
import OrbsManager from "./OrbsManager.js";
import EnemiesManager from "./EnemiesManager.js";

let canvas;
let engine;
let scene;
let inputStates = {};
let player;
let orbsManager;
let enemiesManager;
let ground;
let finishMesh = null;

let timeLeft = 200; // Temps en secondes par niveau
let timerInterval;
let gamePaused = false;

// Système de niveaux
let currentLevel = 1;
const maxLevel = 10;
let orbsTarget = currentLevel * 5; // Exemple : niveau 1 = 5 orbes, niveau 2 = 10, etc.
let collectedOrbs = 0; // Compteur d'orbes collectées

// Boutique / monnaie
let euros = 0; // Solde en €

// Distance pour déclencher la fin de niveau
const FINISH_THRESHOLD = 3;

// Lancement du jeu (niveau 1) lorsque l'utilisateur clique sur "Jouer"
document.getElementById("playButton").addEventListener("click", () => {
  console.log("Bouton Jouer cliqué");
  document.getElementById("menu").style.display = "none";
  startGame();
  canvas.requestPointerLock();
});

function startGame() {
  canvas = document.querySelector("#renderCanvas");
  if (!canvas) {
    console.error("Canvas introuvable !");
    return;
  }
  engine = new BABYLON.Engine(canvas, true);
  scene = createScene();
  modifySettings();
  let camera = createThirdPersonCamera(scene, player.mesh);

  // Par défaut, le saut est désactivé tant qu'il n'est pas acheté
  player.canJump = false;

  startTimer();

  engine.runRenderLoop(() => {
    if (gamePaused) {
      scene.render();
      return;
    }

    if (!player.canJump) {
      inputStates.jump = false;
    }

    player.move(inputStates, camera);
    player.canJump = true;

    // Vérification des collisions avec les orbes
    orbsManager.checkCollisions(player, () => {
      euros += 5; // 5 euro par orbe collectée
      document.getElementById("timer").textContent = timeLeft;

    });

    // mise à jour des ennemis
    if (currentLevel >= 2) {
      enemiesManager.updateAll(player);
    }

    // Arrivée au point de fin → terminer le niveau
    if (finishMesh) {
      const dist = BABYLON.Vector3.Distance(player.mesh.position, finishMesh.position);
      if (dist < FINISH_THRESHOLD) {
        levelComplete();
      }
    }
    scene.render();
  });
}

function createScene() {
  let scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.3);
  createLights(scene);

  // Instanciez d'abord le player
  player = new Player(scene);
  

  
  // Instanciez orbsManager sans orbes initiaux (ou avec 0 orbe)
  orbsManager = new OrbsManager(scene);

  enemiesManager = new EnemiesManager(scene);
  
  // Créez le ground, ce qui va appeler createOrbsAtPositions à la fin du chargement
  ground = createGround(scene, currentLevel);
  
  return scene;
}

let importedMeshes = []; // Tableau pour stocker les meshes importés
function createGround(scene, level) {
  // Supprime les meshes importés précédemment
  if (importedMeshes.length > 0) {
      importedMeshes.forEach(mesh => mesh.dispose());
      importedMeshes = []; // Réinitialise le tableau
  }

  if (level === 1) {
      BABYLON.SceneLoader.ImportMesh("", "images/", "level2.glb", scene, function (meshes) {
          // Stocke les meshes importés
          importedMeshes = meshes;

          // Créez un mesh parent pour regrouper tous les meshes importés
          let groundParent = new BABYLON.Mesh("groundParent", scene);

          // Affectez chaque mesh importé au parent et activez les collisions
          meshes.forEach((mesh) => {
              mesh.checkCollisions = true;
          });

          // Ajustez la position et l'échelle selon vos besoins
          groundParent.position = new BABYLON.Vector3(0, 0, 0);
          groundParent.scaling = new BABYLON.Vector3(1, 1, 1);

          const spawnPositions = [
              new BABYLON.Vector3(36, 2, -11),
              new BABYLON.Vector3(-20, 3, 13),
              new BABYLON.Vector3(-1, 3, 44),
              new BABYLON.Vector3(38, 3, -5),
              new BABYLON.Vector3(20, 3, -38),
          ];

          orbsManager.createOrbsAtPositions(spawnPositions);

          console.log("Map t.glb chargée et ajustée pour le niveau 1");

          // Création du point d'arrivée
          finishMesh = BABYLON.MeshBuilder.CreateBox("finish", { size: 2 }, scene);
          finishMesh.position.set(6.6, 3.7, -52);  // <-- coordonnées fixes
          const mat = new BABYLON.StandardMaterial("finishMat", scene);
          mat.diffuseColor  = new BABYLON.Color3(0, 1, 0);
          mat.emissiveColor = new BABYLON.Color3(0, 1, 0);
          mat.alpha         = 0.5;
          finishMesh.material = mat;
          console.log("Point d'arrivée positionné en (120, 10, 120)");
      });
      return null;
  } else if (level === 2) {
      BABYLON.SceneLoader.ImportMesh("", "images/", "level2.glb", scene, function (meshes) {
          // Stocke les meshes importés
          importedMeshes = meshes;

          // Créez un mesh parent pour regrouper tous les meshes importés
          let groundParent = new BABYLON.Mesh("groundParent", scene);

          // Affectez chaque mesh importé au parent et activez les collisions
          meshes.forEach((mesh) => {
              mesh.checkCollisions = true;
          });

          // Ajustez la position et l'échelle selon vos besoins
          groundParent.position = new BABYLON.Vector3(0, 0, 0);
          groundParent.scaling = new BABYLON.Vector3(1, 1, 1);

          const spawnPositions = [
              new BABYLON.Vector3(36, 2, -11),
              new BABYLON.Vector3(-20, 3, 13),
              new BABYLON.Vector3(-1, 3, 44),
              new BABYLON.Vector3(38, 3, -5),
              new BABYLON.Vector3(20, 3, -38),
          ];

          orbsManager.createOrbsAtPositions(spawnPositions);

          console.log("Map t3.glb chargée et ajustée pour le niveau 2");

          finishMesh.position.set(59.58, 19.15, -129);  // <-- coordonnées fixes


          // GESTION DES ENNEMIS

          const paths = [
            [
              new BABYLON.Vector3(9.45, 1, 34.24 ),
              new BABYLON.Vector3(24.48, 1, 1.55),
          

            ],
            [
              new BABYLON.Vector3(9.45, 1, -29.9 ),
              new BABYLON.Vector3(-35.5, 1, -9.66),
            ]
          ];
          
          // on donne aussi speed et range à chaque ennemi si besoin
          const configs = paths.map(p => ({
            path: p,
            speed: 0.12,
            range: 15
          }));
          enemiesManager.createEnemies(configs);
          
          });
      return null;
  }
}
  
  
  
  

function createLights(scene) {
  new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
}

function createThirdPersonCamera(scene, target) {
  let camera = new BABYLON.ArcRotateCamera(
    "ThirdPersonCamera",
    BABYLON.Tools.ToRadians(0),
    BABYLON.Tools.ToRadians(45),
    10,
    target.position,
    scene
  );
  camera.attachControl(canvas, false);
  camera.lowerRadiusLimit = 5;
  camera.upperRadiusLimit = 20;
  camera.wheelPrecision = 0;
  camera.panningSensibility = -10;
  camera.checkCollisions = false;
  camera.lockedTarget = target;
  camera.inertia = 0;
  camera.angularSensibilityX = 2000;
  camera.angularSensibilityY = 4000;
  camera.upperBetaLimit = Math.PI / 2;
  camera.lowerBetaLimit = 0.8;
  
  scene.activeCamera = camera;
  enablePointerLock(scene);
  return camera;
}

function modifySettings() {
  window.addEventListener("keydown", (event) => {
    console.log("KeyDown:", event.key);
    switch(event.key) {
      case "z":
      case "ArrowUp":
        inputStates.up = true;
        break;
      case "s":
      case "ArrowDown":
        inputStates.down = true;
        break;
      case "q":
      case "ArrowLeft":
        inputStates.left = true;
        break;
      case "d":
      case "ArrowRight":
        inputStates.right = true;
        break;
      case " ":
        inputStates.jump = true;
        break;
    }
  });
  
  window.addEventListener("keyup", (event) => {
    console.log("KeyUp:", event.key);
    switch(event.key) {
      case "z":
      case "ArrowUp":
        inputStates.up = false;
        break;
      case "s":
      case "ArrowDown":
        inputStates.down = false;
        break;
      case "q":
      case "ArrowLeft":
        inputStates.left = false;
        break;
      case "d":
      case "ArrowRight":
        inputStates.right = false;
        break;
      case " ":
        inputStates.jump = false;
        break;
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "m") {
      console.log("Position du joueur :", player.mesh.position);
    }
  });
  
  window.addEventListener("resize", () => engine.resize());
}

function startTimer() {
  console.log("Timer démarré avec", timeLeft, "secondes");
  document.getElementById("timer").textContent = timeLeft;
  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").textContent = timeLeft;
    console.log("Timer:", timeLeft);
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      alert("Game Over! ");
      engine.stopRenderLoop();
    }
  }, 1000);
}

function enablePointerLock(scene) {
  canvas.addEventListener("click", () => {
    if (!document.pointerLockElement) {
      canvas.requestPointerLock();
    }
  });
  
  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement) {
      scene.activeCamera.attachControl(canvas, true);
    } else {
      scene.activeCamera.detachControl(canvas);
    }
  });
  
  canvas.addEventListener("contextmenu", (evt) => {
    evt.preventDefault();
  });
}

function levelComplete() {
  clearInterval(timerInterval);
  gamePaused = true;
  document.getElementById("eurosDisplay").textContent = euros;
  console.log("Niveau terminé, conversion en euros :", euros);
  openShopInterface();
}

function openShopInterface() {
  const shopInterface = document.getElementById("shopInterface");
  shopInterface.style.display = "block";
  document.getElementById("buyRange").onclick = buyRangeBonus;
  document.getElementById("niveauSuivant").onclick = nextLevel;
  console.log("affichage boutique :", euros);
}

function closeShopInterface() {
  document.getElementById("shopInterface").style.display = "none";
}


function buyRangeBonus() {
  if (euros >= 30) {
    euros -= 30;
    player.pickupBox.scaling = player.pickupBox.scaling.multiplyByFloats(1.1, 1.1, 1.1);
    document.getElementById("eurosDisplay").textContent = euros;
    console.log("Bonus portée acheté");
  } else {
    console.log("Pas assez d'euros pour augmenter la portée");
  }
}

function nextLevel() {
  closeShopInterface();
  if (currentLevel < maxLevel) {
      currentLevel++;
      orbsTarget = currentLevel * 5;
      collectedOrbs = 0;
      timeLeft = 30;
      document.getElementById("timer").textContent = timeLeft;

      // Dispose les orbes du niveau précédent
      orbsManager.orbs.forEach(orb => orb.dispose());

      // Charge le nouveau niveau
      ground = createGround(scene, currentLevel);

      // Réinitialise le manager d'orbes pour le nouveau niveau
      orbsManager = new OrbsManager(scene);

      // Réinitialiser la position du joueur à son point de départ (exemple : (0,10,0))
      player.mesh.position = new BABYLON.Vector3(0, 3, 0);

      gamePaused = false;
      startTimer();
      canvas.requestPointerLock();
      console.log("Niveau", currentLevel, "lancé");
  } else {
      alert("Félicitations, vous avez terminé les niveaux" );
      engine.stopRenderLoop();
  }
}
