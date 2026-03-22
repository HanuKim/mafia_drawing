const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

const PORT = 3000;
http.listen(PORT, '0.0.0.0', () => console.log(`Listening on http://localhost:${PORT}`));

const categories = {
    동물: ['강아지', '고양이', '사자', '호랑이', '코끼리', '기린', '원숭이', '토끼', '곰', '판다', '여우', '늑대', '하마', '코알라', '캥거루', '사슴', '얼룩말', '치타', '표범', '악어', '거북이', '뱀', '도마뱀', '독수리', '부엉이', '참새', '비둘기', '까마귀', '타조', '펭귄', '고래', '상어', '돌고래', '수달', '물개', '바다사자', '북극곰', '다람쥐', '청설모', '고슴도치', '두더지', '메뚜기', '나비', '잠자리', '벌', '개미', '거미', '달팽이', '지렁이', '소', '돼지', '양', '말', '닭', '오리', '거위'],
    음식: ['사과', '바나나', '피자', '햄버거', '초밥', '치킨', '라면', '아이스크림', '스테이크', '감자튀김', '삼겹살', '김치찌개', '된장찌개', '비빔밥', '떡볶이', '짜장면', '짬뽕', '탕수육', '볶음밥', '김밥', '순대', '튀김', '어묵', '우동', '돈까스', '냉면', '칼국수', '만두', '샌드위치', '토스트', '샐러드', '파스타', '리조또', '케이크', '마카롱', '초콜릿', '사탕', '쿠키', '도넛', '와플', '팬케이크', '빙수', '수박', '포도', '딸기', '참외', '복숭아', '오렌지', '귤', '키위', '망고', '파인애플'],
    직업: ['소방관', '경찰관', '의사', '선생님', '요리사', '우주비행사', '가수', '배우', '프로게이머', '과학자', '변호사', '유튜버', '아나운서', '기자', '작가', '화가', '디자이너', '프로그래머', '개발자', '건축가', '판사', '검사', '간호사', '약사', '치과의사', '수의사', '농부', '어부', '목수', '택시기사', '버스기사', '승무원', '비행기조종사', '마술사', '운동선수', '모델', '사진작가', '미용사', '메이크업아티스트', '플로리스트', '바리스타', '제빵사', '은행원', '회계사', '펀드매니저', '외교관', '정치인', '경호원', '탐정', '군인'],
    사물: ['자동차', '비행기', '컴퓨터', '스마트폰', '우산', '안경', '시계', '자전거', '피아노', '가방', '텔레비전', '냉장고', '세탁기', '청소기', '에어컨', '선풍기', '전자레인지', '오븐', '믹서기', '커피머신', '책상', '의자', '침대', '소파', '옷장', '서랍장', '신발장', '식탁', '거울', '휴지통', '칫솔', '치약', '비누', '샴푸', '수건', '드라이기', '연필', '지우개', '볼펜', '가위', '풀', '테이프', '노트', '책', '달력', '지갑', '열쇠', '이어폰', '마우스', '키보드', '모니터', '충전기'],
    속담: ['가는 말이 고와야 오는 말이 곱다', '소 잃고 외양간 고친다', '원숭이도 나무에서 떨어진다', '누워서 침 뱉기', '개구리 올챙이 적 생각 못 한다', '고래 싸움에 새우 등 터진다', '세 살 버릇 여든까지 간다', '호랑이도 제 말 하면 온다', '돌다리도 두들겨 보고 건너라', '등잔 밑이 어둡다', '발 없는 말이 천 리 간다', '빈 수레가 요란하다', '사공이 많으면 배가 산으로 간다', '수박 겉 핥기', '식은 죽 먹기', '아니 땐 굴뚝에 연기 나랴', '우물 안 개구리', '울며 겨자 먹기', '작은 고추가 맵다', '티끌 모아 태산', '하늘의 별 따기', '달면 삼키고 쓰면 뱉는다', '미운 놈 떡 하나 더 준다', '벼는 익을수록 고개를 숙인다', '사촌이 땅을 사면 배가 아프다', '개천에서 용 난다', '말 한마디에 천 냥 빚도 갚는다', '바늘 도둑이 소 도둑 된다', '꿩 대신 닭', '도둑이 제 발 저리다', '믿는 도끼에 발등 찍힌다', '고생 끝에 낙이 온다', '그림의 떡', '금강산도 식후경', '낫 놓고 기역 자도 모른다', '다 된 밥에 재 뿌리기', '물에 빠진 놈 건져 놓으니 보따리 내놓으라 한다', '배보다 배꼽이 더 크다', '서당 개 삼 년이면 풍월을 읊는다', '얌전한 고양이가 부뚜막에 먼저 올라간다', '열 번 찍어 안 넘어가는 나무 없다', '오르지 못할 나무는 쳐다보지도 마라', '입에 쓴 약이 병에는 좋다', '잘되면 제 탓 못되면 조상 탓', '종로에서 뺨 맞고 한강에서 눈 흘긴다', '될성부른 나무는 떡잎부터 알아본다', '가재는 게 편', '간에 가 붙고 쓸개에 가 붙는다', '같은 값이면 다홍치마', '구슬이 서 말이라도 꿰어야 보배다']
};
const rooms = new Map();
const socketToRoom = new Map();
const connectedUsers = new Map();

