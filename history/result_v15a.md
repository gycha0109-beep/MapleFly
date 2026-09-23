# result_v15a — injury-history DN representation screen

## Status

**SCREEN FAIL — v15B reward learning is blocked**

Preregistered representation screen:

~~~text
prereg final pre-implementation commit
3ab4c50fde40c2b745140e1cb69c58bcbed26d88

implementation
adf73fdff0dbad1fd2e7989cf93a4a3bc4d9fab3

run
35806082486

artifact
10727129238
sha256:39d08ddd58ce2eaa1a309ecd36398cf2705db073ae927733f125df929252cf2e
~~~

Pinned MaleCNS:

~~~text
alextitonis/fly.ai
95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
~~~

## Frozen gate

~~~text
FULL balanced accuracy       >=65%
every-class recall           >=50%
FULL - DN_SHUFFLED           >=20pp
~~~

PASS한 representation 중 가장 짧은 history를 선택하도록 preregister했다.

## Result

| Representation | FULL balanced acc. | min class recall | DN_SHUFFLED | margin | LABEL_SHUFFLED | Gate |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| CURRENT | 25.0% | 0.0% | 25.0% | 0.0pp | 25.0% | FAIL |
| CONCAT12 | 25.0% | 11.1% | 25.0% | 0.0pp | 25.0% | FAIL |
| CONCAT24 | 25.0% | 0.0% | 25.0% | 0.0pp | 25.0% | FAIL |
| CONCAT48 | 25.0% | 0.0% | 25.0% | 0.0pp | 25.0% | FAIL |

Selected representation:

~~~text
NONE
~~~

4-class chance level은 25%이며 네 representation 모두 정확히 chance였다.

## Confusion structure

FULL confusion matrix의 각 actual class row가 representation별로 동일했다.

~~~text
CURRENT
[3,7,8,0]
[3,7,8,0]
[3,7,8,0]
[3,7,8,0]

CONCAT12
[2,6,5,5]
[2,6,5,5]
[2,6,5,5]
[2,6,5,5]

CONCAT24
[12,0,4,2]
[12,0,4,2]
[12,0,4,2]
[12,0,4,2]

CONCAT48
[8,5,0,5]
[8,5,0,5]
[8,5,0,5]
[8,5,0,5]
~~~

paired-noise design에서 같은 replicate의 네 class는 같은 brain seed를 사용한다.
따라서 이 패턴은 현재 selected DN representation이 impact count보다
seed/replicate별 background variation에 의해 예측되고 있음을 강하게 시사한다.

다만 이 screen만으로 다음 둘을 구분할 수는 없다.

1. LgLG 0.7 / 120 ms가 MaleCNS DN activity에 사실상 전달되지 않는다.
2. DN activity에는 작은 차이가 있지만 현재 baseline-relative 100 ms representation /
   unlabeled top-256 linear probe가 읽지 못한다.

따라서 같은 v15A의 history/gate/drive를 사후 튜닝하지 않고
별도 paired propagation diagnostic으로 원인을 분해해야 한다.

## Decision

~~~text
v15B learned POTION training: DO NOT START
v15A threshold/history/drive post-hoc tuning: FORBIDDEN
next: preregistered LgLG -> MaleCNS propagation diagnostic
~~~

이 결과는 v4의 행동-level null result와 방향이 일치하지만,
v15A는 DN temporal representation 자체에서도 count decoding이 chance였다는
더 직접적인 null result다.

## Interpretation boundary

현재 말할 수 있는 것:

> preregistered LgLG injury proxy와 DN temporal representation 조합에서는
> 0/1/2/3 impact history를 unseen seed에서 decode하지 못했다.

현재 말할 수 없는 것:

- LgLG가 connectome 전체에 아무 영향도 주지 않는다.
- 다른 injury/taste sensory population도 실패한다.
- POTION learning 자체가 불가능하다.
