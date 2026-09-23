#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const [index, controller, oldBundle, h2Bundle] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../src/brain/fly-controller.js", import.meta.url), "utf8"),
  readFile(new URL("../src/brain/fly-skill-v11-jump.js", import.meta.url), "utf8"),
  readFile(new URL("../src/brain/fly-skill-v11h2-jump.js", import.meta.url), "utf8"),
]);

const oldScript = './src/brain/fly-skill-v11-jump.js';
const h2Script = './src/brain/fly-skill-v11h2-jump.js';

if (!oldBundle.length || !h2Bundle.length) {
  throw new Error("legacy or H2 JUMP research bundle missing");
}
if (index.includes(oldScript)) {
  throw new Error("legacy v11F JUMP bundle is page-loaded");
}
if (!index.includes(h2Script)) {
  throw new Error("deployed v11H2 JUMP bundle is not page-loaded");
}
if (!controller.includes("global.MapleFlyJumpSkillV11H2")) {
  throw new Error("controller does not bind deployed v11H2 JUMP");
}
if (controller.includes("global.MapleFlyJumpSkillV11 ??")) {
  throw new Error("controller still falls back to legacy v11F JUMP");
}

console.log(
  "V11F-LEGACY-ISOLATION=PASS oldBundle=preserved oldRuntime=disabled h2Runtime=active",
);
