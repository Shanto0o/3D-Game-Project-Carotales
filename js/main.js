import Player from "./Player.js";
import OrbsManager from "./OrbsManager.js";
import EnemiesManager from "./EnemiesManager.js";
import MiniGameManager from "./MiniGameManager.js";
import FishingManager from "./FishingManager.js";
import AudioManager from "./AudioManager.js";
import QuestManager from "./QuestManager.js";
import NPC from "./NPC.js";


let canvas;
let engine;
let scene;
let inputStates = {};
let player;
let orbsManager;
let enemiesManager;
let fishingManager;
let questManager;
let ground;
let audioManager;
let pondMesh;
let pondZone;
let camera;
let finishMesh = null;
let importedMeshes = [];
let movingPlatforms = [];
let npcMeshes = [];
let inspecting = false;
let finishMeshes = [];
const allAggregates = [];


globalThis.HK = await HavokPhysics();

let shadowGen;

let timerDuration = 200;
let timeLeft;
let timerInterval;
let gamePaused = false;
let lastBossHit = 0;

let spawnPosition;
let playerDead = false;
let invulnerable = false;


let currentLevel =3;
const maxLevel = 3;   
let orbsTarget = currentLevel * 5;
let collectedOrbs = 0;

let redBox;
let redBoxRemoved = false;


let locks = [];

let euros = 0;
let currentRangeMult = 1;

let shopPosition; 


let freezeBought   = false;
let freezeActive   = false;
let freezeCooldown = false;
const freezeCooldownDuration = 60_000;
let lastFreezeTime = 0;


let speedBought    = false;
let speedActive    = false;
let speedCooldown  = false;
const speedDuration        = 10_000;
const speedCooldownDuration= 60_000;
let lastSpeedTime  = 0;

let carrotLoverStacks = 0;

let insuranceBought = false;
let insuranceUsed   = false;

let miniGameManager;

const FINISH_THRESHOLD = 3;

const RADIUS_EPSILON = 0.1;   // variations inférieures à 0.1u seront ignorées
const SMOOTHING     = 0.1;   // interpolation lente et uniforme

let repairStationMesh;

let cutsceneActive = false;
let preLockCamState = null;
let lockCamera = null;

let quest1Started  = false;
let quest1Finished = false;
const QUEST1_LIMIT = 90; // secondes
let quest1StartZone;
let quest1EndZone;
let challengeTimer;
let quest1AttemptsLeft = 2;
let abortAttemptBtn;




const chests = [];
const chestOpened = {};

let gamblingTableMesh = null;
let miniGameZone = null;
let miniGameTriggerZone = null;

let pondPosition;

let preFishingCameraState = null;


