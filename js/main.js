import Player from "./Player.js";
import OrbsManager from "./OrbsManager.js";
import EnemiesManager from "./EnemiesManager.js";
import MiniGameManager from "./MiniGameManager.js";
import FishingManager from "./FishingManager.js";
import AudioManager from "./AudioManager.js";
import QuestManager from "./QuestManager.js";
import MoutonsManager from "./MoutonsManager.js";
import NPC from "./NPC.js";


let canvas;
let engine;
let scene;
let inputStates = {};
let player;
let orbsManager;
let enemiesManager;
let fishingManager;
let moutonsManager;
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
let cheat = false;

let timerDuration = 200;
let timeLeft;
let timerInterval;
let gamePaused = false;
let lastBossHit = 0;
let funZones = [];
let spawnPosition;
let playerDead = false;
let invulnerable = false;


let CAM_MAX_NORMAL;
let CAM_MAX_ZOOMED;
let camIsZoomed;
let camTargetRadius;

let currentLevel = 3; // niveau actuel du joueur
const maxLevel = 3;
let orbsTarget = currentLevel * 5;
let collectedOrbs = 0;

let redBox;
let redBoxRemoved = false;
let isPlayerAttacking;
let portalMesh;


let locks = [];



let euros = 0;
let currentRangeMult = 1;

let shopPosition;


let freezeBought = false;
let freezeActive = false;
let freezeCooldown = false;
const freezeCooldownDuration = 60_000;
let lastFreezeTime = 0;


let speedBought = false;
let speedActive = false;
let speedCooldown = false;
const speedDuration = 10_000;
const speedCooldownDuration = 25_000;
let lastSpeedTime = 0;

let carrotLoverStacks = 0;

let insuranceBought = false;
let insuranceUsed = false;

let miniGameManager;

const FINISH_THRESHOLD = 3;

const RADIUS_EPSILON = 0.1; // variations inférieures à 0.1u seront ignorées
const SMOOTHING = 0.1; // interpolation lente et uniforme

let repairStationMesh;
let fz;
let cutsceneActive = false;
let preLockCamState = null;
let lockCamera = null;

let quest1Started = false;
let quest1Finished = false;
const QUEST1_LIMIT = 90; // secondes
let quest1StartZone;
let quest1EndZone;
let challengeTimer;
let quest1AttemptsLeft = 2;
let abortAttemptBtn;


let caveBounds = {
    min: new BABYLON.Vector3(-39.78, 7, 75.38),
    max: new BABYLON.Vector3(83, 108, 157.5)
};

const chests = [];
const chestOpened = {};

let gamblingTableMesh = null;
let miniGameZone = null;
let miniGameTriggerZone = null;

let pondPosition;

let preFishingCameraState = null;

let initialAccessoriesConfig = {};



