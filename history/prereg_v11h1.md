# Phase H1 — broad orthogonal obstacle feature code preregistration

H0 authoritative run 35745831597은 사전등록된 overall screen gate를 통과하지 못했다.
CURRENT 91.7%, MEAN4 91.7%, CONCAT4 95.8%로 개별 context gate는 통과했지만,
history representation이 CURRENT보다 15pp 이상 개선되어야 한다는 preregistered selection rule 때문에
selectedRepresentation=NONE, overall gate=FAIL이었다.

따라서 H0의 LC6+LC16 단순 composite를 그대로 learner에 배포하지 않는다.

H1은 sensory architecture를 더 넓은 obstacle visual population code로 바꾼다.

## biological motivation

- LC6, LC16: looming/avoidance 관련 visual projection neurons.
- LC12, LC15: moving vertical bar / edge / object-motion 관련 visual projection neurons.

게임 obstacle은 접근하면서 커지는 looming object이면서 수직 bar/edge 형태이므로,
두 종류 feature population을 하나의 고정 obstacle code로 사용한다.

## frozen target sensory

v10F target sensory는 변경하지 않는다.

~~~text
LC10a
LPLC1
LPLC2
LC4 close-target cue
~~~

## obstacle sensory

~~~text
LC6
LC16
LC12
LC15
~~~

동일 side의 네 population에 같은 fixed drive를 동시에 입력한다.

~~~text
drive = clamp(
  ((280 - max(0, frontDistance)) / 280) * 0.8,
  0,
  0.8
)
~~~

obstacle은 LC4를 자극하지 않는다. population별 weight/amplitude sweep은 하지 않는다.

## action-free assay

classes:

~~~text
OBSTACLE
TARGET_ONLY
~~~

두 class 모두 target sensory 활성. OBSTACLE만 LC6+LC16+LC12+LC15 obstacle code 활성.

classifier input:

~~~text
CURRENT 1316-DN activity only
~~~

H0 결과를 보고 representation을 새로 탐색하지 않는다.
H1은 CURRENT 하나만 독립 seed에서 confirm한다.

## seeds

~~~text
train  2101000 / 2101100 / 2101200 / 2101300
eval   2111000 / 2111100 / 2111200
~~~

sample bins:

~~~text
150 / 120 / 90 / 60
~~~

## classifier

~~~text
class-balanced logistic
epochs       120
learningRate 0.02
L2           0.0005
threshold    0.5
~~~

## gate

~~~text
mean FULL balanced accuracy      >= 85%
every eval run FULL              >= 75%
FULL - LABEL_SHUFFLED            >= 25pp
FULL - DN_PERMUTED               >= 25pp
~~~

PASS:
broad obstacle sensory code를 freeze하고 H2 reward-only JUMP learner로 이동한다.

FAIL:
추가 LC channel cherry-picking을 중단하고 sensory encoding의 구조 자체를 다시 설계한다.

H1은 action-free assay이며 browser JUMP deployment는 하지 않는다.


---

# Pre-run amendment — matched target geometry + connectome-constrained looming population

이 amendment는 H1 implementation/experiment 실행 전에 기록하며 위 초안의 sensory population과
class geometry를 아래 내용으로 대체한다. 결과를 본 뒤 수정한 것이 아니다.

## 1. assay confound correction

H0/H1 초안의 기존 context generator는 OBSTACLE과 TARGET_ONLY에서 target geometry가 달랐다.

- OBSTACLE: target이 obstacle far edge 뒤 160 px에 위치
- TARGET_ONLY: target 자체가 source-distance 위치

따라서 같은 source-distance bin에서도 target LC4 및 기타 target sensory가 class별로 달라질 수 있다.
H1에서는 obstacle cue만 검증하기 위해 target trajectory를 완전히 matched한다.

두 class 모두 virtual obstacle front distance d에 대해 target center를 player center에서:

~~~text
d + 215 px
~~~

떨어진 위치에 둔다.

~~~text
215 = player half-width 17 + obstacle width 38 + post-obstacle gap 160
~~~

TARGET_ONLY에는 실제 obstacle과 obstacle sensory만 제거한다.
sample bin은 두 class 모두 동일한 virtual obstacle-front distance를 사용한다.

## 2. obstacle population correction

초안의 LC12/LC15는 사용하지 않는다.

looming-responsive DN connectome에서 직접 보고된 주요 VPN population 중,
현재 target sensory와 겹치는 LC4/LPLC1/LPLC2를 제외하고,
orthogonal obstacle code를 다음으로 고정한다.

~~~text
LC6
LC16
LC22
LPLC4
~~~

- LC6/LC16은 looming/avoidance 관련 population이다.
- LC22/LPLC4는 looming-responsive DN들에 입력하는 주요 VPN population으로 보고되어 있다.
- target sensory의 LC4/LPLC1/LPLC2와 channel identity가 겹치지 않는다.

네 population에 동일한 fixed drive를 사용하며 weight/amplitude sweep은 하지 않는다.

## 3. representation / gate

초안대로 CURRENT 1316-DN 하나만 사용한다.
seeds, classifier, controls, gate는 변경하지 않는다.

~~~text
mean FULL balanced accuracy >= 85%
every eval run FULL          >= 75%
FULL - LABEL_SHUFFLED        >= 25pp
FULL - DN_PERMUTED           >= 25pp
~~~

## references

- Wu et al. 2016, Visual projection neurons in the Drosophila lobula link feature detection to distinct behavioral programs.
- Morimoto et al. 2020, Spatial readout of visual looming in the central brain of Drosophila.
- McFarland et al. 2024, Morphology and synapse topography optimize linear encoding of synapse numbers in Drosophila looming responsive descending neurons.
