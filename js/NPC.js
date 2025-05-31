// js/NPC.js
import { showToast } from "./main.js";

let questBookHintShown = false;

async function typeWriter(el, text, speed = 40) {
  return new Promise(resolve => {
    el.textContent = "";
    let i = 0;
    function nextChar() {
      if (i < text.length) {
        el.textContent += text.charAt(i++);
        setTimeout(nextChar, speed);
      } else {
        resolve();
      }
    }
    nextChar();
  });
}

export default class NPC {
  /**
   * @param {BABYLON.Scene} scene
   * @param {BABYLON.Vector3} position
   * @param {string} id         Identifiant de quête (ex: "quest0")
   * @param {string} dialogue   Texte initial de la bulle
   * @param {string} questTitle Titre initial de la quête
   * @param {function} onComplete Callback quand la quête est terminée
   */
  constructor(scene, position, id, dialogues, questTitle, onComplete) {
    this.scene       = scene;
    this.id          = id;
    this.dialogues   = Array.isArray(dialogues) ? dialogues : [dialogues];
    this.initialTitle = questTitle;        // pour comparer avant/après pêche
    this.questTitle  = questTitle;
    this.onComplete  = onComplete;
    this.questManager = scene.questManager;
    this.fishingManager = scene.fishingManager; // fourni pour quest0
    this._dlgIndex   = 0;
    this.animationGroups = {};
    this.zone;

    const idx      = id.replace("quest", "");         // ex. "quest2" → "2"
const fileName = `pnj${idx}.glb`;                 // pnj2.glb

// Charge d'abord le .glb
console.log("Importing NPC mesh:", fileName);
BABYLON.SceneLoader.ImportMesh(
  /* meshNames */ "",
  /* rootUrl   */ "images/",
  /* sceneFile */ fileName,
  /* scene     */ scene,
  (meshes, particleSystems, skeletons, animationGroups) => {
    // 1) Crée un parent *à l’origine* (0,0,0)
    this.mesh = meshes[0]; // On garde le premier mesh comme référence

    // 3) Positionne & scale ton parent **après** le rattachement
    this.mesh.position.copyFrom(position);
    this.mesh.position.y -= 1;
    this.mesh.scaling = new BABYLON.Vector3(2.5,2.5,2.5); // Ajuste si besoin


    if (this.id === "quest3") {
      
      this.mesh.rotationQuaternion = BABYLON.Quaternion.RotationAxis(
    BABYLON.Axis.Y,
    -7 * Math.PI / 8
    
  );
    } ;
    if (this.id === "quest1") {
      this.mesh.rotationQuaternion = BABYLON.Quaternion.RotationAxis(
    BABYLON.Axis.Y,
    3 * Math.PI / 2
    
  );

    };

    
    if (this.id === "quest2") {
this.mesh.rotationQuaternion = BABYLON.Quaternion.RotationAxis(
    BABYLON.Axis.Y,
    -Math.PI / 4
  );
    }

    meshes.forEach(m => {
      if (!(m.name == "__root__")) {
        const boxAgg = new BABYLON.PhysicsAggregate(m, BABYLON.PhysicsShapeType.MESH);
      }
    });



    animationGroups.forEach((ag) => {
          console.log("Animation group:", ag.name);
          if (ag.name === "Idle") {
            console.log("Found idle animation group : ", ag.name);
            this.animationGroups.idle = ag;
          }
          });
        if (this.animationGroups.idle) {
          this.animationGroups.idle.play(true);
          this.currentAnim = this.animationGroups.idle;
        } 



// 2) On crée une zone invisible plus large autour du PNJ
        const zoneDiameter = 10; // largeur de la zone, ajuster selon besoin
        const zoneName = `zone_${this.id}`;
        const zone = BABYLON.MeshBuilder.CreateSphere(
          zoneName,
          { diameter: zoneDiameter },
          scene
        );
        zone.position.copyFrom(position);
        zone.isVisible  = false;
        zone.isPickable = false;
        this.interactZone = zone;

        const onDInteract = (e) => {
   // Ignore si ce n’est pas G ou si c’est un repeat (touche maintenue)
   if (e.key.toLowerCase() !== "g" || e.repeat) return;
   window.removeEventListener("keydown", onDInteract);
   this.interact(this.questManager, this.fishingManager);
   const exclamNum =  `exclam${idx}`;
   console.log("Exclam number LAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA :", exclamNum, " ET la scène.exclam  :", scene[exclamNum]);
   scene[exclamNum].dispose();
 };

        // 3) On installe l'ActionManager sur la zone
        zone.actionManager = new BABYLON.ActionManager(scene);

        // Affiche "Press G to talk" à l'entrée
        zone.actionManager.registerAction(
          new BABYLON.ExecuteCodeAction(
            {
              trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger,
              parameter: { mesh: scene.player.mesh }
            },
            () => {
              showToast("Press G to talk", 2000);
              window.addEventListener("keydown", onDInteract);
            }
          )
        );
        // Nettoie à la sortie
        zone.actionManager.registerAction(
          new BABYLON.ExecuteCodeAction(
            {
              trigger: BABYLON.ActionManager.OnIntersectionExitTrigger,
              parameter: { mesh: scene.player.mesh }
            },
            () => {
              window.removeEventListener("keydown", onDInteract);
            }
          )
        );
      },
      null,
      (sceneRef, message, exception) => {
        console.error(`⚠️ Impossible de charger ${fileName} :`, message, exception);
      }
    );
  }
  

