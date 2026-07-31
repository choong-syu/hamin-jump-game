import { GAME_HEIGHT, GAME_WIDTH } from "../config.js";

const BOSS_NAMES = [
  "먹구름 슬라임 왕",
  "불꽃 뿔 왕",
  "태엽 갑옷 왕",
  "별구름 용왕"
];

function seededRandom(seed) {
  let value=(Number(seed)||1)>>>0;
  return ()=>{
    value=(value+0x6D2B79F5)>>>0;
    let result=value;
    result=Math.imul(result^(result>>>15),result|1);
    result^=result+Math.imul(result^(result>>>7),result|61);
    return ((result^(result>>>14))>>>0)/4294967296;
  };
}

function overlaps(a,b) {
  return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
}

export class BossBattle {
  constructor(targetLevel,seed,difficulty="normal") {
    this.targetLevel=targetLevel;
    this.bossIndex=((targetLevel.level-2)%4)+1;
    this.name=BOSS_NAMES[this.bossIndex-1];
    this.random=seededRandom((Number(seed)||1)+targetLevel.level*7919);
    this.totalWaves=Math.min(9,4+Math.floor(targetLevel.level/2));
    this.spawnedWaves=0;
    this.clearedMissiles=0;
    this.totalMissiles=0;
    this.warnings=[];
    this.missiles=[];
    this.elapsed=0;
    this.nextWave=1.35;
    this.victory=false;
    this.victoryTimer=0;
    this.bossX=240;
    this.bossY=154;
    this.arenaY=735;
    this.difficulty=difficulty;
  }

  preparePlayer(player) {
    player.x=GAME_WIDTH/2-player.width/2;
    player.y=this.arenaY-player.hitbox.offsetY-player.hitbox.height;
    player.previousY=player.y;
    player.velocityX=0;
    player.velocityY=0;
  }

  spawnWave() {
    const lanes=[50,145,240,335,430];
    for(let index=lanes.length-1;index>0;index--){
      const swap=Math.floor(this.random()*(index+1));
      [lanes[index],lanes[swap]]=[lanes[swap],lanes[index]];
    }
    const count=Math.min(3,1+Math.floor((this.targetLevel.level-1)/4));
    const speedBase=245+this.targetLevel.level*13+(this.difficulty==="advanced"?25:this.difficulty==="beginner"?-20:0);
    lanes.slice(0,count).forEach((x,index)=>{
      this.warnings.push({
        x,
        time:.72+index*.08,
        speed:speedBase+this.random()*45,
        drift:(this.random()-.5)*26
      });
      this.totalMissiles++;
    });
    this.spawnedWaves++;
  }

  update(dt,playerBox) {
    this.elapsed+=dt;
    this.bossX=240+Math.sin(this.elapsed*1.8)*112;
    if(this.victory){
      this.victoryTimer+=dt;
      return this.victoryTimer>=1.45?{complete:true}:null;
    }

    if(this.spawnedWaves<this.totalWaves){
      this.nextWave-=dt;
      if(this.nextWave<=0){
        this.spawnWave();
        this.nextWave=Math.max(.92,1.32-this.targetLevel.level*.025);
      }
    }

    const pending=[];
    this.warnings.forEach(warning=>{
      warning.time-=dt;
      if(warning.time<=0){
        this.missiles.push({x:warning.x,y:212,speed:warning.speed,drift:warning.drift,angle:warning.drift*.0015});
      } else pending.push(warning);
    });
    this.warnings=pending;

    let hit=false;
    const active=[];
    this.missiles.forEach(missile=>{
      missile.y+=missile.speed*dt;
      missile.x+=missile.drift*dt;
      const box={x:missile.x-13,y:missile.y-25,width:26,height:50};
      if(!hit&&overlaps(box,playerBox)){hit=true;return;}
      if(missile.y>GAME_HEIGHT+60)this.clearedMissiles++;
      else active.push(missile);
    });
    this.missiles=active;
    if(hit)return {hit:true};

    if(this.spawnedWaves===this.totalWaves&&!this.warnings.length&&!this.missiles.length){
      this.victory=true;
      this.victoryTimer=0;
      return {victory:true};
    }
    return null;
  }

