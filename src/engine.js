export const ENGINE_VERSION = "0.2.0";
export const DOMAIN_SIZE = 16;
export const ACQUISITION_SUITE_ID = "tessera-four-bit-reused-motifs-v1";
export const TRANSFER_SUITE_ID = "tessera-composition-holdout-v1";
export const ARM_ORDER = ["closed", "fragments", "openOpcodes", "ratifiedOpcodes"];

export const ARM_LABELS = {
  closed: "Closed grammar",
  fragments: "Snippet relay",
  openOpcodes: "One-lineage opcodes",
  ratifiedOpcodes: "Ratified opcode commons"
};

const BASE_OPS = [
  { name: "xor", arity: 2 },
  { name: "and", arity: 2 },
  { name: "or", arity: 2 },
  { name: "add", arity: 2 },
  { name: "sub", arity: 2 },
  { name: "rol", arity: 1 },
  { name: "ror", arity: 1 },
  { name: "not", arity: 1 }
];

const HYPOTHESIS = "An instruction vocabulary acquired on one task set and admitted after independent rediscovery will improve equal-budget search on a frozen, structurally distinct task set without collapsing population diversity.";

export function createRng(seed) {
  let state = (Number(seed) >>> 0) || 0x9e3779b9;
  return function next() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

export function deriveSeed(seed, salt) {
  let x = ((Number(seed) >>> 0) ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x ^= Math.imul(((Number(salt) >>> 0) ^ 0x85ebca6b), 0x27d4eb2d);
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  return (x ^ (x >>> 15)) >>> 0;
}

function pick(rng, values) {
  return values[Math.floor(rng() * values.length)];
}

function varNode(name) {
  return { kind: "var", name: name };
}

function constNode(value) {
  return { kind: "const", value: value & 15 };
}

function opNode(op, args) {
  return { kind: "op", op: op, args: args };
}

function macroNode(id, args) {
  return { kind: "macro", id: id, args: args };
}

function cloneTree(node) {
  if (node.kind === "var") return varNode(node.name);
  if (node.kind === "const") return constNode(node.value);
  if (node.kind === "macro") {
    return macroNode(node.id, node.args.map(cloneTree));
  }
  return opNode(node.op, node.args.map(cloneTree));
}

function applyPrimitive(op, a, b) {
  switch (op) {
    case "xor": return (a ^ b) & 15;
    case "and": return (a & b) & 15;
    case "or": return (a | b) & 15;
    case "add": return (a + b) & 15;
    case "sub": return (a - b) & 15;
    case "rol": return ((a << 1) | (a >>> 3)) & 15;
    case "ror": return ((a >>> 1) | ((a & 1) << 3)) & 15;
    case "not": return (~a) & 15;
    default: throw new Error("Unknown primitive: " + op);
  }
}

function evalTree(node, x, y, macroMap) {
  if (node.kind === "var") return node.name === "x" ? x : y;
  if (node.kind === "const") return node.value;
  const values = node.args.map(function (arg) {
    return evalTree(arg, x, y, macroMap);
  });
  if (node.kind === "macro") {
    const macro = macroMap.get(node.id);
    if (!macro) throw new Error("Missing macro " + node.id);
    const index = (values[0] & 15) * DOMAIN_SIZE + (values[1] & 15);
    return parseInt(macro.table[index], 16);
  }
  return applyPrimitive(node.op, values[0], values[1]);
}

export function evaluate(tree, x, y, macros) {
  return evalTree(tree, x & 15, y & 15, macros || new Map());
}

function opArity(node) {
  if (node.kind === "macro") return 2;
  if (node.kind === "op") {
    const def = BASE_OPS.find(function (item) { return item.name === node.op; });
    return def ? def.arity : node.args.length;
  }
  return 0;
}

export function nodeCount(node) {
  if (!node || (node.kind !== "op" && node.kind !== "macro")) return 1;
  return 1 + node.args.reduce(function (sum, arg) {
    return sum + nodeCount(arg);
  }, 0);
}

function expandedNodeCount(node, macroMap, seen) {
  if (node.kind !== "macro") {
    if (!node.args) return 1;
    return 1 + node.args.reduce(function (sum, arg) {
      return sum + expandedNodeCount(arg, macroMap, seen);
    }, 0);
  }
  const macro = macroMap.get(node.id);
  if (!macro || seen.has(node.id)) return 1 + node.args.reduce(function (sum, arg) {
    return sum + expandedNodeCount(arg, macroMap, seen);
  }, 0);
  const nextSeen = new Set(seen);
  nextSeen.add(node.id);
  return 1 + node.args.reduce(function (sum, arg) {
    return sum + expandedNodeCount(arg, macroMap, seen);
  }, 0) + Math.max(0, macro.expandedSize - 1);
}

function serializeTree(node) {
  if (node.kind === "var") return node.name;
  if (node.kind === "const") return "#" + node.value.toString(16);
  const head = node.kind === "macro" ? "@" + node.id : node.op;
  return head + "(" + node.args.map(serializeTree).join(",") + ")";
}

function displayTree(node) {
  if (node.kind === "var") return node.name;
  if (node.kind === "const") return node.value.toString(16).toUpperCase();
  const label = node.kind === "macro" ? node.id : node.op;
  return label + "(" + node.args.map(displayTree).join(",") + ")";
}

function randomPrimitive(rng, activeMacros) {
  const choices = BASE_OPS.map(function (item) {
    return { kind: "primitive", name: item.name, arity: item.arity };
  });
  activeMacros.forEach(function (macro) {
    choices.push({ kind: "macro", id: macro.id, arity: 2 });
  });
  return pick(rng, choices);
}

function activeOpcodes(macroMap) {
  return Array.from(macroMap.values()).filter(function (macro) {
    return macro.active !== false;
  });
}

function randomExpr(rng, depth, activeMacros) {
  if (depth <= 0 || rng() < 0.27) {
    const terminal = Math.floor(rng() * 5);
    if (terminal === 0) return varNode("x");
    if (terminal === 1) return varNode("y");
    return constNode(Math.floor(rng() * DOMAIN_SIZE));
  }
  const choice = randomPrimitive(rng, activeMacros);
  const args = [];
  for (let i = 0; i < choice.arity; i += 1) {
    args.push(randomExpr(rng, depth - 1, activeMacros));
  }
  return choice.kind === "macro" ? macroNode(choice.id, args) : opNode(choice.name, args);
}

function pathsOf(node, path, output) {
  output.push(path);
  if (node.args) {
    node.args.forEach(function (arg, index) {
      pathsOf(arg, path.concat(index), output);
    });
  }
  return output;
}

function atPath(tree, path) {
  let current = tree;
  for (let i = 0; i < path.length; i += 1) current = current.args[path[i]];
  return current;
}

function replacePath(tree, path, replacement) {
  if (!path.length) return cloneTree(replacement);
  const result = cloneTree(tree);
  let parent = result;
  for (let i = 0; i < path.length - 1; i += 1) parent = parent.args[path[i]];
  parent.args[path[path.length - 1]] = cloneTree(replacement);
  return result;
}

function chooseProgram(rng, population) {
  let best = null;
  for (let i = 0; i < 3; i += 1) {
    const candidate = population[Math.floor(rng() * population.length)];
    if (!best || candidate.score > best.score) best = candidate;
  }
  return best;
}

function unionLineages(left, right) {
  return Array.from(new Set((left || []).concat(right || []))).sort();
}

function randomSnippet(rng, snippets) {
  if (!snippets.length) return null;
  return snippets[Math.floor(rng() * snippets.length)];
}

function mutateProgram(program, rng, activeMacros, snippets, allowSnippets, population, maxDepth) {
  let tree = cloneTree(program.tree);
  const roll = rng();
  if (population && population.length > 1 && roll < 0.13) {
    const donor = chooseProgram(rng, population);
    const donorPaths = pathsOf(donor.tree, [], []);
    const recipientPaths = pathsOf(tree, [], []);
    tree = replacePath(tree, pick(rng, recipientPaths), atPath(donor.tree, pick(rng, donorPaths)));
    program = { tree: tree, lineages: unionLineages(program.lineages, donor.lineages) };
  } else if (allowSnippets && snippets.length && roll < 0.31) {
    const snippet = randomSnippet(rng, snippets);
    const paths = pathsOf(tree, [], []);
    tree = replacePath(tree, pick(rng, paths), snippet.tree);
  } else {
    const paths = pathsOf(tree, [], []);
    const path = pick(rng, paths);
    const selected = atPath(tree, path);
    let replacement;
    const mode = rng();
    if ((selected.kind === "op" || selected.kind === "macro") && mode < 0.38) {
      const choices = randomPrimitive(rng, activeMacros);
      const arity = choices.arity;
      const oldArgs = selected.args.map(cloneTree);
      const args = oldArgs.slice(0, arity);
      while (args.length < arity) args.push(randomExpr(rng, Math.max(0, maxDepth - path.length - 1), activeMacros));
      replacement = choices.kind === "macro" ? macroNode(choices.id, args) : opNode(choices.name, args);
    } else if (selected.kind === "const" && mode < 0.82) {
      replacement = constNode(Math.floor(rng() * DOMAIN_SIZE));
    } else {
      replacement = randomExpr(rng, Math.max(0, Math.min(3, maxDepth - path.length)), activeMacros);
    }
    tree = replacePath(tree, path, replacement);
  }
  if (nodeCount(tree) > 55) {
    tree = cloneTree(program.tree);
  }
  return { tree: tree, lineages: program.lineages.slice() };
}

function makeKnot() {
  return opNode("xor", [
    varNode("x"),
    opNode("rol", [varNode("y")])
  ]);
}

function makeBraid() {
  return opNode("add", [makeKnot(), varNode("y")]);
}

export function makeTasks() {
  const knot = makeKnot();
  const braid = makeBraid();
  const addXY = opNode("add", [varNode("x"), varNode("y")]);
  const notX = opNode("not", [varNode("x")]);
  return [
    {
      id: "T-01",
      family: "wake",
      label: "Wake braid",
      target: opNode("rol", [cloneTree(braid)]),
      sharedMotif: "knot"
    },
    {
      id: "T-02",
      family: "mask",
      label: "Masked braid",
      target: opNode("xor", [cloneTree(braid), notX]),
      sharedMotif: "knot"
    },
    {
      id: "T-03",
      family: "turn",
      label: "Turning knot",
      target: opNode("and", [opNode("rol", [cloneTree(knot)]), addXY]),
      sharedMotif: "knot"
    },
    {
      id: "T-04",
      family: "braid",
      label: "Braid crossing",
      target: opNode("xor", [cloneTree(braid), cloneTree(knot)]),
      sharedMotif: "braid"
    },
    {
      id: "T-05",
      family: "cross",
      label: "Crossed braid",
      target: opNode("rol", [opNode("xor", [cloneTree(braid), cloneTree(knot)])]),
      sharedMotif: "braid"
    }
  ];
}

export function makeTransferTasks() {
  return [
    { id: "H-01", family: "masked-rotate", label: "Masked rotate", target: opNode("xor", [opNode("and", [varNode("x"), constNode(5)]), opNode("ror", [varNode("y")])]) },
    { id: "H-02", family: "reverse-mask", label: "Reverse mask", target: opNode("add", [opNode("ror", [varNode("x")]), opNode("and", [varNode("y"), constNode(12)])]) },
    { id: "H-03", family: "nested-complement", label: "Nested complement", target: opNode("not", [opNode("or", [opNode("xor", [varNode("x"), constNode(3)]), varNode("y")])]) },
    { id: "H-04", family: "rotated-subtract", label: "Rotated subtract", target: opNode("sub", [opNode("rol", [opNode("and", [varNode("x"), constNode(10)])]), opNode("xor", [varNode("y"), constNode(6)])]) },
    { id: "H-05", family: "complement-gate", label: "Complement gate", target: opNode("or", [opNode("add", [varNode("x"), constNode(7)]), opNode("ror", [opNode("not", [varNode("y")])])]) },
    { id: "H-06", family: "folded-xor", label: "Folded xor", target: opNode("and", [opNode("sub", [varNode("y"), varNode("x")]), opNode("xor", [opNode("rol", [varNode("y")]), constNode(9)])]) },
    { id: "H-07", family: "nested-carry", label: "Nested carry", target: opNode("xor", [opNode("or", [opNode("ror", [varNode("x")]), constNode(3)]), opNode("add", [opNode("and", [varNode("y"), constNode(12)]), varNode("x")])]) },
    { id: "H-08", family: "counter-rotate", label: "Counter rotate", target: opNode("add", [opNode("not", [opNode("rol", [opNode("xor", [varNode("x"), varNode("y")])])]), opNode("and", [opNode("ror", [varNode("y")]), constNode(10)])]) }
  ];
}

function shuffledTasks(seed, count) {
  const tasks = makeTasks();
  const rng = createRng(deriveSeed(seed, 0x5441534b));
  for (let i = tasks.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = tasks[i];
    tasks[i] = tasks[j];
    tasks[j] = tmp;
  }
  const output = [];
  for (let i = 0; i < count; i += 1) output.push(tasks[i % tasks.length]);
  return output;
}

function trainingExamples(seed, count, task, macros) {
  const pairs = [];
  for (let x = 0; x < DOMAIN_SIZE; x += 1) {
    for (let y = 0; y < DOMAIN_SIZE; y += 1) pairs.push([x, y]);
  }
  const rng = createRng(deriveSeed(seed, 0x4558414d));
  for (let i = pairs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = pairs[i];
    pairs[i] = pairs[j];
    pairs[j] = tmp;
  }
  return pairs.slice(0, Math.max(1, Math.min(count, pairs.length))).map(function (pair) {
    return {
      x: pair[0],
      y: pair[1],
      value: evaluate(task.target, pair[0], pair[1], macros)
    };
  });
}

function scoreTree(tree, examples, macroMap) {
  let correct = 0;
  let matchingBits = 0;
  for (let i = 0; i < examples.length; i += 1) {
    const output = evaluate(tree, examples[i].x, examples[i].y, macroMap);
    const expected = examples[i].value;
    if (output === expected) correct += 1;
    const difference = (output ^ expected) & 15;
    matchingBits += 4 -
      ((difference >> 0) & 1) -
      ((difference >> 1) & 1) -
      ((difference >> 2) & 1) -
      ((difference >> 3) & 1);
  }
  const accuracy = correct / examples.length;
  const bitAccuracy = matchingBits / (4 * examples.length);
  const size = nodeCount(tree);
  return {
    correct: correct,
    accuracy: accuracy,
    bitAccuracy: bitAccuracy,
    score: accuracy + 0.25 * bitAccuracy - 0.0015 * size,
    size: size
  };
}

function randomPopulation(seed, config) {
  const rng = createRng(deriveSeed(seed, 0x504f5055));
  const population = [];
  for (let i = 0; i < config.population; i += 1) {
    population.push({
      tree: randomExpr(rng, 2 + Math.floor(rng() * config.maxDepth), []),
      lineages: ["L" + String(i + 1).padStart(3, "0")]
    });
  }
  return population;
}

function tableFor(tree, macroMap) {
  let output = "";
  for (let x = 0; x < DOMAIN_SIZE; x += 1) {
    for (let y = 0; y < DOMAIN_SIZE; y += 1) {
      output += evaluate(tree, x, y, macroMap).toString(16);
    }
  }
  return output;
}

function hashText(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function exactCertificate(tree, macroMap) {
  const signature = tableFor(tree, macroMap);
  if (signature.length !== DOMAIN_SIZE * DOMAIN_SIZE) {
    throw new Error("Finite-domain certificate has an invalid sample count.");
  }
  for (let x = 0; x < DOMAIN_SIZE; x += 1) {
    for (let y = 0; y < DOMAIN_SIZE; y += 1) {
      const index = x * DOMAIN_SIZE + y;
      if (parseInt(signature[index], 16) !== evaluate(tree, x, y, macroMap)) {
        throw new Error("Exhaustive opcode certificate failed.");
      }
    }
  }
  return {
    domain: DOMAIN_SIZE,
    samples: DOMAIN_SIZE * DOMAIN_SIZE,
    signature: signature,
    digest: hashText(signature),
    method: "exhaustive-uint4-pairs-v1"
  };
}

function collectSubtrees(tree, path, result) {
  if (nodeCount(tree) >= 3) result.push({ tree: cloneTree(tree), path: path.slice() });
  if (tree.args) {
    tree.args.forEach(function (arg, index) {
      collectSubtrees(arg, path.concat(index), result);
    });
  }
  return result;
}

function opcodeUseCounts(population, activeMacros) {
  const counts = new Map();
  activeMacros.forEach(function (macro) { counts.set(macro.id, new Set()); });
  function visit(node, lineage) {
    if (node.kind === "macro" && counts.has(node.id)) {
      counts.get(node.id).add(lineage);
    }
    if (node.args) node.args.forEach(function (arg) { visit(arg, lineage); });
  }
  population.forEach(function (individual) {
    const bestLineage = individual.lineages.join("+");
    visit(individual.tree, bestLineage);
  });
  return counts;
}

function diversity(population) {
  const distinct = new Set(population.map(function (individual) {
    return serializeTree(individual.tree);
  }));
  return distinct.size / Math.max(1, population.length);
}

function mineCommons(policy, population, macroMap, evidence, snippets, epoch, task, eventLog, nextMacroNumber) {
  if (policy === "closed") return nextMacroNumber;
  const eligible = policy === "ratifiedOpcodes" ?
    population.filter(function (individual) { return individual.lineages.length === 1; }) :
    population;
  const leaders = eligible.slice(0, Math.min(8, eligible.length));
  const snippetSeen = new Set();
  leaders.forEach(function (individual) {
    collectSubtrees(individual.tree, [], []).forEach(function (candidate) {
      const serialization = serializeTree(candidate.tree);
      if (snippetSeen.has(serialization)) return;
      snippetSeen.add(serialization);
      if (policy === "fragments") {
        if (nodeCount(candidate.tree) >= 3 && snippets.length < 48) {
          snippets.push({
            tree: cloneTree(candidate.tree),
            id: "S" + String(snippets.length + 1).padStart(3, "0"),
            lastUsedEpoch: epoch
          });
        }
        return;
      }
      const cert = exactCertificate(candidate.tree, macroMap);
      const key = cert.signature;
      let item = evidence.get(key);
      if (!item) {
        item = {
          signature: key,
          digest: cert.digest,
          certificate: cert,
          lineages: new Set(),
          independentLineages: new Set(),
          families: new Set(),
          representative: cloneTree(candidate.tree),
          size: nodeCount(candidate.tree),
          appearances: 0
        };
        evidence.set(key, item);
      }
      item.appearances += 1;
      item.lastSeenEpoch = epoch;
      item.families.add(task.family);
      individual.lineages.forEach(function (lineage) { item.lineages.add(lineage); });
      if (individual.lineages.length === 1) {
        item.independentLineages.add(individual.lineages[0]);
      }
      if (nodeCount(candidate.tree) < item.size) {
        item.size = nodeCount(candidate.tree);
        item.representative = cloneTree(candidate.tree);
      }
    });
  });

  if (policy !== "openOpcodes" && policy !== "ratifiedOpcodes") {
    return nextMacroNumber;
  }

  const alreadyKnown = new Set();
  activeOpcodes(macroMap).forEach(function (macro) { alreadyKnown.add(macro.table); });
  const observedNow = Array.from(evidence.values()).filter(function (item) {
    return item.lastSeenEpoch === epoch && !alreadyKnown.has(item.signature);
  });
  const candidates = observedNow.filter(function (item) {
    if (policy === "openOpcodes") return item.lineages.size >= 1 && item.families.size >= 1;
    return item.independentLineages.size >= 2 && item.families.size >= 2;
  }).sort(function (a, b) {
    if (b.independentLineages.size !== a.independentLineages.size) {
      return b.independentLineages.size - a.independentLineages.size;
    }
    if (b.lineages.size !== a.lineages.size) return b.lineages.size - a.lineages.size;
    if (b.families.size !== a.families.size) return b.families.size - a.families.size;
    return a.size - b.size;
  });
  eventLog.push({
    type: "opcode-gate-survey",
    epoch: epoch,
    taskId: task.id,
    arm: policy,
    candidateFunctions: observedNow.length,
    gatePassedFunctions: candidates.length,
    bestIndependentLineageSupport: observedNow.reduce(function (max, item) {
      return Math.max(max, item.independentLineages.size);
    }, 0),
    bestTaskFamilySupport: observedNow.reduce(function (max, item) {
      return Math.max(max, item.families.size);
    }, 0),
    publishLimit: 3,
    admission: policy
  });

  candidates.slice(0, 3).forEach(function (candidate) {
    const id = "OP" + String(nextMacroNumber).padStart(3, "0");
    nextMacroNumber += 1;
    const macro = {
      id: id,
      table: candidate.signature,
      digest: candidate.digest,
      certificate: candidate.certificate,
      body: displayTree(candidate.representative),
      expandedSize: candidate.size,
      bornEpoch: epoch,
      unusedEpochs: 0,
      totalUses: 0,
      lineageSupport: candidate.lineages.size,
      independentLineageSupport: candidate.independentLineages.size,
      familySupport: candidate.families.size,
      active: true
    };
    macroMap.set(id, macro);
    alreadyKnown.add(macro.table);
    eventLog.push({
      type: "opcode-published",
      epoch: epoch,
      taskId: task.id,
      id: id,
      digest: macro.digest,
      body: macro.body,
      samples: macro.certificate.samples,
      lineageSupport: macro.lineageSupport,
      independentLineages: macro.independentLineageSupport,
      taskFamilies: macro.familySupport,
      admission: policy
    });
  });
  return nextMacroNumber;
}

function removeExpiredMacros(policy, macroMap, useCounts, epoch, eventLog) {
  if (policy !== "openOpcodes" && policy !== "ratifiedOpcodes") return;
  Array.from(macroMap.entries()).forEach(function (entry) {
    const macro = entry[1];
    if (macro.active === false) return;
    if (macro.bornEpoch >= epoch) return;
    const used = useCounts.get(macro.id);
    const useCount = used ? used.size : 0;
    if (useCount > 0) {
      macro.unusedEpochs = 0;
      macro.totalUses += useCount;
    } else {
      macro.unusedEpochs += 1;
    }
    if (macro.unusedEpochs >= 2) {
      macro.active = false;
      eventLog.push({
        type: "opcode-expired",
        epoch: epoch,
        id: macro.id,
        digest: macro.digest,
        totalUses: macro.totalUses
      });
    }
  });
}

function initialPopulation(seed, config) {
  return randomPopulation(seed, config);
}

function evolveEpoch(state, task, config, seed, epoch, eventLog) {
  const taskSeed = deriveSeed(seed, 0x1000 + epoch);
  const examples = trainingExamples(taskSeed, config.examplesPerTask, task, state.macroMap);
  const rng = createRng(deriveSeed(seed, 0x4000 + epoch));
  let population = state.population;
  const macroCountAtStart = activeOpcodes(state.macroMap).length;
  let firstPerfectGeneration = null;
  let best = null;
  let bestGeneration = 0;
  const founderCandidates = new Map();

  for (let generation = 0; generation < config.generations; generation += 1) {
    const scored = population.map(function (individual) {
      const result = scoreTree(individual.tree, examples, state.macroMap);
      return {
        tree: individual.tree,
        lineages: individual.lineages,
        score: result.score,
        accuracy: result.accuracy,
        size: result.size
      };
    }).sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.size - b.size;
    });
    population = scored;
    population.forEach(function (individual) {
      if (individual.lineages.length !== 1) return;
      const founder = individual.lineages[0];
      const previous = founderCandidates.get(founder);
      if (!previous || individual.score > previous.score) {
        founderCandidates.set(founder, {
          tree: cloneTree(individual.tree),
          lineages: individual.lineages.slice(),
          score: individual.score,
          accuracy: individual.accuracy,
          size: individual.size
        });
      }
    });
    if (!best || population[0].score > best.score) {
      best = population[0];
      bestGeneration = generation + 1;
    }
    if (population[0].accuracy === 1 && firstPerfectGeneration === null) {
      const exact = exactCertificate(population[0].tree, state.macroMap);
      if (exact.signature === tableFor(task.target, state.macroMap)) {
        firstPerfectGeneration = generation + 1;
      }
    }
    if (generation + 1 === config.generations) break;
    const eliteCount = Math.max(2, Math.floor(config.population * 0.08));
    const next = population.slice(0, eliteCount).map(function (individual) {
      return { tree: cloneTree(individual.tree), lineages: individual.lineages.slice() };
    });
    while (next.length < config.population) {
      const parent = chooseProgram(rng, population);
      next.push(mutateProgram(
        parent,
        rng,
        activeOpcodes(state.macroMap),
        state.snippets,
        state.policy === "fragments",
        population,
        config.maxDepth
      ));
    }
    population = next;
  }

  const finalScored = population.map(function (individual) {
    const result = scoreTree(individual.tree, examples, state.macroMap);
    return {
      tree: individual.tree,
      lineages: individual.lineages,
      score: result.score,
      accuracy: result.accuracy,
      size: result.size
    };
  }).sort(function (a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return a.size - b.size;
  });
  state.population = finalScored;
  const leader = finalScored[0];
  const targetSignature = tableFor(task.target, state.macroMap);
  const leaderSignature = tableFor(leader.tree, state.macroMap);
  let exactMatches = 0;
  for (let i = 0; i < targetSignature.length; i += 1) {
    if (targetSignature[i] === leaderSignature[i]) exactMatches += 1;
  }
  const useCounts = opcodeUseCounts(finalScored.slice(0, 8), activeOpcodes(state.macroMap));
  useCounts.forEach(function (lineages, id) {
    const macro = state.macroMap.get(id);
    if (macro) macro.epochUses = lineages.size;
  });
  const epochRecord = {
    epoch: epoch,
    taskId: task.id,
    family: task.family,
    taskLabel: task.label,
    target: displayTree(task.target),
    trainingPairs: examples.map(function (example) {
      return [example.x, example.y];
    }),
    trainAccuracy: leader.accuracy,
    heldoutAccuracy: exactMatches / (DOMAIN_SIZE * DOMAIN_SIZE),
    generationsToExact: firstPerfectGeneration,
    bestGeneration: bestGeneration,
    effectiveSize: leader.size,
    expandedSize: expandedNodeCount(leader.tree, state.macroMap, new Set()),
    populationDiversity: diversity(finalScored),
    activeOpcodeCount: macroCountAtStart,
    opcodeCountAtStart: macroCountAtStart,
    adoptedOpcodeLineages: Array.from(useCounts.values()).reduce(function (sum, values) {
      return sum + values.size;
    }, 0),
    program: displayTree(leader.tree),
    lineageCount: leader.lineages.length
  };
  state.epochRecords.push(epochRecord);
  eventLog.push({
    type: "task-scored",
    epoch: epoch,
    taskId: task.id,
    arm: state.policy,
    trainAccuracy: epochRecord.trainAccuracy,
    heldoutAccuracy: epochRecord.heldoutAccuracy,
    program: epochRecord.program
  });

  const familyTask = task;
  state.nextMacroNumber = mineCommons(
    state.policy,
    state.policy === "ratifiedOpcodes" ?
      Array.from(founderCandidates.values()).sort(function (a, b) { return b.score - a.score; }) :
      finalScored,
    state.macroMap,
    state.evidence,
    state.snippets,
    epoch,
    familyTask,
    eventLog,
    state.nextMacroNumber
  );
  removeExpiredMacros(state.policy, state.macroMap, useCounts, epoch, eventLog);
  if (state.policy === "fragments") {
    state.snippets = state.snippets.slice(-48);
  }
}

function evolveTransferTask(sourceState, seed, config, task, taskIndex, eventLog) {
  const populationSeed = deriveSeed(seed, 0x7100 + taskIndex);
  const exampleSeed = deriveSeed(seed, 0x7200 + taskIndex);
  const searchSeed = deriveSeed(seed, 0x7300 + taskIndex);
  const macroMap = new Map(Array.from(sourceState.macroMap.entries()).map(function (entry) {
    return [entry[0], Object.assign({}, entry[1])];
  }));
  const snippets = sourceState.snippets.map(function (snippet) {
    return Object.assign({}, snippet, { tree: cloneTree(snippet.tree) });
  });
  const availableOpcodes = activeOpcodes(macroMap);
  const examples = trainingExamples(exampleSeed, config.examplesPerTask, task, macroMap);
  const initial = initialPopulation(populationSeed, config);
  const initialPopulationDigest = hashText(initial.map(function (individual) {
    return serializeTree(individual.tree);
  }).join("|"));
  const rng = createRng(searchSeed);
  let population = initial;
  let firstPerfectGeneration = null;
  let bestGeneration = 0;
  let bestScore = -Infinity;
  const targetSignature = tableFor(task.target, macroMap);

  eventLog.push({
    type: "transfer-task-started",
    phase: "transfer",
    taskId: task.id,
    taskFamily: task.family,
    availableOpcodeIds: availableOpcodes.map(function (macro) { return macro.id; }),
    snippetCount: snippets.length,
    populationSize: config.population,
    generations: config.generations,
    initialPopulationDigest: initialPopulationDigest,
    exampleSeed: exampleSeed
  });

  for (let generation = 0; generation < config.generations; generation += 1) {
    population = population.map(function (individual) {
      const result = scoreTree(individual.tree, examples, macroMap);
      return {
        tree: individual.tree,
        lineages: individual.lineages,
        score: result.score,
        accuracy: result.accuracy,
        size: result.size
      };
    }).sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.size - b.size;
    });
    if (population[0].score > bestScore) {
      bestScore = population[0].score;
      bestGeneration = generation + 1;
    }
    if (population[0].accuracy === 1 && firstPerfectGeneration === null) {
      const exact = exactCertificate(population[0].tree, macroMap);
      if (exact.signature === targetSignature) firstPerfectGeneration = generation + 1;
    }
    if (generation + 1 === config.generations) break;
    const eliteCount = Math.max(2, Math.floor(config.population * 0.08));
    const next = population.slice(0, eliteCount).map(function (individual) {
      return { tree: cloneTree(individual.tree), lineages: individual.lineages.slice() };
    });
    while (next.length < config.population) {
      next.push(mutateProgram(
        chooseProgram(rng, population),
        rng,
        availableOpcodes,
        snippets,
        sourceState.policy === "fragments",
        population,
        config.maxDepth
      ));
    }
    population = next;
  }

  const finalScored = population.map(function (individual) {
    const result = scoreTree(individual.tree, examples, macroMap);
    return {
      tree: individual.tree,
      lineages: individual.lineages,
      score: result.score,
      accuracy: result.accuracy,
      size: result.size
    };
  }).sort(function (a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return a.size - b.size;
  });
  const leader = finalScored[0];
  const leaderSignature = tableFor(leader.tree, macroMap);
  let exactMatches = 0;
  for (let i = 0; i < targetSignature.length; i += 1) {
    if (targetSignature[i] === leaderSignature[i]) exactMatches += 1;
  }
  const useCounts = opcodeUseCounts(finalScored.slice(0, 8), availableOpcodes);
  const record = {
    taskId: task.id,
    family: task.family,
    taskLabel: task.label,
    target: displayTree(task.target),
    targetSignature: targetSignature,
    trainingPairs: examples.map(function (example) { return [example.x, example.y]; }),
    trainAccuracy: leader.accuracy,
    exactAccuracy: exactMatches / (DOMAIN_SIZE * DOMAIN_SIZE),
    generationsToExact: firstPerfectGeneration,
    bestGeneration: bestGeneration,
    effectiveSize: leader.size,
    expandedSize: expandedNodeCount(leader.tree, macroMap, new Set()),
    populationDiversity: diversity(finalScored),
    activeOpcodeCount: availableOpcodes.length,
    activeOpcodeIds: availableOpcodes.map(function (macro) { return macro.id; }),
    snippetCount: snippets.length,
    adoptedOpcodeLineages: Array.from(useCounts.values()).reduce(function (sum, values) {
      return sum + values.size;
    }, 0),
    program: displayTree(leader.tree),
    lineageCount: leader.lineages.length,
    populationSize: config.population,
    generations: config.generations,
    initialPopulationDigest: initialPopulationDigest
  };
  eventLog.push({
    type: "transfer-task-scored",
    phase: "transfer",
    taskId: task.id,
    taskFamily: task.family,
    trainAccuracy: record.trainAccuracy,
    exactAccuracy: record.exactAccuracy,
    generationsToExact: record.generationsToExact,
    activeOpcodeCount: record.activeOpcodeCount,
    initialPopulationDigest: record.initialPopulationDigest
  });
  return record;
}

