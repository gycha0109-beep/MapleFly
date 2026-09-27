# correction_v15n_d6_d2_d3_d3_attempt2

## Failure

Run `36289367631` failed before producing diagnostic metrics or an artifact.

Error:

```text
TypeError: Cannot read properties of undefined (reading 'some')
at d2d2HitSuppressed
at d2d2Rows
```

## Root cause

The D3-D3 implementation reconstructs the frozen old D2-D2 scalar model by calling `d2d2Rows(trainTapes, ...)`.

That helper expects the frozen D2 eventizer trace to already be attached to each TRAIN tape. The implementation omitted the established prerequisite call:

```text
d2AttachEventizer(trainTapes, phase.means, detector)
```

The failure occurred before model fitting, prospective metric calculation, outcome selection, or artifact creation.

## Authorized correction

Insert exactly the missing TRAIN prerequisite call before `d2d2Rows(trainTapes, ...)`.

No change is authorized to:

- cohorts or seeds;
- labels or context condition;
- D6 detector;
- PCA definition or SHA requirement;
- feature families;
- stratum weights;
- lambda or threshold;
- support gates;
- observability gates;
- outcome precedence.

The failed run is implementation-invalid and provides no scientific result.
