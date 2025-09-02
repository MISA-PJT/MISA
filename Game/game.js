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
        center: new naver.maps.LatLng(startLat, startLng),
        zoom: 19,
        minZoom: 19,
        zoomControl: false,
        mapDataControl: false,
        scaleControl: false,
        logoControl: false,
        mapTypeControl: false
    };
    const map = new naver.maps.Map('map', mapOptions);

    // 팬닝 상태 플래그
    let isPanning = false;

    // 지도 이벤트: 팬/줌 후 bounds 재계산
    naver.maps.Event.addListener(map, 'idle', function() {
        collisionPolygons.forEach(poly => {
            poly.precomputedBounds = poly.getBounds();
        });
        isPanning = false;
        console.log('Map idle: bounds updated');
    });

    // 3. 캐릭터 설정 (LatLng 기반으로 변경)
    const player = {
        lat: startLat,
        lng: startLng,
        width: 341,
        height: 512,
        speed: 1, // 픽셀 속도
        displayWidth: 17.05,
        displayHeight: 25.6,
        frameX: 0,
        frameY: 0,
        maxFrame: 1,
        directionOffsetX: 0,
        moving: false,
        fps: 10,
        frameTimer: 0,
        frameInterval: 1000 / 10,
        collisionWidth: 28,
        collisionHeight: 16
    };

    // degree per pixel (줌 21 고정, 로그에서 계산)
    const delta_lat_per_pixel = -0.000002125; // south (Y+) decreases lat // 줌 21 : -0.00000053125;
    const delta_lng_per_pixel = 0.0000026856; // east (X+) increases lng // 줌 21 : 0.0000006714;

    const playerImage = new Image();
    playerImage.src = 'player.png';
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
            // new naver.maps.LatLng(37.5627529, 127.1925374),
            new naver.maps.LatLng(37.5627675, 127.1925935),
            new naver.maps.LatLng(37.5626865, 127.1927981),
            new naver.maps.LatLng(37.5625705, 127.1928647),
            // new naver.maps.LatLng(37.5625406, 127.1926911),
            // new naver.maps.LatLng(37.5625075, 127.1927061)
        ]],
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.25
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

    // 줌이 변경될 수 있는 경우 delta 동적 계산 코드
    // const zoom = map.getZoom();
    // const delta_lng_per_pixel = 360 / (256 * Math.pow(2, zoom));
    // const delta_lat_per_pixel = -delta_lng_per_pixel * Math.cos(player.lat * Math.PI / 180);


    // 5. 캐릭터 위치 및 맵 업데이트 함수 (LatLng 기반 리팩토링)
    function update() {
        const moveX = (keys.a ? -player.speed : 0) + (keys.d ? player.speed : 0);
        const moveY = (keys.w ? -player.speed : 0) + (keys.s ? player.speed : 0);
        player.moving = (moveX !== 0 || moveY !== 0);
        if (!player.moving || isPanning) return; // 팬닝 중 이동 스킵

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
            player.frameY = 0; // 위
            player.directionOffsetX = 0;
        } else if (keys.s) {
            player.frameY = 0; // 아래
            player.directionOffsetX = 0;
        } else if (keys.a) {
            player.frameY = 0; // 왼쪽
            player.directionOffsetX = 0;
        } else if (keys.d) {
            player.frameY = 0; // 오른쪽
            player.directionOffsetX = 0;
        }

        // LatLng -> 캔버스 픽셀 계산 및 맵 패닝
        const projection = map.getProjection();
        const center = map.getCenter();
        const centerOffset = projection.fromCoordToOffset(center);
        const playerLatLng = new naver.maps.LatLng(player.lat, player.lng);
        const playerOffset = projection.fromCoordToOffset(playerLatLng);
        let playerX = (playerOffset.x - centerOffset.x) + (canvas.width / 2);
        let playerY = (playerOffset.y - centerOffset.y) + (canvas.height / 2);

        const borderX = canvas.width * 0.35;
        const borderY = canvas.height * 0.35;
        let mapMoveX = 0;
        let mapMoveY = 0;

        if (playerX < borderX) {
            mapMoveX = playerX - borderX;
            playerX = borderX;
        } else if (playerX + player.displayWidth > canvas.width - borderX) {
            mapMoveX = playerX + player.displayWidth - (canvas.width - borderX);
            playerX = canvas.width - borderX - player.displayWidth;
        }
        if (playerY < borderY) {
            mapMoveY = playerY - borderY;
            playerY = borderY;
        } else if (playerY + player.displayHeight > canvas.height - borderY) {
            mapMoveY = playerY + player.displayHeight - (canvas.height - borderY);
            playerY = canvas.height - borderY - player.displayHeight;
        }

        if (mapMoveX !== 0 || mapMoveY !== 0) {
            isPanning = true;
            map.panBy(new naver.maps.Point(mapMoveX, mapMoveY));
        }

        // 플레이어 위치 저장 (드로잉용)
        player.canvasX = playerX;
        player.canvasY = playerY;
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