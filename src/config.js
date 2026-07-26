export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 800;
export const CAMERA_THRESHOLD = GAME_HEIGHT * 0.4;
export const PlayerState = Object.freeze({ IDLE:"idle", CROUCH:"crouch", JUMP:"jump", RISE:"rise", FALL:"fall", LANDING:"landing", DEAD:"dead" });
export const GameState = Object.freeze({ LOADING:"loading", START:"start", PLAYING:"playing", PAUSED:"paused", GAME_OVER:"gameOver" });
export const SPRITE_STATES = ["idle","jump","rise","fall","landing","crouch"];
export const PHYSICS = { gravity:1800, baseJumpPower:650, maxFallSpeed:950, horizontalAcceleration:1800, horizontalDeceleration:2200, maxHorizontalSpeed:300, airControl:.9 };
export const PLAYER_RENDER_SIZE = 82;
export const PLAYER_HITBOX = { offsetX:18, offsetY:14, width:46, height:64 };
export const GAME_DIFFICULTIES = Object.freeze({
  beginner:{id:"beginner",name:"초급",gapScale:.82,widthBonus:22,movingScale:.55,breakScale:.35,screenRiseSpeed:0,stallLimit:0},
  normal:{id:"normal",name:"중급",gapScale:1,widthBonus:0,movingScale:1,breakScale:1,screenRiseSpeed:0,stallLimit:0},
  advanced:{id:"advanced",name:"고급",gapScale:1.08,widthBonus:-10,movingScale:1.3,breakScale:1.35,screenRiseSpeed:14,stallLimit:5}
});
export const CHARACTER_LEVELS = [
  {level:1,name:"아기 토끼",scoreRequired:0,spriteFolder:"level1",moveSpeed:220,jumpPower:650,description:"작고 귀여운 첫 모험가"},
  {level:2,name:"토끼",scoreRequired:500,spriteFolder:"level2",moveSpeed:230,jumpPower:665,description:"빨간 목도리와 함께"},
  {level:3,name:"점프 토끼",scoreRequired:1200,spriteFolder:"level3",moveSpeed:240,jumpPower:680,description:"더 높이, 더 빠르게"},
  {level:4,name:"다람쥐",scoreRequired:2200,spriteFolder:"level4",moveSpeed:250,jumpPower:690,description:"민첩성이 증가했습니다!"},
  {level:5,name:"여우",scoreRequired:3500,spriteFolder:"level5",moveSpeed:265,jumpPower:700,description:"바람처럼 가볍게"},
  {level:6,name:"사자",scoreRequired:5200,spriteFolder:"level6",moveSpeed:275,jumpPower:715,description:"용기가 솟아납니다!"},
  {level:7,name:"호랑이",scoreRequired:7500,spriteFolder:"level7",moveSpeed:290,jumpPower:730,description:"정상을 향한 질주"},
  {level:8,name:"판다",scoreRequired:10500,spriteFolder:"level8",moveSpeed:300,jumpPower:750,description:"별빛을 따라 더 높이"},
  {level:9,name:"도마뱀",scoreRequired:14000,spriteFolder:"level9",moveSpeed:310,jumpPower:765,description:"재빠른 꼬리의 모험가"},
  {level:10,name:"사슴벌레",scoreRequired:18000,spriteFolder:"level10",moveSpeed:320,jumpPower:780,description:"단단한 뿔로 구름을 돌파"},
  {level:11,name:"장수풍뎅이",scoreRequired:22500,spriteFolder:"level11",moveSpeed:330,jumpPower:795,description:"힘차게 정상으로"},
  {level:12,name:"양",scoreRequired:28000,spriteFolder:"level12",moveSpeed:340,jumpPower:810,description:"포근한 별구름의 전설"}
];
export const DIFFICULTY = [
  {gapMin:65,gapMax:95,movingChance:0,breakChance:0},{gapMin:70,gapMax:100,movingChance:.05,breakChance:0},
  {gapMin:75,gapMax:105,movingChance:.12,breakChance:0},{gapMin:80,gapMax:110,movingChance:.18,breakChance:.08},
  {gapMin:85,gapMax:115,movingChance:.23,breakChance:.12},{gapMin:90,gapMax:120,movingChance:.28,breakChance:.16},
  {gapMin:95,gapMax:125,movingChance:.33,breakChance:.20},{gapMin:100,gapMax:130,movingChance:.38,breakChance:.24},
  {gapMin:102,gapMax:132,movingChance:.40,breakChance:.25},{gapMin:104,gapMax:134,movingChance:.42,breakChance:.26},
  {gapMin:106,gapMax:136,movingChance:.44,breakChance:.27},{gapMin:108,gapMax:138,movingChance:.46,breakChance:.28}
];
export const STORAGE_KEYS = { bestScore:"animalJump.bestScore", soundMuted:"animalJump.soundMuted", highestLevel:"animalJump.highestLevel", playerName:"animalJump.playerName", records:"animalJump.records", difficulty:"animalJump.difficulty" };
export const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
export const rand = (min,max) => min + Math.random() * (max-min);
export function getLevelForScore(score) { return CHARACTER_LEVELS.reduce((result,data) => score >= data.scoreRequired ? data : result, CHARACTER_LEVELS[0]); }
