const SERVER_MIGRATION_KEY="haminJump.serverAccounts.v1";

export class AccountManager {
  constructor(){this.current=null;this.migrateLocalAccounts();}
  async restore(){
    try{const data=await this.request("/api/profile");this.current=data.profile;return this.current;}
    catch(error){if(error.status!==401)console.warn(error.message);this.current=null;return null;}
  }
  async signup(username,password){return this.authenticate("signup",username,password);}
  async login(username,password){return this.authenticate("login",username,password);}
  async authenticate(action,username,password){
    const data=await this.request("/api/auth",{method:"POST",body:JSON.stringify({action,username,password})});
    this.current=data.profile;return this.current;
  }
  async logout(){
    try{await this.request("/api/auth",{method:"POST",body:JSON.stringify({action:"logout"})});}catch{}
    this.current=null;
  }
  async addResult({score,level}){
    const data=await this.profileAction({action:"result",score,level});
    return data.earned||0;
  }
  async buyUpgrade(id){
    await this.profileAction({action:"buyUpgrade",id});return true;
  }
  async buyItem(id){
    await this.profileAction({action:"buyItem",id});return true;
  }
  async consume(id){
    await this.profileAction({action:"consume",id});return true;
  }
  async leaderboard(){
    const data=await this.request("/api/leaderboard");return data.leaderboard||[];
  }
  async profileAction(body){
    const data=await this.request("/api/profile",{method:"POST",body:JSON.stringify(body)});
    this.current=data.profile;return data;
  }
  async request(url,options={}){
    const response=await fetch(url,{credentials:"same-origin",headers:{"Content-Type":"application/json",...(options.headers||{})},...options});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){const error=new Error(data.error||"서버 요청에 실패했습니다.");error.status=response.status;throw error;}
    return data;
  }
  migrateLocalAccounts(){
    if(localStorage.getItem(SERVER_MIGRATION_KEY))return;
    ["haminJump.accounts.v1","haminJump.session.v1","animalJump.bestScore","animalJump.highestLevel","animalJump.playerName","animalJump.records"].forEach(key=>localStorage.removeItem(key));
    localStorage.setItem(SERVER_MIGRATION_KEY,"done");
  }
}
