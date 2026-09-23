# result_v15a_diag — paired LgLG propagation diagnostic

## Status

**ROUTE A — configured LgLG input groups are empty**

Preregistration:

~~~text
history/prereg_v15a_diag.md
c1434d2c2303b0224925039f8b5ed7b60b648537
~~~

Initial diagnostic implementation run `35806840564` aborted because the
script assumed non-empty L/R groups. No scientific result was produced.

The implementation-equivalence fix changed only the diagnostic behavior:
empty groups are measured/reported instead of throwing.

~~~text
fix commit
1fe1e98392978f219dbbc4d534ee533ac2d66a69

authoritative run
35806938566

artifact
10727194680
sha256:4d3889b1dc87eb471c2cffd16aa039d968d56d3794b93eb2ba3051c14e464611
~~~

## Result

Pinned runtime group construction:

~~~text
LgLG_L = 0 neurons
LgLG_R = 0 neurons
~~~

Eight paired seeds all produced:

~~~text
pulse LgLG fired difference   0
LgLG voltage difference       0
whole-network fired diff      0
DN spike difference           0
DN voltage difference         0
~~~

Aggregate route:

~~~text
A_INPUT_NOT_ACTIVATED
STRUCTURAL_DISCONNECT = true
3-hop reachable DN    = 0
~~~

여기서 structural disconnect는 실제 biological LgLG population이
MaleCNS에 연결되지 않았다는 뜻이 아니다.

현재 source set 자체가 0 neurons이므로,
**MapleFly의 exact-name lookup `cells(meta, ["LgLG"], side)`가
pinned metadata에서 아무 neuron도 찾지 못했다**는 구현-level 결과다.

## Consequence for v15A

v15A screen의 chance-level 결과는 이제 설명 가능하다.

~~~text
impact event
-> drive["LgLG_L/R"] = 0.7
-> input group length 0
-> 실제 stimulated neuron 0
-> class 0/1/2/3 neural input 동일
-> FULL 25%
~~~

따라서 v15A FAIL을 "MaleCNS가 injury history를 표현하지 못한다"로
해석하면 안 된다.

정확한 결론은:

> preregistered injury sensory interface가 empty lookup이어서
> v15A에서는 실제 impact sensory perturbation이 발생하지 않았다.

## Historical erratum impact

v4의 `IMPACT_ON`과 `IMPACT_OFF`가 완전히 동일했던 이유 역시
현재 evidence로는 empty LgLG interface가 직접적인 설명이다.

v5에서 game damage와 taste cue는 실제로 작동했지만,
문서에 포함된 `LgLG impact ON` 부분은 no-op이었다.

따라서 v4/v5의 LgLG 관련 biological interpretation은 정정해야 한다.
raw game metrics 자체는 변경되지 않는다.

## Next

drive를 임의로 올리는 문제가 아니다.
0 neurons에 어떤 amplitude를 줘도 입력은 없다.

다음 순서:

1. pinned MaleCNS metadata에서 실제 mechanosensory / contact-related
   sensory population 이름과 side annotation을 inventory한다.
2. upstream biological meaning을 확인한다.
3. 새 population contract를 별도 preregister한다.
4. non-empty input + downstream propagation을 먼저 검증한다.
5. 그 뒤에만 injury-history representation screen을 새 버전으로 재개한다.

v15B learned POTION은 계속 BLOCKED다.
