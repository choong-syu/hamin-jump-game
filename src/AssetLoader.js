import { CHARACTER_LEVELS, SPRITE_STATES } from "./config.js";

export class AssetLoader {
  constructor() { this.images = new Map(); this.progress = 0; }
  async loadAll(onProgress=()=>{}) {
    const paths = CHARACTER_LEVELS.flatMap(level => SPRITE_STATES.map(state => ({ key:`${level.level}:${state}`, src:`assets/sprites/${level.spriteFolder}/${state}.png` })));
    let done = 0;
    const queue=[...paths];
    const load=({key,src},attempt=0)=>new Promise(resolve=>{
      const image=new Image();
      image.onload=()=>{this.images.set(key,image);resolve();};
      image.onerror=()=>attempt<2?setTimeout(()=>load({key,src},attempt+1).then(resolve),120):resolve();
      image.src=attempt?`${src}?retry=${attempt}`:src;
    });
    const worker=async()=>{while(queue.length){const item=queue.shift();await load(item);done++;this.progress=done/paths.length;onProgress(this.progress);}};
    await Promise.all(Array.from({length:6},worker));
  }
  get(level,state) { return this.images.get(`${level}:${state}`) || this.images.get(`${level}:idle`) || null; }
}
