import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ARM_ORDER,
  TRANSFER_SUITE_ID,
  createRng,
  defaultConfig,
  deriveSeed,
  evaluate,
  inspectTask,
  makeTasks,
  makeTransferTasks,
  normalizeConfig,
  runStudy
} from "../src/engine.js";
import { csvForStudy } from "../src/engine.js";

test("seeded random streams and seed derivation are deterministic", function () {
  const first = createRng(71);
  const second = createRng(71);
  assert.deepEqual(Array.from({ length: 12 }, first), Array.from({ length: 12 }, second));
  assert.equal(deriveSeed(8, 9), deriveSeed(8, 9));
  assert.notEqual(deriveSeed(8, 9), deriveSeed(9, 8));
});

test("the benchmark exposes five finite transformation tasks", function () {
  const tasks = makeTasks();
  assert.equal(tasks.length, 5);
  assert.deepEqual(tasks.map(function (task) { return task.id; }), ["T-01", "T-02", "T-03", "T-04", "T-05"]);
  tasks.forEach(function (task) {
    const inspection = inspectTask(task);
    assert.equal(inspection.signature.length, 256);
    assert.ok(inspection.family);
    assert.ok(inspection.target);
  });
});

test("config normalization bounds workload and requires two arms", function () {
  const config = normalizeConfig({
    replicates: 99,
    population: 4,
    generations: 1,
    epochs: 99,
    examplesPerTask: 1,
    maxDepth: 1,
    arms: ["closed", "ratifiedOpcodes"]
  });
  assert.equal(config.replicates, 32);
  assert.equal(config.population, 16);
  assert.equal(config.generations, 4);
  assert.equal(config.epochs, 5);
  assert.equal(config.examplesPerTask, 8);
  assert.equal(config.maxDepth, 2);
  assert.equal(config.transferSuiteId, TRANSFER_SUITE_ID);
  assert.throws(function () {
    normalizeConfig({ arms: ["closed"] });
  }, /at least two/);
});

test("frozen composition tasks are distinct from acquisition and match their manifest", async function () {
  const acquisition = new Set(makeTasks().map(function (task) {
    return inspectTask(task).signature;
  }));
  const transfer = makeTransferTasks();
  const signatures = transfer.map(function (task) { return inspectTask(task).signature; });
  assert.equal(transfer.length, 8);
  assert.equal(new Set(transfer.map(function (task) { return task.family; })).size, 8);
  assert.equal(new Set(signatures).size, transfer.length);
  signatures.forEach(function (signature) {
    assert.ok(!acquisition.has(signature), "transfer target must not duplicate an acquisition function");
  });
  const manifest = JSON.parse(await readFile(new URL("../benchmarks/transfer-suite-v1.json", import.meta.url), "utf8"));
  assert.equal(manifest.suite_id, TRANSFER_SUITE_ID);
  assert.deepEqual(manifest.tasks, transfer.map(function (task) {
    return Object.assign(inspectTask(task), { family: task.family, label: task.label });
  }));
});

test("paired arms begin from matched tasks and same first-epoch search", function () {
  const config = Object.assign({}, defaultConfig(), {
    replicates: 2,
    population: 16,
    generations: 4,
    epochs: 2,
    examplesPerTask: 8,
    arms: ARM_ORDER.slice()
  });
  const study = runStudy(config);
  assert.equal(study.trials.length, 8);
  for (let replicate = 0; replicate < 2; replicate += 1) {
    const rows = study.trials.filter(function (trial) {
      return trial.seed === study.trials[replicate * 4].seed;
    });
    assert.equal(new Set(rows.map(function (trial) { return trial.seed; })).size, 1);
    assert.equal(new Set(rows.map(function (trial) { return trial.epochs[0].taskId; })).size, 1);
    assert.equal(new Set(rows.map(function (trial) { return trial.epochs[0].program; })).size, 1);
    assert.equal(new Set(rows.map(function (trial) { return trial.epochs[0].heldoutAccuracy; })).size, 1);
  }
  assert.equal(study.observations.pairedSeedCount, 2);
  assert.equal(study.failures.length, 0);
});

test("the same config yields identical trial receipts", function () {
  const config = Object.assign({}, defaultConfig(), {
    replicates: 2,
    population: 16,
    generations: 4,
    epochs: 2,
    examplesPerTask: 8,
    arms: ["closed", "ratifiedOpcodes"]
  });
  const a = runStudy(config);
  const b = runStudy(config);
  assert.deepEqual(a.trials, b.trials);
  assert.deepEqual(a.metrics, b.metrics);
  assert.deepEqual(a.mutations, b.mutations);
});