function armPolicy(policy, seed, config, tasks, transferTasks, onTransferProgress) {
  const state = {
    policy: policy,
    population: initialPopulation(seed, config),
    macroMap: new Map(),
    snippets: [],
    evidence: new Map(),
    epochRecords: [],
    nextMacroNumber: 1
  };
  const events = [{
    type: "population-initialized",
    arm: policy,
    seed: seed,
    population: config.population,
    taskSchedule: tasks.map(function (task) { return task.id; })
  }];
  tasks.forEach(function (task, index) {
    evolveEpoch(state, task, config, seed, index + 1, events);
  });
  const transfer = transferTasks.map(function (task, index) {
    const result = evolveTransferTask(state, seed, config, task, index + 1, events);
    if (typeof onTransferProgress === "function") onTransferProgress(task, index + 1);
    return result;
  });
  return {
    seed: seed,
    arm: policy,
    label: ARM_LABELS[policy],
    epochs: state.epochRecords,
    transfer: transfer,
    finalOpcodes: activeOpcodes(state.macroMap).map(function (macro) {
      return {
        id: macro.id,
        digest: macro.digest,
        body: macro.body,
        expandedSize: macro.expandedSize,
        bornEpoch: macro.bornEpoch,
        totalUses: macro.totalUses,
        lineageSupport: macro.lineageSupport,
        independentLineageSupport: macro.independentLineageSupport,
        familySupport: macro.familySupport,
        certificate: macro.certificate
      };
    }),
    events: events
  };
}

