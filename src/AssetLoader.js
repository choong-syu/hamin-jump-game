import { CHARACTER_LEVELS, SPRITE_STATES } from "./config.js";

export class AssetLoader {
  constructor() { this.images = new Map(); this.progress = 0; }
  async loadAll(onProgress=()=>{}) {
    const paths = CHARACTER_LEVELS.flatMap(level => SPRITE_STATES.map(state => ({ key:`${level.level}:${state}`, src:`assets/sprites/${level.spriteFolder}/${state}.png` })));
    let done = 0;
    await Promise.all(paths.map(({key,src}) => new Promise(resolve => {
      const image = new Image();
      image.onload = () => { this.images.set(key,image); done++; this.progress=done/paths.length; onProgress(this.progress); resolve(); };
      image.onerror = () => { done++; this.progress=done/paths.length; onProgress(this.progress); resolve(); };
      image.src = src;
    })));
  }
  get(level,state) { return this.images.get(`${level}:${state}`) || this.images.get(`${level}:idle`) || null; }
}