function animateCameraToFishingView() {
  preFishingCameraState = {
    alpha:  camera.alpha,
    beta:   camera.beta,
    radius: camera.radius,
    target: camera.target.clone()
  };

  const fishingTarget = pondPosition.clone();

  const fps = 30, durationFrames = fps * 2;
  camera.animations = [];

  const animBeta = new BABYLON.Animation(
    "betaAnim", "beta", fps,
    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
  );
  animBeta.setKeys([
    { frame: 0,              value: preFishingCameraState.beta },
    { frame: durationFrames, value: Math.PI / 8 }
  ]);
  camera.animations.push(animBeta);

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


function animateCameraToPlayerView() {
  if (!preFishingCameraState) return;

  const fps = 30, durationFrames = fps * 2;
  camera.animations = [];

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


const timerDiv = document.getElementById("timerDisplay");
const eurosDiv = document.getElementById("eurosDisplay");





document.getElementById("playButton").addEventListener("click", () => {
  console.log("Bouton Jouer cliqué — affichage de l'intro");
  document.getElementById("menu").style.display = "none";
  document.getElementById("introInterface").style.display = "flex";
});

document.getElementById("introContinue").addEventListener("click", async () => {
  console.log("Intro terminée — démarrage du jeu");
  document.getElementById("introInterface").style.display = "none";
  timerDiv.style.display = "block";
  eurosDiv.style.display = "block";
  const bgMusic = await startGame();
  bgMusic.play();
  canvas.requestPointerLock();
});


function createSmokeEffect(pos) {
  const ps = new BABYLON.ParticleSystem("smoke", 100, scene);
  ps.particleTexture = new BABYLON.Texture("images/smoke.png", scene);
  ps.minEmitBox = new BABYLON.Vector3(-1, 0, -1);
  ps.maxEmitBox = new BABYLON.Vector3( 1, 2,  1);
  ps.color1 = new BABYLON.Color4(0.8,0.8,0.8,1);
  ps.color2 = new BABYLON.Color4(0.4,0.4,0.4,1);
  ps.minSize = 1; ps.maxSize = 2;
  ps.minLifeTime = 0.5; ps.maxLifeTime = 1.0;
  ps.emitRate = 50;
  ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
  ps.direction1 = new BABYLON.Vector3(-1,1,-1);
  ps.direction2 = new BABYLON.Vector3(1,2,1);
  ps.gravity = new BABYLON.Vector3(0,0.5,0);
  ps.emitter = pos.clone();
  ps.start();
  setTimeout(() => { ps.stop(); ps.dispose(); }, 1000);
}

function createDreamyExplosionPS(scene, position, durationMs = 4000) {
  const subsystems = [];

  function makeSystem(name, capacity, texturePath, emitter, configure) {
    const sys = new BABYLON.ParticleSystem(name, capacity, scene);
    sys.particleTexture     = new BABYLON.Texture(texturePath, scene);
    sys.emitter             = position.clone();
    sys.particleEmitterType = emitter;
    configure(sys);
    subsystems.push(sys);
  }

  // 1) Burst violet–rose
  makeSystem(
    "dreamBurst", 2000,
    "images/flare.png",
    new BABYLON.SphereParticleEmitter(1),
    sys => {
      sys.color1      = new BABYLON.Color4(0.6,0.1,0.8,1);
      sys.color2      = new BABYLON.Color4(1.0,0.5,0.9,1);
      sys.colorDead   = new BABYLON.Color4(0,0,0.2,0);
      sys.minSize     = 0.5;  sys.maxSize     = 4;    // un peu plus gros
      sys.minLifeTime = 0.5;  sys.maxLifeTime = 2.0;  // vie plus longue pour le fondu
      sys.emitRate    = 1500;
      sys.blendMode   = BABYLON.ParticleSystem.BLENDMODE_ADD;
      sys.direction1  = new BABYLON.Vector3(-1,-1,-1);
      sys.direction2  = new BABYLON.Vector3( 1, 1, 1);
    }
  );

  // 2) Sparks blanc–bleu
  makeSystem(
    "dreamSparks", 1000,
    "images/flareSmall.png",
    new BABYLON.BoxParticleEmitter(),
    sys => {
      sys.minEmitBox   = new BABYLON.Vector3(-1,-1,-1);  // étendu
      sys.maxEmitBox   = new BABYLON.Vector3( 1, 1, 1);
      sys.color1       = new BABYLON.Color4(1,1,1,1);
      sys.color2       = new BABYLON.Color4(0.5,0.7,1,1);
      sys.colorDead    = new BABYLON.Color4(0,0,0,0);
      sys.minSize      = 0.1;  sys.maxSize     = 0.7;
      sys.minLifeTime  = 0.5;  sys.maxLifeTime = 1.5;
      sys.emitRate     = 1000;
      sys.blendMode    = BABYLON.ParticleSystem.BLENDMODE_ADD;
      sys.minEmitPower = 2;    sys.maxEmitPower = 6;
      sys.updateSpeed  = 0.02;
    }
  );

  // 3) Fumée pastel
  makeSystem(
    "dreamSmoke", 1000,
    "images/smoke.png",
    new BABYLON.SphereParticleEmitter(1),
    sys => {
      sys.color1      = new BABYLON.Color4(0.8,0.6,1,0.5);
      sys.color2      = new BABYLON.Color4(1.0,0.8,1,0.3);
      sys.colorDead   = new BABYLON.Color4(1,1,1,0);
      sys.minSize     = 3;   sys.maxSize     = 6;
      sys.minLifeTime = 1.0; sys.maxLifeTime = 2.5;
      sys.emitRate    = 400;
      sys.blendMode   = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
      sys.gravity     = new BABYLON.Vector3(0,0.3,0);
    }
  );

  return {
    start() {
      subsystems.forEach(s => s.start());
      // Arrêt après durationMs
      this._stopId = setTimeout(() => this.stop(), durationMs);
    },
    stop() {
      subsystems.forEach(s => s.stop());
      clearTimeout(this._stopId);
      // Dispo après la durée max de vie pour laisser tout se dissiper
      const maxLife = Math.max(...subsystems.map(s => s.maxLifeTime)) * 1000;
      this._disposeId = setTimeout(() => this.dispose(), maxLife);
    },
    dispose() {
      clearTimeout(this._disposeId);
  clearTimeout(this._stopId);
    },
    /** met à jour le radius de TOUS les systèmes */
    setRadius(r) {
      subsystems.forEach(sys => {
        const em = sys.particleEmitterType;
        if (em instanceof BABYLON.SphereParticleEmitter) {
          em.radius = r;
        } else if (em instanceof BABYLON.BoxParticleEmitter) {
          sys.minEmitBox = new BABYLON.Vector3(-r, -r, -r);
          sys.maxEmitBox = new BABYLON.Vector3( r,  r,  r);
        }
      });
    }
  };
}



async function startGame() {

  
  canvas = document.querySelector("#renderCanvas");
  if (!canvas) {
    console.error("Canvas introuvable !");
    return;
  }
  engine = new BABYLON.Engine(
    canvas,
    true,
    { audioEngine: true },
    true
  );
  scene = createScene();

  audioManager = new AudioManager(scene);
  await Promise.all([
    audioManager.load("purchase", "images/purshased.wav", { volume: 0.1 }),
    audioManager.load("pickitem", "images/pickitem.wav", { volume: 0.2 }),
    audioManager.load("jump", "images/jump.wav",{ volume: 0.2 }),
    audioManager.load("fish", "images/fish.wav"),
    audioManager.load("fishnorm", "images/fishnormal.wav"),
    audioManager.load("dice", "images/dice.wav"),
    audioManager.load("fail", "images/fail.wav",{ volume: 0.2 }),
    audioManager.load("chest", "images/chest.mp3"),
    audioManager.load("horn", "images/horn.wav"),
    audioManager.load("lock", "images/lock.wav", { volume: 0.2 }),
    audioManager.load("watersplash", "images/watersplash.wav"),
    audioManager.load("trigger", "images/trigger.mp3", { volume: 0.1 }),
    audioManager.load("angry", "images/angry.wav", { loop : true, volume: 0.3}),
    audioManager.load("drop", "images/drop.mp3"),
    audioManager.load("explo", "images/explo.wav", { volume: 0.3 }),
    audioManager.load("miam", "images/miam.wav", { volume: 0.3 }),

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


  BABYLON.Engine.audioEngine.useCustomUnlockedButton = true;



  if (!BABYLON.Engine.audioEngine.unlocked) {
    BABYLON.Engine.audioEngine.unlock();
  }


  scene.collisionsEnabled = true;
  scene.gravity = new BABYLON.Vector3(0, -9.81, 0); // nécessaire si applyGravity=true
  modifySettings();
  camera = createThirdPersonCamera(scene, player.mesh);

  window.addEventListener('fishingEnded', () => {
    animateCameraToPlayerView();
    canvas.requestPointerLock();
  });


  
 

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
    orbsManager.checkCollisions(player, () => {
      audioManager.play("pickitem");
      const baseGain = 5;
      const bonus    = carrotLoverStacks;
      const total    = baseGain + bonus;
      euros += total;
      updateEurosUI();
      showToast(`+${total} carrots${bonus>0 ? ` (${baseGain}+${bonus})` : ""}`, 1500);
    });

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

   // ——— GESTION DU BOSS DANS LE RENDER LOOP ———
if (scene.bossMesh) {
  const bossPos = scene.bossMesh.position;
  const db = BABYLON.Vector3.Distance(player.mesh.position, bossPos);

  // — PHASE READY : attente du coup (seulement si le joueur est proche) —
  if (db < 18 && scene.bossPhase === "ready") {
    nearInteract = true;
    promptDiv.textContent = "Appuyez sur E pour attaquer le boss";

    if (inputStates.interact && Date.now() - lastBossHit >= 3000) {
      lastBossHit = Date.now();
      scene.bossHealth--;
      showToast(`Coup sur le boss ! (${3 - scene.bossHealth}/3)`, 1000);
      inputStates.interact = false;

      // Drop de la pièce
      const dropFiles = ["bonbon1.glb", "bonbon2.glb", "bonbon3.glb"];
      const idx       = 3 - scene.bossHealth - 1;
      const file      = dropFiles[idx];
      BABYLON.SceneLoader.ImportMesh("", "images/", file, scene, meshes => {
        const valid = meshes.filter(m =>
          m instanceof BABYLON.Mesh &&
          m.geometry &&
          m.geometry.getTotalVertices() > 0
        );
        if (valid.length === 0) return;
        const piece = BABYLON.Mesh.MergeMeshes(valid, true, true, undefined, false, true);
        const off = new BABYLON.Vector3((Math.random() - 0.5) * 2, 2, (Math.random() - 0.5) * 2);
        piece.position = bossPos.add(off);
        piece.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);
        piece.checkCollisions = true;
        piece.receiveShadows  = true;

        const agg = new BABYLON.PhysicsAggregate(piece, BABYLON.PhysicsShapeType.MESH, { mass:20, restitution:0.2 }, scene);
        agg.body.setLinearVelocity(new BABYLON.Vector3((Math.random()-0.5)*4, Math.random()*3+0.5, (Math.random()-0.5)*4));
        scene.bossPieces.push(piece);
        audioManager.play("drop");
      });

      // On bascule en phase attaque
      scene.bossPhase       = "attacking";
      scene.bossAttackStart = Date.now();
      scene.bossAttackTotal = 5000; // 4s
      scene.bossAttackMaxR  = 30;

      // Création de la zone de dégâts invisible
      const hitSphere = BABYLON.MeshBuilder.CreateSphere("hitSphere", { diameter: 1 }, scene);
      hitSphere.isVisible = false;
      hitSphere.position.copyFrom(bossPos);
      scene.bossAttackHitSphere = hitSphere;
      audioManager.play("explo");

      // Lance le système de particules

      const psw = createDreamyExplosionPS(scene, bossPos, scene.bossAttackTotal);
      scene.bossAttackPS = psw;
      psw.start();
    }
  }

  // — PHASE ATTACKING : en cours d’attaque (toujours active, même si le joueur s’éloigne) —
  if (scene.bossPhase === "attacking") {
    const now     = Date.now();
    const elapsed = now - scene.bossAttackStart;
    const total   = scene.bossAttackTotal;
    const maxR    = scene.bossAttackMaxR;
    const half    = total / 2;
    let radius;

    if (elapsed <= half) {
      radius = BABYLON.Scalar.Lerp(0, maxR, elapsed / half);
    } else {
      radius = maxR;
    }

    // Mise à jour de la zone de dégâts
    const hitSphere = scene.bossAttackHitSphere;
    hitSphere.scaling.set(radius, radius, radius);

    // Collision joueur
    if (BABYLON.Vector3.Distance(player.mesh.position, hitSphere.position) < radius) {
      handlePlayerDeath(5);
    }

    // Mise à jour des particules
    scene.bossAttackPS.setRadius(radius);

    // Fin de l’attaque
    if (elapsed >= total) {
  // 1) On supprime la zone de dégâts
  hitSphere.dispose();
  scene.bossAttackHitSphere = null;

  // 2) On stoppe l’émission mais on laisse les particules en vol
  const ps = scene.bossAttackPS;
  ps.emitRate = 0;
  ps.stop();

  // 3) On schedule la suppression totale après que la particule
  //    la plus longue terminera sa vie (maxLifeTime en secondes)
  const fadeOutMs = ps.maxLifeTime * 1000;
  setTimeout(() => {
    ps.dispose();
    scene.bossAttackPS = null;
  }, fadeOutMs);

  // 4) Retour à l’état “ready”
  scene.bossPhase = "ready";
}
  }

  // — SI LE BOSS MEURT —
  if (scene.bossHealth <= 0) {
    showToast("Boss vaincu ! Ramassez ses pièces…", 3000);
    scene.bossMesh.dispose();
    scene.bossMesh = null;

    if (scene.bossAttackHitSphere) {
      scene.bossAttackHitSphere.dispose();
      scene.bossAttackHitSphere = null;
    }
    if (scene.bossAttackPS) {
      scene.bossAttackPS.stop();
      scene.bossAttackPS.dispose();
      scene.bossAttackPS = null;
    }
    scene.bossPhase = null;
  }
}







    

    chests.forEach(({ mesh, id }) => {
      if (chestOpened[id]) return; 
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

    if (!redBoxRemoved) {
  // compte combien de cadenas ont été disposés
  const disposedCount = locks.filter(l => l.mesh?.isDisposed()).length;
  if (disposedCount >= 4 && redBox) {
    redBox.dispose();
    redBoxRemoved = true;
    console.log(`✅ ${disposedCount} cadenas supprimés — la grosse boîte rouge a disparu !`);
  }
}





    if (pondPosition && !fishingManager.isFishing) {
      const d = BABYLON.Vector3.Distance(player.mesh.position, pondPosition);
      if (d < 22) {
        promptDiv.textContent = "Press E to fish";
        nearInteract = true;
        if (inputStates.interact) {
          audioManager.play("watersplash");
          fishingManager.show();
          camera.detachControl(canvas);
          animateCameraToFishingView();
          inputStates.interact = false;
        }
      }
    }

    scene.bossPieces = scene.bossPieces.filter(piece => {
  const dist = BABYLON.Vector3.Distance(player.mesh.position, piece.position);
  if (dist < 2) {
    // on ramasse
    audioManager.play("pickitem");
    showToast("Bonbon collecté !", 2000);
    scene.collectedPieces.push(piece.name); // ou un id simple
    piece.dispose();
    return false;
  }
  return true;
});

if (
  scene.repairStation &&
  scene.collectedPieces.length > 0 &&
  (scene.repairStation._placed || 0) < 3   // ← on n’entre ici que si < 3 pièces déposées
) {
  const distr = BABYLON.Vector3.Distance(player.mesh.position, scene.repairStation.position);
  if (distr < 5) {
    nearInteract = true;
    promptDiv.textContent = "Appuyez sur E pour déposer une pièce";

    if (inputStates.interact) {
      const before = scene.repairStation._placed || 0;
      scene.repairStation._placed = before + 1;

      showToast(`Pièce posée ! (${scene.repairStation._placed}/3)`, 1000);

      const mark = BABYLON.MeshBuilder.CreateBox("mark_" + before, { size: 1 }, scene);
      mark.position = scene.repairStation.position.add(
        new BABYLON.Vector3(0, 1 + before * 1.2, 0)
      );
      mark.material = new BABYLON.StandardMaterial("mat_" + before, scene);

      inputStates.interact = false;

      // si c’était la 3ᵉ, on complète la quête et on désactive le prompt
      if (scene.repairStation._placed >= 3) {
        scene.ItemPose = true;
        showToast("Machine réparée ! Quête terminée.", 3000);
        questManager.completeQuest("quest3");
        const npc1 = npcMeshes.find(npc => npc.id === "quest3");
  if (npc1 && npc1.mesh.actionManager) {
    npc1.mesh.actionManager.dispose();
    // on cache aussi l'invite
    promptDiv.style.display = "none";
  }
        // (optionnel) on peut aussi mettre un flag pour supprimer le prompt ou le mesh :
        // scene.repairStation = null;
      }
    }
  }
}

    // ——— Quête 2 : ramasser la clé ———
    if (scene.keyMesh && !scene.keyPicked) {
      const distKey = BABYLON.Vector3.Distance(player.mesh.position, scene.keyMesh.position);
      if (distKey < 3) {
        nearInteract = true;
        promptDiv.textContent = "Appuyez sur E pour prendre la clé";
        if (inputStates.interact) {
          scene.keyMesh.dispose();
          scene.keyPicked = true;
          showToast("Vous avez récupéré la clé !", 2000);
          // Change le titre de la quête dans le carnet
          const q2 = questManager.quests.find(q => q.id === "quest2");
          if (q2) {
            q2.title = "Ramenez la clé à l'officier";
            questManager._render();
          }
          inputStates.interact = false;
        }
      }
    }




    const q1 = questManager.quests.find(q => q.id === "quest1");

// 1) Démarrage (si tentatives encore dispo)
if (
  q1?.status === "pending" &&
  !quest1Started &&
  !quest1Finished &&
  quest1AttemptsLeft > 0 &&
  player.mesh.intersectsMesh(quest1StartZone, false)
) {
  quest1Started = true;
  questManager.startTime("quest1");
  challengeTimer.style.display  = "block";
  abortAttemptBtn.style.display = "block";
  updateQuest1AttemptsDisplay();
}

// 2) En cours de tentative
if (quest1Started && !quest1Finished) {
  const elapsed   = questManager.elapsedSeconds("quest1");
  const remaining = QUEST1_LIMIT - elapsed;

  if (remaining > 0) {
    // MAJ du chrono mm:ss
    const m = Math.floor(remaining / 60).toString().padStart(2, "0");
    const s = Math.floor(remaining % 60).toString().padStart(2, "0");
    document.getElementById("challengeTime").textContent = `${m}:${s}`;

    // Succès
    if (player.mesh.intersectsMesh(quest1EndZone, false)) {
      quest1Finished        = true;
      scene.JumpFini = true;
      quest1Started         = false;
      challengeTimer.style.display  = "none";
      abortAttemptBtn.style.display = "none";
      questManager.completeQuest("quest1");
      const npc1 = npcMeshes.find(npc => npc.id === "quest1");
  if (npc1 && npc1.mesh.actionManager) {
    npc1.mesh.actionManager.dispose();
    // on cache aussi l'invite
    promptDiv.style.display = "none";
  }
      showToast("Bravo ! Tu as relevé le défi.", 3000);
    }
  } else {
    // Échec de la tentative
    quest1Started         = false;
    quest1AttemptsLeft--;
    challengeTimer.style.display  = "none";
    abortAttemptBtn.style.display = "none";
    updateQuest1AttemptsDisplay();

    if (quest1AttemptsLeft > 0) {
      showToast(`Temps écoulé ! Tentatives restantes : ${quest1AttemptsLeft}`, 3000);
    } else {
      // Plus de tentatives → pitié
      quest1Finished = true;
      showToast("Plus de tentatives… l'officier ouvre le cadenas par pitié.", 4000);
      questManager.completeQuest("quest1");
    }
  }
}

    scene.angryplaying = false;

    

 promptDiv.style.display = nearInteract ? "block" : "none";

    scene.render();
  });

  return new Promise((resolve) => {
    const bgMusic = new BABYLON.Sound(
      "BackgroundMusic",
      "images/Velvetride.mp3",
      scene,
      () => {
        console.log("🎵 Musique chargée !");
        resolve(bgMusic);
      },
      { loop: true, autoplay: false, volume: 0.01 , streaming: true, spatialSound: false }
    );
  });
}

function createMovingPlatform(scene, p_from, p_to, speed = 2) {
  BABYLON.SceneLoader.ImportMesh("", "images/", "plat.glb", scene, (meshes) => {
    // 1) Récupération et fusion du mesh
    const valid = meshes.filter(m => m instanceof BABYLON.Mesh && m.geometry);
    if (!valid.length) {
      console.error("Aucun mesh visible dans plat.glb");
      return;
    }
    const platform = BABYLON.Mesh.MergeMeshes(valid, true, true, undefined, false, true);
    platform.name = "movingPlatform";
    platform.receiveShadows = true;
    platform.position.copyFrom(p_from);
    // assurez-vous que la plateforme a une rotationQuaternion
    if (!platform.rotationQuaternion) {
      platform.rotationQuaternion = BABYLON.Quaternion.Identity();
    }

    // 2) Création de l’agrégat Havok en mode ANIMATED + friction
    const aggregate = new BABYLON.PhysicsAggregate(
      platform,
      BABYLON.PhysicsShapeType.BOX,
      { mass: 0, friction: 1.0, restitution: 0.0 },
      scene
    );
    allAggregates.push(aggregate);
    const body = aggregate.body;
    body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);
    platform._hkBody = body;  

    // 3) Animation “va-et-vient” en calculant alpha ∈ [0,1]
    let prevPos = p_from.clone();
    const handle = scene.onBeforeRenderObservable.add(() => {
      const dt = scene.getEngine().getDeltaTime() * 0.001;  // en s
      const t  = performance.now() * 0.001;
      const alpha = (Math.sin(t * speed) + 1) * 0.5;
      const newPos = BABYLON.Vector3.Lerp(p_from, p_to, alpha);

      // ➤ Utilisez setTargetTransform pour que Havok calcule la vélocité
      //     et applique la friction au contact des autres bodies
      body.setTargetTransform(
        newPos,
        platform.rotationQuaternion
      ); // :contentReference[oaicite:0]{index=0}

      // synchronisation visuelle
      platform.position.copyFrom(newPos);

      // (optionnel) calcul manuel si vous voulez un fallback dans Player
      platform.userVelocity = newPos.subtract(prevPos).scale(1 / dt);
      prevPos.copyFrom(newPos);
    });

    // 4) stockez si besoin pour cleanup ultérieur
    movingPlatforms.push({ platform, handle });
  });
}



function clearMovingPlatforms(scene) {
  for (const { platform, handle } of movingPlatforms) {
    scene.onBeforeRenderObservable.remove(handle);
    platform.dispose();
  }
  movingPlatforms.length = 0;
}

function createChest(x, y, z, chestId) {
  BABYLON.SceneLoader.ImportMesh("", "images/", "chest.glb", scene,
    (meshes, particleSystems, skeletons, animationGroups) => {
      animationGroups.forEach(g => g.stop());
      const chest = meshes[0];
      chest.position.set(x, y, z);
      chest.scaling  = new BABYLON.Vector3(4, 4, 4);

      chest.receiveShadows = true;

      chest.checkCollisions = false;
      chests.push({ mesh: chest, id: chestId });
      chestOpened[chestId] = false;
    }
  );
}

function createRepairStation(x, y, z) {
  // Charger la station où on placera les pièces
repairStationMesh = BABYLON.SceneLoader.ImportMesh(
  "", "images/", "repairStation.glb", scene,
  meshes => {
    scene.repairStation = meshes[0];
    scene.repairStation.position.set(x, y, z);   // ajustez au niveau
    scene.repairStation.receiveShadows = true;
    scene.repairStation.checkCollisions = false;
  }
);
}

function createScene() {
  
  let scene = new BABYLON.Scene(engine);
  

  scene.fogMode    = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogColor   = new BABYLON.Color3(0.8, 0.9, 1.0);
  scene.clearColor = new BABYLON.Color3(0.8, 0.9, 1.0);
  scene.fogDensity = 0.0014 ;


  var gravityVector = new BABYLON.Vector3(0, -9.81, 0);
  const physicsPlugin = new BABYLON.HavokPlugin(false);
  scene.enablePhysics(gravityVector, physicsPlugin);

  scene.onAfterPhysicsObservable.add(() => {
    if (currentLevel >= 2) {
      enemiesManager.enemies.forEach(enemy => {
        enemy.am = audioManager;
      });

      enemiesManager.updateAll(player);


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
        insuranceUsed = true;
        player.reset_position(scene);
        showToast("Your insurance makes you respawn instantly !", 3000);
        invulnerable = true;
        setTimeout(() => invulnerable = false, 1000);
      } else {
        handlePlayerDeath(10);
      }
    }


    });
  createLights(scene);

  player = new Player(scene);

  
  spawnPosition = new BABYLON.Vector3(0, 10, 0);



  
  orbsManager = new OrbsManager(scene);

  enemiesManager = new EnemiesManager(scene, audioManager);

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

  const leaveBtn = document.getElementById('leaveFishingBtn');
  if (leaveBtn) {
    leaveBtn.addEventListener("click", () => {
      fishingManager.hide();
      animateCameraToPlayerView();
      canvas.requestPointerLock();
    });
  }


  enemiesManager.enemies.forEach(e => {
  });

  BABYLON.SceneLoader.ImportMesh(
    "", 
    "images/", 
    "lightbluesky.glb", 
    scene,
    (meshes) => {
      meshes.forEach(mesh => {
        mesh.infiniteDistance = true;
        mesh.checkCollisions = false;
      });
    }
  );

  questManager = new QuestManager();

  scene.keyMesh   = null;
  scene.keyPicked = false;

  scene.bossMesh        = null;
scene.bossHealth      = 3;
scene.bossPieces      = [];
scene.collectedPieces = [];
scene.repairStation   = null;
scene.bossPhase = "ready";        // “ready” → peut frapper, “attacking” → en train d’attaquer

scene.ItemPose = false;
scene.JumpFini = false;



  scene.onBeforeRenderObservable.add(() => {
  if (cutsceneActive) return;

  // 1) Update joueur + mesh
  const playerPos = player.controller.getPosition();
  player.mesh.position.copyFrom(playerPos);

  // 2) Origine du rayon = tête du lapin
  const origin = playerPos.add(new BABYLON.Vector3(0, 2, 0));

  // 3) Lerp du target pour un suivi smooth
  camera.setTarget(
    BABYLON.Vector3.Lerp(camera.getTarget(), origin, 0.1)
  );

  // 4) Paramètres
  const defaultR = camera._defaultRadius || 20;
  const minR = camera.lowerRadiusLimit || 1;

  // 5) Rayon vers la position DÉSIRÉE (pas actuelle) de la caméra
  const desiredDir = camera.position.subtract(origin).normalize();
  const maxDist = Math.max(camera.radius, defaultR); // Distance max à tester
  const ray = new BABYLON.Ray(origin, desiredDir, maxDist);
  const hit = scene.pickWithRay(ray, m => m.checkCollisions);

  // 6) Choix du radius cible
  let targetRadius;
  if (hit.hit) {
    // obstacle → on veut être juste devant
    targetRadius = Math.max(hit.distance - 1.0, minR); // Buffer plus large
  } else {
    // pas d'obstacle → on veut la distance par défaut
    targetRadius = defaultR;
  }

  // 7) Vérification supplémentaire : la caméra est-elle DANS un obstacle ?
  const currentPos = camera.position.clone();
  const currentDist = BABYLON.Vector3.Distance(origin, currentPos);
  const checkRay = new BABYLON.Ray(origin, desiredDir, currentDist);
  const currentHit = scene.pickWithRay(checkRay, m => m.checkCollisions);
  
  // Si la caméra est dans un obstacle, forcer un radius très petit
  if (currentHit.hit && currentHit.distance < currentDist - 0.5) {
    targetRadius = Math.max(currentHit.distance - 1.0, minR);
  }

  // 8) Interpolation avec des vitesses différentes
  let lerpSpeed;
  if (targetRadius < camera.radius) {
    // Zoom in (obstacle détecté) → rapide
    lerpSpeed = 0.3;
  } else {
    // Zoom out (obstacle disparu) → plus doux
    lerpSpeed = 0.05;
  }

  // 9) Appliquer le changement seulement si significatif (évite les micro-ajustements)
  const diff = Math.abs(camera.radius - targetRadius);
  if (diff > 0.1) {
    camera.radius = BABYLON.Scalar.Lerp(camera.radius, targetRadius, lerpSpeed);
  }
});


  scene.onAfterPhysicsObservable.add((_) => {
    if (scene.deltaTime == undefined) return;
    let dt = scene.deltaTime / 1000.0;
    if (dt == 0) return;

    if (playerDead) {
      return;
    }

    player.move(inputStates, camera);
    console.log("Player state:", player.state);

    let down = new BABYLON.Vector3(0, -1, 0);
    let support = player.controller.checkSupport(dt, down);
   
    BABYLON.Quaternion.FromEulerAnglesToRef(0, camera.rotation.y, 0, player.orientation);
    let desiredLinearVelocity = player.getDesiredVelocity(dt, support, player.controller.getVelocity());
    player.controller.setVelocity(desiredLinearVelocity);

    player.controller.integrate(dt, support, player.gravity);
});



  
  ground = createGround(scene, currentLevel);
  
  return scene;
}

function createFinishPoint(x , y, z) {

  finishMesh = BABYLON.MeshBuilder.CreateBox("finish", { size: 2 }, scene);
  shopPosition = finishMesh.position.clone();
  finishMesh.position.set(x, y, z);
  finishMesh.isVisible = false;
  finishMesh.checkCollisions = true;
  finishMeshes.push(finishMesh);

  BABYLON.SceneLoader.ImportMesh("", "images/", "finish.glb", scene, (meshes) => {
      const finishModel = meshes[0];
      finishModel.parent = finishMesh;

      finishModel.receiveShadows = true;
      finishModel.rotation.y = Math.PI / 2;
      finishModel.scaling = new BABYLON.Vector3(1, 1, -1);
      finishMeshes.push(finishModel);
      console.log("Modèle finish.glb chargé et attaché à la boîte");
  });
  }

  /**
 * Crée un point d'arrivée final :
 * - invisible
 * - détection de proximité
 * - affiche "Appuyez sur E pour continuer"
 * - passage au niveau suivant sur E
 */
function createFinalPoint(x, y, z) {
  // 1) Création du mesh de collision
  const finalMesh = BABYLON.MeshBuilder.CreateBox("finalPoint", { size: 15 }, scene);
  finalMesh.position.set(x, y, z);
  finalMesh.isVisible = false;
  finalMesh.checkCollisions = true;


  // 3) Prépare le prompt
  let isNear = false;
  const { ActionManager, ExecuteCodeAction, KeyboardEventTypes } = BABYLON;

  // Assurez-vous d'avoir une <div id="promptDiv"></div> dans votre HTML
  const promptDiv = document.getElementById("promptDiv");

  // 4) ActionManager pour détecter l'entrée/sortie de collision
  finalMesh.actionManager = new ActionManager(scene);

  // Entrée en collision → on affiche le message
  finalMesh.actionManager.registerAction(
    new ExecuteCodeAction(
      {
        trigger: ActionManager.OnIntersectionEnterTrigger,
        parameter: { mesh: player.mesh }
      },
      () => {
        isNear = true;
        promptDiv.textContent = "Appuyez sur E pour.. CROQUER LA CAROTTE !";
        
      }
    )
  );

  // Sortie de collision → on cache le message
  finalMesh.actionManager.registerAction(
    new ExecuteCodeAction(
      {
        trigger: ActionManager.OnIntersectionExitTrigger,
        parameter: { mesh: player.mesh }
      },
      () => {
        isNear = false;
        promptDiv.textContent = "";
      }
    )
  );

  // 5) Observable clavier pour capturer la touche E
  const keyboardObs = scene.onKeyboardObservable.add((kbInfo) => {
    if (
      isNear &&
      kbInfo.type === KeyboardEventTypes.KEYDOWN &&
      (kbInfo.event.key === "e" || kbInfo.event.key === "E")
    ) {
      // Nettoyage
      
      scene.onKeyboardObservable.remove(keyboardObs);
      finalMesh.dispose();
      promptDiv.textContent = "";
      // Passage au niveau suivant
      nextLevel();
    }
  });
}



function createGamblingTable (x,y,z) {
          BABYLON.SceneLoader.ImportMesh("", "images/", "gamblingtable.glb", scene, (meshes) => {
            gamblingTableMesh = meshes[0];
            gamblingTableMesh.position = new BABYLON.Vector3(x, y+0.8, z);
            gamblingTableMesh.scaling = new BABYLON.Vector3(0.8, 0.8, 0.8);

            gamblingTableMesh.receiveShadows = true;
            gamblingTableMesh.isVisible = true;
        
            gamblingTableMesh.checkCollisions = true;
            meshes.forEach(m => {
              m.receiveShadows = true;
              if (!(m.name == "__root__")) {
                const gambaggreg = new BABYLON.PhysicsAggregate(m, BABYLON.PhysicsShapeType.MESH);
                allAggregates.push(gambaggreg);
              }
            });

            miniGameZone = BABYLON.MeshBuilder.CreateBox("miniZone", { size: 6 }, scene);
            miniGameZone.position = gamblingTableMesh.position.clone();
            miniGameZone.isVisible = false;
        
            const matZone = new BABYLON.StandardMaterial("zoneMat", scene);
            matZone.diffuseColor = new BABYLON.Color3(1, 1, 0);
            matZone.alpha = 0.3;
            miniGameZone.material = matZone;
        
            miniGameZone.actionManager = new BABYLON.ActionManager(scene);
        
            miniGameZone.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    { trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger, parameter: { mesh: player.mesh } },
                    () => {
                        document.exitPointerLock();
                        miniGameManager.showInterface();
                    }
                )
            );
        
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
    pondMesh = meshes[0];
    pondMesh.position = new BABYLON.Vector3(x, y, z);
    pondMesh.receiveShadows = true;
    pondPosition = pondMesh.position.clone();
    meshes.forEach(m => {
      m.checkCollisions  = true;
      m.receiveShadows   = true;
      if (!(m.name == "__root__")) {
        const pondaggreg = new BABYLON.PhysicsAggregate(m, BABYLON.PhysicsShapeType.MESH);
        allAggregates.push(pondaggreg);
      }
    });
  
    pondZone = BABYLON.MeshBuilder.CreateBox("pondZone", { size: 1 }, scene);
    pondZone.position        = pondMesh.position.clone();
    pondZone.isVisible       = false;
    pondZone.checkCollisions = false;
    pondZone.isPickable      = false;
    pondZone.ellipsoid       = new BABYLON.Vector3(0,0,0);
    pondZone.ellipsoidOffset = new BABYLON.Vector3(0,0,0);

    pondZone.actionManager   = new BABYLON.ActionManager(scene);
    pondZone.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        { trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger, parameter: { mesh: player.mesh } },
        () => {
          console.log("Player entered pond zone");
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
        camera.detachControl(canvas);
        animateCameraToFishingView();
        window.removeEventListener("keydown", onEnterFishing);
      }
    }
  });
}



