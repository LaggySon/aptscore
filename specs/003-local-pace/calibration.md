# Local Pace — model v1 calibration

Local Pace is a deterministic urban-intensity measure displayed as a metaphorical `mph` value.
It is not literal traffic speed and is not a desirability, beauty, safety, affordability,
walkability-quality, or transit-quality score.

## Fixed model

- Model version: `1`
- Radius: `800m`
- Distance weights: `0–400m = 1.0`; `400–800m = 0.5`
- Final weights: street activity `50%`; transit intensity `30%`; road intensity `20%`
- Raw feature and road-class weights: `src/server/domain/pace-constants.ts`
- Road ring approximation: each adjacent OSM way-node segment is assigned by its midpoint

Each raw component is normalized independently with monotone piecewise-linear interpolation
between the fixed v1 knots in `pace-constants.ts`, then clamped to `0–100`. The final result is:

```text
round(clamp(0.50 × streetActivity
          + 0.30 × transitIntensity
          + 0.20 × roadIntensity, 0, 100))
```

## Why v1 is piecewise-linear

A single `raw / ceiling × 100` constant per component was evaluated first. It cannot reproduce the
anchor ordering with the captured OSM data:

- Lee has higher transit and road raw measurements than Blackheath, although Blackheath must have
  the higher final anchor score.
- Paddington has slightly higher transit and road raw measurements than Oxford Circus, although
  Oxford Circus must be about 40 final-score points higher.

No set of positive linear component ceilings can satisfy both inversions while retaining the fixed
50/30/20 final formula. Fixed monotone curves are the smallest v1 normalization change that does.
The runtime still contains no location names or special cases; only raw-to-component calibration
knots are frozen as model constants.

## Captured measurements

The calibration script queried OpenStreetMap through Overpass on 2026-09-01. POIs and transit
features use their mapped point/area centres. Road ways use geometry and are split into adjacent
segments before midpoint ring weighting. The query and summarizer are reproducible with:

```bash
npm run calibrate:pace
```

Tests do not call Overpass. They use compact checked-in fixtures derived from these raw values.

| Location (point)                   | Role       | Street raw | Transit raw |   Road raw | Components S/T/R   | Pace v1 |
| ---------------------------------- | ---------- | ---------: | ----------: | ---------: | ------------------ | ------: |
| Lee (51.4497, 0.0135)              | anchor     |     28.750 |      11.000 | 19,865.752 | 1 / 21.67 / 55     |      18 |
| Blackheath (51.4657, 0.0089)       | anchor     |    111.500 |       8.875 | 11,460.521 | 13 / 21.67 / 35    |      20 |
| Ealing Broadway (51.5149, -0.3015) | anchor     |    269.250 |      12.750 | 17,342.781 | 20 / 36.67 / 45    |      30 |
| Chiswick (51.4927, -0.2633)        | anchor     |    252.750 |      21.375 | 21,388.644 | 18 / 43.33 / 55    |      33 |
| Paddington (51.5154, -0.1755)      | anchor     |    438.375 |      69.125 | 41,792.261 | 20 / 100 / 100     |      60 |
| Oxford Circus (51.5154, -0.1410)   | anchor     |  2,080.625 |      65.625 | 40,567.961 | 100 / 100 / 100    |     100 |
| Richmond (51.4613, -0.3037)        | validation |    434.250 |      31.500 | 23,896.683 | 20 / 56.30 / 60.88 |      39 |
| Stratford (51.5413, -0.0032)       | validation |    697.625 |      75.750 | 20,171.594 | 32.63 / 100 / 55   |      57 |

The anchors produce the required order and approximate magnitudes:

```text
Lee < Blackheath < Ealing Broadway / Chiswick < Paddington < core Central London
```

Richmond and Stratford were held out from fitting. Their ordering and labels are sensible for v1:
Richmond is a busy town centre; Stratford is a major urban centre/hub.

## Versioning rule

Any change to feature weights, ring/radius rules, normalization knots, component weights, or labels
must increment `modelVersion` and add new calibration fixtures. Existing v1 constants and expected
outputs are locked by `e2e/pace-domain.spec.ts`.
