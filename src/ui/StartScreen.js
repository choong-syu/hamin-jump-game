import { CHARACTER_LEVELS } from "../config.js";

export function showStart(overlay,best,preview,playerName="") {
  overlay.innerHTML=`<div class="card"><p class="eyebrow">12 ANIMAL ADVENTURES</p><h1>하민이의<br>점프 게임</h1><img class="preview" src="${preview}" alt="아기 토끼"><label class="name-field">모험가 이름<input id="playerName" maxlength="12" autocomplete="nickname" placeholder="이름을 입력해 주세요" value="${escapeHtml(playerName)}"></label><div class="button-row"><button class="primary" data-action="start">모험 시작</button><button class="secondary" data-action="codex">캐릭터 도감</button></div><p class="controls">← → / A D 이동 · P 일시정지 · M 음소거<br>12종의 동물 친구로 성장해 보세요</p><strong>최고 점수 ${best.toLocaleString()}</strong></div>`;
}

export function showCodex(overlay) {
  const entries=CHARACTER_LEVELS.map(level=>`<div class="codex-entry"><img src="assets/sprites/${level.spriteFolder}/idle.png" alt="${level.name}"><div>Lv.${level.level} ${level.name}</div><small>${level.scoreRequired.toLocaleString()}점</small></div>`).join("");
  overlay.innerHTML=`<div class="card codex-card"><p class="eyebrow">CHARACTER CODEX</p><h2>캐릭터 도감</h2><p>점수를 올려 새로운 동물 친구를 만나세요.</p><div class="codex-grid">${entries}</div><button class="primary" data-action="home">돌아가기</button></div>`;
}

function escapeHtml(value) {
  const node=document.createElement("div");node.textContent=value;return node.innerHTML;
}
