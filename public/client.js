const socket = io();

// DOM 요소 
const screens = {
    login: document.getElementById('screen-login'),
    lobby: document.getElementById('screen-lobby'),
    waiting: document.getElementById('screen-waiting'),
    game: document.getElementById('screen-game')
};

function showScreen(screenId) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[screenId].classList.remove('hidden');
}

let myName = '';
let myRole = '';
let currentRoomId = null;
let amIHost = false;

// 1. 로그인
document.getElementById('nickname-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-login').click();
});

document.getElementById('btn-login').addEventListener('click', () => {
    const input = document.getElementById('nickname-input');
    if (input.value.trim().length > 0) {
        socket.emit('login', input.value.trim());
    } else {
        alert("닉네임을 입력하세요");
    }
});

socket.on('login_fail', (msg) => {
    alert(msg);
});

socket.on('login_success', (name) => {
    myName = name;
    showScreen('lobby');
    screens.login.classList.add('hidden');
    // 로비 접속 후 방정보 가져오기
    socket.emit('get_rooms');
});

// 2. 로비
document.getElementById('btn-create-room').addEventListener('click', () => {
    const roomId = 'room_' + Math.floor(Math.random() * 10000);
    showModal('방 만들기', '생성할 방의 이름을 입력하세요.', true, (val) => {
        let rName = val.trim();
        if (!rName) rName = `${myName}의 방`;
        joinRoom(roomId, rName);
    });
});

socket.on('room_list', (list) => {
    if (!screens.lobby.classList.contains('hidden')) {
        const listEl = document.getElementById('room-list');
        listEl.innerHTML = '';
        if (list.length === 0) {
            listEl.innerHTML = '<p class="text-slate-500">생성된 방이 없습니다.</p>';
        }
        list.forEach(r => {
            const btn = document.createElement('button');
            btn.className = 'w-full text-left p-4 bg-slate-50 border hover:border-indigo-500 rounded-xl flex justify-between items-center transition-colors shadow-sm';
            btn.innerHTML = `<span class="font-bold text-lg">${r.name || r.id}</span>
                       <span class="text-sm bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">${r.state === 'lobby' ? '대기중' : '게임중'} (${r.playerCount}/10)</span>`;
            btn.onclick = () => { joinRoom(r.id); };
            listEl.appendChild(btn);
        });
    }
});

// 주기적 로비 업데이트
setInterval(() => {
    if (!screens.lobby.classList.contains('hidden')) {
        socket.emit('get_rooms');
    }
}, 3000);

function joinRoom(id, rName) {
    socket.emit('join_room', { roomId: id, name: myName, roomName: rName });
    clearChat();
    document.getElementById('chat-container').classList.remove('hidden');
}

// 3. 대기방 & 룸 업데이트
socket.on('room_update', (room) => {
    currentRoomId = room.id;
    document.getElementById('waiting-room-id').innerText = room.name || room.id;
    amIHost = room.host === socket.id;

    if (room.state === 'lobby') {
        showScreen('waiting');

        // 플레이어 목록 렌더링
        const pContainer = document.getElementById('waiting-players');
        pContainer.innerHTML = '';
        room.players.forEach(p => {
            pContainer.innerHTML += `<div class="bg-slate-100 p-4 rounded-xl text-center border-2 border-slate-200 shadow-sm ${p.id === room.host ? 'border-indigo-500 bg-indigo-50' : ''}">
        <div class="font-bold text-sm truncate">${p.name}</div>
        <div class="text-xs text-indigo-500 mt-1">${p.id === room.host ? '👑방장' : '주민'}</div>
      </div>`;
        });

        const btnStart = document.getElementById('btn-start-game');
        if (amIHost) btnStart.classList.remove('hidden');
        else btnStart.classList.add('hidden');
    } else if (room.state === 'game_over') {
        if (lastGameOverData) {
            lastGameOverData.hostId = room.host;
            lastGameOverData.players = room.players;
            renderGameOverModal(room.players, room.host);
        }
    }
});

document.getElementById('btn-start-game').addEventListener('click', () => {
    socket.emit('start_game');
});

document.getElementById('btn-leave-room').addEventListener('click', () => {
    socket.emit('leave_room');
    showScreen('lobby');
    socket.emit('get_rooms');
    document.getElementById('chat-container').classList.add('hidden');
});

socket.on('error', (msg) => {
    hideModal(); // 혹시 열려있던 점수결과 창 등을 닫음
    showModal('알림', msg, false);
    document.getElementById('modal-close-btn').classList.remove('hidden');
});

