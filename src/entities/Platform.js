import { rand } from "../config.js";
export class Platform {
  constructor({x,y,width=90,type="normal",speed=0,direction=1,item=null}) { Object.assign(this,{x,y,width,type,speed,direction,item}); this.height=18; this.active=true; this.breakTimer=0; this.phase=rand(0,6); }
  update(dt) {
    this.phase+=dt;
    if(this.type==="moving") { this.x+=this.speed*this.direction*dt; if(this.x<10||this.x+this.width>470) this.direction*=-1; }
    if(this.type==="breakable"&&this.breakTimer>0) { this.breakTimer-=dt; if(this.breakTimer<=0) this.active=false; }
  }
  get visible() { return this.type!=="vanishing" || Math.sin(this.phase*1.5)>.05; }
  render(ctx) {
    if(!this.active||!this.visible) return;
    const colors={normal:["#5b9e54","#2f6636"],moving:["#60aee8","#276b9d"],breakable:["#d89b58","#8a5033"],vanishing:["#a77adc","#654593"]};
    const [top,side]=colors[this.type]||colors.normal;
    ctx.fillStyle=side;ctx.beginPath();ctx.roundRect(this.x,this.y,this.width,this.height,8);ctx.fill();
    ctx.fillStyle=top;ctx.beginPath();ctx.roundRect(this.x+3,this.y,this.width-6,8,5);ctx.fill();
    if(this.item) this.renderItem(ctx);
  }
  renderItem(ctx) {
    const x=this.x+this.width/2,y=this.y-14;
    if(this.item==="star") { ctx.save();ctx.translate(x,y);ctx.rotate(this.phase*2);ctx.fillStyle="#ffd44d";ctx.font="26px serif";ctx.textAlign="center";ctx.fillText("★",0,7);ctx.restore(); }
    if(this.item==="spring") { ctx.strokeStyle="#e75555";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x-8,this.y);ctx.lineTo(x+6,y+5);ctx.lineTo(x-6,y-3);ctx.lineTo(x+8,y-11);ctx.stroke(); }
    if(this.item==="wings") { ctx.font="24px serif";ctx.textAlign="center";ctx.fillText("🪽",x,y+7); }
    if(this.item==="shield") { ctx.font="23px serif";ctx.textAlign="center";ctx.fillText("🛡️",x,y+7); }
  }
}
