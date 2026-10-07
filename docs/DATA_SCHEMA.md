# Receipt and metric schema

## JSON receipt

New studies use schema ID tessera-study-v2. The browser ledger retains support for older tessera-study-v1 receipts, which have no composition-transfer data.

Top-level fields:

| Field | Meaning |
| --- | --- |
| schema | Receipt schema identifier |
| engineVersion | Engine version used to produce the result |
| experimentId | Timestamp plus configuration digest |
| timestamp | Completion time in UTC |
| runtimeMs | Wall-clock duration of the local study |
| hypothesis | Research hypothesis displayed for this study |
| config | Normalized seed, arm, population, epoch, and workload settings |
| benchmark | Acquisition and frozen transfer suite IDs, task expressions, families, and exact target signatures |
| actions | Paired-seed allocation, acquisition schedule, and frozen transfer schedule |
| observations | Trial and seed counts, acquisition and transfer task counts, publication totals, gate-survey totals, and event counts |
| metrics | Per-arm acquisition and transfer summaries, per-task transfer curves, and separate paired contrasts for both splits |
| trials | Seed-level acquisition epochs, fresh transfer-task records, frozen vocabulary snapshots, and local event logs |
| failures | Runtime failures; empty for completed runs |
| mutations | Flattened opcode publication and expiry events |
| conclusions | Bounded synthetic interpretation fields |

## Epoch record

Each acquisition epoch records its task ID and family, target expression, exact sampled training input pairs, training accuracy, exact accuracy on the full 256 input pairs for that familiar task, first exact-solution generation, effective and expanded expression size, population diversity, active opcodes at epoch start, top-program opcode adoption count, selected expression, and founder-lineage count.

Each transfer record includes its frozen task ID/family/target and complete truth-table signature; exact sampled training pairs; training and full-table exact accuracy; generations to exact solution; program-size/diversity metrics; active opcode IDs and snippet count; configured search budget; selected program; and a digest of the common initial population. The digest is a consistency check, not a cryptographic proof. The paired bootstrap resamples seed-level averages across the fixed eight-task split.

## Opcode publication event

Each gate-survey record includes the candidate-function count observed in that epoch, the number meeting the arm's admission gate, and maximum observed lineage and task-family support. Publication records include arm, seed, epoch, task, opcode ID, body display, exact truth-table signature, compact non-cryptographic digest, number of exhaustively evaluated input pairs, total lineage support, independent single-founder lineage support, task-family support, and admission policy. Expiry events include epoch, opcode ID, digest, and observed use count.

## CSV output

The CSV has one row per seed/arm/acquisition epoch and one row per seed/arm/frozen transfer task. Its `phase` column distinguishes `acquisition` from `transfer`. The JSON receipt remains canonical because the CSV does not include full task schedules, truth tables, opcode tables, or event history.

## Interpretation

Acquisition exact accuracy is measured on all 256 input pairs of each familiar target task; those inputs are held out from the sampled training examples. Transfer exact accuracy measures few-shot adaptation to target structures excluded from acquisition. The transfer suite uses the same primitive DSL and input domain, so it does not establish transfer to new operators, interpreters, software, or real systems. The paired bootstrap is a descriptive resampling of paired simulated seeds.
