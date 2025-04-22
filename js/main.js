import Player from "./Player.js";
import OrbsManager from "./OrbsManager.js";
import EnemiesManager from "./EnemiesManager.js";
import MiniGameManager from "./MiniGameManager.js";
import FishingManager from "./FishingManager.js";
import AudioManager from "./AudioManager.js";


let canvas;
let engine;
let scene;
let inputStates = {};
let player;
let orbsManager;
let enemiesManager;
let fishingManager;
let ground;
let audioManager;
let pondMesh;
let pondZone;
let camera;
let finishMesh = null;
let importedMeshes = []; // Tableau pour stocker les meshes importés
let movingPlatforms = []; // Tableau pour stocker les plateformes en mouvement
let inspecting = false;


globalThis.HK = await HavokPhysics();



let timerDuration = 100;
let timeLeft;
let timerInterval;
let gamePaused = false;

let spawnPosition;          // mémorise la position de départ
let playerDead = false;     // true pendant les 3 s
let invulnerable = false;  // invulnérabilité temporaire après respawn

// Système de niveaux
let currentLevel = 1;
const maxLevel = 2;
let orbsTarget = currentLevel * 5; // Exemple : niveau 1 = 5 orbes, niveau 2 = 10, etc.
let collectedOrbs = 0; // Compteur d'orbes collectées 




// Boutique / monnaie
let euros = 0; // Solde en €
let currentRangeMult = 1; // Multiplie la portée de ramassage

let shopPosition; 
// SORTS ACTIVABLES
// --- Sort Gel ---
let freezeBought   = false;   // acheté ?
let freezeActive   = false;   // en cours d’effet ? 
let freezeCooldown = false;                      // ← flag de cooldown
const freezeCooldownDuration = 60_000;           // ← durée du cooldown en ms (60 s)
let lastFreezeTime = 0;                        // ← timestamp du dernier gel

// Sort Speed
let speedBought    = false;
let speedActive    = false;
let speedCooldown  = false;
const speedDuration        = 10_000;    // effet : 10 s
const speedCooldownDuration= 60_000;    // recharge : 60 s
let lastSpeedTime  = 0;

// Carrot Lover : nombre de carottes bonus a chaque récupération de carotte
let carrotLoverStacks = 0;

// Assurance‑vie
let insuranceBought = false;
let insuranceUsed   = false;

let miniGameManager;

// Distance pour déclencher la fin de niveau
const FINISH_THRESHOLD = 3;


// Stocke tous les coffres créés
const chests = [];
// Suivi de l'état d'ouverture par chestId
const chestOpened = {};

let gamblingTableMesh = null;
let miniGameZone = null;
let miniGameTriggerZone = null;

let pondPosition;

let preFishingCameraState = null;

/**
 * Anime la caméra en mode « vue de pêche » : 
 * on passe au-dessus de l'étang, on monte et on regarde vers le bas.
 */
