const ACCOUNTS_KEY="haminJump.accounts.v1";
const SESSION_KEY="haminJump.session.v1";
const MIGRATION_KEY="haminJump.accountMigration.v1";

const emptyProfile=username=>({
  username,
  coins:0,
  bestScore:0,
  records:[],
  upgrades:{jump:0,speed:0,coin:0,shield:0},
  inventory:{rocket:0,wings:0,shield:0,feather:0},
  createdAt:new Date().toISOString()
});

export class AccountManager {
  constructor(){
    this.migrateLegacyData();
    this.accounts=this.read(ACCOUNTS_KEY,{});
    this.currentUsername=this.readText(SESSION_KEY);
    if(!this.accounts[this.currentUsername])this.currentUsername="";
  }
  hasAccounts(){return Object.keys(this.accounts).length>0;}
  get current(){return this.currentUsername?this.accounts[this.currentUsername]:null;}
  async signup(username,password){
    const name=this.cleanName(username);
    if(name.length<2)throw new Error("이름은 2자 이상 입력해 주세요.");
    if(password.length<4)throw new Error("비밀번호는 4자 이상 입력해 주세요.");
    if(this.accounts[name])throw new Error("이미 사용 중인 이름입니다.");
    this.accounts[name]={...emptyProfile(name),passwordHash:await this.hash(password)};
    this.currentUsername=name;this.persist();return this.current;
  }
  async login(username,password){
    const name=this.cleanName(username),account=this.accounts[name];
    if(!account||account.passwordHash!==await this.hash(password))throw new Error("이름 또는 비밀번호가 맞지 않습니다.");
    this.currentUsername=name;this.writeText(SESSION_KEY,name);return account;
  }
  logout(){this.currentUsername="";localStorage.removeItem(SESSION_KEY);}
  addResult({score,level}){
    const account=this.current;if(!account)return 0;
    const multiplier=1+(account.upgrades.coin||0)*.1;
    const earned=Math.max(0,Math.round(score*multiplier));
    account.coins+=earned;
    account.bestScore=Math.max(account.bestScore,score);
    account.records=[...account.records,{score,level,date:new Date().toISOString(),coins:earned}].sort((a,b)=>b.score-a.score).slice(0,30);
    this.persist();return earned;
  }
  buyUpgrade(id,cost,maxLevel){
    const account=this.current;if(!account)return false;
    const level=account.upgrades[id]||0;
    if(level>=maxLevel||account.coins<cost)return false;
    account.coins-=cost;account.upgrades[id]=level+1;this.persist();return true;
  }
  buyItem(id,cost){
    const account=this.current;if(!account||account.coins<cost)return false;
    account.coins-=cost;account.inventory[id]=(account.inventory[id]||0)+1;this.persist();return true;
  }
  consume(id){
    const account=this.current;if(!account||(account.inventory[id]||0)<1)return false;
    account.inventory[id]-=1;this.persist();return true;
  }
  persist(){localStorage.setItem(ACCOUNTS_KEY,JSON.stringify(this.accounts));if(this.currentUsername)this.writeText(SESSION_KEY,this.currentUsername);}
  migrateLegacyData(){
    if(localStorage.getItem(MIGRATION_KEY))return;
    ["animalJump.bestScore","animalJump.highestLevel","animalJump.playerName","animalJump.records"].forEach(key=>localStorage.removeItem(key));
    localStorage.setItem(MIGRATION_KEY,"done");
  }
  cleanName(value){return String(value||"").trim().replace(/[<>]/g,"").slice(0,12);}
  async hash(value){
    if(globalThis.crypto?.subtle){
      const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`hamin-jump:${value}`));
      return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,"0")).join("");
    }
    let hash=2166136261;for(const char of `hamin-jump:${value}`){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}return String(hash>>>0);
  }
  read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||"null")||fallback;}catch{return fallback;}}
  readText(key){try{return localStorage.getItem(key)||"";}catch{return "";}}
  writeText(key,value){localStorage.setItem(key,value);}
}
