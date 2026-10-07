# Experiment protocol TC-001

## Research question

Does a shared instruction set admitted after independent rediscovery improve few-shot search on frozen, structurally distinct task compositions while retaining useful population diversity?

## System and mechanism

The system is a small population of expression trees over two unsigned 4-bit inputs. Primitive instructions implement XOR, AND, OR, addition and subtraction modulo 16, one-bit rotate-left and rotate-right, and complement. A program is an expression tree; a population member is scored on sampled input-output examples.

Candidate fragments are collected from leading programs. An opcode is a two-input lookup table with exactly 256 hexadecimal output entries. Its inputs are arbitrary intermediate 4-bit values, so any discovered two-variable fragment can be named and called as an instruction. Opcode admission changes the grammar available to later mutations. An opcode unused by the leading cohort for two task epochs is removed from the active grammar.

In the ratified policy, a candidate must occur in leading programs whose ancestry contains exactly one initial founder lineage, with at least two distinct founders supporting the same function across at least two task families. A recombined program with multiple founder ancestors does not count toward this gate. The engine enumerates all 256 input pairs and records the complete table before publication. The table is an exact semantic certificate for this finite interpreter; it is not a proof about any external programming language.

## Benchmarks

There are five deterministic tasks whose target expressions reuse two hand-authored motifs in different contexts. Every task is a complete function from 16 × 16 input pairs to one 4-bit output. Each paired seed receives the same shuffled task order and the same training examples for every arm. The final per-task score is measured over the full 256 input pairs, including those not sampled for training.

Task family IDs:

| ID | Family | Target form |
| --- | --- | --- |
| T-01 | wake | rotate the shared braid |
| T-02 | mask | combine the shared braid and complemented input |
| T-03 | turn | rotate the shared knot and combine with modular sum |
| T-04 | braid | combine braid and knot |
| T-05 | cross | rotate the braid-knot crossing |

The expression forms are fixed and intentionally small. They make a controlled mechanism benchmark, not an open-ended or externally validated task suite.

## Frozen composition transfer phase

After the five acquisition tasks finish, each arm's vocabulary is frozen. Expired opcodes remain in historical receipts but are unavailable. The evolved population is discarded. For each held-out task, every arm starts from the same freshly generated population for that seed/task pair and receives the same sampled input pairs. The search gets the configured number of population-by-generation slots. It may use active acquired opcodes, or acquired snippets in the fragment arm, but cannot publish or expire vocabulary during transfer.

The versioned `benchmarks/transfer-suite-v1.json` contains eight fixed target expressions. They are specified separately from acquisition and their complete truth tables are disjoint from the five acquisition target tables. The receipt includes the manifest ID, target expressions and signatures, sampled pairs, initial-population digests, learned vocabulary IDs, and transfer outcomes. The suite is public and fixed; it is held out from the acquisition procedure, not hidden from users. It shares the same input domain and primitive DSL, so this measures adaptation to unseen compositions, not transfer to new operators or a new interpreter.

The transfer score is the best program's exact-match fraction over all 256 input pairs after selection on the configured small sample. This is few-shot adaptation, not zero-shot generalization. Equal population/generation slots control candidate counts, not wall-clock time or primitive-operation counts; macro lookup and program sizes may have different costs. Both size and exact accuracy are reported.

| ID | Held-out family | Target form |
| --- | --- | --- |
| H-01 | masked-rotate | `xor(and(x,5),ror(y))` |
| H-02 | reverse-mask | `add(ror(x),and(y,C))` |
| H-03 | nested-complement | `not(or(xor(x,3),y))` |
| H-04 | rotated-subtract | `sub(rol(and(x,A)),xor(y,6))` |
| H-05 | complement-gate | `or(add(x,7),ror(not(y)))` |
| H-06 | folded-xor | `and(sub(y,x),xor(rol(y),9))` |
| H-07 | nested-carry | `xor(or(ror(x),3),add(and(y,C),x))` |
| H-08 | counter-rotate | `add(not(rol(xor(x,y))),and(ror(y),A))` |

