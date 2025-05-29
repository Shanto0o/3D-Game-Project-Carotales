// js/QuestManager.js


export default class QuestManager {
  constructor() {
    this.quests = [];       // { id, title, status: "pending"|"done" }
    this.callbacks = {};    // callbacks de fin de quête par id
    // Éléments UI
    this.questBook = document.getElementById("questBook");
    this.questList = document.getElementById("questList");
    // Touche P pour toggle
    window.addEventListener("keydown", e => {
      if (e.key.toLowerCase() === "p") {
        this.questBook.style.display =
          this.questBook.style.display === "none" ? "block" : "none";
      }
    });
  }

  addQuest(id, title, onComplete) {
    if (this.quests.find(q => q.id === id)) return;
    this.quests.push({ id, title, status: "pending" });
    this.callbacks[id] = onComplete;
    this._render();
  }

  completeQuest(id) {
    const q = this.quests.find(q => q.id === id);
    if (q && q.status === "pending") {
      q.status = "done";
      this._render();
      if (this.callbacks[id]) this.callbacks[id]();
    }
  }

  _render() {
    this.questList.innerHTML = "";
    this.quests.forEach(q => {
      const li = document.createElement("li");
      li.textContent = q.title + (q.status === "done" ? " ✔️" : "");
      this.questList.appendChild(li);
    });
  }

    // Pour la quête chrono
  startTime(id) {
    const q = this.quests.find(q => q.id === id);
    if (q) q._start = performance.now();
  }

  elapsedSeconds(id) {
    const q = this.quests.find(q => q.id === id);
    return q && q._start ? (performance.now() - q._start) / 1000 : 0;
  }
}
