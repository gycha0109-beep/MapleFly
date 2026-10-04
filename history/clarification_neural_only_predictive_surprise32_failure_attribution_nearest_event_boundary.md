# neural-only predictive-surprise32 실패 귀인 — nearest-event 경계 해석 고정

상태: **권위 실행 전 고정**

기준 설계:
`063a1f6be925ee7145961306503543e28b133131`

기준 사전등록:
`68f34facc1ee456c7b91fe649b57e893258cabea`

## 문제

사전등록은 missed impact의 가장 가까운 emitted neural event를 `+/-20 steps` 범위에서 찾도록 하면서 분류 구간을 다음과 같이 정의했다.

```text
PRE_200MS   [-10, 0)
IN_WINDOW   [0, 10)
LATE_200MS  [10, 20)
NONE
```

따라서 inclusive 검색 범위 안의 `[-20,-10)` 및 정확히 `+20`은 이름 있는 bucket에 포함되지 않는다.

## 고정 해석

검색 자체는 기존대로 **inclusive +/-20 steps**를 유지한다.

이름 있는 bucket의 경계는 확장하지 않는다.

따라서:

```text
[-20,-10) -> NONE
+20        -> NONE
```

으로 집계한다.

원시 signed offset은 그대로 보존한다. 동일 거리 후보가 있으면 기존 구현대로 더 이른 step을 선택한다.

## 과학적 영향

이 결정은 사전등록된 구간을 새로 넓히지 않는 보수적 해석이다.

다음을 변경하지 않는다.

- frozen neural-only model
- model SHA
- q=0.95
- tau=1.574078960908224
- eventizer
- refractory=10
- matching window
- miss attribution precedence
- attribution axis 판정
- 배포 상태

특히 최종 `attributionAxis`는 `missAttribution` 비율로 결정되며 nearest-event 보조 bucket은 axis 계산에 사용되지 않는다.

이 해석은 권위 실행 결과를 보기 전에 고정한다.