test("transfer phase uses matched fresh populations and freezes acquired vocabularies", function () {
  const config = Object.assign({}, defaultConfig(), {
    replicates: 2,
    population: 16,
    generations: 4,
    epochs: 2,
    examplesPerTask: 8,
    arms: ["closed", "ratifiedOpcodes"]
  });
  const study = runStudy(config);
  assert.equal(study.schema, "tessera-study-v2");
  assert.equal(study.observations.transferTaskCount, 8);
  assert.equal(study.benchmark.transferSuiteId, TRANSFER_SUITE_ID);
  for (let replicate = 0; replicate < 2; replicate += 1) {
    const rows = study.trials.filter(function (trial) {
      return trial.seed === study.trials[replicate * 2].seed;
    });
    assert.equal(rows.length, 2);
    rows.forEach(function (trial) { assert.equal(trial.transfer.length, 8); });
    for (let taskIndex = 0; taskIndex < 8; taskIndex += 1) {
      assert.equal(rows[0].transfer[taskIndex].taskId, rows[1].transfer[taskIndex].taskId);
      assert.deepEqual(rows[0].transfer[taskIndex].trainingPairs, rows[1].transfer[taskIndex].trainingPairs);
      assert.equal(rows[0].transfer[taskIndex].initialPopulationDigest, rows[1].transfer[taskIndex].initialPopulationDigest);
      rows.forEach(function (trial) {
        assert.equal(trial.transfer[taskIndex].activeOpcodeCount, trial.finalOpcodes.length);
      });
    }
    rows.forEach(function (trial) {
      const firstTransfer = trial.events.findIndex(function (event) { return event.phase === "transfer"; });
      assert.ok(firstTransfer >= 0);
      assert.ok(trial.events.slice(firstTransfer).every(function (event) {
        return event.type === "transfer-task-started" || event.type === "transfer-task-scored";
      }));
    });
  }
  assert.ok(study.metrics.transferComparisons.ratifiedOpcodes);
});

test("retired public opcodes remain interpretable inside extant programs", function () {
  let table = "";
  for (let x = 0; x < 16; x += 1) {
    for (let y = 0; y < 16; y += 1) table += ((x ^ y) & 15).toString(16);
  }
  const macros = new Map([["OP001", { id: "OP001", table: table, active: false }]]);
  const program = {
    kind: "macro",
    id: "OP001",
    args: [
      { kind: "var", name: "x" },
      { kind: "var", name: "y" }
    ]
  };
  assert.equal(evaluate(program, 9, 6, macros), 15);
  assert.equal(evaluate(program, 7, 7, macros), 0);
});

test("multi-epoch opcode expiry does not break saved lineages", function () {
  const config = Object.assign({}, defaultConfig(), {
    replicates: 8,
    population: 32,
    generations: 18,
    epochs: 5,
    examplesPerTask: 24,
    arms: ARM_ORDER.slice()
  });
  const study = runStudy(config);
  const published = study.mutations.filter(function (event) {
    return event.type === "opcode-published";
  });
  const expired = study.mutations.filter(function (event) {
    return event.type === "opcode-expired";
  });
  assert.ok(published.length > 0);
  assert.ok(expired.length > 0);
  const ratified = published.filter(function (event) {
    return event.arm === "ratifiedOpcodes";
  });
  assert.ok(ratified.length > 0);
  ratified.forEach(function (event) {
    assert.ok(event.independentLineages >= 2);
    assert.ok(event.taskFamilies >= 2);
    assert.equal(event.samples, 256);
  });
  study.trials.forEach(function (trial) {
    assert.equal(trial.epochs.length, 5);
    trial.epochs.forEach(function (epoch) {
      assert.equal(epoch.trainingPairs.length, 24);
      assert.ok(epoch.heldoutAccuracy >= 0 && epoch.heldoutAccuracy <= 1);
    });
    assert.equal(trial.transfer.length, 8);
    trial.transfer.forEach(function (task) {
      assert.equal(task.targetSignature.length, 256);
      assert.ok(task.exactAccuracy >= 0 && task.exactAccuracy <= 1);
    });
  });
});

test("CSV output contains phase-labeled rows for acquisition and transfer", function () {
  const config = Object.assign({}, defaultConfig(), {
    replicates: 2,
    population: 16,
    generations: 4,
    epochs: 2,
    examplesPerTask: 8,
    arms: ["closed", "ratifiedOpcodes"]
  });
  const study = runStudy(config);
  const rows = csvForStudy(study).split(/\r?\n/);
  assert.equal(rows.length, 1 + 2 * 2 * (2 + 8));
  assert.match(rows[0], /experiment_id,phase,seed,arm,epoch/);
  assert.match(rows[1], /"acquisition"/);
  assert.ok(rows.some(function (row) { return row.includes('"transfer"'); }));
});

test("CSV export still accepts acquisition-only v1 receipts", function () {
  const legacy = {
    experimentId: "legacy-v1",
    trials: [{
      seed: 17,
      arm: "closed",
      epochs: [{
        epoch: 1,
        taskId: "T-01",
        family: "wake",
        trainAccuracy: 0.5,
        heldoutAccuracy: 0.25,
        generationsToExact: null,
        effectiveSize: 3,
        expandedSize: 3,
        populationDiversity: 1,
        activeOpcodeCount: 0,
        adoptedOpcodeLineages: 0,
        program: "xor(x,y)"
      }]
    }]
  };
  const rows = csvForStudy(legacy).split(/\r?\n/);
  assert.equal(rows.length, 2);
  assert.match(rows[1], /"acquisition"/);
  assert.match(rows[1], /"legacy-v1"/);
});
