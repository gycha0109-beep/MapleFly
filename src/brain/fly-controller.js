(function attachMapleFlyBrain(global) {
  "use strict";

  const SOURCE = Object.freeze({
    repository: "alextitonis/fly.ai",
    commit: "95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e",
    assetBase:
      "https://raw.githubusercontent.com/alextitonis/fly.ai/95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e/world/public/connectome/",
    neurons: 166700,
    synapses: 25088107,
    weightsMb: 57.6,
  });

  const DECODER = Object.freeze({
    steerFloorHz: 1.1,
    steerMarginHz: 0.4,
    jumpHz: 5.0,
    attackHz: 2.0,
    climbHz: 2.5,
    climbMarginHz: 0.8,
    jumpCooldownMs: 750,
    attackCooldownMs: 420,
    drinkHz: 1.6,
    drinkCooldownMs: 800,
    potionTasteDrive: 0.8,
    sensoryUpdateSteps: 2,
    brainStepMs: 20,
  });

  const SKILL_RUNTIME = Object.freeze({
    stepSeconds: 0.02,
    windowSteps: 26,
  });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatHz(value) {
    return Number.isFinite(value) ? value.toFixed(1) : "—";
  }

  class BrainController {
    constructor(options = {}) {
      this.options = options;
      this.worker = null;
      this.ready = false;
      this.loading = false;
      this.enabled = false;
      this.sensoryEnabled = true;
      this.outputs = [];
      this.rates = new Map();
      this.intent = this.emptyIntent();
      this.nextJumpAt = 0;
      this.nextAttackAt = 0;
      this.nextPotionAt = 0;
      this.potionAvailable = false;
      this.lastObservationStep = -Infinity;
      this.lastTargetId = null;
      this.lastTargetDistance = null;
      this.resetSerial = 0;
      this.pendingResets = new Map();
      this.telemetry = {
        fired: 0,
        ms: 0,
        steps: 0,
      };

      this.skillApi = global.MapleFlySkillV7 ?? null;
      this.skillState =
        this.skillApi?.loadState?.() ?? null;
      this.skillConfigured = !this.skillState;
      this.skillPhase = this.skillState
        ? "WAITING"
        : "DISABLED";
      this.skillPhaseSteps = 0;
      this.skillLastSteps = 0;
      this.skillBaselineSpikes = null;
      this.skillCueSpikes = null;
      this.skillBaselineHz = null;
      this.skillAction = "IDLE";
      this.skillScore = 0;
      this.skillTargetAvailable = false;

      this.elements = {
        status: document.getElementById("brain-status"),
        progress: document.getElementById("brain-progress"),
        load: document.getElementById("brain-load"),
        toggle: document.getElementById("brain-toggle"),
        neurons: document.getElementById("brain-neurons"),
        synapses: document.getElementById("brain-synapses"),
        fired: document.getElementById("brain-fired"),
        step: document.getElementById("brain-step"),
        steerL: document.getElementById("brain-steer-l"),
        steerR: document.getElementById("brain-steer-r"),
        escape: document.getElementById("brain-escape"),
        arm: document.getElementById("brain-arm"),
        head: document.getElementById("brain-head"),
        action: document.getElementById("brain-action"),
        source: document.getElementById("brain-source"),
        sensory: document.getElementById("brain-sensory"),
        skill: document.getElementById("brain-skill"),
        skillState: document.getElementById("brain-skill-state"),
      };

      if (this.elements.source) {
        this.elements.source.textContent =
          `fly.ai @ ${SOURCE.commit.slice(0, 8)}`;
      }

      this.bindUi();
      this.render();
    }

    emptyIntent() {
      return {
        left: false,
        right: false,
        up: false,
        down: false,
        jump: false,
        attack: false,
        potion: false,
        label: "IDLE",
      };
    }

    bindUi() {
      this.elements.load?.addEventListener("click", () => this.load());
      this.elements.toggle?.addEventListener("click", () => {
        this.setEnabled(!this.enabled);
      });
    }

    load() {
      if (this.ready || this.loading) {
        return;
      }

      this.loading = true;
      this.setStatus("LOADING");
      this.setProgress("Worker 시작 중 · 약 58MB 다운로드 예정");
      this.worker = new Worker("./src/brain/fly-worker.js");

      this.worker.onmessage = (event) => {
        this.handleWorkerMessage(event.data ?? {});
      };

      this.worker.onerror = (event) => {
        this.fail(event.message || "Worker 실행 오류");
      };

      this.worker.postMessage({
        type: "load",
        base: SOURCE.assetBase,
        source: {
          repository: SOURCE.repository,
          commit: SOURCE.commit,
        },
      });

      this.render();
    }

    handleWorkerMessage(message) {
      if (message.type === "progress") {
        this.setProgress(message.text);
        return;
      }

      if (message.type === "ready") {
        this.ready = true;
        this.loading = false;
        this.outputs = message.outputs ?? [];
        this.rates = new Map(this.outputs.map((name) => [name, 0]));

        if (this.elements.neurons) {
          this.elements.neurons.textContent =
            Number(message.n ?? SOURCE.neurons).toLocaleString();
        }

        if (this.elements.synapses) {
          this.elements.synapses.textContent =
            Number(message.nnz ?? SOURCE.synapses).toLocaleString();
        }

        if (this.skillState) {
          this.setProgress(
            "MaleCNS 준비 완료 · Fly #001 skill 연결 중",
          );
          this.worker.postMessage({
            type: "configure-skill",
            featureIndices:
              this.skillState.featureIndices,
            expectedDnCount:
              this.skillState.originalFeatureCount,
          });
        } else {
          this.setProgress(
            "실제 MaleCNS connectome 준비 완료",
          );
        }

        this.setStatus("READY");
        this.options.onReady?.();
        this.render();
        return;
      }

      if (message.type === "skill-ready") {
        if (!this.skillState) {
          return;
        }

        if (
          message.selectedCount !==
          this.skillState.sparseFeatureCount
        ) {
          this.fail(
            "Fly #001 skill feature count mismatch",
          );
          return;
        }

        this.skillConfigured = true;
        this.skillBaselineSpikes =
          new Float64Array(message.selectedCount);
        this.skillCueSpikes =
          new Float64Array(message.selectedCount);
        this.skillBaselineHz =
          new Float64Array(message.selectedCount);
        this.skillPhase = "WAITING";

        this.setProgress(
          "Fly #001 v7 skill 준비 완료 · 브라우저에 저장됨",
        );
        this.render();
        return;
      }

      if (message.type === "rates") {
        const values = message.hz ?? [];

        for (let index = 0; index < this.outputs.length; index += 1) {
          this.rates.set(this.outputs[index], values[index] ?? 0);
        }

        this.telemetry.fired = message.fired ?? 0;
        this.telemetry.ms = message.ms ?? 0;
        this.telemetry.steps = message.steps ?? 0;

        this.ingestSkillSample(
          message.skillSpikes ?? null,
          this.telemetry.steps,
        );

        if (this.enabled) {
          this.decode();
        }

        this.renderTelemetry();
        return;
      }

      if (message.type === "reset") {
        this.rates = new Map(this.outputs.map((name) => [name, 0]));
        this.intent = this.emptyIntent();
        this.nextJumpAt = 0;
        this.nextAttackAt = 0;
        this.nextPotionAt = 0;
        this.potionAvailable = false;
        this.lastObservationStep = -Infinity;
        this.lastTargetId = null;
        this.lastTargetDistance = null;
        this.resetSkillRuntime(this.enabled);
        this.renderTelemetry();

        const pending = this.pendingResets.get(message.requestId);
        if (pending) {
          this.pendingResets.delete(message.requestId);
          pending.resolve(message);
        }
        return;
      }

      if (message.type === "error") {
        this.fail(message.text || "connectome 로드 실패");
      }
    }

    fail(text) {
      this.loading = false;
      this.ready = false;
      this.enabled = false;
      this.setStatus("ERROR");
      this.setProgress(text);
      this.options.onModeChange?.(false);
      this.options.onError?.(text);
      this.render();
    }

    setEnabled(enabled) {
      if (enabled && !this.ready) {
        this.load();
        return;
      }

      if (
        enabled &&
        this.skillState &&
        !this.skillConfigured
      ) {
        this.setProgress(
          "Fly #001 skill 연결을 기다리는 중",
        );
        return;
      }

      this.enabled = Boolean(enabled && this.ready);

      if (this.enabled && this.skillState) {
        this.startSkillCalibration();
      }

      if (!this.enabled) {
        this.intent = this.emptyIntent();
        this.worker?.postMessage({
          type: "input",
          drive: {},
        });
        this.resetSkillRuntime(false);
      }

      this.setStatus(
        this.enabled
          ? this.skillState
            ? "CALIBRATING"
            : "FLY CONTROL"
          : "READY",
      );
      this.options.onModeChange?.(this.enabled);
      this.render();
    }

    setSensoryEnabled(enabled) {
      this.sensoryEnabled = Boolean(enabled);
      if (!this.sensoryEnabled) {
        this.worker?.postMessage({ type: "input", drive: {} });
      }
      this.renderTelemetry();
    }

    isSensoryEnabled() {
      return this.sensoryEnabled;
    }

    isEnabled() {
      return this.enabled;
    }

    isReady() {
      return this.ready;
    }

    getTelemetry() {
      return { ...this.telemetry };
    }

    async reset(seed = 64) {
      this.nextJumpAt = 0;
      this.nextAttackAt = 0;
      this.nextPotionAt = 0;
      this.potionAvailable = false;
      this.lastObservationStep = -Infinity;
      this.lastTargetId = null;
      this.lastTargetDistance = null;
      this.intent = this.emptyIntent();
      this.resetSkillRuntime(this.enabled);

      if (!this.worker || !this.ready) {
        return { seed, skipped: true };
      }

      const requestId = ++this.resetSerial;

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pendingResets.delete(requestId);
          reject(new Error("brain reset timeout"));
        }, 3000);

        this.pendingResets.set(requestId, {
          resolve: (message) => {
            clearTimeout(timeout);
            resolve(message);
          },
        });

        this.worker.postMessage({
          type: "reset",
          seed,
          requestId,
        });
      });
    }

    observe(observation) {
      if (!this.worker || !this.ready) {
        return;
      }

      const step = this.telemetry.steps ?? 0;

      if (
        step - this.lastObservationStep <
        DECODER.sensoryUpdateSteps
      ) {
        return;
      }

      this.lastObservationStep = step;
      this.potionAvailable = Boolean(
        observation?.player?.potionCue,
      );
      this.skillTargetAvailable = Boolean(
        (observation?.mushrooms ?? []).some(
          (mushroom) => mushroom.alive,
        ),
      );

      const calibrating =
        this.enabled &&
        this.skillState &&
        this.skillConfigured &&
        this.skillPhase !== "LIVE";

      const drive =
        this.enabled && this.sensoryEnabled
          ? calibrating
            ? this.encodeSkillBaselineObservation(
                observation,
              )
            : this.encodeObservation(observation)
          : {};

      this.worker.postMessage({
        type: "input",
        drive,
      });
    }

    encodeObservation(observation) {
      const living = (observation.mushrooms ?? []).filter(
        (mushroom) => mushroom.alive,
      );

      const playerCenterX =
        observation.player.x + observation.player.width / 2;
      const playerCenterY =
        observation.player.y + observation.player.height / 2;

      const drive = {
        SNta_L: observation.player.grounded ? 0.05 : 0,
        SNta_R: observation.player.grounded ? 0.05 : 0,
      };

      const impactSide = observation.player.impactSide;
      const impactPulse = Number(observation.player.impactPulse ?? 0);

      if (
        impactPulse > 0 &&
        (impactSide === "L" || impactSide === "R")
      ) {
        drive[`LgLG_${impactSide}`] = clamp(
          impactPulse,
          0,
          0.8,
        );
      }

      if (observation.player.potionCue) {
        drive.taste_L = DECODER.potionTasteDrive;
        drive.taste_R = DECODER.potionTasteDrive;
      }

      if (living.length === 0) {
        this.lastTargetId = null;
        this.lastTargetDistance = null;
        return drive;
      }

      let target = living[0];
      let bestDistance = Infinity;

      for (const mushroom of living) {
        const dx = mushroom.x - playerCenterX;
        const dy = mushroom.y - 32 - playerCenterY;
        const distance = Math.hypot(dx, dy);

        if (distance < bestDistance) {
          bestDistance = distance;
          target = mushroom;
        }
      }

      const dx = target.x - playerCenterX;
      const side = dx < 0 ? "L" : "R";
      const closeness = clamp(1 - bestDistance / 620, 0, 1);
      let approaching = 0;

      if (
        this.lastTargetId === target.id &&
        Number.isFinite(this.lastTargetDistance)
      ) {
        approaching = clamp(
          (this.lastTargetDistance - bestDistance) / 45,
          0,
          1,
        );
      }

      this.lastTargetId = target.id;
      this.lastTargetDistance = bestDistance;

      drive[`LC10a_${side}`] = clamp(
        0.12 + closeness * 0.68,
        0,
        0.8,
      );

      drive[`LPLC1_${side}`] = clamp(
        closeness * 0.12 + approaching * 0.32,
        0,
        0.55,
      );

      drive[`LPLC2_${side}`] = clamp(
        closeness * 0.24 + approaching * 0.38,
        0,
        0.8,
      );

      if (bestDistance < 175) {
        drive[`LC4_${side}`] = clamp(
          ((175 - bestDistance) / 175) * 0.72 +
            approaching * 0.18,
          0,
          0.8,
        );
      }

      return drive;
    }

    encodeSkillBaselineObservation(observation) {
      return {
        SNta_L: observation.player.grounded ? 0.05 : 0,
        SNta_R: observation.player.grounded ? 0.05 : 0,
      };
    }

    resetSkillRuntime(active = false) {
      if (!this.skillState) {
        this.skillPhase = "DISABLED";
        return;
      }

      this.skillPhase = active
        ? "SETTLE"
        : "WAITING";
      this.skillPhaseSteps = 0;
      this.skillLastSteps =
        this.telemetry.steps ?? 0;
      this.skillBaselineSpikes?.fill(0);
      this.skillCueSpikes?.fill(0);
      this.skillBaselineHz?.fill(0);
      this.skillAction = "IDLE";
      this.skillScore = 0;
    }

    startSkillCalibration() {
      this.resetSkillRuntime(true);
      this.setProgress(
        "Fly #001 calibration · visual OFF baseline 1.04초",
      );
    }

    ingestSkillSample(spikes, steps) {
      if (
        !this.enabled ||
        !this.skillState ||
        !this.skillConfigured ||
        !Array.isArray(spikes) ||
        spikes.length !==
          this.skillState.sparseFeatureCount
      ) {
        this.skillLastSteps = steps;
        return;
      }

      let deltaSteps = steps - this.skillLastSteps;
      this.skillLastSteps = steps;

      if (
        !Number.isFinite(deltaSteps) ||
        deltaSteps <= 0
      ) {
        return;
      }

      if (this.skillPhase === "SETTLE") {
        this.skillPhaseSteps += deltaSteps;

        if (
          this.skillPhaseSteps >=
          SKILL_RUNTIME.windowSteps
        ) {
          this.skillPhase = "BASELINE";
          this.skillPhaseSteps = 0;
          this.skillBaselineSpikes.fill(0);
          this.setProgress(
            "Fly #001 calibration · baseline 수집 중",
          );
        }
        return;
      }

      const target =
        this.skillPhase === "BASELINE"
          ? this.skillBaselineSpikes
          : this.skillPhase === "LIVE"
            ? this.skillCueSpikes
            : null;

      if (!target) {
        return;
      }

      for (
        let index = 0;
        index < target.length;
        index += 1
      ) {
        target[index] += spikes[index] ?? 0;
      }

      this.skillPhaseSteps += deltaSteps;

      if (
        this.skillPhaseSteps <
        SKILL_RUNTIME.windowSteps
      ) {
        return;
      }

      const seconds =
        this.skillPhaseSteps *
        SKILL_RUNTIME.stepSeconds;

      if (this.skillPhase === "BASELINE") {
        for (
          let index = 0;
          index < this.skillBaselineHz.length;
          index += 1
        ) {
          this.skillBaselineHz[index] =
            this.skillBaselineSpikes[index] /
            seconds;
        }

        this.skillPhase = "LIVE";
        this.skillPhaseSteps = 0;
        this.skillCueSpikes.fill(0);
        this.skillAction = "IDLE";
        this.setStatus("FLY SKILL");
        this.setProgress(
          "Fly #001 LIVE · 학습된 LEFT/RIGHT skill 사용 중",
        );
        return;
      }

      const feature =
        new Float64Array(target.length);
      let normSquared = 0;

      for (
        let index = 0;
        index < target.length;
        index += 1
      ) {
        const cueHz =
          target[index] / seconds;
        const delta =
          (cueHz -
            this.skillBaselineHz[index]) /
          50;
        feature[index] = delta;
        normSquared += delta * delta;
      }

      const norm = Math.sqrt(normSquared);

      if (norm > 1e-9) {
        for (
          let index = 0;
          index < feature.length;
          index += 1
        ) {
          feature[index] /= norm;
        }
      }

      if (
        this.skillTargetAvailable &&
        norm > 1e-9
      ) {
        const decision =
          this.skillApi.choose(
            feature,
            this.skillState,
          );
        this.skillAction = decision.action;
        this.skillScore = decision.leftScore;
      } else {
        this.skillAction = "IDLE";
        this.skillScore = 0;
      }

      this.skillPhaseSteps = 0;
      this.skillCueSpikes.fill(0);
    }

    rate(name) {
      return this.rates.get(name) ?? 0;
    }

    decode() {
      const now =
        (this.telemetry.steps ?? 0) * DECODER.brainStepMs;
      const steerL = this.rate("DNa02 L");
      const steerR = this.rate("DNa02 R");
      const strongestSteer = Math.max(steerL, steerR);
      const steerDifference = steerL - steerR;

      let left = false;
      let right = false;

      if (
        this.skillState &&
        this.skillConfigured &&
        this.skillPhase !== "LIVE"
      ) {
        this.intent = {
          ...this.emptyIntent(),
          label: "CALIBRATE",
        };
        this.options.onDecision?.({
          ...this.intent,
          at: now,
          rates: {
            skillPhase: this.skillPhase,
            skillScore: this.skillScore,
          },
        });
        return;
      }

      if (strongestSteer >= DECODER.steerFloorHz) {
        if (steerDifference >= DECODER.steerMarginHz) {
          left = true;
        } else if (steerDifference <= -DECODER.steerMarginHz) {
          right = true;
        }
      }

      if (
        this.skillState &&
        this.skillConfigured
      ) {
        left =
          this.skillTargetAvailable &&
          this.skillAction === "LEFT";
        right =
          this.skillTargetAvailable &&
          this.skillAction === "RIGHT";
      }

      const escape = Math.max(
        this.rate("DNp01 L"),
        this.rate("DNp01 R"),
      );

      const armPull = Math.max(
        this.rate("arm pull L"),
        this.rate("arm pull R"),
      );

      const extend = Math.max(
        this.rate("leg extend L"),
        this.rate("leg extend R"),
      );

      const flex = Math.max(
        this.rate("leg flex L"),
        this.rate("leg flex R"),
      );

      const headL = this.rate("neck/head L");
      const headR = this.rate("neck/head R");
      const headMotor = (headL + headR) / 2;

      let jump = false;
      let attack = false;
      let potion = false;
      let up = false;
      let down = false;

      if (escape >= DECODER.jumpHz && now >= this.nextJumpAt) {
        jump = true;
        this.nextJumpAt = now + DECODER.jumpCooldownMs;
      }

      if (armPull >= DECODER.attackHz && now >= this.nextAttackAt) {
        attack = true;
        this.nextAttackAt = now + DECODER.attackCooldownMs;
      }

      if (
        this.potionAvailable &&
        headMotor >= DECODER.drinkHz &&
        now >= this.nextPotionAt
      ) {
        potion = true;
        this.nextPotionAt = now + DECODER.drinkCooldownMs;
      }

      if (
        extend >= DECODER.climbHz &&
        extend - flex >= DECODER.climbMarginHz
      ) {
        up = true;
      } else if (
        flex >= DECODER.climbHz &&
        flex - extend >= DECODER.climbMarginHz
      ) {
        down = true;
      }

      let label = "IDLE";

      if (potion) {
        label = "POTION";
      } else if (jump) {
        label = "JUMP";
      } else if (attack) {
        label = "ATTACK";
      } else if (left) {
        label = "LEFT";
      } else if (right) {
        label = "RIGHT";
      } else if (up) {
        label = "UP";
      } else if (down) {
        label = "DOWN";
      }

      this.intent = {
        left,
        right,
        up,
        down,
        jump,
        attack,
        potion,
        label,
      };

      this.options.onDecision?.({
        ...this.intent,
        at: now,
        rates: {
          steerL,
          steerR,
          escape,
          armPull,
          extend,
          flex,
          headL,
          headR,
          headMotor,
          skillPhase: this.skillPhase,
          skillScore: this.skillScore,
        },
      });
    }

    consumeIntent() {
      const current = { ...this.intent };
      this.intent.jump = false;
      this.intent.attack = false;
      this.intent.potion = false;
      return current;
    }

    setStatus(text) {
      if (this.elements.status) {
        this.elements.status.textContent = text;
        this.elements.status.dataset.state = text
          .toLowerCase()
          .replaceAll(" ", "-");
      }
    }

    setProgress(text) {
      if (this.elements.progress) {
        this.elements.progress.textContent = text;
      }
    }

    renderTelemetry() {
      const steerL = this.rate("DNa02 L");
      const steerR = this.rate("DNa02 R");
      const escape = Math.max(
        this.rate("DNp01 L"),
        this.rate("DNp01 R"),
      );
      const armPull = Math.max(
        this.rate("arm pull L"),
        this.rate("arm pull R"),
      );

      const headMotor =
        (this.rate("neck/head L") + this.rate("neck/head R")) / 2;

      if (this.elements.fired) {
        this.elements.fired.textContent =
          Math.round(this.telemetry.fired).toLocaleString();
      }

      if (this.elements.step) {
        this.elements.step.textContent =
          `${this.telemetry.ms.toFixed(1)} ms`;
      }

      if (this.elements.steerL) {
        this.elements.steerL.textContent = `${formatHz(steerL)} Hz`;
      }

      if (this.elements.steerR) {
        this.elements.steerR.textContent = `${formatHz(steerR)} Hz`;
      }

      if (this.elements.escape) {
        this.elements.escape.textContent = `${formatHz(escape)} Hz`;
      }

      if (this.elements.arm) {
        this.elements.arm.textContent = `${formatHz(armPull)} Hz`;
      }

      if (this.elements.head) {
        this.elements.head.textContent = `${formatHz(headMotor)} Hz`;
      }

      if (this.elements.action) {
        this.elements.action.textContent = this.enabled
          ? this.skillState &&
            this.skillPhase !== "LIVE"
            ? "CALIBRATE"
            : this.intent.label
          : "MANUAL";
      }

      if (this.elements.skill) {
        this.elements.skill.textContent =
          this.skillState
            ? this.skillState.flyId +
              " · " +
              this.skillState.version
            : "LEGACY";
      }

      if (this.elements.skillState) {
        const score =
          Number.isFinite(this.skillScore)
            ? this.skillScore.toFixed(3)
            : "—";
        this.elements.skillState.textContent =
          this.skillState
            ? this.skillPhase +
              (this.skillPhase === "LIVE"
                ? " · " +
                  this.skillAction +
                  " · " +
                  score
                : "")
            : "—";
      }

      if (this.elements.sensory) {
        this.elements.sensory.textContent = this.sensoryEnabled
          ? "ON"
          : "OFF";
      }
    }

    render() {
      if (this.elements.load) {
        this.elements.load.disabled = this.loading || this.ready;
        this.elements.load.textContent = this.loading
          ? "🧠 뇌 불러오는 중…"
          : this.ready
            ? "✓ 뇌 준비 완료"
            : "🧠 초파리 뇌 불러오기 (~58MB)";
      }

      if (this.elements.toggle) {
        this.elements.toggle.disabled =
          !this.ready ||
          Boolean(
            this.skillState &&
            !this.skillConfigured,
          );
        this.elements.toggle.textContent = this.enabled
          ? "사람이 다시 조종"
          : this.skillState
            ? "🪰 FLY #001 CONTROL 시작"
            : "🪰 FLY CONTROL 시작";
      }

      this.renderTelemetry();
    }
  }

  global.MapleFlyBrain = Object.freeze({
    SOURCE,
    createController(options) {
      return new BrainController(options);
    },
  });
})(window);