function animateCameraToFishingView() {
  // Sauvegarde de l’état courant
  preFishingCameraState = {
    alpha:  camera.alpha,
    beta:   camera.beta,
    radius: camera.radius,
    target: camera.target.clone()
  };

  // On veut centrer sur l'étang
  const fishingTarget = pondPosition.clone();

  // Création des animations (30 fps, sur 2 secondes)
  const fps = 30, durationFrames = fps * 2;
  camera.animations = [];

  // 1) Beta → plus proche de 0 pour regarder vers le bas
  const animBeta = new BABYLON.Animation(
    "betaAnim", "beta", fps,
    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
  );
  animBeta.setKeys([
    { frame: 0,              value: preFishingCameraState.beta },
    { frame: durationFrames, value: Math.PI / 8 } // ~22.5°
  ]);
  camera.animations.push(animBeta);

  // 2) Radius → on recule un peu
  const animRadius = new BABYLON.Animation(
    "radiusAnim", "radius", fps,
    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
  );
  animRadius.setKeys([
    { frame: 0,              value: preFishingCameraState.radius },
    { frame: durationFrames, value: preFishingCameraState.radius + 10 }
  ]);
  camera.animations.push(animRadius);

  // 3) Target.X/Y/Z → déplacer le point visé sur l'étang
  ["x", "y", "z"].forEach(axis => {
    const animT = new BABYLON.Animation(
      `target${axis}`, `target.${axis}`, fps,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    animT.setKeys([
      { frame: 0,              value: preFishingCameraState.target[axis] },
      { frame: durationFrames, value: fishingTarget[axis] }
    ]);
    camera.animations.push(animT);
  });

  scene.beginAnimation(camera, 0, durationFrames, false);
}

/**
 * Anime la caméra pour revenir à l’état « suivi joueur ».
 */
function animateCameraToPlayerView() {
  if (!preFishingCameraState) return;

  const fps = 30, durationFrames = fps * 2;
  camera.animations = [];

  // 1) Beta retour
  const animBetaBack = new BABYLON.Animation(
    "betaBack", "beta", fps,
    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
  );
  animBetaBack.setKeys([
    { frame: 0,              value: camera.beta },
    { frame: durationFrames, value: preFishingCameraState.beta }
  ]);
  camera.animations.push(animBetaBack);

  // 2) Radius retour
  const animRadiusBack = new BABYLON.Animation(
    "radiusBack", "radius", fps,
    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
  );
  animRadiusBack.setKeys([
    { frame: 0,              value: camera.radius },
    { frame: durationFrames, value: preFishingCameraState.radius }
  ]);
  camera.animations.push(animRadiusBack);

  // 3) Target.X/Y/Z retour
  ["x", "y", "z"].forEach(axis => {
    const animTBack = new BABYLON.Animation(
      `targetBack${axis}`, `target.${axis}`, fps,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    animTBack.setKeys([
      { frame: 0,              value: camera.target[axis] },
      { frame: durationFrames, value: preFishingCameraState.target[axis] }
    ]);
    camera.animations.push(animTBack);
  });

  scene.beginAnimation(camera, 0, durationFrames, false);
  preFishingCameraState = null;
}



const promptDiv = document.getElementById("interactPrompt");
if (!promptDiv) {
  console.error("interactPrompt introuvable dans index.html !");
}

function updateEurosUI() {
  const span = document.getElementById("eurosAmount");
  if (span) span.textContent = euros;
}


// En haut de main.js, après avoir chargé le DOM :
const timerDiv = document.getElementById("timerDisplay");
const eurosDiv = document.getElementById("eurosDisplay");





// Lancement du jeu (niveau 1) lorsque l'utilisateur clique sur "Jouer"
document.getElementById("playButton").addEventListener("click", () => {
  console.log("Bouton Jouer cliqué — affichage de l'intro");
  document.getElementById("menu").style.display = "none";
  document.getElementById("introInterface").style.display = "flex";
});

// Au clic sur "Continuer", on lance vraiment le jeu
document.getElementById("introContinue").addEventListener("click", async () => {
  console.log("Intro terminée — démarrage du jeu");
  // On cache l'overlay
  document.getElementById("introInterface").style.display = "none";
  // On affiche le timer et le compteur de carottes
  timerDiv.style.display = "block";
  eurosDiv.style.display = "block";
  // On appelle startGame normalement
  const bgMusic = await startGame();
  bgMusic.play();
  // On prend le pointer lock pour contrôler la caméra
  canvas.requestPointerLock();
});


async function startGame() {
  canvas = document.querySelector("#renderCanvas");
  if (!canvas) {
    console.error("Canvas introuvable !");
    return;
  }
  engine = new BABYLON.Engine(
    canvas,
    true,
    { audioEngine: true }, // ← active le legacy audio engine
    true
  );
  scene = createScene();
  modifySettings();
  camera = createThirdPersonCamera(scene, player.mesh);

  // juste après la création de camera et avant runRenderLoop :
  window.addEventListener('fishingEnded', () => {
    // anime la caméra pour revenir derrière le joueur
    animateCameraToPlayerView();
    // réactive le pointer‑lock
    canvas.requestPointerLock();
  });


  // Instanciation de notre gestionnaire audio
  audioManager = new AudioManager(scene);
  // Chargement des sons que l’on veut précharger
  await Promise.all([
    audioManager.load("purchase", "images/purshased.wav"),
    audioManager.load("pickitem", "images/pickitem.wav"),
    audioManager.load("jump", "images/jump.wav"),
    audioManager.load("fish", "images/fish.wav"),
    audioManager.load("fishnorm", "images/fishnormal.wav"),
    audioManager.load("dice", "images/dice.wav"),
    audioManager.load("fail", "images/fail.wav"),
    audioManager.load("chest", "images/chest.mp3"),

    // ajoutez d’autres sons ici…
  ]);

  if (player) {
    player.am = audioManager;
  }
  if (fishingManager) {  
    fishingManager.am = audioManager;
  }
  if ( miniGameManager ) {
    miniGameManager.am = audioManager;
  }


  //musique
  // Juste après avoir créé votre <canvas> et avant d’instancier l’Engine
  // Désactive le bouton “Unmute” par défaut
  BABYLON.Engine.audioEngine.useCustomUnlockedButton = true;



  if (!BABYLON.Engine.audioEngine.unlocked) {
    BABYLON.Engine.audioEngine.unlock();
  }
 

  startTimer(timerDuration);
  

  engine.runRenderLoop(() => {
    if (gamePaused) {
      scene.render();
      return;
    }

    if (!player.canJump) {
      inputStates.jump = 0;
    }

      
    let nearInteract = false;
    // Vérification des collisions avec les orbes
    orbsManager.checkCollisions(player, () => {
      audioManager.play("pickitem");
      const baseGain = 5;
      const bonus    = carrotLoverStacks;               // +1 par stack
      const total    = baseGain + bonus;
      euros += total;
      updateEurosUI();
      showToast(`+${total} carrots${bonus>0 ? ` (${baseGain}+${bonus})` : ""}`, 1500);
    });

        // —— Zone Shop (finishMesh) : “E : Open Shop” —— 
    if (finishMesh) {
      const distShop = BABYLON.Vector3.Distance(player.mesh.position, finishMesh.position);
      if (distShop < 15) {
        nearInteract = true;
        promptDiv.textContent = "Press E to open Shop";
        if (inputStates.interact) {
          openShopInterface();
        }
      }
    }

    updateEurosUI();


    

    chests.forEach(({ mesh, id }) => {
      if (chestOpened[id]) return;  // déjà ouvert
      const d = BABYLON.Vector3.Distance(player.mesh.position, mesh.position);
      if (d < 3) {
        nearInteract = true;
        promptDiv.textContent = "Press E to open chest";
        if (inputStates.interact) {
          audioManager.play("chest");
          euros += 25;
          updateEurosUI();
          chestOpened[id] = true;
          showToast(`+25 carrots`, 1500);
          mesh.dispose();
        }
      }
    });





    // —— mini‑jeu de pêche par distance ——
    if (pondPosition && !fishingManager.isFishing) {
      const d = BABYLON.Vector3.Distance(player.mesh.position, pondPosition);
      if (d < 22) {
        promptDiv.textContent = "Press E to fish";
        nearInteract = true;
        if (inputStates.interact) {
          // 1) on ouvre l'UI…
          fishingManager.show();
          // 2) on bloque les contrôles de la caméra
          camera.detachControl(canvas);
          // 3) on lance l'animation vers l'étang
          animateCameraToFishingView();
          // 4) on réinitialise l’état de la touche pour éviter de re‑ouvrir
          inputStates.interact = false;
        }
      }
    }

    promptDiv.style.display = nearInteract ? "block" : "none";

    scene.render();
  });

  // Musique
  return new Promise((resolve) => {
    const bgMusic = new BABYLON.Sound(
      "BackgroundMusic",
      "images/Velvetride.mp3",
      scene,
      () => {
        console.log("🎵 Musique chargée !");
        resolve(bgMusic); // Résout la promesse avec bgMusic
      },
      { loop: true, autoplay: false, volume: 0.5, streaming: true, spatialSound: false }
    );
  });
}

function createMovingPlatform(scene, p_from, p_to, speed = 2) {


  BABYLON.SceneLoader.ImportMesh("", "images/", "plat.glb", scene, (meshes) => {
    if (!meshes || !Array.isArray(meshes) || meshes.length === 0) {
      console.error("Aucun mesh trouvé dans le fichier plat.glb.");
      return;
    }

    // Filtrage des meshes valides (certains fichiers glb incluent des nodes vides ou transform nodes)
    const validMeshes = meshes.filter(mesh => mesh instanceof BABYLON.Mesh && mesh.geometry);
    if (validMeshes.length === 0) {
      console.error("Aucun mesh visible à fusionner dans plat.glb.");
      return;
    }

    const platform = BABYLON.Mesh.MergeMeshes(validMeshes, true, true, undefined, false, true);

    // ** Ombres **
    platform.receiveShadows = true;
    if (!platform) {
      console.error("Échec de la fusion des meshes de la plateforme.");
      return;
    }

    platform.name = "movingPlatform";
    platform.position = p_from.clone();
    platform.userVelocity = BABYLON.Vector3.Zero(); // <-- Stockage de vitesse personnalisée

    const aggregate = new BABYLON.PhysicsAggregate(
      platform,
      BABYLON.PhysicsShapeType.BOX,
      { mass: 0 }, // Static / animé
      scene
    );
    aggregate.body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);

    const direction = p_to.subtract(p_from).normalize();
    let time = 0;

    const update = () => {
      const dt = scene.getEngine().getDeltaTime() * 0.001;
      time += dt;
    
      const alpha = (Math.sin(time * speed) + 1) / 2;
      const newPos = BABYLON.Vector3.Lerp(p_from, p_to, alpha);
      const prevPos = platform.position.clone();
    
      aggregate.body.setTargetTransform(newPos, platform.rotationQuaternion ?? BABYLON.Quaternion.Identity());
    
      // Calcul manuel de la vélocité
      platform.userVelocity = newPos.subtract(prevPos).scale(1 / dt);
    };
    
    const observer = scene.onBeforeRenderObservable.add(update);
    
    // Stocke la plateforme et l'observer
    movingPlatforms.push({ platform, observer });
  });
}

function clearMovingPlatforms(scene) {
  for (const { platform, observer } of movingPlatforms) {
    // Supprime l'observable
    scene.onBeforeRenderObservable.remove(observer);
    // Supprime le mesh et les ressources liées
    platform.dispose();
  }
  movingPlatforms.length = 0; // Vide la liste
}

function createChest(x, y, z, chestId) {
  BABYLON.SceneLoader.ImportMesh("", "images/", "chest.glb", scene,
    (meshes, particleSystems, skeletons, animationGroups) => {
      animationGroups.forEach(g => g.stop());
      const chest = meshes[0];
      chest.position.set(x, y, z);
      chest.scaling  = new BABYLON.Vector3(4, 4, 4);

      // ** Ombres **
      chest.receiveShadows = true;

      chest.checkCollisions = false;
      chests.push({ mesh: chest, id: chestId });
      chestOpened[chestId] = false;
    }
  );
}

function createScene() {
  
  let scene = new BABYLON.Scene(engine);
  

  // Exponential fog très léger
  scene.fogMode    = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogColor   = new BABYLON.Color3(0.8, 0.9, 1.0); // bleu très pâle
  scene.clearColor = new BABYLON.Color3(0.8, 0.9, 1.0); // assortir le skybox background
  scene.fogDensity = 0.0020 ;  // <– 0.008 → 0.0015 (ou encore plus petit, essayez 0.0008)       


  var gravityVector = new BABYLON.Vector3(0, -9.81, 0);
  const physicsPlugin = new BABYLON.HavokPlugin(false);
  scene.enablePhysics(gravityVector, physicsPlugin);

  scene.onAfterPhysicsObservable.add(() => {
    if (currentLevel >= 2) {
      enemiesManager.updateAll(player);


      // Vérification des collisions avec les ennemis
    if (!playerDead && !invulnerable && currentLevel >= 2) {
      enemiesManager.enemies.forEach(enemy => {
        if (enemy.mesh.intersectsMesh(player.mesh, false)) {
          handlePlayerDeath(5);
        }
      });
    }
  }

    if (!playerDead && !invulnerable && player.mesh.position.y < -50) {
      if (insuranceBought && !insuranceUsed) {
        // utilisation de l’assurance‑vie
        insuranceUsed = true;
        player.reset_position(scene);
        showToast("Your insurance makes you respawn instantly !", 3000);
        // accordez 1 s d’invulnérabilité pour éviter d’enchainer sur un autre kill immédiat
        invulnerable = true;
        setTimeout(() => invulnerable = false, 1000);
      } else {
        handlePlayerDeath(10);
      }
    }


    });
  //scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.3);
  createLights(scene);

  // Instanciez d'abord le player
  player = new Player(scene);

  
  spawnPosition = new BABYLON.Vector3(0, 10, 0);   // point d’apparition



  
  // Instanciez orbsManager sans orbes initiaux (ou avec 0 orbe)
  orbsManager = new OrbsManager(scene);

  enemiesManager = new EnemiesManager(scene);

  miniGameManager = new MiniGameManager(
    () => euros,
    (newVal) => {
      euros = newVal;
      updateEurosUI();
    }
  );

  fishingManager = new FishingManager(
    () => euros,
    (v) => { euros = v; updateEurosUI(); },
    (msg, duration) => showToast(msg, duration)
  );

  // branche le bouton "Leave"
  const leaveBtn = document.getElementById('leaveFishingBtn');
  if (leaveBtn) {
    leaveBtn.addEventListener("click", () => {
      fishingManager.hide();
      // anime la caméra pour revenir derrière le joueur
      animateCameraToPlayerView();
      // et on reprend le pointer‐lock
      canvas.requestPointerLock();
    });
  }


  // Par exemple juste après avoir instancié player et enemiesManager :

  // Pour chaque ennemi importé :
  enemiesManager.enemies.forEach(e => {
  });

  BABYLON.SceneLoader.ImportMesh(
    /* meshNames */ "", 
    /* rootUrl   */ "images/", 
    /* fileName  */ "lightbluesky.glb", 
    /* scene     */ scene,
    (meshes) => {
      meshes.forEach(mesh => {
        // Place la skybox à l'infini pour qu'elle suive la caméra
        mesh.infiniteDistance = true;
        // Désactive les collisions pour ne pas gêner le joueur
        mesh.checkCollisions = false;
      });
    }
  );


  scene.onBeforeRenderObservable.add((scene) => {
    player.mesh.position.copyFrom(player.controller.getPosition());
    // camera following
    var cameraDirection = camera.getDirection(new BABYLON.Vector3(0,0,1));
    cameraDirection.y = 0;
    cameraDirection.normalize();
    camera.setTarget(BABYLON.Vector3.Lerp(camera.getTarget(), player.mesh.position, 0.1));
    var dist = BABYLON.Vector3.Distance(camera.position, player.mesh.position);
    const amount = (Math.min(dist - 6, 0) + Math.max(dist - 9, 0)) * 0.04;
    cameraDirection.scaleAndAddToRef(amount, camera.position);
    camera.position.y += (player.mesh.position.y + 2 - camera.position.y) * 0.04;
});


  scene.onAfterPhysicsObservable.add((_) => {
    if (scene.deltaTime == undefined) return;
    let dt = scene.deltaTime / 1000.0;
    if (dt == 0) return;

    // ← Si le joueur est en cours de « mort », on ne f ait rien
    if (playerDead) {
      return;
    }

    player.move(inputStates, camera);

    let down = new BABYLON.Vector3(0, -1, 0);
    let support = player.controller.checkSupport(dt, down);
   
    BABYLON.Quaternion.FromEulerAnglesToRef(0, camera.rotation.y, 0, player.orientation);
    let desiredLinearVelocity = player.getDesiredVelocity(dt, support, player.controller.getVelocity());
    player.controller.setVelocity(desiredLinearVelocity);

    player.controller.integrate(dt, support, player.gravity);
});



  
  // Créez le ground, ce qui va appeler createOrbsAtPositions à la fin du chargement
  ground = createGround(scene, currentLevel);
  
  return scene;
}

function createFinishPoint(x , y, z) {
            
  // Création du point d'arrivée
  finishMesh = BABYLON.MeshBuilder.CreateBox("finish", { size: 2 }, scene);
  shopPosition = finishMesh.position.clone(); // Mémoriser la position de la boutique
  finishMesh.position.set(x, y, z); // <-- coordonnées fixes
  finishMesh.isVisible = true; // Rendre la boîte invisible (utilisée uniquement pour les collisions)
  finishMesh.checkCollisions = true; // Activer les collisions pour la boîte

  // Charger le modèle finish.glb pour l'apparence
  BABYLON.SceneLoader.ImportMesh("", "images/", "finish.glb", scene, (meshes) => {
      const finishModel = meshes[0]; // On suppose que le premier mesh est le modèle principal
      finishModel.parent = finishMesh; // Attacher le modèle à la boîte

      finishModel.receiveShadows = true;
      // tourner le panneau de 90° vers la droite
      finishModel.rotation.y = Math.PI / 2; // Ajuster la rotation si nécessaire
      finishModel.scaling = new BABYLON.Vector3(1, 1, -1); // Ajuster l'échelle si nécessaire
      console.log("Modèle finish.glb chargé et attaché à la boîte");
  });
  }


function createGamblingTable (x,y,z) {
          // Charger le modèle gamblingtable.glb
          BABYLON.SceneLoader.ImportMesh("", "images/", "gamblingtable.glb", scene, (meshes) => {
            gamblingTableMesh = meshes[0]; // On suppose que le premier mesh est la table
            gamblingTableMesh.position = new BABYLON.Vector3(x, y+0.8, z); // Ajustez les coordonnées
            gamblingTableMesh.scaling = new BABYLON.Vector3(0.8, 0.8, 0.8); // Ajustez l'échelle si nécessaire

            gamblingTableMesh.receiveShadows = true;
            gamblingTableMesh.isVisible = true;
        
            // Activer les collisions pour la table
            gamblingTableMesh.checkCollisions = true;
            meshes.forEach(m => {
              m.receiveShadows = true;  // ombres
              if (!(m.name == "__root__")) {
                new BABYLON.PhysicsAggregate(m, BABYLON.PhysicsShapeType.MESH);
              }
            });

            // Créer une zone en cube autour de la table pour gérer les interactions
            miniGameZone = BABYLON.MeshBuilder.CreateBox("miniZone", { size: 6 }, scene);
            miniGameZone.position = gamblingTableMesh.position.clone(); // Placez le cube au même endroit que la table
            miniGameZone.isVisible = false; // Rendre le cube invisible (ou semi-transparent si nécessaire)
        
            // Si vous voulez rendre le cube semi-transparent pour le débogage :
            const matZone = new BABYLON.StandardMaterial("zoneMat", scene);
            matZone.diffuseColor = new BABYLON.Color3(1, 1, 0); // Jaune
            matZone.alpha = 0.3; // 30% d’opacité
            miniGameZone.material = matZone;
        
            // Ajouter un gestionnaire d'actions pour la zone
            miniGameZone.actionManager = new BABYLON.ActionManager(scene);
        
            // Quand le joueur entre dans la zone, on affiche l'UI
            miniGameZone.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    { trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger, parameter: { mesh: player.mesh } },
                    () => {
                        document.exitPointerLock();
                        miniGameManager.showInterface();
                    }
                )
            );
        
            // Quand il sort, on cache l'UI
            miniGameZone.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    { trigger: BABYLON.ActionManager.OnIntersectionExitTrigger, parameter: { mesh: player.mesh } },
                    () => {
                        miniGameManager.hideInterface();
                        canvas.requestPointerLock();
                    }
                )
            );
        });
}

