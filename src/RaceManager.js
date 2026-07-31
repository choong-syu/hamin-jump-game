export class RaceManager {
  constructor({onLobby,onStart,onUpdate,onRooms,onError}) {
    this.onLobby=onLobby;this.onStart=onStart;this.onUpdate=onUpdate;this.onRooms=onRooms;this.onError=onError;
    this.players=new Map();this.isHost=false;this.active=false;this.code="";this.localId="local";this.localName="";this.difficulty="normal";
    this.pollTimer=null;this.polling=false;this.startTriggered=false;this.lastStateSent=0;this.pendingState=null;
  }

  async request(action,data={}) {
    const response=await fetch("/api/races",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      credentials:"same-origin",
      body:JSON.stringify({action,...data})
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result.error||"레이스 서버에 연결하지 못했습니다.");
    return result;
  }

  async listRooms() {
    try{
      const response=await fetch("/api/races",{credentials:"same-origin",cache:"no-store"});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||"방 목록을 불러오지 못했습니다.");
      this.onRooms?.(result.rooms||[]);
      return result.rooms||[];
    }catch(error){
      this.onError?.(error.message);
      return[];
    }
  }

  async create(name,difficulty) {
    this.resetLocal();this.localName=name;this.difficulty=difficulty;
    try{
      const result=await this.request("create",{difficulty});
      this.active=true;this.applyRoom(result.room,"방이 만들어졌어요. 공개 목록에서 누구나 참가할 수 있어요.");this.startPolling();
    }catch(error){this.fail(error.message);}
  }

  async join(code,name) {
    this.resetLocal();this.localName=name;this.code=String(code||"").toUpperCase();
    try{
      const result=await this.request("join",{code:this.code});
      this.active=true;this.applyRoom(result.room,"방에 참가했습니다.");this.startPolling();
    }catch(error){this.fail(error.message);}
  }

  async setDifficulty(difficulty) {
    if(!this.isHost||!["beginner","normal","advanced"].includes(difficulty))return;
    this.difficulty=difficulty;
    try{const result=await this.request("difficulty",{code:this.code,difficulty});this.applyRoom(result.room);}
    catch(error){this.fail(error.message);}
  }

  async startRace() {
    if(!this.isHost||this.players.size<2)return;
    try{const result=await this.request("start",{code:this.code});this.applyRoom(result.room);}
    catch(error){this.fail(error.message);}
  }

  updateLocal(player) {
    if(!this.active)return;
    const state={
      id:this.localId,
      name:player.name,
      score:player.score,
      level:player.level,
      alive:player.alive,
      altitude:player.altitude,
      progress:player.progress,
      x:player.x,
      state:player.state,
      facing:player.facing,
    };
    this.players.set(this.localId,state);this.pendingState=state;
    const now=Date.now();
    if(now-this.lastStateSent>=220){this.lastStateSent=now;this.sendPendingState();}
  }

  async sendPendingState() {
    const player=this.pendingState;if(!player||!this.active||this.polling)return;
    this.pendingState=null;this.polling=true;
    try{const result=await this.request("state",{code:this.code,player});this.applyRoom(result.room);}
    catch(error){this.handlePollError(error);}
    finally{this.polling=false;}
  }

  startPolling() {
    clearInterval(this.pollTimer);
    this.pollTimer=setInterval(()=>this.poll(),this.startTriggered?450:900);
  }

  async poll() {
    if(!this.active||this.polling)return;
    if(this.pendingState&&Date.now()-this.lastStateSent>=220){this.lastStateSent=Date.now();this.sendPendingState();return;}
    this.polling=true;
    try{const result=await this.request("snapshot",{code:this.code});this.applyRoom(result.room);}
    catch(error){this.handlePollError(error);}
    finally{this.polling=false;}
  }

  applyRoom(room,statusText="") {
    if(!room)return;
    const wasStarted=this.startTriggered;
    this.code=room.code;this.localId=room.localId||this.localId;this.isHost=!!room.isHost;this.difficulty=room.difficulty||"normal";
    this.players=new Map((room.players||[]).map(player=>[player.id,player]));
    this.onUpdate?.([...this.players.values()]);
    if(room.status==="playing"){
      this.startTriggered=true;
      if(!wasStarted){
        this.startPolling();
        this.onStart?.({seed:room.seed,difficulty:this.difficulty,startAt:room.startAt});
      }
    }else{
      this.onLobby?.(this.snapshot(statusText||`${this.players.size}/4명 참가`));
    }
  }

  handlePollError(error) {
    if(/종료|찾지 못|참가 중/.test(error.message)){
      this.stopPolling();this.active=false;this.onError?.("방이 종료되었거나 방장이 나갔습니다.");
    }
  }

  snapshot(status="") {
    return{mode:"room",code:this.code,players:[...this.players.values()],isHost:this.isHost,difficulty:this.difficulty,status,started:this.startTriggered};
  }

  getPlayers(){return[...this.players.values()];}

  async destroy() {
    const code=this.code,wasActive=this.active;
    this.stopPolling();this.resetLocal();
    if(wasActive&&code){
      fetch("/api/races",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        credentials:"same-origin",
        keepalive:true,
        body:JSON.stringify({action:"leave",code})
      }).catch(()=>{});
    }
  }

  stopPolling(){clearInterval(this.pollTimer);this.pollTimer=null;}
  resetLocal(){this.stopPolling();this.players=new Map();this.isHost=false;this.active=false;this.code="";this.localId="local";this.startTriggered=false;this.pendingState=null;this.polling=false;}
  fail(message){this.resetLocal();this.onError?.(message||"레이스 서버에 연결하지 못했습니다.");}
}
