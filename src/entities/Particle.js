export class Particle {
  constructor(x,y,color="#fff",speed=100) { this.x=x;this.y=y;this.vx=(Math.random()-.5)*speed;this.vy=-Math.random()*speed;this.life=.65;this.color=color;this.size=2+Math.random()*4; }
  update(dt){this.life-=dt;this.x+=this.vx*dt;this.y+=this.vy*dt;this.vy+=180*dt;}
  render(ctx){ctx.globalAlpha=Math.max(0,this.life/.65);ctx.fillStyle=this.color;ctx.beginPath();ctx.arc(this.x,this.y,this.size,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
}
