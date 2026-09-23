# prereg_v15a — injury-history DN representation screen

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

v15의 첫 질문은 POTION policy를 바로 학습하는 것이 아니다.

> 최근 충돌 이력이 frozen MaleCNS의 descending-neuron activity history에
> 충분히 표현되어, HP / damage counter 없이 후속 learned POTION policy가
> 이용할 수 있는가?

이 screen은 representation 선택 실험이다.
POTION action, reward learning, browser runtime은 변경하지 않는다.

## Frozen biological source

~~~text
repository  alextitonis/fly.ai
commit      95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
MaleCNS     166,700 neurons
synapses    25,088,107
DN count    1,316
~~~

Connectome weights / dynamics는 frozen이다.

## Sensory contract

### Ground context

모든 settle / baseline / history / offer step에서 동일하게:

~~~text
SNta_L = 0.05
SNta_R = 0.05
~~~

를 준다.

### Impact proxy

v4/v5에서 사용한 값을 변경하지 않는다.

~~~text
population   LgLG_L or LgLG_R
drive        0.7
pulse        6 brain steps = 120 ms
~~~

impact side는 episode RNG로 L/R 균형에 가깝게 결정한다.

### POTION offer taste

모든 class에 동일하게 마지막 100 ms 동안:

~~~text
LB3_L + claw_tpGRN_L = 0.8
LB3_R + claw_tpGRN_R = 0.8
duration             = 5 brain steps = 100 ms
~~~

를 준다.

중요: taste offer는 HP, impact count, class와 무관하다.
따라서 taste 자체가 정답 label을 전달하지 않는다.

## Episode timing

~~~text
brain step        20 ms
settle            26 steps = 0.52 s
baseline          26 steps = 0.52 s
history           48 frames
frame             5 steps = 0.10 s
history duration  4.80 s
~~~

baseline은 SNta ground context만 사용한다.

history에서 impact 시작 후보 slot은 다음 6개로 고정한다.

~~~text
history step 25, 55, 85, 115, 145, 175
time         0.5,1.1,1.7,2.3,2.9,3.5 s
~~~

각 episode는 class에 따라 후보 slot 중 0/1/2/3개를
episode RNG로 without-replacement 선택한다.
각 impact는 6 steps 지속한다.

마지막 impact 시작은 3.5 s이므로 마지막 taste offer 전
최소 약 1.2 s의 separation이 있다.

taste offer는 history의 마지막 frame, 즉 steps 235..239에만 존재한다.

## Classes

4-class diagnostic:

~~~text
class 0  0 impacts
class 1  1 impact
class 2  2 impacts
class 3  3 impacts
~~~

label은 diagnostic classifier의 target으로만 사용한다.
feature selection / standardization에는 label을 사용하지 않는다.

## DN feature

각 100 ms frame마다 1,316 DN firing rate를 계산한다.

settle 뒤 별도 baseline 26 steps의 DN rate를 구하고:

~~~text
x = clamp((frameHz - baselineHz) / 50, -1, +1)
~~~

을 사용한다.

## Candidate temporal representations

사전에 다음 네 개만 허용한다.

~~~text
CURRENT    final 1 frame   = 0.1 s
CONCAT12   final 12 frames = 1.2 s
CONCAT24   final 24 frames = 2.4 s
CONCAT48   final 48 frames = 4.8 s
~~~

추가 history length를 outcome을 본 뒤 같은 실험에 추가하지 않는다.

각 representation의 raw temporal slot은
`frameOffset × 1316 + dnIndex`이다.

## Unlabeled variance selection

각 representation마다 TRAIN rows만 사용해 temporal slot variance를 계산한다.

- label을 보지 않는다.
- variance descending
- tie는 raw temporal slot index ascending
- top 256 slots
- 256 미만의 nonzero-variance slot만 존재하는 경우 screen FAIL

선택된 256 slot의 mean/std도 TRAIN rows에서만 계산한다.
std < 1e-6은 1로 둔다.
standardized value는 [-5,+5] clamp한다.

## Diagnostic classifier

각 representation마다 독립적인 4-class linear softmax를 학습한다.

