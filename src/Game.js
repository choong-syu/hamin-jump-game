import { AssetLoader } from "./AssetLoader.js";
import { AudioManager } from "./AudioManager.js";
import { InputManager } from "./InputManager.js";
import { CHARACTER_LEVELS, GAME_DIFFICULTIES, GAME_HEIGHT, GAME_WIDTH, GameState, PlayerState, STORAGE_KEYS } from "./config.js";
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
import { AccountManager } from "./AccountManager.js";
import { CONSUMABLES } from "./StoreCatalog.js";
import { showAuth, showRecords, showStore, showWallet } from "./ui/AccountScreens.js";

export class Game {
  constructor(canvas,overlay) {
    this.canvas=canvas;this.ctx=canvas.getContext("2d");this.overlay=overlay;this.assets=new AssetLoader();
    this.state=GameState.LOADING;this.player=new Player();this.platformManager=new PlatformManager();this.particles=new ParticleSystem();
    this.distance=0;this.bonusScore=0;this.score=0;this.level=CHARACTER_LEVELS[0];this.levelBanner=0;this.slowMotion=0;
    this.runSeed=Date.now();this.pauseReturnState=GameState.PLAYING;
    this.pressureDistance=0;
    this.windTimer=0;this.windDirection=1;
    this.racePlayers=[];this.raceSyncTimer=0;
    this.raceMenuOpen=false;this.publicRooms=[];this.raceListTimer=null;
    this.accounts=new AccountManager();this.debug=new URLSearchParams(location.search).get("debug")==="true";this.showBoxes=this.debug;this.gravity=true;this.fps=0;
    this.playerName=this.accounts.current?.username||"";this.best=this.accounts.current?.bestScore||0;this.records=this.accounts.current?.records||[];this.panelContext=null;this.lastCoinsEarned=0;this.consumablesUsed=0;this.itemUsePending=false;
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
      onRooms:rooms=>{this.publicRooms=rooms;if(this.raceMenuOpen&&!this.race.active)showRaceLobby(this.overlay,{mode:"menu",rooms,difficulty:this.difficulty});},
      onError:message=>{if(this.state===GameState.START){this.openRaceMenu(message,false);}else console.warn(message);}
    });
    this.lastTime=performance.now();this.overlay.addEventListener("click",e=>{const target=e.target.closest("[data-action]");if(target)this.action(target.dataset.action,target.dataset.id);});
    this.overlay.addEventListener("change",e=>{if(e.target.dataset.action==="raceDifficulty"){this.difficulty=e.target.value;this.save(STORAGE_KEYS.difficulty,this.difficulty);if(this.race.isHost)this.race.setDifficulty(this.difficulty);}});
    this.overlay.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.matches("#loginName,#loginPassword,#signupName,#signupPassword"))this.action(e.target.id.startsWith("login")?"login":"signup");});
  }
  async init() {
    this.overlay.innerHTML='<div class="card"><h2>Loading 0%</h2><p>동물 친구들이 준비 중이에요…</p></div>';
    await this.assets.loadAll(progress=>{this.overlay.querySelector("h2").textContent=`Loading ${Math.round(progress*100)}%`;});
    await this.accounts.restore();this.state=GameState.START;if(this.accounts.current)this.showStart();else this.showAuth();requestAnimationFrame(time=>this.loop(time));
  }
  action(action,targetId="") {
    this.audio.unlock();
    if(["records","wallet","store"].includes(action)){this.openAccountPanel(action);return;}
    if(action==="closePanel"){this.closeAccountPanel();return;}
    if(["login","signup"].includes(action)){this.handleAuth(action);return;}
    if(action==="logout"){this.handleLogout();return;}
    if(action==="buyUpgrade"){this.buyFromStore("upgrade",targetId);return;}
    if(action==="buyItem"){this.buyFromStore("item",targetId);return;}
    if(action.startsWith("use:")){this.useInventory(action.slice(4));return;}
    if(action==="codex"&&this.state===GameState.START){showCodex(this.overlay);return;}
    if(action==="race"&&this.state===GameState.START){this.captureDifficulty();this.openRaceMenu();return;}
    if(action==="refreshRaces"){this.refreshPublicRooms();return;}
    if(action==="createRace"){this.captureRaceDifficulty();this.closeRaceMenu();this.race.create(this.playerName,this.difficulty);return;}
    if(action==="joinPublicRace"){this.closeRaceMenu();this.race.join(targetId,this.playerName);return;}
    if(action==="joinRace"){const code=(this.overlay.querySelector("#roomCode")?.value||"").trim();if(code.length!==6){showRaceLobby(this.overlay,{mode:"menu",rooms:this.publicRooms,difficulty:this.difficulty,status:"6자리 방 코드를 입력해 주세요."});return;}this.closeRaceMenu();this.race.join(code,this.playerName);return;}
    if(action==="startRace"){this.race.startRace(this.race.difficulty);return;}
    if(action==="raceBack"){this.closeRaceMenu();this.race.destroy();this.state=GameState.START;this.showStart();return;}
    if(["activate","Space","start"].includes(action)&&this.state===GameState.START&&!this.race.active){this.captureDifficulty();this.start();return;}
    if(["activate","Space","restart"].includes(action)&&this.state===GameState.GAME_OVER){if(this.race.active){this.race.destroy();this.state=GameState.START;this.showStart();}else this.start();return;}
    if(action==="home"){this.closeRaceMenu();this.race.destroy();this.state=GameState.START;this.showStart();return;}
    if(action==="KeyP"||action==="pause"){this.togglePause();return;}
    if(action==="KeyM"||action==="mute"){this.audio.toggle();this.save(STORAGE_KEYS.soundMuted,this.audio.muted);this.syncButtons();return;}
    if(this.debug&&/^Digit[1-9]$/.test(action)){this.forceLevel(Number(action.at(-1)));return;}
    if(this.debug&&action==="Digit0"){this.forceLevel(10);return;}
    if(this.debug&&action==="Minus"){this.forceLevel(11);return;}
    if(this.debug&&action==="Equal"){this.forceLevel(12);return;}
    if(this.debug&&action==="KeyL"){const next=CHARACTER_LEVELS[this.level.level];if(next)this.bonusScore=Math.max(this.bonusScore,next.scoreRequired+1-this.distance/10);return;}
    if(this.debug&&action==="KeyG")this.gravity=!this.gravity;
    if(this.debug&&action==="KeyB")this.showBoxes=!this.showBoxes;
    if(this.debug&&action==="KeyR")this.start();
  }
  start(seed=null) {
    this.closeRaceMenu();
    this.state=GameState.PLAYING;this.overlay.classList.remove("start-background");this.overlay.innerHTML="";this.player.reset();this.level=CHARACTER_LEVELS[0];this.player.setLevel(this.level);
    this.runSeed=Number(seed??Date.now());this.consumablesUsed=0;this.itemUsePending=false;
    this.platformManager.reset(this.difficulty,seed);this.distance=0;this.bonusScore=0;this.score=0;this.levelBanner=0;this.pressureDistance=0;this.windTimer=0;this.windDirection=seed?(seed%2?1:-1):(Math.random()<.5?-1:1);this.raceSyncTimer=0;this.applyUpgrades();this.player.land(this.platformManager.platforms[0]);this.syncButtons();this.updateItemDock();
  }
  togglePause(){if(this.race.active)return;if(this.state===GameState.PLAYING){this.pauseReturnState=this.state;this.state=GameState.PAUSED;this.overlay.innerHTML='<div class="card"><h2>잠시 쉬어가요</h2><button class="primary" data-action="pause">계속하기</button></div>';}else if(this.state===GameState.PAUSED){this.state=this.pauseReturnState;this.overlay.innerHTML="";}}
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
    const next=CHARACTER_LEVELS[this.level.level];
    if(next&&this.score>=next.scoreRequired)this.levelUp(next);
    this.particles.update(dt);if(this.levelBanner>0)this.levelBanner-=dt;if(this.slowMotion>0)this.slowMotion-=dt;
    if(this.player.y>GAME_HEIGHT+100)this.handleFall();
    if(this.state!==GameState.PLAYING)return;
    if(this.race.active){this.raceSyncTimer+=dt;if(this.raceSyncTimer>=.08){this.raceSyncTimer=0;this.race.updateLocal({name:this.playerName,score:this.score,level:this.level.level,alive:true,altitude:Math.floor(this.distance),progress:Math.floor(this.distance+640-this.player.y),x:Math.round(this.player.x),state:this.player.state,facing:this.player.facing});}}
  }
  handleFall() {
    if(this.player.shield){this.player.shield=false;const target=this.platformManager.platforms.filter(p=>p.active&&p.visible&&p.y<740).sort((a,b)=>b.y-a.y)[0];if(target){this.player.x=target.x+target.width/2-41;this.player.y=target.y-82;this.player.land(target);return;}}
    this.gameOver();
  }
  levelUp(next){this.level=next;this.player.setLevel(next);this.applyUpgrades(false);this.levelBanner=1.2;this.slowMotion=.35;this.particles.burst(240,330,"#fff06d",40,220);this.audio.tone(880,.25,"sine");}
  forceLevel(number){this.level=CHARACTER_LEVELS[number-1];this.player.setLevel(this.level);this.levelBanner=1.2;}
  async gameOver(reason="구름 아래로\n살포시 착지!"){
    if(this.state===GameState.GAME_OVER)return;this.state=GameState.GAME_OVER;this.player.state=PlayerState.DEAD;
    if(this.race.active)this.race.updateLocal({name:this.playerName,score:this.score,level:this.level.level,alive:false,altitude:Math.floor(this.distance)});
    try{this.lastCoinsEarned=await this.accounts.addResult({score:this.score,level:this.level.level});}catch(error){console.error(error);this.lastCoinsEarned=0;}
    this.best=this.accounts.current?.bestScore||Math.max(this.best,this.score);this.records=this.accounts.current?.records||this.records;
    this.particles.burst(this.player.x+40,760,"#fff",22,150);this.audio.tone(120,.5,"sawtooth");this.updateItemDock();showGameOver(this.overlay,this.score,this.best,this.level,this.playerName,this.records,reason,this.race.active?this.race.getPlayers():[],this.lastCoinsEarned);
  }
  render() {
    this.drawBackground();
    this.platformManager.render(this.ctx,this.debug&&this.showBoxes);
    this.particles.render(this.ctx);
    if(this.race.active&&this.state===GameState.PLAYING)this.drawRaceGhosts();
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
  drawRaceGhosts(){
    const localProgress=this.distance+640-this.player.y;
    this.racePlayers.filter(player=>player.id!==this.race.localId&&player.alive!==false&&Number.isFinite(player.progress)).forEach(player=>{
      const level=CHARACTER_LEVELS[Math.max(0,Math.min(11,(player.level||1)-1))];
      const state=Object.values(PlayerState).includes(player.state)&&player.state!==PlayerState.DEAD?player.state:PlayerState.IDLE;
      const image=this.assets.get(level.level,state);if(!image)return;
      const y=this.player.y-(player.progress-localProgress);if(y<-100||y>820)return;
      this.ctx.save();this.ctx.globalAlpha=.36;this.ctx.translate((player.x??199)+41,y+41);this.ctx.scale(player.facing==="left"?-1:1,1);this.ctx.drawImage(image,-41,-41,82,82);this.ctx.restore();
    });
  }
  drawRaceHUD(){const others=this.racePlayers.filter(player=>player.id!==this.race.localId).sort((a,b)=>b.score-a.score).slice(0,3);if(!others.length)return;this.ctx.save();this.ctx.fillStyle="#142f46c9";this.ctx.beginPath();this.ctx.roundRect(292,91,176,24+others.length*22,12);this.ctx.fill();this.ctx.fillStyle="#fff";this.ctx.font="800 11px sans-serif";this.ctx.textAlign="left";this.ctx.fillText("LIVE RACE",304,108);others.forEach((player,index)=>{this.ctx.fillStyle=player.alive===false?"#a9b4bc":"#fff";this.ctx.fillText(`${index+1}. ${player.name}`,304,129+index*21);this.ctx.textAlign="right";this.ctx.fillText(`${player.score}`,456,129+index*21);this.ctx.textAlign="left";});this.ctx.restore();}
  drawDebug(){this.ctx.save();this.ctx.fillStyle="#06111ddd";this.ctx.fillRect(10,96,190,120);this.ctx.fillStyle="#b7ff8b";this.ctx.font="12px monospace";const lines=[`FPS ${this.fps.toFixed(0)}`,`STATE ${this.player.state}`,`VX ${this.player.velocityX.toFixed(1)}`,`VY ${this.player.velocityY.toFixed(1)}`,`JUMP ${this.player.jumpPower}`,`CAMERA ${this.distance.toFixed(0)}`,`PLATFORMS ${this.platformManager.platforms.length}`,`GRAVITY ${this.gravity}`];lines.forEach((line,i)=>this.ctx.fillText(line,19,113+i*14));this.ctx.restore();}
  loop(time){const raw=(time-this.lastTime)/1000;this.lastTime=time;this.fps=this.fps*.9+(raw?1/raw:60)*.1;const dt=limitDelta(raw)*(this.slowMotion>0?.45:1);if(this.state===GameState.PLAYING)this.update(dt);this.render();requestAnimationFrame(t=>this.loop(t));}
  showStart(){if(!this.accounts.current){this.showAuth();return;}this.playerName=this.accounts.current.username;this.best=this.accounts.current.bestScore;this.records=this.accounts.current.records;showStart(this.overlay,this.best,"assets/sprites/level1/idle.png",this.accounts.current,this.difficulty);this.syncButtons();this.updateItemDock();}
  showAuth(options={}){showAuth(this.overlay,options);this.syncButtons();}
  captureDifficulty(){this.difficulty=this.overlay.querySelector('input[name="difficulty"]:checked')?.value||this.difficulty||"normal";this.save(STORAGE_KEYS.difficulty,this.difficulty);}
  captureRaceDifficulty(){this.difficulty=this.overlay.querySelector('input[name="raceDifficulty"]:checked')?.value||this.difficulty||"normal";this.save(STORAGE_KEYS.difficulty,this.difficulty);}
  openRaceMenu(status="",refresh=true){
    this.raceMenuOpen=true;showRaceLobby(this.overlay,{mode:"menu",rooms:this.publicRooms,difficulty:this.difficulty,status});
    clearInterval(this.raceListTimer);this.raceListTimer=setInterval(()=>this.refreshPublicRooms(),4000);
    if(refresh)this.refreshPublicRooms();
  }
  closeRaceMenu(){this.raceMenuOpen=false;clearInterval(this.raceListTimer);this.raceListTimer=null;}
  refreshPublicRooms(){if(this.raceMenuOpen&&!this.race.active)this.race.listRooms();}
  async handleAuth(action){
    const name=this.overlay.querySelector(`#${action}Name`)?.value||"",password=this.overlay.querySelector(`#${action}Password`)?.value||"";
    try{if(action==="signup")await this.accounts.signup(name,password);else await this.accounts.login(name,password);this.playerName=this.accounts.current.username;this.best=this.accounts.current.bestScore;this.records=this.accounts.current.records;this.state=GameState.START;this.showStart();}
    catch(error){this.showAuth({target:action,message:error.message});}
  }
  async handleLogout(){await this.accounts.logout();this.playerName="";this.race.destroy();this.state=GameState.START;this.showAuth();}
  async openAccountPanel(kind){
    const account=this.accounts.current;if(!account)return;
    if(!this.panelContext)this.panelContext={state:this.state,html:this.overlay.innerHTML,startBackground:this.overlay.classList.contains("start-background")};
    if(this.state===GameState.PLAYING&&!this.race.active){this.pauseReturnState=this.state;this.state=GameState.PAUSED;}
    if(kind==="records"){let leaderboard=[];try{leaderboard=await this.accounts.leaderboard();}catch{}showRecords(this.overlay,account,leaderboard);}
    if(kind==="wallet")showWallet(this.overlay,account);
    if(kind==="store")showStore(this.overlay,account);
  }
  closeAccountPanel(){
    if(!this.panelContext){this.showStart();return;}
    const context=this.panelContext;this.panelContext=null;this.state=context.state;this.overlay.innerHTML=context.html;this.overlay.classList.toggle("start-background",context.startBackground);
  }
  async buyFromStore(kind,id){
    if(!id)return;
    try{if(kind==="upgrade")await this.accounts.buyUpgrade(id);else await this.accounts.buyItem(id);showStore(this.overlay,this.accounts.current,"구매했습니다!");}
    catch(error){showStore(this.overlay,this.accounts.current,error.message);}
    this.updateItemDock();
  }
  applyUpgrades(includeShield=true){
    const upgrades=this.accounts.current?.upgrades||{};this.player.jumpPower*=1+(upgrades.jump||0)*.04;this.player.moveSpeed*=1+(upgrades.speed||0)*.05;if(includeShield&&upgrades.shield)this.player.shield=true;
  }
  async useInventory(id){
    if(this.state!==GameState.PLAYING||this.consumablesUsed>=2||this.itemUsePending)return;
    this.itemUsePending=true;this.updateItemDock();
    try{
      await this.accounts.consume(id);this.consumablesUsed++;
      if(id==="rocket"){this.player.velocityY=-1500;this.bonusScore+=50;this.particles.burst(this.player.x+41,this.player.y+80,"#ff9c42",35,240);}
      if(id==="wings")this.player.wings=Math.max(this.player.wings,6);
      if(id==="shield")this.player.shield=true;
      if(id==="feather")this.player.feather=Math.max(this.player.feather,6);
      this.audio.tone(780,.18,"sawtooth");
    }catch{}finally{this.itemUsePending=false;this.updateItemDock();}
  }
  updateItemDock(){
    const dock=document.querySelector("#itemDock"),account=this.accounts.current;if(!dock)return;
    dock.classList.toggle("visible",this.state===GameState.PLAYING&&!!account);
    const limitReached=this.consumablesUsed>=2||this.itemUsePending;
    dock.innerHTML=account?`<div class="item-limit">사용 ${this.consumablesUsed}/2</div>${CONSUMABLES.map(item=>`<button data-item="${item.id}" ${(account.inventory[item.id]||0)<1||limitReached?"disabled":""} aria-label="${item.name}"><span>${item.short}</span><small>${account.inventory[item.id]||0}</small></button>`).join("")}`:"";
  }
  syncButtons(){document.querySelector("#muteButton").textContent=this.audio.muted?"×":"♪";document.querySelector("#accountActions").classList.toggle("visible",!!this.accounts.current);}
  loadNumber(key){try{return Number(localStorage.getItem(key))||0;}catch{return 0;}}
  loadBoolean(key){try{return localStorage.getItem(key)==="true";}catch{return false;}}
  loadText(key){try{return localStorage.getItem(key)||"";}catch{return "";}}
  loadRecords(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEYS.records)||"[]");return Array.isArray(value)?value:[];}catch{return [];}}
  save(key,value){try{localStorage.setItem(key,String(value));}catch{}}
}
