export class RaceManager {
  constructor({onLobby,onStart,onUpdate,onError}) {
    this.onLobby=onLobby;this.onStart=onStart;this.onUpdate=onUpdate;this.onError=onError;
    this.peer=null;this.connections=new Map();this.players=new Map();this.isHost=false;this.active=false;this.code="";this.localId="local";
  }
  create(name,difficulty) {
    if(!window.Peer)return this.fail("실시간 연결 모듈을 불러오지 못했습니다.");
    this.destroy();this.localName=name;this.isHost=true;this.active=true;this.code=this.makeCode();this.localId=`host-${this.code}`;
    this.players.set(this.localId,{id:this.localId,name,score:0,level:1,alive:true,ready:true});
    this.peer=new window.Peer(`hamin-jump-${this.code}`,{debug:1});
    this.peer.on("open",()=>this.emitLobby("방이 만들어졌어요. 코드를 친구에게 알려주세요."));
    this.peer.on("connection",connection=>{if(this.connections.size>=3){connection.close();return;}this.bind(connection);});
    this.peer.on("error",error=>this.fail(this.message(error)));
  }
  join(code,name) {
    if(!window.Peer)return this.fail("실시간 연결 모듈을 불러오지 못했습니다.");
    this.destroy();this.localName=name;this.isHost=false;this.active=true;this.code=code.toUpperCase();this.peer=new window.Peer(undefined,{debug:1});
    this.peer.on("open",id=>{this.localId=id;const connection=this.peer.connect(`hamin-jump-${this.code}`,{serialization:"json",metadata:{name}});this.bind(connection);this.emitLobby("방에 연결하는 중…");});
    this.peer.on("error",error=>this.fail(this.message(error)));
  }
  bind(connection) {
    this.connections.set(connection.peer,connection);
    connection.on("open",()=>{if(!this.isHost)connection.send({type:"join",name:this.getLocalName()});});
    connection.on("data",data=>this.receive(connection,data));
    connection.on("close",()=>{this.connections.delete(connection.peer);if(this.isHost){this.players.delete(connection.peer);this.broadcastLobby();}else this.fail("방장과의 연결이 끊어졌습니다.");});
    connection.on("error",()=>this.fail("친구와 연결할 수 없습니다."));
  }
  receive(connection,data) {
    if(!data||typeof data!=="object")return;
    if(this.isHost){
      if(data.type==="join"){this.players.set(connection.peer,{id:connection.peer,name:String(data.name||"친구").slice(0,12),score:0,level:1,alive:true,ready:true});this.broadcastLobby();}
      if(data.type==="state"){this.players.set(connection.peer,{...this.players.get(connection.peer),...data.player,id:connection.peer});this.broadcast({type:"state",players:[...this.players.values()]});this.onUpdate?.([...this.players.values()]);}
    }else{
      if(data.type==="lobby"){this.players=new Map(data.players.map(player=>[player.id,player]));this.onLobby?.(this.snapshot(data.status));}
      if(data.type==="start")this.onStart?.(data);
      if(data.type==="state"){this.players=new Map(data.players.map(player=>[player.id,player]));this.onUpdate?.([...this.players.values()]);}
    }
  }
  startRace(difficulty) {
    if(!this.isHost||this.players.size<2)return;
    const seed=Math.floor(Math.random()*2147483646)+1,message={type:"start",seed,difficulty,startAt:Date.now()+1800};
    this.broadcast(message);this.onStart?.(message);
  }
  updateLocal(player) {
    if(!this.active)return;
    const state={id:this.localId,name:player.name,score:player.score,level:player.level,alive:player.alive,altitude:player.altitude};
    this.players.set(this.localId,state);
    if(this.isHost){this.broadcast({type:"state",players:[...this.players.values()]});this.onUpdate?.([...this.players.values()]);}
    else this.connections.values().next().value?.send({type:"state",player:state});
  }
  broadcastLobby(){const message={type:"lobby",players:[...this.players.values()],status:`${this.players.size}/4명 참가`};this.broadcast(message);this.onLobby?.(this.snapshot(message.status));}
  broadcast(message){for(const connection of this.connections.values())if(connection.open)connection.send(message);}
  emitLobby(status){this.onLobby?.(this.snapshot(status));}
  snapshot(status=""){return{mode:"room",code:this.code,players:[...this.players.values()],isHost:this.isHost,status};}
  getPlayers(){return[...this.players.values()];}
  getLocalName(){return this.players.get(this.localId)?.name||this.localName||"친구";}
  makeCode(){const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");}
  message(error){return error?.type==="unavailable-id"?"방 코드가 충돌했습니다. 다시 만들어 주세요.":"레이스 서버에 연결하지 못했습니다.";}
  fail(message){this.onError?.(message);}
  destroy(){this.connections?.forEach(connection=>connection.close());this.connections=new Map();this.peer?.destroy();this.peer=null;this.players=new Map();this.active=false;}
}