## Arms

| Arm | Shared material | Admission rule | Purpose |
| --- | --- | --- | --- |
| Closed grammar | None | No publication | Baseline for within-lineage evolution |
| Snippet relay | Raw expression fragments | Top-program fragment pool | Tests donor-code reuse without named function-table instructions |
| One-lineage opcodes | Exact function-table opcodes | One founder lineage and one task family | Removes the independent-rediscovery gate |
| Ratified opcode commons | Exact function-table opcodes | At least two distinct single-founder lineages and two task families | Full proposed mechanism |

All arms use the same initial program population and seeded search stream for a paired world. Arms diverge after their sharing policies affect the available variation and syntax. Random-number consumption may then differ as the programs diverge.

## Variables and metrics

Independent variable: shared-artifact and opcode-admission policy.

Primary dependent metric: mean exact accuracy over the eight frozen composition tasks, measured after the equal-slot few-shot transfer phase. The acquisition split's exact score across all 256 inputs for each trained-on function is reported separately as an in-domain diagnostic.

Secondary metrics:

- First generation whose selected program exactly matches the full target table, reported separately for acquisition and transfer.
- Effective expression size and macro-expanded size.
- Fraction of unique expression trees in the final population.
- Active opcode count, publication count, expiry count, and use by distinct top-program lineages.
- Per-seed paired accuracy differences from the closed grammar on both splits.
- Per-held-out-task scores and exact-solution rates, so a mean cannot conceal which compositions transfer.

The current selection objective is sampled exact-match accuracy plus 0.25 times four-bit output agreement, minus 0.0015 times effective expression nodes. Bit agreement gives mutations a smoother search signal; exact-match accuracy remains the reported training metric. The mutation and tournament policy are fixed in the engine version.

## Analysis

Each replicate is a paired seed. The dashboard reports acquisition curves, per-held-out-task transfer scores, paired mean differences against the closed grammar on each split, and a 1,000-resample percentile bootstrap over paired seed differences. The interval describes only simulated-seed variation for this benchmark and configuration. It is not a confidence interval over real-world systems.

Do not interpret a positive average by itself as mechanism success. Inspect seed-level effects, task-by-task results, opcode use, diversity, and whether improvement survives the one-lineage and snippet controls.

## Falsification and failure modes

Evidence against the central hypothesis includes:

- Ratified candidates rarely or never pass their admission gate.
- Published opcodes are not reused by later lineages or task families.
- Ratification does not improve exact accuracy or reduce solving effort on the frozen composition split against the closed arm.
- The benefit is limited to one seed or one target family.
- Opcode sharing reduces population diversity and harms later task performance.
- Raw fragments perform as well as or better than the opcodes, leaving no evidence that opcode publication adds value.

No publication is not a software error. It means this run did not instantiate the proposed social mechanism.

## Reproducibility and ledger

The v2 JSON receipt records schema version, engine version, UTC timestamp, configuration, both benchmark manifests, paired seed/task actions, acquisition epochs, transfer tasks, matched initialization and sample receipts, opcode gate surveys, publication and expiry events, aggregate metrics, failures, and bounded conclusions. The CLI emits a phase-labeled CSV with one row per seed-arm-acquisition epoch and one row per seed-arm-transfer task. The browser ledger continues to load v1 receipts, which display no transfer result.

The engine uses a local xorshift32 generator and deterministic seed derivation. The timestamp and experiment ID vary between runs; trials and metrics remain deterministic for a fixed engine version, benchmark manifests, and configuration.

## Scope

This is a locally runnable, synthetic symbolic experiment. It has no external model, hidden dataset, network calls, or runtime dependency. Its benchmark is intentionally narrow; test-runner success validates software behavior, not the research hypothesis.
