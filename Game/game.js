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
    width : 50,
    height : 50,
    color : 'blue',
    speed : 2
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
    // keys 객체의 상태에 따라 player의 x, y 좌표를 변경
    if (keys.w) {
        player.y -= player.speed;
    }
    if (keys.s) {
        player.y += player.speed;
    }
    if (keys.a) {
        player.x -= player.speed;
    }
    if (keys.d) {
        player.x += player.speed;
    }

    // 캐릭터 위치 이동 지역 제한
    // 화면 왼쪽 경계 체크
    if (player.x < 0) {
        player.x = 0;
    }
    // 화면 오른쪽 경계 체크
    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
    }

    // 화면 위쪽 경계 체크
    if (player.y < 0) {
        player.y = 0;
    }
    // 화면 아래쪽 경계 체크
    if (player.y + player.height > canvas.height) {
        player.y = canvas.height - player.height;
    }
}

// 2. 화면을 그리는 함수
function draw() {
    // 잔상이 남지 않도록 매번 캔버스를 깨끗하게 지우는 기능
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 사용자의 색상으로 채우기 설정
    ctx.fillStyle = player.color;
    // 사용자의 위치와 크기대로 이미지를 불러옴.
    ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
}

// 3. 메인 게임 루프
function gameLoop() {
    update();   // 캐릭터 상태 업데이트
    draw();     // 화면에 그리기

    // 다음 프레임에 gameLoop 함수를 다시 실행하도록 요청(애니메이션)
    requestAnimationFrame(gameLoop);
}

// 최초에 한 번 게임 루프를 실행해서 게임 시작
gameLoop();