function createGround(scene, level) {

  if (importedMeshes.length > 0) {
      importedMeshes.forEach(mesh => mesh.dispose());
      clearMovingPlatforms(scene);
      importedMeshes = [];
  }

  if (level === 1) {
      BABYLON.SceneLoader.ImportMesh("", "images/", "niveau1.glb", scene, function (meshes) {
        console.log("Import niveau", level, ":", meshes.map(m => `${m.name} → ${m.getClassName()}`)); 


        BABYLON.SceneLoader.ImportMesh("", "images/", "grass.glb", scene, function (grassMeshes) {
          importedMeshes = importedMeshes.concat(grassMeshes);
        });
          importedMeshes = importedMeshes.concat(meshes);
          importedMeshes.forEach(mesh => {
            mesh.receiveShadows = true;
            mesh.isPickable = true;

          });
          meshes.forEach((mesh) => {

              mesh.checkCollisions = true;
              mesh.isPickable = true; 
              
              mesh.receiveShadows = true;

              if (mesh.material) {
                mesh.material.unlit = false; 
              }

              if (!(mesh.name == "__root__")) {
                const lvl1aggreg = new BABYLON.PhysicsAggregate(mesh, BABYLON.PhysicsShapeType.MESH);
                allAggregates.push(lvl1aggreg);
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

          createFinishPoint(175.3, 120, -54.3);

          

          createChest( 227.2, 68, 151.3,  `lvl1_chest1` );

          createGamblingTable (176.8,120,-22.9);


          
          const p1_from = new BABYLON.Vector3(120, 55, 25);
          const p1_to   = new BABYLON.Vector3(150, 55, 28);
          createMovingPlatform(scene, p1_from, p1_to, 0.8);

          createPond(66, 0, -130);

          
          

          
      });
      return null;
  } else if (level === 2) {
      BABYLON.SceneLoader.ImportMesh("", "images/", "niveau2.glb", scene, function (meshes) {

          importedMeshes = meshes;

          meshes.forEach((mesh) => {
              mesh.checkCollisions = true;
              mesh.isPickable = false; 
              mesh.receiveShadows = true;  
              if (!(mesh.name == "__root__")) {
                const lvl2aggreg = new BABYLON.PhysicsAggregate(mesh, BABYLON.PhysicsShapeType.MESH);
                allAggregates.push(lvl2aggreg);
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

          createFinishPoint(-67, 60, -136);
        createGamblingTable (-55,57,-147);



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
          
          const configs = paths.map(p => ({
            path: p,
            speed: 0.057,
            range: 15
          }));
          enemiesManager.createEnemies(configs);
          
          });
      return null;
  } else if (level === 3) {
    BABYLON.SceneLoader.ImportMesh("", "images/", "niveau3.glb", scene, function (meshes) {
    // 3e niveau temporaire : une grande plateforme plate
    // on vide d'abord les anciens meshes
    importedMeshes = meshes;

    meshes.forEach((mesh) => {
        mesh.checkCollisions = true;
        mesh.isPickable = false; 
        mesh.receiveShadows = true;  
        if (!(mesh.name == "__root__")) {
          const lvl2aggreg = new BABYLON.PhysicsAggregate(mesh, BABYLON.PhysicsShapeType.MESH);
          allAggregates.push(lvl2aggreg);
        }
    });

        const p1_from = new BABYLON.Vector3(-192.6, 6.5, -147.4);
          const p1_to   = new BABYLON.Vector3(-128, 6.5, -116.4);
          createMovingPlatform(scene, p1_from, p1_to, 0.5);

    const p2_from = new BABYLON.Vector3(-129, 6.5, -97.7);
          const p2_to   = new BABYLON.Vector3(-170.7, 6.5, -125.6);
          createMovingPlatform(scene, p2_from, p2_to, 0.5);
    const p3_from = new BABYLON.Vector3(-141.9, 6.5, -85.6);
          const p3_to   = new BABYLON.Vector3(-168.3, 6.5, -105); 
          createMovingPlatform(scene, p3_from, p3_to, 0.5);

    const p4_from = new BABYLON.Vector3(-178.16, 6.5, -81.8);
          const p4_to   = new BABYLON.Vector3(-213.7, 6.5, -76.3);
          createMovingPlatform(scene, p4_from, p4_to, 0.5);

    

    createFinalPoint(144, 0.5, -2.8);

    
    createPond(3.3, 0.6, -48);


    // ——— Zones start / end invisibles ———
quest1StartZone = BABYLON.MeshBuilder.CreateBox("q1Start", { size: 5 }, scene);
quest1StartZone.position.set(-83.5, 4, -69.3);
quest1StartZone.isVisible = false;
quest1EndZone = quest1StartZone.clone("q1End");
quest1EndZone.position.set(-121.6, 31.5, 2.5);
quest1EndZone.isVisible = false;

// ——— Crée le timer ET l’affichage des tentatives ———
challengeTimer = document.createElement("div");
challengeTimer.id = "challengeTimer";
challengeTimer.style = `position:absolute; top:15%; left:50%;
  transform: translateX(-50%); font-size:1.2em; display:none;`;
challengeTimer.innerHTML =
  `Tentatives restantes : <span id="challengeAttempts">${quest1AttemptsLeft}</span><br>` +
  `Temps restant : <span id="challengeTime">00:30</span>`;
document.body.appendChild(challengeTimer);

// ——— Crée le bouton “Abandonner la tentative” ———
abortAttemptBtn = document.createElement("button");
abortAttemptBtn.id = "abortAttemptBtn";
abortAttemptBtn.textContent = "Abandonner la tentative";
abortAttemptBtn.style = `position:absolute;
  top:8%; left:50%; transform: translateX(-50%);
  font-size:0.8em;    /* plus petit */
  padding:0.2em 0.5em; /* moins de remplissage */
`;
abortAttemptBtn.style.display = "none";
document.body.appendChild(abortAttemptBtn);

abortAttemptBtn.addEventListener("click", () => {
  if (!quest1Started || quest1Finished) return;
  // Stoppe la tentative en cours
  quest1Started = false;
  challengeTimer.style.display    = "none";
  abortAttemptBtn.style.display   = "none";

  // Décrémente le compteur
  quest1AttemptsLeft--;
  updateQuest1AttemptsDisplay();
  showToast(`Tentative abandonnée. Tentatives restantes : ${quest1AttemptsLeft}`, 3000);

  // Si plus de tentatives, on “pitié” complète la quête
  if (quest1AttemptsLeft <= 0) {

    quest1Finished = true;
    scene.JumpFini = true;
    showToast("Plus de tentatives… l'officier ouvre le cadenas par pitié.", 6000);
    questManager.completeQuest("quest1");
    const npc1 = npcMeshes.find(npc => npc.id === "quest1");
  if (npc1 && npc1.mesh.actionManager) {
    npc1.mesh.actionManager.dispose();
    // on cache aussi l'invite
    promptDiv.style.display = "none";
  }
  }
});

    // (Optionnel) quelques orbes disséminées pour tester la récolte
    const spawnPositions = [
      new BABYLON.Vector3(  20, 1,  20),
      new BABYLON.Vector3(-20, 1,  20),
      new BABYLON.Vector3(  20, 1, -20),
      new BABYLON.Vector3(-20, 1, -20),
    ];
    orbsManager.createOrbsAtPositions(spawnPositions);
    // Création du finish point


    createRepairStation(28.4,2,-67.3);

    loadLocks();

    createRedBox();
  // ————— Données et création des 4 PNJ —————
  const npcData = [
    {
      position: new BABYLON.Vector3(0.8,  2.1,  -22.3),
      questId:  "quest0",
      dialogue: ["Bonjour ! J'ai entendu dire que tu cherchais à croquer La Carotte...","Tu tombes bien ! ","J'ai fais tomber mon portefeuille dans le lac juste à côté, et apparement tu aurais certaines compétences en peche","J'esperais donc que tu puisse me le repêcher, car j'ai les clés d'un des cadenas donnant accès à la carotte, si tu vois où je veux en venir"],
      title:    "Pecher le portefeuille dans le lac"
    },
    {
      position: new BABYLON.Vector3(-82, 2.4,  -48),
      questId:  "quest1",
      dialogue: ["Salut toi !", "Tu aimes les défis?","Il parait que tu cherches à croquer la carotte sacrée..", "HAHAHAHAH.. HAH.. pardon, je m'égare..","C'est un rêve atteignable, surtout que j'ai la possibilité d'ouvrir un des cadenas du portail...","Mais il faut le mériter ! Tu vois ce parcours? ","Si tu arrives à le terminer en moins de 90 secondes, ce joli cadenas va disparaitre ! Bonne chance !"],
      title:    "Terminer le parcours en moins de 90 secondes"
    },
    {
      position: new BABYLON.Vector3(-44.9,  7.7, 54.4),
      questId:  "quest2",
      dialogue: ["Bonjour aventurier","Tu cherches à croquer la carotte sacrée?","Je peux t'aider, mais j'ai besoin de ta coopération.","J'ai perdu la clé de ma maison au fond de la grotte..","Si tu me la rapportes, je pourrais t'ouvrir un des cadenas du portail.","Mais attention, la grotte est dangereuse, tu devras faire preuve de courage et de détermination pour la traverser."],
      title:    "Récupérer la clé de Mr.Zou"
    },
    {
      position: new BABYLON.Vector3(33.6, 2, -75.6),
      questId:  "quest3",
      dialogue: ["Hé toi !","Tu cherches à ouvrir ce cadenas ? Je pense pouvoir t'aider.. Tu vois la grosse pinata derriere moi?","Si tu la casse assez rapidement, personne ne te remarquera et tu pourras me rapporter mes 3 bonbons favoris","En échange, je t'ouvrirai l'un des cadenas. Tu les déposera dans le seau à bonbons juste ici"," Gagnant-gagnant ! "],
      title:    "Casser la pinata et récupérer les bonbons"
    },
  ];
  npcData.forEach(data => {
    const npc = new NPC(
      scene,
      data.position,
      data.questId,
      data.dialogue,
      data.title,
      () => {
      const lock = locks.find(l => l.questId === data.questId);
      if (!lock) return;
      const lockPos = lock.mesh.position.clone();

      // 1) Crée la lockCamera si elle n'existe pas
      if (!lockCamera) {
        // 1) Définis ton angle de rotation (90° = π/2 rad)
const angle = Math.PI / 2;

// 2) Calcule la matrice de rotation autour de Y
const rotY = BABYLON.Matrix.RotationY(angle);

// 3) Applique-la à ton offset initial
const initialOffset = new BABYLON.Vector3(0, 5, -10);
const rotatedOffset = BABYLON.Vector3.TransformCoordinates(initialOffset, rotY);
        lockCamera = new BABYLON.FreeCamera(
          "lockCam",
          lockPos.add(rotatedOffset),  // positionnez-la un peu au-dessus et en retrait
          scene
        );
        lockCamera.setTarget(lockPos);                 // cadre le cadenas
        lockCamera.detachControl(canvas);              // pas de contrôle utilisateur
      }

      // 2) Switch sur la caméra fixe
      camera.detachControl(canvas);                   // libère la souris de la 3rd-person
      scene.activeCamera = lockCamera;
      audioManager.play("lock");

      // 3) Effet fumigène, disparition, puis retour
      createSmokeEffect(lockPos);
      setTimeout(() => {
        lock.mesh.dispose();                           // supprime le cadenas
      }, 1200);                                         // juste après la fumée
      setTimeout(() => {
        // re-switch sur la 3rd-person camera
        scene.activeCamera = camera;
        camera.attachControl(canvas, true);
        lockCamera.dispose();
        lockCamera = null;
      }, 1600);                                        // 0.8s fumée + 0.7s pause = 1.5s total
    }

    );


    npcMeshes.push(npc);

    // === On gère l'interaction “D : parler” comme pour la pêche ===
  npc.mesh.actionManager = new BABYLON.ActionManager(scene);

  // 1) Prépare le handler clavier qui appellera npc.interact()
   const onDInteract = (e) => {
   // Ignore si ce n’est pas G ou si c’est un repeat (touche maintenue)
   if (e.key.toLowerCase() !== "g" || e.repeat) return;
   window.removeEventListener("keydown", onDInteract);
   npc.interact(questManager, fishingManager);
 };


  // 2) Quand le joueur entre dans la “zone d’interaction” du NPC…
  npc.mesh.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(
      {
        trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger,
        parameter: { mesh: player.mesh }
      },
      () => {
        showToast("Press G to talk", 2000);
        window.addEventListener("keydown", onDInteract);
      }
    )
  );

  // 3) Quand il en sort…
  npc.mesh.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(
      {
        trigger: BABYLON.ActionManager.OnIntersectionExitTrigger,
        parameter: { mesh: player.mesh }
      },
      () => {
        window.removeEventListener("keydown", onDInteract);
      }
    )
  );
  });



    console.log("Niveau 3 temporaire chargé !");
});
    return null;
}
}

  
function createRedBox() {
  // 1) Création du mesh
  redBox = BABYLON.MeshBuilder.CreateBox("redBox", { size: 5 }, scene);
  redBox.position.set(128, 1, -2);     // où tu veux
  redBox.checkCollisions = true;    // active la détection de collisions “classique”

  // 2) Matériau rouge
  const mat = new BABYLON.StandardMaterial("redBoxMat", scene);
  mat.diffuseColor = new BABYLON.Color3(1, 0, 0);
  redBox.material   = mat;
  redBox.isVisible = true;           // visible par défaut

  // 3) Physique Havok zéro masse pour bloquer le joueur
  const boxaggreg = new BABYLON.PhysicsAggregate(
    redBox,
    BABYLON.PhysicsShapeType.BOX,
    { mass: 0 },
    scene
  );
  allAggregates.push(boxaggreg);
}

async function loadLocks() {
  locks.length = 0;
  const lockConfig = [
    { file: "lock_red.glb",    x: 128, z :-7.8+ 0 * 3.3 },
    { file: "lock_gold.glb",   x: 128, z : -7.8+ 1 * 3.3},
    { file: "lock_blue.glb",   x: 128, z :-7.8 + 2 * 3.3},
    { file: "lock_pink.glb",   x: 128, z : -7.8 + 3 * 3.3},
  ];

  for (let i = 0; i < lockConfig.length; i++) {
    const { file, x, z } = lockConfig[i];
    try {
      const result = await BABYLON.SceneLoader.ImportMeshAsync(
        "", "images/", file, scene
      );

      // 1) Ne garder que les vrais Mesh (avec géométrie)
      const geomMeshes = result.meshes.filter(m => m instanceof BABYLON.Mesh && m.geometry);
      if (geomMeshes.length === 0) {
        console.warn(`lock${i}: pas de mesh géométrique dans ${file}`);
        continue;
      }

      // 2) Choix du mesh "racine"
      const lockRoot = geomMeshes[0];
      // On détache d'abord de __root__ si besoin
      lockRoot.parent = null;

      // 3) Position, échelle
      lockRoot.position.set(x, 8, z);
      lockRoot.scaling.scaleInPlace(400);

      // 4) Rotation pour qu'il soit "debout"
      //    Essayez X ou Z selon l'axe correct
      lockRoot.rotation.z = Math.PI;
      lockRoot.rotation.x = -Math.PI/2;
      lockRoot.rotation.y = Math.PI/2;
      // lockRoot.rotation.z = Math.PI / 2;

      // 5) Re-parentage des autres maillages au nouveau root
      for (let j = 1; j < geomMeshes.length; j++) {
        geomMeshes[j].parent = lockRoot;
      }
      lockRoot.checkCollisions = true;

      locks.push({ mesh: lockRoot, questId: `quest${i}` });
      console.log(`🔒 lock${i} (${file}) prêt, debout à (${x},2,${z})`);
    } catch (e) {
      console.error(`Erreur chargement ${file}`, e);
    }
  }
}
  

function updateQuest1AttemptsDisplay() {
  const span = document.getElementById("challengeAttempts");
  if (span) span.textContent = quest1AttemptsLeft;
}

function clearLevelObjects() {

  clearMovingPlatforms(scene);

  enemiesManager.enemies.forEach(enemy => {
    enemy.depop();
  });

  allAggregates.forEach(agg => agg.dispose());
  allAggregates.length = 0;

  chests.forEach(({ mesh }) => mesh.dispose());
  chests.length = 0;


  if (repairStationMesh) {
    repairStationMesh.dispose();
    repairStationMesh = null;
  }
  if (finishMeshes) {
    finishMeshes.forEach(mesh => mesh.dispose());
    finishMesh = null;
    finishMeshes = [];
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
  scene.clearColor = new BABYLON.Color3(0.2, 0.15, 0.1);

  const hemi = new BABYLON.HemisphericLight("hemiLight",
    new BABYLON.Vector3(0, 1, 0), scene);
  hemi.diffuse     = new BABYLON.Color3(1.0, 0.8, 0.6);
  hemi.specular    = new BABYLON.Color3(0.4, 0.3, 0.3);
  hemi.groundColor = new BABYLON.Color3(0.2, 0.1, 0.05);
  hemi.intensity   = 0.5;


  const dir = new BABYLON.DirectionalLight("dirLight",
    new BABYLON.Vector3(-0.5, -1, -0.5), scene);
  dir.position  = new BABYLON.Vector3(18, 400, -50);
  dir.diffuse   = new BABYLON.Color3(1.0, 0.85, 0.6);
  dir.specular  = new BABYLON.Color3(0.5, 0.4, 0.3);
  dir.intensity = 1;


  shadowGen = new BABYLON.ShadowGenerator(2048, dir);
  shadowGen.useBlurExponentialShadowMap = true;
  shadowGen.blurKernel = 32;
  scene._shadowGenerator = shadowGen;

}

function createThirdPersonCamera(scene, target, canvas) {
  const headOffset    = new BABYLON.Vector3(0, 2, 0);
  const defaultRadius = 20;

  // 1) Active les collisions sur la scène
  scene.collisionsEnabled = true;

  // 2) Création de l’ArcRotateCamera
  const camera = new BABYLON.ArcRotateCamera(
    "ThirdPersonCamera",
    BABYLON.Tools.ToRadians(0),
    BABYLON.Tools.ToRadians(45),
    defaultRadius,
    target.position.add(headOffset),
    scene
  );
  
  // 3) Config collisions pour la caméra
  
  // 4) Config utilisateur
  if (camera.autoRotationBehavior) {
  camera.autoRotationBehavior.stop(); 
}
  camera.lowerRadiusLimit    = 5;
  camera.upperRadiusLimit    = 20;
  camera.angularSensibilityX = 2000;
  camera.angularSensibilityY = 4000;
  camera.upperBetaLimit      = Math.PI / 2;
  camera.lowerBetaLimit      = 0.8;
  camera.inertia             = 0;
  camera.lockedTarget        = target;
  camera.attachControl(canvas, false);
  let targetRadius = camera.radius;
  enablePointerLock(scene);



  // 6) Met à jour la target à chaque frame (pour suivre le lapin)
  scene.registerBeforeRender(() => {
    //camera.target = target.position.add(headOffset);
  });

  scene.activeCamera = camera;
  return camera;
}



function modifySettings() {
  window.addEventListener("keydown", (event) => {
    switch(event.code) {
      case "KeyW":
      case "ArrowUp":
        inputStates.up = true;
        break;
      case "KeyS":
      case "ArrowDown":
        inputStates.down = true;
        break;
      case "KeyA":
      case "ArrowLeft":
        inputStates.left = true;
        break;
      case "KeyD":
      case "ArrowRight":
        inputStates.right = true;
        break;
      case "Space":
        inputStates.jump++;
        player.wantJump ++;
        break;
      case "KeyR":
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
      case "KeyE":
        inputStates.interact = true;
        break;
      case "KeyQ":
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
      case "KeyI":
        if (inspecting) {
          inspecting = false;
          scene.debugLayer.hide();
        } else {
          scene.debugLayer.show();
          inspecting = true;
        }
        break;
    }
  });
  
  window.addEventListener("keyup", (event) => {
    switch(event.code) {
      case "KeyW":
      case "ArrowUp":
        inputStates.up = false;
        break;
      case "KeyS":
      case "ArrowDown":
        inputStates.down = false;
        break;
      case "KeyA":
      case "ArrowLeft":
        inputStates.left = false;
        break;
      case "KeyD":
      case "ArrowRight":
        inputStates.right = false;
        break;
      case "Space":
        inputStates.jump = 0;
        player.wantJump = 0;
        break;
      case "KeyE":
        inputStates.interact = false;
        break;
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.code === "Semicolon") {
      console.log("Position du joueur :", player.mesh.position);
    }
  });
  
  window.addEventListener("resize", () => engine.resize());
}

function startTimer(duration) {

  if (timerInterval) {
    clearInterval(timerInterval);
  }
  timeLeft = duration;
  console.log("[DEBUG] startTimer() level", currentLevel, "timeLeft =", timeLeft);


  document.getElementById("timer").textContent = timeLeft;

  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      engine.stopRenderLoop();


      const loseMenu = document.getElementById("loseMenu");
      loseMenu.style.display = "flex";
      document.exitPointerLock();


      document.getElementById("retryButton").onclick = () => {

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
  document.getElementById("questBookIcon").style.display = "none";
  updateEurosUI();
  console.log("Niveau terminé, conversion en euros :", euros);
  openShopInterface();
}

function openShopInterface() {

  gamePaused = true;
  clearInterval(timerInterval);


  const shopInterface = document.getElementById("shopInterface");
  shopInterface.style.display = "flex";
  shopInterface.classList.add("show");
  document.exitPointerLock();

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
  shopInterface.style.display = "none";

  canvas.requestPointerLock();
  gamePaused = false;
  startTimer(timeLeft);
}


function buyRangeBonus() {
  if (euros >= 10) {
    euros -= 10;
    audioManager.play("purchase");
    currentRangeMult += 0.2;
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
  if (euros>=25){
    euros -= 25;
    audioManager.play("purchase");
    freezeBought = true;
    addSkillIcon("iconFreeze","images/gel.png",freezeCooldownDuration);
    updateEurosUI();
    showToast("Freeze unlocked !");
    document.getElementById("item-buyFreeze").style.display = "none";
  }else{
    showToast("Not enough carrots !");
  }
}

function update_skillicon(id, newSrc){
  const img = document.getElementById(id);
  if (img) img.src = newSrc;
}

function triggerFreeze() {
  freezeActive   = true;
  freezeCooldown = true;
  lastFreezeTime = Date.now();

  update_skillicon("iconFreeze", "images/gel_cd.png");
  showToast("Freeze activated ! 5 s");

  enemiesManager.enemies.forEach(e => e.freeze(5000));

  setTimeout(() => {
    enemiesManager.enemies.forEach(e => e.frozen = false);
    freezeActive = false;
  }, 5000);

  startCooldown("iconFreeze");
  setTimeout(() => {
    freezeCooldown = false;
    update_skillicon("iconFreeze", "images/gel.png");
    showToast("Freeze is ready to be used !");
  }, freezeCooldownDuration);
}

function donateBonus() {
  console.log("donateBonus invoked – euros =", euros);
  if (euros >= 10) {
    euros -= 10;
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
  if (euros >= 25) {
    euros    -= 25;
    audioManager.play("purchase");
    speedBought = true;
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

  player.speedMult = 1.5;


  const emitterNode = new BABYLON.TransformNode("speedEmitter", scene);
  emitterNode.parent   = player.mesh;
  emitterNode.position = new BABYLON.Vector3(0, 0.1, 0);

  const ps = new BABYLON.ParticleSystem("speedPS", 150, scene);
  ps.particleTexture = new BABYLON.Texture("images/flare.png", scene);

  const box = new BABYLON.BoxParticleEmitter();
  box.minEmitBox = new BABYLON.Vector3(-1, 0, -0.5);
  box.maxEmitBox = new BABYLON.Vector3( 1, 0,  0.5);
  ps.particleEmitterType = box;

  ps.color1    = new BABYLON.Color4(1, 1, 0,   1.0);
  ps.color2    = new BABYLON.Color4(1, 1, 0.2, 0.6);
  ps.colorDead = new BABYLON.Color4(1, 1, 0,   0.0);

  ps.minSize     = 0.05;
  ps.maxSize     = 0.1;

  ps.minLifeTime = 0.2;
  ps.maxLifeTime = 0.4;

  ps.emitRate    = 200;

  ps.direction1 = new BABYLON.Vector3(0, -1, 0);
  ps.direction2 = new BABYLON.Vector3(0, -2, 0);
  ps.gravity    = new BABYLON.Vector3(0, -9.81, 0);

  ps.updateSpeed = 0.01;
  ps.emitter     = emitterNode;
  ps.start();

  setTimeout(() => {
    ps.stop();
    setTimeout(() => {
      ps.dispose();
      emitterNode.dispose();
    }, 500);
  }, speedDuration);


  setTimeout(() => {
    player.speedMult = 1.0;
    speedActive = false;
  }, speedDuration);

  startCooldown("iconSpeed");
  setTimeout(() => {
    speedCooldown = false;
    update_skillicon("iconSpeed", "images/speed.png");
    showToast("Speed boost is ready to be used !");
  }, speedCooldownDuration);
}


function buyCarrotLoverBonus() {
  if (euros >= 15) {
    euros -= 15;
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
  if (euros >= 20) {
    euros -= 20;
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

  if (playerDead || invulnerable) return; 
  playerDead = true;
  gamePaused = true; 

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

export function showToast(message, duration = 2000) {
  const t = document.getElementById("toast");
  t.textContent   = message;
  t.style.opacity = "1";
  t.style.display = "block";
  t.style.fontFamily = "MyGameFont";
  t.style.fontSize = "30px";

  setTimeout(() => {
    t.style.transition = "opacity .5s";
    t.style.opacity    = "0";
    setTimeout(() => {
      t.style.display   = "none";
      t.style.transition = "";
    }, 500);
  }, duration);
}
window.showToast = showToast;

function respawnPlayer() {
  player.reset_position(scene);
  enemiesManager.resetAll();

  document.getElementById("deathScreen").style.display = "none";
  canvas.requestPointerLock();

  playerDead = false;
  gamePaused = false;

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

function showEndScreen() {
  const end = document.getElementById('endScreen');
  if (!end) return;
  end.remove();
  document.body.appendChild(end);

  document.exitPointerLock();
  audioManager.play("horn");
  end.classList.add('visible');

  function burst() {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { x: 0.1, y: 0.2 }
    });
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { x: 0.9, y: 0.2 }
    });
  }
  burst();

  const allCanvas = document.querySelectorAll('canvas');
  const cfCanvas  = allCanvas[allCanvas.length - 1];
  cfCanvas.style.position = 'fixed';
  cfCanvas.style.top      = '0';
  cfCanvas.style.left     = '0';
  cfCanvas.style.zIndex   = '1001';

  const confettiInterval = setInterval(burst, 500);

  const btn = document.getElementById('restartButton');
  btn.onclick = () => {
    clearInterval(confettiInterval);
    window.location.reload();
  };
}
async function playThreeTimes(key, url = null) {
  // 1) Assurez-vous que le son est chargé
  if (!audioManager.sounds.has(key)) {
    if (!url) {
      console.warn(`AudioManager: son "${key}" inconnu et pas d'URL fournie`);
      return;
    }
    await audioManager.load(key, url);
  }

  // 2) Récupération de l'instance Babylon
  const snd = audioManager.sounds.get(key);
  let count = 0;

  // 3) À chaque fin de lecture, on relance si besoin
  snd.onended = () => {
    count++;
    if (count < 3) {
      snd.play();
    } else {
      // Optionnel : nettoyer le callback
      snd.onended = null;
    }
  };

  // 4) Démarrage
  snd.play();
}

function nextLevel() {
  closeShopInterface();
  if (currentLevel < maxLevel) {

    currentLevel++;
    orbsTarget = currentLevel * 5;
    collectedOrbs = 0;

     player.reset_position(scene);

     invulnerable = true;
     setTimeout(() => invulnerable = false, 1000);

    miniGameManager.resetPlays();

    console.log("[DEBUG] nextLevel() début, gamePaused=", gamePaused);
    gamePaused = false;
    console.log("[DEBUG] nextLevel() après unpause, gamePaused=", gamePaused);

    clearInterval(timerInterval);
    if (currentLevel === 3){
        startTimer(350);
    } else {
      startTimer(timerDuration);
    }
    document.getElementById("questBookIcon").style.display = "none";

    clearLevelObjects();

    orbsManager.orbs.forEach(orb => orb.dispose());

    orbsManager = new OrbsManager(scene);

    ground = createGround(scene, currentLevel);



    canvas.requestPointerLock();
    console.log("Niveau", currentLevel, "lancé");
    
  } else {
    engine.stopRenderLoop();
    showEndScreen();
    playThreeTimes("miam", "images/miam.wav");

  }
}