function policySalt(policy) {
  const salts = {
    closed: 0x434c4f53,
    fragments: 0x46524147,
    openOpcodes: 0x4f50454e,
    ratifiedOpcodes: 0x52415449
  };
  return salts[policy] || 1;
}

export function defaultConfig() {
  return {
    replicates: 6,
    startSeed: 41721,
    population: 32,
    generations: 18,
    epochs: 5,
    examplesPerTask: 24,
    maxDepth: 4,
    arms: ARM_ORDER.slice(),
    transferSuiteId: TRANSFER_SUITE_ID
  };
}

export function normalizeConfig(input) {
  const base = defaultConfig();
  const value = Object.assign({}, base, input || {});
  value.replicates = Math.max(2, Math.min(32, Math.floor(Number(value.replicates) || base.replicates)));
  value.startSeed = Number(value.startSeed) >>> 0;
  value.population = Math.max(16, Math.min(120, Math.floor(Number(value.population) || base.population)));
  value.generations = Math.max(4, Math.min(80, Math.floor(Number(value.generations) || base.generations)));
  value.epochs = Math.max(2, Math.min(5, Math.floor(Number(value.epochs) || base.epochs)));
  value.examplesPerTask = Math.max(8, Math.min(128, Math.floor(Number(value.examplesPerTask) || base.examplesPerTask)));
  value.maxDepth = Math.max(2, Math.min(6, Math.floor(Number(value.maxDepth) || base.maxDepth)));
  value.transferSuiteId = TRANSFER_SUITE_ID;
  value.arms = Array.from(new Set((Array.isArray(value.arms) ? value.arms : base.arms).filter(function (arm) {
    return ARM_ORDER.includes(arm);
  })));
  if (value.arms.length < 2) throw new Error("Select at least two experiment arms.");
  return value;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
}

