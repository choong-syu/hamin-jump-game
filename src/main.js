import { Game } from "./Game.js";

const canvas=document.querySelector("#game");
const game=new Game(canvas,document.querySelector("#overlay"));
document.querySelector("#pauseButton").addEventListener("click",()=>game.action("pause"));
document.querySelector("#muteButton").addEventListener("click",()=>game.action("mute"));

function resizeCanvasDisplay() {
  const scale=Math.min(innerWidth/480,innerHeight/800);
  canvas.parentElement.style.width=`${480*scale}px`;
  canvas.parentElement.style.height=`${800*scale}px`;
}
addEventListener("resize",resizeCanvasDisplay);
resizeCanvasDisplay();
game.init().catch(error=>{console.error(error);document.querySelector("#overlay").innerHTML='<div class="card"><h2>게임을 준비하지 못했어요</h2><p>페이지를 새로고침해 주세요.</p></div>';});
