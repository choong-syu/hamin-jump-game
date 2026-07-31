import { DIFFICULTY, GAME_DIFFICULTIES, GAME_HEIGHT } from "../config.js";
import { Platform } from "../entities/Platform.js";
export class PlatformManager {
  constructor(){this.platforms=[];this.seed=1;}
  reset(mode="normal",seed=null){
    this.seed=seed||Math.floor(Math.random()*2147483646)+1;
    const startPlatform=new Platform({x:155,y:735,width:170,phase:0});
    this.platforms=[startPlatform];
    // 시작 발판 자체를 기준으로 다음 발판을 하나씩 생성한다.
    // 이전에는 y=665인 가상 발판에서 시작해 첫 간격에 70px이 추가되는 문제가 있었다.
    let previous=startPlatform;
    for(let i=0;i<12;i++){
      const platform=this.createAbove(previous,1,mode);
      this.platforms.push(platform);
      previous=platform;
    }
  }
  createAbove(last,level,mode="normal"){
    const d=DIFFICULTY[level-1],modifier=GAME_DIFFICULTIES[mode]||GAME_DIFFICULTIES.normal;
    let gap=this.range(d.gapMin*modifier.gapScale,d.gapMax*modifier.gapScale);
    let width=this.range(72+modifier.widthBonus,112+modifier.widthBonus);
    // 착지 높이에 도달할 때까지의 비행 시간과 이동 속도를 기준으로 수평 거리를 제한한다.
    // 특히 첫 점프는 플랫폼 폭을 고려해 중심 간 거리가 90px 안쪽이 되도록 보장한다.
    const jumpPower=650+(level-1)*15;
    const flightTime=(jumpPower+Math.sqrt(Math.max(0,jumpPower*jumpPower-2*1800*gap)))/1800;
    const reachable=Math.max(72,Math.min(145,flightTime*(220+(level-1)*12)*.78));
    const maxDx=level===1?Math.min(90,reachable):reachable;
    let x=Math.max(20,Math.min(460-width,last.x+this.range(-maxDx,maxDx)));
    const motionScale=mode==="advanced"?1.2:mode==="beginner"?.68:1;
    const options=[];
    const add=(minimum,chance,type)=>{if(level>=minimum)options.push({chance,type});};
    add(12,.03,"rainbow");add(10,.035,"rocket");add(9,.045,"pulse");add(8,.05,"ice");add(7,.04,"cloud");add(6,.04,"vanishing");add(5,.05,"conveyor");
    add(2,Math.min(.10,.045+level*.004)*motionScale,"tilted");
    add(3,Math.min(.12,.04+level*.006)*motionScale,"vertical");
    add(5,Math.min(.11,.03+level*.006)*motionScale,"rotating");
    add(4,Math.min(.16,d.breakChance*modifier.breakScale),"breakable");
    add(3,Math.min(.20,d.movingChance*modifier.movingScale),"moving");
    const total=options.reduce((sum,option)=>sum+option.chance,0),chanceScale=Math.min(1,.9/Math.max(.01,total));
    const roll=this.random();let cursor=0,type="normal";
    for(const option of options){cursor+=option.chance*chanceScale;if(roll<cursor){type=option.type;break;}}
    // 타이밍이 겹치면 불가능해질 수 있는 동적 발판은 같은 종류로 연속 생성하지 않는다.
    if(["vanishing","vertical","rotating"].includes(type)&&last.type===type)type="normal";
    // 레벨이 높아질수록 안정적인 발판 중 일부가 매우 작아진다.
    // 이미 움직임 자체가 어려운 발판에는 중첩하지 않아 불가능한 조합을 피한다.
    const tinyEligible=["normal","tilted","breakable","conveyor","ice","pulse"].includes(type);
    const tinyModeScale=mode==="advanced"?1.25:mode==="beginner"?.6:1;
    const tinyChance=level>=4?Math.min(.24,.04+(level-4)*.025)*tinyModeScale:0;
    if(tinyEligible&&this.random()<tinyChance){
      const center=x+width/2,tinyMax=Math.max(36,56-(level-4)*2.5),tinyMin=Math.max(26,tinyMax-10);
      width=this.range(tinyMin,tinyMax);x=Math.max(20,Math.min(460-width,center-width/2));
    }
    let item=null;const itemRoll=this.random();if(itemRoll<.07)item="star";else if(itemRoll<.10)item="spring";else if(level>=4&&itemRoll<.12)item="wings";else if(level>=6&&itemRoll<.135)item="shield";else if(level>=7&&itemRoll<.15)item="gem";else if(level>=8&&itemRoll<.163)item="feather";
    const speedMode=mode==="advanced"?1.15:mode==="beginner"?.85:1;
    const movingSpeed=type==="moving"?(28+level*6+this.range(0,18))*speedMode:0;
    const tiltDegrees=5+Math.min(10,level*.75),rotationDegrees=8+Math.min(10,level*.8);
    const angle=(type==="tilted"?(this.random()<.5?-1:1)*tiltDegrees:type==="rotating"?rotationDegrees:0)*Math.PI/180;
    return new Platform({
      x,y:last.y-gap,width,type,speed:movingSpeed,direction:this.random()<.5?-1:1,item,phase:this.range(0,6),angle,
      rotationSpeed:type==="rotating"?(0.65+level*.09)*speedMode:0,
      verticalAmplitude:type==="vertical"?12+Math.min(15,level*1.2):0,
      verticalSpeed:type==="vertical"?(0.85+level*.08)*speedMode:0
    });
  }
  update(dt,level,mode="normal"){this.platforms.forEach(p=>p.update(dt));this.platforms=this.platforms.filter(p=>p.y<GAME_HEIGHT+90&&p.active);let top=this.platforms.reduce((a,b)=>a.y<b.y?a:b);while(top.y>-80){top=this.createAbove(top,level,mode);this.platforms.push(top);}}
  scroll(amount){this.platforms.forEach(p=>p.scroll(amount));}
  render(ctx,debug=false){this.platforms.forEach(p=>{p.render(ctx);if(debug&&p.active){ctx.strokeStyle="#ffe14a";ctx.beginPath();ctx.moveTo(p.x,p.getSurfaceY(p.x));ctx.lineTo(p.x+p.width,p.getSurfaceY(p.x+p.width));ctx.stroke();}});}
  random(){this.seed=this.seed*16807%2147483647;return(this.seed-1)/2147483646;}
  range(min,max){return min+this.random()*(max-min);}
}
