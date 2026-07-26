import { CONSUMABLES, UPGRADES } from "../StoreCatalog.js";

const escapeHtml=value=>{const node=document.createElement("div");node.textContent=value;return node.innerHTML;};

export function showAuth(overlay,{hasAccounts=false,mode="login",message=""}={}){
  overlay.classList.add("start-background");
  const login=mode==="login"&&hasAccounts;
  overlay.innerHTML=`<div class="card auth-card"><p class="eyebrow">HAMIN JUMP CLUB</p><h1>${login?"로그인":"회원가입"}</h1><p>${login?"내 모험 기록과 지갑을 불러와요.":"나만의 모험가 계정을 만들어요."}</p><label class="name-field">모험가 이름<input id="authName" maxlength="12" autocomplete="username" placeholder="2~12자"></label><label class="name-field">비밀번호<input id="authPassword" type="password" maxlength="30" autocomplete="${login?"current-password":"new-password"}" placeholder="4자 이상"></label><p class="form-message">${escapeHtml(message)}</p><button class="primary" data-action="${login?"login":"signup"}">${login?"로그인":"계정 만들기"}</button>${hasAccounts?`<button class="secondary" data-action="${login?"showSignup":"showLogin"}">${login?"새 계정 만들기":"기존 계정 로그인"}</button>`:""}<small class="local-account-note">계정과 비밀번호 정보는 현재 브라우저에만 저장됩니다.</small></div>`;
}

export function showRecords(overlay,account){
  const rows=account.records.slice(0,10).map((record,index)=>`<li><strong>${index+1}</strong><span>Lv.${record.level} · ${new Date(record.date).toLocaleDateString("ko-KR")}</span><strong>${record.score.toLocaleString()}</strong></li>`).join("");
  panel(overlay,"나의 기록",`<div class="profile-summary"><span>최고 점수</span><strong>${account.bestScore.toLocaleString()}</strong></div><ol class="record-list">${rows||"<li class='empty-row'>아직 기록이 없습니다.</li>"}</ol>`);
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
