// js/FishingManager.js

export default class FishingManager {
  /**
   * @param {function} getEuros   Fonction pour récupérer le solde actuel (en carottes)
   * @param {function} setEuros   Fonction pour mettre à jour le solde (en carottes)
   * @param {function} toastFn    Fonction d’affichage de toast
   */
  constructor(getEuros, setEuros, toastFn, scene) {
    this.getEuros    = getEuros;
    this.scene =scene;
    this.setEuros    = setEuros;
    this.toastFn     = toastFn;

    // === Nouvelle propriété pour gérer un drop de quête ===
    // { questId: string, chance: number, itemName: string }
    this.questDrop  = null;

    this.am          = null;

    this.interface   = document.getElementById("fishingInterface");
    this.bar         = document.getElementById("fishingBar");
    this.handle      = document.getElementById("fishingHandle");
    this.redZone     = document.getElementById("fishingRedZone");
    this.timerEl     = document.getElementById("fishingTimerValue");

    this.isFishing   = false;
    this.pos         = 0;
    this.downSpeed   = 0.4;
    this.upStep      = 0.2;
    this.targetTime  = 4;
    this.insideTime  = 0;

    this.handle.style.transition = "bottom 0.1s linear";

    this._onKeyDown  = this._onKeyDown.bind(this);
    this._loop       = this._loop.bind(this);
  }

  /**
   * Enregistre un drop spécifique lié à une quête (à appeler depuis main.js).
   * @param {string} questId    Identifiant de la quête (ex: "quest0")
   * @param {number} chance     Probabilité de le pêcher (0.1 pour 10%)
   * @param {string} itemName   Nom de l’objet pour le toast
   */
  registerQuestDrop(questId, itemName) {
    this.questDrop = { questId, itemName };
  }

  getQuestDrop() {
    return this.questDrop.itemName;
  }

  show() {
    if (this.isFishing) return;
    this.isFishing   = true;
    this.pos         = 0;
    this.insideTime  = 0;
    this.lastTs      = performance.now();

    this.handle.style.bottom      = "0%";
    this.timerEl.textContent      = `Orange Zone Timer : ${this.targetTime} s remaining`;

    this.interface.style.display  = "flex";
    window.addEventListener("keydown", this._onKeyDown);
    requestAnimationFrame(this._loop);
  }

  hide() {
    this.isFishing                  = false;
    this.interface.style.display    = "none";
    window.removeEventListener("keydown", this._onKeyDown);
    window.dispatchEvent(new Event("fishingEnded"));
  }

  _onKeyDown(evt) {
    if (!this.isFishing) return;
    if (evt.key.toLowerCase() === "f") {
      this.pos = Math.min(1, this.pos + this.upStep);
    }
  }

  _loop(ts) {
    if (!this.isFishing) return;

    const dt = (ts - this.lastTs) / 1000;
    this.lastTs = ts;

    // Descente automatique
    this.pos = Math.max(0, this.pos - this.downSpeed * dt);
    this.handle.style.bottom = `${this.pos * 100}%`;

    // Mise à jour du timer affiché
    const remaining = Math.max(0, Math.ceil(this.targetTime - this.insideTime));
    this.timerEl.textContent = `Orange Zone Timer : ${remaining} s remaining`;

    // Calculs de positions pour savoir si on est dans la zone rouge
    const barRect    = this.bar.getBoundingClientRect();
    const redRect    = this.redZone.getBoundingClientRect();
    const handleRect = this.handle.getBoundingClientRect();
    const handleY    = barRect.bottom - this.pos * barRect.height;
    const handleCenterY = handleRect.top + handleRect.height / 2;
    const inRedZone = (handleCenterY >= redRect.top && handleCenterY <= redRect.bottom);

    if (inRedZone) {
      this.insideTime += dt;

      if (this.insideTime >= this.targetTime) {
        let gain;
        // ——— Si on est en mode quête, on distribue selon : 10% rare loot, 10% quest item, 80% normal ———
        if (this.questDrop) {
          const rnd = Math.random();
          if (rnd < 0.4) {
            // Rare loot
            this.am.play("fish");
            gain = 25;
            this.toastFn(`RARE LOOT (10%) : +${gain} carrots !`, 2000);
            this.setEuros(this.getEuros() + gain);
            this.hide();
            return;
          } else if (rnd < 0.8 && rnd >= 0.4) {
            // Quest item
            this.am.play("fish");
            this.toastFn(
              `You fished : ${this.questDrop.itemName} !`,
              5000
            );
            this.scene.pecheFini = true;
            window.dispatchEvent(new CustomEvent("questItemFished", {
              detail: { questId: this.questDrop.questId }
            }));
            this.hide();
            return;
          }else {
          this.am.play("fishnorm");
          gain = Math.floor(Math.random() * 5) + 1;
          this.toastFn(`+${gain} carrots`, 2000);
        }
          // sinon passe en loot normal
        }

        // ——— Loot classique en carottes ———
        if (Math.random() < 0.25) {
          this.am.play("fish");
          gain = 25;
          this.toastFn(`RARE LOOT (10%) : +${gain} carrots !`, 2000);
        } else {
          this.am.play("fishnorm");
          gain = Math.floor(Math.random() * 5) + 1;
          this.toastFn(`+${gain} carrots`, 2000);
        }
        this.setEuros(this.getEuros() + gain);
        this.hide();
        return;
      }
    } else {
      // Réinitialise le timer si on sort de la zone
      this.insideTime = 0;
    }

    requestAnimationFrame(this._loop);
  }
}