function createPond(x,y,z) {
  BABYLON.SceneLoader.ImportMesh("", "images/", "pond.glb", scene, (meshes) => {
    // On positionne le plan d'eau
    pondMesh = meshes[0]; // On suppose que le premier mesh est le plan d'eau
    pondMesh.position = new BABYLON.Vector3(x, y, z);
    pondMesh.receiveShadows = true;
    pondPosition = pondMesh.position.clone();
    meshes.forEach(m => {
      m.checkCollisions  = true;
      m.receiveShadows   = true;
      if (!(m.name == "__root__")) {
        new BABYLON.PhysicsAggregate(m, BABYLON.PhysicsShapeType.MESH);
      }
    });
  
    // Création de la hit‑box invisible
    pondZone = BABYLON.MeshBuilder.CreateBox("pondZone", { size: 1 }, scene);
    pondZone.position        = pondMesh.position.clone();
    pondZone.isVisible       = false;
    pondZone.checkCollisions = false;   // <-- remet la détection d’intersection
    pondZone.isPickable      = false;  // n’interfère pas pour les clics
    // Empêche physiquement le blocage sans désactiver checkCollisions :
    pondZone.ellipsoid       = new BABYLON.Vector3(0,0,0);
    pondZone.ellipsoidOffset = new BABYLON.Vector3(0,0,0);

    pondZone.actionManager   = new BABYLON.ActionManager(scene);
    pondZone.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        { trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger, parameter: { mesh: player.mesh } },
        () => {
          showToast("Press E to fish", 2000);
          window.addEventListener("keydown", onEnterFishing);
        }
      )
    );
    pondZone.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        { trigger: BABYLON.ActionManager.OnIntersectionExitTrigger, parameter: { mesh: player.mesh } },
        () => {
          window.removeEventListener("keydown", onEnterFishing);
        }
      )
    );
  
    function onEnterFishing(evt) {
      if (evt.key.toLowerCase() === "e") {
        document.exitPointerLock();
        fishingManager.show();
        // Bloque les contrôles caméra et anime la vue
        camera.detachControl(canvas);
        animateCameraToFishingView();
        window.removeEventListener("keydown", onEnterFishing);
      }
    }
  });
}



