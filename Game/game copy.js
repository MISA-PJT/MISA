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
        zoom: 21,
        minZoom: 10,
        zoomControl: false,
        mapDataControl: false,
        scaleControl: false
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
        fps: 10, frameTimer: 0, frameInterval: 1000 / 10
    };

    // 충돌 영역 데이터
    // 통과 불가능한 지역들을 new naver.maps.LatLnBounds() 형태로 추가

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

    const collisionBounds = [
        new naver.maps.LatLngBounds(
            new naver.maps.LatLng(37.562280, 127.191840),
            new naver.maps.LatLng(37.562862, 127.192749)
        )
    ];

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

    // collisionBounds.forEach(bound => {
    //     const sw = bound.getSW(), ne = bound.getNE();
    //     const nw = new naver.maps.LatLng(ne.lat(), sw.lng());
    //     const se = new naver.maps.LatLng(sw.lat(), ne.lng());

    // new naver.maps.Polygon({
    //     map,
    //     paths: [[sw, nw, ne, se]],
    //     strokeColor: '#FF0000',
    //     strokeOpacity: 0.8,
    //     strokeWeight: 2,
    //     fillColor: '#FF0000',
    //     fillOpacity: 0.25
    //     });
    // });

    const playerImage = new Image();
    playerImage.src = 'player.png';

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
    // 주어진 위도/경도 좌표가 충돌 영역에 포함되는지 검사하는 함수
    function isColliding(latlng) {
        // 만약 latlng 계산에 실패해 null 등이 들어오면 충돌하지 않은 것으로 처리
        if (!latlng) return false;
        return collisionPolygons.some(poly => pointInPolygon(latlng, poly));

        // for (const bound of collisionBounds) {
        //     if (bound.hasLatLng(latlng)) {
        //         // console.log("충돌 감지!");      // 개발자 도구에서 충돌 여부 확인 용도
        //         return true;                   // 충돌 영역 중 하나라도 포함되면 즉시 true 반환
        //     }
        // }
        // return false;   // 모든 충돌 영역을 통과하면 false 반환
    }

    // 5. 캐릭터 위치 및 맵 업데이트 함수
    function update() {
        const moveX = (keys.a ? -player.speed : 0) + (keys.d ? player.speed : 0);
        const moveY = (keys.w ? -player.speed : 0) + (keys.s ? player.speed : 0);

        player.moving = (moveX !== 0 || moveY !== 0);
        if (!player.moving) return;

        // 충돌 검사 로직
        // 캐릭터가 이동할 다음 화면상 위치 계산
        const nextPlayerX = player.x + moveX;
        const nextPlayerY = player.y + moveY;

        // DOM 박스 얻기 (페이지 기준)
        // 충돌 검사용 좌표 변환 (canvas -> map DOM offset)
        const canvasRect = canvas.getBoundingClientRect();
        const mapContainer = document.getElementById('map');
        const mapRect = mapContainer.getBoundingClientRect();

        // 화면 좌표로 변환 : canvas의 (nextPlayerX, nextPlayerY) -> 페이지 좌표
        const pageX = canvasRect.left + nextPlayerX + (player.displayWidth / 2);    // 발 중심 X (페이지 기준)
        const pageY = canvasRect.top + nextPlayerY + player.displayHeight;          // 발 중심 Y (페이지 기준)

        // map 컨테이너 기준 오프셋 계산 (fromOffsetToCoord에 넣을 값)
        const offsetX = pageX - mapRect.left;
        const offsetY = pageY - mapRect.top;

        // 디버그 : offset이 map 내부에 있는지 확인
        // (mapRect가 full-screen이면 offsetX/Y는 보통 0..mapRect.width/height 범위)
        if (offsetX < 0 || offsetY < 0 || offsetX > mapRect.width || offsetY > mapRect.height) {
            // 화면 밖이면 충돌 판정 생략(또는 안전하게 처리)
            // console.warn("충돌 체크 지점이 map 영역 외부입니다:", { offsetX, offsetY, mapRectWidth: mapRect.width, mapRectHeight: mapRect.height });
        }

        // 실제 변환 (map 오브젝트가 준비되어 있어야 함.)
        const collisionPoint = new naver.maps.Point(offsetX, offsetY);
        const nextLatLng = map.getProjection().fromOffsetToCoord(collisionPoint);

        // 디버그 로그
        // 실행 시 콘솔에 찍히는 값으로 좌표계가 올바른지 확인
        console.log("DEBUG collision:",
            { nextPlayerX, nextPlayerY, pageX, pageY, offsetX, offsetY, nextLatLng: nextLatLng ? {lat: nextLatLng.lat(), lng: nextLatLng.lng()} : null }
        );

        // 다음 좌표가 충돌 영역에 포함되면, 모든 움직임을 취소하고 함수 종료
        if (isColliding(nextLatLng)) {
            player.moving = false;
            return;
        }

        console.log("inside polygon?", collisionBounds.map(b => b.hasLatLng(nextLatLng)));
    
        // 애니메이션 방향 설정
        if (keys.w) { player.frameY = 0; player.directionOffsetX = 0; }
        else if (keys.s) { player.frameY = 0; player.directionOffsetX = 0; }
        else if (keys.a) { player.frameY = 1; player.directionOffsetX = 1; }
        else if (keys.d) { player.frameY = 0; player.directionOffsetX = 0; }
    
        const borderX = canvas.width * 0.35;
        const borderY = canvas.height * 0.35;
    
        let playerMoveX = moveX;
        let playerMoveY = moveY;
        let mapMoveX = 0;
        let mapMoveY = 0;
    
        const playerLeft = player.x;
        const playerRight = player.x + player.displayWidth;
        const playerTop = player.y;
        const playerBottom = player.y + player.displayHeight;

        if (moveX < 0 && playerLeft + moveX < borderX) {
            playerMoveX = 0;
            mapMoveX = moveX;
        }
        if (moveX > 0 && playerRight + moveX > canvas.width - borderX) {
            playerMoveX = 0;
            mapMoveX = moveX;
        }
        if (moveY < 0 && playerTop + moveY < borderY) {
            playerMoveY = 0;
            mapMoveY = moveY;
        }
        if (moveY > 0 && playerBottom + moveY > canvas.height - borderY) {
            playerMoveY = 0;
            mapMoveY = moveY;
        }
    
        player.x += playerMoveX;
        player.y += playerMoveY;

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

    // 지도 크기 재조정
    setTimeout(function() {
        map.setSize(new naver.maps.Size(window.innerWidth, window.innerHeight));
    }, 100);

    // console.log("collisionBounds[0]", collisionBounds[0]);
    // console.log("contains test", collisionBounds[0].contains(new naver.maps.LatLng(37.5625, 127.1922)));
};