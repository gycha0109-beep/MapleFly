import {
  loadOrBuildTapePack,
  tapePackKey,
} from "./tape-pack-cache.mjs";

export const V15N_SIMULATION_CONTRACT_ID = "v15n-deterministic-v3";
export const V15N_PINNED_CONNECTOME_COMMIT =
  "95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e";

export function v15nTapeIdentity({
  cohortName,
  baseSeeds,
  interruptionSeed,
}) {
  if (!Array.isArray(baseSeeds) || baseSeeds.length === 0) {
    throw new Error("v15N tape identity requires base seeds");
  }
  if (!Number.isInteger(interruptionSeed)) {
    throw new Error("v15N tape identity requires integer interruption seed");
  }
  return {
    simulationContract: V15N_SIMULATION_CONTRACT_ID,
    connectomeCommit: V15N_PINNED_CONNECTOME_COMMIT,
    cohortName,
    baseSeeds: [...baseSeeds],
    interruptionSeed,
  };
}

export function v15nTapeKey(args) {
  return tapePackKey(v15nTapeIdentity(args));
}

export async function loadOrBuildV15nTapePack({
  cohortName,
  baseSeeds,
  interruptionSeed,
  build,
  validate,
  cacheDir = process.env.MAPLEFLY_TAPE_CACHE_DIR ??
    ".cache/maplefly-tapes",
}) {
  const identity = v15nTapeIdentity({
    cohortName,
    baseSeeds,
    interruptionSeed,
  });

  return loadOrBuildTapePack({
    cacheDir,
    identity,
    build,
    validate,
  });
}
