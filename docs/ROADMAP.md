# Research roadmap

The stages below describe a path from this deterministic demonstration to a credible research platform. Success at one stage is not evidence for the next.

## v0 — Proof of mechanism

Objective: establish an inspectable end-to-end comparison of code-fragment sharing and exact opcode publication.

Capability: four policies, five fixed tasks, paired seeded worlds, exhaustive nibble-table checks, a local browser dashboard, CLI receipts, and deterministic tests.

Experiment: verify the four arms receive matching initial programs, task sequences, and examples; measure whether any opcode is published and reused.

Success metric: repeatable seed-level receipts and a nonzero rate of admitted and later reused opcodes. Failure to publish is recorded as a negative mechanism result.

Expected failures: search does not find repeated fragments; lineages converge too slowly; macros are redundant with primitives; fixed task motifs create an overly easy benchmark.

Next question: does the ratification rule improve transfer on tasks authored independently of the mechanism?

## v1 — Experimental system

Objective: separate the effects of semantic certification, lineage diversity, and opcode lifetime.

Delivered in v0.2.0: a frozen eight-task composition split disjoint from acquisition target tables; fresh identical starting populations and training samples across paired arms; frozen learned vocabularies during transfer; no transfer-phase publication/expiry; per-task full-table scores; paired seed contrasts; and phase-labeled receipts.

Still needed for full v1: configurable publication thresholds, explicit expiry/compression ablations, independently authored task suites, interpreter-operation accounting, preregistered seed manifests, and larger confirmatory runs. Current equal-budget control matches population-by-generation slots, not wall time or primitive operation counts.

Next experiment: factorial study over admission threshold × opcode expiry × sharing mode on multiple frozen composition suites, with preregistered seed sets.

Success metric: a stable paired advantage on unseen task families, with no single seed dominating and no severe diversity collapse.

Expected failures: combinatorial run cost, misleading aggregate scores, hidden benchmark leakage, or advantages disappearing under matched evaluation budgets.

Next question: can the same instruction-acquisition policy transfer between different interpreters?

## v2 — Research platform

Objective: test whether semantic commons matter beyond the current nibble machine.

New capabilities: typed state-machine and grid-transformation domains; independently implemented interpreters; mutation/crossover variants; compute accounting; multi-objective diversity metrics; preregistered study manifests; external result validation.

Experiment: compare ratified opcode sharing with program-library learning and automatic function definition baselines on a common task corpus and compute budget.

Success metric: independently replicated gains in transfer or sample efficiency across more than one domain, with exact semantic validation where finite and property-based validation where not.

Expected failures: baseline mismatch, interpreter-specific artifacts, or benefits explained solely by shorter encodings.

Next question: can agents co-evolve the instruction semantics safely when the full domain cannot be enumerated?

## v3 — Frontier experiment

Objective: study verifiable shared abstractions in larger, partially observed computational worlds.

New capabilities: proof-carrying interfaces, bounded property tests, adversarial counterexample generation, multiple interacting opcode commons, migration between task ecologies, and independent audit logs.

Experiment: remove exhaustive enumeration, permit incomplete specifications, and test whether counterexample-driven opcode governance resists semantic drift while still enabling useful transfer.

Success metric: independently reproduced improvements in held-out composition together with a measured bound on failed or mis-specified opcode reuse.

Expected failures: undecidable or incomplete semantic checks, governance overhead exceeding transfer benefit, or no persistent novelty under task shifts.

Next question: which parts of an evolving computational language must be shared for useful collective abstraction, and which should remain local?