// 4. 게임 화면 제어
socket.on('role_assign', ({ isMafia, keyword, round, categoryName }) => {
    showScreen('game');
    myRole = isMafia ? '마피아' : '시민';
    document.getElementById('my-role').innerText = isMafia ? '마피아' : '시민';
    document.getElementById('my-keyword').innerText = keyword;
    document.getElementById('game-round').innerText = `라운드 ${round} / 3 - [${categoryName}]`;
    document.getElementById('game-status').innerText = '곧 시작합니다...';
});

let isMyTurn = false;
let currentPhase = 'wait';
let currentPainterId = null;
let drawingHistory = [];

socket.on('category_select_start', ({ hostId, categories }) => {
    if (socket.id === hostId) {
        showModal('주제 선택', '이번 라운드의 게임 주제를 선택하세요.', false);

        const catArea = document.getElementById('modal-category-area');
        catArea.innerHTML = '';
        catArea.classList.remove('hidden');

        categories.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'bg-slate-100 hover:bg-slate-200 py-3 rounded-lg font-bold border-2 border-slate-200 hover:border-indigo-400 transition-colors';
            btn.innerText = c;
            btn.onclick = () => {
                catArea.classList.add('hidden');
                hideModal();
                socket.emit('select_category', c);
            };
            catArea.appendChild(btn);
        });
    } else {
        showModal('주제 선택', '방장이 게임 주제를 선택하고 있습니다...', false);
        document.getElementById('modal-category-area').classList.add('hidden');
    }
});

socket.on('round_start', ({ round, order }) => {
    drawingHistory = [];
    window.roundOrder = order;
    document.getElementById('drawing-tools').classList.remove('hidden');
    document.getElementById('voting-controls').classList.add('hidden');

    showModal('라운드 시작', '제시어와 역할을 확인하세요!', false);
    setTimeout(hideModal, 3000);

    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 시스템 플레이어 목록 렌더링 로직 (점수 포함)
    const pList = document.getElementById('game-players');
    pList.innerHTML = '';
    order.forEach(p => {
        const isMe = (p.id === socket.id);
        pList.innerHTML += `<div id="player-${p.id}" class="bg-white p-3 rounded-lg border flex justify-between items-center transition-all cursor-pointer">
      <span class="font-bold">${p.name} ${isMe ? '<span class="text-indigo-500 text-sm">(나)</span>' : ''}</span>
      <span class="text-sm font-bold text-slate-600">${p.score || 0}점</span>
    </div>`;
    });

    const gList = document.getElementById('global-players');
    if (gList) {
        gList.innerHTML = '';
        const sortedPlayers = [...order].sort((a, b) => (b.globalScore || 0) - (a.globalScore || 0));
        sortedPlayers.forEach(p => {
            const isMe = (p.id === socket.id);
            gList.innerHTML += `<div class="bg-indigo-100 p-3 rounded-lg border border-indigo-200 flex justify-between items-center shadow-sm">
          <span class="font-bold">${p.name} ${isMe ? '<span class="text-indigo-500 text-sm">(나)</span>' : ''}</span>
          <span class="text-sm font-bold text-indigo-600">🏆 ${p.globalScore || 0}승</span>
        </div>`;
        });
    }
});

socket.on('turn_announce', ({ painterId, painterName }) => {
    currentPainterId = null;
    currentPhase = 'wait';
    isMyTurn = false;

    const overlay = document.getElementById('turn-announce-overlay');
    const card = document.getElementById('turn-announce-card');
    const labelEl = document.getElementById('turn-announce-label');
    const nameEl = document.getElementById('turn-announce-name');
    
    overlay.classList.remove('hidden');
    void overlay.offsetWidth; // Reflow for transition
    card.classList.replace('scale-50', 'scale-100');
    overlay.classList.replace('opacity-0', 'opacity-100');
    
    if (painterId === socket.id) {
        labelEl.innerText = '당신의 차례입니다!';
        labelEl.className = 'text-xl font-bold text-emerald-500';
        nameEl.innerText = '준비하세요!';
        nameEl.className = 'text-5xl font-black text-emerald-500 p-2 animate-bounce';
        card.classList.add('border-emerald-400');
        card.classList.remove('border-transparent');
    } else {
        labelEl.innerText = '다음 차례';
        labelEl.className = 'text-lg font-bold text-slate-500';
        nameEl.innerText = `${painterName}`;
        nameEl.className = 'text-4xl font-black text-indigo-600 p-2';
        card.classList.remove('border-emerald-400');
        card.classList.add('border-transparent');
    }
});

