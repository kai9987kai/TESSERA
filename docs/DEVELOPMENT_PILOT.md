# Development pilot: Tessera v0.2.0 — 2026-10-07

This exploratory development run exercises both acquisition and the new frozen composition-transfer phase. It was not preregistered and must not be treated as a confirmatory result. The earlier v0.1.2 acquisition-only receipt remains available at `results/development-pilot-20261007.json`.

## Configuration

- Starting seed: 41721
- Paired seeds: 8
- Population: 32 programs per arm
- Generations per task: 18
- Task epochs: 5
- Training examples per task: 24
- Arms: all four policies
- Engine: 0.2.0
- Transfer suite: `tessera-composition-holdout-v1`, eight fixed target structures
- Transfer search: fresh matched populations, 24 examples per task, 32 programs, 18 generations, vocabulary frozen
- Recorded local runtime: 2,751 ms on the execution machine for the CLI run; this timing is machine- and runtime-specific.

## Outcome

| Arm | Acquisition exact accuracy | Mean acquisition program nodes | Mean population diversity | Mean active opcodes at end |
| --- | ---: | ---: | ---: | ---: |
| Closed grammar | 26.42% | 6.38 | 0.95 | 0.00 |
| Snippet relay | 25.38% | 11.18 | 0.96 | 0.00 |
| One-lineage opcodes | 25.38% | 4.78 | 0.94 | 8.38 |
| Ratified opcode commons | 26.14% | 6.62 | 0.95 | 0.12 |

Ratified opcode commons minus closed grammar was −0.27 percentage points on the mean across paired seeds. The descriptive 1,000-resample paired-seed percentile interval was −0.82 to 0.00 percentage points. Snippet relay was −1.04 points (interval −3.95 to +1.20); one-lineage opcodes were −1.04 points (interval −3.10 to +0.87). The study logged 100 one-lineage publications, one ratified publication, and 33 expiry events. Across all recorded opcode-gate surveys, 473 candidate functions were considered and 337 passed the applicable arm gate; repeated candidates can recur across surveys.

## Frozen composition transfer

| Arm | Mean exact accuracy across 8 tasks | Mean transfer nodes | Exact-task rate |
| --- | ---: | ---: | ---: |
| Closed grammar | 28.50% | 9.47 | 1.56% |
| Snippet relay | 28.37% | 14.36 | 3.13% |
| One-lineage opcodes | 25.81% | 6.86 | 4.69% |
| Ratified opcode commons | 28.32% | 9.48 | 1.56% |

Ratified commons minus closed grammar was −0.18 percentage points on the paired-seed mean; the descriptive 1,000-resample interval was −0.53 to 0.00 points. Snippet relay was −0.13 points (interval −3.81 to +3.24); one-lineage opcodes were −2.69 points (interval −5.98 to +1.14). The CSV has 416 phase-labeled data rows plus its header.

## Interpretation

This pilot does not support the hypothesis that ratification improves transfer. On the new unseen-composition split its mean is slightly below the closed baseline, its interval includes zero, and exact solutions remain rare. The one-lineage opcode arm also has lower mean exact accuracy than the closed baseline. One ratified function was admitted, but its sparse use and near-zero paired difference do not show a benefit.

The 8-seed run is small, all eight held-out tasks are public and hand-authored, and the search objective is simple. Acquisition and transfer use the same DSL and input domain; equal population/generation slots do not guarantee equal wall time or primitive-operation cost. The result is specific to this exact engine, frozen suite, and configuration. Do not extrapolate to program synthesis in general.

## Receipts

- results/development-pilot-20261007-v020.json — v2 canonical seed-level record, including both benchmark manifests, acquisition and transfer samples, initial-population digests, events, metrics, and configuration.
- results/development-pilot-20261007-v020.csv — one row per seed/arm/acquisition epoch plus one row per seed/arm/transfer task.
