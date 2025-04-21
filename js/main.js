import Player from "./Player.js";
import OrbsManager from "./OrbsManager.js";
import EnemiesManager from "./EnemiesManager.js";
import MiniGameManager from "./MiniGameManager.js";
import FishingManager from "./FishingManager.js";


let canvas;
let engine;
let scene;
let inputStates = {};
let player;
let orbsManager;
let enemiesManager;
let fishingManager;
let ground;
let camera
let finishMesh = null;


globalThis.HK = await HavokPhysics();




let timeLeft = 200; // Temps en secondes par niveau
let timerInterval;
let gamePaused = false;

let spawnPosition;          // mémorise la position de départ
let playerDead = false;     // true pendant les 3 s
let invulnerable = false;  // invulnérabilité temporaire après respawn

// Système de niveaux
let currentLevel = 1;
const maxLevel = 10;
let orbsTarget = currentLevel * 5; // Exemple : niveau 1 = 5 orbes, niveau 2 = 10, etc.
let collectedOrbs = 0; // Compteur d'orbes collectées 




// Boutique / monnaie
let euros = 0; // Solde en €
let currentRangeMult = 1; // Multiplie la portée de ramassage


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
document.getElementById("playButton").addEventListener("click", async () => {
  
  console.log("Bouton Jouer cliqué");
  document.getElementById("menu").style.display = "none";
  timerDiv.style.display = "block";
  eurosDiv.style.display = "block";
  const bgMusic = await startGame(); // Attendre que la musique soit prête
  bgMusic.play(); // Jouer la musique
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


  //musique
  // Juste après avoir créé votre <canvas> et avant d’instancier l’Engine
  // Désactive le bouton “Unmute” par défaut
  BABYLON.Engine.audioEngine.useCustomUnlockedButton = true;



  if (!BABYLON.Engine.audioEngine.unlocked) {
    BABYLON.Engine.audioEngine.unlock();
  }
 

  startTimer();

  engine.runRenderLoop(() => {
    if (gamePaused) {
      scene.render();
      return;
    }

    if (!player.canJump) {
      inputStates.jump = 0;
    }

      


    // Vérification des collisions avec les orbes
    orbsManager.checkCollisions(player, () => {
      const baseGain = 5;
      const bonus    = carrotLoverStacks;               // +1 par stack
      const total    = baseGain + bonus;
      euros += total;
      updateEurosUI();
      showToast(`+${total} carottes${bonus>0 ? ` (${baseGain}+${bonus})` : ""}`, 1500);
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

    updateEurosUI();

    chests.forEach(({ mesh, id }) => {
      if (chestOpened[id]) return;  // déjà ouvert
      const d = BABYLON.Vector3.Distance(player.mesh.position, mesh.position);
      if (d < 3) {
        promptDiv.style.display = "block";
        if (inputStates.interact) {
          euros += 15;
          updateEurosUI();
          chestOpened[id] = true;
          mesh.dispose();
          promptDiv.style.display = "none";
        }
      }
    });

    // Vérification des collisions avec les ennemis
    if (!playerDead && !invulnerable && currentLevel >= 2) {
      enemiesManager.enemies.forEach(enemy => {
        if (enemy.mesh.intersectsMesh(player.mesh, false)) {
          handlePlayerDeath(5);
        }
      });
    }

    if (!playerDead && !invulnerable && player.mesh.position.y < -50) {
      if (insuranceBought && !insuranceUsed) {
        // utilisation de l’assurance‑vie
        insuranceUsed = true;
        player.reset_position(scene);
        showToast("Votre assurance‑vie vous ramène au spawn !", 3000);
        // accordez 1 s d’invulnérabilité pour éviter d’enchainer sur un autre kill immédiat
        invulnerable = true;
        setTimeout(() => invulnerable = false, 1000);
      } else {
        handlePlayerDeath(10);
      }
    }


    // —— mini‑jeu de pêche par distance ——
    if (pondPosition && !fishingManager.isFishing) {
      const d = BABYLON.Vector3.Distance(player.mesh.position, pondPosition);
      if (d < 22) {
        // on est proche du pond
        promptDiv.textContent = "Appuyez sur E pour pêcher";
        promptDiv.style.display = "block";
        if (inputStates.interact) {
          fishingManager.show();
          promptDiv.style.display = "none";
        }
      } else {
        promptDiv.style.display = "none";
      }
    }

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

    scene.onBeforeRenderObservable.add(() => {
      const dt = scene.getEngine().getDeltaTime() * 0.001;
      time += dt;

      const alpha = (Math.sin(time * speed) + 1) / 2;
      const newPos = BABYLON.Vector3.Lerp(p_from, p_to, alpha);
      const prevPos = platform.position.clone();

      aggregate.body.setTargetTransform(newPos, platform.rotationQuaternion ?? BABYLON.Quaternion.Identity());

      // Calcul manuel de la vélocité
      platform.userVelocity = newPos.subtract(prevPos).scale(1 / dt);
    });
  });
    /*
    var platform = meshes[1];

    var platformAggregate = new BABYLON.PhysicsAggregate(platform, BABYLON.PhysicsShapeType.MESH, { mass: 0 , restitution: 0.3 , friction: 10 });
    platformAggregate.body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);

    let timer = 0; // Timer pour la plateforme animée
    let xPos = platform.position.x; // Position initiale de la plateforme
    scene.onBeforeRenderObservable.add(() => {
      const delta = engine.getDeltaTime() * 0.001;
      timer += delta;
      xPos = 2 * Math.sin(timer * 0.5)
      platform.physicsBody.setTargetTransform(new BABYLON.Vector3(xPos, 1, 2), new BABYLON.Quaternion());
  });


/*
    platform.receiveShadows = true;
    platform.position = pathPoints[0].clone(); // position initiale
    platform.scaling = new BABYLON.Vector3(3, 3, 3); // Ajuste la taille de la plateforme

    console.log("Plateforme importée :");

    // 2. Crée une animation sur la propriété position
    const frameRate = 60;
    const animation = new BABYLON.Animation(
      "platformAnim",
      "position",
      frameRate,
      BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    );

    // 3. Construis les keyframes en fonction de ton chemin
    const keys = [];
    const totalFrames = pathPoints.length * frameRate; 
    pathPoints.forEach((p, i) => {
      keys.push({
        frame: i * frameRate,
        value: p.clone()
      });
    });
    // on boucle : retourne au premier point
    keys.push({
      frame: totalFrames,
      value: pathPoints[0].clone()
    });

    animation.setKeys(keys);

    // 4. Attache l’anim à la plateforme
    platform.animations = [animation];

    // 5. Lance-la en boucle
    scene.beginAnimation(platform, 0, totalFrames, true, speed);*/
  
}

function createChest(x, y, z, chestId) {
  BABYLON.SceneLoader.ImportMesh(
    "", "images/", "chest.glb", scene,
    (meshes, particleSystems, skeletons, animationGroups) => {
      // Arrête toute anim du GLB
      animationGroups.forEach(g => g.stop());
      const chest = meshes[0];
      chest.position = new BABYLON.Vector3(x, y, z);
      chest.scaling  = new BABYLON.Vector3(4, 4, 4);
      chest.checkCollisions = false;
      // Stocke dans la liste
      chests.push({ mesh: chest, id: chestId });
      // Initialise son état
      chestOpened[chestId] = false;
    }
  );
}

function createScene() {
  
  let scene = new BABYLON.Scene(engine);
  var gravityVector = new BABYLON.Vector3(0, -9.81, 0);
  const physicsPlugin = new BABYLON.HavokPlugin(false);
  scene.enablePhysics(gravityVector, physicsPlugin);
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


  // Par exemple juste après avoir instancié player et enemiesManager :
  scene._shadowGenerator.addShadowCaster(player.mesh);

  // Pour chaque ennemi importé :
  enemiesManager.enemies.forEach(e => {
    scene._shadowGenerator.addShadowCaster(e.mesh);
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

    player.move(inputStates, camera);

    let down = new BABYLON.Vector3(0, -1, 0);
    let support = player.controller.checkSupport(dt, down);
    console.log("Supported state:", support.supportedState);
    console.log("Average normal:", support.averageSurfaceNormal.toString());
    console.log("Average velocity:", support.averageSurfaceVelocity.toString());
    console.log("Supported Mesh:", support.supportedMesh?.name ?? "none");

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
  finishMesh.position.set(x, y, z); // <-- coordonnées fixes
  finishMesh.isVisible = true; // Rendre la boîte invisible (utilisée uniquement pour les collisions)
  finishMesh.checkCollisions = true; // Activer les collisions pour la boîte

  // Charger le modèle finish.glb pour l'apparence
  BABYLON.SceneLoader.ImportMesh("", "images/", "finish.glb", scene, (meshes) => {
      const finishModel = meshes[0]; // On suppose que le premier mesh est le modèle principal
      finishModel.parent = finishMesh; // Attacher le modèle à la boîte
      finishModel.position = new BABYLON.Vector3(0,-3.5, 0); // Centrer le modèle sur la boîte
      finishModel.scaling = new BABYLON.Vector3(1, 1, -1); // Ajuster l'échelle si nécessaire
      console.log("Modèle finish.glb chargé et attaché à la boîte");
  });
  }


function createGamblingTable (x,y,z) {
          // Charger le modèle gamblingtable.glb
          BABYLON.SceneLoader.ImportMesh("", "images/", "gamblingtable.glb", scene, (meshes) => {
            gamblingTableMesh = meshes[0]; // On suppose que le premier mesh est la table
            gamblingTableMesh.position = new BABYLON.Vector3(x, y, z); // Ajustez les coordonnées
            gamblingTableMesh.scaling = new BABYLON.Vector3(4, 4, 4); // Ajustez l'échelle si nécessaire
            gamblingTableMesh.isVisible = true;
        
            // Activer les collisions pour la table
            gamblingTableMesh.checkCollisions = true;
            meshes.forEach(m => {
              m.receiveShadows = true;  // ombres
              if (!(m.name == "__root__")) {
                new BABYLON.PhysicsAggregate(m, BABYLON.PhysicsShapeType.MESH);
              }
            });

            //zone de la table
            miniGameTriggerZone = BABYLON.MeshBuilder.CreateBox("miniZone", { size: 3 }, scene);
            miniGameTriggerZone.position = gamblingTableMesh.position.clone(); // Placez le cube au même endroit que la table
            miniGameTriggerZone.isVisible = false; // Rendre le cube invisible (ou semi-transparent si nécessaire)
            miniGameTriggerZone.checkCollisions = true; // Activer les collisions pour la zone
            new BABYLON.PhysicsAggregate(miniGameTriggerZone, BABYLON.PhysicsShapeType.MESH);

            // Créer une zone en cube autour de la table pour gérer les interactions
            miniGameZone = BABYLON.MeshBuilder.CreateBox("miniZone", { size: 6 }, scene);
            miniGameZone.position = gamblingTableMesh.position.clone(); // Placez le cube au même endroit que la table
            miniGameZone.isVisible = true; // Rendre le cube invisible (ou semi-transparent si nécessaire)
        
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


let importedMeshes = []; // Tableau pour stocker les meshes importés
function createGround(scene, level) {

  // Supprime les meshes importés précédemment
  if (importedMeshes.length > 0) {
      importedMeshes.forEach(mesh => mesh.dispose());
      importedMeshes = []; // Réinitialise le tableau
  }

  if (level === 1) {
      BABYLON.SceneLoader.ImportMesh("", "images/", "niveau1.glb", scene, function (meshes) {


        BABYLON.SceneLoader.ImportMesh("", "images/", "grass.glb", scene, function (grassMeshes) {
          
        });
          // Stocke les meshes importés
          importedMeshes = meshes;

          // Affectez chaque mesh importé au parent et activez les collisions
          meshes.forEach((mesh) => {
              mesh.checkCollisions = true;
              mesh.isPickable = false; 
              if (!(mesh.name == "__root__")) {
                new BABYLON.PhysicsAggregate(mesh, BABYLON.PhysicsShapeType.MESH);
              }

          });
          const spawnPositions = [
              new BABYLON.Vector3(36, 2, -11),
              new BABYLON.Vector3(-20, 3, 13),
              new BABYLON.Vector3(-1, 3, 44),
              new BABYLON.Vector3(38, 3, -5),
              new BABYLON.Vector3(20, 3, -38),
          ];

          orbsManager.createOrbsAtPositions(spawnPositions);

          console.log("Map t.glb chargée et ajustée pour le niveau 1");

          createFinishPoint(6.6, 3.7, -82); // <-- coordonnées fixes

          

          createChest( 0.7, 0, -49,  `lvl1_chest1` );
          createChest( 0.7, 0, -99,  `lvl1_chest2` );

          createGamblingTable (31,0,-64);


          // 1) Crée tes plateformes statiques à partir de plat.glb
          
          const p1_from = new BABYLON.Vector3(0, 2, 0);
          const p1_to   = new BABYLON.Vector3(10, 5, 10);
          createMovingPlatform(scene, p1_from, p1_to, 0.8);

          
          BABYLON.SceneLoader.ImportMesh("", "images/", "pond.glb", scene, (meshes) => {
            // On positionne le plan d'eau
            meshes[0].position = new BABYLON.Vector3(66, 0, -130);
            pondPosition = meshes[0].position.clone();
            meshes.forEach(m => {
              m.checkCollisions  = true;
              m.receiveShadows   = true;
              if (!(m.name == "__root__")) {
                new BABYLON.PhysicsAggregate(m, BABYLON.PhysicsShapeType.MESH);
              }
            });
          
            // Création de la hit‑box invisible
            const pondZone = BABYLON.MeshBuilder.CreateBox("pondZone", { size: 1 }, scene);
            pondZone.position        = meshes[0].position.clone();
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
                  showToast("Appuyez sur E pour pêcher", 2000);
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
                window.removeEventListener("keydown", onEnterFishing);
              }
            }
          });

          
      });
      return null;
  } else if (level === 2) {
      BABYLON.SceneLoader.ImportMesh("", "images/", "niveau1.glb", scene, function (meshes) {
          // Stocke les meshes importés
          importedMeshes = meshes;

          // Affectez chaque mesh importé au parent et activez les collisions
          meshes.forEach((mesh) => {
              mesh.checkCollisions = true;
              mesh.isPickable = false; 
              if (!(mesh.name == "__root__")) {
                new BABYLON.PhysicsAggregate(mesh, BABYLON.PhysicsShapeType.MESH);
              }

          });
          const spawnPositions = [
              new BABYLON.Vector3(36, 2, -11),
              new BABYLON.Vector3(-20, 3, 13),
              new BABYLON.Vector3(-1, 3, 44),
              new BABYLON.Vector3(38, 3, -5),
              new BABYLON.Vector3(20, 3, -38),
          ];

          orbsManager.createOrbsAtPositions(spawnPositions);

          console.log("Map t.glb chargée et ajustée pour le niveau 1");

          createFinishPoint(6.6, 3.7, -82); // <-- coordonnées fixes


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
  
  
  
function clearLevelObjects() {
  chests.forEach(({ mesh }) => mesh.dispose());
  chests.length = 0;

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

}




function createLights(scene) {
  // Lumière ambiante douce
  const hemi = new BABYLON.HemisphericLight("hemiLight",
    new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.4;

  // Lumière directionnelle pour les ombres
  const dir = new BABYLON.DirectionalLight("dirLight",
    new BABYLON.Vector3(-1, -2, 1), scene);
  dir.position = new BABYLON.Vector3(20, 40, 20);
  dir.intensity = 1.0;

  // ShadowGenerator de résolution 2048px
  const shadowGen = new BABYLON.ShadowGenerator(2048, dir);
  shadowGen.useBlurExponentialShadowMap = true;       // ombres plus douces
  shadowGen.blurKernel = 32;                          // flou

  // Exposez le shadowGen pour pouvoir y ajouter vos casters plus tard
  scene._shadowGenerator = shadowGen;
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
        inputStates.jump++;
        player.wantJump ++;
        break;
      case "r":
        player.reset_position(scene);
        break;
      case "e":
        inputStates.interact = true;
        break;
      case "a":                            // <<< NEW
        if (freezeBought && !freezeActive && !gamePaused){
          if (freezeCooldown) {
            const remaining = Math.ceil((freezeCooldownDuration - (Date.now() - lastFreezeTime)) / 1000);
            showToast("GEL : En attente de recharge... " + remaining + "s restantes", 2500);
            return;                             // pas de cooldown
          } else {
          triggerFreeze();
          }
        }
      break;
      case "r":
        if (!speedBought) {
          showToast("Speed non débloqué !");
        } else if (speedActive) {
          showToast("Speed déjà actif !");
        } else if (speedCooldown) {
          // on ne fait rien, le cooldown est visible sur l’icône
        } else if (!gamePaused) {
          triggerSpeed();
        }
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
  updateEurosUI();
  console.log("Niveau terminé, conversion en euros :", euros);
  openShopInterface();
}

function openShopInterface() {
  const shopInterface = document.getElementById("shopInterface");
  shopInterface.classList.add("show");
  document.exitPointerLock();
  document.getElementById("buyRange").onclick = buyRangeBonus;
  document.getElementById("niveauSuivant").onclick = nextLevel;
  document.getElementById("buyFreeze").onclick = buyFreezeBonus;
  document.getElementById("buySpeed").onclick   = buySpeedBonus;
  document.getElementById("buyDonate").onclick  = donateBonus;
  document.getElementById("buyCarrotLover").onclick = buyCarrotLoverBonus;
  document.getElementById("buyInsurance").onclick   = buyInsuranceBonus;
  console.log("affichage boutique :", euros);
}

function closeShopInterface() {
  canvas.requestPointerLock();
  document.getElementById("shopInterface").style.display = "none";
  shopInterface.classList.remove("show");
}


function buyRangeBonus() {
  if (euros >= 1) {
    euros -= 1;
    currentRangeMult += 0.2; // Augmente la portée de ramassage de 0.2
    player.pickupBox.scaling = player.pickupBox.scaling.multiplyByFloats(currentRangeMult, currentRangeMult, currentRangeMult);
    updateEurosUI();
    showToast("✓ Portée augmentée ! Multiplicateur actuel : "+ currentRangeMult +".",2500);
    console.log("Bonus portée acheté");
  } else {
    console.log("Pas assez d'euros pour augmenter la portée");
    showToast("Pas assez de carottes !", 2500);
  }
}

function buyFreezeBonus(){
  if (freezeBought){ showToast("Déjà acheté !"); return; }
  if (euros>=1){
    euros -= 1;
    freezeBought = true;
    addSkillIcon("iconFreeze","images/gel.png",freezeCooldownDuration);   // <<< NEW icône
    updateEurosUI();
    showToast("Sort Gel débloqué !");
    document.getElementById("item-buyFreeze").style.display = "none";
  }else{
    showToast("Pas assez de carottes !");
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
  showToast("Ennemis gelés ! 5 s");

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
    showToast("Sort Gel prêt à être relancé !");
  }, freezeCooldownDuration);
}

function donateBonus() {
  console.log("donateBonus invoked – euros =", euros);
  if (euros >= 1) {
    euros -= 1;
    updateEurosUI();
    showToast("Merci pour votre générosité ! Votre don fait chaud au cœur !", 3000);
  } else {
    showToast("Pas assez de carottes pour faire un don !", 2500);
  }
}

function buySpeedBonus() {
  if (speedBought) {
    showToast("Déjà acheté !");
    return;
  }
  if (euros >= 1) {
    euros    -= 1;
    speedBought = true;
    // ajoute l’icône avec son cooldown
    addSkillIcon("iconSpeed", "images/speed.png", speedCooldownDuration);
    updateEurosUI();
    showToast("Speed débloqué !");
    document.getElementById("item-buySpeed").style.display = "none";
  } else {
    showToast("Pas assez de carottes !");
  }
}

function triggerSpeed() {
  speedActive   = true;
  speedCooldown = true;
  lastSpeedTime = Date.now();

  // change l’icône pour indiquer le cooldown
  update_skillicon("iconSpeed", "images/speed_cd.png");
  showToast("Speed activé ! 10 s");

  // démarre le compteur visuel
  startCooldown("iconSpeed");

  // applique le multiplicateur
  player.currentSpeedMult = 1.4;

  // fin de l’effet au bout de 10 s
  setTimeout(() => {
    player.currentSpeedMult = 1;
    speedActive = false;
  }, speedDuration);

  // fin du cooldown après 60 s
  setTimeout(() => {
    speedCooldown = false;
    update_skillicon("iconSpeed", "images/speed.png");
    showToast("Speed prêt à être relancé !");
  }, speedCooldownDuration);
}

function buyCarrotLoverBonus() {
  if (euros >= 1) {
    euros -= 1;
    carrotLoverStacks++;
    updateEurosUI();
    showToast(`Carrot Lover acheté ! Niveau : ${carrotLoverStacks}`, 3000);
  } else {
    showToast("Pas assez de carottes pour Carrot Lover !", 2500);
  }
}

function buyInsuranceBonus() {
  if (insuranceBought) {
    showToast("Vous avez déjà cette assurance !");
    return;
  }
  if (euros >= 1) {
    euros -= 1;
    insuranceBought = true;
    updateEurosUI();
    showToast("Assurance‑vie activée pour ce niveau !", 3000);
    document.getElementById("item-buyInsurance").style.display = "none";
  } else {
    showToast("Pas assez de carottes pour l’assurance !", 2500);
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
    timeLeft = 30;
    document.getElementById("timer").textContent = timeLeft;

    // Dispose les objets spécifiques du niveau précédent (coffre, table...)
    clearLevelObjects();

    // Dispose les orbes du niveau précédent
    orbsManager.orbs.forEach(orb => orb.dispose());

    // Charge le nouveau niveau
    ground = createGround(scene, currentLevel);

    // Réinitialise le manager d'orbes pour le nouveau niveau
    orbsManager = new OrbsManager(scene);

    // Désactive temporairement les collisions pour l'invulnérabilité
    invulnerable = true;
    setTimeout(() => {
      invulnerable = false;
      player.reset_position(scene);
    }, 1000);  // 2 secondes d'invulnérabilité

    gamePaused = false;
    startTimer();
    canvas.requestPointerLock();
    console.log("Niveau", currentLevel, "lancé");
    // Réinitialiser la position du joueur à son point de départ
    
  } else {
    alert("Félicitations, vous avez terminé les niveaux");
    engine.stopRenderLoop();
  }
}