function createGround(scene, level) {

  // Supprime les meshes importés précédemment
  if (importedMeshes.length > 0) {
      importedMeshes.forEach(mesh => mesh.dispose());
      clearMovingPlatforms(scene); // Supprime les plateformes en mouvement
      importedMeshes = []; // Réinitialise le tableau
  }

  if (level === 1) {
      BABYLON.SceneLoader.ImportMesh("", "images/", "niveau1.glb", scene, function (meshes) {
        console.log("Import niveau", level, ":", meshes.map(m => `${m.name} → ${m.getClassName()}`)); 


        BABYLON.SceneLoader.ImportMesh("", "images/", "grass.glb", scene, function (grassMeshes) {
          importedMeshes = importedMeshes.concat(grassMeshes);
        });
          // Stocke les meshes importés
          importedMeshes = importedMeshes.concat(meshes);
          // Affectez chaque mesh importé au parent et activez les collisions
          meshes.forEach((mesh) => {

              mesh.checkCollisions = true;
              mesh.isPickable = false; 
              
              // Active la réception des ombres
              mesh.receiveShadows = true;
              // Ajoute le mesh comme caster d'ombres

              // Corrige les matériaux problématiques
              if (mesh.material) {
                mesh.material.unlit = false; // Désactive le mode "unlit" (sans éclairage)
                mesh.material.freeze(); // Empêche les modifications ultérieures
              }

              if (!(mesh.name == "__root__")) {
                new BABYLON.PhysicsAggregate(mesh, BABYLON.PhysicsShapeType.MESH);
              }

              
          });
          
          const spawnPositions = [
            new BABYLON.Vector3(17.6, 1, -31),
            new BABYLON.Vector3(50.8, 1,  -59),
            new BABYLON.Vector3(65.3, 1, -115.3),
            new BABYLON.Vector3(83,1,-167.6),
            new BABYLON.Vector3(211.9,1,-151),
            new BABYLON.Vector3(104.9, 17, -36),
            new BABYLON.Vector3(102.3, 43, -10.2),
            new BABYLON.Vector3(113.5, 54.2, 12.5),
            new BABYLON.Vector3(134.5, 56.2, 26.1),
            new BABYLON.Vector3(198.9, 73, 86.8),
            new BABYLON.Vector3(253.1,94.4,55.9),
            new BABYLON.Vector3(254,100,29.3),
            new BABYLON.Vector3(233.6, 91, -29.9),
            new BABYLON.Vector3(178.3,120,-58.9),
            new BABYLON.Vector3(168.2,120,-50),
            new BABYLON.Vector3(180.2,120,-52.8),
            new BABYLON.Vector3(103.8,23,-92),
            new BABYLON.Vector3(173.4,51,-127.5),
            new BABYLON.Vector3(237.4,64,-98.3),
            new BABYLON.Vector3(62.8,1,-101.6),
          ];

          orbsManager.createOrbsAtPositions(spawnPositions);

          console.log("Map t.glb chargée et ajustée pour le niveau 1");

          createFinishPoint(175.3, 120, -54.3); // <-- coordonnées fixes

          

          createChest( 227.2, 68, 151.3,  `lvl1_chest1` );

          createGamblingTable (176.8,120,-22.9);


          // 1) Crée tes plateformes statiques à partir de plat.glb
          
          const p1_from = new BABYLON.Vector3(120, 55, 25);
          const p1_to   = new BABYLON.Vector3(150, 55, 28);
          createMovingPlatform(scene, p1_from, p1_to, 0.8);

          createPond(66, 0, -130);

          
          

          
      });
      return null;
  } else if (level === 2) {
      BABYLON.SceneLoader.ImportMesh("", "images/", "niveau2.glb", scene, function (meshes) {
          // Stocke les meshes importés
          importedMeshes = meshes;

          // Affectez chaque mesh importé au parent et activez les collisions
          meshes.forEach((mesh) => {
              mesh.checkCollisions = true;
              mesh.isPickable = false; 
              mesh.receiveShadows = true;  
              if (!(mesh.name == "__root__")) {
                new BABYLON.PhysicsAggregate(mesh, BABYLON.PhysicsShapeType.MESH);
              }

  

          });
          const spawnPositions = [
              new BABYLON.Vector3(6,5   ,58 ),
              new BABYLON.Vector3(-33,15 ,95 ),
              new BABYLON.Vector3(-96,18 , 184),
              new BABYLON.Vector3(-116,23 ,164 ),
              new BABYLON.Vector3(-120,25 ,134 ),
              new BABYLON.Vector3(-116,29 ,107 ),

          ];

          orbsManager.createOrbsAtPositions(spawnPositions);

          console.log("Map t.glb chargée et ajustée pour le niveau 1");

          createChest( -93, 30, 100,  `lvl1_chest1` );
          createChest( -94, 30, 111,  `lvl1_chest2` );

          createFinishPoint(-67, 60, -136); // <-- coordonnées fixes
        createGamblingTable (-55,57,-147);


          // GESTION DES ENNEMIS

          const paths = [
            [
              new BABYLON.Vector3(-80, 20 , 120 ),
              new BABYLON.Vector3(-22, 18, 133),
          

            ],
            [
              new BABYLON.Vector3(-41, 17, 170 ),
              new BABYLON.Vector3(-85, 19, 124),
            ],
            [
              new BABYLON.Vector3(46, 15, -120 ),
              new BABYLON.Vector3(50, 16, -237),
            ]
          ];
          
          // on donne aussi speed et range à chaque ennemi si besoin
          const configs = paths.map(p => ({
            path: p,
            speed: 0.057,
            range: 15
          }));
          enemiesManager.createEnemies(configs);
          
          });
      return null;
  }
}
  
  
  
