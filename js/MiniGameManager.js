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
      this.getEuros  = getEuros;
      this.setEuros  = setEuros;
      this.maxPlays  = 3;
      this.playsLeft = this.maxPlays;
      this.am = null;
  
      // Crée les éléments <img> pour les dés
      this.img1 = document.createElement('img');
      this.img2 = document.createElement('img');
      [this.img1, this.img2].forEach(img => {
        img.style.width = '50px';
        img.style.height = '50px';
        img.style.margin = '0 5px';
      });
      // Zone d'affichage: images + texte
      this.resultDiv.innerHTML = '';
      this.resultDiv.append(this.img1, this.img2, document.createElement('br'));
      this.textResult = document.createElement('div');
      this.resultDiv.append(this.textResult);
  
      this.playBtn.addEventListener("click", () => this.playDice());
      this.closeBtn.addEventListener("click", () => this.hideInterface());
      this.updatePlaysDisplay();
    }
  
    updatePlaysDisplay() {
      this.playBtn.textContent = `Lancer les dés (${this.playsLeft} essais restants)`;
      this.playBtn.disabled   = this.playsLeft <= 0;
    }
  
    showInterface() {
      this.interface.style.display = "block";
      this.updatePlaysDisplay();
      // réinitialise les images et texte
      this.img1.src = `images/dice1.png`;
      this.img2.src = `images/dice6.png`;
      this.textResult.textContent = '';
    }
  
    hideInterface() {
      this.interface.style.display = "none";
    }
  
    playDice() {
      if (this.playsLeft <= 0) {
        this.textResult.textContent = "Plus de lancers disponibles.";
        return;
      }
      const euros = this.getEuros();
      if (euros < 10) {
        this.textResult.textContent = "Pas assez d'euros !";
        return;
      }
      this.playsLeft--;
      this.updatePlaysDisplay();
  
      // désactiver le bouton pendant l'animation
      this.playBtn.disabled = true;
      this.textResult.textContent = "Lancement des dés...";
      this.am.play("dice");
  
      let frames = 0;
      const anim = setInterval(() => {
        const a = Math.floor(Math.random() * 6) + 1;
        const b = Math.floor(Math.random() * 6) + 1;
        // afficher faces d'animation aléatoires
        this.img1.src = `images/dice${a}.png`;
        this.img2.src = `images/dice${b}.png`;
        frames++;
        if (frames >= 10) {
          clearInterval(anim);
          this.performRoll();
        }
      }, 100);
    }
  
    performRoll() {
      // débiter la mise
      let nouveauSolde = this.getEuros() - 10;
      this.setEuros(nouveauSolde);
  
      // résultat
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const sum = d1 + d2;
      let gain = 0;
      if (d1 === d2 === 6)      {gain = 50;
      this.am.play("fish");}
      else if (sum >= 10)  {gain = 20;
      this.am.play("fishnorm");}
      else if (sum >= 5)  {gain = 8;
        this.am.play("fishnorm");}
      else {gain -= 7;
      this.am.play("fail");}
      // afficher les vraies faces
      this.img1.src = `images/dice${d1}.png`;
      this.img2.src = `images/dice${d2}.png`;
  
      // appliquer le gain
      nouveauSolde += gain;
      this.setEuros(nouveauSolde);
  
      // affichage du texte résultat
      this.textResult.innerHTML =
        `Résultat : ${d1} + ${d2} = ${sum}<br>` +
        `Vous ${gain > 0 ? "gagnez" : "perdez"} ${gain} €`;
  
      // réactiver le bouton si des essais restent
      this.playBtn.disabled = this.playsLeft <= 0;
    }
  }