function bootstrapCI(values, seed, repetitions) {
  if (!values.length) return { low: 0, high: 0, method: "paired-seed-percentile-bootstrap-v1", samples: 0 };
  const rng = createRng(seed);
  const estimates = [];
  for (let b = 0; b < repetitions; b += 1) {
    let total = 0;
    for (let i = 0; i < values.length; i += 1) {
      total += values[Math.floor(rng() * values.length)];
    }
    estimates.push(total / values.length);
  }
  estimates.sort(function (a, b) { return a - b; });
  return {
    low: estimates[Math.floor((repetitions - 1) * 0.025)],
    high: estimates[Math.floor((repetitions - 1) * 0.975)],
    method: "paired-seed-percentile-bootstrap-v1",
    samples: values.length,
    repetitions: repetitions
  };
}

export function summarizeStudy(trials, seed) {
  const armSummaries = {};
  ARM_ORDER.forEach(function (arm) {
    const rows = trials.filter(function (trial) { return trial.arm === arm; });
    if (!rows.length) return;
    const scores = rows.map(function (trial) {
      return mean(trial.epochs.map(function (epoch) { return epoch.heldoutAccuracy; }));
    });
    const accuracyPerTask = [];
    const maxEpochs = rows[0].epochs.length;
    for (let i = 0; i < maxEpochs; i += 1) {
      accuracyPerTask.push(mean(rows.map(function (trial) { return trial.epochs[i].heldoutAccuracy; })));
    }
    const opCount = rows.map(function (trial) { return trial.finalOpcodes.length; });
    const diversity = rows.map(function (trial) {
      return mean(trial.epochs.map(function (epoch) { return epoch.populationDiversity; }));
    });
    const size = rows.map(function (trial) {
      return mean(trial.epochs.map(function (epoch) { return epoch.effectiveSize; }));
    });
    const adoption = rows.map(function (trial) {
      return mean(trial.epochs.map(function (epoch) { return epoch.adoptedOpcodeLineages; }));
    });
    const transferScores = rows.map(function (trial) {
      return mean(trial.transfer.map(function (task) { return task.exactAccuracy; }));
    });
    const transferTaskCount = rows[0].transfer.length;
    const transferAccuracyByTask = [];
    for (let i = 0; i < transferTaskCount; i += 1) {
      transferAccuracyByTask.push(mean(rows.map(function (trial) {
        return trial.transfer[i].exactAccuracy;
      })));
    }
    const transferSizes = rows.map(function (trial) {
      return mean(trial.transfer.map(function (task) { return task.effectiveSize; }));
    });
    const transferExactRates = rows.map(function (trial) {
      return trial.transfer.filter(function (task) { return task.exactAccuracy === 1; }).length /
        Math.max(1, trial.transfer.length);
    });
    armSummaries[arm] = {
      label: ARM_LABELS[arm],
      replicates: rows.length,
      meanHeldoutAccuracy: mean(scores),
      accuracyByEpoch: accuracyPerTask,
      meanTransferAccuracy: mean(transferScores),
      transferAccuracyByTask: transferAccuracyByTask,
      meanTransferEffectiveProgramSize: mean(transferSizes),
      meanTransferExactTaskRate: mean(transferExactRates),
      meanActiveOpcodesAtEnd: mean(opCount),
      meanPopulationDiversity: mean(diversity),
      meanEffectiveProgramSize: mean(size),
      meanOpcodeAdoptionLineages: mean(adoption),
      replicateScores: scores,
      transferReplicateScores: transferScores
    };
  });
  const reference = "closed";
  const comparisons = {};
  const transferComparisons = {};
  ARM_ORDER.forEach(function (arm) {
    if (arm === reference || !armSummaries[arm] || !armSummaries[reference]) return;
    const armRows = trials.filter(function (trial) { return trial.arm === arm; });
    const refRows = trials.filter(function (trial) { return trial.arm === reference; });
    const differences = armRows.map(function (trial) {
      const ref = refRows.find(function (row) { return row.seed === trial.seed; });
      const a = mean(trial.epochs.map(function (epoch) { return epoch.heldoutAccuracy; }));
      const b = ref ? mean(ref.epochs.map(function (epoch) { return epoch.heldoutAccuracy; })) : 0;
      return a - b;
    });
    comparisons[arm] = {
      versus: reference,
      meanPairedDifference: mean(differences),
      interval: bootstrapCI(differences, deriveSeed(seed, policySalt(arm)), 1000),
      differences: differences
    };
    const transferDifferences = armRows.map(function (trial) {
      const ref = refRows.find(function (row) { return row.seed === trial.seed; });
      const a = mean(trial.transfer.map(function (task) { return task.exactAccuracy; }));
      const b = ref ? mean(ref.transfer.map(function (task) { return task.exactAccuracy; })) : 0;
      return a - b;
    });
    transferComparisons[arm] = {
      versus: reference,
      meanPairedDifference: mean(transferDifferences),
      interval: bootstrapCI(transferDifferences, deriveSeed(seed, policySalt(arm) ^ 0x5452414e), 1000),
      differences: transferDifferences
    };
  });
  return { arms: armSummaries, comparisons: comparisons, transferComparisons: transferComparisons };
}

