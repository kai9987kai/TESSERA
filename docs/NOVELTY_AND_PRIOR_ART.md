# Novelty challenge and prior art

## Claim boundary

Tessera does not claim that automatic function invention, reusable program libraries, evolutionary program search, or semantic hashing is new. These areas have substantial prior work.

The potentially distinctive mechanism in this prototype is a specific experimental governance rule for a changing instruction set: a program fragment becomes a public, compressed opcode only after distinct single-founder lineages rediscover the same complete finite-domain function across separate task families; recombined descendants do not count toward the gate. Its full truth table is exhaustively checked, and the public opcode can later expire when unused. The experiment compares this ratified lifecycle with closed evolution, raw fragment sharing, and one-lineage opcode admission.

Novelty confidence: established prior art for each component; partially novel combination and potentially novel mechanism for this exact admission-and-expiry protocol. Confidence is modest. This is a design hypothesis, not a literature search sufficient to establish priority, and not evidence that the mechanism will work.

## Closest research

John Koza's automatic function definition work in genetic programming dynamically defines and reuses subroutines during evolutionary search. Tessera shares the idea that useful functions can become callable program vocabulary. The difference proposed here is not subroutine creation by itself; it is lineage-based social ratification, exact finite-domain table checking, public instruction-set lifecycle, and paired measurement of transfer and diversity.

DreamCoder learns symbolic abstractions and a search policy from solved tasks through a wake-sleep process. Stitch synthesizes library functions that capture common functionality across a program corpus. These methods are close to Tessera's compression and transfer goal. Tessera is much smaller and less capable: it has no learned neural proposal model, no general-purpose synthesis, and no language-level library optimization. It studies a population-level admission policy inside a tiny, exhaustively enumerable machine.

The v0.2.0 frozen composition split strengthens the measurement by separating target structures from acquisition tasks. Compositional generalization benchmarks are an established research direction; for example, gSCAN evaluates generalization in grounded language understanding. Tessera's eight hand-authored tasks are a much narrower symbolic split in the same DSL, not a new benchmark class and not a substitute for comparisons against established library-learning systems.

The supplied project portfolio already contains seeded agent simulations, synthetic organisms and tissues, memory-transfer experiments, changing model architectures, search infrastructure, and evidence ledgers. Tessera reuses the portfolio's emphasis on explicit interventions and reproducible receipts but moves the independent variable from memory location or model composition to governance of a changing computational vocabulary.

## Questions a stronger novelty study would still need to answer

- Is the lineage gate different in substance from diversity pressure or quality-diversity search?
- Does exact finite-domain semantic interning add explanatory value beyond ordinary grammar compression?
- Does the candidate admission rule help on independently authored or generated compositions, rather than only this fixed eight-task suite?
- Does opcode expiry create measurable language turnover, or is it unnecessary policy decoration?
- Do the results persist under independently authored task families and different search operators?
- How does the admission rule compare with DreamCoder, Stitch, and automatic function definition on matched data and compute?
- Does publication improve transfer after the target motifs are no longer hand-authored in advance?

Until those comparisons exist, describe Tessera as a bounded research instrument and a candidate mechanism, not a new field or a first-of-its-kind result.

## References

- Koza, J. R. (1993). Hierarchical Automatic Function Definition in Genetic Programming. Foundations of Genetic Algorithms, Volume 2, pp. 297–318. DOI: https://doi.org/10.1016/B978-0-08-094832-4.50024-6
- Ellis et al. (2021). DreamCoder: Bootstrapping Inductive Program Synthesis with Wake-Sleep Library Learning. PLDI 2021. https://arxiv.org/abs/2006.08381
- Bowers et al. (2023). Top-Down Synthesis for Library Learning. https://arxiv.org/abs/2211.16605
- Ruis et al. (2020). A Benchmark for Systematic Generalization in Grounded Language Understanding (gSCAN). https://proceedings.neurips.cc/paper/2020/hash/e5a90182cc81e12ab5e72d66e0b46fe3-Abstract.html
- Luketina et al. (2025). Compositional Interfaces for Compositional Generalization. https://proceedings.mlr.press/v274/luketina25a.html
