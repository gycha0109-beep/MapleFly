(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const positionEl = document.getElementById("position");
  const combatEl = document.getElementById("combat");
  const stateEl = document.getElementById("state");
  const controlModeEl = document.getElementById("control-mode");

  const WORLD = Object.freeze({
    width: 1000,
    height: 600,
    groundY: 530,
    gravity: 1400,
    moveSpeed: 280,
    jumpVelocity: 600,
  });

  const COMBAT = Object.freeze({
    attackDamage: 10,
    attackRange: 76,
    attackCooldown: 0.32,
    attackDuration: 0.16,
  });

  const PLAYER_STATUS = Object.freeze({
    maxHp: 100,
    contactDamage: 10,
    impactPulseMs: 120,
    impactDrive: 0.7,
  });

  const POTION = Object.freeze({
    maxCount: 30,
    heal: 30,
    quickWindowMs: 1000,
  });

  const PLAYER_SPAWN_X = WORLD.width / 2 - 17;

  const RESPAWN = Object.freeze({
    delayMs: 700,
    minX: 55,
    maxX: WORLD.width - 55,
  });

  function hashUnit(seed, spawnIndex) {
    let value = (
      Math.trunc(Number(seed) || 0) ^
      Math.imul(spawnIndex + 1, 0x9e3779b1)
    ) >>> 0;

    value ^= value >>> 16;
    value = Math.imul(value, 0x7feb352d);
    value ^= value >>> 15;
    value = Math.imul(value, 0x846ca68b);
    value ^= value >>> 16;

    return (value >>> 0) / 4294967296;
  }

  function spawnPosition(seed, spawnIndex) {
    const unit = hashUnit(seed, spawnIndex);
    return Math.round(
      RESPAWN.minX +
        unit * (RESPAWN.maxX - RESPAWN.minX),
    );
  }

  const player = {
    x: PLAYER_SPAWN_X,
    y: WORLD.groundY - 46,
    width: 34,
    height: 46,
    vx: 0,
    vy: 0,
    grounded: true,
    facing: 1,
    attackCooldownTimer: 0,
    attackTimer: 0,
    hits: 0,
    kills: 0,
    maxHp: PLAYER_STATUS.maxHp,
    hp: PLAYER_STATUS.maxHp,
    damageTaken: 0,
    contacts: 0,
    hitFlashTimer: 0,
    impactPulseMs: 0,
    impactSide: null,
    touchingMushroom: false,
    dead: false,
    potions: POTION.maxCount,
    potionUses: 0,
    healed: 0,
    wastedHealing: 0,
    lastContactAt: null,
  };

  const mushroom = {
    id: "M-TEST",
    x: spawnPosition(64, 0),
    baselineY: WORLD.groundY,
    maxHp: 30,
    hp: 30,
    alive: true,
    hitFlashTimer: 0,
    respawnTimerMs: 0,
    spawnIndex: 0,
  };

  const damagePopups = [];
  const keys = new Set();
  let brainController = null;
  let trial = null;

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

    if (event.code === "KeyR" && !event.repeat && !trial?.active) {
      resetArena(64);
    }

    if (brainController?.isEnabled() || trial?.active) {
      return;
    }

    if (event.code === "Space" && !event.repeat) {
      tryJump();
    }

    if (event.code === "KeyF" && !event.repeat) {
      tryAttack();
    }

    if (event.code === "KeyP" && !event.repeat) {
      tryPotion();
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });

  window.addEventListener("blur", () => {
    keys.clear();
    player.vx = 0;
  });

  function resetArena(seed = 64) {
    player.x = PLAYER_SPAWN_X;
    player.y = WORLD.groundY - player.height;
    player.vx = 0;
    player.vy = 0;
    player.grounded = true;
    player.attackCooldownTimer = 0;
    player.attackTimer = 0;
    player.hits = 0;
    player.kills = 0;
    player.hp = player.maxHp;
    player.damageTaken = 0;
    player.contacts = 0;
    player.hitFlashTimer = 0;
    player.impactPulseMs = 0;
    player.impactSide = null;
    player.touchingMushroom = false;
    player.dead = false;
    player.potions = POTION.maxCount;
    player.potionUses = 0;
    player.healed = 0;
    player.wastedHealing = 0;
    player.lastContactAt = null;

    mushroom.spawnIndex = 0;
    mushroom.x = spawnPosition(seed, mushroom.spawnIndex);
    player.facing =
      mushroom.x < player.x + player.width / 2 ? -1 : 1;

    mushroom.hp = mushroom.maxHp;
    mushroom.alive = true;
    mushroom.hitFlashTimer = 0;
    mushroom.respawnTimerMs = 0;
    damagePopups.length = 0;
  }

  function respawnMushroom() {
    if (!trial?.active) {
      return;
    }

    mushroom.spawnIndex += 1;
    mushroom.x = spawnPosition(
      trial.seed,
      mushroom.spawnIndex,
    );
    mushroom.hp = mushroom.maxHp;
    mushroom.alive = true;
    mushroom.hitFlashTimer = 0;
    mushroom.respawnTimerMs = 0;

    trial.respawns += 1;
    trial.spawnPositions.push(Math.round(mushroom.x));
  }

  function startTrial({ seed = 64 } = {}) {
    resetArena(seed);
    trial = {
      active: true,
      seed,
      startedAt: performance.now(),
      lastX: player.x,
      lastY: player.y,
      distance: 0,
      towardDistance: 0,
      awayDistance: 0,
      minTargetDistance: targetDistance(),
      timeWithinAttackRangeMs: 0,
      decisions: {
        LEFT: 0,
        RIGHT: 0,
        UP: 0,
        DOWN: 0,
        JUMP: 0,
        ATTACK: 0,
        POTION: 0,
        IDLE: 0,
      },
      hits: 0,
      kills: 0,
      respawns: 0,
      spawnPositions: [Math.round(mushroom.x)],
      firstHitMs: null,
      firstKillMs: null,
      contacts: 0,
      damageTaken: 0,
      firstContactMs: null,
      deathAtMs: null,
      potionUses: 0,
      quickPotionUses: 0,
      totalHealed: 0,
      wastedHealing: 0,
      hpAtUseTotal: 0,
      potionEvents: [],
    };
    return getTrialSnapshot();
  }

  function finishTrial() {
    if (!trial) {
      return null;
    }

    trial.active = false;
    const result = getTrialSnapshot();
    trial = null;
    return result;
  }

  function cancelTrial() {
    trial = null;
  }

  function recordDecision(decision) {
    if (!trial?.active) {
      return;
    }

    const label = trial.decisions[decision.label] !== undefined
      ? decision.label
      : "IDLE";
    trial.decisions[label] += 1;
  }

  function tryJump() {
    if (player.dead || !player.grounded) {
      return false;
    }

    player.vy = -WORLD.jumpVelocity;
    player.grounded = false;
    return true;
  }

  function tryAttack() {
    if (player.dead || player.attackCooldownTimer > 0) {
      return false;
    }

    player.attackCooldownTimer = COMBAT.attackCooldown;
    player.attackTimer = COMBAT.attackDuration;

    if (!mushroom.alive) {
      return true;
    }

    if (!rectanglesOverlap(getPlayerAttackHitbox(), getMushroomHitbox())) {
      return true;
    }

    mushroom.hp = Math.max(0, mushroom.hp - COMBAT.attackDamage);
    mushroom.hitFlashTimer = 0.14;
    player.hits += 1;

    if (trial?.active) {
      trial.hits += 1;
      if (trial.firstHitMs === null) {
        trial.firstHitMs = performance.now() - trial.startedAt;
      }
    }

    damagePopups.push({
      x: mushroom.x,
      y: mushroom.baselineY - 72,
      value: COMBAT.attackDamage,
      life: 0.55,
      maxLife: 0.55,
    });

    if (mushroom.hp === 0) {
      mushroom.alive = false;
      mushroom.respawnTimerMs = RESPAWN.delayMs;
      player.kills += 1;

      if (trial?.active) {
        trial.kills += 1;
        if (trial.firstKillMs === null) {
          trial.firstKillMs = performance.now() - trial.startedAt;
        }
      }
    }

    return true;
  }

  function tryPotion() {
    if (
      player.dead ||
      player.potions <= 0 ||
      player.hp >= player.maxHp
    ) {
      return false;
    }

    const hpBefore = player.hp;
    const missingHp = player.maxHp - player.hp;
    const healed = Math.min(POTION.heal, missingHp);
    const wasted = POTION.heal - healed;
    const now = performance.now();

    player.potions -= 1;
    player.potionUses += 1;
    player.healed += healed;
    player.wastedHealing += wasted;
    player.hp += healed;

    if (trial?.active) {
      trial.potionUses += 1;
      trial.totalHealed += healed;
      trial.wastedHealing += wasted;
      trial.hpAtUseTotal += hpBefore;

      const sinceContact =
        player.lastContactAt === null
          ? Infinity
          : now - player.lastContactAt;

      if (sinceContact <= POTION.quickWindowMs) {
        trial.quickPotionUses += 1;
      }

      trial.potionEvents.push({
        atMs: now - trial.startedAt,
        hpBefore,
        hpAfter: player.hp,
        healed,
        wasted,
        sinceContactMs:
          Number.isFinite(sinceContact)
            ? sinceContact
            : null,
      });
    }

    damagePopups.push({
      x: player.x + player.width / 2,
      y: player.y - 12,
      value: healed,
      life: 0.7,
      maxLife: 0.7,
      target: "heal",
    });

    return true;
  }

  function getPlayerAttackHitbox() {
    const width = COMBAT.attackRange;
    const x =
      player.facing > 0
        ? player.x + player.width - 2
        : player.x - width + 2;

    return {
      x,
      y: player.y + 4,
      width,
      height: player.height - 8,
    };
  }

  function getMushroomHitbox() {
    return {
      x: mushroom.x - 28,
      y: mushroom.baselineY - 62,
      width: 56,
      height: 62,
    };
  }

  function getPlayerBodyHitbox() {
    return {
      x: player.x + 3,
      y: player.y + 3,
      width: player.width - 6,
      height: player.height - 3,
    };
  }

  function applyContactDamage() {
    if (player.dead || !mushroom.alive) {
      return;
    }

    const playerCenterX = player.x + player.width / 2;
    const impactSide = mushroom.x < playerCenterX ? "L" : "R";

    player.hp = Math.max(
      0,
      player.hp - PLAYER_STATUS.contactDamage,
    );
    player.damageTaken += PLAYER_STATUS.contactDamage;
    player.contacts += 1;
    player.hitFlashTimer = 0.18;
    player.impactPulseMs = PLAYER_STATUS.impactPulseMs;
    player.impactSide = impactSide;
    player.lastContactAt = performance.now();

    if (trial?.active) {
      trial.contacts += 1;
      trial.damageTaken += PLAYER_STATUS.contactDamage;

      if (trial.firstContactMs === null) {
        trial.firstContactMs = performance.now() - trial.startedAt;
      }
    }

    damagePopups.push({
      x: playerCenterX,
      y: player.y - 10,
      value: PLAYER_STATUS.contactDamage,
      life: 0.55,
      maxLife: 0.55,
      target: "player",
    });

    if (player.hp === 0) {
      player.dead = true;
      player.vx = 0;

      if (trial?.active && trial.deathAtMs === null) {
        trial.deathAtMs = performance.now() - trial.startedAt;
      }
    }
  }

  function updateContactDamage(dt) {
    player.hitFlashTimer = Math.max(
      0,
      player.hitFlashTimer - dt,
    );
    player.impactPulseMs = Math.max(
      0,
      player.impactPulseMs - dt * 1000,
    );

    if (player.impactPulseMs === 0) {
      player.impactSide = null;
    }

    const touching =
      !player.dead &&
      mushroom.alive &&
      rectanglesOverlap(
        getPlayerBodyHitbox(),
        getMushroomHitbox(),
      );

    if (touching && !player.touchingMushroom) {
      applyContactDamage();
    }

    player.touchingMushroom = touching;

    if (!mushroom.alive) {
      player.touchingMushroom = false;
    }
  }

  function rectanglesOverlap(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  function isPressed(...codes) {
    return codes.some((code) => keys.has(code));
  }

  function targetDistance() {
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const targetY = mushroom.baselineY - 31;
    return Math.hypot(
      mushroom.x - playerCenterX,
      targetY - playerCenterY,
    );
  }

  function buildBrainObservation() {
    return {
      player: {
        x: player.x,
        y: player.y,
        width: player.width,
        height: player.height,
        grounded: player.grounded,
        climbing: false,
        facing: player.facing,
        hp: player.hp,
        maxHp: player.maxHp,
        dead: player.dead,
        impactSide: player.impactSide,
        impactPulse:
          player.impactPulseMs > 0
            ? PLAYER_STATUS.impactDrive
            : 0,
        potions: player.potions,
        potionCue:
          !player.dead &&
          player.potions > 0 &&
          player.hp < player.maxHp,
      },
      mushrooms: [
        {
          id: mushroom.id,
          x: mushroom.x,
          y: mushroom.baselineY,
          hp: mushroom.hp,
          alive: mushroom.alive,
        },
      ],
    };
  }

  function update(dt) {
    const flyControlled = brainController?.isEnabled() ?? false;
    const flyIntent = flyControlled
      ? brainController.consumeIntent()
      : null;

    const left = !player.dead && (
      flyControlled
        ? flyIntent.left
        : isPressed("KeyA", "ArrowLeft")
    );
    const right = !player.dead && (
      flyControlled
        ? flyIntent.right
        : isPressed("KeyD", "ArrowRight")
    );

    if (!player.dead && flyControlled && flyIntent.jump) {
      tryJump();
    }

    if (!player.dead && flyControlled && flyIntent.attack) {
      tryAttack();
    }

    if (!player.dead && flyControlled && flyIntent.potion) {
      tryPotion();
    }

    const horizontalInput = (right ? 1 : 0) - (left ? 1 : 0);
    player.vx = horizontalInput * WORLD.moveSpeed;

    if (horizontalInput !== 0) {
      player.facing = Math.sign(horizontalInput);
    }

    const previousX = player.x;
    const previousY = player.y;

    player.x += player.vx * dt;
    player.vy += WORLD.gravity * dt;
    player.y += player.vy * dt;
    player.grounded = false;

    player.x = Math.max(
      0,
      Math.min(WORLD.width - player.width, player.x),
    );

    if (player.y + player.height >= WORLD.groundY) {
      player.y = WORLD.groundY - player.height;
      player.vy = 0;
      player.grounded = true;
    }

    updateContactDamage(dt);
    updateCombat(dt);
    updateTrialMetrics(dt, previousX, previousY);
    brainController?.observe(buildBrainObservation());
    updateHud();
  }

  function updateCombat(dt) {
    player.attackCooldownTimer = Math.max(
      0,
      player.attackCooldownTimer - dt,
    );
    player.attackTimer = Math.max(0, player.attackTimer - dt);
    mushroom.hitFlashTimer = Math.max(0, mushroom.hitFlashTimer - dt);

    if (!mushroom.alive && trial?.active) {
      mushroom.respawnTimerMs = Math.max(
        0,
        mushroom.respawnTimerMs - dt * 1000,
      );

      if (mushroom.respawnTimerMs === 0) {
        respawnMushroom();
      }
    }

    for (let index = damagePopups.length - 1; index >= 0; index -= 1) {
      const popup = damagePopups[index];
      popup.life -= dt;
      popup.y -= 34 * dt;

      if (popup.life <= 0) {
        damagePopups.splice(index, 1);
      }
    }
  }

  function updateTrialMetrics(dt, previousX, previousY) {
    if (!trial?.active) {
      return;
    }

    const dx = player.x - previousX;
    const dy = player.y - previousY;
    const moved = Math.hypot(dx, dy);
    trial.distance += moved;

    if (mushroom.alive) {
      if (Math.abs(dx) > 0.0001) {
        const directionToTarget = Math.sign(
          mushroom.x - (previousX + player.width / 2),
        );

        if (Math.sign(dx) === directionToTarget) {
          trial.towardDistance += Math.abs(dx);
        } else {
          trial.awayDistance += Math.abs(dx);
        }
      }

      const distance = targetDistance();
      trial.minTargetDistance = Math.min(
        trial.minTargetDistance,
        distance,
      );

      const meleeProximity = COMBAT.attackRange + 35;
      if (distance <= meleeProximity) {
        trial.timeWithinAttackRangeMs += dt * 1000;
      }
    }

    trial.lastX = player.x;
    trial.lastY = player.y;
  }

  function getTrialSnapshot() {
    if (!trial) {
      return null;
    }

    const horizontalTravel =
      trial.towardDistance + trial.awayDistance;

    return {
      durationMs: performance.now() - trial.startedAt,
      totalDistancePx: trial.distance,
      towardDistancePx: trial.towardDistance,
      awayDistancePx: trial.awayDistance,
      towardMovementRatio:
        horizontalTravel > 0
          ? trial.towardDistance / horizontalTravel
          : 0,
      minTargetDistancePx: trial.minTargetDistance,
      timeWithinAttackRangeMs: trial.timeWithinAttackRangeMs,
      decisions: { ...trial.decisions },
      hits: trial.hits,
      kills: trial.kills,
      respawns: trial.respawns,
      spawnPositions: [...trial.spawnPositions],
      firstHitMs: trial.firstHitMs,
      firstKillMs: trial.firstKillMs,
      contacts: trial.contacts,
      damageTaken: trial.damageTaken,
      firstContactMs: trial.firstContactMs,
      deathAtMs: trial.deathAtMs,
      potionUses: trial.potionUses,
      quickPotionUses: trial.quickPotionUses,
      totalHealed: trial.totalHealed,
      wastedHealing: trial.wastedHealing,
      averageHpAtUse:
        trial.potionUses > 0
          ? trial.hpAtUseTotal / trial.potionUses
          : null,
      potionEvents: [...trial.potionEvents],
      potionsRemaining: player.potions,
      finalTargetHp: mushroom.hp,
      finalPlayerHp: player.hp,
      playerDead: player.dead,
      finalPlayerX: player.x,
    };
  }

  function getStateSnapshot() {
    return {
      player: { ...player },
      mushroom: { ...mushroom },
      trial: getTrialSnapshot(),
    };
  }

  function updateHud() {
    positionEl.textContent =
      `x ${Math.round(player.x)} · y ${Math.round(player.y)}`;
    combatEl.textContent =
      `HP ${player.hp}/${player.maxHp} · 🧪 ${player.potions}/${POTION.maxCount} (+${POTION.heal}) · TOUCH -${PLAYER_STATUS.contactDamage} · KILLS ${player.kills}`;

    stateEl.textContent = player.dead
      ? "KO"
      : player.grounded
        ? "GROUND"
        : "AIR";

    if (controlModeEl) {
      controlModeEl.textContent = brainController?.isEnabled()
        ? "🪰 FLY #001"
        : "👤 MANUAL";
    }
  }

  function draw() {
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);
    drawBackground();
    drawArenaLabel();
    drawMushroom();
    drawAttackEffect();
    drawPlayer();
    drawDamagePopups();
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
    ctx.fillRect(
      0,
      WORLD.groundY + 16,
      WORLD.width,
      WORLD.height - WORLD.groundY,
    );
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

  function drawArenaLabel() {
    ctx.save();
    ctx.fillStyle = "rgba(55, 76, 94, 0.55)";
    ctx.font = "800 16px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "EXPERIMENT V8 · FLY #001 SKILL",
      WORLD.width / 2,
      100,
    );
    ctx.font = "600 12px Inter, sans-serif";
    ctx.fillText(
      "v7에서 학습한 LEFT/RIGHT + 기존 JUMP/ATTACK/POTION decoder",
      WORLD.width / 2,
      122,
    );
    ctx.restore();
  }

  function drawMushroom() {
    if (!mushroom.alive) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "#687887";
      ctx.font = "800 13px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("KO", mushroom.x, mushroom.baselineY - 18);
      ctx.font = "700 10px Inter, sans-serif";
      ctx.fillText(
        `RESPAWN ${Math.max(0, mushroom.respawnTimerMs / 1000).toFixed(1)}s`,
        mushroom.x,
        mushroom.baselineY - 3,
      );
      ctx.restore();
      return;
    }

    const centerX = mushroom.x;
    const baselineY = mushroom.baselineY;
    const capY = baselineY - 62;

    ctx.save();
    ctx.fillStyle =
      mushroom.hitFlashTimer > 0 ? "#fff5f2" : "#d9655d";
    ctx.beginPath();
    ctx.arc(centerX, capY + 19, 32, Math.PI, 0);
    ctx.quadraticCurveTo(
      centerX + 32,
      capY + 34,
      centerX + 25,
      capY + 38,
    );
    ctx.lineTo(centerX - 25, capY + 38);
    ctx.quadraticCurveTo(
      centerX - 32,
      capY + 34,
      centerX - 32,
      capY + 19,
    );
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle =
      mushroom.hitFlashTimer > 0 ? "#ffffff" : "#fff4dd";
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

    drawHpBar();
    ctx.restore();
  }

  function drawHpBar() {
    const width = 70;
    const height = 8;
    const x = mushroom.x - width / 2;
    const y = mushroom.baselineY - 86;
    const ratio = mushroom.hp / mushroom.maxHp;

    ctx.fillStyle = "rgba(24, 31, 38, 0.75)";
    ctx.fillRect(x - 1, y - 1, width + 2, height + 2);
    ctx.fillStyle = "#dfe5e9";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = ratio > 0.34 ? "#57ad63" : "#d85f55";
    ctx.fillRect(x, y, width * ratio, height);

    ctx.fillStyle = "#33404b";
    ctx.font = "700 10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `${mushroom.id}  HP ${mushroom.hp}/${mushroom.maxHp}`,
      mushroom.x,
      y - 6,
    );
  }

  function drawAttackEffect() {
    if (player.attackTimer <= 0) {
      return;
    }

    const progress =
      1 - player.attackTimer / COMBAT.attackDuration;
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;
    const direction = player.facing;
    const reach = 30 + 40 * progress;

    ctx.save();
    ctx.strokeStyle = "rgba(255, 176, 54, 0.92)";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(centerX + direction * 10, centerY - 17);
    ctx.quadraticCurveTo(
      centerX + direction * reach,
      centerY - 8,
      centerX + direction * (reach + 8),
      centerY + 16,
    );
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 246, 211, 0.95)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawDamagePopups() {
    for (const popup of damagePopups) {
      const alpha = Math.max(0, popup.life / popup.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      const healing = popup.target === "heal";
      ctx.fillStyle = healing ? "#32a95c" : "#c4473d";
      ctx.font = "900 22px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `${healing ? "+" : "-"}${popup.value}`,
        popup.x,
        popup.y,
      );
      ctx.restore();
    }
  }

  function drawPlayer() {
    const centerX = player.x + player.width / 2;
    const feetY = player.y + player.height;

    ctx.save();

    if (player.dead) {
      ctx.globalAlpha = 0.45;
    }

    if (brainController?.isEnabled()) {
      ctx.fillStyle = "rgba(88, 183, 112, 0.18)";
      ctx.beginPath();
      ctx.arc(centerX, player.y + 20, 29, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle =
      player.hitFlashTimer > 0 ? "#ff8b82" : "#4f91dd";
    ctx.beginPath();
    ctx.roundRect(
      player.x + 5,
      player.y + 17,
      player.width - 10,
      27,
      8,
    );
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
    ctx.fillRect(
      player.x + player.width - 15,
      feetY - 3,
      8,
      3,
    );

    ctx.restore();

    const barWidth = 58;
    const barX = centerX - barWidth / 2;
    const barY = player.y - 22;
    const hpRatio = player.hp / player.maxHp;

    ctx.save();
    ctx.fillStyle = "rgba(35, 44, 54, 0.24)";
    ctx.fillRect(barX, barY, barWidth, 7);
    ctx.fillStyle =
      hpRatio > 0.5
        ? "#4eb86b"
        : hpRatio > 0.2
          ? "#e0a83d"
          : "#d84f48";
    ctx.fillRect(barX, barY, barWidth * hpRatio, 7);
    ctx.strokeStyle = "rgba(35, 44, 54, 0.55)";
    ctx.strokeRect(barX, barY, barWidth, 7);
    ctx.fillStyle = "#34404a";
    ctx.font = "800 10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      player.dead ? "KO" : `HP ${player.hp}`,
      centerX,
      barY - 3,
    );
    ctx.restore();
  }

  brainController = window.MapleFlyBrain?.createController({
    onModeChange(enabled) {
      keys.clear();
      if (controlModeEl) {
        controlModeEl.textContent = enabled
          ? "🪰 FLY #001"
          : "👤 MANUAL";
      }
    },
    onDecision(decision) {
      recordDecision(decision);
    },
  }) ?? null;

  window.MapleFlyGame = Object.freeze({
    WORLD,
    COMBAT,
    PLAYER_STATUS,
    POTION,
    getBrainController() {
      return brainController;
    },
    startTrial,
    finishTrial,
    cancelTrial,
    resetArena,
    getStateSnapshot,
    getTrialSnapshot,
  });

  let lastTime = performance.now();

  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  resetArena(64);
  requestAnimationFrame(frame);
})();
