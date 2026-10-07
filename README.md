# Tessera Lab — Opcode Commons

Tessera is a local, deterministic research toy for one question:

> When small programs discover reusable functions, does requiring independent rediscovery before publication create a more useful shared instruction set?

Programs are short expression trees over a 4-bit machine. Four matched arms acquire a vocabulary on five training tasks: closed grammar, raw shared fragments, immediate function-table opcodes, and opcodes that require independent rediscovery by distinct single-founder lineages across task families. Opcode candidates are checked on all 256 inputs before publication; unused opcodes expire after two task epochs.

The v0.2.0 experiment adds a separate eight-task composition split. After acquisition, each arm discards its evolved population and starts from the same fresh seeded programs for each held-out task. It keeps only learned snippets or currently active opcodes; the vocabulary is frozen, and no further publication or expiry occurs. Search gets the same number of population-by-generation slots per arm. This is few-shot adaptation to fixed unseen compositions, not zero-shot transfer or equal wall-clock instruction cost.

The distinctive mechanism is the combination of independent-lineage ratification, exhaustive finite-domain semantic checking, and an expiring public instruction set. Program-library learning and automatic function definition are established research areas; this project makes no absolute novelty or priority claim. See docs/NOVELTY_AND_PRIOR_ART.md.

Search ranks programs using exact training accuracy plus a smaller bit-agreement signal, with a size penalty. The headline accuracy still requires an exact 4-bit output match and is evaluated on the full input table.

## Start the browser lab

Requirements: a recent browser and Python 3.10+ for a local static server. No packages or model downloads are needed.

On Windows, double-click start-lab.cmd. It opens the lab at http://127.0.0.1:8765 and starts a loopback-only server. Keep the command window open while using the lab.

Or run from this directory:

    python -m http.server 8765 --bind 127.0.0.1

Then open http://127.0.0.1:8765.

Run the quick 2-seed pilot for a short smoke experiment. The standard setup runs 6 paired seeds and compares all four policies. Every run includes the fixed composition split. Larger runs can use up to 32 seeds, 120 programs per world, and 80 generations per task.

## Run from the command line

Requirements: Node.js 20+. No npm install is required.

    node cli/run-study.mjs --replicates=8 --seed=41721

The runner writes a canonical JSON receipt and a phase-labeled CSV into results/. CSV rows identify either acquisition or transfer. Choose a custom output directory with --out PATH, or select arms with --arms=closed,ratifiedOpcodes. Run node cli/run-study.mjs --help for options.

Run the test suite with:

    npm test

## What the study records

- Paired starting seed, task order, configuration, engine version, UTC timestamp, and experiment ID.
- Per-task training accuracy and exact accuracy over all 256 nibble pairs.
- Generations to an exact solution when one is found.
- Effective and expanded expression size, population diversity, and opcode use.
- Published and expired opcode events with exhaustive table signatures.
- Arm-level paired differences against the closed grammar, with a descriptive paired-seed percentile bootstrap.
- A frozen transfer-split manifest, target signatures, matched initial-population digests, and identical training-example pairs across arms.
- Separate transfer scores, exact-solution generations, population diversity, and learned-vocabulary use for the eight unseen compositions.
- Machine-readable JSON and CSV exports. The browser keeps recent receipts in a size-bounded local ledger; export larger or important runs. Command-line runs are written to disk.

The compact opcode digest is a table label, not a cryptographic hash or a security proof. The exact stored table and admission record are the auditable receipt.

## Limits

This is a finite symbolic benchmark with hand-authored target expressions and a small, mutation-based search process. Acquisition and transfer tasks use the same primitive DSL, and the composition split is fixed and public rather than a secret challenge set. Its truth-table check is exact only for the defined 4-bit, two-input machine. The study cannot establish that useful abstractions will emerge in open-ended environments, that a program is correct outside the benchmark, or that any biological or cognitive phenomenon is explained. A run with no admitted opcode is a valid negative mechanism result.

Confidence intervals summarize variation across the simulated paired seeds and benchmark settings. They do not establish uncertainty over real systems or external populations. A promising result requires follow-up with more task families, independent implementations, and preregistered settings.

## Project map

- src/engine.js — deterministic acquisition/transfer suites, program interpreter, evolutionary loop, opcode admission, metrics, and export.
- src/worker.js — keeps browser experiments off the interface thread.
- src/app.js — local dashboard, charts, exports, and browser ledger.
- cli/run-study.mjs — headless reproducible runner.
- benchmarks/families.json — versioned target-family manifest.
- benchmarks/transfer-suite-v1.json — frozen unseen-composition task manifest.
- docs/EXPERIMENT_PROTOCOL.md — benchmark and measurement protocol.
- docs/NOVELTY_AND_PRIOR_ART.md — related methods and bounded novelty assessment.
- docs/PORTFOLIO_MAP.md — synthesis of the supplied portfolio.
- docs/ROADMAP.md — four research stages and failure criteria.
- docs/DATA_SCHEMA.md — receipt fields and interpretation.
- tests/engine.test.js — deterministic, pairing, task, and export checks.
- results/development-pilot-20261007-v020.json — example exploratory v0.2.0 receipt with transfer measurements.

## Research question and pass/fail reading

Primary comparison: the ratified opcode commons versus the closed grammar on exact accuracy across the eight frozen composition tasks after equal-budget fresh search. A useful result should also survive per-task and per-seed inspection, retain population diversity, and not be explained solely by shorter encodings. Acquisition accuracy on the five familiar families remains a secondary diagnostic.

The central hypothesis is weakened if ratified opcodes fail to publish, are rarely reused on the composition split, do not improve unseen-task exact accuracy or search effort, or reduce diversity enough to hurt performance. Compare the full receipt rather than relying on the dashboard mean.

## Roadmap

See docs/ROADMAP.md for v0 through v3. This release is a v1 experimental system over one finite symbolic domain. It does not implement neural search, real code execution, live online learning, or automatic claim generation.
