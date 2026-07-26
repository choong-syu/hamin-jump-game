import { Particle } from "../entities/Particle.js";
export class ParticleSystem {
  constructor(){this.items=[];}
  burst(x,y,color="#fff",count=10,speed=100){for(let i=0;i<count&&this.items.length<150;i++)this.items.push(new Particle(x,y,color,speed));}
  update(dt){this.items.forEach(p=>p.update(dt));this.items=this.items.filter(p=>p.life>0);}
  render(ctx){this.items.forEach(p=>p.render(ctx));}
}