socket.on('turn_start', ({ painterId, painterName, timeLeft }) => {
    const overlay = document.getElementById('turn-announce-overlay');
    const card = document.getElementById('turn-announce-card');
    card.classList.replace('scale-100', 'scale-50');
    overlay.classList.replace('opacity-100', 'opacity-0');
    setTimeout(() => overlay.classList.add('hidden'), 300);

    isMyTurn = (painterId === socket.id);
    currentPhase = 'draw';
    currentPainterId = painterId;

    document.getElementById('game-status').innerText = `${painterName}의 턴`;
    updateTimer(timeLeft);

    // 현재 그리는 사람 시각적 표시
    document.querySelectorAll('#game-players > div').forEach(el => {
        el.classList.remove('border-indigo-500', 'bg-indigo-50', 'shadow-md');
    });
    const currentEl = document.getElementById(`player-${painterId}`);
    if (currentEl) currentEl.classList.add('border-indigo-500', 'bg-indigo-50', 'shadow-md');

    if (!isMyTurn) {
        document.getElementById('canvas-overlay').innerText = `${painterName} 그리는 중...`;
        document.getElementById('canvas-overlay').classList.remove('hidden');
    } else {
        document.getElementById('canvas-overlay').classList.add('hidden');
    }
});

socket.on('turn_end', () => {
    isMyTurn = false;
    document.getElementById('canvas-overlay').classList.add('hidden');
    clearInterval(timerInt);

    if (isEraser) {
        isEraser = false;
        const btn = document.getElementById('btn-eraser');
        btn.innerText = '지우개';
        btn.className = 'text-sm bg-slate-200 hover:bg-slate-300 px-3 py-1 rounded text-slate-700';
        document.getElementById('eraser-sizes').style.display = 'none';
    }
});

let timerInt = null;
function updateTimer(seconds) {
    let s = seconds;
    document.getElementById('game-timer').innerText = s;
    clearInterval(timerInt);
    timerInt = setInterval(() => {
        s--;
        if (s >= 0) document.getElementById('game-timer').innerText = s;
    }, 1000);
}

// 캔버스 드로잉 시작
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

let isDrawing = false;
let lastX = 0; let lastY = 0;

function getCoord(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    }
}

function startDraw(e) {
    if (!isMyTurn || currentPhase !== 'draw') return;
    isDrawing = true;
    const pos = getCoord(e);
    lastX = pos.x; lastY = pos.y;
}

function draw(e) {
    if (!isDrawing || !isMyTurn || currentPhase !== 'draw') return;
    e.preventDefault();
    const pos = getCoord(e);

    const color = isEraser ? 'erase' : document.getElementById('color-picker').value;
    const size = isEraser ? eraserSize : document.getElementById('size-picker').value;

    drawLine(lastX, lastY, pos.x, pos.y, color, size);

    const dataObj = { x0: lastX, y0: lastY, x1: pos.x, y1: pos.y, color, size, painterId: currentPainterId };
    drawingHistory.push(dataObj);
    // 서버에 전송
    socket.emit('draw', dataObj);

    lastX = pos.x; lastY = pos.y;
}

function endDraw() {
    if (isDrawing) {
        isDrawing = false;
    }
}

canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
window.addEventListener('mouseup', endDraw);
canvas.addEventListener('touchstart', startDraw, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
window.addEventListener('touchend', endDraw);

let isEraser = false;
let eraserSize = 15;
const eraserUI = {
    sm: document.getElementById('eraser-sm'),
    md: document.getElementById('eraser-md'),
    lg: document.getElementById('eraser-lg')
};

function updateEraserUI(activeBtn) {
    Object.values(eraserUI).forEach(btn => {
        btn.classList.remove('bg-indigo-400', 'border-2', 'border-indigo-600');
        btn.classList.add('bg-slate-300', 'hover:bg-slate-400');
    });
    activeBtn.classList.remove('bg-slate-300', 'hover:bg-slate-400');
    activeBtn.classList.add('bg-indigo-400', 'border-2', 'border-indigo-600');
}

eraserUI.sm.addEventListener('click', () => { eraserSize = 5; updateEraserUI(eraserUI.sm); });
eraserUI.md.addEventListener('click', () => { eraserSize = 15; updateEraserUI(eraserUI.md); });
eraserUI.lg.addEventListener('click', () => { eraserSize = 30; updateEraserUI(eraserUI.lg); });

document.getElementById('btn-eraser').addEventListener('click', (e) => {
    isEraser = !isEraser;
    e.target.innerText = isEraser ? '펜 쓰기' : '지우개';
    e.target.className = isEraser ? 'text-sm bg-indigo-500 text-white px-3 py-1 rounded' : 'text-sm bg-slate-200 hover:bg-slate-300 px-3 py-1 rounded text-slate-700';
    if (isEraser) {
        document.getElementById('eraser-sizes').style.display = 'flex';
    } else {
        document.getElementById('eraser-sizes').style.display = 'none';
    }
});

function drawLine(x0, y0, x1, y1, color, size) {
    if (color === 'erase') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
    }
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineWidth = size;
    ctx.stroke();
    ctx.closePath();
}