function startCategorySelect(roomId) {
    const room = rooms.get(roomId);
    if (!room || room.players.length < 3) return;

    if (room.currentRound === 0) room.currentRound++;
    else if (room.state === 'round_end') room.currentRound++;

    room.state = 'category_select';
    io.to(roomId).emit('category_select_start', {
        hostId: room.host,
        categories: ['자유주제', ...Object.keys(categories)]
    });
}

function startRound(roomId, categoryName) {
    const room = rooms.get(roomId);
    if (!room) return;

    room.state = 'drawing';

    let list = [];
    if (categoryName === '자유주제') {
        for (const key in categories) list = list.concat(categories[key]);
    } else {
        list = categories[categoryName] || categories['동물'];
    }
    list = list.filter(w => !room.usedWords.has(w));
    if (list.length === 0) list = ['마지막단어'];

    const keyword = list[Math.floor(Math.random() * list.length)];
    room.usedWords.add(keyword);

    const mafiaIndex = Math.floor(Math.random() * room.players.length);
    const playingOrder = [...room.players];
    playingOrder.sort(() => Math.random() - 0.5);

    room.roundData = {
        keyword,
        mafiaId: playingOrder[mafiaIndex].id,
        order: playingOrder,
        currentPainterIndex: 0,
        drawCycles: 0,
        timer: null,
        votes: {},
    };

    room.players.forEach(p => {
        io.to(p.id).emit('role_assign', {
            isMafia: p.id === room.roundData.mafiaId,
            keyword: p.id === room.roundData.mafiaId ? '?' : keyword,
            round: room.currentRound,
            categoryName
        });
    });

    io.to(roomId).emit('round_start', { round: room.currentRound, order: playingOrder.map(p => ({ id: p.id, name: p.name, score: p.score, globalScore: p.globalScore })) });

    setTimeout(() => startTurn(roomId), 3000);
}

function startTurn(roomId) {
    const room = rooms.get(roomId);
    if (!room || room.state !== 'drawing') return;
    const rd = room.roundData;

    if (rd.drawCycles >= rd.order.length * 2) {
        startVoting(roomId);
        return;
    }

    const currentPainter = rd.order[rd.drawCycles % rd.order.length];

    io.to(roomId).emit('turn_start', {
        painterId: currentPainter.id,
        painterName: currentPainter.name,
        timeLeft: 10
    });

    rd.timer = setTimeout(() => {
        endTurn(roomId);
    }, 10000);
}

function endTurn(roomId) {
    const room = rooms.get(roomId);
    if (!room || room.state !== 'drawing') return;
    const rd = room.roundData;
    clearTimeout(rd.timer);

    io.to(roomId).emit('turn_end');
    rd.drawCycles++;
    setTimeout(() => startTurn(roomId), 1000);
}