  render(ctx,bossImage,missileImage) {
    ctx.save();
    const shade=ctx.createLinearGradient(0,80,0,760);
    shade.addColorStop(0,"#25164799");
    shade.addColorStop(.45,"#20255228");
    shade.addColorStop(1,"#07142e99");
    ctx.fillStyle=shade;
    ctx.fillRect(0,70,GAME_WIDTH,690);

    ctx.fillStyle="#142a3de8";
    ctx.beginPath();
    ctx.roundRect(18,88,444,56,18);
    ctx.fill();
    ctx.textAlign="center";
    ctx.fillStyle="#ffe67c";
    ctx.font="900 17px sans-serif";
    ctx.fillText(`진화 관문 · ${this.name}`,240,111);
    ctx.fillStyle="#d9ecff";
    ctx.font="800 12px sans-serif";
    const remaining=Math.max(0,this.totalWaves-this.spawnedWaves)+this.warnings.length+this.missiles.length;
    ctx.fillText(this.victory?"왕을 물리쳤어요!":`미사일을 피해요 · 남은 위협 ${remaining}`,240,132);

    const bossScale=this.victory?Math.max(0,1-this.victoryTimer/.9):1;
    if(bossImage&&bossScale>0){
      ctx.save();
      ctx.globalAlpha=this.victory?Math.max(0,1-this.victoryTimer/.8):1;
      ctx.translate(this.bossX,this.bossY);
      ctx.rotate(this.victory?Math.sin(this.victoryTimer*36)*.12:Math.sin(this.elapsed*2.2)*.025);
      ctx.scale(bossScale,bossScale);
      ctx.drawImage(bossImage,-62,-62,124,124);
      ctx.restore();
    }

    this.warnings.forEach(warning=>{
      const pulse=.35+Math.sin(warning.time*30)*.18;
      ctx.globalAlpha=Math.max(.16,pulse);
      ctx.fillStyle="#ff4d6d";
      ctx.fillRect(warning.x-18,210,36,this.arenaY-210);
      ctx.globalAlpha=1;
      ctx.fillStyle="#fff4a9";
      ctx.beginPath();
      ctx.arc(warning.x,229,15,0,Math.PI*2);
      ctx.fill();
      ctx.fillStyle="#9b183b";
      ctx.font="900 19px sans-serif";
      ctx.fillText("!",warning.x,236);
    });

    this.missiles.forEach(missile=>{
      ctx.save();
      ctx.translate(missile.x,missile.y);
      ctx.rotate(missile.angle);
      if(missileImage)ctx.drawImage(missileImage,-18,-32,36,64);
      else {
        ctx.fillStyle="#ff4664";
        ctx.beginPath();
        ctx.moveTo(0,27);ctx.lineTo(-12,-18);ctx.lineTo(12,-18);ctx.closePath();ctx.fill();
      }
      ctx.restore();
    });

    ctx.fillStyle="#1f3a47";
    ctx.beginPath();
    ctx.roundRect(0,this.arenaY,480,65,14);
    ctx.fill();
    ctx.fillStyle="#87c857";
    ctx.fillRect(0,this.arenaY,480,11);
    ctx.fillStyle="#b6f07f";
    ctx.fillRect(0,this.arenaY,480,4);

    if(this.victory){
      ctx.globalAlpha=Math.min(1,this.victoryTimer*3);
      ctx.fillStyle="#fff7bf";
      ctx.font="900 34px sans-serif";
      ctx.fillText("왕 격파!",240,360);
      ctx.fillStyle="#fff";
      ctx.font="800 17px sans-serif";
      ctx.fillText(`Lv.${this.targetLevel.level} ${this.targetLevel.name}(으)로 진화!`,240,392);
    }
    ctx.restore();
  }
}