function clearLevelObjects() {
  chests.forEach(({ mesh }) => mesh.dispose());
  chests.length = 0;

  if (finishMesh) {
    finishMesh.dispose();
    finishMesh = null;
  }

  if (gamblingTableMesh) {
    gamblingTableMesh.dispose();
    gamblingTableMesh = null;
  }

  if (miniGameZone) {
    miniGameZone.dispose();
    miniGameZone = null;
  }
  if (miniGameTriggerZone) {
    miniGameTriggerZone.dispose();
    miniGameTriggerZone = null;
  }

  if (pondMesh) {
    pondMesh.dispose();
    pondMesh = null;
  }
  if (pondZone) {
    pondZone.dispose();
    pondZone = null;
  }

  pondPosition = null;


}




function createLights(scene) {
  // 1) Fond d’écran un peu plus chaud
  //    (remplacez votre clearColor actuelle)
  scene.clearColor = new BABYLON.Color3(0.2, 0.15, 0.1); // brun très foncé tirant sur le cuivré

  // 2) Lumière hémisphérique douce et chaude
  const hemi = new BABYLON.HemisphericLight("hemiLight",
    new BABYLON.Vector3(0, 1, 0), scene);
  hemi.diffuse     = new BABYLON.Color3(1.0, 0.8, 0.6);  // couleur principale (blanc chaud)
  hemi.specular    = new BABYLON.Color3(0.4, 0.3, 0.3);  // reflets doux
  hemi.groundColor = new BABYLON.Color3(0.2, 0.1, 0.05); // sous-sol très sombre
  hemi.intensity   = 0.6;                               // plus tamisée

  // 3) Lumière directionnelle (soleil / lampe) orangée
  const dir = new BABYLON.DirectionalLight("dirLight",
    new BABYLON.Vector3(-0.5, -1, -0.5), scene);
  dir.position  = new BABYLON.Vector3(30, 50, -20);
  dir.diffuse   = new BABYLON.Color3(1.0, 0.85, 0.6);    // ton chaud, façon coucher de soleil
  dir.specular  = new BABYLON.Color3(0.5, 0.4, 0.3);
  dir.intensity = 0.7;

  // 4) Petite lampe d’appoint (point light) pour renforcer l’ambiance
  const lamp = new BABYLON.PointLight("lampLight",
    new BABYLON.Vector3(0, 5, 0), scene);
  lamp.diffuse   = new BABYLON.Color3(1.0, 0.7, 0.3);    // orange doux
  lamp.specular  = new BABYLON.Color3(0.3, 0.2, 0.1);
  lamp.intensity = 0.3;
  lamp.range     = 20;

  // 5) (Optionnel) un léger glow pour adoucir les hautes lumières
  const glow = new BABYLON.GlowLayer("glow", scene, {
    intensity: 0.3,
    mainTextureSamples: 4
  });
}

