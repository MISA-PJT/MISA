let monsters = [];  // 모든 몬스터 객체를 담을 배열
let player;
let damageNumbers = []; // 데미지 숫자를 담을 배열 -250922 데미지 화면 표시 추가

// Custom Map 미적용 오류 해결 : window.onload -> startGame function
function startGame() {
    // 1. 기본 설정
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    setTimeout(function () {
        // 2. 네이버 지도 초기화
        const startLat = 37.563188;
        const startLng = 127.192642;
        const mapOptions = {
            gl: true,
            center: new naver.maps.LatLng(startLat, startLng),
            zoom: 19,
            minZoom: 19,
            zoomControl: false,
            mapDataControl: false,
            scaleControl: false,
            logoControl: false,
            mapTypeControl: false,
            customStyleId: 'fa582bd4-5cbb-4c9f-b934-079dc4a5d231'
        };
        const map = new naver.maps.Map('map', mapOptions);

        // 게임에 필요한 모든 객체들을 선언
        let playerImage = {};
        let playerAttackImage;
        let weaponImage;
        let attackEffectImage;
        let sword;
        const collisionPolygons = [];
        const keys = { w: false, a: false, s: false, d: false };
        // degree per pixel (줌 19 고정, 로그에서 계산)
        const delta_lat_per_pixel = -0.000002125; // south (Y+) decreases lat // 줌 21 : -0.00000053125;
        const delta_lng_per_pixel = 0.0000026856; // east (X+) increases lng // 줌 21 : 0.0000006714;

        // WebSocket 추가
        let socket;

        // 사용자 사망 시 표시될 비석 이미지 추가
        let tombstoneImage;
        const tombstoneEl = document.getElementById('tombstone-image');

        // UI 변수들
        const inventoryUI = document.getElementById('inventory-ui');
        const inventoryList = document.getElementById('inventory-list');
        const statusUI = document.getElementById('character-status-ui');

        function connectWebSocket() {
            // "ws://" 는 WebSocket 프로토콜
            socket = new WebSocket("ws://localhost:8080/game");

            // WebSocket 연결 성공 이벤트
            socket.onopen = function (event) {
                console.log("서버와 WebSocket 연결 성공!");

                // WebSocket 연결 성공 시 서버에 사용자 ID를 전송
                if (player && player.id) {
                    const enterMessage = {
                        type: "ENTER",
                        userId: player.id
                    };
                    socket.send(JSON.stringify(enterMessage));
                }

            };

            // 서버로부터 메시지를 수신했을 때 이벤트
            socket.onmessage = function (event) {
                const message = JSON.parse(event.data);
                console.log("서버로부터 메시지 수신 : ", message);

                if (message.type === "ATTACK_RESULT") {
                    const targetSpawnId = message.monsterSpawnId;
                    const monster = monsters.find(m => m.spawnId == targetSpawnId);
                    if (monster) {
                        monster.hp = message.newHp;

                        // 몬스터 피격 상태 활성화 -250922
                        monster.isHit = true;
                        monster.hitTimestamp = Date.now();

                        // 몬스터가 피해를 입었을 때 데미지 숫자 객체를 생성하여 데미지 숫자 배열에 추가 -250922 데미지 화면 표시 추가
                        const damageText = {
                            value: message.damage,
                            x: monster.canvasX,
                            y: monster.canvasY - monster.displayHeight / 2,     // 몬스터 상단
                            alpha: 1.0,
                            velocity: -0.5  // 위로 떠오르는 속도
                        };
                        damageNumbers.push(damageText);

                        // 몬스터가 피해를 입었을 때 사용자로부터 멀어지는 방향으로 살짝 밀려나는 효과 추가 -250922
                        const knockbackPower = 5; // 밀려나는 힘(픽셀)
                        const dx = monster.canvasX - player.canvasX;
                        const dy = monster.canvasY - player.canvasY;
                        const magnitude = Math.sqrt(dx * dx + dy * dy);

                        if (magnitude > 0) {
                            const knockbackX = (dx / magnitude) * knockbackPower;
                            const knockbackY = (dy / magnitude) * knockbackPower;

                            // 픽셀 변화량을 위도/경도로 변환하여 적용
                            monster.lng += knockbackX * delta_lng_per_pixel;
                            monster.lat += knockbackY * delta_lat_per_pixel;
                        }

                        console.log(`몬스터 ${monster.name}에게 ${message.damage} 데미지! 남은 HP : ${monster.hp}`);
                        if (monster.hp <= 0) {
                            monster.state = 'dying';
                            console.log(`${monster.name}을(를) 처치했습니다!`);

                            // 몬스터 아이템 드랍 로직 -250915
                            if (message.droppedItems && message.droppedItems.length > 0) {
                                console.log("드랍된 아이템 : ", message.droppedItems);
                            }
                        }
                    }
                } else if (message.type === "MONSTER_RESPAWN") {
                    // 리스폰 동기화
                    const targetSpawnId = message.monsterSpawnId;
                    const monster = monsters.find(m => m.spawnId == targetSpawnId);
                    if (monster) {
                        monster.hp = message.newHp;
                        monster.state = 'idle';
                        monster.alpha = 1;
                        monster.lat = monster.initialLat;
                        monster.lng = monster.initialLng;
                        console.log(`${monster.name}이(가) 서버에서 리스폰 되었습니다.`);
                    }
                } else if (message.type === "PLAYER_STAT_UPDATE") {
                    // 사용자 캐릭터 능력치 동기화

                    // 사용자 피격 효과 추가 -250922
                    if (player.currentHp > message.currentHp) {
                        player.isHit = true;
                        player.hitTimestamp = Date.now();
                    }

                    // HP가 업데이트 되기 전, 현재 HP를 따로 저장 -250922 사용자 피해 화면 표시 추가
                    const oldCurrentHp = player.currentHp;

                    // 서버가 보내준 최신 정보로 사용자 스탯을 업데이트
                    console.log("사용자 캐릭터 스탯 업데이트 수신 : ", message);
                    player.hp = message.hp;
                    player.ap = message.ap;
                    player.dp = message.dp;
                    player.currentHp = message.currentHp;

                    // 이전 HP와 현재 HP의 차이를 계산하여 받은 데미지를 구함. -250922 사용자 피해 화면 표시 추가
                    const damageTaken = oldCurrentHp - player.currentHp;

                    // 데미지를 입었을 경우에만 데미지 숫자를 생성 -250922 사용자 피해 화면 표시 추가
                    if (damageTaken > 0) {
                        const damageText = {
                            value: damageTaken,
                            x: player.canvasX,  // 사용자의 현재 위치
                            y: player.canvasY,  // 사용자의 머리 위
                            alpha: 1.0,
                            velocity: -0.5
                        };
                        damageNumbers.push(damageText);
                    }

                } else if (message.type === "ERROR") {
                    console.error("서버 에러 : ", message.message);

                } else if (message.type === "PLAYER_DIED") {
                    if (message.userId === player.id) {
                        console.log("사망했습니다. 부활을 기다립니다...");
                        player.isDead = true;

                        // 비석 이미지 표시
                        if (tombstoneEl) tombstoneEl.classList.remove('hidden');

                    }
                } else if (message.type === "PLAYER_RESPAWN") {
                    if (message.userId === player.id) {
                        console.log("시작 지점에서 부활했습니다!");
                        player.isDead = false;
                        player.currentHp = message.currentHp;
                        player.hp = message.maxHp;
                        player.lat = message.lat;
                        player.lng = message.lng;

                        // 부활 시 비석 이미지 숨김
                        if (tombstoneEl) tombstoneEl.classList.add('hidden');

                    }
                }
                // TODO: 서버가 보낸 데이터 종류에 따라 분기 처리 필요(예: 몬스터 위치 업데이트, 아이템 획득 알림 등)
            };

            // WebSocket 연결이 닫혔을 때 이벤트
            socket.onclose = function (event) {
                console.log("WebSocket 연결이 끊겼습니다. 재연결을 시도합니다." + event.code + ", 이유 : " + event.reason);
                if (player.isAttacking) {
                    player.isAttacking = false;
                    player.attackEffectFramX = 0;
                }
                setTimeout(function () {
                    connectWebSocket();
                }, 2000);
            };

            // 에러 발생 시 이벤트
            socket.onerror = function (error) {
                console.error("WebSocket 에러 발생 : ", error);
            };
        }

        // 충돌 영역 초기화 함수
        function initializeCollision() {
            const polygon = new naver.maps.Polygon({
                map,
                paths: [[
                    new naver.maps.LatLng(37.562299, 127.191770),
                    new naver.maps.LatLng(37.5626272, 127.191620),
                    new naver.maps.LatLng(37.5628500, 127.1925065),
                    new naver.maps.LatLng(37.5627675, 127.1925935),
                    new naver.maps.LatLng(37.5626865, 127.1927981),
                    new naver.maps.LatLng(37.5625705, 127.1928647),
                ]],
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#FF0000',
                fillOpacity: 0
            });
            collisionPolygons.push(polygon);

            // precomputedBounds를 즉시 초기화하는 코드 추가
            collisionPolygons.forEach(poly => {
                poly.precomputedBounds = poly.getBounds();
            });

            // 지도 이벤트: 팬/줌 후 bounds 재계산
            naver.maps.Event.addListener(map, 'idle', function() {
                collisionPolygons.forEach(poly => {
                    poly.precomputedBounds = poly.getBounds();
                });
                console.log('Map idle: bounds updated');
            });
        }

        // 이벤트 리스너 설정 함수
        function setupEventListeners() {

            window.addEventListener('keydown', (e) => {
                if (player.isDead) return;
                const key = e.key.toLowerCase();
                if (['w', 'a', 's', 'd'].includes(key)) keys[key] = true;

                // 공격
                if (e.key.toLowerCase() === 'k' && !player.isAttacking) {

                    // 사용자 공격 쿨타임 체크 로직 추가 -250919
                    const now = Date.now();
                    if (now - player.lastAttackTime > player.attackCooldown) {
                        player.lastAttackTime = now;

                        // 모든 공격 관련 상태를 초기화
                        player.isAttacking = true;
                        player.attackFrameX = 0;
                        player.attackFrameTimer = 0;
                        player.attackEffectFramX = 0;
                        player.attackEffectFrameTimer = 0;

                        // 공격 시작 시, 방향(frameY)을 한번 더 설정
                        if (keys.w) {
                            player.frameY = 3;
                        } else if (keys.s) {
                            player.frameY = 0;
                        } else if (keys.a) {
                            player.frameY = 1;
                        } else if (keys.d) {
                            player.frameY = 2;
                        }

                        player.isAttacking = true;
                        player.attackEffectFramX = 0;
                        player.attackEffectFrameTimer = 0;

                        // 현재 플레이어의 방향을 공격 방향으로 저장
                        if (keys.w) player.attackDirection = 'up';
                        else if (keys.s) player.attackDirection = 'down';
                        else if (keys.a) player.attackDirection = 'left';
                        else if (keys.d) player.attackDirection = 'right';
                        else {
                            // 사용자가 마지막으로 입력한 이동 키를 기준으로 공격 방향 설정
                            if (player.frameY === 0) player.attackDirection = 'down';
                            else if (player.frameY === 1) player.attackDirection = 'left';
                            else if (player.frameY === 2) player.attackDirection = 'right';
                            else if (player.frameY === 3) player.attackDirection = 'up';
                        }
                        console.log("공격 시작! 방향 : ", player.attackDirection);

                        // 공격 판정 추가
                        const attackRange = 80; // 사용자 공격 사거리
                        const attackWidth = 55; // 사용자 공격 폭

                        monsters.forEach(monster => {
                            if (monster.state !== 'dead') { // 살아있는 몬스터만 대상으로 판정
                                const distance = getDistance(
                                    player.canvasX,
                                    player.canvasY,
                                    monster.canvasX,
                                    monster.canvasY
                                );

                                // 몬스터가 공격 범위 내에 있을 경우 공격
                                if (distance < attackRange) {
                                    let isAttackSuccess = false;    // 공격 성공 여부 플래그
                                    // 몬스터가 플레이어 기준으로 어느 방향에 있는지 계산
                                    const dx = monster.canvasX - player.canvasX;
                                    const dy = monster.canvasY - player.canvasY;

                                    // 플레이어의 공격 방향에 따라 공격 성공 여부 판정
                                    switch (player.attackDirection) {
                                        case 'up':
                                            // 몬스터가 위쪽에 위치(이하 공통 적용 : 상,하 = 좌우, 좌,우 = 상하 공격 폭 안에 있을 때)
                                            if (dy < 0 && Math.abs(dx) < attackWidth) isAttackSuccess = true;
                                            break;
                                        case 'down':
                                            //몬스터가 아래쪽에 위치
                                            if (dy > 0 && Math.abs(dx) < attackWidth) isAttackSuccess = true;
                                            break;
                                        case 'left':
                                            // 몬스터가 왼쪽에 위치
                                            if (dx < 0 && Math.abs(dy) < attackWidth) isAttackSuccess = true;
                                            break;
                                        case 'right':
                                            // 몬스터가 오른쪽에 위치
                                            if (dx > 0 && Math.abs(dy) < attackWidth) isAttackSuccess = true;
                                            break;
                                    }

                                    if (isAttackSuccess) {

                                        // 클라이언트에서 직접 HP 감소 -> 서버에 메시지 전송 -250915
                                        if (socket && socket.readyState === WebSocket.OPEN) {

                                            const attackMessage = {
                                                type: "PLAYER_ATTACK",
                                                targetMonsterId: monster.id,
                                                targetMonsterSpawnId: monster.spawnId
                                            };
                                            socket.send(JSON.stringify(attackMessage));
                                            console.log("공격 메시지 전송 성공 : ", attackMessage);
                                        } else {
                                            console.error("WebSocket 연결이 열리지 않아 공격 전송 실패. 재연결 대기 중.")
                                        }

                                    }
                                }

                            }
                        });
                    }
                }
                // i 키를 눌렀을 때 인벤토리 UI 호출
                if (e.key === 'i') {
                    toggleInventory();
                }

                // u 키를 눌렀을 때 캐릭터 정보창 UI 호출
                if (e.key === 'u') {
                    toggleCharacterStatus();
                }
            });
            window.addEventListener('keyup', (e) => {
                const key = e.key.toLowerCase();
                if (['w', 'a', 's', 'd'].includes(key)) keys[key] = false;
            });

            // 사용자 캐릭터 정보 저장 및 종료 버튼 추가 -250922 사용자 정보 저장 추가
            const exitButton = document.getElementById('save-exit-button');
            exitButton.onclick = saveAndExit;

            const saveButton = document.getElementById('save-button');
            saveButton.onclick = saveGame;
        }

        // 게임 로직 함수들 위치 이동 -250911

        // 저장 및 종료 함수 -250922 사용자 정보 저장 추가
        async function saveAndExit() {
            console.log("Saving character state...");
            if (socket) {
                socket.close(); // WebSocket 연결부터 종료
            }

            try {
                const response = await fetch('/api/characters/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        userId: player.id,
                        currentHp: player.currentHp,
                        latitude: player.lat,
                        longitude: player.lng
                    })
                });

                if (response.ok) {
                    console.log("저장 완료");
                    // TODO: 메인 페이지나 로그인 페이지로 리디렉션
                    alert("게임이 저장되었습니다.");
                }
            } catch (error) {
                console.error("저장 중 에러 : ", error);
                alert("저장 중 에러가 발생했습니다.");
            }
        }

        // 사용자 데이터 로딩 함수 -250911
        async function loadPlayer(userId) {
            try {
                const response = await fetch(`/api/characters/${userId}`);  // 서버 API 호출
                if (!response.ok) {
                    throw new Error(`캐릭터 정보를 찾을 수 없습니다. : ${response.status}`);
                }
                const playerData = await response.json();

                // 서버에서 받은 데이터로 사용자 객체 생성
                player = {
                    id: playerData.userId,
                    lat: 37.563188,
                    lng: 127.192642,
                    hp: playerData.characterHp,
                    currentHp: playerData.currentHp,
                    ap: playerData.characterAp,
                    dp: playerData.characterDp,
                    // 렌더링에 필요한 클라이언트 측 속성
                    width: 96,
                    height: 80,
                    speed: 0.5,
                    displayWidth: 120,
                    displayHeight: 100,
                    frameX: 0,
                    frameY: 0,
                    maxFrame: 7,
                    directionOffsetX: 0,
                    moving: false,
                    fps: 10,
                    frameTimer: 0,
                    frameInterval: 1000 / 10,
                    collisionWidth: 50,
                    collisionHeight: 50,

                    equippedWeapon: null, // 현재 장착한 무기 정보

                    isAttacking: false,

                    // 공격 애니메이션 프레임 속성 추가
                    attackFrameX: 0,
                    maxAttackFrame: 7,

                    // 공격 애니메이션 속도 관련 속성 추가
                    attackAnimFps: 10,   // 공격 애니메이션의 초당 프레임 수 (숫자가 낮을 수록 느려짐)
                    attackFrameTimer: 0,
                    attackFrameInterval: 1000 / 10,

                    attackDirection: 'down',     // 공격 방향 (무기 위치 및 이펙트 위치에 활용)

                    isDead: false,

                    // 공격속도 관련 속성 추가
                    attackCooldown: 700,
                    lastAttackTime: 0,

                    // 사용자 피격 효과 추가 -250922
                    isHit: false,
                    hitTimestamp: 0

                };
                console.log("사용자 데이터 로딩 완료", player);
            } catch (error) {
                console.error("사용자 로딩 실패 : ", error);
            }
        }

        // 인벤토리 UI를 열고 닫는 함수 -250916
        async function toggleInventory() {

            // UI의 hidden 클래스를 토글
            inventoryUI.classList.toggle('hidden');

            // 인벤토리가 열렸을 때만 데이터 로드
            if (!inventoryUI.classList.contains('hidden')) {
                try {
                    const response = await fetch(`/api/inventory/${player.id}`);
                    const items = await response.json();

                    // 목록 초기화
                    inventoryList.innerHTML = '';

                    if (items.length === 0) {
                        inventoryList.innerHTML = '<li>비어 있음</li>';
                    } else {
                        // 각 아이템을 목록에 추가
                        items.forEach(item => {
                            const li = document.createElement('li');

                            // 아이템 정보 텍스트 생성
                            const itemText = document.createElement('span');

                            // 아이템 타입에 따라 표시할 텍스트 결정
                            let itemTypeText = '';
                            switch (item.itemType) {
                                case 'equipment':
                                    itemTypeText = '장비';
                                    break;
                                case 'consumable':
                                    itemTypeText = '소모품';
                                    break;
                                default:
                                    itemTypeText = item.itemType;
                            }

                            itemText.textContent = `${item.itemName} x ${item.quantity} (${itemTypeText})`;
                            li.appendChild(itemText);

                            // 아이템 타입에 따라 버튼 생성
                            if (item.itemType === 'equipment') {
                                const equipButton = document.createElement('button');
                                equipButton.textContent = '장착';

                                // 장착 버튼 클릭 시 로직
                                equipButton.onclick = async () => {
                                    try {
                                        const response = await fetch('/api/equipment/equip', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type' : 'application/json',
                                            },
                                            body: JSON.stringify({
                                                userId: player.id,
                                                itemCode: item.itemCode
                                            }),
                                        });

                                        if (response.ok) {
                                            console.log(`${item.itemName} 장착 성공!`);

                                            const inventoryUI = document.getElementById('inventory-ui');
                                            inventoryUI.classList.add('hidden');
                                            await toggleInventory();

                                            // 캐릭터 정보창이 열려 있는지 확인
                                            const statusUI = document.getElementById('character-status-ui');
                                            if (!statusUI.classList.contains('hidden')) {
                                                // 열려 있다면 내용만 새로고침
                                                await refreshCharacterStatus();
                                            }

                                        } else {
                                            // 서버에서 보낸 에러 메시지 처리
                                            const errorText = await response.text();
                                            console.error('장착 실패 : ', errorText);
                                            alert('장착에 실패했습니다 : ' + errorText);
                                        }
                                    } catch (error) {
                                        console.error('장착 요청 중 에러 발생 : ', error);
                                    }
                                };
                                li.appendChild(equipButton);
                            } else if (item.itemType === 'consumable') {
                                const useButton = document.createElement('button');
                                useButton.textContent = '사용';
                                useButton.onclick = async () => {
                                    try {
                                        const response = await fetch('/api/inventory/use', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                userId: player.id,
                                                itemCode: item.itemCode
                                            })
                                        });
                                        if (response.ok) {
                                            console.log(`${item.itemName} 사용 요청 성공`);
                                            // 성공 시 인벤토리 창을 닫음 (UI는 WebSocket 응답으로 갱신)
                                            inventoryUI.classList.add('hidden');
                                        } else {
                                            alert('아이템 사용에 실패했습니다.');
                                        }
                                    } catch (error) {
                                        console.error('아이템 사용 요청 중 에러 발생 : ', error);
                                    }
                                };
                                li.appendChild(useButton);
                            }

                            // 아이템 정보 버튼 생성
                            const infoButton = document.createElement('button');
                            infoButton.textContent = '정보';
                            infoButton.onclick = () => {
                                showItemInfo(item); // 아이템 정보 표시 함수 호출
                            };
                            li.appendChild(infoButton);

                            inventoryList.appendChild(li);
                        });
                    }
                } catch (error) {
                    console.error("인벤토리 로딩 실패 : ", error);
                    inventoryList.innerHTML = '<li>정보를 불러올 수 없습니다.</li>';
                }
            }
        }

        // 아이템 상세 정보 창을 표시하는 함수
        function showItemInfo(item) {
            const infoUI = document.getElementById('item-info-ui');
            const nameEl = document.getElementById('item-info-name');
            const typeEl = document.getElementById('item-info-type');
            const statsEl = document.getElementById('item-info-stats');
            const closeBtn = document.getElementById('item-info-close-btn');

            // 정보 채우기
            nameEl.textContent = item.itemName;

            // 아이템 타입에 따라 유형 텍스트 결정
            let typeText = '';
            switch (item.itemType) {
                case 'equipment':
                    typeText = `부위 : ${item.slotName}`;
                    break;
                case 'consumable':
                    typeText = '유형 : 소모품';
                    break;
                default:
                    typeText = `유형 : ${item.itemType}`;
            }
            typeEl.textContent = typeText;
            statsEl.innerHTML = '';

            // 아이템의 능력치가 0이 아닐 경우에만 표시
            if (item.itemHp > 0) statsEl.innerHTML += `<p>HP + ${item.itemHp}</p>`;
            if (item.itemAp > 0) statsEl.innerHTML += `<p>AP + ${item.itemAp}</p>`;
            if (item.itemDp > 0) statsEl.innerHTML += `<p>DP + ${item.itemDp}</p>`;

            // 닫기 버튼 이벤트
            closeBtn.onclick = () => {
                infoUI.classList.add('hidden');
            };

            // 정보창 표시
            infoUI.classList.remove('hidden');
        }

        // 캐릭터 정보창 UI를 열고 닫는 함수
        async function toggleCharacterStatus(){
            statusUI.classList.toggle('hidden');

            if (!statusUI.classList.contains('hidden')) {
                // 캐릭터 정보창 내용 새로고침 함수 호출하여 UI 갱신
                await refreshCharacterStatus();
            }
        }

        // 캐릭터 정보창 내용 새로고침 함수
        async function refreshCharacterStatus() {
            try {
                const response = await fetch(`/api/characters/${player.id}/status`);
                const statusData = await response.json();

                // 능력치 정보 표시
                const statsDiv = document.getElementById('character-stats');
                statsDiv.innerHTML = `
                    <p>HP: ${statusData.currentHp} / ${statusData.characterHp}</p>
                    <p>AP: ${statusData.characterAp}</p>
                    <p>DP: ${statusData.characterDp}</p>
                    `;

                // 장비 정보 표시
                const equipmentDiv = document.getElementById('character-equipment');
                equipmentDiv.innerHTML = '';
                if (statusData.equippedItems && statusData.equippedItems.length >= 0) {
                    statusData.equippedItems.forEach(item => {
                        const equipP = document.createElement('p');

                        const itemText = document.createElement('span');
                        // equipP.textContent = `${item.slotCode}: ${item.itemName}`;
                        itemText.textContent = `${item.slotName}: ${item.itemName}`;
                        equipP.appendChild(itemText);

                        // 장착 해제 버튼 생성
                        const unequipButton = document.createElement('button');
                        unequipButton.textContent = '해제';
                        unequipButton.onclick = async () => {
                            try {
                                const unequipResponse = await fetch('/api/equipment/unequip', {
                                    method: 'POST',
                                    headers: {'Content-Type': 'application/json'},
                                    body: JSON.stringify({
                                        userId: player.id,
                                        slotCode: item.slotCode
                                    })
                                });

                                if (unequipResponse.ok) {
                                    console.log(`${item.itemName} 장착 해제 성공!`);
                                    // 성공 시 캐릭터 정보창을 닫았다가 다시 열어 갱신
                                    statusUI.classList.add('hidden');
                                    toggleCharacterStatus();
                                } else {
                                    alert('장착 해제에 실패했습니다.');
                                }
                            } catch (error) {
                                console.error('장착 해제 요청 중 에러 발생 : ', error);
                            }
                        };
                        equipP.appendChild(unequipButton);

                        equipmentDiv.appendChild(equipP);
                    });
                } else {
                    equipmentDiv.innerHTML = '<p>장착한 아이템이 없습니다.</p>';
                }
            } catch (error) {
                console.error("캐릭터 정보 갱신 실패 : ", error);
            }
        }

        // 몬스터 데이터 로딩 함수 (비동기) -250911
        async function loadMonsters() {
            try {
                const response = await fetch('/api/monsters');  // 서버 API 호출
                const serverMonsters = await response.json();

                monsters = serverMonsters.map(data => ({
                    spawnId: data.spawnId,
                    id: data.monsterCode,
                    name: data.monsterName,
                    lat: data.latitude,
                    lng: data.longitude,
                    hp: data.hp,
                    maxHp: data.hp,
                    ap: data.ap,
                    dp: data.dp,
                    image: new Image(),
                    // 클라이언트 렌더링에 필요한 추가 속성
                    canvasX: 0,
                    canvasY: 0,
                    displayWidth: 40,
                    displayHeight: 40,

                    // 몬스터의 전투 관련 속성 추가 -250912
                    state: 'idle',   // 몬스터의 현재 상태 (idle, chase, attack, dead)
                    aggroRange: 150,    // 사용자를 인식하고 추격을 시작하는 범위 (픽셀)
                    attackRange: 50,    // 공격을 시작하는 범위 (픽셀)
                    speed: 0.4,
                    lastAttackTime: 0,  // 마지막 공격 시간 (ms)
                    attackCooldown: 1000,    // 공격 간격(쿨타임) 1초 (ms)

                    // 리스폰 관련 속성 추가 -250912
                    respawnTime: 10000,      // 리스폰 대기 시간 (10초)
                    initialLat: data.latitude,  // 초기 스폰 위도
                    initialLng: data.longitude,  // 초기 스폰 경도

                    // 몬스터 사망 효과 구현 속성 추가 -250912
                    alpha: 1,    // 몬스터의 투명도 (1: 불투명, 0: 투명)

                    // 몬스터 피격 효과 구현 속성 추가 -250922
                    isHit: false,   // 피격 상태
                    hitTimestamp: 0 // 피격 시간

                }));

                // 각 몬스터 이미지 경로 설정 및 로드
                monsters.forEach(m => m.image.src = `/images/${m.id}.png`);
                console.log("몬스터 로딩 완료 : ", monsters);

            } catch (error) {
                console.error("몬스터 로딩 실패 : ", error);
            }
        }

        // 몬스터를 사용자 방향으로 이동시키는 함수 추가 -250912
        // 몬스터끼리 충돌 했을 때 서로를 살짝 밀어내며 비켜나가도록 하고 사용자 방향으로 이동시킴 -250919 (분리조향)
        // 사용자를 향하는 힘과 다른 몬스터를 밀어내는 힘을 합쳐 최종 움직임 결정
        function moveMonsterTowardsPlayer(monster) {

            // 분리조향 적용 -250919
            // 사용자를 향하는 기본 이동 벡터 계산
            const chaseDx = player.canvasX - monster.canvasX;
            const chaseDy = player.canvasY - monster.canvasY;
            const chaseMagnitude = Math.sqrt(chaseDx * chaseDx + chaseDy * chaseDy);

            let finalMoveX = 0;
            let finalMoveY = 0;

            if (chaseMagnitude > 0) {
                finalMoveX = (chaseDx / chaseMagnitude) * monster.speed;
                finalMoveY = (chaseDy / chaseMagnitude) * monster.speed;
            }

            // 다른 몬스터로부터의 분리 벡터 계산
            let separationX = 0;
            let separationY = 0;
            const separationRadius = 35;    // 서로 밀어내기 시작하는 거리(픽셀)
            const separationForce = 0.5;    // 밀어내는 힘의 강도

            for (const otherMonster of monsters) {
                // 본인이거나 죽은 몬스터는 무시
                if (monster.spawnId === otherMonster.spawnId || otherMonster.state === 'dead') continue;

                const dist = getDistance(monster.canvasX, monster.canvasY, otherMonster.canvasX, otherMonster.canvasY);

                // 다른 몬스터가 밀어내는 반경 안에 있을 경우
                if (dist < separationRadius) {
                    const awayDx = monster.canvasX - otherMonster.canvasX;
                    const awayDy = monster.canvasY - otherMonster.canvasY;
                    const awayMagnitude = Math.sqrt(awayDx * awayDx + awayDy * awayDy);

                    if (awayMagnitude > 0) {
                        // 다른 몬스터로부터 멀어지는 방향으로 힘을 더함.
                        separationX += (awayDx / awayMagnitude) * separationForce;
                        separationY += (awayDy / awayMagnitude) * separationForce;
                    }
                }
            }

            // 최종 이동 벡터 = (사용자 추격 벡터 + 몬스터 분리 벡터)
            finalMoveX += separationX;
            finalMoveY += separationY;

            // 최종 이동 벡터를 위도/경도로 변환하여 위치 업데이트
            if (finalMoveX !== 0 || finalMoveY !== 0) {
                const delta_lng = finalMoveX * delta_lng_per_pixel;
                const delta_lat = finalMoveY * delta_lat_per_pixel;

                monster.lat += delta_lat;
                monster.lng += delta_lng;
            }

        }

        // 몬스터의 상태를 업데이트하고 행동을 결정하는 함수 추가 -250912
        function updateMonsterAI(monster) {

            // 몬스터 피격 효과 처리 -250922
            const hitEffectDuration = 200;  // 0.2초 지속
            if (monster.isHit && Date.now() - monster.hitTimestamp > hitEffectDuration) {
                monster.isHit = false;
            }

                if (monster.state === 'dead' || player.isDead) return;

                const distanceToPlayer = getDistance(monster.canvasX, monster.canvasY, player.canvasX, player.canvasY);
                const now = Date.now(); // 현재 시간

                // 디버깅 로그(테스트 후 비활성화)
                // console.log(`Monster ${monster.name} state: ${monster.state}, distance: ${distanceToPlayer.toFixed(2)}, aggro: ${monster.aggroRange}`);

                switch (monster.state) {
                    case 'idle':
                        if (distanceToPlayer < monster.aggroRange) {                // 사용자가 인식 범위에 들어오면 추격 시작
                            monster.state = 'chase';
                            console.log(`${monster.name} aggro triggered! Starting chase.`);    // 디버깅 로그(테스트 후 비활성화)
                        }
                        break;
                    case 'chase':
                        if (distanceToPlayer < monster.attackRange) {               // 사용자가 공격 범위에 들어오면 공격
                            monster.state = 'attack';                            // 몬스터 공격 상태 구현 후 활성화
                            console.log(`${monster.name} entering attack range`);   // 디버깅 로그(테스트 후 비활성화)
                        } else if (distanceToPlayer > monster.aggroRange * 1.5) {   // 사용자가 너무 멀어지면 추격 중지
                            monster.state = 'idle';
                            console.log(`${monster.name} lost sight, back to idle`);    // 디버깅 로그(테스트 후 비활성화)
                        } else {                                                    // 사용자를 향해 이동
                            moveMonsterTowardsPlayer(monster);
                        }
                        break;
                    case 'attack':
                        // 공격 범위 내에 있으면 데미지 주기 (쿨타임 적용)
                        if (distanceToPlayer < monster.attackRange) {
                            if (now - monster.lastAttackTime > monster.attackCooldown) {
                                // 사용자를 공격 했다는 메시지를 서버에 전송
                                if (socket && socket.readyState === WebSocket.OPEN) {
                                    const monsterAttackMessage = {
                                        type: "MONSTER_ATTACK",
                                        monsterId: monster.id,
                                        monsterSpawnId: monster.spawnId
                                    };
                                    socket.send(JSON.stringify(monsterAttackMessage));
                                }
                                monster.lastAttackTime = now;   // 공격 간격은 클라이언트에서도 돌려야 중복 요소 방지

                                // 사용자 사망 체크
                                if (player.currentHp <= 0) {
                                    player.currentHp = 0;
                                    console.log('Player defeated!');
                                }
                            }
                        } else {
                            // 공격 범위를 벗어나면 chase로 복귀
                            monster.state = 'chase';
                            console.log(`${monster.name} out of attack range, resuming chase`);
                        }
                        break;

                    case 'dying':
                        // 투명도 점차 감소
                        monster.alpha -= 0.01;  // 투명해지는 속도 조절
                        if (monster.alpha <= 0) {
                            monster.alpha = 0;
                            monster.state = 'dead'; // 투명도가 0이되면 'dead' 상태로 변경

                        }
                        break;
                }
        }

        // 충돌 검사 헬퍼 함수 (기존 유지, 로그 추가)
        function pointInPolygon(latlng, polygon) {
            const path = polygon.getPaths().getAt(0);
            let inside = false;
            for (let i = 0, j = path.getLength() - 1; i < path.getLength(); j = i++) {
                const xi = path.getAt(i).lng(), yi = path.getAt(i).lat();
                const xj = path.getAt(j).lng(), yj = path.getAt(j).lat();
                const intersect = ((yi > latlng.lat()) !== (yj > latlng.lat())) &&
                    (latlng.lng() < (xj - xi) * (latlng.lat() - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        }

        function isColliding(latlng) {
            if (!latlng) return false;
            for (const poly of collisionPolygons) {
                if (poly.precomputedBounds.hasLatLng(latlng)) {
                    if (pointInPolygon(latlng, poly)) {
                        console.log(`Collision at LatLng (${latlng.lat()}, ${latlng.lng()})`);
                        return true;
                    }
                }
            }
            return false;
        }

        // 5. 캐릭터 위치 및 맵 업데이트 함수 (LatLng 기반 리팩토링)
        // 몬스터 위치 계산 로직 추가 -250911
        function update() {

            // 사용자 피격 효과 추가 -250922
            const hitEffectDuration = 200;
            if (player.isHit && Date.now() - player.hitTimestamp > hitEffectDuration) {
                player.isHit = false;
            }

            // 사용자 사망 시 이동 및 공격 비활성화
            if (player.isDead) {
                return;
            }

            const moveX = (keys.a ? -player.speed : 0) + (keys.d ? player.speed : 0);
            const moveY = (keys.w ? -player.speed : 0) + (keys.s ? player.speed : 0);
            player.moving = (moveX !== 0 || moveY !== 0);

            // 수정 : 캐릭터가 멈춰있어도 맵 패닝이 필요하므로 return 제거
            // if (!player.moving) return; // 팬닝 중 이동 스킵 -> 이동 로직 항상 실행

            // 새 LatLng 계산
            const delta_lng = moveX * delta_lng_per_pixel;
            const delta_lat = moveY * delta_lat_per_pixel;
            const new_lat = player.lat + delta_lat;
            const new_lng = player.lng + delta_lng;

            // 사용자 캐릭터와 몬스터 충돌 검사 로직 -250919
            let isCollidingWithMonster = false;
            const playerCollisionRadius = 40;

            // 사용자의 다음 위치를 기준으로 몬스터와 충돌하는지 확인
            for (const monster of monsters) {
                if (monster.state === 'dead') continue;

                // getDistance는 픽셀 기반이므로, 사용자의 다음 위치도 픽셀 기준으로 계산
                const nextPlayerCanvasX = player.canvasX + moveX;
                const nextPlayerCanvasY = player.canvasY + moveY;

                // 사용자의 다음 위치와 몬스터의 현재 위치 사이의 거리 계산
                const dist = getDistance(
                    nextPlayerCanvasX,
                    nextPlayerCanvasY,
                    monster.canvasX,
                    monster.canvasY
                );

                if (dist < playerCollisionRadius) {
                    isCollidingWithMonster = true;
                    break;
                }
            }

            // 충돌 박스 half degree 계산
            const half_width_degree = (player.collisionWidth / 2) * delta_lng_per_pixel;
            const half_height_degree = (player.collisionHeight / 2) * Math.abs(delta_lat_per_pixel);

            // 충돌 포인트 (4코너 + 중심)
            const collisionPoints = [
                new naver.maps.LatLng(new_lat + half_height_degree, new_lng - half_width_degree), // top left
                new naver.maps.LatLng(new_lat + half_height_degree, new_lng + half_width_degree), // top right
                new naver.maps.LatLng(new_lat - half_height_degree, new_lng - half_width_degree), // bottom left
                new naver.maps.LatLng(new_lat - half_height_degree, new_lng + half_width_degree), // bottom right
                new naver.maps.LatLng(new_lat, new_lng) // center
            ];

            // 충돌 체크
            let colliding = false;
            for (const point of collisionPoints) {
                if (isColliding(point)) {
                    colliding = true;
                    break;
                }
            }

            if (!colliding && !isCollidingWithMonster) {    // 사용자 캐릭터와 몬스터 충돌 로직 -250919
                player.lat = new_lat;
                player.lng = new_lng;
            } else {
                console.log('Movement blocked due to collision');
            }

            // 애니메이션 방향 설정 (기존)
            // 공격 상태가 아닐 때만 이동 방향을 갱신
            if (!player.isAttacking) {
                if (keys.w) {
                    player.frameY = 3; // 위
                    player.directionOffsetX = 0;
                } else if (keys.s) {
                    player.frameY = 0; // 아래
                    player.directionOffsetX = 0;
                } else if (keys.a) {
                    player.frameY = 1; // 왼쪽
                    player.directionOffsetX = 0;
                } else if (keys.d) {
                    player.frameY = 2; // 오른쪽
                    player.directionOffsetX = 0;
                }
            }

            // LatLng -> 캔버스 픽셀 계산 및 맵 패닝 대체
            // 맵의 중심을 항상 사용자의 새로운 LatLng 좌표로 설정
            map.setCenter(new naver.maps.LatLng(player.lat, player.lng));

            // 사용자는 항상 캔버스의 정중앙에 그려짐.
            player.canvasX = (canvas.width / 2);
            player.canvasY = (canvas.height / 2);

            // 몬스터 위치 계산(사용자의 중심 좌표 기준)
            const projection = map.getProjection();
            const playerOffset = projection.fromCoordToOffset(map.getCenter());

            monsters.forEach(monster => {
                const monsterOffset = projection.fromCoordToOffset(new naver.maps.LatLng(monster.lat, monster.lng));
                const relativeX = monsterOffset.x - playerOffset.x;
                const relativeY = monsterOffset.y - playerOffset.y;

                // 플레이어 중심으로부터의 상대 위치 계산
                monster.canvasX = player.canvasX + relativeX;
                monster.canvasY = player.canvasY + relativeY;

                // 몬스터 AI 로직 -250912
                updateMonsterAI(monster);
            });

            // 데미지 숫자 업데이트 - 250922 데미지 화면 표시 추가
            // 배열을 복사해서 순회해야 안전하게 요소를 제거할 수 있음.
            [...damageNumbers].forEach((num, index) => {
                num.y += num.velocity;  // 위로 이동
                num.alpha -= 0.02;      // 투명도 서서히 감소

                // 완전히 투명해지면 배열에서 제거
                if (num.alpha <= 0) {
                    damageNumbers.splice(index, 1);
                }
            });
        }

        // 6. 그리기 함수 (캔버스 픽셀 사용)
        // 몬스터 그리기 로직 추가 -250911
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 1. 사용자 그리기
            if (!player.isDead) {

                // 공격 상태에 따라 그릴 이미지와 프레임을 결정
                let imageToDraw;
                let frameToDraw;
                let direction;

                // frameY를 방향 문자열로 반환
                switch (player.frameY) {
                    case 0: direction = 'down'; break;
                    case 1: direction = 'left'; break;
                    case 2: direction = 'right'; break;
                    case 3: direction = 'up'; break;
                }

                // 상태에 따라 그릴 이미지와 프레임 결정
                if (player.isAttacking) {
                    imageToDraw = playerImage.attack[direction];
                    frameToDraw = player.attackFrameX;
                } else if (player.moving) {
                    imageToDraw = playerImage.walk[direction];
                    frameToDraw = player.frameX;
                } else {
                    imageToDraw = playerImage.idle[direction];
                    frameToDraw = player.frameX;
                }

                // 이미지가 로드되었는지 확인 후 그리기
                if (imageToDraw && imageToDraw.complete) {
                    ctx.save();

                    // 사용자 피격 효과 추가 -250922
                    if (player.isHit) {
                        ctx.filter = 'brightness(1.5) sepia(1) hue-rotate(-50deg) saturate(5)';
                    }

                    ctx.drawImage(
                        imageToDraw,
                        frameToDraw * player.width, // 가로 프레임 선택
                        0,                          // 세로 프레임 없음(이미지 한 줄)
                        // (player.directionOffsetX + frameToDraw) * player.width,
                        // player.frameY * player.height,
                        player.width,
                        player.height,
                        player.canvasX - player.displayWidth / 2,
                        player.canvasY - player.displayHeight / 2,
                        player.displayWidth,
                        player.displayHeight
                    );
                    ctx.restore();

                }

                // // 무기를 장착했다면 무기 그리기 (공격 중에도 계속 그림)
                // if (player.equippedWeapon) {
                //     const weapon = player.equippedWeapon;
                //     let weaponOffsetX = 0;
                //     let weaponOffsetY = 0;
                //
                //     // 사용자 방향에 따라 무기 위치 조정
                //     if (player.frameY === 0) {
                //         weaponOffsetX = player.displayWidth * -0.5;
                //         weaponOffsetY = player.displayHeight * 0.0;
                //     } else if (player.frameY === 1) {
                //         weaponOffsetX = -player.displayWidth * 0.35;
                //         weaponOffsetY = player.displayHeight * 0.0;
                //     } else if (player.frameY === 2) {
                //         weaponOffsetX = player.displayWidth * 0.5;
                //         weaponOffsetY = player.displayHeight * 0.0;
                //     } else if (player.frameY === 3) {
                //         weaponOffsetX = player.displayWidth * 0.6;
                //         weaponOffsetY = player.displayHeight * -0.1;
                //     }
                //
                //     // 사용자 방향에 따라 무기 스프라이트 인덱스 설정
                //     let weaponSpriteIndex = 0;
                //     if (player.frameY === 2 || player.frameY === 3) {
                //         weaponSpriteIndex = 1;
                //     }
                //
                //     // 캔버스 상태 저장
                //     ctx.save();
                //
                //     // 회전축 설정 및 이동 (무기 이미지의 중심으로 이동)
                //     // 무기가 그려질 최종 위치 계산
                //     const drawX = player.canvasX + weaponOffsetX;
                //     const drawY = player.canvasY + weaponOffsetY;
                //
                //     // 회전 중심점 (Pivot Point): 무기 표시 너비와 높이의 절반을 더함
                //     const pivotX = drawX + weapon.displayWidth / 2;
                //     const pivotY = drawY + weapon.displayHeight / 2;
                //
                //     ctx.translate(pivotX, pivotY);
                //
                //     // 공격 중일 때 회전 적용
                //     if (player.isAttacking) {
                //         let rotationAngle = 0;
                //         let finalTranslateX = 0;    // 회전 후 추가로 이동할 X 좌표
                //         let finalTranslateY = 0;    // 회전 후 추가로 이동할 Y 좌표
                //
                //         // 공격 방향에 따라 회전 각도 및 이동 값 설정
                //         if(player.attackDirection === 'down') {
                //             rotationAngle = Math.PI / -1.3; // 아래 방향은 기본 각도
                //             finalTranslateX = -weapon.displayWidth * 0.75;
                //             finalTranslateY = weapon.displayHeight * -0.35;
                //         } else if (player.attackDirection === 'left') {
                //             rotationAngle = -Math.PI / 3.5;
                //             finalTranslateX = -weapon.displayWidth * 0.3;
                //             finalTranslateY = -weapon.displayHeight * -0.3;
                //         } else if (player.attackDirection === 'right') {
                //             rotationAngle = Math.PI / 3.5;
                //             finalTranslateX = weapon.displayWidth * 0.4;
                //             finalTranslateY = -weapon.displayHeight * -0.1;
                //         } else if (player.attackDirection === 'up') {
                //             rotationAngle = Math.PI / -3.8;
                //             finalTranslateX = -weapon.displayWidth * -0.1;
                //             finalTranslateY = -weapon.displayHeight * 0.4;
                //         }
                //
                //         ctx.rotate(rotationAngle);
                //         ctx.translate(finalTranslateX, finalTranslateY);    // 회전 후 추가 위치 조정
                //     }
                //
                //     // 무기 그리기
                //     // translate로 좌표계를 이동했기 때문에, 이미지는 회전축 중심(0,0) 기준으로 그려야 함.
                //     // pivotX/pivotY를 기준으로 이미지를 중앙에 위치시키려면 (-width/2, -height/2) 위치에 그림.
                //     ctx.drawImage(
                //         weapon.image,
                //         weaponSpriteIndex * weapon.width,
                //         0,
                //         weapon.width,
                //         weapon.height,
                //         -weapon.displayWidth / 2,
                //         -weapon.displayHeight / 2,
                //         // player.canvasX + weaponOffsetX,
                //         // player.canvasY + weaponOffsetY,
                //         weapon.displayWidth,    // 무기의 표시 크기
                //         weapon.displayHeight
                //     );
                //
                //     // 캔버스 상태 복원
                //     ctx.restore();
                // }

            }

            // 몬스터 그리기
            // 살아있는 몬스터만 그리기
            monsters.forEach(monster => {
                if (monster.state !== 'dead' && monster.image.complete) {

                    ctx.save();
                    ctx.globalAlpha = monster.alpha;

                    // 피격 시 이미지 흔들기 효과
                    let drawX = monster.canvasX;
                    let drawY = monster.canvasY;
                    const shakeIntensity = 5;

                    // 몬스터가 피격 상태 일 때 붉게 표시 -250922 + 피격시 이미지 흔들기
                    if (monster.isHit) {
                        ctx.filter = 'brightness(1.5) sepia(1) hue-rotate(-50deg) saturate(5)';
                        drawX += (Math.random() - 0.5) * shakeIntensity;
                        drawY += (Math.random() - 0.5) * shakeIntensity;
                    }

                    ctx.drawImage(
                        monster.image,
                        drawX - monster.displayWidth / 2, // 중심점 기준으로 그리기
                        drawY - monster.displayHeight / 2,
                        monster.displayWidth,
                        monster.displayHeight
                    );

                    // 몬스터 HP 바 그리기
                    ctx.fillStyle = 'red';
                    ctx.fillRect(monster.canvasX - monster.displayWidth / 2, monster.canvasY - monster.displayHeight / 2 - 10, monster.displayWidth, 5);
                    ctx.fillStyle = 'green';
                    ctx.fillRect(monster.canvasX - monster.displayWidth / 2, monster.canvasY - monster.displayHeight / 2 - 10, monster.displayWidth * (monster.hp / monster.maxHp), 5);

                    ctx.restore();
                }
            });

            // 데미지 숫자 화면에 그리기 -250922 데미지 화면 표시 추가
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = 'yellow';

            damageNumbers.forEach(num => {
                ctx.save();
                ctx.globalAlpha = num.alpha;
                ctx.fillText(num.value, num.x, num.y);
                ctx.restore();
            });

            // 사용자 캐릭터 HP 바 추가
            ctx.fillStyle = 'red';
            ctx.fillRect(canvas.width / 2 - 25, 20, 100, 10);    // 배경
            ctx.fillStyle = 'green';
            ctx.fillRect(canvas.width / 2 - 25, 20, 100 * (player.currentHp / player.hp), 10);   // HP
            ctx.fillStyle = 'black';
            ctx.font = '12px Arial';
            ctx.fillText(`HP: ${player.currentHp}/${player.hp}`, canvas.width / 2 - 25, 18);

        }

        // 7. 메인 게임 루프와 애니메이션 처리 함수 (기존 유지)
        let lastTime = 0;
        function gameLoop(timestamp) {
            const deltaTime = timestamp - lastTime;
            lastTime = timestamp;
            update();       // 사용자 이동 업데이트
            handlePlayerFrame(deltaTime);       // 사용자 이동 스프라이트 애니메이션

            // 공격 이펙트 애니메이션 처리
            if (player.isAttacking) {
                handlePlayerAttackFrame(deltaTime);
            }

            draw();
            requestAnimationFrame(gameLoop);
        }

        // 사용자 이동 애니메이션 처리 함수
        function handlePlayerFrame(deltaTime) {

            if (player.isAttacking) {
                player.frameX = 0;
                return;
            }

            player.frameTimer += deltaTime;
            if (player.frameTimer > player.frameInterval) {
                if (player.frameX < player.maxFrame) {
                    player.frameX++;
                } else {
                    player.frameX = 0;
                }
                player.frameTimer = 0;
            }

        }

        // 사용자 공격 애니메이션 처리 함수
        function handlePlayerAttackFrame(deltaTime) {
            if (!player.isAttacking) return;    // 공격 중이 아니면 실행되지 않음.

            player.attackFrameTimer += deltaTime;
            if (player.attackFrameTimer > player.attackFrameInterval) {
                player.attackFrameX++;  // 공격 프레임 증가
                player.attackFrameTimer = 0;

                // 애니메이션 종료 시
                if (player.attackFrameX > player.maxAttackFrame) {
                    player.attackFrameX = 0;    // 프레임 초기화
                    player.isAttacking = false; // 공격 상태 해제
                }
            }
        }

        // 두 점 사이의 거리를 계산하는 함수(전투)
        function getDistance(x1, y1, x2, y2) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            return Math.sqrt(dx * dx + dy * dy);
        }

        // 게임 리소스 및 데이터 초기화 함수
        async function initializeGame() {
            // API를 통해 플레이어 데이터 로드 및 객체 생성
            await loadPlayer("misa01");

            // 플레이어 객체가 성공적으로 생성된 후에만 다음 로직 실행
            if (player) {

                // 사용자 로딩 후 WebSocket 연결
                connectWebSocket();

                // 12개의 사용자 이미지 모두 로드
                const states = ['idle', 'walk', 'attack'];
                const directions = ['down', 'left', 'right', 'up'];

                playerImage = { idle: {}, walk: {}, attack: {} };
                states.forEach(state => {
                    directions.forEach(dir => {
                        playerImage[state][dir] = new Image();
                        playerImage[state][dir].src = `/images/${state}_${dir}.png`;
                    });
                });

                // 무기 이미지
                weaponImage = new Image();
                weaponImage.src = '/images/sword2.png';

                // 무기 정보 객체 생성
                sword = {
                    image: weaponImage,
                    width: 1024,
                    height: 1024,
                    displayWidth: 44.8,
                    displayHeight: 44.8
                };

                // 게임 시작 시 무기 기본 장착(테스트용)
                player.equippedWeapon = sword;

                // 충돌 영역 초기화
                initializeCollision();

                // 키보드 이벤트 리스너 등록
                setupEventListeners();

                // 게임 시작 (초기 캔버스 위치 계산)
                const projection = map.getProjection();
                const centerOffset = projection.fromCoordToOffset(map.getCenter());
                const playerOffset = projection.fromCoordToOffset(new naver.maps.LatLng(player.lat, player.lng));
                player.canvasX = (playerOffset.x - centerOffset.x) + (canvas.width / 2);
                player.canvasY = (playerOffset.y - centerOffset.y) + (canvas.height / 2);

                // 몬스터 로드
                await loadMonsters();

                // 모든 준비가 끝나면 게임 루프 시작
                gameLoop(0);

            }
        }

    initializeGame();

    }, 0);
};