function animateCameraToFishingView() {
    preFishingCameraState = {
        alpha: camera.alpha,
        beta: camera.beta,
        radius: camera.radius,
        target: camera.target.clone()
    };

    const fishingTarget = pondPosition.clone();

    const fps = 30,
        durationFrames = fps * 2;
    camera.animations = [];

    const animBeta = new BABYLON.Animation(
        "betaAnim", "beta", fps,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    animBeta.setKeys([{
            frame: 0,
            value: preFishingCameraState.beta
        },
        {
            frame: durationFrames,
            value: Math.PI / 8
        }
    ]);
    camera.animations.push(animBeta);

    const animRadius = new BABYLON.Animation(
        "radiusAnim", "radius", fps,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    animRadius.setKeys([{
            frame: 0,
            value: preFishingCameraState.radius
        },
        {
            frame: durationFrames,
            value: preFishingCameraState.radius + 10
        }
    ]);
    camera.animations.push(animRadius);

    ["x", "y", "z"].forEach(axis => {
        const animT = new BABYLON.Animation(
            `target${axis}`, `target.${axis}`, fps,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        animT.setKeys([{
                frame: 0,
                value: preFishingCameraState.target[axis]
            },
            {
                frame: durationFrames,
                value: fishingTarget[axis]
            }
        ]);
        camera.animations.push(animT);
    });

    scene.beginAnimation(camera, 0, durationFrames, false);
}


function animateCameraToPlayerView() {
    if (!preFishingCameraState) return;

    const fps = 30,
        durationFrames = fps * 2;
    camera.animations = [];

    const animBetaBack = new BABYLON.Animation(
        "betaBack", "beta", fps,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    animBetaBack.setKeys([{
            frame: 0,
            value: camera.beta
        },
        {
            frame: durationFrames,
            value: preFishingCameraState.beta
        }
    ]);
    camera.animations.push(animBetaBack);

    const animRadiusBack = new BABYLON.Animation(
        "radiusBack", "radius", fps,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    animRadiusBack.setKeys([{
            frame: 0,
            value: camera.radius
        },
        {
            frame: durationFrames,
            value: preFishingCameraState.radius
        }
    ]);
    camera.animations.push(animRadiusBack);

    ["x", "y", "z"].forEach(axis => {
        const animTBack = new BABYLON.Animation(
            `targetBack${axis}`, `target.${axis}`, fps,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        animTBack.setKeys([{
                frame: 0,
                value: camera.target[axis]
            },
            {
                frame: durationFrames,
                value: preFishingCameraState.target[axis]
            }
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


const customizeBtn = document.getElementById("customizeBtn");
console.log("Bouton Personnaliser trouvé :", customizeBtn);
const customizePanel = document.getElementById("customizePanel");
const closeCustomizeBtn = document.getElementById("closeCustomizeBtn");
const applyCustomizeBtn = document.getElementById("applyCustomizeBtn");
const timerDiv = document.getElementById("timerDisplay");
const eurosDiv = document.getElementById("eurosDisplay");


document.getElementById("playButton").addEventListener("click", () => {
    console.log("Bouton Jouer cliqué — affichage de l'intro");
    document.getElementById("menu").style.display = "none";
    document.getElementById("introInterface").style.display = "flex";
});




customizeBtn.addEventListener("click", () => {
    console.log("👉 Customize clicked!");
    // on lit le display « réel »
    const isHidden = window.getComputedStyle(customizePanel).display === "none";
    customizePanel.style.display = isHidden ? "block" : "none";
});

// 1) Appliquer : on ne touche plus à player, on stocke juste la config
applyCustomizeBtn.addEventListener("click", () => {
    const config = {};
    ["Tete", "Visage", "Dos", "Pieds", "Yeux", "Oreilles"].forEach(cat => {
        const sel = document.querySelector(`input[name="${cat}"]:checked`).value;
        if (sel !== "none") config[sel] = true;
    });
    initialAccessoriesConfig = config; // ← on met à jour la variable globale
    customizePanel.style.display = "none";
});

closeCustomizeBtn.addEventListener("click", () => {
    customizePanel.style.display = "none";
});


const optionBtn = document.getElementById("optionBtn"); // ton image options :contentReference[oaicite:1]{index=1}
const optionsPanel = document.getElementById("optionsPanel");
const closeOptions = document.getElementById("closeOptionsBtn");
const cheatCheckbox = document.getElementById("cheatCheckbox");

// Ouvre le panneau Options
optionBtn.addEventListener("click", () => {
    optionsPanel.style.display = "flex";
});

// Ferme le panneau
closeOptions.addEventListener("click", () => {
    optionsPanel.style.display = "none";
});

// Met à jour la variable cheat
cheatCheckbox.addEventListener("change", (e) => {
    cheat = e.target.checked;
    console.log("Cheat mode:", cheat);
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


 const previewBox = document.getElementById("previewBox");
  const previewImg = document.getElementById("previewImg");
  const thumbnails = document.querySelectorAll("#customizePanel fieldset img");

  thumbnails.forEach(th => {
    th.addEventListener("mouseenter", () => {
      // Si l'image correspond à "Aucun", on ne fait rien
      // Option A : on teste l'attribut alt
      if (th.alt && th.alt.toLowerCase() === "aucun") {
        return;
      }
      // Option B : on teste la src (selon votre organisation, 
      // ici on regarde si le nom de fichier contient "Aucun.png")
      // if (th.src.includes("Aucun.png")) {
      //   return;
      // }

      // Sinon, on affiche l'aperçu
      previewImg.src = th.src;
      previewBox.style.display = "block";
    });

    th.addEventListener("mouseleave", () => {
      // Même si c'est "Aucun", masquer est sans conséquence
      previewBox.style.display = "none";
    });
  });


function createSmokeEffect(pos) {
    const ps = new BABYLON.ParticleSystem("smoke", 100, scene);
    ps.particleTexture = new BABYLON.Texture("images/smoke.png", scene);
    ps.minEmitBox = new BABYLON.Vector3(-1, 0, -1);
    ps.maxEmitBox = new BABYLON.Vector3(1, 2, 1);
    ps.color1 = new BABYLON.Color4(0.8, 0.8, 0.8, 1);
    ps.color2 = new BABYLON.Color4(0.4, 0.4, 0.4, 1);
    ps.minSize = 1;
    ps.maxSize = 2;
    ps.minLifeTime = 0.5;
    ps.maxLifeTime = 1.0;
    ps.emitRate = 50;
    ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    ps.direction1 = new BABYLON.Vector3(-1, 1, -1);
    ps.direction2 = new BABYLON.Vector3(1, 2, 1);
    ps.gravity = new BABYLON.Vector3(0, 0.5, 0);
    ps.emitter = pos.clone();
    ps.start();
    setTimeout(() => {
        ps.stop();
        ps.dispose();
    }, 1000);
}

function createDreamyExplosionPS(scene, position, durationMs = 4000) {
    const subsystems = [];

    function makeSystem(name, capacity, texturePath, emitter, configure) {
        const sys = new BABYLON.ParticleSystem(name, capacity, scene);
        sys.particleTexture = new BABYLON.Texture(texturePath, scene);
        sys.emitter = position.clone();
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
            sys.color1 = new BABYLON.Color4(0.6, 0.1, 0.8, 1);
            sys.color2 = new BABYLON.Color4(1.0, 0.5, 0.9, 1);
            sys.colorDead = new BABYLON.Color4(0, 0, 0.2, 0);
            sys.minSize = 0.5;
            sys.maxSize = 4; // un peu plus gros
            sys.minLifeTime = 0.5;
            sys.maxLifeTime = 2.0; // vie plus longue pour le fondu
            sys.emitRate = 1500;
            sys.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
            sys.direction1 = new BABYLON.Vector3(-1, -1, -1);
            sys.direction2 = new BABYLON.Vector3(1, 1, 1);
        }
    );

    // 2) Sparks blanc–bleu
    makeSystem(
        "dreamSparks", 1000,
        "images/flairsmall.png",
        new BABYLON.BoxParticleEmitter(),
        sys => {
            sys.minEmitBox = new BABYLON.Vector3(-1, -1, -1); // étendu
            sys.maxEmitBox = new BABYLON.Vector3(1, 1, 1);
            sys.color1 = new BABYLON.Color4(1, 1, 1, 1);
            sys.color2 = new BABYLON.Color4(0.5, 0.7, 1, 1);
            sys.colorDead = new BABYLON.Color4(0, 0, 0, 0);
            sys.minSize = 0.1;
            sys.maxSize = 0.7;
            sys.minLifeTime = 0.5;
            sys.maxLifeTime = 1.5;
            sys.emitRate = 1000;
            sys.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
            sys.minEmitPower = 2;
            sys.maxEmitPower = 6;
            sys.updateSpeed = 0.02;
        }
    );

    // 3) Fumée pastel
    makeSystem(
        "dreamSmoke", 1000,
        "images/smoke.png",
        new BABYLON.SphereParticleEmitter(1),
        sys => {
            sys.color1 = new BABYLON.Color4(0.8, 0.6, 1, 0.5);
            sys.color2 = new BABYLON.Color4(1.0, 0.8, 1, 0.3);
            sys.colorDead = new BABYLON.Color4(1, 1, 1, 0);
            sys.minSize = 3;
            sys.maxSize = 6;
            sys.minLifeTime = 1.0;
            sys.maxLifeTime = 2.5;
            sys.emitRate = 400;
            sys.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
            sys.gravity = new BABYLON.Vector3(0, 0.3, 0);
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
                    sys.maxEmitBox = new BABYLON.Vector3(r, r, r);
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
        true, {
            audioEngine: true
        },
        true
    );
    scene = createScene();

    audioManager = new AudioManager(scene);
    await Promise.all([
        audioManager.load("purchase", "images/purshased.wav", {
            volume: 0.1
        }),
        audioManager.load("pickitem", "images/pickitem.wav", {
            volume: 0.2
        }),
        audioManager.load("jump", "images/jump.wav", {
            volume: 0.2
        }),
        audioManager.load("fish", "images/fish.wav"),
        audioManager.load("fishnorm", "images/fishnormal.wav"),
        audioManager.load("dice", "images/dice.wav"),
        audioManager.load("fail", "images/fail.wav", {
            volume: 0.2
        }),
        audioManager.load("chest", "images/chest.mp3"),
        audioManager.load("horn", "images/horn.wav"),
        audioManager.load("lock", "images/lock.wav", {
            volume: 0.2
        }),
        audioManager.load("watersplash", "images/watersplash.wav"),
        audioManager.load("trigger", "images/trigger.mp3", {
            volume: 0.1
        }),
        audioManager.load("angry", "images/angry.wav", {
            loop: true,
            volume: 0.3
        }),
        audioManager.load("drop", "images/drop.mp3"),
        audioManager.load("explo", "images/explo.wav", {
            volume: 0.3
        }),
        audioManager.load("miam", "images/miam.wav", {
            volume: 0.3
        }),
        audioManager.load("charge", "images/charge.wav", {
            volume: 0.3
        }),

    ]);

    if (player) {
        player.am = audioManager;
    }
    if (fishingManager) {
        fishingManager.am = audioManager;
    }
    if (miniGameManager) {
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

    CAM_MAX_NORMAL = camera.radius; // ta distance « normale »
    CAM_MAX_ZOOMED = camera.radius * 0.4; // la distance « zoomée »
    camIsZoomed = false; // toggle state
    camTargetRadius = CAM_MAX_NORMAL; // cible vers laquelle on interpolera
    window.addEventListener('fishingEnded', () => {
        animateCameraToPlayerView();
        canvas.requestPointerLock();
    });




    startTimer(timerDuration);


    isPlayerAttacking = false;

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
            const bonus = carrotLoverStacks;
            const total = baseGain + bonus;
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

        for (const zoneData of funZones) {
            const {
                mesh,
                animation
            } = zoneData;
            const d = BABYLON.Vector3.Distance(scene.player.mesh.position, mesh.position);
            if (d < 4.5) {
                nearInteract = true;
                promptDiv.textContent = "press E";

                if (inputStates.interact) {
                    console.log("Interacting with fun zone");
                    if (animation) {
                        animation.play(false);
                    }
                    inputStates.interact = false;
                }

                break;
            }
        }


        const bossQuest = questManager.quests.find(q => q.id === "quest3");
        if (bossQuest) {
            console.log(bossQuest.status);
        }
        // ——— GESTION DU BOSS DANS LE RENDER LOOP ———
        if (scene.bossMesh && bossQuest) {
            const bossPos = scene.bossMesh.position;
            const db = BABYLON.Vector3.Distance(player.mesh.position, bossPos);

            // — PHASE READY : attente du coup (seulement si le joueur est proche) —
            if (db < 8 && scene.bossPhase === "ready") {
                nearInteract = true;
                promptDiv.textContent = "Press E to attack the piñata";

                // On vérifie le cooldown, le flag d’attaque, et l’input
                if (inputStates.interact && Date.now() - lastBossHit >= 3000 && !isPlayerAttacking) {
                    // On bloque toute nouvelle attaque
                    isPlayerAttacking = true;
                    inputStates.interact = false;

                    // 1) Lancement de l’animation “coup” du joueur
                    player.currentAnim?.stop();
                    player.animationGroups.coup.play(false);
                    audioManager.play("charge");


                    // 2) Après 1s (durée de l’animation), on applique le vrai coup
                    setTimeout(() => {
                        // Mise à jour du cooldown
                        lastBossHit = Date.now();
                        // Dégât au boss
                        scene.bossHealth--;
                        showToast(`Hit on the piñata! (${3 - scene.bossHealth}/3)`, 1000);

                        // Drop de la pièce
                        const dropFiles = ["bonbon1.glb", "bonbon2.glb", "bonbon3.glb"];
                        const idx = 3 - scene.bossHealth - 1;
                        const file = dropFiles[idx];
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
                            piece.receiveShadows = true;

                            const agg = new BABYLON.PhysicsAggregate(piece, BABYLON.PhysicsShapeType.MESH, {
                                mass: 20,
                                restitution: 0.2
                            }, scene);
                            agg.body.setLinearVelocity(new BABYLON.Vector3((Math.random() - 0.5) * 4, Math.random() * 3 + 0.5, (Math.random() - 0.5) * 4));
                            scene.bossPieces.push(piece);
                            audioManager.play("drop");
                        });

                        // Passage en phase attaque
                        scene.bossPhase = "attacking";
                        scene.bossAttackStart = Date.now();
                        scene.bossAttackTotal = 5000;
                        scene.bossAttackMaxR = 20;

                        // Création de la zone de dégâts invisible
                        const hitSphere = BABYLON.MeshBuilder.CreateSphere("hitSphere", {
                            diameter: 1
                        }, scene);
                        hitSphere.isVisible = false;
                        hitSphere.position.copyFrom(bossPos);
                        scene.bossAttackHitSphere = hitSphere;
                        audioManager.play("explo");

                        // Lancement du système de particules
                        const psw = createDreamyExplosionPS(scene, bossPos, scene.bossAttackTotal);
                        scene.bossAttackPS = psw;
                        psw.start();

                        // On réactive la possibilité d’attaquer
                        isPlayerAttacking = false;
                    }, 800);
                }
            }

            // — PHASE ATTACKING : en cours d’attaque (toujours active) —
            if (scene.bossPhase === "attacking") {
                const now = Date.now();
                const elapsed = now - scene.bossAttackStart;
                const total = scene.bossAttackTotal;
                const maxR = scene.bossAttackMaxR;
                const half = total / 2;
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
                    // 1) Suppression de la zone de dégâts
                    hitSphere.dispose();
                    scene.bossAttackHitSphere = null;

                    // 2) Arrêt de l’émission (les particules restantes continuent)
                    const ps = scene.bossAttackPS;
                    ps.emitRate = 0;
                    ps.stop();

                    // 3) Suppression totale après la vie max des particules
                    const fadeOutMs = ps.maxLifeTime * 1000;
                    setTimeout(() => {
                        ps.dispose();
                        scene.bossAttackPS = null;
                    }, fadeOutMs);

                    // 4) Retour en état “ready”
                    scene.bossPhase = "ready";
                }
            }

            // — SI LE BOSS MEURT —
            if (scene.bossHealth <= 0) {
                showToast("You managed to break the piñata! Collect the candies", 3000);
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




        chests.forEach(({
            mesh,
            id
        }) => {
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
                portalMesh.dispose();
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
                showToast("Candy collected!", 2000);
                scene.collectedPieces.push(piece.name); // ou un id simple
                piece.dispose();
                return false;
            }
            return true;
        });

        if (
            scene.repairStation &&
            scene.collectedPieces.length > 0 &&
            (scene.repairStation._placed || 0) < 3 // ← on n’entre ici que si < 3 pièces déposées
        ) {
            const distr = BABYLON.Vector3.Distance(player.mesh.position, scene.repairStation.position);
            if (distr < 5) {
                nearInteract = true;
                promptDiv.textContent = "Press E to deposit a candy";

                if (inputStates.interact) {
                    const before = scene.repairStation._placed || 0;
                    scene.repairStation._placed = before + 1;

                    showToast(`Candy deposited! (${scene.repairStation._placed}/3)`, 1000);


                    inputStates.interact = false;

                    // si c’était la 3ᵉ, on complète la quête et on désactive le prompt
                    if (scene.repairStation._placed >= 3) {
                        scene.ItemPose = true;
                        showToast("You filled the jar! Quest complete.", 3000);
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
                promptDiv.textContent = "Press E to take the key";
                if (inputStates.interact) {
                    scene.keyMesh.dispose();
                    scene.keyPicked = true;
                    showToast("You have picked up the key!", 2000);
                    // Change le titre de la quête dans le carnet
                    const q2 = questManager.quests.find(q => q.id === "quest2");
                    if (q2) {
                        q2.title = "Bring the key to the officer";
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
            challengeTimer.style.display = "block";
            abortAttemptBtn.style.display = "block";
            updateQuest1AttemptsDisplay();
        }

        // 2) En cours de tentative
        if (quest1Started && !quest1Finished) {
            const elapsed = questManager.elapsedSeconds("quest1");
            const remaining = QUEST1_LIMIT - elapsed;

            if (remaining > 0) {
                // MAJ du chrono mm:ss
                const m = Math.floor(remaining / 60).toString().padStart(2, "0");
                const s = Math.floor(remaining % 60).toString().padStart(2, "0");
                document.getElementById("challengeTime").textContent = `${m}:${s}`;

                // Succès
                if (player.mesh.intersectsMesh(quest1EndZone, false)) {
                    quest1Finished = true;
                    scene.JumpFini = true;
                    quest1Started = false;
                    challengeTimer.style.display = "none";
                    abortAttemptBtn.style.display = "none";
                    questManager.completeQuest("quest1");
                    const npc1 = npcMeshes.find(npc => npc.id === "quest1");
                    if (npc1 && npc1.mesh.actionManager) {
                        npc1.mesh.actionManager.dispose();
                        // on cache aussi l'invite
                        promptDiv.style.display = "none";
                    }
                    showToast("Congratulations! You have completed the challenge.", 3000);
                }
            } else {
                // Échec de la tentative
                quest1Started = false;
                quest1AttemptsLeft--;
                challengeTimer.style.display = "none";
                abortAttemptBtn.style.display = "none";
                updateQuest1AttemptsDisplay();

                if (quest1AttemptsLeft > 0) {
                    showToast(`Time's up! Remaining attempts: ${quest1AttemptsLeft}`, 3000);
                } else {
                    // No more attempts → pity
                    quest1Finished = true;
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
            }, {
                loop: true,
                autoplay: false,
                volume: 0.01,
                streaming: true,
                spatialSound: false
            }
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
            BABYLON.PhysicsShapeType.BOX, {
                mass: 0,
                friction: 1.0,
                restitution: 0.0
            },
            scene
        );
        allAggregates.push(aggregate);
        const body = aggregate.body;
        body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);
        platform._hkBody = body;

        // 3) Animation “va-et-vient” en calculant alpha ∈ [0,1]
        let prevPos = p_from.clone();
        const handle = scene.onBeforeRenderObservable.add(() => {
            const dt = scene.getEngine().getDeltaTime() * 0.001; // en s
            const t = performance.now() * 0.001;
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
        movingPlatforms.push({
            platform,
            handle
        });
    });
}



function clearMovingPlatforms(scene) {
    for (const {
            platform,
            handle
        }
        of movingPlatforms) {
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
            chest.scaling = new BABYLON.Vector3(4, 4, 4);

            chest.receiveShadows = true;

            chest.checkCollisions = false;
            chests.push({
                mesh: chest,
                id: chestId
            });
            chestOpened[chestId] = false;
        }
    );
}

function createRepairStation(x, y, z) {
    // Charger la station où on placera les pièces
    repairStationMesh = BABYLON.SceneLoader.ImportMesh(
        "", "images/", "potbonbon.glb", scene,
        meshes => {
            scene.repairStation = meshes[0];
            scene.repairStation.position.set(x, y - 1, z); // ajustez au niveau
            scene.repairStation.receiveShadows = true;
            scene.repairStation.checkCollisions = false;
            meshes.forEach(m => {
                if (!(m.name == "__root__")) {
                    const boxAgg = new BABYLON.PhysicsAggregate(m, BABYLON.PhysicsShapeType.MESH);
                    allAggregates.push(boxAgg);
                }
            });
        }
    );
}

function createScene() {

    let scene = new BABYLON.Scene(engine);


    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogColor = new BABYLON.Color3(0.8, 0.9, 1.0);
    scene.clearColor = new BABYLON.Color3(0.8, 0.9, 1.0);
    scene.fogDensity = 0.0014;


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
        if (currentLevel === 3) {
            moutonsManager.updateAll(player);
            moutonsManager.moutons.forEach(mouton => {
                mouton.am = audioManager;

            });
            if (!playerDead && !invulnerable && currentLevel === 3) {
                moutonsManager.moutons.forEach(mouton => {
                    if (mouton.mesh.intersectsMesh(player.mesh, false)) {
                        handlePlayerDeath(5);
                    }
                });
            }
        }

        if (!playerDead && !invulnerable && player.mesh.position.y < -50) {
            if (insuranceBought && !insuranceUsed) {
                insuranceUsed = true;
                player.reset_position(scene, currentLevel);
                showToast("Your insurance makes you respawn instantly !", 3000);
                invulnerable = true;
                setTimeout(() => invulnerable = false, 1000);
            } else {
                handlePlayerDeath(10);
            }
        }


    });
    createLights(scene);

    player = new Player(scene, {
        accessoriesConfig: initialAccessoriesConfig
    }, cheat);
    scene.player = player;

    if (currentLevel === 3) {
        spawnPosition = new BABYLON.Vector3(10, 10, 10);
    } else {
        spawnPosition = new BABYLON.Vector3(0, 10, 0);
    }

    orbsManager = new OrbsManager(scene);

    enemiesManager = new EnemiesManager(scene, audioManager);

    moutonsManager = new MoutonsManager(scene, audioManager, caveBounds);

    miniGameManager = new MiniGameManager(
        () => euros,
        (newVal) => {
            euros = newVal;
            updateEurosUI();
        }
    );

    fishingManager = new FishingManager(
        () => euros,
        (v) => {
            euros = v;
            updateEurosUI();
        },
        (msg, duration) => showToast(msg, duration)
    );
    scene.fishingManager = fishingManager;

    const leaveBtn = document.getElementById('leaveFishingBtn');
    if (leaveBtn) {
        leaveBtn.addEventListener("click", () => {
            fishingManager.hide();
            animateCameraToPlayerView();
            canvas.requestPointerLock();
        });
    }


    enemiesManager.enemies.forEach(e => {});

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
    scene.questManager = questManager;

    scene.keyMesh = null;
    scene.keyPicked = false;

    scene.bossMesh = null;
    scene.bossHealth = 3;
    scene.bossPieces = [];
    scene.collectedPieces = [];
    scene.repairStation = null;
    scene.bossPhase = "ready"; // “ready” → peut frapper, “attacking” → en train d’attaquer

    scene.ItemPose = false;
    scene.JumpFini = false;



    scene.onBeforeRenderObservable.add(() => {
        if (cutsceneActive) return;
        scene.camera.upperRadiusLimit = camTargetRadius;
        scene.camera.radius = BABYLON.Scalar.Lerp(
            scene.camera.radius,
            camTargetRadius,
            0.05 // 5% par frame, à ajuster pour la vitesse
        );

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

function createFinishPoint(x, y, z) {

    finishMesh = BABYLON.MeshBuilder.CreateBox("finish", {
        size: 2
    }, scene);
    shopPosition = finishMesh.position.clone();
    finishMesh.position.set(x, y, z);
    finishMesh.isVisible = false;
    finishMesh.checkCollisions = true;
    finishMeshes.push(finishMesh);

    if (currentLevel === 3) {
        BABYLON.SceneLoader.ImportMesh("", "images/", "shop.glb", scene, (meshes) => {
            const finishModel = meshes[0];

            // On attache le modèle
            finishModel.parent = finishMesh;
            finishModel.receiveShadows = true;

            // 1) On scale le nœud qui va porter la hit-box
            finishMesh.scaling = new BABYLON.Vector3(4, 4, -4);

            // 2) On crée ensuite l'aggregate sur finishMesh (déjà mis à l’échelle)
            const pondaggreg = new BABYLON.PhysicsAggregate(
                finishMesh,
                BABYLON.PhysicsShapeType.BOX, {
                    mass: 0
                },
                scene
            );
            allAggregates.push(pondaggreg);

            // Rotation (tu peux la laisser après, elle n’affecte pas la taille)
            finishModel.rotationQuaternion = BABYLON.Quaternion.RotationAxis(
                BABYLON.Axis.Y,
                -Math.PI / 2
            );

            finishMeshes.push(finishModel);
        });
    } else {

        BABYLON.SceneLoader.ImportMesh("", "images/", "finish.glb", scene, (meshes) => {
            const finishModel = meshes[0];
            finishModel.parent = finishMesh;

            finishModel.receiveShadows = true;
            finishModel.rotation.y = Math.PI / 2;
            finishModel.scaling = new BABYLON.Vector3(1, 1, -1);

            if (currentLevel === 2) {
                finishModel.rotationQuaternion = BABYLON.Quaternion.RotationAxis(
                    BABYLON.Axis.Y,
                    -Math.PI / 2
                );
            }
            finishMeshes.push(finishModel);
            console.log("Modèle finish.glb chargé et attaché à la boîte");
        });

    }
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
    const finalMesh = BABYLON.MeshBuilder.CreateBox("finalPoint", {
        size: 15
    }, scene);
    finalMesh.position.set(x, y, z);
    finalMesh.isVisible = false;
    finalMesh.checkCollisions = true;


    // 3) Prépare le prompt
    let isNear = false;
    const {
        ActionManager,
        ExecuteCodeAction,
        KeyboardEventTypes
    } = BABYLON;

    // Assurez-vous d'avoir une <div id="promptDiv"></div> dans votre HTML
    const promptDiv = document.getElementById("promptDiv");

    // 4) ActionManager pour détecter l'entrée/sortie de collision
    finalMesh.actionManager = new ActionManager(scene);

    // Entrée en collision → on affiche le message
    finalMesh.actionManager.registerAction(
        new ExecuteCodeAction({
                trigger: ActionManager.OnIntersectionEnterTrigger,
                parameter: {
                    mesh: player.mesh
                }
            },
            () => {
                isNear = true;
                promptDiv.textContent = "Press E to.. BITE THE SACRED CARROT !";

            }
        )
    );

    // Sortie de collision → on cache le message
    finalMesh.actionManager.registerAction(
        new ExecuteCodeAction({
                trigger: ActionManager.OnIntersectionExitTrigger,
                parameter: {
                    mesh: player.mesh
                }
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



function createGamblingTable(x, y, z) {
    BABYLON.SceneLoader.ImportMesh("", "images/", "gamblingtable.glb", scene, (meshes) => {
        gamblingTableMesh = meshes[0];
        gamblingTableMesh.position = new BABYLON.Vector3(x, y + 0.8, z);
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

        miniGameZone = BABYLON.MeshBuilder.CreateBox("miniZone", {
            size: 6
        }, scene);
        miniGameZone.position = gamblingTableMesh.position.clone();
        miniGameZone.isVisible = false;

        const matZone = new BABYLON.StandardMaterial("zoneMat", scene);
        matZone.diffuseColor = new BABYLON.Color3(1, 1, 0);
        matZone.alpha = 0.3;
        miniGameZone.material = matZone;

        miniGameZone.actionManager = new BABYLON.ActionManager(scene);

        miniGameZone.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction({
                    trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger,
                    parameter: {
                        mesh: player.mesh
                    }
                },
                () => {
                    document.exitPointerLock();
                    miniGameManager.showInterface();
                }
            )
        );

        miniGameZone.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction({
                    trigger: BABYLON.ActionManager.OnIntersectionExitTrigger,
                    parameter: {
                        mesh: player.mesh
                    }
                },
                () => {
                    miniGameManager.hideInterface();
                    canvas.requestPointerLock();
                }
            )
        );
    });
}

function createPond(x, y, z) {
    BABYLON.SceneLoader.ImportMesh("", "images/", "pond.glb", scene, (meshes) => {
        pondMesh = meshes[0];
        pondMesh.position = new BABYLON.Vector3(x, y, z);
        pondMesh.receiveShadows = true;
        pondPosition = pondMesh.position.clone();
        meshes.forEach(m => {
            m.checkCollisions = true;
            m.receiveShadows = true;
            if (!(m.name == "__root__")) {
                const pondaggreg = new BABYLON.PhysicsAggregate(m, BABYLON.PhysicsShapeType.MESH);
                allAggregates.push(pondaggreg);
            }
        });

        pondZone = BABYLON.MeshBuilder.CreateBox("pondZone", {
            size: 1
        }, scene);
        pondZone.position = pondMesh.position.clone();
        pondZone.isVisible = false;
        pondZone.checkCollisions = false;
        pondZone.isPickable = false;
        pondZone.ellipsoid = new BABYLON.Vector3(0, 0, 0);
        pondZone.ellipsoidOffset = new BABYLON.Vector3(0, 0, 0);

        pondZone.actionManager = new BABYLON.ActionManager(scene);
        pondZone.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction({
                    trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger,
                    parameter: {
                        mesh: player.mesh
                    }
                },
                () => {
                    console.log("Player entered pond zone");
                    showToast("Press E to fish", 2000);
                    window.addEventListener("keydown", onEnterFishing);
                }
            )
        );
        pondZone.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction({
                    trigger: BABYLON.ActionManager.OnIntersectionExitTrigger,
                    parameter: {
                        mesh: player.mesh
                    }
                },
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
        BABYLON.SceneLoader.ImportMesh("", "images/", "niveau1.glb", scene, function(meshes) {
            console.log("Import niveau", level, ":", meshes.map(m => `${m.name} → ${m.getClassName()}`));


            BABYLON.SceneLoader.ImportMesh("", "images/", "grass.glb", scene, function(grassMeshes) {
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
                    // ← OBLIGATOIRE si ton GLB comporte des matériaux unlit ou emissifs
                    mesh.material.unlit = false;
                    mesh.material.freeze();
                }


                if (!(mesh.name == "__root__")) {
                    const lvl1aggreg = new BABYLON.PhysicsAggregate(mesh, BABYLON.PhysicsShapeType.MESH);
                    allAggregates.push(lvl1aggreg);
                }


            });

            const spawnPositions = [
                new BABYLON.Vector3(17.6, 1, -31),
                new BABYLON.Vector3(50.8, 1, -59),
                new BABYLON.Vector3(65.3, 1, -115.3),
                new BABYLON.Vector3(83, 1, -167.6),
                new BABYLON.Vector3(211.9, 1, -151),
                new BABYLON.Vector3(104.9, 17, -36),
                new BABYLON.Vector3(102.3, 43, -10.2),
                new BABYLON.Vector3(113.5, 54.2, 12.5),
                new BABYLON.Vector3(134.5, 56.2, 26.1),
                new BABYLON.Vector3(198.9, 73, 86.8),
                new BABYLON.Vector3(253.1, 94.4, 55.9),
                new BABYLON.Vector3(254, 100, 29.3),
                new BABYLON.Vector3(233.6, 91, -29.9),
                new BABYLON.Vector3(178.3, 120, -58.9),
                new BABYLON.Vector3(168.2, 120, -50),
                new BABYLON.Vector3(180.2, 120, -52.8),
                new BABYLON.Vector3(103.8, 23, -92),
                new BABYLON.Vector3(173.4, 51, -127.5),
                new BABYLON.Vector3(237.4, 64, -98.3),
                new BABYLON.Vector3(62.8, 1, -101.6),
            ];

            orbsManager.createOrbsAtPositions(spawnPositions);

            console.log("Map t.glb chargée et ajustée pour le niveau 1");

            createFinishPoint(175.3, 120, -54.3);



            createChest(227.2, 68, 151.3, `lvl1_chest1`);

            createGamblingTable(176.8, 120, -22.9);



            const p1_from = new BABYLON.Vector3(120, 55, 25);
            const p1_to = new BABYLON.Vector3(150, 55, 28);
            createMovingPlatform(scene, p1_from, p1_to, 0.8);

            createPond(66, 0, -130);




        });
        return null;
    } else if (level === 2) {
        BABYLON.SceneLoader.ImportMesh("", "images/", "niveau2.glb", scene, function(meshes) {

            BABYLON.SceneLoader.ImportMesh("", "images/", "niveau2HERBE.glb", scene, function(grassMeshes) {
                importedMeshes = importedMeshes.concat(grassMeshes);
            });

            importedMeshes = importedMeshes.concat(meshes);

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
                new BABYLON.Vector3(6, 5, 58),
                new BABYLON.Vector3(-33, 15, 95),
                new BABYLON.Vector3(-96, 18, 184),
                new BABYLON.Vector3(-116, 23, 164),
                new BABYLON.Vector3(-120, 25, 134),
                new BABYLON.Vector3(-116, 29, 107),
                new BABYLON.Vector3(25.7, 3.7, -68.9),
                new BABYLON.Vector3(56.0, 15.6, -137.8),
                new BABYLON.Vector3(101.0, 34.3, -209.4),
                new BABYLON.Vector3(57.5, 60.4, -141.0),
                new BABYLON.Vector3(47.4, 60.4, -139.9),
                new BABYLON.Vector3(32.5, 60.4, -138.2),
                new BABYLON.Vector3(18.7, 60.4, -136.7),
                new BABYLON.Vector3(-54.3, 54.8, -122.5)

            ];



            createFunZone(25.7, 4.8, -107.3, scene.player.animationGroups.jump);

            const pos1 = new BABYLON.Vector3(5.5, 58.6, -135.4);
            const pos2 = new BABYLON.Vector3(58.3, 58.6, -141.3);
            createMovingPlatform(scene, pos1, pos2, 0.5);
            orbsManager.createOrbsAtPositions(spawnPositions);

            console.log("Map t.glb chargée et ajustée pour le niveau 1");

            createChest(-93, 30, 100, `lvl1_chest1`);
            createChest(-94, 30, 111, `lvl1_chest2`);
            createChest(68.2, 29.3, -105.2, `lvl2_chestA1`);
            createChest(88.6, 7.9, -158.4, `lvl2_chestA2`);

            createFinishPoint(-37.3, 54, -130.5);
            createGamblingTable(-51.6, 54.5, -119.4);



            const paths = [
                [
                    new BABYLON.Vector3(-80, 20, 120),
                    new BABYLON.Vector3(-22, 18, 133),


                ],
                [
                    new BABYLON.Vector3(-41, 17, 170),
                    new BABYLON.Vector3(-85, 19, 124),
                ],
                [
                    new BABYLON.Vector3(46, 15, -120),
                    new BABYLON.Vector3(50, 16, -237),
                ]
            ];

            const configs = paths.map(p => ({
                path: p,
                speed: 0.071,
                range: 15
            }));
            enemiesManager.createEnemies(configs);

        });
        return null;
    } else if (level === 3) {
        BABYLON.SceneLoader.ImportMesh("", "images/", "niveau3.glb", scene, function(meshes) {

            BABYLON.SceneLoader.ImportMesh("", "images/", "niveau3HERBE.glb", scene, function(grassMeshes) {
                importedMeshes = importedMeshes.concat(grassMeshes);
            });
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

            const p1_from = new BABYLON.Vector3(-140.3, 6.5, -122.4);
            const p1_to = new BABYLON.Vector3(-178.2, 6.5, -134.4);
            createMovingPlatform(scene, p1_from, p1_to, 0.5);

            const p2_from = new BABYLON.Vector3(-173.5, 6.5, -119.3);
            const p2_to = new BABYLON.Vector3(-147.9, 6.5, -113.1);
            createMovingPlatform(scene, p2_from, p2_to, 0.5);
            const p3_from = new BABYLON.Vector3(-148.7, 6.5, -99.7);
            const p3_to = new BABYLON.Vector3(-176.8, 6.5, -105.3);
            createMovingPlatform(scene, p3_from, p3_to, 0.5);

            const p4_from = new BABYLON.Vector3(-178.16, 6.5, -81.8);
            const p4_to = new BABYLON.Vector3(-213.7, 6.5, -76.3);
            createMovingPlatform(scene, p4_from, p4_to, 0.5);


            createFunZone(-38.3, 1.4, -24.16, scene.player.animationGroups.boule);
            console.log("ICIIIIIIIIIIIIIIIIIIII  : ", player.animationGroups.boule);

            createFinalPoint(144, 0.5, -2.8);
            createFinishPoint(-70.2, -3.4, 15.3);

            createPond(3.3, 0.6, -48);


            // ——— Zones start / end invisibles ———
            quest1StartZone = BABYLON.MeshBuilder.CreateBox("q1Start", {
                size: 5
            }, scene);
            quest1StartZone.position.set(-83.5, 4, -69.3);
            quest1StartZone.isVisible = false;
            quest1EndZone = quest1StartZone.clone("q1End");
            quest1EndZone.position.set(-121.6, 31.5, 2.5);
            quest1EndZone.isVisible = false;

            // ——— Crée le timer ET l’affichage des tentatives ———
            challengeTimer = document.createElement("div");
            challengeTimer.id = "challengeTimer";
            challengeTimer.style = `
  position: absolute;
  top: 10%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.2em;
  display: none;
  background: rgba(255, 200, 255, 0.3);
  color: #4B0082;
  padding: 0.8em 1.2em;
  border-radius: 1.2em;
  font-family: 'Brush Script MT', cursive;
  text-shadow: 0 0 8px rgba(255,255,255,0.8);
  box-shadow: 0 0 20px rgba(173, 216, 230, 0.5);
  backdrop-filter: blur(8px);
  font-family: 'MyGameFont', sans-serif;
`;
            challengeTimer.innerHTML =
                `Remaining attempts : <span id="challengeAttempts">${quest1AttemptsLeft}</span><br>` +
                `Remaining time : <span id="challengeTime">00:30</span>`;
            document.body.appendChild(challengeTimer);

            // ——— Crée le bouton “Abandonner la tentative” ———
            abortAttemptBtn = document.createElement("button");
            abortAttemptBtn.id = "abortAttemptBtn";
            abortAttemptBtn.textContent = "Abandon the current attempt";
            abortAttemptBtn.style = `
  position: absolute;
  top: 5%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.8em;
  padding: 0.5em 1em;
  background: linear-gradient(135deg, rgba(255,180,255,0.8), rgba(200,200,255,0.8));
  color: #ffffff;
  border: 2px solid rgba(255,255,255,0.7);
  border-radius: 1.5em;
  font-family: 'Brush Script MT', cursive;
  box-shadow: 0 4px 14px rgba(255,182,193,0.6);
  cursor: pointer;
  transition: box-shadow 0.3s, transform 0.3s;
  font-family: 'MyGameFont', sans-serif;
`;
            abortAttemptBtn.style.display = "none";
            document.body.appendChild(abortAttemptBtn);

            abortAttemptBtn.addEventListener("click", () => {
                if (!quest1Started || quest1Finished) return;
                // Stoppe la tentative en cours
                quest1Started = false;
                challengeTimer.style.display = "none";
                abortAttemptBtn.style.display = "none";

                // Décrémente le compteur
                quest1AttemptsLeft--;
                updateQuest1AttemptsDisplay();
                showToast(`Attempt abandoned. Remaining attempts: ${quest1AttemptsLeft}`, 3000);

                // Si plus de tentatives, on “pitié” complète la quête
                if (quest1AttemptsLeft <= 0) {

                    quest1Finished = true;
                    scene.JumpFini = true;
                    showToast("No more attempts... the officer opens the lock out of pity.", 6000);
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
                new BABYLON.Vector3(110.3, -1.6, 0.5),
                new BABYLON.Vector3(45.7, 1.9, -76.1),
                new BABYLON.Vector3(79.3, -16.7, -152.2),
                new BABYLON.Vector3(-47.7, -2.0, 13.4),
                new BABYLON.Vector3(-36.7, 7.9, 63.8),
                new BABYLON.Vector3(4.3, 10.1, 139.7),
                new BABYLON.Vector3(-89.7, 2.5, -3.1),
                new BABYLON.Vector3(-93.6, 6.6, -79.3),
                new BABYLON.Vector3(-148.3, 8.2, -99.8),
                new BABYLON.Vector3(-194.9, 8.3, -79.2),
                new BABYLON.Vector3(-190.6, 32.8, -10.2),
                new BABYLON.Vector3(-155.1, 34.1, -14.4),
                new BABYLON.Vector3(-159.2, 33.8, 8.7)
            ];
            orbsManager.createOrbsAtPositions(spawnPositions);
            // Création du finish point


            createRepairStation(28.4, 2, -67.3);

            loadLocks();

            createRedBox();


            createexclamationMark();

            // ————— Données et création des 4 PNJ —————
            const npcData = [{
                    position: new BABYLON.Vector3(0.8, 2.1, -22.3),
                    questId: "quest0",
                    dialogue: ["Hi ! I heard you were looking to take a bite of The Sacred Carrot...", "You're in luck!", "I dropped my wallet in the lake nearby, and apparently you have some fishing skills.", "I was hoping you could fish it out for me, as I have the keys to one of the locks giving access to the carrot, if you know what I mean."],
                    title: "Fish the wallet out of the lake"
                },
                {
                    position: new BABYLON.Vector3(-75.86, 2.4, -51.42),
                    questId: "quest1",
                    dialogue: ["Hey !", "Do you like challenges?", "It seems you're looking to take a bite of the sacred carrot..", "HAHAHAHAH.. haha.. sorry, I got carried away..", "It's an achievable dream, especially since I have the ability to open one of the locks on the portal...", "But you have to earn it! Do you see this jump? ", "If you manage to complete it in under 90 seconds, this pretty lock will disappear! Good luck!"],
                    title: "Finish the course in under 90 seconds"
                },
                {
                    position: new BABYLON.Vector3(-44.9, 7.7, 54.4),
                    questId: "quest2",
                    dialogue: ["Hello adventurer", "You're looking to take a bite of the sacred carrot?", "I can help you, but I need your cooperation.", "I lost the key to my house at the bottom of the cave..", "If you bring it back to me, I could open one of the locks on the portal for you.", "But be careful, the cave is dangerous, you'll need courage and determination to get through it."],
                    title: "Retrieve Mr. Zou's key"
                },
                {
                    position: new BABYLON.Vector3(33.6, 2, -75.6),
                    questId: "quest3",
                    dialogue: ["Hey !", "Are you trying to open this lock? I think I can help you. See the big piñata behind me?", "If you break it fast enough, no one will notice you and you can bring me back my 3 favorite candies.", "In exchange, I'll open one of the locks for you. You'll drop them in the candy bucket right here.", " Win-win ! "],
                    title: "Break the piñata and collect the candies"
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
                                lockPos.add(rotatedOffset), // positionnez-la un peu au-dessus et en retrait
                                scene
                            );
                            lockCamera.setTarget(lockPos); // cadre le cadenas
                            lockCamera.detachControl(canvas); // pas de contrôle utilisateur
                        }

                        // 2) Switch sur la caméra fixe
                        camera.detachControl(canvas); // libère la souris de la 3rd-person
                        scene.activeCamera = lockCamera;
                        audioManager.play("lock");

                        // 3) Effet fumigène, disparition, puis retour
                        createSmokeEffect(lockPos);
                        setTimeout(() => {
                            lock.mesh.dispose(); // supprime le cadenas
                        }, 1200); // juste après la fumée
                        setTimeout(() => {
                            // re-switch sur la 3rd-person camera
                            scene.activeCamera = camera;
                            camera.attachControl(canvas, true);
                            lockCamera.dispose();
                            lockCamera = null;
                        }, 1600); // 0.8s fumée + 0.7s pause = 1.5s total
                    }

                );


                npcMeshes.push(npc);

            });


            BABYLON.SceneLoader.ImportMesh(
                "",
                "images/",
                "pinata.glb",
                scene, // <-- utilisez ici `scene`, pas `this.scene`
                (meshes) => {
                    // 1) Récupère le root
                    const root = meshes[0];
                    root.position.set(86.5, -18.3, -189.7);
                    root.checkCollisions = true;
                    root.receiveShadows = true;
                    //root.scaling = new BABYLON.Vector3(1.2, 1.2, 1.2);

                    meshes.forEach(m => {
                        if (!(m.name == "__root__")) {
                            const boxAgg = new BABYLON.PhysicsAggregate(m, BABYLON.PhysicsShapeType.MESH);
                            allAggregates.push(boxAgg);
                        }
                    });

                    scene.bossMesh = root;
                }
            );

            BABYLON.SceneLoader.ImportMesh("", "images/", "pinata_arbre.glb", scene, (meshes) => {
                const root = meshes[0];
                root.position.set(86.5, -18.3, -189.7);
                root.checkCollisions = true;
                root.receiveShadows = true;
                root.scaling = new BABYLON.Vector3(1.2, 1.2, 1.2);

                meshes.forEach(m => {
                    if (!(m.name == "__root__")) {
                        const boxAgg = new BABYLON.PhysicsAggregate(m, BABYLON.PhysicsShapeType.MESH);
                        allAggregates.push(boxAgg);
                    }
                });


            });




            const path = [
                new BABYLON.Vector3(5, 9.2, 140.4),
                new BABYLON.Vector3(-26.6, 9.2, 136.2),
                new BABYLON.Vector3(-33.8, 9.2, 102.8)
            ];

            const path2 = [
                new BABYLON.Vector3(30, 9.2, 134.4),
                new BABYLON.Vector3(14.7, 9.2, 96)
            ];
            const path3 = [
                new BABYLON.Vector3(55, 9.2, 121.6),
                new BABYLON.Vector3(45.8, 9.2, 77.9)
            ];
            moutonsManager.createMoutons([{
                    path: path,
                    speed: 0.06,
                    range: 15
                },
                {
                    path: path2,
                    speed: 0.06,
                    range: 15
                },
                {
                    path: path3,
                    speed: 0.06,
                    range: 15
                },
            ]);

            console.log("Cave bounds:", caveBounds.min.toString(), caveBounds.max.toString());
            path.forEach((wp, i) =>
                console.log(`Waypoint ${i}:`, wp.toString(),
                    "inside?",
                    wp.x >= caveBounds.min.x && wp.x <= caveBounds.max.x &&
                    wp.y >= caveBounds.min.y && wp.y <= caveBounds.max.y &&
                    wp.z >= caveBounds.min.z && wp.z <= caveBounds.max.z
                ));



            console.log("Niveau 3 temporaire chargé !");
        });
        return null;
    }
}

function createexclamationMark() {
    BABYLON.SceneLoader.ImportMesh("", "images/", "exclam.glb", scene, (meshes) => {

        scene.exclam0 = meshes[0];
        scene.exclam0.isVisible = true;
        scene.exclam0.scaling = new BABYLON.Vector3(0.2, 0.2, 0.2);
        scene.exclam0.position.set(0.8, 2.1 + 3, -22.3);
    });

    BABYLON.SceneLoader.ImportMesh("", "images/", "exclam.glb", scene, (meshes) => {

        scene.exclam1 = meshes[0];
        scene.exclam1.isVisible = true;
        scene.exclam1.scaling = new BABYLON.Vector3(0.2, 0.2, 0.2);
        scene.exclam1.position.set(-75.86, 2.4 + 3, -51.42);
    });
    BABYLON.SceneLoader.ImportMesh("", "images/", "exclam.glb", scene, (meshes) => {

        scene.exclam2 = meshes[0];
        scene.exclam2.isVisible = true;
        scene.exclam2.scaling = new BABYLON.Vector3(0.2, 0.2, 0.2);
        scene.exclam2.position.set(-44.9, 7.7 + 3, 54.4);
    });
    BABYLON.SceneLoader.ImportMesh("", "images/", "exclam.glb", scene, (meshes) => {

        scene.exclam3 = meshes[0];
        scene.exclam3.isVisible = true;
        scene.exclam3.scaling = new BABYLON.Vector3(0.2, 0.2, 0.2);
        scene.exclam3.position.set(33.6, 2 + 3, -75.6);
    });
}

function createFunZone(x, y, z, animationGroup) {


    BABYLON.SceneLoader.ImportMesh("", "images/", "funzone.glb", scene, (meshes) => {

        const m0 = meshes[0];
        m0.isVisible = true;
        m0.checkCollisions = true;
        m0.position.set(x, y, z);
        m0.receiveShadows = true;
        m0.rotationQuaternion = BABYLON.Quaternion.RotationAxis(
            BABYLON.Axis.Y,
            -Math.PI / 2
        );

        meshes.forEach(m => {
            if (!(m.name == "__root__")) {
                const boxAgg = new BABYLON.PhysicsAggregate(m, BABYLON.PhysicsShapeType.MESH);
                allAggregates.push(boxAgg);
            }
        });

        funZones.push({
            mesh: m0,
            get animation() {
                return player.animationGroups.boule;
            }
        });
    });
}

function createRedBox() {

    redBox = BABYLON.MeshBuilder.CreateBox("redBox", {
        width: 5,
        height: 5,
        depth: 30
    }, scene);

    redBox.position.set(128, 10, -2);
    redBox.checkCollisions = true;
    redBox.isVisible = false;


    // 3) Physique Havok zéro masse pour bloquer le joueur
    const boxaggreg = new BABYLON.PhysicsAggregate(
        redBox,
        BABYLON.PhysicsShapeType.BOX, {
            mass: 0
        },
        scene
    );
    allAggregates.push(boxaggreg);

    BABYLON.SceneLoader.ImportMesh("", "images/", "portail.glb", scene, (meshes) => {
        portalMesh = meshes[0];
        portalMesh //redBox.scaling.set(0.5, 0.5, 0.5);
        portalMesh.isVisible = true;
        portalMesh.checkCollisions = true;
        portalMesh.position.set(128, 1, -2);
        portalMesh.receiveShadows = true;
        portalMesh.rotationQuaternion = BABYLON.Quaternion.RotationAxis(
            BABYLON.Axis.Y,
            -Math.PI / 2
        );

        meshes.forEach(m => {
            if (!(m.name == "__root__")) {
                const boxAgg = new BABYLON.PhysicsAggregate(m, BABYLON.PhysicsShapeType.MESH);
                allAggregates.push(boxAgg);
            }
        });
    });
}

async function loadLocks() {
    locks.length = 0;
    const lockConfig = [{
            file: "lock_red.glb",
            x: 128,
            z: -7.8 + 0 * 3.3
        },
        {
            file: "lock_gold.glb",
            x: 128,
            z: -7.8 + 1 * 3.3
        },
        {
            file: "lock_blue.glb",
            x: 128,
            z: -7.8 + 2 * 3.3
        },
        {
            file: "lock_pink.glb",
            x: 128,
            z: -7.8 + 3 * 3.3
        },
    ];

    for (let i = 0; i < lockConfig.length; i++) {
        const {
            file,
            x,
            z
        } = lockConfig[i];
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
            lockRoot.rotation.x = -Math.PI / 2;
            lockRoot.rotation.y = Math.PI / 2;
            // lockRoot.rotation.z = Math.PI / 2;

            // 5) Re-parentage des autres maillages au nouveau root
            for (let j = 1; j < geomMeshes.length; j++) {
                geomMeshes[j].parent = lockRoot;
            }
            lockRoot.checkCollisions = true;

            locks.push({
                mesh: lockRoot,
                questId: `quest${i}`
            });
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

    chests.forEach(({
        mesh
    }) => mesh.dispose());
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
    hemi.diffuse = new BABYLON.Color3(1.0, 0.8, 0.6);
    hemi.specular = new BABYLON.Color3(0.4, 0.3, 0.3);
    hemi.groundColor = new BABYLON.Color3(0.2, 0.1, 0.05);
    hemi.intensity = 0.5;


    const dir = new BABYLON.DirectionalLight("dirLight",
        new BABYLON.Vector3(-0.5, -1, -0.5), scene);
    dir.position = new BABYLON.Vector3(18, 400, -50);
    dir.diffuse = new BABYLON.Color3(1.0, 0.85, 0.6);
    dir.specular = new BABYLON.Color3(0.5, 0.4, 0.3);
    dir.intensity = 1;


    shadowGen = new BABYLON.ShadowGenerator(2048, dir);
    shadowGen.useBlurExponentialShadowMap = true;
    shadowGen.blurKernel = 32;
    scene._shadowGenerator = shadowGen;

    const glow = new BABYLON.GlowLayer("glow", scene, {
        intensity: 0.3,
        mainTextureSamples: 4
    });

}

function createThirdPersonCamera(scene, target, canvas) {
    const headOffset = new BABYLON.Vector3(0, 2, 0);
    const defaultRadius = 20;

    // 1) Active les collisions sur la scène
    scene.collisionsEnabled = true;

    // 2) Création de l’ArcRotateCamera
    camera = new BABYLON.ArcRotateCamera(
        "ThirdPersonCamera",
        BABYLON.Tools.ToRadians(0),
        BABYLON.Tools.ToRadians(45),
        defaultRadius,
        target.position.add(headOffset),
        scene
    );
    scene.camera = camera;

    // 3) Config collisions pour la caméra

    // 4) Config utilisateur
    if (camera.autoRotationBehavior) {
        camera.autoRotationBehavior.stop();
    }
    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 20;
    camera.angularSensibilityX = 2000;
    camera.angularSensibilityY = 4000;
    camera.upperBetaLimit = Math.PI / 2;
    camera.lowerBetaLimit = 0.8;
    camera.inertia = 0;
    camera.lockedTarget = target;
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
        switch (event.code) {
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
                player.wantJump++;
                break;

            case "KeyN":
                // on inverse l’état
                camIsZoomed = !camIsZoomed;
                // on met à jour la cible d’auto‐zoom
                camTargetRadius = camIsZoomed ? CAM_MAX_ZOOMED : CAM_MAX_NORMAL;
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
        switch (event.code) {
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

    document.getElementById("buyRange").onclick = buyRangeBonus;
    document.getElementById("buyFreeze").onclick = buyFreezeBonus;
    document.getElementById("buySpeed").onclick = buySpeedBonus;
    document.getElementById("buyDonate").onclick = donateBonus;
    document.getElementById("buyCarrotLover").onclick = buyCarrotLoverBonus;
    document.getElementById("buyInsurance").onclick = buyInsuranceBonus;
    document.getElementById("niveauSuivant").onclick = nextLevel;
    document.getElementById("closeShopBtn").onclick = closeShopInterface;
    document.getElementById('shopEurosAmount').textContent = euros;

    // ==== NOUVEAU : si on est au niveau 3, on masque l’item “Niveau Suivant” ====
    if (currentLevel === 3) {
        const nextItem = document.getElementById("item-niveauSuivant");
        if (nextItem) nextItem.remove();
    }
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
        showToast("Range upgraded ! Actual multiplied : " + currentRangeMult + ".", 2500);
        console.log("Bonus portée acheté");
    } else {
        console.log("Pas assez d'euros pour augmenter la portée");
        showToast("Not enough carrots !", 2500);
    }
}

function buyFreezeBonus() {
    if (freezeBought) {
        showToast("Already bought!");
        return;
    }
    if (euros >= 25) {
        euros -= 25;
        audioManager.play("purchase");
        freezeBought = true;
        addSkillIcon("iconFreeze", "images/gel.png", freezeCooldownDuration);
        updateEurosUI();
        showToast("Freeze unlocked !");
        document.getElementById("item-buyFreeze").style.display = "none";
    } else {
        showToast("Not enough carrots !");
    }
}

function update_skillicon(id, newSrc) {
    const img = document.getElementById(id);
    if (img) img.src = newSrc;
}

function triggerFreeze() {
    freezeActive = true;
    freezeCooldown = true;
    lastFreezeTime = Date.now();

    update_skillicon("iconFreeze", "images/gel_cd.png");
    showToast("Freeze activated ! 5 s");

    enemiesManager.enemies.forEach(e => e.freeze(5000));
    moutonsManager.moutons.forEach(m => m.freeze(5000));

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
        euros -= 25;
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
    speedActive = true;
    speedCooldown = true;
    lastSpeedTime = Date.now();

    update_skillicon("iconSpeed", "images/speed_cd.png");
    showToast("Speed boost activated ! 10 s");

    player.speedMult = 1.5;


    const emitterNode = new BABYLON.TransformNode("speedEmitter", scene);
    emitterNode.parent = player.mesh;
    emitterNode.position = new BABYLON.Vector3(0, 0.1, 0);

    const ps = new BABYLON.ParticleSystem("speedPS", 150, scene);
    ps.particleTexture = new BABYLON.Texture("images/flare.png", scene);

    const box = new BABYLON.BoxParticleEmitter();
    box.minEmitBox = new BABYLON.Vector3(-1, 0, -0.5);
    box.maxEmitBox = new BABYLON.Vector3(1, 0, 0.5);
    ps.particleEmitterType = box;

    ps.color1 = new BABYLON.Color4(1, 1, 0, 1.0);
    ps.color2 = new BABYLON.Color4(1, 1, 0.2, 0.6);
    ps.colorDead = new BABYLON.Color4(1, 1, 0, 0.0);

    ps.minSize = 0.05;
    ps.maxSize = 0.1;

    ps.minLifeTime = 0.2;
    ps.maxLifeTime = 0.4;

    ps.emitRate = 200;

    ps.direction1 = new BABYLON.Vector3(0, -1, 0);
    ps.direction2 = new BABYLON.Vector3(0, -2, 0);
    ps.gravity = new BABYLON.Vector3(0, -9.81, 0);

    ps.updateSpeed = 0.01;
    ps.emitter = emitterNode;
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

function handlePlayerDeath(counter) {

    if (playerDead || invulnerable) return;
    playerDead = true;
    gamePaused = true;

    const deathScreen = document.getElementById("deathScreen");
    const respawnSpan = document.getElementById("respawnTimer");
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
    t.textContent = message;
    t.style.opacity = "1";
    t.style.display = "block";
    t.style.fontFamily = "MyGameFont";
    t.style.fontSize = "30px";

    setTimeout(() => {
        t.style.transition = "opacity .5s";
        t.style.opacity = "0";
        setTimeout(() => {
            t.style.display = "none";
            t.style.transition = "";
        }, 500);
    }, duration);
}
window.showToast = showToast;

function respawnPlayer() {
    player.reset_position(scene, currentLevel);
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
    img.id = id;
    img.src = src;
    wrapper.appendChild(img);

    const cdText = document.createElement("span");
    cdText.id = `${id}_cd`;
    Object.assign(cdText.style, {
        position: "absolute",
        top: "-18px",
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: "14px",
        color: "white",
        textShadow: "0 0 4px black",
        display: "none"
    });
    wrapper.appendChild(cdText);

    bar.appendChild(wrapper);
}

function startCooldown(iconId) {
    const wrapper = document.getElementById(iconId).parentElement;
    const cdSpan = document.getElementById(`${iconId}_cd`);
    const duration = parseInt(wrapper.dataset.cooldownMs, 10);
    let remaining = Math.ceil(duration / 1000);

    cdSpan.textContent = remaining;
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
            origin: {
                x: 0.1,
                y: 0.2
            }
        });
        confetti({
            particleCount: 60,
            spread: 70,
            origin: {
                x: 0.9,
                y: 0.2
            }
        });
    }
    burst();

    const allCanvas = document.querySelectorAll('canvas');
    const cfCanvas = allCanvas[allCanvas.length - 1];
    cfCanvas.style.position = 'fixed';
    cfCanvas.style.top = '0';
    cfCanvas.style.left = '0';
    cfCanvas.style.zIndex = '1001';

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

        player.reset_position(scene, currentLevel);

        invulnerable = true;
        setTimeout(() => invulnerable = false, 1000);

        miniGameManager.resetPlays();

        console.log("[DEBUG] nextLevel() début, gamePaused=", gamePaused);
        gamePaused = false;
        console.log("[DEBUG] nextLevel() après unpause, gamePaused=", gamePaused);

        clearInterval(timerInterval);
        if (currentLevel === 3) {
            startTimer(500);
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