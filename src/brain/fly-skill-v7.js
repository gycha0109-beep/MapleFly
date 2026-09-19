(function attachMapleFlySkillV7(global) {
  "use strict";

  const STORAGE_KEY = "maplefly.fly-001.skill.v1";

  const BUNDLED_STATE = Object.freeze({
    schema: "maplefly.fly-skill.v1",
    flyId: "Fly #001",
    version: "v7-run2-top64",
    sourceRun: 35409704972,
    sourceCommit: "5634cc28c4b871ad9e93eee0f5e91504c3ee48cc",
    brainCommit: "95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e",
    originalFeatureCount: 1316,
    sparseFeatureCount: 64,
    featureIndices: Object.freeze([1268,202,1,0,162,64,33,135,38,17,18,47,1215,52,131,73,39,176,105,287,215,40,109,81,98,1247,1227,534,177,1243,267,204,1163,417,63,262,179,1209,788,94,226,170,1130,165,513,163,404,224,1262,931,1082,419,652,1178,455,501,484,968,299,236,504,1160,1256,932]),
    leftWeights: Object.freeze([0.6086256673881091,-0.5820282407970693,0.38842571208213494,-0.38391810826972916,-0.35318860781338424,0.304984280086357,0.3025435086559469,0.2790879797354578,0.2609111818884133,-0.2550915286964878,-0.2550018268197894,0.25358828672812095,0.25346727953540515,-0.23795657432729656,-0.23160343127463598,0.22318009913866108,0.2192113958592154,-0.21393662898516874,-0.20929924662865204,-0.19888136234498296,0.19626758667364147,0.18535021325937898,-0.1815962911069512,0.17761610733954897,-0.17643183381173766,0.1440913513085796,-0.13887441375077045,-0.12962246110967562,0.12774244642111787,0.12484074634603148,-0.12078832022464464,-0.11966768732739592,0.11684993336228235,0.11437927547036698,-0.10724471068687633,-0.10496920876159148,-0.10486918495026218,0.09327185870560047,0.08801623803515501,-0.08797832781714494,0.08478820814922244,-0.0818191521511714,0.07635048932527115,0.07328769043064114,-0.07194150605679847,-0.07102879611068327,-0.07010318719721957,0.07010006292934957,0.06804021266136934,-0.06668723103354242,-0.06585724099514934,-0.06582987229895797,0.06470981325952364,0.06425845963938756,-0.06356001337957877,0.06346815593741664,0.062050110162723764,-0.06150382782197339,0.05959862950632573,-0.05903768029925681,-0.058953381319658,-0.058202265980044736,0.057468536298727856,0.05729626699937838]),
    leftBias: -0.05391179938975891,
    sourceEvalVisualOn: 1,
    sourceEvalVisualOff: 0.5,
  });

  function cloneState(state) {
    return {
      ...state,
      featureIndices: [...state.featureIndices],
      leftWeights: [...state.leftWeights],
    };
  }

  function validState(state) {
    return Boolean(
      state &&
      state.schema === BUNDLED_STATE.schema &&
      state.originalFeatureCount === 1316 &&
      Array.isArray(state.featureIndices) &&
      Array.isArray(state.leftWeights) &&
      state.featureIndices.length === state.leftWeights.length &&
      state.featureIndices.length > 0 &&
      state.featureIndices.every(Number.isInteger) &&
      state.leftWeights.every(Number.isFinite) &&
      Number.isFinite(state.leftBias)
    );
  }

  function loadState() {
    if (typeof global.localStorage === "undefined") {
      return cloneState(BUNDLED_STATE);
    }

    try {
      const stored = JSON.parse(
        global.localStorage.getItem(STORAGE_KEY) || "null",
      );

      if (validState(stored)) {
        return stored;
      }
    } catch {
      // Fall back to the versioned bundled policy below.
    }

    const initial = cloneState(BUNDLED_STATE);

    try {
      global.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(initial),
      );
    } catch {
      // localStorage may be blocked. Runtime can still use the bundled state.
    }

    return initial;
  }

  function saveState(state) {
    if (!validState(state)) {
      throw new Error("invalid Fly #001 skill state");
    }

    if (typeof global.localStorage !== "undefined") {
      global.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state),
      );
    }

    return cloneState(state);
  }

  function resetState() {
    const state = cloneState(BUNDLED_STATE);

    if (typeof global.localStorage !== "undefined") {
      global.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state),
      );
    }

    return state;
  }

  function scoreSparse(normalizedSparseFeature, state = loadState()) {
    if (
      normalizedSparseFeature.length !==
      state.leftWeights.length
    ) {
      throw new Error(
        "skill feature length mismatch: " +
        normalizedSparseFeature.length +
        " != " +
        state.leftWeights.length,
      );
    }

    let leftScore = state.leftBias;

    for (
      let index = 0;
      index < normalizedSparseFeature.length;
      index += 1
    ) {
      leftScore +=
        state.leftWeights[index] *
        normalizedSparseFeature[index];
    }

    return leftScore;
  }

  function choose(normalizedSparseFeature, state = loadState()) {
    const leftScore = scoreSparse(
      normalizedSparseFeature,
      state,
    );

    return {
      action: leftScore >= 0 ? "LEFT" : "RIGHT",
      leftScore,
      rightScore: -leftScore,
    };
  }

  global.MapleFlySkillV7 = Object.freeze({
    STORAGE_KEY,
    BUNDLED_STATE,
    loadState,
    saveState,
    resetState,
    scoreSparse,
    choose,
  });
})(globalThis);