~~~text
features       256
classes        4
epochs         240
learning rate  0.03
L2             0.001
optimizer      full-batch gradient descent
weight init    0
bias init      0
order seed     2796000
~~~

class 수는 schedule상 동일하므로 별도 class weighting은 사용하지 않는다.

이 classifier는 representation screen용 diagnostic probe일 뿐,
POTION runtime policy가 아니다.

## Dataset

### TRAIN

~~~text
base seeds
2781000
2782000
2783000
2784000

replicates per class / seed  6
classes                      4
rows                         96
~~~

### EVAL

~~~text
base seeds
2791000
2792000
2793000

replicates per class / seed  6
classes                      4
rows                         72
~~~

TRAIN/EVAL brain seed는 다음 deterministic formula로 만든다.

~~~text
brainSeed =
  baseSeed
  + classIndex * 100
  + replicate * 7
  + 1
~~~

episode schedule RNG seed는 `brainSeed + 500000`이다.

## Controls

### FULL

정상 DN identity / temporal order.

### DN_SHUFFLED

EVAL에서 base seed별 고정 DN permutation을 사용한다.

~~~text
permutation seed = baseSeed + 900000
~~~

각 temporal frame 안에서 DN identity만 permutation한다.
temporal frame order / activity distribution / trained model은 그대로 둔다.

### LABEL_SHUFFLED

TRAIN labels만 deterministic permutation한다.

~~~text
label shuffle seed = 2797000
~~~

동일 selected slots / standardizer / classifier hyperparameters로 학습한다.

LABEL_SHUFFLED는 sanity diagnostic이며 frozen PASS gate에는 넣지 않는다.

## Metrics

각 representation에 대해:

- FULL balanced accuracy
- class 0/1/2/3 recall
- minimum class recall
- DN_SHUFFLED balanced accuracy
- FULL - DN_SHUFFLED margin
- LABEL_SHUFFLED balanced accuracy

balanced accuracy는 4 class recall의 평균이다.

## Frozen screen gate

representation PASS 조건:

~~~text
FULL balanced accuracy       >= 65%
every-class recall           >= 50%
FULL - DN_SHUFFLED           >= 20 percentage points
~~~

LABEL_SHUFFLED는 보고만 하며 gate를 바꾸지 않는다.

## Selection rule

PASS한 representation 중 history가 가장 짧은 것을 선택한다.

~~~text
priority:
CURRENT -> CONCAT12 -> CONCAT24 -> CONCAT48
~~~

예를 들어 CURRENT/CONCAT12가 FAIL이고 CONCAT24/CONCAT48이 PASS면
CONCAT24를 v15B input representation으로 freeze한다.

어느 representation도 PASS하지 못하면:

~~~text
V15A SCREEN FAIL
~~~

로 종료한다.

그 경우 같은 run 결과를 보고 history length, impact drive, pulse,
threshold, gate를 조정하지 않는다.
새 sensory/representation hypothesis는 별도 prereg에서만 다룬다.

## Scientific interpretation boundary

PASS가 의미하는 것:

> frozen MaleCNS의 DN temporal activity history에 최근 impact count를
> 선형 probe가 읽을 수 있을 정도의 정보가 존재한다.

PASS가 의미하지 않는 것:

- 초파리가 HP를 이해한다.
- 초파리가 포션 가치를 이해한다.
- MaleCNS 자체가 MapleStory를 학습했다.
- intrinsic recurrent memory만으로 impact count를 기억한다.

특히 CONCAT 계열 PASS는 controller가 보존한 DN temporal history가
과거 impact response를 유지한다는 뜻까지다.

## Forbidden leakage

feature 생성 / classifier input에서 다음 값은 금지한다.

~~~text
HP
maxHP
missingHP
damageTaken
impact count
class label
potion count
wasted healing
survival
correct action
seed
impact side
impact schedule/timestamps
~~~

이 값들은 dataset construction / diagnostic target / result metadata에는
존재할 수 있으나 model feature에는 들어갈 수 없다.

## Output

~~~text
results/screen-v15a-injury-memory/v15a_screen.json
~~~

workflow artifact는 scientific FAIL이어도 always upload한다.
