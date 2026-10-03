import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  evaluatorTruthTapeView,
  loadOrBuildTapePack,
  neuralOnlyTapeView,
  tapePackKey,
} from "../lib/tape-pack-cache.mjs";

const dir = await mkdtemp(join(tmpdir(), "maplefly-tape-pack-"));
try {
  const identity = {
    connectome: "95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e",
    simulator: "test",
    cohort: [1, 2, 3],
  };
  let builds = 0;
  const build = async () => {
    builds += 1;
    return [{
      seed: 1,
      potionFrameEvents: [{
        frameIndex: 0,
        step: 5,
        values: new Float64Array([1.25, 2.5]),
      }],
      damageEvents: [{ step: 7, damage: 10 }],
      finalHp: 90,
      survived: true,
    }];
  };

  const first = await loadOrBuildTapePack({ cacheDir: dir, identity, build });
  const second = await loadOrBuildTapePack({ cacheDir: dir, identity, build });

  if (builds !== 1 || first.cacheHit || !second.cacheHit) {
    throw new Error("Tape Pack cache hit contract failed");
  }
  const values = second.tapes[0].potionFrameEvents[0].values;
  if (!(values instanceof Float64Array) || values[1] !== 2.5) {
    throw new Error("typed-array round trip failed");
  }

  const neural = neuralOnlyTapeView(second.tapes[0]);
  if ("damageEvents" in neural || Object.keys(neural).sort().join(",") !== "frames,seed") {
    throw new Error("neural-only projection leaked truth");
  }
  const truth = evaluatorTruthTapeView(second.tapes[0]);
  if (!Array.isArray(truth.damageEvents) || truth.finalHp !== 90) {
    throw new Error("truth projection failed");
  }

  console.log(JSON.stringify({
    status: "PASS",
    key: tapePackKey(identity),
    cacheHitOnSecondLoad: second.cacheHit,
  }, null, 2));
} finally {
  await rm(dir, { recursive: true, force: true });
}
