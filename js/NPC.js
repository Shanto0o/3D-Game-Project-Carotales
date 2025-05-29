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
    this._dlgIndex   = 0;

    // Crée un simple cube pour le PNJ
    this.mesh = BABYLON.MeshBuilder.CreateBox(
      "npc_" + id,
      { size: 3 },
      scene
    );
    this.mesh.position = position;
    this.mesh.isPickable = false; // on gère l’interaction via ActionManager

    // Matériau orange
    const mat = new BABYLON.StandardMaterial("npcMat_" + id, scene);
    mat.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
    this.mesh.material = mat;
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
            "Il faut d'abord pêcher l'objet perdu pour l'officier.";
          const dlg = document.getElementById("dialogueBox");
          dlg.style.display = "block";
          setTimeout(() => dlg.style.display = "none", 2000);
          return;
        }
        // Après pêche (titre changé) → complète la quête^
        showToast("Merci beaucoup ! Voici de quoi avancer vers votre reve", 6000);
        questManager.completeQuest(this.id);
        canvas.requestPointerLock();

        if (this.mesh.actionManager) {
          this.mesh.actionManager.dispose();
        }
        document.getElementById("interactPrompt").style.display = "none";
        return;
      }
      if (this.id === "quest2") {
       if (!this.scene.keyPicked) {
         showToast("Vous devez d'abord trouver la clé cachée au fond de la grotte.", 2000);
         return;
       } else {
         showToast("Merci d'avoir rapporté la clé ! Quête terminée.", 3000);
         questManager.completeQuest(this.id);
         // on désactive l’interaction sur ce PNJ
         if (this.mesh.actionManager) {
          this.mesh.actionManager.dispose();
        }
        document.getElementById("interactPrompt").style.display = "none";
        return;
       }
       
     }
     if (this.id === "quest3") {
       if (!this.scene.ItemPose) {
         showToast("Vous devez récupérer les bonbons et les ramener dans le pot.", 2000);
         return;
       } else {
         showToast("Merci d'avoir rapporté les bonbons ! J'espere que la carotte sacrée en vaut le cout, tout le monde vous a entendu..", 3000);
         questManager.completeQuest(this.id);
         // on désactive l’interaction sur ce PNJ
         if (this.mesh.actionManager) {
          this.mesh.actionManager.dispose();
        }
        document.getElementById("interactPrompt").style.display = "none";
        return;
       }
       
     }

     if (this.id === "quest1") {
       if (!this.scene.JumpFini) {
         showToast("Vous devez terminer le parcours", 2000);
         return;
       } else {
         questManager.completeQuest(this.id);
         // on désactive l’interaction sur ce PNJ
         if (this.mesh.actionManager) {
          this.mesh.actionManager.dispose();
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
     showToast("Une clé a été cachée au fond de la grotte…", 3000);
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
  showToast("Le grand golem mécanique apparaît ! Préparez-vous au combat.", 8000);
  BABYLON.SceneLoader.ImportMesh(
    "", "images/", "boss.glb", this.scene,
    (meshes) => {
      // 1) Le nœud racine
      const root = meshes[0];
      // On positionne le root
      root.position.set(86.5, -15, -189.7);
      root.scaling.copyFromFloats(0.5, 0.5, 0.5);
      root.checkCollisions = true;
      root.receiveShadows = true;

      // 2) On cherche le mesh enfant pour la physique
      const geom = meshes.find(m =>
        m !== root &&
        m instanceof BABYLON.Mesh &&
        m.geometry &&
        m.geometry.getTotalVertices() > 0
      );
      if (geom) {
        const agg = new BABYLON.PhysicsAggregate(
          geom,                               // on donne ce mesh à Havok
          BABYLON.PhysicsShapeType.MESH,
          { mass: 50, friction: 1.0, restitution: 0.1 },
          this.scene
        );
        agg.body.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC);
      } else {
        console.warn("boss.glb : pas de geom child trouvé pour la physique");
      }

      // 3) On stocke le root pour l’attaque et la distance
      this.scene.bossMesh = root;
    }
  );
}



    if (this.id === "quest0" && fishingManager) {
      fishingManager.registerQuestDrop("quest0", "Portefeuille abîmé");
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
