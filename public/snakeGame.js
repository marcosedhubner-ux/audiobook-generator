const CELL_SIZE = 14;

function roundedSquarePath(ctx, x, y, size, radius) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, size, size, radius);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + size, y, x + size, y + size, radius);
  ctx.arcTo(x + size, y + size, x, y + size, radius);
  ctx.arcTo(x, y + size, x, y, radius);
  ctx.arcTo(x, y, x + size, y, radius);
  ctx.closePath();
}

export function createSnakeGame(canvas) {
  const ctx = canvas.getContext("2d");
  const cols = Math.floor(canvas.width / CELL_SIZE);
  const rows = Math.floor(canvas.height / CELL_SIZE);

  let snake = [];
  let direction = { x: 1, y: 0 };
  let pendingDirection = { x: 1, y: 0 };
  let food = { x: 0, y: 0 };
  let score = 0;
  let timer = null;
  let state = "idle";
  let stateListener = () => {};
  let scoreListener = () => {};

  function colors() {
    const style = getComputedStyle(document.documentElement);
    return {
      bg: style.getPropertyValue("--dropzone-bg").trim() || "#efe3c5",
      snake: style.getPropertyValue("--accent-strong").trim() || "#6b4423",
      snakeHead: style.getPropertyValue("--accent").trim() || "#8a5a2b",
      food: style.getPropertyValue("--warning-text").trim() || "#8a5a1f",
      grid: style.getPropertyValue("--border").trim() || "#d8c39c",
      eye: style.getPropertyValue("--bg-card").trim() || "#fbf6ea",
    };
  }

  function placeFood() {
    let position;
    do {
      position = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    } while (snake.some((segment) => segment.x === position.x && segment.y === position.y));
    food = position;
  }

  function drawApple(palette) {
    const centerX = food.x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = food.y * CELL_SIZE + CELL_SIZE / 2 + 1;
    const radius = CELL_SIZE / 2 - 1.5;

    ctx.fillStyle = palette.food;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = palette.snakeHead;
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius + 1);
    ctx.lineTo(centerX + 1.5, centerY - radius - 2.5);
    ctx.stroke();
  }

  function drawSnake(palette) {
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      const x = segment.x * CELL_SIZE + 1;
      const y = segment.y * CELL_SIZE + 1;
      const size = CELL_SIZE - 2;
      ctx.fillStyle = isHead ? palette.snakeHead : palette.snake;
      roundedSquarePath(ctx, x, y, size, size / 2.4);
      ctx.fill();

      if (isHead) {
        ctx.fillStyle = palette.eye;
        const eyeOffsetX = direction.x !== 0 ? direction.x * (size / 5) : size / 5;
        const eyeOffsetY = direction.y !== 0 ? direction.y * (size / 5) : -size / 5;
        ctx.beginPath();
        ctx.arc(x + size / 2 + eyeOffsetX, y + size / 2 + eyeOffsetY, size / 7, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function draw() {
    const palette = colors();
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);

    drawApple(palette);
    drawSnake(palette);
  }

  function setState(next) {
    state = next;
    stateListener(state);
  }

  function setScore(next) {
    score = next;
    scoreListener(score);
  }

  function tick() {
    direction = pendingDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    const hitsWall = head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows;
    const hitsSelf = snake.some((segment) => segment.x === head.x && segment.y === head.y);
    if (hitsWall || hitsSelf) {
      clearInterval(timer);
      timer = null;
      setState("gameover");
      return;
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      setScore(score + 1);
      placeFood();
    } else {
      snake.pop();
    }
    draw();
  }

  function handleKeyDown(event) {
    if (state !== "playing") return;
    const key = event.key;
    if ((key === "ArrowUp" || key === "w") && direction.y === 0) pendingDirection = { x: 0, y: -1 };
    else if ((key === "ArrowDown" || key === "s") && direction.y === 0) pendingDirection = { x: 0, y: 1 };
    else if ((key === "ArrowLeft" || key === "a") && direction.x === 0) pendingDirection = { x: -1, y: 0 };
    else if ((key === "ArrowRight" || key === "d") && direction.x === 0) pendingDirection = { x: 1, y: 0 };
    else return;
    event.preventDefault();
  }

  document.addEventListener("keydown", handleKeyDown);

  function start() {
    snake = [
      { x: Math.floor(cols / 2), y: Math.floor(rows / 2) },
      { x: Math.floor(cols / 2) - 1, y: Math.floor(rows / 2) },
    ];
    direction = { x: 1, y: 0 };
    pendingDirection = { x: 1, y: 0 };
    setScore(0);
    placeFood();
    draw();
    setState("playing");
    if (timer) clearInterval(timer);
    timer = setInterval(tick, 120);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    setState("idle");
  }

  function destroy() {
    if (timer) clearInterval(timer);
    document.removeEventListener("keydown", handleKeyDown);
  }

  draw();

  return {
    start,
    stop,
    destroy,
    getState: () => state,
    onStateChange: (listener) => {
      stateListener = listener;
    },
    onScoreChange: (listener) => {
      scoreListener = listener;
    },
  };
}
