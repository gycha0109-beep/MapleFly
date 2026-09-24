# result_v15k — reward-only terminal-health shaping on long neural history

## Status

```text
V15K_REWARD_ONLY_TERMINAL_HEALTH_FAIL
```

Authoritative run:

```text
run
  36051119095

head
  ec8b4d5cbba42d4a04a1bb11f283535f457519ce

artifact
  10830808850

artifact digest
  sha256:08845680304db9527522486b0c8d6d5b6bc4c3f4f06fdcbff0bd1ec676811e70
```

Frozen preregistration:

```text
0fa6e399d12f6025a1df031c0299b79d3b2872e4
```

The first workflow attempt, run `36051051491`, stopped before scientific execution because a legacy
v15J evidence-output filename triggered the prior-policy dependency guard. The output path was corrected
without changing representation, seeds, optimizer, reward, gates, or controls. Run `36051119095` is
authoritative.

## Primary EVAL

```text
survival
  83.3%        PASS

minimum base-seed survival
  75.0%        PASS

mean excess potion uses among survivors
  2.550        FAIL
  required <= 1.500

wasted healing / DRINK
  1.011        PASS
```

## Causal / alignment controls

```text
LONG_NEURAL_HISTORY_OFF
  survival 87.5%
  mean excess 2.476
  contribution gate FAIL

ALL_NEURAL_OFF
  survival 0.0%
  neural dependence present

EPISODE_SHIFT_1
  survival 79.2%
  alignment contribution FAIL

DECISION_MEAN_NEURAL
  survival 91.7%
  alignment contribution FAIL
```

The terminal-health outcome reward restored survival relative to v15J but did not solve potion economy.
More importantly, long-history removal did not harm survival and replacing episode-specific neural
sequences with the cohort decision-position mean improved survival.

Supported interpretation:

```text
the current reward-only long-neural policy remains dominated by a repeatable temporal neural profile;
episode-specific neural/contact alignment has not been demonstrated
```

Do not deploy v15K, relax the economy gate, or proceed to v16C.

Authorized next step:

```text
V15K_D1_EPISODE_SPECIFIC_NEURAL_RESIDUAL_AUDIT
```

The audit must separate the common decision-position component from episode-specific neural residuals
and test both the scalar v15E2 margin and the richer pooled 1,316-D DN representation before another
reward-only policy is trained.
