# prereg_v15a_diag — paired LgLG propagation diagnostic

## Status

**PREREGISTERED AFTER v15A FAIL, BEFORE DIAGNOSTIC IMPLEMENTATION / OUTCOME**

Authoritative v15A run `35806082486`에서 CURRENT / CONCAT12 /
CONCAT24 / CONCAT48 모두 4-class chance 25%였고 selected representation은 없었다.

이 diagnostic은 v15A를 PASS시키기 위한 parameter tuning이 아니다.

질문은 하나다.

> frozen v4/v5 LgLG impact proxy 0.7 / 120 ms가 pinned MaleCNS에서
> 실제 sensory neurons를 발화시키고, 그 차이가 downstream network와
> descending neurons까지 전파되는가?

## Frozen source / stimulus

~~~text
connectome
  alextitonis/fly.ai
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

ground context
  SNta_L = 0.05
  SNta_R = 0.05

impact
  LgLG_L or LgLG_R
  drive 0.7
  duration 6 steps = 120 ms
~~~

drive / pulse를 sweep하거나 변경하지 않는다.
taste input은 사용하지 않는다.

## Paired deterministic design

각 pair는 같은 brain seed로 두 MaleCNS instance를 만든다.

~~~text
OFF  ground only
ON   ground + one LgLG impact pulse
~~~

두 brain은 step마다 동일한 neuron 수만큼 RNG를 소비하므로
같은 seed에서 noise sequence가 paired된다.

~~~text
seeds
2798000
2798001
2798002
2798003
2798004
2798005
2798006
2798007

side
even pair -> L
odd pair  -> R
~~~

## Timing

~~~text
settle       26 steps
baseline     26 steps
live         150 steps = 3.0 s
impact start live step 25
impact end   live step 31 exclusive
~~~

즉 impact pulse는 live steps 25..30의 6 steps다.

## Direct measurements

매 live step에서 ON/OFF pair를 비교한다.

### 1. LgLG sensory activation

해당 side의 LgLG neuron에 대해:

- fired count ON
- fired count OFF
- fired-count absolute difference
- membrane-voltage max absolute difference

특히 pulse 6 steps 구간을 별도로 합산한다.

### 2. Whole-network propagation

166,700 neuron 전체에 대해:

- fired-set symmetric-difference count per step
- membrane-voltage L2
- membrane-voltage max absolute difference

### 3. Descending-neuron propagation

1,316 DN에 대해:

- fired vector absolute-count difference per step
- any DN spike mismatch
- DN membrane-voltage L2
- DN membrane-voltage max absolute difference

100 ms = 5-step bins으로도 DN spike count difference를 집계한다.

## Structural reachability

동일 pinned weight graph에서 LgLG_L/R union을 source로 하여
directed outgoing edge BFS를 수행한다.

보고:

- source LgLG count
- 1-hop unique neurons
- 2-hop cumulative unique neurons
- 3-hop cumulative unique neurons
- 1/2/3-hop에서 도달한 unique DN count

weight sign / magnitude threshold는 두지 않는다.
존재하는 stored edge를 그대로 사용한다.

이 reachability는 functional response가 아니라 structural diagnostic이다.

## Frozen route classification

paired exact comparison이므로 다음 순서로 route를 결정한다.

~~~text
A_INPUT_NOT_ACTIVATED
  pulse 중 LgLG fired-count difference == 0
  AND LgLG voltage maxAbs <= 1e-9

B_INPUT_SUBTHRESHOLD
  LgLG voltage maxAbs > 1e-9
  BUT pulse 중 LgLG fired-count difference == 0

C_NETWORK_PROPAGATES_DN_NULL
  LgLG fired-count difference > 0
  AND whole-network fired symmetric difference > 0
  BUT DN spike mismatch == 0
  AND DN voltage maxAbs <= 1e-9

D_DN_SUBTHRESHOLD
  LgLG fired-count difference > 0
  AND DN spike mismatch == 0
  AND DN voltage maxAbs > 1e-9

E_DN_SPIKE_PROPAGATION
  any DN spike mismatch > 0
~~~

여러 조건이 겹치면 위 목록에서 아래쪽, 즉 더 downstream인 route를 우선한다.
예: DN spike mismatch가 하나라도 있으면 E다.

추가 safety route:

~~~text
STRUCTURAL_DISCONNECT
  3-hop reachable DN count == 0
~~~

이 값은 A-E와 별도 flag로 보고한다.

## Interpretation / next action

이 diagnostic 자체에는 PASS gate가 없다.

- A/B: v4/v5 LgLG stimulus contract 자체가 functional sensory input으로 약함.
  같은 run에서 drive를 올리지 않는다.
- C: sensory/network는 반응하지만 DN route가 막힘.
  새 prereg에서 다른 biologically grounded output/readout을 조사한다.
- D: DN membrane에는 도달하지만 spike representation이 잃는다.
  새 prereg에서 subthreshold DN representation 가능성을 검토한다.
- E: DN spikes가 실제로 달라진다.
  v15A feature pipeline의 paired difference를 추가 검사하여
  implementation-equivalence 문제인지 representation 문제인지 분해한다.

어느 route에서도 v15B reward learning을 자동 시작하지 않는다.
새 learned POTION training은 injury-state representation이 별도 gate를 통과한 뒤에만 허용한다.

## Output

~~~text
results/diagnose-v15a-lglg-propagation/v15a_diag.json
~~~

workflow artifact는 route와 관계없이 upload한다.
