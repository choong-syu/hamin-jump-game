import { clamp, rand } from "../config.js";

export class Platform {
  constructor({x,y,width=90,type="normal",speed=0,direction=1,item=null,phase=rand(0,6),angle=0,rotationSpeed=0,verticalAmplitude=0,verticalSpeed=0}) {
    Object.assign(this,{x,y,width,type,speed,direction,item,phase,angle,rotationSpeed,verticalAmplitude,verticalSpeed});
    this.baseWidth=width;this.baseX=x;this.baseY=y;this.currentAngle=angle;this.height=18;this.active=true;this.breakTimer=0;this.rewarded=false;
  }
  update(dt) {
    this.phase+=dt;
    if(this.type==="moving") { this.x+=this.speed*this.direction*dt; if(this.x<10||this.x+this.width>470){this.x=clamp(this.x,10,470-this.width);this.direction*=-1;} }
    if(this.type==="vertical")this.y=this.baseY+Math.sin(this.phase*this.verticalSpeed)*this.verticalAmplitude;
    if(this.type==="rotating")this.currentAngle=Math.sin(this.phase*this.rotationSpeed)*this.angle;
    else this.currentAngle=this.angle;
    if(this.type==="pulse"){const center=this.baseX+this.baseWidth/2;this.width=this.baseWidth*(.72+.28*(Math.sin(this.phase*2)+1)/2);this.x=center-this.width/2;}
    if(["breakable","cloud"].includes(this.type)&&this.breakTimer>0) { this.breakTimer-=dt; if(this.breakTimer<=0) this.active=false; }
  }
  scroll(amount){this.y+=amount;this.baseY+=amount;}
  getSurfaceY(worldX){
    const sampleX=clamp(worldX,this.x,this.x+this.width);
    return this.y+Math.tan(this.currentAngle)*(sampleX-(this.x+this.width/2));
  }
  get visible() { return this.type!=="vanishing" || Math.sin(this.phase*1.5)>.05; }
  render(ctx) {
    if(!this.active||!this.visible) return;
    const colors={normal:["#5b9e54","#2f6636"],moving:["#60aee8","#276b9d"],vertical:["#53c7b8","#24756f"],tilted:["#f0bb54","#98672e"],rotating:["#be77e8","#684092"],breakable:["#d89b58","#8a5033"],vanishing:["#a77adc","#654593"],conveyor:["#f0a64d","#9f572e"],cloud:["#f5fbff","#a9cbd9"],ice:["#b9f1ff","#4ba7ce"],pulse:["#ef82c6","#9e468c"],rocket:["#ff725e","#a72f45"],rainbow:["#ffd45a","#7b55c7"]};
    const [top,side]=colors[this.type]||colors.normal;
    ctx.save();
    ctx.translate(this.x+this.width/2,this.y+this.height/2);
    ctx.rotate(this.currentAngle);
    const left=-this.width/2,topY=-this.height/2;
    ctx.fillStyle=side;ctx.beginPath();ctx.roundRect(left,topY,this.width,this.height,8);ctx.fill();
    ctx.fillStyle=top;ctx.beginPath();ctx.roundRect(left+3,topY,this.width-6,8,5);ctx.fill();
    if(this.type==="conveyor"){ctx.fillStyle="#fff8";ctx.font="bold 12px sans-serif";ctx.textAlign="center";ctx.fillText(this.direction>0?"▶ ▶":"◀ ◀",0,4);}
    if(this.type==="moving"){ctx.fillStyle="#fff9";ctx.font="bold 13px sans-serif";ctx.textAlign="center";ctx.fillText("↔",0,5);}
    if(this.type==="vertical"){ctx.fillStyle="#fff9";ctx.font="bold 14px sans-serif";ctx.textAlign="center";ctx.fillText("↕",0,5);}
    if(this.type==="rotating"){ctx.fillStyle="#fff9";ctx.font="bold 14px sans-serif";ctx.textAlign="center";ctx.fillText("↻",0,5);}
    if(this.type==="ice"){ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(left+12,topY+3);ctx.lineTo(left+22,topY+13);ctx.moveTo(left+35,topY+2);ctx.lineTo(left+46,topY+12);ctx.stroke();}
    if(this.type==="rocket"){ctx.fillStyle="#fff";ctx.font="15px serif";ctx.textAlign="center";ctx.fillText("🚀",0,-4);}
    if(this.type==="rainbow"){ctx.fillStyle=`hsl(${(this.phase*90)%360} 85% 65%)`;ctx.fillRect(left+8,topY+2,this.width-16,5);}
    ctx.restore();
    if(this.item) this.renderItem(ctx);
  }
  renderItem(ctx) {
    const x=this.x+this.width/2,y=this.getSurfaceY(x)-14;
    if(this.item==="star") { ctx.save();ctx.translate(x,y);ctx.rotate(this.phase*2);ctx.fillStyle="#ffd44d";ctx.font="26px serif";ctx.textAlign="center";ctx.fillText("★",0,7);ctx.restore(); }
    if(this.item==="spring") { ctx.strokeStyle="#e75555";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x-8,this.y);ctx.lineTo(x+6,y+5);ctx.lineTo(x-6,y-3);ctx.lineTo(x+8,y-11);ctx.stroke(); }
    if(this.item==="wings") { ctx.font="24px serif";ctx.textAlign="center";ctx.fillText("🪽",x,y+7); }
    if(this.item==="shield") { ctx.font="23px serif";ctx.textAlign="center";ctx.fillText("🛡️",x,y+7); }
    if(this.item==="gem") { ctx.font="23px serif";ctx.textAlign="center";ctx.fillText("💎",x,y+7); }
    if(this.item==="feather") { ctx.font="23px serif";ctx.textAlign="center";ctx.fillText("🪶",x,y+7); }
  }
}