function startVoting(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;
    room.state = 'voting';
    room.roundData.votes = {};

    io.to(roomId).emit('voting_start', { timeLeft: 15 });

    room.roundData.timer = setTimeout(() => {
        endVoting(roomId);
    }, 15000);
}

function endVoting(roomId) {
    const room = rooms.get(roomId);
    if (!room || room.state !== 'voting') return;
    clearTimeout(room.roundData.timer);

    const rd = room.roundData;
    
    let voteCounts = {};
    let detailedVotes = {};
    for (let [voterId, suspectedId] of Object.entries(rd.votes)) {
        voteCounts[suspectedId] = (voteCounts[suspectedId] || 0) + 1;
        const voter = room.players.find(p => p.id === voterId);
        const suspect = room.players.find(p => p.id === suspectedId);
        if (voter && suspect) detailedVotes[voter.name] = suspect.name;
    }

    let maxVotes = 0;
    let suspects = [];
    for (let [candidate, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
            maxVotes = count;
            suspects = [candidate];
        } else if (count === maxVotes) {
            suspects.push(candidate);
        }
    }

    const citizensCount = room.players.length - 1;
    const requiredVotes = Math.floor(citizensCount / 2) + 1;
    const mafiaVotes = voteCounts[rd.mafiaId] || 0;
    const isMafiaCaught = (mafiaVotes >= requiredVotes);
    const mafiaPlayer = room.players.find(p => p.id === rd.mafiaId);

    io.to(roomId).emit('voting_result', {
        suspects,
        mafiaId: rd.mafiaId,
        mafiaName: mafiaPlayer ? mafiaPlayer.name : '알수없음',
        isMafiaCaught,
        mafiaVotes,
        requiredVotes,
        detailedVotes
    });

    setTimeout(() => {
        if (isMafiaCaught) {
            room.state = 'guessing';
            io.to(roomId).emit('mafia_guess_start', { timeLeft: 15, mafiaId: rd.mafiaId, isMafiaCaught });

            rd.timer = setTimeout(() => {
                if (room.state !== 'guessing') return;
                room.state = 'guess_evaluating';
                io.to(roomId).emit('mafia_guess_result', { correct: false, guess: '시간 초과', keyword: rd.keyword });
                setTimeout(() => finishRound(roomId, 'citizens'), 4000);
            }, 15000);
        } else {
            finishRound(roomId, 'mafia');
        }
    }, 7000);
}

function finishRound(roomId, winnerRole) {
    const room = rooms.get(roomId);
    if (!room) return;
    room.state = 'round_end';
    clearTimeout(room.roundData.timer);

    room.players.forEach(p => {
        if (winnerRole === 'mafia' && p.id === room.roundData.mafiaId) {
            p.score += 1;
        } else if (winnerRole === 'citizens' && p.id !== room.roundData.mafiaId) {
            if (room.roundData.votes[p.id] === room.roundData.mafiaId) {
                p.score += 1;
            }
        }
    });

    io.to(roomId).emit('round_end', {
        winnerRole,
        players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, globalScore: p.globalScore })),
        keyword: room.roundData.keyword
    });

    if (room.currentRound >= room.maxRounds) {
        setTimeout(() => {
            let maxGameScore = -1;
            for (const p of room.players) {
                if (p.score > maxGameScore) maxGameScore = p.score;
            }
            if (maxGameScore > 0) {
                for (const p of room.players) {
                    if (p.score === maxGameScore) p.globalScore += 1;
                }
            }

            room.state = 'game_over';
            room.currentRound = 0;
            io.to(roomId).emit('game_over', {
                players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, globalScore: p.globalScore })),
                hostId: room.host
            });
            // room.players.forEach(p => p.score = 0); // 새 게임 시작(start_game) 시 초기화하도록 변경
            room.usedWords.clear();
            io.to(roomId).emit('room_update', {
                id: room.id,
                name: room.name,
                host: room.host,
                players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
                state: room.state
            });
        }, 5000);
    } else {
        setTimeout(() => {
            startCategorySelect(roomId);
        }, 5000);
    }
}

