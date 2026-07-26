export function showGameOver(overlay,score,best,level,playerName,records,reason="구름 아래로\n살포시 착지!",racePlayers=[]) {
  overlay.classList.remove("start-background");
  const rows=records.slice(0,5).map((record,index)=>`<li><strong>${index+1}</strong><span>${escapeHtml(record.name)} · Lv.${record.level}</span><strong>${record.score.toLocaleString()}</strong></li>`).join("");
  const raceRows=[...racePlayers].sort((a,b)=>b.score-a.score).map((player,index)=>`<li><strong>${index+1}</strong><span>${escapeHtml(player.name)} · Lv.${player.level}</span><strong>${player.score.toLocaleString()}</strong></li>`).join("");
  const reasonHtml=reason.split("\n").map(escapeHtml).join("<br>");
  overlay.innerHTML=`<div class="card"><p class="eyebrow">${escapeHtml(playerName)}의 모험 기록</p><h2>${reasonHtml}</h2><p>이번 점수 <strong>${score.toLocaleString()}</strong><br>도달 레벨 <strong>Lv.${level.level} ${level.name}</strong><br>최고 점수 <strong>${best.toLocaleString()}</strong></p><h3>${raceRows?"레이스 순위":"기록 TOP 5"}</h3><ol class="record-list">${raceRows||rows}</ol><div class="button-row"><button class="primary" data-action="restart">${raceRows?"레이스 나가기":"다시 뛰기"}</button><button class="secondary" data-action="home">처음 화면</button></div></div>`;
}

function escapeHtml(value) {
  const node=document.createElement("div");node.textContent=value;return node.innerHTML;
}
