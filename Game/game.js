// 1. 기본설정 : 캔버스 가져오기
// HTML에서 id가 gameCanvas인 요소를 찾아서 변수에 저장
const canvas = document.getElementById('gameCanvas');

// 2D 그래픽을 그릴 수 있는 도구(context)를 가져오기
const ctx = canvas.getContext('2d');

// 2. 캐릭터 만들기
// 사용자 객체 생성
const player = {
    x : 100,
    y : 100,
    width : 341,     // 캐릭터 한 프레임의 실제 너비(이미지 파일 내)
    height : 512,    // 캐릭터 한 프레임의 실제 높이(이미지 파일 내)
    speed : 2,      // 속도 조절
    
    // 화면에 표시될 크기
    displayWidth : 34.1,
    displayHeight : 51.2,

    // 애니메이션 속성 추가
    frameX : 0,     // 현재 보여줄 프레임의 가로 순번
    frameY : 0,     // 현재 보여줄 프레임의 세로 순번
    maxFrame : 1,   // 한 동작의 최대 프레임 수
    directionOffsetX : 0,   // 방향에 따른 X축 시작점 오프셋
    moving : false, // 현재 움직이고 있는지 여부

    // 애니메이션 속도 조절
    fps : 10,                   // 1초에 보여줄 프레임 수
    frameTimer : 0,
    frameInterval : 1000 / 10   // 각 프레임을 보여줄 시간 간격 (ms단위)
};

// 사용자 객체에 이미지 불러오기
// 캐릭터 이미지를 로드하기 위한 Image 객체 생성
const playerImage = new Image();
playerImage.src = 'player.png';

// 3. 키보드 입력 상태 저장하기
// 입력한 키의 상태를 저장할 객체
const keys = {
    w : false,
    a : false,
    s : false,
    d : false
};

// 키보드를 눌렀을 때 이벤트 처리
window.addEventListener('keydown', (e) => {
    if (e.key === 'w' || e.key === 'W') keys.w = true;
    if (e.key === 'a' || e.key === 'A') keys.a = true;
    if (e.key === 's' || e.key === 'S') keys.s = true;
    if (e.key === 'd' || e.key === 'D') keys.d = true;
});

// 키보드에서 손을 땠을 때 이벤트 처리
window.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'W') keys.w = false;
    if (e.key === 'a' || e.key === 'A') keys.a = false;
    if (e.key === 's' || e.key === 'S') keys.s = false;
    if (e.key === 'd' || e.key === 'D') keys.d = false;
});

// 게임 루프 만들기
// 게임의 모든 것을 하나로 합쳐서 1초에 약 60번씩 반복 실행하는 함수 작성
// 1. 캐릭터 위치 업데이트 함수
function update() {
    player.moving = false;  // 매 프레임마다 움직임 상태를 멈춤으로 초기화

    // keys 객체의 상태에 따라 player의 x, y 좌표를 변경
    if (keys.w) {
        player.y -= player.speed;
        player.frameY = 0;          // 위쪽 방향
        player.directionOffsetX = 1;    // 윗줄의 첫 번째 세트
        player.moving = true;
    } else if (keys.s) {
        player.y += player.speed;
        player.frameY = 0;          // 아래쪽 방향
        player.directionOffsetX = 0;
        player.moving = true;
    } else if (keys.a) {
        player.x -= player.speed;
        player.frameY = 1;          // 왼쪽 방향
        player.directionOffsetX = 1;
        player.moving = true;
    } else if (keys.d) {
        player.x += player.speed;
        player.frameY = 0;          // 오른쪽 방향
        player.directionOffsetX = 0;
        player.moving = true;
    }

    // 캐릭터 위치 이동 지역 제한
    // 화면 왼쪽 경계 체크
    if (player.x < 0) {
        player.x = 0;
    }
    // 화면 오른쪽 경계 체크
    if (player.x + player.displayWidth > canvas.width) {
        player.x = canvas.width - player.displayWidth;
    }

    // 화면 위쪽 경계 체크
    if (player.y < 0) {
        player.y = 0;
    }
    // 화면 아래쪽 경계 체크
    if (player.y + player.displayHeight > canvas.height) {
        player.y = canvas.height - player.displayHeight;
    }
}

// 2. 화면을 그리는 함수
function draw() {
    // 잔상이 남지 않도록 매번 캔버스를 깨끗하게 지우는 기능
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 사용자의 위치와 크기대로 이미지를 불러옴.
    // 9개의 인수를 사용하는 drawImage로 변경
    ctx.drawImage(
        playerImage,
        (player.directionOffsetX + player.frameX) * player.width,   // 원본 이미지에서 자를 부분의 x좌표
        player.frameY * player.height,  // 원본 이미지에서 자를 부분의 y좌표
        player.width,                   // 자를 부분의 너비
        player.height,                  // 자를 부분의 높이
        player.x,                       // 캔버스에 그릴 위치의 x좌표
        player.y,                       // 캔버스에 그릴 위치의 y좌표
        player.displayWidth,                   // 캔버스에 그려질 이미지의 너비
        player.displayHeight                   // 캔버스에 그려질 이미지의 높이
    );
}

// 3. 메인 게임 루프
let lastTime = 0;   // gameLoop 함수 안에서 프레임 간의 시간 차이(deltaTime)를 계산하기 위해 사용하는 변수
function gameLoop(timestamp) {  // timestamp는 requestAnimationFrame이 자동으로 전달
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    update();   // 캐릭터 상태 업데이트
    handlePlayerFrame(deltaTime);   // 애니메이션 함수를 deltaTime과 함께 호출
    draw();     // 화면에 그리기

    // 다음 프레임에 gameLoop 함수를 다시 실행하도록 요청(애니메이션)
    requestAnimationFrame(gameLoop);
}

// 4. 애니메이션 처리 함수
function handlePlayerFrame(deltaTime) {
    if (player.moving) {
        // 프레임 타이머가 설정된 간격보다 커지면 프레임을 바꿈
        if (player.frameTimer > player.frameInterval) {
            if (player.frameX < player.maxFrame) {
                player.frameX++;    // 다음 프레임으로
            } else {
                player.frameX = 0;  // 프레임 순환
            }
            player.frameTimer = 0;  // 타이머 초기화
        } else {
            player.frameTimer += deltaTime;
        }
    } else {
        // 멈춰있을 때는 항상 첫 번째 프레임으로 고정(걷지 않는 기본 자세)
        player.frameX = 0;
    }
}

// 최초에 한 번 게임 루프를 실행해서 게임 시작
window.onload = function() {
    gameLoop(0);    // 첫 시작 시 timestamp를 0으로 초기화
};