import { CHARACTER_LEVELS, clamp } from "../config.js";
export function drawHUD(ctx,score,best,levelData) {
  ctx.save();ctx.fillStyle="#112c42bb";ctx.fillRect(10,10,460,72);ctx.fillStyle="#fff";ctx.textAlign="left";ctx.font="700 10px sans-serif";ctx.fillText("SCORE",23,29);ctx.font="900 22px sans-serif";ctx.fillText(score.toLocaleString(),22,54);
  ctx.textAlign="center";ctx.font="900 16px sans-serif";ctx.fillText(`Lv.${levelData.level} ${levelData.name}`,240,38);
  ctx.textAlign="right";ctx.font="700 10px sans-serif";ctx.fillText("BEST",455,29);ctx.font="900 22px sans-serif";ctx.fillText(best.toLocaleString(),455,54);
  const next=CHARACTER_LEVELS[levelData.level];ctx.fillStyle="#ffffff2b";ctx.fillRect(95,62,290,7);ctx.fillStyle="#ffd05c";ctx.fillRect(95,62,290*(next?clamp((score-levelData.scoreRequired)/(next.scoreRequired-levelData.scoreRequired),0,1):1),7);
  ctx.textAlign="center";ctx.font="700 9px sans-serif";ctx.fillStyle="#fff";ctx.fillText(next?`다음 성장까지 ${Math.max(0,next.scoreRequired-score).toLocaleString()}`:"MAX LEVEL",240,78);ctx.restore();
}