socket.on('draw', (data) => {
    drawingHistory.push(data);
    drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.size);
});

socket.on('clear_canvas', () => {
    drawingHistory.push({ type: 'clear' });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

window.redrawCanvas = function (filterPainterId) {
    const btns = document.querySelectorAll('#voting-player-buttons button');
    btns.forEach(btn => {
        const btnId = btn.getAttribute('data-id');
        if (btnId === String(filterPainterId || '')) {
            btn.className = "text-sm bg-indigo-600 text-white px-3 py-1 rounded shadow-sm hover:bg-indigo-700 transition-colors";
        } else {
            btn.className = "text-sm bg-white hover:bg-slate-200 text-slate-700 px-3 py-1 border border-slate-300 rounded shadow-sm transition-colors";
        }
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const data of drawingHistory) {
        if (data.type === 'clear') {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        } else {
            if (!filterPainterId || data.painterId === filterPainterId) {
                drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.size);
            }
        }
    }
};

// 5. 투표
socket.on('voting_start', ({ timeLeft }) => {
    currentPhase = 'vote';
    document.getElementById('game-status').innerText = '투표 시간!';
    updateTimer(timeLeft);
    document.getElementById('canvas-overlay').innerText = '마피아 검거 중..';
    document.getElementById('canvas-overlay').classList.remove('hidden');

    document.getElementById('drawing-tools').classList.add('hidden');
    document.getElementById('voting-controls').classList.remove('hidden');
    const vpButtons = document.getElementById('voting-player-buttons');
    vpButtons.innerHTML = `<button data-id="" class="text-sm bg-indigo-600 text-white px-3 py-1 rounded shadow-sm hover:bg-indigo-700 transition-colors" onclick="redrawCanvas(null)">전체 보기</button>`;
    if (window.roundOrder) {
        window.roundOrder.forEach(p => {
            vpButtons.innerHTML += `<button data-id="${p.id}" class="text-sm bg-white hover:bg-slate-200 text-slate-700 px-3 py-1 border border-slate-300 rounded shadow-sm transition-colors" onclick="redrawCanvas('${p.id}')">${p.name}</button>`;
        });
    }

    if (myRole === '마피아') {
        showModal('투표 시작', '마피아를 잡아내세요! (단, 마피아는 투표할 권한이 없습니다.)', false);
    } else {
        showModal('투표 시작', '좌측 목록에서 마피아로 의심되는 사람을 클릭하세요!', false);
    }

    setTimeout(hideModal, 2000);

    // 플레이어 이름 클릭시 투표되도록 이벤트 추가
    document.querySelectorAll('#game-players > div').forEach(el => {
        if (myRole === '마피아') {
            el.classList.add('bg-slate-200', 'text-slate-400', 'opacity-50', 'cursor-not-allowed');
            el.classList.remove('cursor-pointer');
            el.onclick = null;
        } else {
            el.onclick = () => {
                if (currentPhase === 'vote') {
                    // 배경색 변경
                    document.querySelectorAll('#game-players > div').forEach(e => e.classList.remove('bg-red-100', 'border-red-500'));
                    el.classList.add('bg-red-100', 'border-red-500');
                    const voteId = el.id.replace('player-', '');
                    socket.emit('vote', voteId);
                }
            };
        }
    });
});

socket.on('voting_result', (data) => {
    currentPhase = 'wait';
    clearInterval(timerInt);

    let msg = `마피아 지목 득표: ${data.mafiaVotes} / 필요 과반수: ${data.requiredVotes}<br>`;
    msg += `진짜 마피아는 <span class="font-bold text-indigo-600">${data.mafiaName}</span> 였습니다!<br><br>`;

    msg += `<div class="bg-indigo-50 p-3 rounded-lg text-sm text-left mb-4 max-h-32 overflow-y-auto border border-indigo-100 shadow-inner">`;
    msg += `<div class="text-xs font-bold text-indigo-400 mb-2">투표 상세 내역</div>`;
    for (const [voterName, suspectName] of Object.entries(data.detailedVotes || {})) {
        msg += `<div class="mb-1"><span class="font-bold text-slate-700">${voterName}</span> ➡️ <span class="font-bold text-indigo-600">${suspectName}</span> 지목</div>`;
    }
    if (!data.detailedVotes || Object.keys(data.detailedVotes).length === 0) {
        msg += `<span class="text-slate-500 italic">투표한 사람이 없습니다.</span>`;
    }
    msg += `</div>`;
    if (data.isMafiaCaught) {
        msg += `<span class="text-emerald-600 font-bold text-xl">마피아 검거 성공!</span>`;
    } else {
        msg += `<span class="text-red-600 font-bold text-xl">마피아 검거 실패! 마피아의 승리입니다!</span>`;
    }

    showModal('투표 결과', msg, false);
});

socket.on('mafia_guess_start', ({ timeLeft, mafiaId, isMafiaCaught }) => {
    currentPhase = 'guess';
    document.getElementById('game-status').innerText = '마피아 최후의 반론';
    updateTimer(timeLeft);

    if (socket.id === mafiaId) {
        showModal('반론 시간', '정답(제시어)을 맞춰보세요! 검거되었어도 맞추면 극적인 승리가 가능합니다!', true, (val) => {
            socket.emit('mafia_guess', val);
        });
    } else {
        showModal('반론 시간', '마피아가 정답을 유추하고 있습니다...', false);
    }
});

socket.on('mafia_guess_result', ({ correct, guess, keyword }) => {
    let msg = `마피아의 입력: [${guess}]<br>제시어는 [${keyword}] 였습니다.<br><br>`;
    msg += correct ? '<span class="text-emerald-600 font-bold text-xl">마피아가 정답을 맞췄습니다! <br/> 마피아 최종 승리!!</span>' : '<span class="text-red-600 font-bold text-xl">마피아가 정답을 맞추지 못했습니다!</span>';
    showModal('마피아 반론 결과', msg, false);
});

socket.on('round_end', ({ winnerRole, players, keyword }) => {
    currentPhase = 'wait';
    let title = winnerRole === 'mafia' ? '마피아 승리' : '시민 승리';
    let scores = players.map(p => `${p.name} : ${p.score}점`).join('<br>');

    const el = document.getElementById('modal-desc');
    el.innerHTML = `정답은 <span class="text-indigo-600 font-bold">${keyword}</span> 입니다!<br><br><b>점수 현황</b><br>${scores}`;

    document.getElementById('modal-container').classList.remove('hidden');
    document.getElementById('modal-title').innerText = `[라운드 종료] ${title}`;
    document.getElementById('modal-close-btn').classList.remove('hidden');
});

let lastGameOverData = null;

socket.on('game_over', (data) => {
    lastGameOverData = data;
    renderGameOverModal(data.players, data.hostId);
});

function renderGameOverModal(players, hostId) {
    const sorted = players.sort((a, b) => b.score - a.score);
    let scores = sorted.map(p => `${p.name} : ${p.score}점`).join('<br>');
    showModal('🏆 최종 결과 🏆', scores, false);

    const catArea = document.getElementById('modal-category-area');
    catArea.innerHTML = '';
    catArea.className = 'mb-4 flex flex-col gap-2';
    catArea.classList.remove('hidden');

    if (socket.id === hostId) {
        const btnRestart = document.createElement('button');
        btnRestart.className = 'w-full bg-emerald-500 hover:bg-emerald-600 py-3 rounded-lg text-white font-bold transition-colors';
        btnRestart.innerText = '새 게임 시작하기';
        btnRestart.onclick = () => {
            hideModal();
            lastGameOverData = null;
            socket.emit('start_game');
        };
        catArea.appendChild(btnRestart);
    } else {
        const lbl = document.createElement('div');
        lbl.className = 'w-full py-3 text-slate-500 font-bold text-center';
        lbl.innerText = '방장이 새 게임을 시작하기를 기다리는 중...';
        catArea.appendChild(lbl);
    }

    const btnLeave = document.createElement('button');
    btnLeave.className = 'w-full bg-slate-200 hover:bg-slate-300 py-3 rounded-lg text-slate-700 font-bold transition-colors';
    btnLeave.innerText = '방 목록으로 나가기';
    btnLeave.onclick = () => {
        hideModal();
        socket.emit('leave_room');
        showScreen('lobby');
        socket.emit('get_rooms');
        document.getElementById('chat-container').classList.add('hidden');
    };
    catArea.appendChild(btnLeave);

    document.getElementById('modal-close-btn').classList.add('hidden');
}

document.getElementById('modal-close-btn').addEventListener('click', () => {
    hideModal();
});

// 모달
const modalElement = document.getElementById('modal-container');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const modalInputArea = document.getElementById('modal-input-area');
const modalInput = document.getElementById('modal-input');
const modalBtn = document.getElementById('modal-btn');

function showModal(title, descText, showInput, cb) {
    modalElement.classList.remove('hidden');
    modalTitle.innerText = title;

    if (descText) {
        modalDesc.innerHTML = descText;
    }

    const catArea = document.getElementById('modal-category-area');
    if (catArea) catArea.classList.add('hidden');

    if (showInput) {
        modalInputArea.classList.remove('hidden');
        modalBtn.classList.remove('hidden');
        modalInput.value = '';

        // 이전 이벤트 리스너 제거용 (간단히 onclick 오버라이딩)
        modalBtn.onclick = () => {
            const val = modalInput.value;
            modalElement.classList.add('hidden');
            if (cb) cb(val);
        };
    } else {
        modalInputArea.classList.add('hidden');
        modalBtn.classList.add('hidden');
    }
}

function hideModal() {
    modalElement.classList.add('hidden');
    const catArea = document.getElementById('modal-category-area');
    if (catArea) catArea.classList.add('hidden');
    document.getElementById('modal-close-btn').classList.add('hidden');
}

// 모달 인풋 엔터키 처리
document.getElementById('modal-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (!document.getElementById('modal-btn').classList.contains('hidden')) {
            document.getElementById('modal-btn').click();
        }
    }
});

