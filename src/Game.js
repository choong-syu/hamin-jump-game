import { AssetLoader } from "./AssetLoader.js";
import { AudioManager } from "./AudioManager.js";
import { InputManager } from "./InputManager.js";
import { CHARACTER_LEVELS, GAME_DIFFICULTIES, GAME_HEIGHT, GAME_WIDTH, GameState, PlayerState, STORAGE_KEYS, getLevelForScore } from "./config.js";
import { Player } from "./entities/Player.js";
import { Item } from "./entities/Item.js";
import { PlatformManager } from "./systems/PlatformManager.js";
import { ParticleSystem } from "./systems/ParticleSystem.js";
import { findLanding } from "./systems/CollisionSystem.js";
import { updateCamera } from "./systems/CameraSystem.js";
import { limitDelta } from "./systems/PhysicsSystem.js";
import { drawHUD } from "./ui/HUD.js";
import { showStart, showCodex, showRaceLobby } from "./ui/StartScreen.js";
import { showGameOver } from "./ui/GameOverScreen.js";
import { RaceManager } from "./RaceManager.js";

export class Game {
  constructor(canvas,overlay) {
    this.canvas=canvas;this.ctx=canvas.getContext("2d");this.overlay=overlay;this.assets=new AssetLoader();
    this.state=GameState.LOADING;this.player=new Player();this.platformManager=new PlatformManager();this.particles=new ParticleSystem();
    this.distance=0;this.bonusScore=0;this.score=0;this.level=CHARACTER_LEVELS[0];this.levelBanner=0;this.slowMotion=0;
    this.pressureDistance=0;
    this.windTimer=0;this.windDirection=1;
    this.racePlayers=[];this.raceSyncTimer=0;
    this.debug=new URLSearchParams(location.search).get("debug")==="true";this.showBoxes=this.debug;this.gravity=true;this.fps=0;this.best=this.loadNumber(STORAGE_KEYS.bestScore);
    this.playerName=this.loadText(STORAGE_KEYS.playerName);this.records=this.loadRecords();
    this.difficulty=GAME_DIFFICULTIES[this.loadText(STORAGE_KEYS.difficulty)]?.id||"normal";
    this.audio=new AudioManager(this.loadBoolean(STORAGE_KEYS.soundMuted));this.input=new InputManager(canvas,action=>this.action(action));
    this.race=new RaceManager({
      onLobby:snapshot=>{if(this.state!==GameState.PLAYING)showRaceLobby(this.overlay,snapshot);},
      onStart:({seed,difficulty,startAt})=>{
        this.difficulty=difficulty;
        showRaceLobby(this.overlay,{...this.race.snapshot("레이스가 곧 시작됩니다!"),status:"3 · 2 · 1 · 출발!"});
        setTimeout(()=>this.start(seed),Math.max(0,(startAt||Date.now())-Date.now()));
      },
      onUpdate:players=>{this.racePlayers=players;},
      onError:message=>showRaceLobby(this.overlay,{mode:"menu",status:message})
    });
    this.lastTime=performance.now();this.overlay.addEventListener("click",e=>{const action=e.target.closest("[data-action]")?.dataset.action;if(action)this.action(action);});
  }
  async init() {
    this.overlay.innerHTML='<div class="card"><h2>Loading 0%</h2><p>동물 친구들이 준비 중이에요…</p></div>';
    await this.assets.loadAll(progress=>{this.overlay.querySelector("h2").textContent=`Loading ${Math.round(progress*100)}%`;});
    this.state=GameState.START;this.showStart();requestAnimationFrame(time=>this.loop(time));
  }
  action(action) {
    this.audio.unlock();
    if(action==="codex"&&this.state===GameState.START){showCodex(this.overlay);return;}
    if(action==="race"&&this.state===GameState.START){if(this.capturePlayerName())showRaceLobby(this.overlay);return;}
    if(action==="createRace"){this.race.create(this.playerName,this.difficulty);return;}
    if(action==="joinRace"){const code=(this.overlay.querySelector("#roomCode")?.value||"").trim();if(code.length!==6){showRaceLobby(this.overlay,{mode:"menu",status:"6자리 방 코드를 입력해 주세요."});return;}this.race.join(code,this.playerName);return;}
    if(action==="startRace"){this.race.startRace(this.difficulty);return;}
    if(action==="raceBack"){this.race.destroy();this.state=GameState.START;this.showStart();return;}
    if(["activate","Space","start"].includes(action)&&this.state===GameState.START){if(this.capturePlayerName())this.start();return;}
    if(["activate","Space","restart"].includes(action)&&this.state===GameState.GAME_OVER){if(this.race.active){this.race.destroy();this.state=GameState.START;this.showStart();}else this.start();return;}
    if(action==="home"){this.race.destroy();this.state=GameState.START;this.showStart();return;}
    if(action==="KeyP"||action==="pause"){this.togglePause();return;}
    if(action==="KeyM"||action==="mute"){this.audio.toggle();this.save(STORAGE_KEYS.soundMuted,this.audio.muted);this.syncButtons();return;}
    if(this.debug&&/^Digit[1-9]$/.test(action)){this.forceLevel(Number(action.at(-1)));return;}
    if(this.debug&&action==="Digit0"){this.forceLevel(10);return;}
    if(this.debug&&action==="Minus"){this.forceLevel(11);return;}
    if(this.debug&&action==="Equal"){this.forceLevel(12);return;}
    if(this.debug&&action==="KeyL"){const next=CHARACTER_LEVELS[Math.min(7,this.level.level)];if(next)this.bonusScore=Math.max(this.bonusScore,next.scoreRequired+1-this.distance/10);return;}
    if(this.debug&&action==="KeyG")this.gravity=!this.gravity;
    if(this.debug&&action==="KeyB")this.showBoxes=!this.showBoxes;
    if(this.debug&&action==="KeyR")this.start();
  }
  start(seed=null) {
    this.state=GameState.PLAYING;this.overlay.classList.remove("start-background");this.overlay.innerHTML="";this.player.reset();this.level=CHARACTER_LEVELS[0];this.player.setLevel(this.level);
    this.platformManager.reset(this.difficulty,seed);this.distance=0;this.bonusScore=0;this.score=0;this.levelBanner=0;this.pressureDistance=0;this.windTimer=0;this.windDirection=seed?(seed%2?1:-1):(Math.random()<.5?-1:1);this.raceSyncTimer=0;this.player.land(this.platformManager.platforms[0]);this.syncButtons();
  }
  togglePause(){if(this.race.active)return;if(this.state===GameState.PLAYING){this.state=GameState.PAUSED;this.overlay.innerHTML='<div class="card"><h2>잠시 쉬어가요</h2><button class="primary" data-action="pause">계속하기</button></div>';}else if(this.state===GameState.PAUSED){this.state=GameState.PLAYING;this.overlay.innerHTML="";}}
  update(dt) {
    const difficultyData=GAME_DIFFICULTIES[this.difficulty]||GAME_DIFFICULTIES.normal;
    if(difficultyData.screenRiseSpeed>0){
      const pressure=difficultyData.screenRiseSpeed*dt;
      this.platformManager.scroll(-pressure);
      this.pressureDistance+=pressure;
    }
    this.player.update(dt,this.input.axis(),this.gravity);
    if(this.level.level>=11){this.windTimer+=dt;if(this.windTimer>4){this.windTimer=0;this.windDirection*=-1;}this.player.velocityX+=this.windDirection*90*dt;}
    this.platformManager.update(dt,this.level.level,this.difficulty);
    const landing=findLanding(this.player,this.platformManager.platforms);
    if(landing) {
      const power=landing.type==="rocket"?1.85:landing.type==="rainbow"?1.35:landing.item==="spring"?1.6:1;this.player.land(landing,power);this.audio.tone(power>1?720:280,.055,"triangle");this.particles.burst(this.player.x+41,landing.y,"#fff3c4",9,90);
      if(landing.type==="breakable")landing.breakTimer=.3;
      if(landing.type==="cloud")landing.breakTimer=.18;
      if(landing.type==="moving")this.player.x+=landing.speed*landing.direction*dt*2;
      if(landing.type==="conveyor")this.player.velocityX=landing.direction*this.player.moveSpeed*.92;
      if(landing.type==="ice")this.player.velocityX=Math.max(-this.player.moveSpeed*1.2,Math.min(this.player.moveSpeed*1.2,this.player.velocityX*1.35));
      if(landing.type==="rainbow"&&!landing.rewarded){landing.rewarded=true;this.bonusScore+=75;this.particles.burst(landing.x+landing.width/2,landing.y,"#ff78db",24,180);}
      if(landing.item){new Item(landing.item).apply(this);this.particles.burst(landing.x+landing.width/2,landing.y-10,"#ffd85a",15,150);landing.item=null;this.audio.tone(660,.12);}
    }
    const camera=updateCamera(this.player,this.platformManager);this.distance+=camera;
    const oldScore=this.score;this.score=Math.max(oldScore,Math.floor(this.distance/10)+this.bonusScore);
    const next=getLevelForScore(this.score);if(next.level!==this.level.level)this.levelUp(next);
    this.particles.update(dt);if(this.levelBanner>0)this.levelBanner-=dt;if(this.slowMotion>0)this.slowMotion-=dt;
    if(this.player.y>GAME_HEIGHT+100)this.handleFall();
    if(this.state!==GameState.PLAYING)return;
    if(this.race.active){this.raceSyncTimer+=dt;if(this.raceSyncTimer>=.12){this.raceSyncTimer=0;this.race.updateLocal({name:this.playerName,score:this.score,level:this.level.level,alive:true,altitude:Math.floor(this.distance)});}}
  }
  handleFall() {
    if(this.player.shield){this.player.shield=false;const target=this.platformManager.platforms.filter(p=>p.active&&p.visible&&p.y<740).sort((a,b)=>b.y-a.y)[0];if(target){this.player.x=target.x+target.width/2-41;this.player.y=target.y-82;this.player.land(target);return;}}
    this.gameOver();
  }
  levelUp(next){this.level=next;this.player.setLevel(next);this.levelBanner=1.2;this.slowMotion=.35;this.particles.burst(240,330,"#fff06d",40,220);this.audio.tone(880,.25,"sine");this.save(STORAGE_KEYS.highestLevel,next.level);}
  forceLevel(number){this.level=CHARACTER_LEVELS[number-1];this.player.setLevel(this.level);this.levelBanner=1.2;}
  gameOver(reason="구름 아래로\n살포시 착지!"){if(this.state===GameState.GAME_OVER)return;this.state=GameState.GAME_OVER;this.player.state=PlayerState.DEAD;this.best=Math.max(this.best,this.score);this.save(STORAGE_KEYS.bestScore,this.best);this.addRecord();if(this.race.active)this.race.updateLocal({name:this.playerName,score:this.score,level:this.level.level,alive:false,altitude:Math.floor(this.distance)});this.particles.burst(this.player.x+40,760,"#fff",22,150);this.audio.tone(120,.5,"sawtooth");showGameOver(this.overlay,this.score,this.best,this.level,this.playerName,this.records,reason,this.race.active?this.race.getPlayers():[]);}
  render() {
    this.drawBackground();this.platformManager.render(this.ctx,this.debug&&this.showBoxes);this.particles.render(this.ctx);
    const spriteState=this.player.state===PlayerState.DEAD?"fall":this.player.state;
    this.player.render(this.ctx,this.assets.get(this.level.level,spriteState),this.debug&&this.showBoxes);
    if(this.state===GameState.PLAYING||this.state===GameState.PAUSED){drawHUD(this.ctx,this.score,Math.max(this.best,this.score),this.level);if(this.level.level>=11)this.drawWind();if(this.race.active)this.drawRaceHUD();}
    if(this.levelBanner>0)this.drawLevelBanner();
    if(this.debug)this.drawDebug();
  }
  drawBackground() {
    const palettes=[["#9ee6f4","#eefbe8"],["#8dd9ee","#f2f9ec"],["#78cce8","#ebf6ff"],["#70c1df","#ede9dc"],["#f5ac88","#654f88"],["#e79572","#36466d"],["#233b73","#0a173a"],["#16235b","#071127"],["#334e78","#101b3f"],["#283d68","#10152f"],["#21335f","#0b122b"],["#342765","#10122f"]];
    const colors=palettes[this.level.level-1],g=this.ctx.createLinearGradient(0,0,0,800);g.addColorStop(0,colors[0]);g.addColorStop(1,colors[1]);this.ctx.fillStyle=g;this.ctx.fillRect(0,0,480,800);
    this.ctx.globalAlpha=.32;this.ctx.fillStyle="#fff";for(let i=0;i<6;i++){const x=(i*113+this.distance*.05)%590-60,y=(130+i*112-this.pressureDistance*.35+900)%900-50;this.ctx.beginPath();this.ctx.ellipse(x,y,58,20,0,0,Math.PI*2);this.ctx.fill();}
    if(this.level.level>=7){this.ctx.globalAlpha=.8;for(let i=0;i<35;i++){const x=(i*83)%480,y=(i*137+this.distance*.08)%800;this.ctx.fillRect(x,y,2,2);}}
    this.ctx.globalAlpha=1;
  }
  drawLevelBanner(){this.ctx.save();this.ctx.globalAlpha=Math.min(1,this.levelBanner*2);this.ctx.fillStyle="#102a42dc";this.ctx.fillRect(58,276,364,118);this.ctx.textAlign="center";this.ctx.fillStyle="#ffd65c";this.ctx.font="900 18px sans-serif";this.ctx.fillText("LEVEL UP!",240,307);this.ctx.fillStyle="#fff";this.ctx.font="900 31px sans-serif";this.ctx.fillText(`Lv.${this.level.level} ${this.level.name}`,240,344);this.ctx.font="600 14px sans-serif";this.ctx.fillText(this.level.description,240,371);this.ctx.restore();}
  drawWind(){this.ctx.save();this.ctx.fillStyle="#ffffffb8";this.ctx.beginPath();this.ctx.roundRect(170,91,140,28,14);this.ctx.fill();this.ctx.fillStyle="#31536d";this.ctx.textAlign="center";this.ctx.font="800 12px sans-serif";this.ctx.fillText(this.windDirection>0?"바람  〰  오른쪽 ▶":"◀ 왼쪽  〰  바람",240,110);this.ctx.restore();}
  drawRaceHUD(){const others=this.racePlayers.filter(player=>player.id!==this.race.localId).sort((a,b)=>b.score-a.score).slice(0,3);if(!others.length)return;this.ctx.save();this.ctx.fillStyle="#142f46c9";this.ctx.beginPath();this.ctx.roundRect(292,91,176,24+others.length*22,12);this.ctx.fill();this.ctx.fillStyle="#fff";this.ctx.font="800 11px sans-serif";this.ctx.textAlign="left";this.ctx.fillText("LIVE RACE",304,108);others.forEach((player,index)=>{this.ctx.fillStyle=player.alive===false?"#a9b4bc":"#fff";this.ctx.fillText(`${index+1}. ${player.name}`,304,129+index*21);this.ctx.textAlign="right";this.ctx.fillText(`${player.score}`,456,129+index*21);this.ctx.textAlign="left";});this.ctx.restore();}
  drawDebug(){this.ctx.save();this.ctx.fillStyle="#06111ddd";this.ctx.fillRect(10,96,190,120);this.ctx.fillStyle="#b7ff8b";this.ctx.font="12px monospace";const lines=[`FPS ${this.fps.toFixed(0)}`,`STATE ${this.player.state}`,`VX ${this.player.velocityX.toFixed(1)}`,`VY ${this.player.velocityY.toFixed(1)}`,`JUMP ${this.player.jumpPower}`,`CAMERA ${this.distance.toFixed(0)}`,`PLATFORMS ${this.platformManager.platforms.length}`,`GRAVITY ${this.gravity}`];lines.forEach((line,i)=>this.ctx.fillText(line,19,113+i*14));this.ctx.restore();}
  loop(time){const raw=(time-this.lastTime)/1000;this.lastTime=time;this.fps=this.fps*.9+(raw?1/raw:60)*.1;if(this.state===GameState.PLAYING)this.update(limitDelta(raw)*(this.slowMotion>0?.45:1));this.render();requestAnimationFrame(t=>this.loop(t));}
  showStart(){showStart(this.overlay,this.best,"assets/sprites/level1/idle.png",this.playerName,this.difficulty);this.syncButtons();}
  capturePlayerName(){const input=this.overlay.querySelector("#playerName");const name=(input?.value||"").trim();if(!name){input?.setCustomValidity("이름을 입력해 주세요.");input?.reportValidity();input?.focus();return false;}this.playerName=name.slice(0,12);this.difficulty=this.overlay.querySelector('input[name="difficulty"]:checked')?.value||"normal";this.save(STORAGE_KEYS.playerName,this.playerName);this.save(STORAGE_KEYS.difficulty,this.difficulty);return true;}
  addRecord(){const record={name:this.playerName,score:this.score,level:this.level.level,date:new Date().toISOString()};this.records=[...this.records,record].sort((a,b)=>b.score-a.score).slice(0,20);this.save(STORAGE_KEYS.records,JSON.stringify(this.records));}
  syncButtons(){document.querySelector("#muteButton").textContent=this.audio.muted?"×":"♪";}
  loadNumber(key){try{return Number(localStorage.getItem(key))||0;}catch{return 0;}}
  loadBoolean(key){try{return localStorage.getItem(key)==="true";}catch{return false;}}
  loadText(key){try{return localStorage.getItem(key)||"";}catch{return "";}}
  loadRecords(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEYS.records)||"[]");return Array.isArray(value)?value:[];}catch{return [];}}
  save(key,value){try{localStorage.setItem(key,String(value));}catch{}}
}
