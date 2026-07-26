import { CONSUMABLES, UPGRADES } from "../StoreCatalog.js";

const escapeHtml=value=>{const node=document.createElement("div");node.textContent=value;return node.innerHTML;};

export function showAuth(overlay,{message="",target=""}={}){
  overlay.classList.add("start-background");
  const form=(kind,title,description)=>`<section class="auth-form"><h2>${title}</h2><p>${description}</p><label class="name-field">모험가 이름<input id="${kind}Name" maxlength="12" autocomplete="username" placeholder="2~12자"></label><label class="name-field">비밀번호<input id="${kind}Password" type="password" maxlength="30" autocomplete="${kind==="login"?"current-password":"new-password"}" placeholder="4자 이상"></label><p class="form-message">${target===kind?escapeHtml(message):""}</p><button class="primary" data-action="${kind}">${title}</button></section>`;
  overlay.innerHTML=`<div class="card auth-card"><p class="eyebrow">HAMIN JUMP CLUB</p><h1>하민이의 점프 게임</h1><div class="auth-columns">${form("login","로그인","어느 기기에서든 내 계정을 불러와요.")}${form("signup","회원가입","새 모험가 계정을 만들어요.")}</div><small class="local-account-note">계정·코인·기록은 Vercel의 공용 데이터 서버에 안전하게 저장됩니다.</small></div>`;
}

export function showRecords(overlay,account,leaderboard=[]){
  const rows=account.records.slice(0,10).map((record,index)=>`<li><strong>${index+1}</strong><span>Lv.${record.level} · ${new Date(record.date).toLocaleDateString("ko-KR")}</span><strong>${record.score.toLocaleString()}</strong></li>`).join("");
  const globalRows=leaderboard.map((record,index)=>`<li><strong>${index+1}</strong><span>${escapeHtml(record.username)}</span><strong>${record.score.toLocaleString()}</strong></li>`).join("");
  panel(overlay,"나의 기록",`<div class="profile-summary"><span>최고 점수</span><strong>${account.bestScore.toLocaleString()}</strong></div><h3>내 기록</h3><ol class="record-list">${rows||"<li class='empty-row'>아직 기록이 없습니다.</li>"}</ol><h3>전체 랭킹</h3><ol class="record-list">${globalRows||"<li class='empty-row'>첫 번째 기록의 주인공이 되어보세요!</li>"}</ol>`);
}

export function showWallet(overlay,account){
  const items=CONSUMABLES.map(item=>`<li><span>${item.icon} ${item.name}</span><strong>${account.inventory[item.id]||0}개</strong></li>`).join("");
  panel(overlay,"내 지갑",`<div class="coin-balance">🪙 ${account.coins.toLocaleString()} 코인</div><h3>보유 아이템</h3><ul class="wallet-list">${items}</ul><p class="panel-help">게임에서 얻은 점수가 코인으로 쌓입니다.</p>`);
}

export function showStore(overlay,account,message=""){
  const upgrades=UPGRADES.map(item=>{
    const level=account.upgrades[item.id]||0,maxed=level>=item.maxLevel,cost=maxed?0:item.costs[level];
    return `<article class="shop-item"><div class="shop-icon">${item.icon}</div><div><strong>${item.name}</strong><small>${item.description}<br>Lv.${level}/${item.maxLevel}</small></div><button data-action="buyUpgrade" data-id="${item.id}" ${maxed||account.coins<cost?"disabled":""}>${maxed?"완료":`${cost.toLocaleString()} 🪙`}</button></article>`;
  }).join("");
  const consumables=CONSUMABLES.map(item=>`<article class="shop-item"><div class="shop-icon">${item.icon}</div><div><strong>${item.name}</strong><small>${item.description}<br>보유 ${account.inventory[item.id]||0}개</small></div><button data-action="buyItem" data-id="${item.id}" ${account.coins<item.cost?"disabled":""}>${item.cost.toLocaleString()} 🪙</button></article>`).join("");
  panel(overlay,"코인 스토어",`<div class="coin-balance">🪙 ${account.coins.toLocaleString()} 코인</div><p class="form-message">${escapeHtml(message)}</p><h3>영구 능력 강화</h3><div class="shop-list">${upgrades}</div><h3>한 게임용 아이템</h3><div class="shop-list">${consumables}</div>`,`store-card`);
}

function panel(overlay,title,body,extra=""){
  overlay.classList.remove("start-background");
  overlay.innerHTML=`<div class="card profile-card ${extra}"><p class="eyebrow">MY ADVENTURE</p><h2>${title}</h2>${body}<button class="primary" data-action="closePanel">돌아가기</button></div>`;
}
