(function attachExperimentV2(global) {
  "use strict";

  const game = global.MapleFlyGame;
  if (!game) {
    return;
  }

  const brain = game.getBrainController();
  const STORAGE_KEY = "maplefly-experiment-v2-last";

  const ui = {
    seconds: document.getElementById("exp-seconds"),
    pairs: document.getElementById("exp-pairs"),
    seed: document.getElementById("exp-seed"),
    start: document.getElementById("exp-start"),
    stop: document.getElementById("exp-stop"),
    preset: document.getElementById("exp-preset"),
    status: document.getElementById("exp-status"),
    trial: document.getElementById("exp-trial"),
    condition: document.getElementById("exp-condition"),
    countdown: document.getElementById("exp-countdown"),
    rows: document.getElementById("exp-rows"),
    summary: document.getElementById("exp-summary"),
    csv: document.getElementById("exp-csv"),
    json: document.getElementById("exp-json"),
  };

  let running = false;
  let aborted = false;
  let results = [];
  let runMeta = null;
  let telemetryAccumulator = null;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function safeInt(input, fallback, min, max) {
    const value = Math.trunc(Number(input?.value));
    if (!Number.isFinite(value)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, value));
  }

  function setStatus(text) {
    if (ui.status) {
      ui.status.textContent = text;
    }
  }

  function formatNumber(value, digits = 1) {
    return Number.isFinite(value)
      ? Number(value).toFixed(digits)
      : "—";
  }

  function buildSchedule(pairs, baseSeed) {
    const schedule = [];

    for (let pair = 0; pair < pairs; pair += 1) {
      const seed = baseSeed + pair;
      const targetSide = pair % 2 === 0 ? "R" : "L";
      const order =
        pair % 2 === 0
          ? ["ON", "OFF"]
          : ["OFF", "ON"];

      for (const condition of order) {
        schedule.push({
          pair: pair + 1,
          seed,
          targetSide,
          sensory: condition === "ON",
          condition,
        });
      }
    }

    return schedule;
  }

  async function waitForBrainReady() {
    if (brain.isReady()) {
      return;
    }

    brain.load();
    setStatus("connectome 로드 대기 중…");

    const startedAt = performance.now();

    while (!brain.isReady()) {
      if (aborted) {
        throw new Error("aborted");
      }

      if (performance.now() - startedAt > 180000) {
        throw new Error("connectome load timeout");
      }

      await sleep(250);
    }
  }

  function startTelemetrySampling() {
    telemetryAccumulator = {
      count: 0,
      firedSum: 0,
      stepMsSum: 0,
      timer: setInterval(() => {
        const telemetry = brain.getTelemetry();
        telemetryAccumulator.count += 1;
        telemetryAccumulator.firedSum += telemetry.fired ?? 0;
        telemetryAccumulator.stepMsSum += telemetry.ms ?? 0;
      }, 200),
    };
  }

  function stopTelemetrySampling() {
    if (!telemetryAccumulator) {
      return {
        avgFiredPerStep: 0,
        avgBrainStepMs: 0,
      };
    }

    clearInterval(telemetryAccumulator.timer);
    const count = Math.max(1, telemetryAccumulator.count);
    const result = {
      avgFiredPerStep:
        telemetryAccumulator.firedSum / count,
      avgBrainStepMs:
        telemetryAccumulator.stepMsSum / count,
    };
    telemetryAccumulator = null;
    return result;
  }

  async function runTrial(spec, trialIndex, totalTrials, durationMs) {
    if (aborted) {
      throw new Error("aborted");
    }

    ui.trial.textContent = `${trialIndex + 1} / ${totalTrials} · pair ${spec.pair} · seed ${spec.seed}`;
    ui.condition.textContent =
      `SENSORY ${spec.condition} · target ${spec.targetSide}`;

    setStatus("brain reset");
    brain.setSensoryEnabled(spec.sensory);
    brain.setEnabled(true);
    await brain.reset(spec.seed);

    game.startTrial({
      targetSide: spec.targetSide,
      seed: spec.seed,
    });
    startTelemetrySampling();

    const startedAt = performance.now();
    const targetBrainSteps = Math.round(durationMs / 20);
    setStatus("RUNNING");

    while (true) {
      if (aborted) {
        game.cancelTrial();
        stopTelemetrySampling();
        throw new Error("aborted");
      }

      const brainSteps = brain.getTelemetry().steps ?? 0;
      const remainingSteps = Math.max(
        0,
        targetBrainSteps - brainSteps,
      );

      ui.countdown.textContent =
        `${(remainingSteps * 0.02).toFixed(1)} sim-s`;

      if (brainSteps >= targetBrainSteps) {
        break;
      }

      await sleep(80);
    }

    const wallDurationMs = performance.now() - startedAt;
    const finalBrainSteps = brain.getTelemetry().steps ?? 0;
    const trialResult = game.finishTrial();
    const telemetry = stopTelemetrySampling();
    const attacks = trialResult?.decisions?.ATTACK ?? 0;
    const hits = trialResult?.hits ?? 0;

    return {
      pair: spec.pair,
      seed: spec.seed,
      targetSide: spec.targetSide,
      sensory: spec.condition,
      durationMs: trialResult?.durationMs ?? wallDurationMs,
      requestedSimSeconds: durationMs / 1000,
      brainSteps: finalBrainSteps,
      simulatedSeconds: finalBrainSteps * 0.02,
      wallDurationMs,
      totalDistancePx: trialResult?.totalDistancePx ?? 0,
      towardDistancePx: trialResult?.towardDistancePx ?? 0,
      awayDistancePx: trialResult?.awayDistancePx ?? 0,
      towardMovementRatio:
        trialResult?.towardMovementRatio ?? 0,
      minTargetDistancePx:
        trialResult?.minTargetDistancePx ?? null,
      timeWithinAttackRangeMs:
        trialResult?.timeWithinAttackRangeMs ?? 0,
      left: trialResult?.decisions?.LEFT ?? 0,
      right: trialResult?.decisions?.RIGHT ?? 0,
      jump: trialResult?.decisions?.JUMP ?? 0,
      attack: attacks,
      idle: trialResult?.decisions?.IDLE ?? 0,
      hits,
      hitRate: attacks > 0 ? hits / attacks : 0,
      kills: trialResult?.kills ?? 0,
      respawns: trialResult?.respawns ?? 0,
      spawnPositions: trialResult?.spawnPositions ?? [],
      firstHitMs: trialResult?.firstHitMs ?? null,
      firstKillMs: trialResult?.firstKillMs ?? null,
      finalTargetHp: trialResult?.finalTargetHp ?? 30,
      finalPlayerX: trialResult?.finalPlayerX ?? null,
      avgFiredPerStep: telemetry.avgFiredPerStep,
      avgBrainStepMs: telemetry.avgBrainStepMs,
    };
  }

  function renderRows() {
    if (!ui.rows) {
      return;
    }

    ui.rows.innerHTML = "";

    for (const row of results) {
      const tr = document.createElement("tr");
      const cells = [
        `P${row.pair}`,
        row.seed,
        row.targetSide,
        row.sensory,
        formatNumber(row.towardMovementRatio * 100, 1) + "%",
        formatNumber(row.minTargetDistancePx, 0),
        row.attack,
        row.hits,
        formatNumber(row.hitRate * 100, 1) + "%",
        row.kills,
        row.respawns,
        row.jump,
      ];

      for (const value of cells) {
        const td = document.createElement("td");
        td.textContent = String(value);
        tr.appendChild(td);
      }

      ui.rows.appendChild(tr);
    }
  }

  function average(rows, key) {
    if (rows.length === 0) {
      return 0;
    }

    return rows.reduce(
      (sum, row) => sum + Number(row[key] ?? 0),
      0,
    ) / rows.length;
  }

  function renderSummary() {
    if (!ui.summary) {
      return;
    }

    const on = results.filter((row) => row.sensory === "ON");
    const off = results.filter((row) => row.sensory === "OFF");

    if (on.length === 0 || off.length === 0) {
      ui.summary.textContent =
        "ON/OFF가 모두 끝나면 평균 비교가 표시됩니다.";
      return;
    }

    const lines = [
      `SENSORY ON  · toward ${(average(on, "towardMovementRatio") * 100).toFixed(1)}% · minDist ${average(on, "minTargetDistancePx").toFixed(0)}px · hitRate ${(average(on, "hitRate") * 100).toFixed(1)}% · kills ${average(on, "kills").toFixed(2)}`,
      `SENSORY OFF · toward ${(average(off, "towardMovementRatio") * 100).toFixed(1)}% · minDist ${average(off, "minTargetDistancePx").toFixed(0)}px · hitRate ${(average(off, "hitRate") * 100).toFixed(1)}% · kills ${average(off, "kills").toFixed(2)}`,
    ];

    ui.summary.textContent = lines.join("\n");
  }

  function persist() {
    const payload = {
      schema: "maplefly.experiment-v2.2",
      meta: runMeta,
      results,
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(payload),
    );

    ui.csv.disabled = results.length === 0;
    ui.json.disabled = results.length === 0;
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text)
      ? `"${text.replaceAll('"', '""')}"`
      : text;
  }

  function download(filename, mime, content) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    const payload = {
      schema: "maplefly.experiment-v2.2",
      meta: runMeta,
      results,
    };

    download(
      "maplefly_experiment_v2.json",
      "application/json",
      JSON.stringify(payload, null, 2),
    );
  }

  function exportCsv() {
    const columns = [
      "pair",
      "seed",
      "targetSide",
      "sensory",
      "durationMs",
      "requestedSimSeconds",
      "brainSteps",
      "simulatedSeconds",
      "wallDurationMs",
      "totalDistancePx",
      "towardDistancePx",
      "awayDistancePx",
      "towardMovementRatio",
      "minTargetDistancePx",
      "timeWithinAttackRangeMs",
      "left",
      "right",
      "jump",
      "attack",
      "idle",
      "hits",
      "hitRate",
      "kills",
      "respawns",
      "spawnPositions",
      "firstHitMs",
      "firstKillMs",
      "finalTargetHp",
      "finalPlayerX",
      "avgFiredPerStep",
      "avgBrainStepMs",
    ];

    const lines = [columns.join(",")];

    for (const row of results) {
      lines.push(
        columns.map((column) => csvEscape(row[column])).join(","),
      );
    }

    download(
      "maplefly_experiment_v2.csv",
      "text/csv;charset=utf-8",
      "\ufeff" + lines.join("\n"),
    );
  }

  async function start() {
    if (running) {
      return;
    }

    const seconds = safeInt(ui.seconds, 60, 10, 1800);
    const pairs = safeInt(ui.pairs, 3, 1, 20);
    const baseSeed = safeInt(ui.seed, 64, 1, 999999);
    const durationMs = seconds * 1000;
    const schedule = buildSchedule(pairs, baseSeed);

    running = true;
    aborted = false;
    results = [];
    runMeta = {
      startedAt: new Date().toISOString(),
      durationSeconds: seconds,
      pairs,
      baseSeed,
      schedule: "paired-seed, alternating-order, alternating-target-side",
      brainCommit:
        global.MapleFlyBrain?.SOURCE?.commit ?? null,
      notes:
        "SENSORY OFF sets all external sensory drive to zero. Same seed is reused within each ON/OFF pair. Trial length is fixed by brain steps (50 Hz), not wall-clock time. KO targets respawn after 700ms at a deterministic nearby position; the nth respawn position is identical inside each paired seed.",
    };

    ui.start.disabled = true;
    ui.stop.disabled = false;
    ui.seconds.disabled = true;
    ui.pairs.disabled = true;
    ui.seed.disabled = true;
    ui.preset.disabled = true;
    ui.csv.disabled = true;
    ui.json.disabled = true;
    renderRows();
    renderSummary();

    try {
      await waitForBrainReady();

      for (
        let index = 0;
        index < schedule.length;
        index += 1
      ) {
        const result = await runTrial(
          schedule[index],
          index,
          schedule.length,
          durationMs,
        );

        results.push(result);
        renderRows();
        renderSummary();
        persist();

        if (index < schedule.length - 1) {
          setStatus("다음 trial 준비");
          ui.countdown.textContent = "2.0 s";
          await sleep(2000);
        }
      }

      runMeta.finishedAt = new Date().toISOString();
      runMeta.completed = true;
      persist();
      setStatus("COMPLETE");
      ui.trial.textContent = `${results.length} trials 완료`;
      ui.condition.textContent = "ON/OFF paired baseline";
      ui.countdown.textContent = "0.0 s";
    } catch (error) {
      if (String(error?.message) === "aborted") {
        setStatus("STOPPED");
      } else {
        setStatus(`ERROR · ${error?.message ?? error}`);
      }

      runMeta.finishedAt = new Date().toISOString();
      runMeta.completed = false;
      runMeta.error = error?.message ?? String(error);
      persist();
    } finally {
      running = false;
      brain.setSensoryEnabled(true);
      brain.setEnabled(false);
      ui.start.disabled = false;
      ui.stop.disabled = true;
      ui.seconds.disabled = false;
      ui.pairs.disabled = false;
      ui.seed.disabled = false;
      ui.preset.disabled = false;
    }
  }

  function stop(reason = "사용자 중단") {
    if (!running) {
      return;
    }

    aborted = true;
    game.cancelTrial();
    stopTelemetrySampling();
    setStatus(reason);
  }

  ui.start?.addEventListener("click", start);
  ui.stop?.addEventListener("click", () => stop());
  ui.csv?.addEventListener("click", exportCsv);
  ui.json?.addEventListener("click", exportJson);

  ui.preset?.addEventListener("click", () => {
    ui.seconds.value = "300";
    ui.pairs.value = "5";
    ui.seed.value = "64";
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running) {
      stop("탭이 백그라운드로 이동해 실험 중단");
    }
  });

  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "null",
    );

    if (saved?.results?.length) {
      results = saved.results;
      runMeta = saved.meta ?? null;
      renderRows();
      renderSummary();
      ui.csv.disabled = false;
      ui.json.disabled = false;
      setStatus("이전 결과 복원됨");
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
})(window);
