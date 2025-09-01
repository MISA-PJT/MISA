window.onload = function() {
    // 1. 기본 설정
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    // 캔버스 크기를 지도 컨테이너(및 창)와 동일하게 설정
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 2. 네이버 지도 초기화
    const startLat = 37.563188;
    const startLng = 127.192642;
    const mapOptions = {
        center: new naver.maps.LatLng(startLat, startLng),
        zoom: 21,
        minZoom: 21,
        zoomControl: false,
        mapDataControl: false,
        scaleControl: false,
        logoControl: false,
        mapTypeControl: false
    };
    const map = new naver.maps.Map('map', mapOptions);

    // 3. 캐릭터 설정
    const player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        width: 341, // 원본 프레임 너비
        height: 512, // 원본 프레임 높이
        speed: 1,
        displayWidth: 34.1, // 원본 비율 유지 (341 / 10)
        displayHeight: 51.2, // 원본 비율 유지 (512 / 10)
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

    // 충돌 박스의 오프셋 계산
    player.collisionXOffset = (player.displayWidth - player.collisionWidth) / 2;
    player.collisionYOffset = player.displayHeight - player.collisionHeight;

    const playerImage = new Image();
    playerImage.src = 'player.png';
    playerImage.onload = function() {
        console.log(`Image size: ${playerImage.width}x${playerImage.height}`);
    };

    // 충돌 영역 데이터
    const collisionPolygons = [];
    const polygon = new naver.maps.Polygon({
        map,
        paths: [[
            new naver.maps.LatLng(37.562280, 127.191840),
            new naver.maps.LatLng(37.562280, 127.192749),
            new naver.maps.LatLng(37.562862, 127.192749),
            new naver.maps.LatLng(37.562862, 127.191840)
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

    // 4. 키보드 입력
    const keys = { w: false, a: false, s: false, d: false };
    window.addEventListener('keydown', (e) => {
        if (e.key === 'w' || e.key === 'W') keys.w = true;
        if (e.key === 'a' || e.key === 'A') keys.a = true;
        if (e.key === 's' || e.key === 'S') keys.s = true;
        if (e.key === 'd' || e.key === 'D') keys.d = true;
    });
    window.addEventListener('keyup', (e) => {
        if (e.key === 'w' || e.key === 'W') keys.w = false;
        if (e.key === 'a' || e.key === 'A') keys.a = false;
        if (e.key === 's' || e.key === 'S') keys.s = false;
        if (e.key === 'd' || e.key === 'D') keys.d = false;
    });

    // 충돌 검사 헬퍼 함수
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
                    console.log(`Collision detected at LatLng (${latlng.lat()}, ${latlng.lng()})`);
                    return true;
                }
            }
        }
        return false;
    }

    function getLatLngFromCanvasPoint(canvasX, canvasY) {
        if (canvasX < 0 || canvasY < 0 || canvasX > canvas.width || canvasY > canvas.height) {
            console.warn(`Invalid canvas coordinates: (${canvasX}, ${canvasY})`);
            return null;
        }
        const offsetPoint = new naver.maps.Point(canvasX, canvasY);
        const latlng = map.getProjection().fromOffsetToCoord(offsetPoint);
        console.log(`Canvas (${canvasX}, ${canvasY}) -> LatLng (${latlng?.lat()}, ${latlng?.lng()})`);
        return latlng;
    }

    // 5. 캐릭터 위치 및 맵 업데이트 함수
    function update() {
        const moveX = (keys.a ? -player.speed : 0) + (keys.d ? player.speed : 0);
        const moveY = (keys.w ? -player.speed : 0) + (keys.s ? player.speed : 0);
        player.moving = (moveX !== 0 || moveY !== 0);
        if (!player.moving) return;

        // X축 이동 및 충돌 검사
        player.x += moveX;
        const collisionPointsX = [];
        const boxX = player.x + player.collisionXOffset;
        const boxY = player.y + player.collisionYOffset;
        if (moveX > 0) {
            collisionPointsX.push({ x: boxX + player.collisionWidth, y: boxY });
            collisionPointsX.push({ x: boxX + player.collisionWidth, y: boxY + player.collisionHeight / 2 });
            collisionPointsX.push({ x: boxX + player.collisionWidth, y: boxY + player.collisionHeight });
        } else if (moveX < 0) {
            collisionPointsX.push({ x: boxX, y: boxY });
            collisionPointsX.push({ x: boxX, y: boxY + player.collisionHeight / 2 });
            collisionPointsX.push({ x: boxX, y: boxY + player.collisionHeight });
        }
        for (const point of collisionPointsX) {
            const latlng = getLatLngFromCanvasPoint(point.x, point.y);
            if (isColliding(latlng)) {
                player.x -= moveX;
                break;
            }
        }

        // Y축 이동 및 충돌 검사
        player.y += moveY;
        const collisionPointsY = [];
        const currentBoxX = player.x + player.collisionXOffset;
        const currentBoxY = player.y + player.collisionYOffset;
        if (moveY > 0) {
            collisionPointsY.push({ x: currentBoxX, y: currentBoxY + player.collisionHeight });
            collisionPointsY.push({ x: currentBoxX + player.collisionWidth / 2, y: currentBoxY + player.collisionHeight });
            collisionPointsY.push({ x: currentBoxX + player.collisionWidth, y: currentBoxY + player.collisionHeight });
        } else if (moveY < 0) {
            collisionPointsY.push({ x: currentBoxX, y: currentBoxY });
            collisionPointsY.push({ x: currentBoxX + player.collisionWidth / 2, y: currentBoxY });
            collisionPointsY.push({ x: currentBoxX + player.collisionWidth, y: currentBoxY });
        }
        for (const point of collisionPointsY) {
            const latlng = getLatLngFromCanvasPoint(point.x, point.y);
            if (isColliding(latlng)) {
                player.y -= moveY;
                break;
            }
        }

        // 애니메이션 방향 설정
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

        // 지도 패닝 로직
        const borderX = canvas.width * 0.35;
        const borderY = canvas.height * 0.35;
        let mapMoveX = 0;
        let mapMoveY = 0;
        if (player.x < borderX) {
            mapMoveX = player.x - borderX;
            player.x = borderX;
        }
        if (player.x + player.displayWidth > canvas.width - borderX) {
            mapMoveX = player.x + player.displayWidth - (canvas.width - borderX);
            player.x = canvas.width - borderX - player.displayWidth;
        }
        if (player.y < borderY) {
            mapMoveY = player.y - borderY;
            player.y = borderY;
        }
        if (player.y + player.displayHeight > canvas.height - borderY) {
            mapMoveY = player.y + player.displayHeight - (canvas.height - borderY);
            player.y = canvas.height - borderY - player.displayHeight;
        }
        if (mapMoveX !== 0 || mapMoveY !== 0) {
            map.panBy(new naver.maps.Point(mapMoveX, mapMoveY));
        }
    }

    // 6. 그리기 함수
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
            playerImage,
            (player.directionOffsetX + player.frameX) * player.width,
            player.frameY * player.height,
            player.width,
            player.height,
            player.x,
            player.y,
            player.displayWidth,
            player.displayHeight
        );
    }

    // 7. 메인 게임 루프와 애니메이션 처리 함수
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

    // 게임 시작
    gameLoop(0);
};