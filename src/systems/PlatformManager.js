import { DIFFICULTY, GAME_HEIGHT, rand } from "../config.js";
import { Platform } from "../entities/Platform.js";
export class PlatformManager {
  constructor(){this.platforms=[];}
  reset(){
    const startPlatform=new Platform({x:155,y:735,width:170});
    this.platforms=[startPlatform];
    // 시작 발판 자체를 기준으로 다음 발판을 하나씩 생성한다.
    // 이전에는 y=665인 가상 발판에서 시작해 첫 간격에 70px이 추가되는 문제가 있었다.
    let previous=startPlatform;
    for(let i=0;i<12;i++){
      const platform=this.createAbove(previous,1);
      this.platforms.push(platform);
      previous=platform;
    }
  }
  createAbove(last,level){
    const d=DIFFICULTY[level-1];let gap=rand(d.gapMin,d.gapMax),width=rand(72,112);
    // 착지 높이에 도달할 때까지의 비행 시간과 이동 속도를 기준으로 수평 거리를 제한한다.
    // 특히 첫 점프는 플랫폼 폭을 고려해 중심 간 거리가 90px 안쪽이 되도록 보장한다.
    const jumpPower=650+(level-1)*15;
    const flightTime=(jumpPower+Math.sqrt(Math.max(0,jumpPower*jumpPower-2*1800*gap)))/1800;
    const reachable=Math.max(72,Math.min(145,flightTime*(220+(level-1)*12)*.78));
    const maxDx=level===1?Math.min(90,reachable):reachable;
    let x=Math.max(20,Math.min(460-width,last.x+rand(-maxDx,maxDx)));
    const roll=Math.random();let type=roll<d.breakChance?"breakable":roll<d.breakChance+d.movingChance?"moving":level>=6&&roll>.92?"vanishing":"normal";
    let item=null;const itemRoll=Math.random();if(itemRoll<.08)item="star";else if(itemRoll<.11)item="spring";else if(level>=4&&itemRoll<.125)item="wings";else if(level>=6&&itemRoll<.135)item="shield";
    return new Platform({x,y:last.y-gap,width,type,speed:type==="moving"?rand(35,65):0,item});
  }
  update(dt,level){this.platforms.forEach(p=>p.update(dt));this.platforms=this.platforms.filter(p=>p.y<GAME_HEIGHT+90&&p.active);let top=this.platforms.reduce((a,b)=>a.y<b.y?a:b);while(top.y>-80){top=this.createAbove(top,level);this.platforms.push(top);}}
  scroll(amount){this.platforms.forEach(p=>p.y+=amount);}
  render(ctx,debug=false){this.platforms.forEach(p=>{p.render(ctx);if(debug&&p.active){ctx.strokeStyle="#ffe14a";ctx.strokeRect(p.x,p.y,p.width,p.height);}});}
}