function createThirdPersonCamera(scene, target) {
  camera = new BABYLON.ArcRotateCamera(
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
    let key = event.key.toLowerCase();
    switch(key) {
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
        inputStates.jump++;
        player.wantJump ++;
        break;
      case "r":
        if (!speedBought) {
          showToast("Speed boost not unlocked !", 2500);
        } else if (speedActive) {
          showToast("Speed boost already active !", 2500);
        } else if (speedCooldown) {
          const rem = Math.ceil((speedCooldownDuration - (Date.now() - lastSpeedTime)) / 1000);
          showToast(`Speed boost on cooldown : ${rem}s`, 2500);
        } else if (!gamePaused) {
          triggerSpeed();
        }
        break;
      case "e":
        inputStates.interact = true;
        break;
      case "a":
        if (!freezeBought) {
          showToast("Freeze not unlocked!", 2500);
        } else if (freezeActive) {
          showToast("Freeze already active !", 2500);
        } else if (freezeCooldown) {
          const rem = Math.ceil((freezeCooldownDuration - (Date.now() - lastFreezeTime)) / 1000);
          showToast(`Freeze on cooldown : ${rem}s`, 2500);
        } else if (!gamePaused) {
          triggerFreeze();
        }
        break;
      case "i":
        if (inspecting) {
          inspecting = false;
          scene.debugLayer.hide();
        } else {
          scene.debugLayer.show();
          inspecting = true;
        }
    }
  });
  
  window.addEventListener("keyup", (event) => {
    let key = event.key.toLowerCase();
    switch(key) {
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
        inputStates.jump = 0;
        player.wantJump = 0;
        break;
        case "e":
          inputStates.interact = false;
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

function startTimer(duration) {
  // Si un timer était déjà en cours, on l’arrête
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  timeLeft = duration;
  console.log("[DEBUG] startTimer() level", currentLevel, "timeLeft =", timeLeft);

  // Mise à jour immédiate de l’affichage
  document.getElementById("timer").textContent = timeLeft;

  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      engine.stopRenderLoop();

      // Affiche l’écran You Lose
      const loseMenu = document.getElementById("loseMenu");
      loseMenu.style.display = "flex";
      document.exitPointerLock();

      // Bouton Retry
      document.getElementById("retryButton").onclick = () => {
        // Recharger la page pour tout réinitialiser
        window.location.reload();
      };
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
  updateEurosUI();
  console.log("Niveau terminé, conversion en euros :", euros);
  openShopInterface();
}

function openShopInterface() {
  // 1) On pause le jeu et on stoppe le timer
  gamePaused = true;
  clearInterval(timerInterval);

  // 2) On affiche l’interface shop
  const shopInterface = document.getElementById("shopInterface");
  shopInterface.style.display = "flex";    // annule tout display:none inline
  shopInterface.classList.add("show");
  document.exitPointerLock();

  // 3) On rattache tous les handlers de boutons
  document.getElementById("buyRange").onclick            = buyRangeBonus;
  document.getElementById("buyFreeze").onclick           = buyFreezeBonus;
  document.getElementById("buySpeed").onclick            = buySpeedBonus;
  document.getElementById("buyDonate").onclick           = donateBonus;
  document.getElementById("buyCarrotLover").onclick      = buyCarrotLoverBonus;
  document.getElementById("buyInsurance").onclick        = buyInsuranceBonus;
  document.getElementById("niveauSuivant").onclick       = nextLevel;
  document.getElementById("closeShopBtn").onclick        = closeShopInterface;
}

function closeShopInterface() {
  const shopInterface = document.getElementById("shopInterface");
  shopInterface.classList.remove("show");
  // remove inline
  shopInterface.style.display = "none";

  canvas.requestPointerLock();
  gamePaused = false;
  startTimer(timeLeft);
}


function buyRangeBonus() {
  if (euros >= 1) {
    euros -= 1;
    audioManager.play("purchase");
    currentRangeMult += 0.2; // Augmente la portée de ramassage de 0.2
    player.pickupBox.scaling = player.pickupBox.scaling.multiplyByFloats(currentRangeMult, currentRangeMult, currentRangeMult);
    updateEurosUI();
    showToast("Range upgraded ! Actual multiplied : "+ currentRangeMult +".",2500);
    console.log("Bonus portée acheté");
  } else {
    console.log("Pas assez d'euros pour augmenter la portée");
    showToast("Not enough carrots !", 2500);
  }
}

function buyFreezeBonus(){
  if (freezeBought){ showToast("Already bought!"); return; }
  if (euros>=1){
    euros -= 1;
    audioManager.play("purchase");
    freezeBought = true;
    addSkillIcon("iconFreeze","images/gel.png",freezeCooldownDuration);   // <<< NEW icône
    updateEurosUI();
    showToast("Freeze unlocked !");
    document.getElementById("item-buyFreeze").style.display = "none";
  }else{
    showToast("Not enough carrots !");
  }
}

// Change dynamiquement l’image d’une aptitude déjà placée
function update_skillicon(id, newSrc){
  const img = document.getElementById(id);
  if (img) img.src = newSrc;
}

function triggerFreeze() {
  freezeActive   = true;
  freezeCooldown = true;
  lastFreezeTime = Date.now();

  // change l’icône pour indiquer le cooldown
  update_skillicon("iconFreeze", "images/gel_cd.png");
  showToast("Freeze activated ! 5 s");

  // applique le gel
  enemiesManager.enemies.forEach(e => e.freeze(5000));

  // fin de l’effet de gel au bout de 5 s
  setTimeout(() => {
    // dégel
    enemiesManager.enemies.forEach(e => e.frozen = false);
    freezeActive = false;
  }, 5000);

  startCooldown("iconFreeze");
  // fin du cooldown au bout de 60 s
  setTimeout(() => {
    freezeCooldown = false;
    update_skillicon("iconFreeze", "images/gel.png");
    showToast("Freeze is ready to be used !");
  }, freezeCooldownDuration);
}

function donateBonus() {
  console.log("donateBonus invoked – euros =", euros);
  if (euros >= 1) {
    euros -= 1;
    audioManager.play("purchase");
    updateEurosUI();
    showToast("Thanks for your generosity ! Your donation is heartwhelming !", 3000);
  } else {
    showToast("Not enough carrots !", 2500);
  }
}

function buySpeedBonus() {
  if (speedBought) {
    showToast("Already bought !");
    return;
  }
  if (euros >= 1) {
    euros    -= 1;
    audioManager.play("purchase");
    speedBought = true;
    // ajoute l’icône avec son cooldown
    addSkillIcon("iconSpeed", "images/speed.png", speedCooldownDuration);
    updateEurosUI();
    showToast("Speed boost unlocked !");
    document.getElementById("item-buySpeed").style.display = "none";
  } else {
    showToast("Not enough carrots !");
  }
}

function triggerSpeed() {
  speedActive   = true;
  speedCooldown = true;
  lastSpeedTime = Date.now();

  update_skillicon("iconSpeed", "images/speed_cd.png");
  showToast("Speed boost activated ! 10 s");

  // applique le multiplicateur
  player.speedMult = 1.5;


  // --- NOUVEAU : création du système de particules sous les pieds ---
  // 1) Emplacement sous les pieds
  const emitterNode = new BABYLON.TransformNode("speedEmitter", scene);
  emitterNode.parent   = player.mesh;
  emitterNode.position = new BABYLON.Vector3(0, 0.1, 0); // 2 unités sous le centre

  // 2) Création du ParticleSystem
  const ps = new BABYLON.ParticleSystem("speedPS", 150, scene);
  ps.particleTexture = new BABYLON.Texture("images/flare.png", scene); // ou un sprite fin

  // 3) On émet dans un petit volume plat sous les pieds
  const box = new BABYLON.BoxParticleEmitter();
  box.minEmitBox = new BABYLON.Vector3(-1, 0, -0.5);
  box.maxEmitBox = new BABYLON.Vector3( 1, 0,  0.5);
  ps.particleEmitterType = box;

  // 4) Couleurs jaune vif
  ps.color1    = new BABYLON.Color4(1, 1, 0,   1.0);  // jaune opaque
  ps.color2    = new BABYLON.Color4(1, 1, 0.2, 0.6);  // jaune semi-transparent
  ps.colorDead = new BABYLON.Color4(1, 1, 0,   0.0);  // disparaît

  // 5) Traits très fins
  ps.minSize     = 0.05;
  ps.maxSize     = 0.1;

  // 6) Très courte durée de vie
  ps.minLifeTime = 0.2;
  ps.maxLifeTime = 0.4;

  // 7) Pas beaucoup de particules
  ps.emitRate    = 200;

  // 8) Direction vers le bas (soit juste sous le joueur)
  ps.direction1 = new BABYLON.Vector3(0, -1, 0);
  ps.direction2 = new BABYLON.Vector3(0, -2, 0);
  ps.gravity    = new BABYLON.Vector3(0, -9.81, 0);

  ps.updateSpeed = 0.01;
  ps.emitter     = emitterNode;
  ps.start();

  // → Arrêter le système à la fin du boost (10 s)
  setTimeout(() => {
    ps.stop();
    // donner un petit délai pour bien tout nettoyer
    setTimeout(() => {
      ps.dispose();
      emitterNode.dispose();
    }, 500);
  }, speedDuration);
  // --- FIN de l’effet particules ---


  // fin de l’effet au bout de 10 s
  setTimeout(() => {
    player.speedMult = 1.0;
    speedActive = false;
  }, speedDuration);

  startCooldown("iconSpeed");
  // recharge …
  setTimeout(() => {
    speedCooldown = false;
    update_skillicon("iconSpeed", "images/speed.png");
    showToast("Speed boost is ready to be used !");
  }, speedCooldownDuration);
}


function buyCarrotLoverBonus() {
  if (euros >= 1) {
    euros -= 1;
    audioManager.play("purchase");
    carrotLoverStacks++;
    updateEurosUI();
    showToast(`Carrot Lover already bought ! Level : ${carrotLoverStacks}`, 3000);
  } else {
    showToast("Not enough carrots !", 2500);
  }
}

function buyInsuranceBonus() {
  if (insuranceBought) {
    showToast("Already bought !");
    return;
  }
  if (euros >= 1) {
    euros -= 1;
    audioManager.play("purchase");
    insuranceBought = true;
    updateEurosUI();
    showToast("Insure activated for the next level !", 3000);
    document.getElementById("item-buyInsurance").style.display = "none";
  } else {
    showToast("Not enough carrots !", 2500);
  }
}

function handlePlayerDeath( counter) {

  if (playerDead || invulnerable) return;   // ← Ajouté
  playerDead = true;
  gamePaused = true;            // stoppe IA, déplacements, etc.


  // UI
  const deathScreen   = document.getElementById("deathScreen");
  const respawnSpan   = document.getElementById("respawnTimer");
  respawnSpan.textContent = counter;
  deathScreen.style.display = "block";
  document.exitPointerLock();

  const int = setInterval(() => {
    counter--;
    respawnSpan.textContent = counter;
    if (counter <= 0) {
      clearInterval(int);
      respawnPlayer();
    }
  }, 1000);
}

// Affiche un message court pendant une durée donnée
function showToast(message, duration = 2000) {
  const t = document.getElementById("toast");
  t.textContent   = message;
  t.style.opacity = "1";
  t.style.display = "block";

  // disparition progressive
  setTimeout(() => {
    t.style.transition = "opacity .5s";
    t.style.opacity    = "0";
    setTimeout(() => {
      t.style.display   = "none";
      t.style.transition = "";
    }, 500);
  }, duration);
}

function respawnPlayer() {
  // remet le lapin à son spawn
  player.reset_position(scene);
  enemiesManager.resetAll();

  // cache l’UI
  document.getElementById("deathScreen").style.display = "none";
  canvas.requestPointerLock();

  playerDead = false;
  gamePaused = false;

  // 1 s de grâce pour sortir de la hit‑box
  invulnerable = true;
  setTimeout(() => invulnerable = false, 1000);
}

function addSkillIcon(id, src, cooldownMs) {
  const bar = document.getElementById("skillsBar");
  if (bar.children.length === 0) bar.style.display = "flex";
  if (bar.children.length >= 3) return;

  const wrapper = document.createElement("div");
  wrapper.className = "skill";
  wrapper.style.position = "relative";
  wrapper.dataset.cooldownMs = cooldownMs;

  const img = document.createElement("img");
  img.id  = id;
  img.src = src;
  wrapper.appendChild(img);

  const cdText = document.createElement("span");
  cdText.id = `${id}_cd`;
  Object.assign(cdText.style, {
    position:   "absolute",
    top:        "-18px",
    left:       "50%",
    transform:  "translateX(-50%)",
    fontSize:   "14px",
    color:      "white",
    textShadow: "0 0 4px black",
    display:    "none"
  });
  wrapper.appendChild(cdText);

  bar.appendChild(wrapper);
} 

function startCooldown(iconId) {
  const wrapper  = document.getElementById(iconId).parentElement;
  const cdSpan   = document.getElementById(`${iconId}_cd`);
  const duration = parseInt(wrapper.dataset.cooldownMs, 10);
  let remaining   = Math.ceil(duration / 1000);

  cdSpan.textContent   = remaining;
  cdSpan.style.display = "block";

  const iv = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(iv);
      cdSpan.style.display = "none";
    } else {
      cdSpan.textContent = remaining;
    }
  }, 1000);
}