function protocolDigest(config) {
  const text = JSON.stringify({ engineVersion: ENGINE_VERSION, transferSuite: TRANSFER_SUITE_ID, config: config });
  return hashText(text).toUpperCase();
}

export function runStudy(inputConfig, onProgress) {
  const startedAt = Date.now();
  const config = normalizeConfig(inputConfig);
  const trials = [];
  const actionLog = [];
  const transferTasks = makeTransferTasks();
  const total = config.replicates * config.arms.length;
  let completed = 0;
  for (let replicate = 0; replicate < config.replicates; replicate += 1) {
    const seed = deriveSeed(config.startSeed, replicate + 1);
    const tasks = shuffledTasks(seed, config.epochs);
    actionLog.push({
      type: "paired-seed-opened",
      replicate: replicate + 1,
      seed: seed,
      tasks: tasks.map(function (task) { return task.id; }),
      transferSuiteId: TRANSFER_SUITE_ID,
      transferTasks: transferTasks.map(function (task) { return task.id; })
    });
    config.arms.forEach(function (arm) {
      const trial = armPolicy(arm, seed, config, tasks, transferTasks, function (task, transferIndex) {
        if (typeof onProgress !== "function") return;
        onProgress({
          stage: "transfer",
          completed: completed,
          total: total,
          replicate: replicate + 1,
          replicateCount: config.replicates,
          arm: arm,
          label: ARM_LABELS[arm],
          transferTaskId: task.id,
          transferTaskIndex: transferIndex,
          transferTaskCount: transferTasks.length
        });
      });
      trials.push(trial);
      completed += 1;
      if (typeof onProgress === "function") {
        onProgress({
          completed: completed,
          total: total,
          replicate: replicate + 1,
          replicateCount: config.replicates,
          arm: arm,
          label: ARM_LABELS[arm],
          stage: "complete"
        });
      }
    });
  }
  const summary = summarizeStudy(trials, config.startSeed);
  const timestamp = new Date().toISOString();
  const experimentId = "TESSERA-" + timestamp.replace(/[-:.TZ]/g, "").slice(0, 14) + "-" + protocolDigest(config);
  const totalPublished = trials.reduce(function (sum, trial) {
    return sum + trial.events.filter(function (event) { return event.type === "opcode-published"; }).length;
  }, 0);
  const ratifiedPublished = trials.reduce(function (sum, trial) {
    return sum + (trial.arm === "ratifiedOpcodes" ?
      trial.events.filter(function (event) { return event.type === "opcode-published"; }).length :
      0);
  }, 0);
  const gateSurveys = trials.flatMap(function (trial) {
    return trial.events.filter(function (event) {
      return event.type === "opcode-gate-survey";
    });
  });
  const actionTypes = trials.reduce(function (sum, trial) {
    return sum.concat(trial.events.map(function (event) { return event.type; }));
  }, []);
  return {
    schema: "tessera-study-v2",
    engineVersion: ENGINE_VERSION,
    experimentId: experimentId,
    timestamp: timestamp,
    runtimeMs: Date.now() - startedAt,
    hypothesis: HYPOTHESIS,
    config: config,
    benchmark: {
      acquisitionSuiteId: ACQUISITION_SUITE_ID,
      acquisitionTasks: makeTasks().map(inspectTask),
      transferSuiteId: TRANSFER_SUITE_ID,
      transferTasks: transferTasks.map(inspectTask)
    },
    actions: actionLog,
    observations: {
      trialCount: trials.length,
      pairedSeedCount: config.replicates,
      taskFamilyCount: makeTasks().length,
      transferSuiteId: TRANSFER_SUITE_ID,
      transferTaskCount: transferTasks.length,
      transferTaskRunCount: trials.reduce(function (sum, trial) { return sum + trial.transfer.length; }, 0),
      opcodePublicationCount: totalPublished,
      ratifiedOpcodePublicationCount: ratifiedPublished,
      opcodeGateSurveyCount: gateSurveys.length,
      gateCandidateFunctionCount: gateSurveys.reduce(function (sum, event) {
        return sum + event.candidateFunctions;
      }, 0),
      gatePassedFunctionCount: gateSurveys.reduce(function (sum, event) {
        return sum + event.gatePassedFunctions;
      }, 0),
      actionCounts: actionTypes.reduce(function (counts, type) {
        counts[type] = (counts[type] || 0) + 1;
        return counts;
      }, {})
    },
    metrics: summary,
    trials: trials,
    failures: [],
    mutations: trials.flatMap(function (trial) {
      return trial.events.filter(function (event) {
        return event.type === "opcode-published" || event.type === "opcode-expired";
      }).map(function (event) {
        return Object.assign({ seed: trial.seed, arm: trial.arm }, event);
      });
    }),
    conclusions: {
      status: "descriptive-synthetic-experiment",
      note: "Compare the frozen unseen-composition score across paired seeds. The transfer phase starts fresh matched populations and freezes learned vocabularies; results remain specific to this synthetic task suite and compute budget.",
      mechanismInstantiated: ratifiedPublished > 0
    }
  };
}