  /**
   * Lance l’interaction avec le joueur.
   * @param {QuestManager} questManager
   * @param {FishingManager} [fishingManager] fourni pour quest0
   */
  async interact(questManager, fishingManager) {
    // 1) Libère le pointer lock pour permettre le clic
    const canvas = document.getElementById("renderCanvas");
    if (document.exitPointerLock) {
      document.exitPointerLock();
    } else if (canvas.exitPointerLock) {
      canvas.exitPointerLock();
    }

    // 2) Vérifie l’état de la quête
    const q = questManager.quests.find(q => q.id === this.id);
    if (q && q.status === "pending") {
      // Cas spécial pour la quête 0 (pêche)
      if (this.id === "quest0") {
        // Avant pêche (titre inchangé) → invite à pêcher
        if (fishingManager.questDrop.title === this.initialTitle) {
          document.getElementById("dialogueText").textContent =
            "you have to fish out Mr. X's wallet";
          const dlg = document.getElementById("dialogueBox");
          dlg.style.display = "block";
          setTimeout(() => dlg.style.display = "none", 2000);
          return;
        }
        // Après pêche (titre changé) → complète la quête^
        showToast("Thank you very much! This should help you in your quest.", 8000);
        questManager.completeQuest(this.id);
        canvas.requestPointerLock();

        if (this.interactZone.actionManager) {
          this.interactZone.actionManager.dispose();
        }
        document.getElementById("interactPrompt").style.display = "none";
        return;
      }
      if (this.id === "quest2") {
       if (!this.scene.keyPicked) {
         showToast("You must first find the hidden key at the bottom of the cave.", 3000);
         return;
       } else {
         showToast("Thank you for bringing back the key! Quest complete.", 3000);
         canvas.requestPointerLock();
         questManager.completeQuest(this.id);
         // Disable interaction on this NPC
         if (this.interactZone.actionManager) {
          this.interactZone.actionManager.dispose();
        }
        document.getElementById("interactPrompt").style.display = "none";
        return;
       }
       
     }
     if (this.id === "quest3") {
       if (!this.scene.ItemPose) {
         showToast("You must retrieve the candies and bring them back to the jar.", 2000);
         return;
       } else {
         showToast("Thank you for bringing back the candies! I hope the sacred carrot is worth it, everyone heard you..", 3000);
         questManager.completeQuest(this.id);
         // Disable interaction on this NPC
         if (this.interactZone.actionManager) {
          this.interactZone.actionManager.dispose();
        }
        document.getElementById("interactPrompt").style.display = "none";
        return;
       }
       
     }

     if (this.id === "quest1") {
       if (!this.scene.JumpFini) {
         showToast("You must complete the course", 2000);
         return;
       } else {
         questManager.completeQuest(this.id);
         // on désactive l’interaction sur ce PNJ
         if (this.interactZone.actionManager) {
          this.interactZone.actionManager.dispose();
        }
        document.getElementById("interactPrompt").style.display = "none";
        return;
       }
       
     }

      // (D’autres cas de quêtes “pending” peuvent être gérés ici)
    }
    
  const dlgBox  = document.getElementById("dialogueBox");
  const txt     = document.getElementById("dialogueText");
  const nextBtn = document.getElementById("nextDialogBtn");
  const accBtn  = document.getElementById("acceptQuestBtn");

  // --- Nettoyage des anciens handlers ---
  nextBtn.onclick = null;
  accBtn.onclick  = null;

  // --- Initialisation ---
  this._dlgIndex = 0;
  dlgBox.style.display      = "block";
  txt.textContent           = "";
  nextBtn.style.display     = "none";
  accBtn.style.display      = "none";

  // --- Handlers déclarés en closures pour qu’on puisse les assigner/retirer ---
  const handleAccept = () => {
    // une seule fois
    nextBtn.onclick = null;
    accBtn.onclick  = null;
    dlgBox.style.display = "none";

    // hint + ajout au livre + retour pointer lock (inchangés)
    if (!questBookHintShown) {
      showToast('Press "P" to open quest book');
      questBookHintShown = true;
      document.getElementById("questBookIcon").style.display = "block";
    }
    questManager.addQuest(this.id, this.questTitle, this.onComplete);

       // Si c’est la quête 2, on importe la clé dans la scène
   if (this.id === "quest2") {
     showToast("Find the key in the cave", 3000);
     BABYLON.SceneLoader.ImportMesh(
       "", "images/", "key.glb", this.scene,
       (meshes) => {
         const key = meshes[0];
         this.scene.keyMesh    = key;
         this.scene.keyPicked  = false;
         key.position.set(45.3, 10, 70.3);      // ↦ ajuste selon ta grotte
         key.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);
         meshes.forEach(m => { m.checkCollisions = true; m.receiveShadows = true; });
       }
     );
   }

   if (this.id === "quest3") {
  showToast("You have to destroy the piñata!", 8000);

}



    if (this.id === "quest0" && fishingManager) {
      fishingManager.registerQuestDrop("quest0", "Damaged wallet");
    }
    canvas.requestPointerLock?.();
  };

  const handleNext = async () => {
    // Empêcher les clics multiples
    nextBtn.onclick = null;

    // On prépare la phrase suivante, si elle existe
    const nextIndex = this._dlgIndex + 1;
    if (nextIndex >= this.dialogues.length) {
      // on ne devrait jamais arriver ici, mais on safe-guard
      return handleAccept();
    }
    this._dlgIndex = nextIndex;
    nextBtn.style.display = "none";

    // Machine-à-écrire
    await typeWriter(txt, this.dialogues[this._dlgIndex], 30);

    if (this._dlgIndex < this.dialogues.length - 1) {
      nextBtn.style.display = "inline-block";
      nextBtn.onclick = handleNext;
    } else {
      accBtn.style.display = "inline-block";
      accBtn.onclick       = handleAccept;
    }
  };

  // --- Premier affichage ---
  await typeWriter(txt, this.dialogues[0], 30);

  if (this.dialogues.length > 1) {
    nextBtn.style.display = "inline-block";
    nextBtn.onclick       = handleNext;
  } else {
    accBtn.style.display = "inline-block";
    accBtn.onclick       = handleAccept;
  }

  
}
}
