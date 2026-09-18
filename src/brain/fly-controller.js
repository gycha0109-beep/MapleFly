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
      this.outputs = [];
      this.rates = new Map();
      this.intent = {
        left: false,
        right: false,
        up: false,
        down: false,
        jump: false,
        attack: false,
        label: "IDLE",
      };
      this.nextJumpAt = 0;
      this.nextAttackAt = 0;
      this.lastObservationAt = 0;
      this.lastTargetId = null;
      this.lastTargetDistance = null;
      this.telemetry = {
        fired: 0,
        ms: 0,
        steps: 0,
      };

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
        action: document.getElementById("brain-action"),
        source: document.getElementById("brain-source"),
      };

      if (this.elements.source) {
        this.elements.source.textContent =
          `fly.ai @ ${SOURCE.commit.slice(0, 8)}`;
      }

      this.bindUi();
      this.render();
    }

    bindUi() {
      this.elements.load?.addEventListener("click", () => {
        this.load();
      });

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

        this.setStatus("READY");
        this.setProgress("실제 MaleCNS connectome 준비 완료");
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

        if (this.enabled) {
          this.decode();
        }

        this.renderTelemetry();
        return;
      }

      if (message.type === "reset") {
        this.rates = new Map(this.outputs.map((name) => [name, 0]));
        this.intent.jump = false;
        this.intent.attack = false;
        this.renderTelemetry();
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
      this.render();
    }

    setEnabled(enabled) {
      if (enabled && !this.ready) {
        this.load();
        return;
      }

      this.enabled = Boolean(enabled && this.ready);

      if (!this.enabled) {
        this.intent = {
          left: false,
          right: false,
          up: false,
          down: false,
          jump: false,
          attack: false,
          label: "IDLE",
        };

        this.worker?.postMessage({
          type: "input",
          drive: {},
        });
      }

      this.setStatus(this.enabled ? "FLY CONTROL" : "READY");
      this.options.onModeChange?.(this.enabled);
      this.render();
    }

    isEnabled() {
      return this.enabled;
    }

    reset() {
      this.nextJumpAt = 0;
      this.nextAttackAt = 0;
      this.lastTargetId = null;
      this.lastTargetDistance = null;

      this.worker?.postMessage({ type: "reset" });
    }

    observe(observation) {
      if (!this.worker || !this.ready) {
        return;
      }

      const now = performance.now();

      if (now - this.lastObservationAt < 45) {
        return;
      }

      this.lastObservationAt = now;

      const drive = this.enabled
        ? this.encodeObservation(observation)
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

      if (observation.gapThreat?.active) {
        const gapSide = observation.gapThreat.side;
        drive[`LPLC2_${gapSide}`] = Math.max(
          drive[`LPLC2_${gapSide}`] ?? 0,
          0.58,
        );
        drive[`LC4_${gapSide}`] = Math.max(
          drive[`LC4_${gapSide}`] ?? 0,
          0.36,
        );
      }

      return drive;
    }

    rate(name) {
      return this.rates.get(name) ?? 0;
    }

    decode() {
      const now = performance.now();
      const steerL = this.rate("DNa02 L");
      const steerR = this.rate("DNa02 R");
      const strongestSteer = Math.max(steerL, steerR);
      const steerDifference = steerL - steerR;

      let left = false;
      let right = false;

      if (strongestSteer >= DECODER.steerFloorHz) {
        if (steerDifference >= DECODER.steerMarginHz) {
          left = true;
        } else if (steerDifference <= -DECODER.steerMarginHz) {
          right = true;
        }
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

      let jump = false;
      let attack = false;
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

      if (jump) {
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
        label,
      };
    }

    consumeIntent() {
      const current = { ...this.intent };
      this.intent.jump = false;
      this.intent.attack = false;
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

      if (this.elements.action) {
        this.elements.action.textContent = this.enabled
          ? this.intent.label
          : "MANUAL";
      }
    }

    render() {
      if (this.elements.load) {
        this.elements.load.disabled =
          this.loading || this.ready;
        this.elements.load.textContent = this.loading
          ? "🧠 뇌 불러오는 중…"
          : this.ready
            ? "✓ 뇌 준비 완료"
            : "🧠 초파리 뇌 불러오기 (~58MB)";
      }

      if (this.elements.toggle) {
        this.elements.toggle.disabled = !this.ready;
        this.elements.toggle.textContent = this.enabled
          ? "사람이 다시 조종"
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
