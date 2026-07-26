export class Item {
  constructor(type) { this.type=type; this.collected=false; }
  apply(game) {
    if(this.collected) return;
    this.collected=true;
    if(this.type==="star") game.bonusScore+=100;
    if(this.type==="wings") game.player.wings=3;
    if(this.type==="shield") game.player.shield=true;
    if(this.type==="gem") game.bonusScore+=250;
    if(this.type==="feather") game.player.feather=3.5;
  }
}
