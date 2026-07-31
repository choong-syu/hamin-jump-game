import { CHARACTER_LEVELS } from "../config.js";

export function showStart(overlay,best,preview,account,difficulty="normal") {
  overlay.classList.add("start-background");
  const option=(id,name)=>`<label><input type="radio" name="difficulty" value="${id}" ${difficulty===id?"checked":""}><span>${name}</span></label>`;
  overlay.innerHTML=`<div class="card"><p class="eyebrow">12 ANIMAL ADVENTURES</p><h1>하민이의<br>점프 게임</h1><img class="preview" src="${preview}" alt="아기 토끼"><div class="account-chip"><span>👤 ${escapeHtml(account.username)}</span><strong>🪙 ${account.coins.toLocaleString()}</strong><button data-action="logout">로그아웃</button></div><fieldset class="difficulty-field"><span>게임 난이도</span><div class="difficulty-options">${option("beginner","초급")}${option("normal","중급")}${option("advanced","고급")}</div></fieldset><div class="button-row"><button class="primary" data-action="start">혼자 시작</button><button class="secondary" data-action="codex">캐릭터 도감</button></div><button class="secondary race-button" data-action="race">친구와 실시간 레이스</button><p class="controls">← → / A D 이동 · P 일시정지 · M 음소거<br>점수가 그대로 내 코인이 됩니다!</p><strong>최고 점수 ${best.toLocaleString()}</strong></div>`;
}

export function showCodex(overlay) {
  overlay.classList.remove("start-background");
  const entries=CHARACTER_LEVELS.map(level=>`<div class="codex-entry"><img src="assets/sprites/${level.spriteFolder}/idle.png" alt="${level.name}"><div>Lv.${level.level} ${level.name}</div><small>${level.scoreRequired.toLocaleString()}점</small></div>`).join("");
  overlay.innerHTML=`<div class="card codex-card"><p class="eyebrow">CHARACTER CODEX</p><h2>캐릭터 도감</h2><p>점수를 올려 새로운 동물 친구를 만나세요.</p><div class="codex-grid">${entries}</div><button class="primary" data-action="home">돌아가기</button></div>`;
}

function escapeHtml(value) {
  const node=document.createElement("div");node.textContent=value;return node.innerHTML;
}

export function showRaceLobby(overlay,{mode="menu",code="",players=[],rooms=[],isHost=false,difficulty="normal",status=""}={}) {
  overlay.classList.remove("start-background");
  const list=players.map((player,index)=>`<li><span>${index===0?"👑 ":""}${escapeHtml(player.name)}</span><span>${player.ready===false?"연결 중":"준비"}</span></li>`).join("");
  const difficultyName={beginner:"초급",normal:"중급",advanced:"고급"}[difficulty]||"중급";
  const raceDifficulty=isHost
    ? `<fieldset class="difficulty-field race-difficulty"><span>레이스 난이도</span><div class="difficulty-options">${["beginner","normal","advanced"].map((id,index)=>`<label><input type="radio" name="raceDifficulty" value="${id}" data-action="raceDifficulty" ${difficulty===id?"checked":""}><span>${["초급","중급","고급"][index]}</span></label>`).join("")}</div></fieldset>`
    : `<p class="race-difficulty-label">레이스 난이도 <strong>${difficultyName}</strong></p>`;
  const menuDifficulty=`<fieldset class="difficulty-field race-difficulty"><span>방 난이도 선택</span><div class="difficulty-options">${["beginner","normal","advanced"].map((id,index)=>`<label><input type="radio" name="raceDifficulty" value="${id}" data-action="raceDifficulty" ${difficulty===id?"checked":""}><span>${["초급","중급","고급"][index]}</span></label>`).join("")}</div></fieldset>`;
  const roomRows=rooms.map(room=>`<li class="public-room"><div><strong>${escapeHtml(room.hostName)}의 방</strong><small>${({beginner:"초급",normal:"중급",advanced:"고급"}[room.difficulty]||"중급")} · ${room.playerCount}/4명 · ${escapeHtml(room.code)}</small></div><button class="secondary" data-action="joinPublicRace" data-id="${escapeHtml(room.code)}">참가</button></li>`).join("");
  const publicRooms=`<div class="public-room-heading"><strong>참가 가능한 공개 방</strong><button class="mini-button" data-action="refreshRaces">새로고침</button></div><ul class="public-room-list">${roomRows||"<li class=\"empty-room\">현재 열린 방이 없습니다.<br>새 방을 만들어 친구를 기다려 보세요.</li>"}</ul>`;
  const body=mode==="menu"
    ? `<p>난이도를 고르고 공개 방을 만들거나, 아래 방에 바로 참가하세요.</p>${menuDifficulty}<p class="race-status">${escapeHtml(status)}</p><button class="primary" data-action="createRace">선택한 난이도로 방 만들기</button>${publicRooms}<div class="race-join"><input id="roomCode" maxlength="6" placeholder="6자리 방 코드" aria-label="방 코드"><button class="secondary" data-action="joinRace">코드 참가</button></div>`
    : `<p>방 코드</p><div class="room-code">${escapeHtml(code)}</div>${raceDifficulty}<p class="race-status">${escapeHtml(status||"친구를 기다리는 중…")}</p><ul class="race-players">${list}</ul>${isHost?`<button class="primary" data-action="startRace" ${players.length<2?"disabled":""}>${players.length<2?"친구를 기다리는 중":"모두 함께 시작"}</button>`:"<p><strong>방장이 시작하기를 기다리고 있어요.</strong></p>"}`;
  overlay.innerHTML=`<div class="card race-card"><p class="eyebrow">REAL-TIME RACE</p><h2>친구와 레이스</h2>${body}<button class="secondary" data-action="raceBack">나가기</button></div>`;
}