export function csvForStudy(study) {
  const header = [
    "experiment_id", "phase", "seed", "arm", "epoch", "task_id", "task_family",
    "train_accuracy", "full_table_exact_accuracy", "generations_to_exact",
    "effective_program_size", "expanded_program_size", "population_diversity",
    "active_opcode_count", "adopted_opcode_lineages", "best_program"
  ];
  const lines = [header.join(",")];
  study.trials.forEach(function (trial) {
    trial.epochs.forEach(function (epoch) {
      const cells = [
        study.experimentId, "acquisition", trial.seed, trial.arm, epoch.epoch, epoch.taskId,
        epoch.family, epoch.trainAccuracy, epoch.heldoutAccuracy,
        epoch.generationsToExact === null ? "" : epoch.generationsToExact,
        epoch.effectiveSize, epoch.expandedSize, epoch.populationDiversity,
        epoch.activeOpcodeCount, epoch.adoptedOpcodeLineages, epoch.program
      ];
      lines.push(cells.map(function (cell) {
        const text = String(cell === undefined || cell === null ? "" : cell);
        return "\"" + text.replace(/"/g, "\"\"") + "\"";
      }).join(","));
    });
    (Array.isArray(trial.transfer) ? trial.transfer : []).forEach(function (task, index) {
      const cells = [
        study.experimentId, "transfer", trial.seed, trial.arm, index + 1, task.taskId,
        task.family, task.trainAccuracy, task.exactAccuracy,
        task.generationsToExact === null ? "" : task.generationsToExact,
        task.effectiveSize, task.expandedSize, task.populationDiversity,
        task.activeOpcodeCount, task.adoptedOpcodeLineages, task.program
      ];
      lines.push(cells.map(function (cell) {
        const text = String(cell === undefined || cell === null ? "" : cell);
        return "\"" + text.replace(/\"/g, "\"\"") + "\"";
      }).join(","));
    });
  });
  return lines.join("\r\n");
}

export function experimentHypothesis() {
  return HYPOTHESIS;
}

export function inspectTask(task) {
  return {
    id: task.id,
    family: task.family,
    label: task.label,
    target: displayTree(task.target),
    signature: tableFor(task.target, new Map())
  };
}
