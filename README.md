# MapleFly

MapleFly is an experiment that connects a fruit-fly MaleCNS connectome controller
to a deliberately simplified, MapleStory-inspired 2D environment.

## Current scope

**Experiment v2 — flat sensory A/B baseline**

- upper platforms and ladder are temporarily removed from the active arena
- one mushroom target on flat ground
- killed targets respawn after 700 ms at deterministic nearby positions
- target spawns pseudo-randomly across the full lower arena
- real MaleCNS browser connectome controller
- SENSORY ON vs SENSORY OFF paired comparison
- same pseudo-random seed reused inside each ON/OFF pair
- alternating ON/OFF order to reduce order bias
- automatic trial macro
- automatic metrics logger
- CSV / JSON export
- latest run persisted in browser localStorage

## Brain source

```text
alextitonis/fly.ai
95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
166,700 neurons
25,088,107 connections
```

The connectome binaries are fetched from that fixed upstream commit at runtime.

## Play

https://gycha0109-beep.github.io/MapleFly/

## Experiment v2

Default quick run:

```text
60 seconds × 3 pairs
= 6 trials total
```

Long baseline preset:

```text
300 seconds × 5 pairs
= 10 trials total
≈ 50 minutes
```

Each pair uses the same brain noise seed for SENSORY ON and OFF.
Target positions are deterministic pseudo-random values derived from the paired seed and spawn index, so ON/OFF trials share the same nth spawn position. Condition order alternates between pairs.

Logged metrics include movement toward target, minimum distance, attack/hit/kill,
jump count, hit rate, and brain runtime telemetry.

## Documentation

- `docs/brain-v1.md` — connectome/controller contract
- `history/development_v1.md` — v1 implementation history
- `history/result_v1.md` — v1 observed result
- `history/development_v2.md` — v2 A/B macro/logger design
- `history/result_v2.md` — v2 180s × 3 paired headless result
- `THIRD_PARTY_NOTICES.md` — upstream attribution

No claim is made that the fly understands MapleStory.


## Headless experiment runner

브라우저 화면을 켜 두지 않고 실험하려면 Node.js headless runner를 사용한다.

### 로컬 PC

Node.js 24+:

```powershell
npm run experiment:v2 -- --seconds 180 --pairs 3 --seed 64
```

결과:

```text
results/experiment-v2/
├─ experiment_v2.json
├─ experiment_v2.csv
└─ summary.md
```

브라우저는 필요 없지만 로컬 실행 중에는 터미널/PC가 켜져 있어야 한다.

### GitHub Actions

PC까지 꺼도 되는 방식:

1. repository의 **Actions**
2. **Run MapleFly Experiment v2**
3. **Run workflow**
4. seconds / pairs / seed 입력
5. 실행 후 artifact 다운로드

Workflow:

```text
.github/workflows/experiment-v2.yml
```

Connectome asset은 pinned commit 기준으로 GitHub Actions cache에 저장된다.
