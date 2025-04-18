export default class MiniGameManager {
    /**
     * @param {function(): number} getEuros   // renvoie le solde courant
     * @param {function(number): void} setEuros // applique le nouveau solde
     */
    constructor(getEuros, setEuros) {
      this.interface = document.getElementById("miniGameInterface");
      this.resultDiv = document.getElementById("diceResult");
      this.playBtn   = document.getElementById("playDiceBtn");
      this.closeBtn  = document.getElementById("closeMiniGameBtn");
      this.getEuros = getEuros;
      this.setEuros = setEuros;
      this.maxPlays = 3;
      this.playsLeft = this.maxPlays;
  
      // Met à jour l'affichage du bouton
      this.updatePlaysDisplay();
  
      this.playBtn.addEventListener("click", () => this.playDice());
      this.closeBtn.addEventListener("click", () => this.hideInterface());
    }
  
    updatePlaysDisplay() {
      // Affiche le nombre de lancers restants directement sur le bouton
      this.playBtn.textContent = `Lancer les dés (${this.playsLeft} essais restants)`;
      this.playBtn.disabled = this.playsLeft <= 0;
    }
  
    showInterface() {
      this.resultDiv.textContent = "";
      this.interface.style.display = "block";
      // Réactualise le texte et l'état du bouton à chaque ouverture
      this.updatePlaysDisplay();
    }
  
    hideInterface() {
      this.interface.style.display = "none";
    }
  
    playDice() {
      // Vérifie le nombre de lancers restants
      if (this.playsLeft <= 0) {
        this.resultDiv.textContent = "Plus de lancers disponibles.";
        return;
      }
      this.updatePlaysDisplay();
  
      // Lecture du solde actuel
      const euros = this.getEuros();
      // Coût fixe de la partie
      if (euros < 10) {
        this.resultDiv.textContent = "Pas assez d'euros !";
        return;
      }
      this.playsLeft--;
      // Débiter la mise
      let nouveauSolde = euros - 10;
      this.setEuros(nouveauSolde);
  
      // Lancer les dés
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const sum = d1 + d2;
      let gain = 0;
      // Règles de gain
      console.log(d1, d2, sum);
      if (d1 === d2 === 6)      gain = 30;  // paire
      else if (sum >= 10)  gain = 20;  // total élevé
      else if (sum >= 5)  gain = 7;  // total moyen
      else gain = -10;  // total faible
      // Appliquer le gain
      nouveauSolde += gain;
      this.setEuros(nouveauSolde);
  
      // Affichage du résultat
      this.resultDiv.innerHTML =
        `Résultat : ${d1} + ${d2} = ${sum}<br>` +
        `Vous ${gain > 0 ? "gagnez" : "perdez"} ${gain} €`;
    }
  }
  