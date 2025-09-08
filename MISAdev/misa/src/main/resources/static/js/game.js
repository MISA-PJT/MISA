window.onload = function() {
    // 1. 기본 설정
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

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

    // 지도 이벤트: 팬/줌 후 bounds 재계산
    naver.maps.Event.addListener(map, 'idle', function() {
        collisionPolygons.forEach(poly => {
            poly.precomputedBounds = poly.getBounds();
        });
        console.log('Map idle: bounds updated');
    });

    // 3. 캐릭터 설정 (LatLng 기반으로 변경)
    const player = {
        lat: startLat,
        lng: startLng,
        width: 224,
        height: 224,
        speed: 0.5, // 픽셀 속도
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

    // degree per pixel (줌 19 고정, 로그에서 계산)
    const delta_lat_per_pixel = -0.000002125; // south (Y+) decreases lat // 줌 21 : -0.00000053125;
    const delta_lng_per_pixel = 0.0000026856; // east (X+) increases lng // 줌 21 : 0.0000006714;

    // 캐릭터 이미지
    const playerImage = new Image();
    playerImage.src = '/images/player3.png';
    playerImage.onload = function() {
        console.log(`Image size: ${playerImage.width}x${playerImage.height}`);
    };

    // 무기 이미지
    const weaponImage = new Image();
    weaponImage.src = '/images/sword2.png';

    // 무기 정보 객체 생성
    const sword = {
        image: weaponImage,
        width: 1024,
        height: 1024,
        displayWidth: 44.8,
        displayHeight: 44.8
    };

    // 게임 시작 시 무기 기본 장착(테스트용)
    player.equippedWeapon = sword;

    // 공격 이펙트 이미지
    const attackEffectImage = new Image();
    attackEffectImage.src = '/images/attack_effect1.png';

    // 충돌 영역 데이터 (기존 유지)
    const collisionPolygons = [];
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
    collisionPolygons.forEach(poly => {
        poly.precomputedBounds = poly.getBounds();
    });

    // 4. 키보드 입력 (기존 유지)
    const keys = { w: false, a: false, s: false, d: false };
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
        }
    });
    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (['w', 'a', 's', 'd'].includes(key)) keys[key] = false;
    });

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

    }

    // 6. 그리기 함수 (캔버스 픽셀 사용)
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
                if (player.attackDirection === 'right' || player.attackDirection === 'up') {
                    rotationAngle = Math.PI / 2;    // 시계 방향 90도
                } else if (player.attackDirection === 'left' || player.attackDirection === 'down') {
                    rotationAngle = -Math.PI / 2;   // 반시계 방향 90도
                }
                ctx.rotate(rotationAngle);
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

    // 게임 시작 (초기 캔버스 위치 계산)
    const projection = map.getProjection();
    const centerOffset = projection.fromCoordToOffset(map.getCenter());
    const playerOffset = projection.fromCoordToOffset(new naver.maps.LatLng(player.lat, player.lng));
    player.canvasX = (playerOffset.x - centerOffset.x) + (canvas.width / 2);
    player.canvasY = (playerOffset.y - centerOffset.y) + (canvas.height / 2);

    gameLoop(0);
};