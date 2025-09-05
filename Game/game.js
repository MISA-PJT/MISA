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

        equippedWepon: null, // 현재 장착한 무기 정보

        // 공격 이펙트 관련 추가 속성
        isAttacking: false,
        attackEffectFramX: 0,
        attackEffectMaxFrame: 2,    // 이펙트 스트라이프 시트의 최대 프레임(인덱스)
        attackEffectFps: 20,        // 이펙트가 빠르게 지나가도록 FPS 높임
        attackEffectFrameTimer: 0,
        attackEffectFrameInterval: 1000 / 20,

        attackDirection: 'down'     // 공격 방향 (무기 위치 및 이펙트 위치에 활용)
    };

    // degree per pixel (줌 19 고정, 로그에서 계산)
    const delta_lat_per_pixel = -0.000002125; // south (Y+) decreases lat // 줌 21 : -0.00000053125;
    const delta_lng_per_pixel = 0.0000026856; // east (X+) increases lng // 줌 21 : 0.0000006714;

    const playerImage = new Image();
    playerImage.src = 'player3.png';
    playerImage.onload = function() {
        console.log(`Image size: ${playerImage.width}x${playerImage.height}`);
    };

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
        if (!player.moving) return; // 팬닝 중 이동 스킵 -> 이동 로직 항상 실행

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
        player.cavasY = (canvas.height / 2) - (player.displayHeight / 2);

    }

    // 6. 그리기 함수 (캔버스 픽셀 사용)
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    }

    // 7. 메인 게임 루프와 애니메이션 처리 함수 (기존 유지)
    let lastTime = 0;
    function gameLoop(timestamp) {
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;
        update();
        handlePlayerFrame(deltaTime);
        draw();
        requestAnimationFrame(gameLoop);
    }

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

    // 게임 시작 (초기 캔버스 위치 계산)
    const projection = map.getProjection();
    const centerOffset = projection.fromCoordToOffset(map.getCenter());
    const playerOffset = projection.fromCoordToOffset(new naver.maps.LatLng(player.lat, player.lng));
    player.canvasX = (playerOffset.x - centerOffset.x) + (canvas.width / 2);
    player.canvasY = (playerOffset.y - centerOffset.y) + (canvas.height / 2);

    gameLoop(0);
};