function nextLevel() {
  closeShopInterface();
  if (currentLevel < maxLevel) {

    currentLevel++;
    orbsTarget = currentLevel * 5;
    collectedOrbs = 0;

     // 1) On replace immédiatement le joueur au spawn
     player.reset_position(scene);

     // 2) Puis on (ré‑)initialise invulnérabilité si besoin
     invulnerable = true;
     setTimeout(() => invulnerable = false, 1000);


    console.log("[DEBUG] nextLevel() début, gamePaused=", gamePaused);
    gamePaused = false;
    console.log("[DEBUG] nextLevel() après unpause, gamePaused=", gamePaused);

    clearInterval(timerInterval);
    startTimer(timerDuration); // redémarre le timer

    // Dispose les objets spécifiques du niveau précédent (coffre, table...)
    clearLevelObjects();

    // Dispose les orbes du niveau précédent
    orbsManager.orbs.forEach(orb => orb.dispose());

    // Réinitialise le manager d'orbes pour le nouveau niveau
    orbsManager = new OrbsManager(scene);

    // Charge le nouveau niveau
    ground = createGround(scene, currentLevel);



    canvas.requestPointerLock();
    console.log("Niveau", currentLevel, "lancé");
    // Réinitialiser la position du joueur à son point de départ
    
  } else {
    alert("Félicitations, vous avez terminé les niveaux");
    engine.stopRenderLoop();
  }
}