// ====================
// 채팅 로직
// ====================
const chatContainer = document.getElementById('chat-container');
const chatHeader = document.getElementById('chat-header');
const chatIcon = document.getElementById('chat-icon');
const chatBadge = document.getElementById('chat-badge');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const btnChatSend = document.getElementById('btn-chat-send');

let isChatOpen = false;
let unreadCount = 0;

chatHeader.addEventListener('click', () => {
    isChatOpen = !isChatOpen;
    if (isChatOpen) {
        chatContainer.style.transform = 'translateY(0)';
        chatIcon.style.transform = 'rotate(0deg)';
        chatBadge.classList.add('hidden');
        unreadCount = 0;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
        chatContainer.style.transform = 'translateY(calc(100% - 48px))';
        chatIcon.style.transform = 'rotate(180deg)';
    }
});

function sendChatMessage() {
    const text = chatInput.value.trim();
    if (text.length > 0) {
        socket.emit('chat_msg', text);
        chatInput.value = '';
    }
}

btnChatSend.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) {
        sendChatMessage();
    }
});

socket.on('chat_msg', (data) => {
    const isMe = data.sender === myName;
    const msgDiv = document.createElement('div');
    msgDiv.className = isMe ? 'self-end bg-indigo-500 text-white p-2 text-sm rounded-xl rounded-tr-sm max-w-[85%] break-words shadow-sm'
        : 'self-start bg-white border p-2 text-sm rounded-xl rounded-tl-sm max-w-[85%] break-words shadow-sm text-slate-700';
    msgDiv.innerHTML = isMe ? `${data.text}` : `<div class="font-bold text-xs text-indigo-800 mb-1">${data.sender}</div>${data.text}`;

    chatMessages.appendChild(msgDiv);

    if (isChatOpen) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
        unreadCount++;
        chatBadge.innerText = unreadCount > 99 ? '99+' : unreadCount;
        chatBadge.classList.remove('hidden');
    }
});

function clearChat() {
    chatMessages.innerHTML = '';
    unreadCount = 0;
    chatBadge.classList.add('hidden');
    isChatOpen = false;
    chatContainer.style.transform = 'translateY(calc(100% - 48px))';
    chatIcon.style.transform = 'rotate(180deg)';
}
