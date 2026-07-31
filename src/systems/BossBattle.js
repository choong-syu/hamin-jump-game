import { GAME_HEIGHT, GAME_WIDTH, clamp } from "../config.js";

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
    const difficultyStep=difficulty==="advanced"?1:difficulty==="beginner"?-1:0;
    this.totalWaves=Math.max(4,Math.min(11,4+Math.floor((targetLevel.level-2)*.55)+difficultyStep));
    this.warningDuration=Math.max(.48,.9-targetLevel.level*.03-(difficulty==="advanced"?.06:difficulty==="beginner"?-.08:0));
    this.waveInterval=Math.max(.76,1.34-targetLevel.level*.035-(difficulty==="advanced"?.08:difficulty==="beginner"?-.08:0));
    this.missilesPerWave=targetLevel.level>=9?3:targetLevel.level>=5?2:1;
    this.speedBase=230+targetLevel.level*15+(difficulty==="advanced"?28:difficulty==="beginner"?-22:0);
    this.aimJitter=Math.max(5,34-targetLevel.level*2.2);
    this.spawnedWaves=0;
    this.clearedMissiles=0;
    this.totalMissiles=0;
    this.warnings=[];
    this.missiles=[];
    this.elapsed=0;
    this.nextWave=1.05;
    this.victory=false;
    this.victoryTimer=0;
    this.bossX=240;
    this.bossY=202;
    this.missileStartY=270;
    this.arenaY=650;
  }

  preparePlayer(player) {
    this.arenaY=clamp(player.y+player.height+72,555,700);
    player.y=this.arenaY-player.hitbox.offsetY-player.hitbox.height;
    player.previousY=player.y;
    player.velocityX=0;
    player.velocityY=0;
  }

  spawnWave(playerCenterX) {
    const center=clamp(playerCenterX+(this.random()-.5)*this.aimJitter*2,66,GAME_WIDTH-66);
    const offsets=this.missilesPerWave===1?[0]:this.missilesPerWave===2?[-38,38]:[-66,0,66];
    offsets.forEach((offset,index)=>{
      this.warnings.push({
        x:clamp(center+offset,28,GAME_WIDTH-28),
        time:this.warningDuration+index*.035,
        duration:this.warningDuration+index*.035,
        speed:this.speedBase+this.random()*38
      });
      this.totalMissiles++;
    });
    this.spawnedWaves++;
  }

  update(dt,playerBox) {
    this.elapsed+=dt;
    this.bossX=240+Math.sin(this.elapsed*1.9)*108;
    if(this.victory){
      this.victoryTimer+=dt;
      return this.victoryTimer>=1.35?{complete:true}:null;
    }

    if(this.spawnedWaves<this.totalWaves){
      this.nextWave-=dt;
      if(this.nextWave<=0){
        this.spawnWave(playerBox.x+playerBox.width/2);
        this.nextWave=this.waveInterval;
      }
    }

    const pending=[];
    this.warnings.forEach(warning=>{
      warning.time-=dt;
      if(warning.time<=0)this.missiles.push({x:warning.x,y:this.missileStartY,speed:warning.speed,angle:0});
      else pending.push(warning);
    });
    this.warnings=pending;

    let hit=false;
    const active=[];
    this.missiles.forEach(missile=>{
      missile.y+=missile.speed*dt;
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
    ctx.textAlign="center";

    ctx.fillStyle="#142a3ddc";
    ctx.beginPath();
    ctx.roundRect(154,88,172,35,17);
    ctx.fill();
    ctx.fillStyle="#ffe67c";
    ctx.font="900 12px sans-serif";
    const attack=Math.min(this.totalWaves,this.spawnedWaves+(this.spawnedWaves<this.totalWaves?1:0));
    ctx.fillText(this.victory?"왕 격파!":`${this.name} · 공격 ${attack}/${this.totalWaves}`,240,110);

    const bossScale=this.victory?Math.max(0,1-this.victoryTimer/.82):1;
    if(bossImage&&bossScale>0){
      ctx.save();
      ctx.globalAlpha=this.victory?Math.max(0,1-this.victoryTimer/.75):1;
      ctx.translate(this.bossX,this.bossY);
      ctx.rotate(this.victory?Math.sin(this.victoryTimer*38)*.12:Math.sin(this.elapsed*2.2)*.025);
      ctx.scale(bossScale,bossScale);
      ctx.drawImage(bossImage,-61,-61,122,122);
      ctx.restore();
    }

    this.warnings.forEach(warning=>{
      const progress=1-warning.time/warning.duration;
      const pulse=.2+progress*.28+Math.sin(warning.time*34)*.08;
      ctx.globalAlpha=Math.max(.14,pulse);
      ctx.fillStyle="#ff3f60";
      ctx.fillRect(warning.x-17,this.missileStartY-5,34,this.arenaY-this.missileStartY+5);
      ctx.globalAlpha=.9;
      ctx.strokeStyle="#fff09a";
      ctx.lineWidth=3;
      ctx.beginPath();
      ctx.arc(warning.x,this.arenaY-5,13+Math.sin(warning.time*25)*3,0,Math.PI*2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(warning.x-20,this.arenaY-5);ctx.lineTo(warning.x+20,this.arenaY-5);
      ctx.moveTo(warning.x,this.arenaY-25);ctx.lineTo(warning.x,this.arenaY+15);
      ctx.stroke();
      ctx.globalAlpha=1;
    });

    this.missiles.forEach(missile=>{
      ctx.save();
      ctx.translate(missile.x,missile.y);
      if(missileImage)ctx.drawImage(missileImage,-18,-32,36,64);
      else {
        ctx.fillStyle="#ff4664";
        ctx.beginPath();
        ctx.moveTo(0,27);ctx.lineTo(-12,-18);ctx.lineTo(12,-18);ctx.closePath();ctx.fill();
      }
      ctx.restore();
    });

    const barGradient=ctx.createLinearGradient(0,this.arenaY,0,this.arenaY+24);
    barGradient.addColorStop(0,"#fff18a");
    barGradient.addColorStop(.22,"#e1ae42");
    barGradient.addColorStop(1,"#7e4d25");
    ctx.shadowColor="#fff2a0";
    ctx.shadowBlur=12;
    ctx.fillStyle=barGradient;
    ctx.beginPath();
    ctx.roundRect(20,this.arenaY,440,23,11);
    ctx.fill();
    ctx.shadowBlur=0;
    ctx.strokeStyle="#fff7bd";
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(34,this.arenaY+4);ctx.lineTo(446,this.arenaY+4);
    ctx.stroke();

    if(this.victory){
      ctx.globalAlpha=Math.min(1,this.victoryTimer*3);
      ctx.fillStyle="#fff7bf";
      ctx.font="900 34px sans-serif";
      ctx.fillText("왕 격파!",240,this.arenaY-142);
      ctx.fillStyle="#fff";
      ctx.font="800 17px sans-serif";
      ctx.fillText(`${this.targetLevel.name}(으)로 진화!`,240,this.arenaY-112);
    }
    ctx.restore();
  }
}
