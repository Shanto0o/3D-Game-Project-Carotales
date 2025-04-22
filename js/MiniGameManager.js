export default class MiniGameManager {

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
  
      this.img1 = document.createElement('img');
      this.img2 = document.createElement('img');
      [this.img1, this.img2].forEach(img => {
        img.style.width = '50px';
        img.style.height = '50px';
        img.style.margin = '0 5px';
      });
      this.resultDiv.innerHTML = '';
      this.resultDiv.append(this.img1, this.img2, document.createElement('br'));
      this.textResult = document.createElement('div');
      this.resultDiv.append(this.textResult);
  
      this.playBtn.addEventListener("click", () => this.playDice());
      this.closeBtn.addEventListener("click", () => this.hideInterface());
      this.updatePlaysDisplay();
    }
  
    updatePlaysDisplay() {
      this.playBtn.textContent = `Roll the dice: (${this.playsLeft} attempts left)`;
      this.playBtn.disabled   = this.playsLeft <= 0;
    }
  
    showInterface() {
      this.interface.style.display = "block";
      this.updatePlaysDisplay();
      this.img1.src = `images/dice1.png`;
      this.img2.src = `images/dice6.png`;
      this.textResult.textContent = '';
    }
  
    hideInterface() {
      this.interface.style.display = "none";
    }

    resetPlays() {
      this.playsLeft = this.maxPlays;
      this.updatePlaysDisplay();
    }
  
    playDice() {
      if (this.playsLeft <= 0) {
        this.textResult.textContent = "No more attempts left!";
        return;
      }
      const euros = this.getEuros();
      if (euros < 10) {
        this.textResult.textContent = "Not enough carrots !";
        return;
      }
      this.playsLeft--;
      this.updatePlaysDisplay();
  
      this.playBtn.disabled = true;
      this.textResult.textContent = "Rolling the dice...";
      this.am.play("dice");
  
      let frames = 0;
      const anim = setInterval(() => {
        const a = Math.floor(Math.random() * 6) + 1;
        const b = Math.floor(Math.random() * 6) + 1;
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
      let nouveauSolde = this.getEuros() - 10;
      this.setEuros(nouveauSolde);
  
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
      this.img1.src = `images/dice${d1}.png`;
      this.img2.src = `images/dice${d2}.png`;
  
      nouveauSolde += gain;
      this.setEuros(nouveauSolde);
  
      this.textResult.innerHTML =
        `Results: ${d1} + ${d2} = ${sum}<br>` +
        `You ${gain > 0 ? "won" : "lose"} ${gain} €`;
  
      this.playBtn.disabled = this.playsLeft <= 0;
    }
  }

