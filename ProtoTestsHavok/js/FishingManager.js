// js/FishingManager.js
export default class FishingManager {
  /**
   * @param {() => number} getEuros
   * @param {(n: number) => void} setEuros
   * @param {(msg: string, duration?: number) => void} toastFn
   */
  constructor(getEuros, setEuros, toastFn) {
    this.getEuros    = getEuros;
    this.setEuros    = setEuros;
    this.toastFn     = toastFn;

    this.interface   = document.getElementById("fishingInterface");
    this.bar         = document.getElementById("fishingBar");
    this.handle      = document.getElementById("fishingHandle");
    this.redZone     = document.getElementById("fishingRedZone");
    this.timerEl = document.getElementById("fishingTimerValue");

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

  show() {
    if (this.isFishing) return;
    this.isFishing  = true;
    this.pos        = 0;
    this.insideTime = 0;
    this.lastTs     = performance.now();

    this.handle.style.bottom = "0%";
    // timer initial
    this.timerEl.textContent = `Red Zone Timer : ${this.targetTime} s remaining`;

    this.interface.style.display = "flex";
    window.addEventListener("keydown", this._onKeyDown);
    requestAnimationFrame(this._loop);
  }

  hide() {
    this.isFishing = false;
    this.interface.style.display = "none";
    window.removeEventListener("keydown", this._onKeyDown);
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

    // descente
    this.pos = Math.max(0, this.pos - this.downSpeed * dt);
    this.handle.style.bottom = `${this.pos * 100}%`;

    // mise à jour du timer
    const remaining = Math.max(0, Math.ceil(this.targetTime - this.insideTime));
    this.timerEl.textContent = `Red Zone Timer : ${remaining} s remaining`;

    // détection zone rouge
    const barRect = this.bar.getBoundingClientRect();
    const redRect = this.redZone.getBoundingClientRect();
    const handleY = barRect.bottom - this.pos * barRect.height;

    if (handleY >= redRect.top && handleY <= redRect.bottom) {
      this.insideTime += dt;
      if (this.insideTime >= this.targetTime) {
        const gain = 2;
        this.setEuros(this.getEuros() + gain);
        this.toastFn(`+${gain}  carrots`, 2000);
        this.hide();
        return;
      }
    } else {
      this.insideTime = 0;
    }

    requestAnimationFrame(this._loop);
  }
}