io.on('connection', (socket) => {
    socket.on('login', (name) => {
        let isDuplicate = false;
        for (let n of connectedUsers.values()) {
            if (n === name) {
                isDuplicate = true;
                break;
            }
        }
        if (isDuplicate) {
            socket.emit('login_fail', '이미 사용 중인 닉네임입니다. 다른 닉네임으로 변경해주세요.');
        } else {
            connectedUsers.set(socket.id, name);
            socket.emit('login_success', name);
        }
    });

    socket.on('get_rooms', () => {
        let r = [];
        for (let [id, room] of rooms) {
            r.push({ id: room.id, name: room.name, playerCount: room.players.length, state: room.state });
        }
        socket.emit('room_list', r);
    });

    socket.on('join_room', ({ roomId, name, roomName }) => {
        let room = rooms.get(roomId);
        if (!room) {
            room = {
                id: roomId,
                name: roomName || '이름없는 방',
                host: socket.id,
                players: [],
                state: 'lobby',
                currentRound: 0,
                maxRounds: 3,
                roundData: null,
                usedWords: new Set()
            };
            rooms.set(roomId, room);
        }

        if (room.players.length >= 10) {
            socket.emit('error', '방이 꽉 찼습니다.');
            return;
        }
        if (room.state !== 'lobby') {
            socket.emit('error', '이미 게임이 시작된 방입니다.');
            return;
        }

        room.players.push({ id: socket.id, name, score: 0, globalScore: 0 });
        socket.join(roomId);
        socketToRoom.set(socket.id, roomId);

        io.to(roomId).emit('room_update', {
            id: room.id,
            name: room.name,
            host: room.host,
            players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, globalScore: p.globalScore })),
            state: room.state
        });
    });

    socket.on('start_game', () => {
        const roomId = socketToRoom.get(socket.id);
        const room = rooms.get(roomId);
        if (room && room.host === socket.id && (room.state === 'lobby' || room.state === 'game_over')) {
            if (room.players.length < 3) {
                socket.emit('error', '최소 3명이 필요합니다.');
                return;
            }
            room.players.forEach(p => p.score = 0);
            room.usedWords.clear();
            startCategorySelect(roomId);
        }
    });

    socket.on('select_category', (categoryName) => {
        const roomId = socketToRoom.get(socket.id);
        const room = rooms.get(roomId);
        if (room && room.state === 'category_select' && room.host === socket.id) {
            startRound(roomId, categoryName);
        }
    });

    socket.on('draw', (data) => {
        const roomId = socketToRoom.get(socket.id);
        const room = rooms.get(roomId);
        if (room && room.state === 'drawing') {
            socket.to(roomId).emit('draw', data);
        }
    });

    socket.on('clear_canvas', () => {
        const roomId = socketToRoom.get(socket.id);
        const room = rooms.get(roomId);
        if (room && room.state === 'drawing') {
            io.to(roomId).emit('clear_canvas');
        }
    });

    socket.on('mafia_guess', (guessWord) => {
        const roomId = socketToRoom.get(socket.id);
        const room = rooms.get(roomId);
        if (room && room.state === 'guessing' && room.roundData.mafiaId === socket.id) {
            room.state = 'guess_evaluating';
            clearTimeout(room.roundData.timer);

            const answer = room.roundData.keyword.replace(/\s+/g, '');
            const guess = (guessWord || '').replace(/\s+/g, '');
            const isCorrect = guess.includes(answer);

            const citizensCount = room.players.length - 1;
            const requiredVotes = Math.floor(citizensCount / 2) + 1;
            
            let mafiaVotes = 0;
            for (const [voterId, suspectedId] of Object.entries(room.roundData.votes)) {
                if (suspectedId === room.roundData.mafiaId) {
                    mafiaVotes++;
                }
            }
            
            const isMafiaCaught = (mafiaVotes >= requiredVotes);
            const mafiaPlayer = room.players.find(p => p.id === room.roundData.mafiaId);

            io.to(roomId).emit('mafia_guess_result', { correct: isCorrect, guess: guessWord, keyword: room.roundData.keyword });

            setTimeout(() => {
                if (isCorrect) finishRound(roomId, 'mafia');
                else {
                    if (isMafiaCaught) finishRound(roomId, 'citizens');
                    else finishRound(roomId, 'mafia');
                }
            }, 4000);
        }
    });

    socket.on('vote', (suspectedId) => {
        const roomId = socketToRoom.get(socket.id);
        const room = rooms.get(roomId);
        if (room && room.state === 'voting') {
            if (room.roundData.mafiaId === socket.id) return; // Mafia cannot vote
            room.roundData.votes[socket.id] = suspectedId;
        }
    });



    socket.on('chat_msg', (text) => {
        const roomId = socketToRoom.get(socket.id);
        const room = rooms.get(roomId);
        if (room && text && text.trim().length > 0) {
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                io.to(roomId).emit('chat_msg', { sender: player.name, text: text.trim(), isSystem: false });
            }
        }
    });

    socket.on('leave_room', () => {
        const roomId = socketToRoom.get(socket.id);
        if (!roomId) return;
        const room = rooms.get(roomId);
        if (!room) return;

        room.players = room.players.filter(p => p.id !== socket.id);
        socket.leave(roomId);
        socketToRoom.delete(socket.id);

        if (room.players.length === 0) {
            rooms.delete(roomId);
        } else {
            if (room.host === socket.id) room.host = room.players[0].id;

            if (room.players.length <= 2 && room.state !== 'lobby') {
                room.state = 'lobby';
                room.currentRound = 0;
                io.to(roomId).emit('error', '플레이어 수가 부족하여 게임이 취소되고 대기방으로 이동합니다.');
                io.to(roomId).emit('room_update', {
                    id: room.id,
                    name: room.name,
                    host: room.host,
                    players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, globalScore: p.globalScore })),
                    state: room.state
                });
                return;
            }

            io.to(roomId).emit('room_update', {
                id: room.id,
                name: room.name,
                host: room.host,
                players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, globalScore: p.globalScore })),
                state: room.state
            });
            if (room.state !== 'lobby' && room.state !== 'game_over') {
                room.state = 'game_over';
                room.currentRound = 0;
                io.to(roomId).emit('error', '진행 중인 게임이 취소되었습니다. 방장이 다시 시작할 수 있습니다.');
                io.to(roomId).emit('game_over', {
                    players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, globalScore: p.globalScore })),
                    hostId: room.host
                });
            }
        }
    });

    socket.on('disconnect', () => {
        connectedUsers.delete(socket.id);
        const roomId = socketToRoom.get(socket.id);
        if (roomId) {
            const room = rooms.get(roomId);
            if (room) {
                room.players = room.players.filter(p => p.id !== socket.id);
                if (room.players.length === 0) {
                    rooms.delete(roomId);
                } else {
                    if (room.host === socket.id) room.host = room.players[0].id;

                    if (room.players.length <= 2 && room.state !== 'lobby') {
                        room.state = 'lobby';
                        room.currentRound = 0;
                        io.to(roomId).emit('error', '플레이어 수가 부족하여 게임이 취소되고 대기방으로 이동합니다.');
                        io.to(roomId).emit('room_update', {
                            id: room.id,
                            name: room.name,
                            host: room.host,
                            players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, globalScore: p.globalScore })),
                            state: room.state
                        });
                        return;
                    }

                    io.to(roomId).emit('room_update', {
                        id: room.id,
                        name: room.name,
                        host: room.host,
                        players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, globalScore: p.globalScore })),
                        state: room.state
                    });
                    if (room.state !== 'lobby' && room.state !== 'game_over') {
                        room.state = 'game_over';
                        room.currentRound = 0;
                        io.to(roomId).emit('error', '진행 중인 게임이 취소되었습니다.');
                        io.to(roomId).emit('game_over', {
                            players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, globalScore: p.globalScore })),
                            hostId: room.host
                        });
                    }
                }
            }
            socketToRoom.delete(socket.id);
        }
    });
});
