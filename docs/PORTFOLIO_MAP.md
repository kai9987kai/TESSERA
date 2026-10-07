# Supplied portfolio map

This map is based on the project overviews and repository READMEs linked in the request. It records what the projects contribute to the design; it does not claim a line-by-line security or source-code audit of every repository. No source code or model weights are copied into Tessera.

## Search, model composition, and programmable tools

| Project | Observed direction | Design lesson carried into Tessera |
| --- | --- | --- |
| [NexusSearch](https://github.com/kai9987kai/NexusSearch) | Dependency-free C11 local JSON search with immutable snapshots and hybrid text/vector queries | Make the experiment local, inspectable, dependency-light, and precise about which mechanisms actually run |
| [Supermix](https://github.com/kai9987kai/Supermix) | Local model application, training, evaluation, and packaging monorepo | Separate the interface from the engine and expose reproducible run settings |
| [Supermix Expanse](https://github.com/kai9987kai/Supermix-expanse) | Multi-source model grafting, distillation, and fine-tuning with explicit weak-skill results | Measure component-level effects and state where a capability did not improve |
| [Supermix Expanse v2](https://github.com/kai9987kai/Supermix-Expanse-v2) | Continued experimental model composition with model/licensing boundaries | Treat model assembly as a hypothesis whose results need separate receipts |
| [Supermix Archimedes](https://github.com/kai9987kai/supermix-archimedes) | Heterogeneous model subsystems joined with a simulated 22-brain system | Ask how new executable components change composition rather than merely averaging parameters |
| [NexusFlow](https://github.com/kai9987kai/nexusflow) | Python DSL and runtime for rapid prototypes | Represent the evolving computation in an explicit, inspectable language |
| [Odysseus](https://github.com/odysseus-dev/odysseus) | Self-hosted AI workspace | Keep the working instrument locally deployable and modular; do not create another assistant |

## Artificial life, agents, and synthetic cognition

| Project | Observed direction | Design lesson carried into Tessera |
| --- | --- | --- |
| [Prometheus-alpha](https://github.com/kai9987kai/prometheus-alpha) | Synthetic neural cellular automata learn, lose a head, and regrow | Make interventions explicit and keep synthetic mechanisms separate from biological claims |
| [3D Animal Simulator Hybrid Agent](https://github.com/kai9987kai/3d-animal-simulator-Hybrid-Agent) | Browser ecosystem with agents, inherited traits, weather, interventions, and repeatable seeds | Use a seeded environment and comparable arms rather than a one-off demonstration |
| [Morpheus](https://github.com/kai9987kai/morpheus) | Synthetic tissues with self-models, membrane state, and audited rule changes | Make internal state observable and treat self-change as something to audit |
| [GhostInTheMachine](https://github.com/kai9987kai/GhostInTheMachine) | Long-run causal-emergence experiment laboratory | Log mechanism behavior over repeated runs and challenge causal interpretation |
| [GenesisEngine](https://github.com/kai9987kai/GenesisEngine) | Deterministic artificial-life core: regulatory genomes, multicellular bodies, nervous systems, reproduction, and evolution | Separate simulation core from display and make state replay possible |
| [FLY-DIAMOND-NEXUS](https://github.com/kai9987kai/FLY-DIAMOND-NEXUS) | Specialized neuropil models share learned synapses in a multi-role environment | Study how shared machinery interacts with local specialization |
| [QuantumBot](https://github.com/kai9987kai/QuantumBot) | Evolutionary agents whose movement uses shallow variational circuits and short-lived peer memory | Treat architectural diversity and sharing policy as measurable variables |
| [MOLT](https://github.com/kai9987kai/MOLT) | Seeded memory-placement and regrowth experiment in synthetic organisms | Do not repeat the portfolio's memory-carrier question; move the independent variable to computational language |
| [Mnemorph](https://github.com/kai9987kai/Mnemorph) | Adaptive synthetic-memory assays that distinguish trace persistence from reconstruction and readout changes | Use competing explanations and exact assay receipts |
| [MEMORY-CARRIER-OBSERVATORY](https://github.com/kai9987kai/MEMORY-CARRIER-OBSERVATORY) | Paired carrier-removal matrix and factorial transfer studies in synthetic agents | Preserve paired comparisons, factorized interventions, and bounded result language |

## Evidence, reverse engineering, and system transformations

| Project | Observed direction | Design lesson carried into Tessera |
| --- | --- | --- |
| [Causeway](https://github.com/kai9987kai/Causeway) | Local evidence-to-experiment workbench linking source notes and assumptions to policy comparisons | Put the research question, assumptions, controls, and receipt format next to the simulation |
| [Universal Modder](https://github.com/rehan-remade/universal-modder) | Skills and tools for game reconnaissance, reverse engineering, asset creation, and in-game testing | Treat a transformed system as an object that should be tested through observable behavior |
| [REA](https://github.com/morluto/rea) | Agent-assisted reverse engineering from application behavior to native binaries | Prefer behavioral traces and inspection over opaque success scores |
| [Flipper Zero Periodic NTAG Emulator](https://github.com/djpiper28/Flipper-Zero-Periodic-NTAG-Emulator) | Small embedded-style periodic tag emulator | Keep a path open for finite-state, low-resource execution experiments, without claiming device interoperability here |
| [Quibble Builds](https://github.com/7coil/quibble-builds) | Proof-of-concept extensible Windows bootloader supporting alternate filesystems | Consider interfaces and instruction sets that can be extended while documenting their safety and maturity limits |
| [SVideo](https://github.com/7coil/svideo) | Video-to-Scratch conversion using sprite sheets to benefit from image compression | Treat representation and compression as computational choices that can change downstream usability |

## Latent research direction

Across these projects, repeated interests include modular computation, changing model or agent architectures, emergent behavior, local experimentation, intervention-based evidence, compact representation, and reproducible receipts. The portfolio already directly explores biological-style memory placement and transfer. Tessera therefore targets a different gap: the social and computational governance of reusable abstractions.

Its proposed mechanism is not merely to share code. A candidate fragment can change the public instruction set only after a configurable evidence gate. In the strongest arm, distinct single-founder lineages must rediscover it across task families; recombined descendants do not count. The finite-domain behavior is exhaustively enumerated, and the resulting opcode can later expire. The experiment asks whether that policy changes transfer, size, and population diversity.

## Portfolio gaps and limits

- Many provided projects already use seeded simulations and matched interventions; those are experimental foundations, not novelty claims.
- Program synthesis has mature prior art for function invention and reusable libraries; the novelty document treats this as a direct challenge.
- This first Tessera benchmark is small and hand-authored. It is not a substitute for the supplied model training, search-engine, agent, or real-device projects.
- The external tools and systems repositories informed the map only. This project does not modify, clone, or rely on them at runtime.
