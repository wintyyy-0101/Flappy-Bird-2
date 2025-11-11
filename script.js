const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const startBtn = document.getElementById('startBtn');
const overlay = document.getElementById('overlay');
const restartBtn = document.getElementById('restartBtn');
const finalScore = document.getElementById('finalScore');
const title = document.getElementById('title');

let bird = { x: 80, y: 300, r: 18, vy: 0, frame: 0 };
let baseGravity = 0.5;
let baseFlap = -8;
let gravity = baseGravity;
let flap = baseFlap;
let pipes = [];
let clouds = [];
let explosions = [];
let frame = 0;
let score = 0;
let gameOver = false;
let started = false;
let groundY = 580;
let groundOffset = 0;
let scale = 1;

// 🧮 Responsive scaling
function resizeCanvas() {
  const designWidth = 400;
  const designHeight = 600;
  const rect = canvas.getBoundingClientRect();
  scale = rect.width / designWidth;
  canvas.width = rect.width;
  canvas.height = rect.height;
  groundY = canvas.height - 20 * scale;

  // 🪶 Adjust physics for screen height
  gravity = baseGravity * scale * 1.2;
  flap = baseFlap * scale * 1.2;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function drawBackground() {
  let sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#6ec6ff");
  sky.addColorStop(1, "#b3e5fc");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.8)";
  clouds.forEach(cloud => {
    ctx.beginPath();
    ctx.ellipse(cloud.x, cloud.y, cloud.size * 2 * scale, cloud.size * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // ground
  ctx.fillStyle = "#8d6e63";
  ctx.fillRect(0, groundY, canvas.width, 40 * scale);
  ctx.fillStyle = "#6d4c41";
  for (let i = 0; i < canvas.width / (40 * scale) + 1; i++) {
    ctx.fillRect((i * 40 * scale + groundOffset) % canvas.width, groundY, 20 * scale, 40 * scale);
  }
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x * scale, bird.y * scale);
  ctx.rotate(bird.vy * 0.04);

  ctx.fillStyle = "#ffeb3b";
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(0, 0, bird.r * scale, 0, Math.PI * 2);
  ctx.fill();

  let wingY = Math.sin(bird.frame / 5) * 3 * scale;
  ctx.beginPath();
  ctx.fillStyle = "#f4b400";
  ctx.ellipse(-5 * scale, wingY + 5 * scale, 8 * scale, 4 * scale, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = "#000";
  ctx.arc(7 * scale, -4 * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPipes() {
  pipes.forEach(pipe => {
    let gradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
    gradient.addColorStop(0, "#2e7d32");
    gradient.addColorStop(1, "#388e3c");
    ctx.fillStyle = gradient;
    ctx.fillRect(pipe.x, 0, pipe.width, pipe.top);
    ctx.fillRect(pipe.x, pipe.top + pipe.gap, pipe.width, canvas.height - pipe.top - pipe.gap);
  });
}

function drawExplosion() {
  explosions.forEach((ex, index) => {
    ctx.beginPath();
    ctx.fillStyle = `rgba(255, ${200 + ex.life}, 0, ${ex.alpha})`;
    ctx.arc(ex.x * scale, ex.y * scale, ex.size * scale, 0, Math.PI * 2);
    ctx.fill();
    ex.size += 2;
    ex.alpha -= 0.04;
    if (ex.alpha <= 0) explosions.splice(index, 1);
  });
}

// 🧠 Game loop
function update() {
  if (!started) return;
  frame++;
  bird.frame++;
  bird.vy += gravity;
  bird.y += bird.vy;
  groundOffset -= 2 * scale;
  if (groundOffset <= -40 * scale) groundOffset = 0;

  // spawn pipes
  if (frame % 90 === 0) {
    let top = Math.random() * 250 + 50;
    pipes.push({ x: canvas.width, width: 60 * scale, top: top * scale, gap: 150 * scale, passed: false });
  }

  pipes.forEach(pipe => (pipe.x -= 3 * scale));
  clouds.forEach(cloud => (cloud.x -= 1.2 * scale));

  if (frame % 120 === 0)
    clouds.push({ x: canvas.width, y: Math.random() * 200 + 20, size: Math.random() * 20 + 20 });
  if (clouds.length && clouds[0].x < -50) clouds.shift();

  // ✅ SCORING: increase when bird passes a pipe
  pipes.forEach(pipe => {
    if (!pipe.passed && bird.x * scale > pipe.x + pipe.width) {
      pipe.passed = true;
      score++;
      scoreDisplay.textContent = score;
    }
  });

  // collisions
  pipes.forEach(pipe => {
    if (
      bird.x * scale + bird.r * scale > pipe.x &&
      bird.x * scale - bird.r * scale < pipe.x + pipe.width &&
      (bird.y * scale - bird.r * scale < pipe.top ||
       bird.y * scale + bird.r * scale > pipe.top + pipe.gap)
    ) {
      triggerExplosion();
      endGame();
    }
  });

  if (bird.y * scale + bird.r * scale > groundY || bird.y - bird.r < 0) {
    triggerExplosion();
    endGame();
  }

  draw();
  if (!gameOver) requestAnimationFrame(update);
}

function draw() {
  drawBackground();
  drawPipes();
  drawBird();
  drawExplosion();
  ctx.save();
  ctx.font = `${16 * scale}px Poppins, sans-serif`;
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 3;
  ctx.textAlign = "center";
  ctx.fillText("Made By: Bit", canvas.width / 2, canvas.height - 10 * scale);
  ctx.restore();
}

function triggerExplosion() {
  for (let i = 0; i < 10; i++) {
    explosions.push({
      x: bird.x,
      y: bird.y,
      size: 10,
      alpha: 1,
      life: Math.random() * 55
    });
  }
}

function endGame() {
  gameOver = true;
  overlay.style.display = "flex";
  finalScore.textContent = score;
}

function reset() {
  bird.y = 300;
  bird.vy = 0;
  pipes = [];
  clouds = [];
  explosions = [];
  score = 0;
  scoreDisplay.textContent = "0";
  frame = 0;
  gameOver = false;
  overlay.style.display = "none";
  title.style.display = "block";
}

function startGame() {
  reset();
  started = true;
  title.style.display = "none";  // 🚫 hide title on start
  startBtn.style.display = "none";
  update();
}

function flapBird() {
  if (started && !gameOver) bird.vy = flap;
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
window.addEventListener("keydown", e => { if (e.code === "Space") flapBird(); });
window.addEventListener("mousedown", flapBird);
window.addEventListener("touchstart", flapBird); // 👆 mobile tap support
