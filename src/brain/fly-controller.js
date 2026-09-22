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
    settleSteps: 26,
    baselineSteps: 26,
    movementWindowSteps: 26,
    attackWindowSteps: 5,
    jumpWindowSteps: 5,
    jumpCooldownSteps: 38,
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
      this.attackSkillApi =
        global.MapleFlyAttackSkillV10 ?? null;
      this.attackSkillState =
        this.attackSkillApi?.loadState?.() ?? null;
      this.jumpSkillApi =
        global.MapleFlyJumpSkillV11H2 ?? null;
      this.jumpSkillState =
        this.jumpSkillApi?.loadState?.() ?? null;
      this.jumpSkillRuntime =
        this.jumpSkillApi?.createRuntime?.() ?? null;
      this.skillConfigured =
        !(this.skillState ||
          this.attackSkillState ||
          this.jumpSkillState);
      this.skillPhase =
        this.skillState ||
        this.attackSkillState ||
        this.jumpSkillState
          ? "WAITING"
          : "DISABLED";
      this.skillCalibrationStartStep = null;
      this.skillBaselineReady = {
        movement: false,
        attack: false,
        jump: false,
      };
      this.skillBaselineHz = null;
      this.attackBaselineHz = null;
      this.jumpBaselineHz = null;
      this.skillAction = "IDLE";
      this.skillScore = 0;
      this.attackSkillAction = "WAIT";
      this.attackSkillProbability = 0;
      this.attackSkillDecisionStep = null;
      this.jumpSkillAction = "WAIT";
      this.jumpSkillProbability = 0;
      this.jumpSkillDecisionStep = null;
      this.nextJumpSkillStep = 0;
      this.playerGrounded = true;
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

        if (
          this.skillState &&
          this.attackSkillState &&
          this.jumpSkillState
        ) {
          this.setProgress(
            "MaleCNS 준비 완료 · Fly #001 movement + ATTACK + JUMP skill 연결 중",
          );
          this.worker.postMessage({
            type: "configure-skills",
            expectedDnCount:
              this.skillState.originalFeatureCount,
            skills: [
              {
                id: "move",
                featureIndices:
                  this.skillState.featureIndices,
                windowSteps:
                  SKILL_RUNTIME.movementWindowSteps,
              },
              {
                id: "attack-baseline",
                featureIndices:
                  this.attackSkillState.selectedIndices,
                windowSteps:
                  SKILL_RUNTIME.baselineSteps,
              },
              {
                id: "attack",
                featureIndices:
                  this.attackSkillState.selectedIndices,
                windowSteps:
                  SKILL_RUNTIME.attackWindowSteps,
              },
              {
                id: "jump-baseline",
                featureIndices:
                  this.jumpSkillState.runtimeDnIndices,
                windowSteps:
                  SKILL_RUNTIME.baselineSteps,
              },
              {
                id: "jump",
                featureIndices:
                  this.jumpSkillState.runtimeDnIndices,
                windowSteps:
                  SKILL_RUNTIME.jumpWindowSteps,
              },
            ],
          });
        } else if (
          this.skillState ||
          this.attackSkillState ||
          this.jumpSkillState
        ) {
          this.fail(
            "Fly #001 movement/ATTACK/JUMP skill bundle mismatch",
          );
          return;
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

      if (message.type === "skills-ready") {
        if (
          !this.skillState ||
          !this.attackSkillState ||
          !this.jumpSkillState
        ) {
          return;
        }

        const specs = new Map(
          (message.skills ?? []).map((skill) => [
            skill.id,
            skill,
          ]),
        );
        const move = specs.get("move");
        const attackBaseline =
          specs.get("attack-baseline");
        const attack = specs.get("attack");
        const jumpBaseline =
          specs.get("jump-baseline");
        const jump = specs.get("jump");

        if (
          message.dnCount !==
            this.skillState.originalFeatureCount ||
          move?.selectedCount !==
            this.skillState.sparseFeatureCount ||
          move?.windowSteps !==
            SKILL_RUNTIME.movementWindowSteps ||
          attackBaseline?.selectedCount !==
            this.attackSkillState.sparseFeatureCount ||
          attackBaseline?.windowSteps !==
            SKILL_RUNTIME.baselineSteps ||
          attack?.selectedCount !==
            this.attackSkillState.sparseFeatureCount ||
          attack?.windowSteps !==
            SKILL_RUNTIME.attackWindowSteps ||
          jumpBaseline?.selectedCount !==
            this.jumpSkillState.sparseFeatureCount ||
          jumpBaseline?.windowSteps !==
            SKILL_RUNTIME.baselineSteps ||
          jump?.selectedCount !==
            this.jumpSkillState.sparseFeatureCount ||
          jump?.windowSteps !==
            SKILL_RUNTIME.jumpWindowSteps
        ) {
          this.fail(
            "Fly #001 exact-window skill contract mismatch",
          );
          return;
        }

        this.skillConfigured = true;
        this.skillBaselineHz =
          new Float64Array(move.selectedCount);
        this.attackBaselineHz =
          new Float64Array(attack.selectedCount);
        this.jumpBaselineHz =
          new Float64Array(jump.selectedCount);
        this.skillPhase = "WAITING";

        this.setProgress(
          "Fly #001 v7 movement + v10F ATTACK + v11H2 JUMP 준비 완료",
        );
        this.render();
        return;
      }

      if (message.type === "skills-reset") {
        if (message.reason === "calibration") {
          this.skillCalibrationStartStep =
            Number(message.startStep ?? 0);
          this.skillBaselineReady = {
            movement: false,
            attack: false,
            jump: false,
          };
          this.skillPhase = "SETTLE";
          this.setProgress(
            "Fly #001 calibration · visual OFF settle 0.52초",
          );
        } else if (message.reason === "live") {
          this.skillPhase = "LIVE";
          this.skillAction = "IDLE";
          this.skillScore = 0;
          this.attackSkillAction = "WAIT";
          this.attackSkillProbability = 0;
          this.attackSkillDecisionStep = null;
          this.jumpSkillApi?.resetRuntime?.(
            this.jumpSkillRuntime,
          );
          this.jumpSkillAction = "WAIT";
          this.jumpSkillProbability = 0;
          this.jumpSkillDecisionStep = null;
          this.nextJumpSkillStep = 0;
          this.setStatus("FLY SKILL");
          this.setProgress(
            "Fly #001 LIVE · learned movement + v10F ATTACK + v11H2 JUMP",
          );
        }
        this.renderTelemetry();
        return;
      }

      if (message.type === "skill-window") {
        this.ingestSkillWindow(message);

        if (
          this.enabled &&
          this.skillPhase === "LIVE"
        ) {
          this.decode(message.endStep);
        }

        this.renderTelemetry();
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
        if (this.enabled && this.skillConfigured) {
          this.startSkillCalibration();
        }
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
      this.playerGrounded = Boolean(
        observation?.player?.grounded,
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

      const obstacles = (
        observation.obstacles ?? []
      ).filter((obstacle) => obstacle.active !== false);

      for (const obstacle of obstacles) {
        const obstacleSide =
          obstacle.side === "L" ? "L" : "R";
        const obstacleWidth =
          Number(obstacle.width ?? 38);
        const obstacleX = Number(obstacle.x ?? 0);
        const obstaclePassed =
          obstacleSide === "R"
            ? observation.player.x >
              obstacleX + obstacleWidth
            : observation.player.x +
                observation.player.width <
              obstacleX;
        if (obstaclePassed) {
          continue;
        }

        const playerFront =
          obstacleSide === "R"
            ? observation.player.x +
              observation.player.width
            : observation.player.x;
        const obstacleFront =
          obstacleSide === "R"
            ? obstacleX
            : obstacleX + obstacleWidth;
        const frontDistance =
          obstacleSide === "R"
            ? obstacleFront - playerFront
            : playerFront - obstacleFront;
        const obstacleDrive = clamp(
          ((280 - Math.max(0, frontDistance)) / 280) *
            0.8,
          0,
          0.8,
        );
        for (const type of [
          "LC6",
          "LC16",
          "LC22",
          "LPLC4",
        ]) {
          drive[`${type}_${obstacleSide}`] =
            obstacleDrive;
        }
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
        const distance = Math.abs(dx);

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
        const targetLc4 = clamp(
          ((175 - bestDistance) / 175) * 0.72 +
            approaching * 0.18,
          0,
          0.8,
        );
        const key = `LC4_${side}`;
        drive[key] = Math.max(
          Number(drive[key] ?? 0),
          targetLc4,
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
        ? "CALIBRATION_PENDING"
        : "WAITING";
      this.skillCalibrationStartStep = null;
      this.skillBaselineReady = {
        movement: false,
        attack: false,
        jump: false,
      };
      this.skillBaselineHz?.fill(0);
      this.attackBaselineHz?.fill(0);
      this.jumpBaselineHz?.fill(0);
      this.skillAction = "IDLE";
      this.skillScore = 0;
      this.attackSkillAction = "WAIT";
      this.attackSkillProbability = 0;
      this.jumpSkillApi?.resetRuntime?.(
        this.jumpSkillRuntime,
      );
      this.jumpSkillAction = "WAIT";
      this.jumpSkillProbability = 0;
      this.jumpSkillDecisionStep = null;
      this.nextJumpSkillStep = 0;
    }

    startSkillCalibration() {
      this.resetSkillRuntime(true);
      this.worker?.postMessage({
        type: "reset-skill-windows",
        reason: "calibration",
      });
      this.setProgress(
        "Fly #001 calibration exact-window 정렬 중",
      );
    }

    ingestSkillWindow(message) {
      if (
        !this.enabled ||
        !this.skillState ||
        !this.attackSkillState ||
        !this.jumpSkillState ||
        !this.skillConfigured ||
        !Array.isArray(message.spikes)
      ) {
        return;
      }

      const skillId = String(message.skillId ?? "");
      const startStep = Number(message.startStep);
      const endStep = Number(message.endStep);
      const windowSteps = Number(message.windowSteps);

      if (
        !Number.isFinite(startStep) ||
        !Number.isFinite(endStep) ||
        !Number.isInteger(windowSteps) ||
        windowSteps <= 0
      ) {
        return;
      }

      if (
        this.skillPhase === "SETTLE" ||
        this.skillPhase === "BASELINE"
      ) {
        if (
          !Number.isFinite(
            this.skillCalibrationStartStep,
          )
        ) {
          return;
        }

        const settleEnd =
          this.skillCalibrationStartStep +
          SKILL_RUNTIME.settleSteps;
        const baselineStart = settleEnd + 1;
        const baselineEnd =
          settleEnd +
          SKILL_RUNTIME.baselineSteps;

        if (
          this.skillPhase === "SETTLE" &&
          endStep >= settleEnd
        ) {
          this.skillPhase = "BASELINE";
          this.setProgress(
            "Fly #001 calibration · visual OFF baseline 0.52초",
          );
        }

        if (
          startStep !== baselineStart ||
          endStep !== baselineEnd
        ) {
          return;
        }

        const seconds =
          SKILL_RUNTIME.baselineSteps *
          SKILL_RUNTIME.stepSeconds;

        if (
          skillId === "move" &&
          windowSteps ===
            SKILL_RUNTIME.movementWindowSteps &&
          message.spikes.length ===
            this.skillState.sparseFeatureCount
        ) {
          for (
            let index = 0;
            index < this.skillBaselineHz.length;
            index += 1
          ) {
            this.skillBaselineHz[index] =
              (message.spikes[index] ?? 0) /
              seconds;
          }
          this.skillBaselineReady.movement = true;
        }

        if (
          skillId === "attack-baseline" &&
          windowSteps ===
            SKILL_RUNTIME.baselineSteps &&
          message.spikes.length ===
            this.attackSkillState.sparseFeatureCount
        ) {
          for (
            let index = 0;
            index < this.attackBaselineHz.length;
            index += 1
          ) {
            this.attackBaselineHz[index] =
              (message.spikes[index] ?? 0) /
              seconds;
          }
          this.skillBaselineReady.attack = true;
        }

        if (
          skillId === "jump-baseline" &&
          windowSteps ===
            SKILL_RUNTIME.baselineSteps &&
          message.spikes.length ===
            this.jumpSkillState.sparseFeatureCount
        ) {
          for (
            let index = 0;
            index < this.jumpBaselineHz.length;
            index += 1
          ) {
            this.jumpBaselineHz[index] =
              (message.spikes[index] ?? 0) /
              seconds;
          }
          this.skillBaselineReady.jump = true;
        }

        if (
          this.skillBaselineReady.movement &&
          this.skillBaselineReady.attack &&
          this.skillBaselineReady.jump
        ) {
          this.skillPhase = "LIVE_PENDING";
          this.worker?.postMessage({
            type: "reset-skill-windows",
            reason: "live",
          });
          this.setProgress(
            "Fly #001 calibration 완료 · LIVE window 정렬 중",
          );
        }
        return;
      }

      if (this.skillPhase !== "LIVE") {
        return;
      }

      if (
        skillId === "move" &&
        windowSteps ===
          SKILL_RUNTIME.movementWindowSteps &&
        message.spikes.length ===
          this.skillState.sparseFeatureCount
      ) {
        const seconds =
          windowSteps *
          SKILL_RUNTIME.stepSeconds;
        const feature =
          new Float64Array(message.spikes.length);
        let normSquared = 0;

        for (
          let index = 0;
          index < feature.length;
          index += 1
        ) {
          const cueHz =
            (message.spikes[index] ?? 0) /
            seconds;
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
        return;
      }

      if (
        skillId === "attack" &&
        windowSteps ===
          SKILL_RUNTIME.attackWindowSteps &&
        message.spikes.length ===
          this.attackSkillState.sparseFeatureCount
      ) {
        const seconds =
          windowSteps *
          SKILL_RUNTIME.stepSeconds;
        const currentFeature =
          new Float64Array(message.spikes.length);

        for (
          let index = 0;
          index < currentFeature.length;
          index += 1
        ) {
          const cueHz =
            (message.spikes[index] ?? 0) /
            seconds;
          currentFeature[index] = clamp(
            (cueHz -
              this.attackBaselineHz[index]) /
              50,
            -1,
            1,
          );
        }

        const decision =
          this.attackSkillApi.chooseSparseCurrent(
            currentFeature,
            this.attackSkillState,
          );

        this.attackSkillAction = decision.action;
        this.attackSkillProbability =
          decision.attackProbability;
        this.attackSkillDecisionStep = endStep;
        return;
      }

      if (
        skillId === "jump" &&
        windowSteps ===
          SKILL_RUNTIME.jumpWindowSteps &&
        message.spikes.length ===
          this.jumpSkillState.sparseFeatureCount
      ) {
        const seconds =
          windowSteps *
          SKILL_RUNTIME.stepSeconds;
        const currentFeature =
          new Float64Array(message.spikes.length);

        for (
          let index = 0;
          index < currentFeature.length;
          index += 1
        ) {
          const cueHz =
            (message.spikes[index] ?? 0) /
            seconds;
          currentFeature[index] = clamp(
            (cueHz -
              this.jumpBaselineHz[index]) /
              50,
            -1,
            1,
          );
        }

        const available =
          this.playerGrounded &&
          endStep >= this.nextJumpSkillStep;
        const decision =
          this.jumpSkillApi.observeSparseWindow(
            currentFeature,
            available,
            this.jumpSkillState,
            this.jumpSkillRuntime,
          );

        this.jumpSkillAction = decision.action;
        this.jumpSkillProbability =
          decision.jumpProbability;
        this.jumpSkillDecisionStep = endStep;
      }
    }

    rate(name) {
      return this.rates.get(name) ?? 0;
    }

    decode(stepOverride = null) {
      const decisionStep =
        Number.isFinite(Number(stepOverride))
          ? Number(stepOverride)
          : (this.telemetry.steps ?? 0);
      const now =
        decisionStep * DECODER.brainStepMs;
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

      if (
        this.jumpSkillState &&
        this.skillConfigured &&
        this.skillPhase === "LIVE"
      ) {
        if (
          this.jumpSkillAction === "JUMP" &&
          decisionStep === this.jumpSkillDecisionStep &&
          this.playerGrounded &&
          decisionStep >= this.nextJumpSkillStep
        ) {
          jump = true;
          this.nextJumpSkillStep =
            decisionStep +
            SKILL_RUNTIME.jumpCooldownSteps;
          this.nextJumpAt =
            this.nextJumpSkillStep *
            DECODER.brainStepMs;
          this.jumpSkillApi.onActuatedJump(
            this.jumpSkillRuntime,
          );
        }
      } else if (
        escape >= DECODER.jumpHz &&
        now >= this.nextJumpAt
      ) {
        jump = true;
        this.nextJumpAt = now + DECODER.jumpCooldownMs;
      }

      if (
        this.attackSkillState &&
        this.skillConfigured &&
        this.skillPhase === "LIVE"
      ) {
        if (
          this.attackSkillAction === "ATTACK" &&
          decisionStep === this.attackSkillDecisionStep &&
          now >= this.nextAttackAt
        ) {
          attack = true;
          this.nextAttackAt =
            now + DECODER.attackCooldownMs;
        }
      } else if (
        !this.attackSkillState &&
        armPull >= DECODER.attackHz &&
        now >= this.nextAttackAt
      ) {
        attack = true;
        this.nextAttackAt =
          now + DECODER.attackCooldownMs;
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
          attackSkillAction:
            this.attackSkillAction,
          attackSkillProbability:
            this.attackSkillProbability,
          jumpSkillAction:
            this.jumpSkillAction,
          jumpSkillProbability:
            this.jumpSkillProbability,
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
          this.skillState &&
          this.attackSkillState &&
          this.jumpSkillState
            ? this.skillState.flyId +
              " · " +
              this.skillState.version +
              " + " +
              this.attackSkillState.version +
              " + " +
              this.jumpSkillState.version
            : "LEGACY";
      }

      if (this.elements.skillState) {
        const score =
          Number.isFinite(this.skillScore)
            ? this.skillScore.toFixed(3)
            : "—";
        const attackProbability =
          Number.isFinite(this.attackSkillProbability)
            ? this.attackSkillProbability.toFixed(3)
            : "—";
        this.elements.skillState.textContent =
          this.skillState &&
          this.attackSkillState &&
          this.jumpSkillState
            ? this.skillPhase +
              (this.skillPhase === "LIVE"
                ? " · MOVE " +
                  this.skillAction +
                  " " +
                  score +
                  " · ATK " +
                  attackProbability +
                  " · JMP " +
                  (Number.isFinite(this.jumpSkillProbability)
                    ? this.jumpSkillProbability.toFixed(3)
                    : "—")
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
