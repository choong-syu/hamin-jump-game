import { GAME_WIDTH, PHYSICS, PLAYER_HITBOX, PLAYER_RENDER_SIZE, PlayerState } from "../config.js";

export class Player {
  constructor() { this.width=this.height=PLAYER_RENDER_SIZE; this.hitbox=PLAYER_HITBOX; this.reset(); }
  reset() { this.x=199;this.y=640;this.previousY=this.y;this.velocityX=0;this.velocityY=0;this.state=PlayerState.IDLE;this.stateTime=0;this.facing="right";this.jumpPower=650;this.moveSpeed=220;this.wings=0;this.feather=0;this.shield=false; }
  setLevel(data) { this.level=data.level;this.moveSpeed=data.moveSpeed;this.jumpPower=data.jumpPower; }
  update(dt,axis,gravity=true) {
    this.previousY=this.y;this.stateTime+=dt;
    const acceleration=PHYSICS.horizontalAcceleration*(this.wings>0?.7:PHYSICS.airControl);
    if(axis) { this.velocityX+=axis*acceleration*dt;this.facing=axis<0?"left":"right"; }
    else { const decel=PHYSICS.horizontalDeceleration*dt;this.velocityX=Math.abs(this.velocityX)<=decel?0:this.velocityX-Math.sign(this.velocityX)*decel; }
    this.velocityX=Math.max(-this.moveSpeed,Math.min(this.moveSpeed,this.velocityX));
    if(this.wings>0) { this.wings-=dt;this.velocityY=-115; }
    else if(gravity){if(this.feather>0)this.feather-=dt;const gravityScale=this.feather>0&&this.velocityY>0?.42:1;this.velocityY=Math.min(PHYSICS.maxFallSpeed,this.velocityY+PHYSICS.gravity*gravityScale*dt);}
    this.x+=this.velocityX*dt;this.y+=this.velocityY*dt;
    if(this.x+this.width<0)this.x=GAME_WIDTH;if(this.x>GAME_WIDTH)this.x=-this.width;
    if(this.stateTime>.08) this.state=this.velocityY<-80?PlayerState.RISE:this.velocityY>80?PlayerState.FALL:this.state;
  }
  land(platform,power=1) { this.y=platform.y-this.hitbox.offsetY-this.hitbox.height;this.velocityY=-this.jumpPower*power;this.state=PlayerState.LANDING;this.stateTime=0; }
  getCollisionBox(previous=false) { return {x:this.x+this.hitbox.offsetX,y:(previous?this.previousY:this.y)+this.hitbox.offsetY,width:this.hitbox.width,height:this.hitbox.height}; }
  render(ctx,image,debug=false) {
    let sx=1,sy=1,rot=0,bob=0;
    if(this.state===PlayerState.IDLE){sy=1+Math.sin(performance.now()/220)*.02;bob=Math.sin(performance.now()/260)*2;}
    if(this.state===PlayerState.LANDING){sx=1.12;sy=.82;}
    if(this.state===PlayerState.RISE){rot=this.velocityX/this.moveSpeed*.12;sy=1.04;}
    if(this.state===PlayerState.FALL){sy=.94;}
    const cx=this.x+this.width/2,cy=this.y+this.height/2;
    ctx.save();ctx.translate(cx,cy+bob);ctx.rotate(rot);ctx.scale((this.facing==="left"?-1:1)*sx,sy);
    if(image) ctx.drawImage(image,-this.width/2,-this.height/2,this.width,this.height);
    else this.renderFallback(ctx);
    ctx.restore();
    if(this.shield){ctx.strokeStyle="#8cecff";ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,47,0,Math.PI*2);ctx.stroke();}
    if(debug){const b=this.getCollisionBox();ctx.strokeStyle="#ff3864";ctx.strokeRect(b.x,b.y,b.width,b.height);}
  }
  renderFallback(ctx) { ctx.fillStyle=["#fff3dc","#fff","#fff","#b86a2f","#ef7f26","#d99b32","#f18b1c","#f5f2e9","#75ad39","#49392e","#75442c","#fff2d0"][this.level-1]||"#fff";ctx.beginPath();ctx.ellipse(0,7,27,30,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#25313b";ctx.font="bold 18px sans-serif";ctx.textAlign="center";ctx.fillText(this.level,0,14); }
}
