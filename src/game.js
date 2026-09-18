(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const positionEl = document.getElementById("position");
  const stateEl = document.getElementById("state");

  const WORLD = Object.freeze({
    width: 1000,
    height: 600,
    groundY: 530,
    gravity: 1400,
    moveSpeed: 280,
    jumpVelocity: 600,
    climbSpeed: 185,
  });

  const platforms = Object.freeze([
    { id: "upper-left", x: 80, y: 210, width: 310, height: 24 },
    { id: "upper-right", x: 610, y: 210, width: 310, height: 24 },
  ]);

  const ladder = Object.freeze({
    x: 164,
    y: 210,
    width: 42,
    height: WORLD.groundY - 210,
  });

  const spawn = Object.freeze({ x: 480, y: WORLD.groundY - 46 });

  const player = {
    x: spawn.x,
    y: spawn.y,
    width: 34,
    height: 46,
    vx: 0,
    vy: 0,
    grounded: true,
    climbing: false,
    facing: 1,
  };

  const dummies = Object.freeze([
    { x: 290, y: 210, surface: "upper" },
    { x: 785, y: 210, surface: "upper" },
    { x: 850, y: WORLD.groundY, surface: "ground" },
  ]);

  const keys = new Set();

  const blockScrollKeys = new Set([
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Space",
  ]);

  window.addEventListener("keydown", (event) => {
    if (blockScrollKeys.has(event.code)) {
      event.preventDefault();
    }

    keys.add(event.code);

    if (event.code === "KeyR") {
      resetPlayer();
    }

    if (event.code === "Space" && !event.repeat) {
      tryJump();
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });

  window.addEventListener("blur", () => {
    keys.clear();
    player.vx = 0;
  });

  function resetPlayer() {
    player.x = spawn.x;
    player.y = spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.grounded = true;
    player.climbing = false;
    player.facing = 1;
  }

  function tryJump() {
    if (!player.grounded || player.climbing) {
      return;
    }

    player.vy = -WORLD.jumpVelocity;
    player.grounded = false;
  }

  function isPressed(...codes) {
    return codes.some((code) => keys.has(code));
  }

  function horizontalOverlap(a, b) {
    return a.x + a.width > b.x && a.x < b.x + b.width;
  }

  function verticalOverlap(a, b) {
    return a.y + a.height > b.y && a.y < b.y + b.height;
  }

  function canUseLadder() {
    const playerCenterX = player.x + player.width / 2;
    const ladderCenterX = ladder.x + ladder.width / 2;
    const withinHorizontalReach =
      Math.abs(playerCenterX - ladderCenterX) <= ladder.width * 0.72;

    const feetNearLadderTop =
      Math.abs(player.y + player.height - ladder.y) <= 8;
    const insideLadderSpan = verticalOverlap(player, ladder);

    return withinHorizontalReach && (insideLadderSpan || feetNearLadderTop);
  }

  function update(dt) {
    const left = isPressed("KeyA", "ArrowLeft");
    const right = isPressed("KeyD", "ArrowRight");
    const up = isPressed("KeyW", "ArrowUp");
    const down = isPressed("KeyS", "ArrowDown");

    const horizontalInput = (right ? 1 : 0) - (left ? 1 : 0);
    const verticalInput = (down ? 1 : 0) - (up ? 1 : 0);

    if ((up || down) && canUseLadder()) {
      player.climbing = true;
      player.grounded = false;
      player.vy = 0;
      player.x =
        ladder.x + ladder.width / 2 - player.width / 2;
    }

    if (player.climbing) {
      player.vx = horizontalInput * WORLD.moveSpeed * 0.45;
      player.vy = verticalInput * WORLD.climbSpeed;

      if (horizontalInput !== 0) {
        player.facing = Math.sign(horizontalInput);
      }

      player.x += player.vx * dt;
      player.y += player.vy * dt;

      const platformTop = platforms[0].y;
      const standY = platformTop - player.height;

      if (player.y <= standY) {
        player.y = standY;
        player.vy = 0;
        player.climbing = false;
        player.grounded = true;
      } else if (player.y + player.height >= WORLD.groundY) {
        player.y = WORLD.groundY - player.height;
        player.vy = 0;
        player.climbing = false;
        player.grounded = true;
      } else if (!canUseLadder()) {
        player.climbing = false;
      }
    } else {
      player.vx = horizontalInput * WORLD.moveSpeed;

      if (horizontalInput !== 0) {
        player.facing = Math.sign(horizontalInput);
      }

      const previousBottom = player.y + player.height;

      player.x += player.vx * dt;
      player.vy += WORLD.gravity * dt;
      player.y += player.vy * dt;
      player.grounded = false;

      resolvePlatformLandings(previousBottom);
      resolveGround();
    }

    player.x = Math.max(
      0,
      Math.min(WORLD.width - player.width, player.x),
    );

    if (player.y > WORLD.height + 100) {
      resetPlayer();
    }

    updateHud();
  }

  function resolvePlatformLandings(previousBottom) {
    if (player.vy < 0) {
      return;
    }

    const currentBottom = player.y + player.height;

    for (const platform of platforms) {
      const crossedTop =
        previousBottom <= platform.y &&
        currentBottom >= platform.y;

      if (crossedTop && horizontalOverlap(player, platform)) {
        player.y = platform.y - player.height;
        player.vy = 0;
        player.grounded = true;
        return;
      }
    }
  }

  function resolveGround() {
    const bottom = player.y + player.height;

    if (bottom >= WORLD.groundY) {
      player.y = WORLD.groundY - player.height;
      player.vy = 0;
      player.grounded = true;
    }
  }

  function updateHud() {
    positionEl.textContent =
      `x ${Math.round(player.x)} · y ${Math.round(player.y)}`;

    if (player.climbing) {
      stateEl.textContent = "LADDER";
    } else if (!player.grounded) {
      stateEl.textContent = "AIR";
    } else if (player.y + player.height < WORLD.groundY - 2) {
      stateEl.textContent = "UPPER";
    } else {
      stateEl.textContent = "GROUND";
    }
  }

  function draw() {
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);
    drawBackground();
    drawPlatforms();
    drawLadder();
    drawGapHint();
    drawDummies();
    drawPlayer();
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    gradient.addColorStop(0, "#eaf8ff");
    gradient.addColorStop(0.74, "#fbfdff");
    gradient.addColorStop(0.741, "#f7f2e7");
    gradient.addColorStop(1, "#efe5cf");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    drawCloud(140, 92, 1.05);
    drawCloud(700, 100, 0.82);
    drawCloud(420, 58, 0.68);

    ctx.fillStyle = "#8ec56b";
    ctx.fillRect(0, WORLD.groundY, WORLD.width, 16);

    ctx.fillStyle = "#b98f61";
    ctx.fillRect(0, WORLD.groundY + 16, WORLD.width, WORLD.height - WORLD.groundY);
  }

  function drawCloud(x, y, scale) {
    ctx.beginPath();
    ctx.ellipse(x, y, 52 * scale, 21 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(
      x + 37 * scale,
      y - 11 * scale,
      34 * scale,
      25 * scale,
      0,
      0,
      Math.PI * 2,
    );
    ctx.ellipse(
      x + 70 * scale,
      y,
      45 * scale,
      20 * scale,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  function drawPlatforms() {
    for (const platform of platforms) {
      ctx.fillStyle = "#78b95c";
      ctx.fillRect(
        platform.x,
        platform.y,
        platform.width,
        12,
      );

      ctx.fillStyle = "#9a704a";
      ctx.fillRect(
        platform.x,
        platform.y + 12,
        platform.width,
        platform.height - 12,
      );

      ctx.strokeStyle = "rgba(57, 82, 42, 0.28)";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        platform.x,
        platform.y,
        platform.width,
        platform.height,
      );
    }
  }

  function drawLadder() {
    const railInset = 7;
    const leftX = ladder.x + railInset;
    const rightX = ladder.x + ladder.width - railInset;

    ctx.strokeStyle = "#8b6846";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(leftX, ladder.y + 8);
    ctx.lineTo(leftX, WORLD.groundY);
    ctx.moveTo(rightX, ladder.y + 8);
    ctx.lineTo(rightX, WORLD.groundY);
    ctx.stroke();

    ctx.lineWidth = 4;

    for (let y = ladder.y + 30; y < WORLD.groundY; y += 30) {
      ctx.beginPath();
      ctx.moveTo(leftX, y);
      ctx.lineTo(rightX, y);
      ctx.stroke();
    }
  }

  function drawGapHint() {
    const leftEdge = platforms[0].x + platforms[0].width;
    const rightEdge = platforms[1].x;
    const centerX = (leftEdge + rightEdge) / 2;

    ctx.save();
    ctx.strokeStyle = "rgba(47, 76, 103, 0.48)";
    ctx.fillStyle = "rgba(47, 76, 103, 0.68)";
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 8]);

    ctx.beginPath();
    ctx.moveTo(leftEdge + 18, 177);
    ctx.quadraticCurveTo(centerX, 102, rightEdge - 18, 177);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.font = "700 13px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("JUMP-ONLY GAP", centerX, 118);
    ctx.restore();
  }

  function drawDummies() {
    for (const dummy of dummies) {
      const baseline =
        dummy.surface === "upper"
          ? dummy.y
          : WORLD.groundY;

      drawMushroom(dummy.x, baseline);
    }
  }

  function drawMushroom(centerX, baselineY) {
    const capY = baselineY - 62;

    ctx.save();

    ctx.fillStyle = "#d9655d";
    ctx.beginPath();
    ctx.arc(centerX, capY + 19, 32, Math.PI, 0);
    ctx.quadraticCurveTo(centerX + 32, capY + 34, centerX + 25, capY + 38);
    ctx.lineTo(centerX - 25, capY + 38);
    ctx.quadraticCurveTo(centerX - 32, capY + 34, centerX - 32, capY + 19);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fff4dd";
    ctx.beginPath();
    ctx.roundRect(centerX - 18, baselineY - 32, 36, 32, 10);
    ctx.fill();

    ctx.fillStyle = "#29323b";
    ctx.beginPath();
    ctx.arc(centerX - 7, baselineY - 18, 2.3, 0, Math.PI * 2);
    ctx.arc(centerX + 7, baselineY - 18, 2.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#29323b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, baselineY - 13, 7, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.fillStyle = "#ffd2cc";
    ctx.beginPath();
    ctx.arc(centerX - 17, capY + 20, 5, 0, Math.PI * 2);
    ctx.arc(centerX + 15, capY + 10, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawPlayer() {
    const centerX = player.x + player.width / 2;
    const feetY = player.y + player.height;

    ctx.save();

    ctx.fillStyle = "#4f91dd";
    ctx.beginPath();
    ctx.roundRect(player.x + 5, player.y + 17, player.width - 10, 27, 8);
    ctx.fill();

    ctx.fillStyle = "#ffe2bd";
    ctx.beginPath();
    ctx.arc(centerX, player.y + 13, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#3d4650";
    ctx.beginPath();
    ctx.arc(centerX, player.y + 8, 12, Math.PI, 0);
    ctx.lineTo(centerX + 12, player.y + 13);
    ctx.lineTo(centerX - 12, player.y + 13);
    ctx.closePath();
    ctx.fill();

    const eyeOffset = player.facing > 0 ? 3 : -3;
    ctx.fillStyle = "#26313b";
    ctx.beginPath();
    ctx.arc(centerX + eyeOffset, player.y + 15, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2d6cb7";
    ctx.fillRect(player.x + 7, feetY - 3, 8, 3);
    ctx.fillRect(player.x + player.width - 15, feetY - 3, 8, 3);

    ctx.restore();
  }

  let lastTime = performance.now();

  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;

    update(dt);
    draw();

    requestAnimationFrame(frame);
  }

  resetPlayer();
  requestAnimationFrame(frame);
})();
