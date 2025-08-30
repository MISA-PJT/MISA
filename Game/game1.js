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
        logoControl: false,     // 로고 컨트롤 비활성화
        mapTypeControl: false   // 지도 유형 컨트롤 비활성화
    };

    const map = new naver.maps.Map('map', mapOptions);

    // 3. 캐릭터 설정
    const player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        width: 341, // 원본 프레임 너비
        height: 512, // 원본 프레임 높이
        speed: 1,
        
        displayWidth: 34.1,
        displayHeight: 51.2,

        // 애니메이션 속성
        frameX: 0, frameY: 0, maxFrame: 1, directionOffsetX: 0, moving: false,
        fps: 10, frameTimer: 0, frameInterval: 1000 / 10,

        // 고급 충돌 감지를 위한 충돌 박스 설정
        // 시각적 크기보다 약간 작게 설정하여 타이트한 조작감 제공
        collisionWidth: 28,
        collisionHeight: 16     // 캐릭터의 발 부분만 충돌 영역으로 사용
    };

    // 충돌 박스의 오프셋을 계산하여 캐릭터 객체에 저장
    player.collisionXOffset = (player.displayWidth - player.collisionWidth) / 2;
    player.collisionYOffset = player.displayHeight = player.collisionHeight;

    const playerImage = new Image();
    playerImage.src = 'player.png';

    // 충돌 영역 데이터
    const collisionPolygons = [];

    // 예시 건물 폴리곤
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

    // 성능 최적화를 위해 각 폴리곤의 경계(Bounds)를 미리 계산하여 저장
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
    /**
     * 점이 다각형 내부에 있는지 판별하는 광선 투사 알고리즘
     * @param {naver.maps.LatLng} latlng - 검사할 점의 지리 좌표
     * @param {naver.maps.Polygon} polygon - 검사 대상 폴리곤
     * @returns {boolean} 점이 내부에 있으면 true, 아니면 false
     */

    function pointInPolygon(latlng, polygon) {
        const path = polygon.getPaths().getAt(0); // LatLng 배열
        let inside = false;
        for (let i = 0, j = path.getLength() - 1; i < path.getLength(); j = i++) {
            const xi = path.getAt(i).lng(), yi = path.getAt(i).lat();
            const xj = path.getAt(j).lng(), yj = path.getAt(j).lat();
            const intersect = ((yi > latlng.lat()) !== (yj > latlng.lat())) &&
                (latlng.lng() < (xj - xi) * (latlng.lat() -yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    /**
     * 충돌 검사 헬퍼 함수
     * @param {naver.maps.LatLng | null} latlng - 검사할 지리 좌표
     * @returns {boolean} 충돌이 발생하면 true, 아니면 false
     */
    // 주어진 위도/경도 좌표가 충돌 영역에 포함되는지 검사하는 함수
    function isColliding(latlng) {
        // 만약 latlng 계산에 실패해 null 등이 들어오면 충돌하지 않은 것으로 처리
        if (!latlng) return false;

        for (const poly of collisionPolygons) {
            // 1단계(광역) : 빠르고 저렴한 경계 상자 검사를 먼저 수행
            if (poly.precomputedBounds.hasLatLng(latlng)) {
                // 2단계(정밀) : 1단계를 통과한 경우에만 다각형 내부 점 검사를 수행
                if (pointInPolygon(latlng, poly)) {
                    return true;    // 최종 충돌 확인
                }
            }
        }
        return false;   // 모든 폴리곤과 충돌하지 않음.
    }

    /**
     * 캔버스 좌표(x, y)를 네이버 지도의 지리 좌표(LatLng)로 변환
     * @param {number} canvasX - 캔버스 상의 x 좌표
     * @param {number} canvasY - 캔버스 상의 y 좌표
     * @returns {naver.maps.LatLng | null} 변환된 LatLng 객체. 변환 실패 시 null.
     */

    function getLatLngFromCanvasPoint(canvasX, canvasY) {
        if (canvasX < 0 || canvasY < 0 || canvasX > canvas.width || canvasY > canvas.height) {
            return null;    // 캔버스 영역을 벗어나는 좌표는 변환하지 않음.
        }
        // 단순화된 DOM 구조 덕분에 캔버스 좌표가 곧 지도 컨테이너 기준 오프셋 좌표가 됨.
        const offsetPoint = new naver.maps.Point(canvasX, canvasY);
        return map.getProjection().fromOffsetToCoord(offsetPoint);
    }

    // 5. 캐릭터 위치 및 맵 업데이트 함수 (벽 충돌 시 미끄러짐 적용)
    function update() {
        const moveX = (keys.a ? -player.speed : 0) + (keys.d ? player.speed : 0);
        const moveY = (keys.w ? -player.speed : 0) + (keys.s ? player.speed : 0);

        player.moving = (moveX !== 0 || moveY !== 0);
        if (!player.moving) return;

        // X축 이동 및 충돌 검사
        player.x += moveX;

        const collisionPointsX = null;
        const boxX = player.x + player.collisionXOffset;
        const boxY = player.y + player.collisionYOffset;

        if (moveX > 0) {    // 오른쪽으로 이동 시
            collisionPointsX.push({ x: boxX + player.collisionWidth, y: boxY }); // 우상단
            collisionPointsX.push({ x: boxX + player.collisionWidth, y: boxY + player.collisionHeight / 2}); // 우중단
            collisionPointsX.push({ X: boxX + player.collisionWidth, y: boxY + player.collisionHeight });   // 우하단
        } else if (moveX < 0) { // 왼쪽으로 이동 시
            collisionPointsX.push({ x: boxX, y: boxY });    // 좌상단
            collisionPointsX.push({ x: boxX, y: boxY + player.collisionHeight / 2 });   // 좌중단
            collisionPointsX.push({ x: boxX, y: boxY + player.collisionHeight });   // 좌하단
        }

        for (const point of collisionPointsX) {
            const latlng = getLatLngFromCanvasPoint(point.x, point.y);
            if (isColliding(latlng)) {
                player.x -= moveX;  // 충돌 시 X축 이동을 되돌림
                break;
            }
        }

        // Y축 이동 및 충돌 검사
        player.y += moveY;

        const collisionPointsY = null;
        const currentBoxX = player.x + player.collisionXOffset;
        const currentBoxY = player.y + player.collisionYOffset;

        if (moveY > 0) { // 아래로 이동 시
            collisionPointsY.push({ x: currentBoxX, y: currentBoxY + player.collisionHeight }); // 좌하단
            collisionPointsY.push({ x: currentBoxX + player.collisionWidth / 2, y: currentBoxY + player.collisionHeight }); // 중하단
            collisionPointsY.push({ x: currentBoxX + player.collisionWidth, y: currentBoxY + player.collisionHeight }); // 우하단
        } else if (moveY < 0) { // 위로 이동 시
            collisionPointsY.push({ x: currentBoxX, y: currentBoxY }); // 좌상단
            collisionPointsY.push({ x: currentBoxX + player.collisionWidth / 2, y: currentBoxY }); // 중상단
            collisionPointsY.push({ x: currentBoxX + player.collisionWidth, y: currentBoxY }); // 우상단
        }
        
        for (const point of collisionPointsY) {
            const latlng = getLatLngFromCanvasPoint(point.x, point.y);
            if (isColliding(latlng)) {
                player.y -= moveY; // 충돌 시 Y축 이동을 되돌림
                break;
            }
        }
    
        // 애니메이션 방향 설정
        if (keys.w) { player.frameY = 0; player.directionOffsetX = 0; }
        else if (keys.s) { player.frameY = 0; player.directionOffsetX = 0; }
        else if (keys.a) { player.frameY = 1; player.directionOffsetX = 1; }
        else if (keys.d) { player.frameY = 0; player.directionOffsetX = 0; }
    
        // 지도 패닝 로직
        // 캐릭터의 최종 위치를 기준으로 지도를 이동시킬지 결정
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
            // 지도는 픽셀 단위 이동만큼 부드럽게 스크롤
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
            player.width, player.height,
            player.x, // player.x를 캐릭터의 좌상단 꼭짓점으로 사용
            player.y, // player.y를 캐릭터의 좌상단 꼭짓점으로 사용
            player.displayWidth, player.displayHeight
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
}