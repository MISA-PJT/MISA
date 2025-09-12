let monsters = [];  // 모든 몬스터 객체를 담을 배열
let player;

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
        let playerImage;
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

        function connectWebSocket() {
            // "ws://" 는 WebSocket 프로토콜
            socket = new WebSocket("ws://localhost:8080/game");

            // WebSocket 연결 성공 이벤트
            socket.onopen = function (event) {
                console.log("서버와 WebSocket 연결 성공!");
            };

            // 서버로부터 메시지를 수신했을 때 이벤트
            socket.onmessage = function (event) {
                const message = JSON.parse(event.data);
                console.log("서버로부터 메시지 수신 : ", message);
                // TODO: 서버가 보낸 데이터 종류에 따라 분기 처리 필요(예: 몬스터 위치 업데이트, 아이템 획득 알림 등)
            };

            // WebSocket 연결이 닫혔을 때 이벤트
            socket.onclose = function (event) {
                console.log("WebSocket 연결이 끊겼습니다.");
                // TODO: 연결 재시도 로직 추가 필요
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
                const key = e.key.toLowerCase();
                if (['w', 'a', 's', 'd'].includes(key)) keys[key] = true;

                // 공격
                if (e.key.toLowerCase() === 'k' && !player.isAttacking) {
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
                                    const damage = Math.max(1, player.ap - monster.dp);
                                    monster.hp -= damage;
                                    console.log(`${monster.name}에게 ${damage}의 데미지! 남은 HP: ${monster.hp}`);

                                    // 몬스터 처치 판정
                                    if (monster.hp <= 0) {
                                        monster.hp = 0;
                                        monster.state = 'dying';
                                        console.log(`${monster.name}을(를) 처치했습니다!`);

                                    }
                                }
                            }
                        }
                    });
                }
            });
            window.addEventListener('keyup', (e) => {
                const key = e.key.toLowerCase();
                if (['w', 'a', 's', 'd'].includes(key)) keys[key] = false;
            });
        }

        // 게임 로직 함수들 위치 이동 -250911

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
                    width: 224,
                    height: 224,
                    speed: 0.5,
                    displayWidth: 44.8,
                    displayHeight: 44.8,
                    frameX: 0,
                    frameY: 0,
                    maxFrame: 1,
                    directionOffsetX: 0,
                    moving: false,
                    fps: 10,
                    frameTimer: 0,
                    frameInterval: 1000 / 10,
                    collisionWidth: 50,
                    collisionHeight: 50,

                    equippedWeapon: null, // 현재 장착한 무기 정보

                    // 공격 이펙트 관련 추가 속성
                    isAttacking: false,
                    attackEffectFrameX: 0,
                    attackEffectMaxFrame: 2,    // 이펙트 스트라이프 시트의 최대 프레임(인덱스)
                    attackEffectFps: 20,        // 이펙트가 빠르게 지나가도록 FPS 높임
                    attackEffectFrameTimer: 0,
                    attackEffectFrameInterval: 1000 / 20,

                    attackDirection: 'down'     // 공격 방향 (무기 위치 및 이펙트 위치에 활용)
                };
                console.log("사용자 데이터 로딩 완료", player);
            } catch (error) {
                console.error("사용자 로딩 실패 : ", error);
            }
        }

        // 몬스터 데이터 로딩 함수 (비동기) -250911
        async function loadMonsters() {
            try {
                const response = await fetch('/api/monsters');  // 서버 API 호출
                const serverMonsters = await response.json();

                monsters = serverMonsters.map(data => ({
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
                    alpha: 1    // 몬스터의 투명도 (1: 불투명, 0: 투명)

                }));

                // 각 몬스터 이미지 경로 설정 및 로드
                monsters.forEach(m => m.image.src = `/images/${m.id}.png`);
                console.log("몬스터 로딩 완료 : ", monsters);

            } catch (error) {
                console.error("몬스터 로딩 실패 : ", error);
            }
        }

        // 몬스터를 플레이어 방향으로 이동시키는 함수 추가 -250912
        function moveMonsterTowardsPlayer(monster) {

                // 픽셀 기반 방향 벡터 계산
                const dx = player.canvasX - monster.canvasX;
                const dy = player.canvasY - monster.canvasY;
                const magnitude = Math.sqrt(dx * dx + dy * dy);

                if (magnitude > 0) {

                    // 방향 벡터 정규화 및 속도 적용
                    const movePixelX = (dx / magnitude) * monster.speed;
                    const movePixelY = (dy / magnitude) * monster.speed;

                    // 픽셀 이동량을 위도/경도 변화량으로 변환
                    const delta_lng = movePixelX * delta_lng_per_pixel;
                    const delta_lat = movePixelY * delta_lat_per_pixel;

                    // 몬스터의 새 위치 (충돌 검사 미적용)
                    const newLat = monster.lat + delta_lat;
                    const newLng = monster.lng + delta_lng;

                    monster.lat = newLat;
                    monster.lng = newLng;
                }
        }

        // 몬스터의 상태를 업데이트하고 행동을 결정하는 함수 추가 -250912
        function updateMonsterAI(monster) {
                if (monster.state === 'dead') return;

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
                                // 사용자에게 데미지
                                // 데미지 계산 (최소 1 적용) : 몬스터 공격력 - 사용자 방어력
                                const damage = Math.max(1, monster.ap - player.dp);
                                player.currentHp -= damage;
                                monster.lastAttackTime = now;
                                console.log(`${monster.name} attacks for ${damage} damage! Player HP: ${player.currentHp}`);

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

                            // 리스폰 타이머 설정
                            setTimeout(() => {
                                monster.state = 'idle';
                                monster.hp = monster.maxHp;
                                monster.lat = monster.initialLat;
                                monster.lng = monster.initialLng;
                                monster.alpha = 1;  // 리스폰 시 투명도 복구
                                console.log(`${monster.name}이(가) 리스폰 되었습니다.`);
                            }, monster.respawnTime);
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

            if (!colliding) {
                player.lat = new_lat;
                player.lng = new_lng;
            } else {
                console.log('Movement blocked due to collision');
            }

            // 애니메이션 방향 설정 (기존)
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

            // LatLng -> 캔버스 픽셀 계산 및 맵 패닝 대체
            // 맵의 중심을 항상 사용자의 새로운 LatLng 좌표로 설정
            map.setCenter(new naver.maps.LatLng(player.lat, player.lng));

            // 사용자는 항상 캔버스의 정중앙에 그려짐.
            player.canvasX = (canvas.width / 2) - (player.displayWidth / 2);
            player.canvasY = (canvas.height / 2) - (player.displayHeight / 2);

            // 몬스터 위치 계산
            const projection = map.getProjection();
            const playerOffset = projection.fromCoordToOffset(new naver.maps.LatLng(player.lat, player.lng));

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

        }

        // 6. 그리기 함수 (캔버스 픽셀 사용)
        // 몬스터 그리기 로직 추가 -250911
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 1. 사용자 그리기
            ctx.drawImage(
                playerImage,
                (player.directionOffsetX + player.frameX) * player.width,
                player.frameY * player.height,
                player.width,
                player.height,
                player.canvasX,
                player.canvasY,
                player.displayWidth,
                player.displayHeight
            );

            // 무기를 장착했다면 무기 그리기 (공격 중에도 계속 그림)
            if (player.equippedWeapon) {
                const weapon = player.equippedWeapon;
                let weaponOffsetX = 0;
                let weaponOffsetY = 0;

                // 사용자 방향에 따라 무기 위치 조정
                if (player.frameY === 0) {
                    weaponOffsetX = player.displayWidth * -0.5;
                    weaponOffsetY = player.displayHeight * 0.0;
                } else if (player.frameY === 1) {
                    weaponOffsetX = -player.displayWidth * 0.35;
                    weaponOffsetY = player.displayHeight * 0.0;
                } else if (player.frameY === 2) {
                    weaponOffsetX = player.displayWidth * 0.5;
                    weaponOffsetY = player.displayHeight * 0.0;
                } else if (player.frameY === 3) {
                    weaponOffsetX = player.displayWidth * 0.6;
                    weaponOffsetY = player.displayHeight * -0.1;
                }

                // 사용자 방향에 따라 무기 스프라이트 인덱스 설정
                let weaponSpriteIndex = 0;
                if (player.frameY === 2 || player.frameY === 3) {
                    weaponSpriteIndex = 1;
                }

                // 캔버스 상태 저장
                ctx.save();

                // 회전축 설정 및 이동 (무기 이미지의 중심으로 이동)
                // 무기가 그려질 최종 위치 계산
                const drawX = player.canvasX + weaponOffsetX;
                const drawY = player.canvasY + weaponOffsetY;

                // 회전 중심점 (Pivot Point): 무기 표시 너비와 높이의 절반을 더함
                const pivotX = drawX + weapon.displayWidth / 2;
                const pivotY = drawY + weapon.displayHeight / 2;

                ctx.translate(pivotX, pivotY);

                // 공격 중일 때 회전 적용
                if (player.isAttacking) {
                    let rotationAngle = 0;
                    let finalTranslateX = 0;    // 회전 후 추가로 이동할 X 좌표
                    let finalTranslateY = 0;    // 회전 후 추가로 이동할 Y 좌표

                    // 공격 방향에 따라 회전 각도 및 이동 값 설정
                    if(player.attackDirection === 'down') {
                        rotationAngle = Math.PI / -1.3; // 아래 방향은 기본 각도
                        finalTranslateX = -weapon.displayWidth * 0.75;
                        finalTranslateY = weapon.displayHeight * -0.35;
                    } else if (player.attackDirection === 'left') {
                        rotationAngle = -Math.PI / 3.5;
                        finalTranslateX = -weapon.displayWidth * 0.3;
                        finalTranslateY = -weapon.displayHeight * -0.3;
                    } else if (player.attackDirection === 'right') {
                        rotationAngle = Math.PI / 3.5;
                        finalTranslateX = weapon.displayWidth * 0.4;
                        finalTranslateY = -weapon.displayHeight * -0.1;
                    } else if (player.attackDirection === 'up') {
                        rotationAngle = Math.PI / -3.8;
                        finalTranslateX = -weapon.displayWidth * -0.1;
                        finalTranslateY = -weapon.displayHeight * 0.4;
                    }

                    ctx.rotate(rotationAngle);
                    ctx.translate(finalTranslateX, finalTranslateY);    // 회전 후 추가 위치 조정
                }

                // 무기 그리기
                // translate로 좌표계를 이동했기 때문에, 이미지는 회전축 중심(0,0) 기준으로 그려야 함.
                // pivotX/pivotY를 기준으로 이미지를 중앙에 위치시키려면 (-width/2, -height/2) 위치에 그림.
                ctx.drawImage(
                    weapon.image,
                    weaponSpriteIndex * weapon.width,
                    0,
                    weapon.width,
                    weapon.height,
                    -weapon.displayWidth / 2,
                    -weapon.displayHeight / 2,
                    // player.canvasX + weaponOffsetX,
                    // player.canvasY + weaponOffsetY,
                    weapon.displayWidth,    // 무기의 표시 크기
                    weapon.displayHeight
                );

                // 캔버스 상태 복원
                ctx.restore();
            }

            // 몬스터 그리기
            // 살아있는 몬스터만 그리기
            monsters.forEach(monster => {
                if (monster.state !== 'dead' && monster.image.complete) {

                    ctx.save();
                    ctx.globalAlpha = monster.alpha;

                    ctx.drawImage(
                        monster.image,
                        monster.canvasX - monster.displayWidth / 2, // 중심점 기준으로 그리기
                        monster.canvasY - monster.displayHeight / 2,
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

            // 공격 중일 때 이펙트 그리기 (무기 위에 그려지도록 마지막에 호출)
            if (player.isAttacking) {
                let effectOffsetX = 0;
                let effectOffsetY = 0;
                let effectWidth = player.displayWidth * 2.5;    // 이펙트 크기 조절
                let effectHeight = player.displayHeight * 2.5;

                // 공격 방향에 따라 이펙트 위치 조정(이펙트 이미지의 형태에 따라 조절 필요)
                if (player.attackDirection === 'down') {
                    effectOffsetX = -player.displayWidth * 0.4;
                    effectOffsetY = player.displayHeight * 0.2;
                } else if (player.attackDirection === 'left') {
                    effectOffsetX = -player.displayWidth * 1.6;
                    effectOffsetY = player.displayHeight * -0.6;
                } else if (player.attackDirection === 'right') {
                    effectOffsetX = player.displayWidth * 0.8;
                    effectOffsetY = player.displayHeight * -0.6;
                } else if (player.attackDirection === 'up') {
                    effectOffsetX = -player.displayWidth * 0.2;
                    effectOffsetY = -player.displayHeight * 1.6;
                }

                if (attackEffectImage.width >0) {
                    ctx.drawImage(
                        attackEffectImage,
                        player.attackEffectFrameX * attackEffectImage.width / (player.attackEffectMaxFrame + 1),    // 이펙트 프레임 계산
                        0,  // 이펙트 스프라이트 시트가 한 줄 일 경우
                        attackEffectImage.width / (player.attackEffectMaxFrame + 1),
                        attackEffectImage.height,
                        player.canvasX + effectOffsetX,
                        player.canvasY + effectOffsetY,
                        effectWidth,
                        effectHeight
                    );
                }
            }

            // 사용자 캐릭터 HP 바 추가
            ctx.fillStyle = 'red';
            ctx.fillRect(canvas.width / 2 - 25, 20, 50, 10);    // 배경
            ctx.fillStyle = 'green';
            ctx.fillRect(canvas.width / 2 - 25, 20, 50 * (player.currentHp / player.hp), 10);   // HP
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
                handleAttackEffectFrame(deltaTime);
            }

            draw();
            requestAnimationFrame(gameLoop);
        }

        // 사용자 이동 애니메이션 처리 함수
        function handlePlayerFrame(deltaTime) {
            if (player.moving) {
                if (player.frameTimer > player.frameInterval) {
                    if (player.frameX < player.maxFrame) player.frameX++;
                    else player.frameX = 0;
                    player.frameTimer = 0;
                } else {
                    player.frameTimer += deltaTime;
                }
            } else {
                player.frameX = 0;
            }
        }

        // 공격 이펙트 애니메이션 처리 함수
        function handleAttackEffectFrame(deltaTime) {
            player.attackEffectFrameTimer += deltaTime;
            if (player.attackEffectFrameTimer > player.attackEffectFrameInterval) {
                player.attackEffectFrameX++;

                // 이펙트 애니메이션 종료 시
                if (player.attackEffectFrameX > player.attackEffectMaxFrame) {
                    player.attackEffectFrameX = 0;   // 프레임 초기화
                    player.isAttacking = false;     // 공격 상태 해제
                    console.log("공격 종료");
                }
                player.attackEffectFrameTimer = 0;
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

                // 캐릭터 이미지
                playerImage = new Image();
                playerImage.src = '/images/player3.png';
                playerImage.onload = function() {
                    console.log(`Image size: ${playerImage.width}x${playerImage.height}`);
                };

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

                // 공격 이펙트 이미지
                attackEffectImage = new Image();
                attackEffectImage.src = '/images/attack_effect1.png';

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