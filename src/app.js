import {
  ARM_ORDER,
  ARM_LABELS,
  csvForStudy,
  defaultConfig,
  experimentHypothesis
} from "./engine.js";

const STORE_KEY = "tessera.opcodeCommons.studies.v1";
const MAX_HISTORY_ITEMS = 6;
const MAX_HISTORY_CHARS = 1800000;
const COLORS = {
  closed: "#e18d78",
  fragments: "#8fb7dc",
  openOpcodes: "#e4c584",
  ratifiedOpcodes: "#a9dfbd"
};

const elements = {
  form: document.querySelector("#study-form"),
  runButton: document.querySelector("#run-button"),
  quickButton: document.querySelector("#quick-button"),
  error: document.querySelector("#form-error"),
  progress: document.querySelector("#progress-wrap"),
  progressLabel: document.querySelector("#progress-label"),
  progressCount: document.querySelector("#progress-count"),
  progressBar: document.querySelector("#progress-bar"),
  empty: document.querySelector("#empty-state"),
  output: document.querySelector("#study-output"),
  receipt: document.querySelector("#study-receipt"),
  metricGrid: document.querySelector("#metric-grid"),
  accuracyChart: document.querySelector("#accuracy-chart"),
  transferChart: document.querySelector("#transfer-chart"),
  sizeChart: document.querySelector("#size-chart"),
  legend: document.querySelector("#chart-legend"),
  comparison: document.querySelector("#comparison-list"),
  transferComparison: document.querySelector("#transfer-comparison-list"),
  summary: document.querySelector("#summary-table"),
  exportActions: document.querySelector("#export-actions"),
  commonsTable: document.querySelector("#commons-table"),
  commonsCount: document.querySelector("#commons-count"),
  gateTable: document.querySelector("#gate-table"),
  gateCount: document.querySelector("#gate-count"),
  ledgerTable: document.querySelector("#ledger-table"),
  clearLedger: document.querySelector("#clear-ledger")
};

let currentStudy = null;
let history = readHistory();

function readHistory() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    return Array.isArray(stored) ? stored.filter(function (item) {
      return item && (item.schema === "tessera-study-v1" || item.schema === "tessera-study-v2");
    }) : [];
  } catch (error) {
    return [];
  }
}

function writeHistory() {
  const candidates = history.slice(0, MAX_HISTORY_ITEMS);
  const kept = [];
  let chars = 2;
  candidates.forEach(function (item) {
    const itemChars = JSON.stringify(item).length + (kept.length ? 1 : 0);
    if (chars + itemChars > MAX_HISTORY_CHARS) return;
    kept.push(item);
    chars += itemChars;
  });
  history = kept;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(history));
  } catch (error) {
    showError("This browser could not save the local ledger. Export the JSON and CSV receipts before closing this tab.");
    return;
  }
  if (currentStudy && !history.some(function (item) { return item.experimentId === currentStudy.experimentId; })) {
    showError("This result is visible in the current tab but is too large for the browser ledger. Export its JSON and CSV receipts before closing this tab.");
  } else if (history.length < candidates.length) {
    showError("The browser ledger kept the newest receipts within its storage budget and dropped older entries. Export receipts you want to archive.");
  }
}

function escapeHtml(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showError(message) {
  elements.error.textContent = message;
  elements.error.hidden = !message;
}

function setRunning(running) {
  elements.runButton.disabled = running;
  elements.quickButton.disabled = running;
  elements.runButton.querySelector("span:first-child").textContent = running ? "Running paired worlds…" : "Run paired study";
  elements.progress.hidden = !running;
  if (running) {
    elements.progressLabel.textContent = "Preparing matched worlds…";
    elements.progressCount.textContent = "0 / 0";
    elements.progressBar.style.width = "0%";
  }
}

function configFromForm(quick) {
  const defaults = defaultConfig();
  const arms = Array.from(document.querySelectorAll(".arm-picker input:checked")).map(function (input) {
    return input.value;
  });
  return {
    replicates: quick ? 2 : Number(document.querySelector("#replicates").value),
    population: quick ? 24 : Number(document.querySelector("#population").value),
    generations: quick ? 8 : Number(document.querySelector("#generations").value),
    epochs: defaults.epochs,
    examplesPerTask: Number(document.querySelector("#examples").value),
    startSeed: Number(document.querySelector("#start-seed").value),
    maxDepth: defaults.maxDepth,
    arms: arms
  };
}

function startStudy(quick) {
  showError("");
  let config;
  try {
    config = configFromForm(quick);
    if (!Number.isFinite(config.startSeed) || config.startSeed < 0) {
      throw new Error("Starting seed must be an unsigned 32-bit number.");
    }
    if (config.arms.length < 2) throw new Error("Choose at least two comparison arms.");
    if (!quick && (config.replicates < 2 || config.replicates > 32)) throw new Error("Paired seeds must be between 2 and 32.");
    if (!quick && (config.population < 16 || config.population > 120)) throw new Error("Population size must be between 16 and 120.");
    if (!quick && (config.generations < 4 || config.generations > 80)) throw new Error("Generations must be between 4 and 80.");
  } catch (error) {
    showError(error.message);
    return;
  }
  setRunning(true);
  const worker = new Worker("./src/worker.js", { type: "module" });
  worker.addEventListener("message", function (event) {
    const message = event.data || {};
    if (message.type === "progress") {
      const progress = message.progress;
      if (progress.stage === "transfer") {
        elements.progressLabel.textContent = "Seed " + progress.replicate + " / " + progress.replicateCount +
          " · " + progress.label + " · " + progress.transferTaskId;
        elements.progressCount.textContent = progress.completed + " / " + progress.total +
          " arms · " + progress.transferTaskIndex + " / " + progress.transferTaskCount + " transfer tasks";
        elements.progressBar.style.width = (100 * (progress.completed +
          0.9 * progress.transferTaskIndex / progress.transferTaskCount) / progress.total) + "%";
      } else {
        elements.progressLabel.textContent = "Seed " + progress.replicate + " / " + progress.replicateCount + " · " + progress.label;
        elements.progressCount.textContent = progress.completed + " / " + progress.total;
        elements.progressBar.style.width = (100 * progress.completed / progress.total) + "%";
      }
    } else if (message.type === "complete") {
      currentStudy = message.study;
      history = [currentStudy].concat(history.filter(function (item) {
        return item.experimentId !== currentStudy.experimentId;
      })).slice(0, MAX_HISTORY_ITEMS);
      writeHistory();
      setRunning(false);
      renderStudy(currentStudy);
      renderLedger();
      renderCommons(currentStudy);
      worker.terminate();
    } else if (message.type === "error") {
      setRunning(false);
      showError(message.error);
      worker.terminate();
    }
  });
  worker.addEventListener("error", function (event) {
    setRunning(false);
    showError(event.message || "The experiment worker stopped unexpectedly.");
    worker.terminate();
  });
  worker.postMessage({ type: "run-study", config: config });
}

function showView(name) {
  document.querySelectorAll(".nav-item").forEach(function (button) {
    const active = button.dataset.view === name;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  document.querySelectorAll(".view").forEach(function (view) {
    const active = view.id === "view-" + name;
    view.classList.toggle("active", active);
    view.hidden = !active;
  });
  if (name === "ledger") renderLedger();
  if (name === "commons") renderCommons(currentStudy);
  window.history.replaceState(null, "", "#" + name);
}

document.querySelectorAll(".nav-item").forEach(function (button) {
  button.addEventListener("click", function () { showView(button.dataset.view); });
});
document.querySelectorAll("[data-open-view]").forEach(function (link) {
  link.addEventListener("click", function (event) {
    event.preventDefault();
    showView(link.dataset.openView);
  });
});

elements.form.addEventListener("submit", function (event) {
  event.preventDefault();
  startStudy(false);
});
elements.quickButton.addEventListener("click", function () { startStudy(true); });

document.querySelector("#export-json").addEventListener("click", function () {
  if (currentStudy) download(
    currentStudy.experimentId + ".json",
    JSON.stringify(currentStudy, null, 2),
    "application/json"
  );
});
document.querySelector("#export-csv").addEventListener("click", function () {
  if (currentStudy) download(currentStudy.experimentId + ".csv", csvForStudy(currentStudy), "text/csv");
});

function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type: type + ";charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
}

function percent(value) {
  return (100 * Number(value || 0)).toFixed(1) + "%";
}

function fixed(value, digits) {
  return Number(value || 0).toFixed(digits === undefined ? 2 : digits);
}

function renderStudy(study) {
  elements.empty.hidden = true;
  elements.output.hidden = false;
  elements.exportActions.hidden = false;
  const selected = ARM_ORDER.filter(function (arm) { return study.metrics.arms[arm]; });
  const lead = study.metrics.arms.ratifiedOpcodes || study.metrics.arms[selected[selected.length - 1]];
  const ratifiedAdmissions = study.mutations.filter(function (event) {
    return event.type === "opcode-published" && event.arm === "ratifiedOpcodes";
  }).length;
  const meanDiversity = lead ? lead.meanPopulationDiversity : 0;
  const hasTransfer = study.schema === "tessera-study-v2" &&
    study.trials.some(function (trial) { return Array.isArray(trial.transfer); });
  elements.receipt.innerHTML =
    "<span>" + escapeHtml(study.experimentId) + " · " + study.config.replicates + " PAIRED SEEDS · " + study.config.epochs + " EPOCHS</span>" +
    "<span>ENGINE " + escapeHtml(study.engineVersion) + " · " + escapeHtml(study.timestamp) + "</span>";
  const cards = [
    ["PAIRED WORLDS", study.config.replicates, "same targets and training cases"],
    ["RATIFIED ADMISSIONS", ratifiedAdmissions, "independent-lineage gates passed"],
    ["IN-DOMAIN SCORE", lead ? percent(lead.meanHeldoutAccuracy) : "—", lead ? lead.label : "no arm selected"],
    ["UNSEEN COMPOSITIONS", lead && hasTransfer ? percent(lead.meanTransferAccuracy) : "—", hasTransfer ? "8 frozen tasks · fresh search" : "not recorded in this receipt"],
    ["POPULATION DIVERSITY", fixed(meanDiversity, 2), "unique programs / population"]
  ];
  elements.metricGrid.innerHTML = cards.map(function (card) {
    return '<div class="metric-card"><span class="metric-label">' + escapeHtml(card[0]) +
      '</span><strong class="metric-value">' + escapeHtml(card[1]) +
      '</strong><span class="metric-sub">' + escapeHtml(card[2]) + "</span></div>";
  }).join("");
  elements.accuracyChart.innerHTML = lineChart(study, "heldoutAccuracy", 0, 1, true, "acquisition");
  elements.transferChart.innerHTML = lineChart(study, "exactAccuracy", 0, 1, true, "transfer");
  elements.sizeChart.innerHTML = lineChart(study, "effectiveSize", 0, null, false, "acquisition");
  elements.legend.innerHTML = selected.map(function (arm) {
    return '<span class="legend-item"><i class="legend-line" style="background:' + COLORS[arm] + '"></i>' +
      escapeHtml(ARM_LABELS[arm]) + "</span>";
  }).join("");
  renderComparisons(study, selected, "comparisons", elements.comparison,
    "No acquisition-split contrast is available in this receipt.");
  renderComparisons(study, selected, "transferComparisons", elements.transferComparison,
    "This saved receipt predates the frozen unseen-composition phase.");
  renderSummary(study, selected);
}

function lineChart(study, metric, lower, upper, isPercent, phase) {
  const width = 720;
  const height = metric === "heldoutAccuracy" || metric === "exactAccuracy" ? 210 : 138;
  const padding = { left: 42, right: 14, top: 12, bottom: 29 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const selected = ARM_ORDER.filter(function (arm) { return study.metrics.arms[arm]; });
  function dataFor(trial) {
    return phase === "transfer" ? (Array.isArray(trial.transfer) ? trial.transfer : []) : trial.epochs;
  }
  const firstTrial = study.trials.find(function (trial) { return dataFor(trial).length > 0; });
  if (!firstTrial) return '<div class="empty-table">This saved receipt has no frozen unseen-composition results.</div>';
  const stepCount = dataFor(firstTrial).length;
  let maxValue = upper;
  if (maxValue === null) {
    maxValue = 1;
    selected.forEach(function (arm) {
      study.trials.filter(function (trial) { return trial.arm === arm; }).forEach(function (trial) {
        dataFor(trial).forEach(function (record) { maxValue = Math.max(maxValue, record[metric]); });
      });
    });
    maxValue = Math.ceil(maxValue / 2) * 2;
  }
  if (maxValue <= lower) maxValue = lower + 1;
  const grid = [];
  for (let tick = 0; tick <= 4; tick += 1) {
    const value = lower + (maxValue - lower) * tick / 4;
    const y = padding.top + plotHeight * (1 - tick / 4);
    const label = isPercent ? Math.round(value * 100) + "%" : value.toFixed(0);
    grid.push('<line x1="' + padding.left + '" y1="' + y + '" x2="' + (width - padding.right) +
      '" y2="' + y + '" stroke="#2b3934" stroke-width="1"/><text x="' + (padding.left - 8) +
      '" y="' + (y + 3) + '" fill="#738279" font-size="8" text-anchor="end" font-family="DM Mono, monospace">' +
      label + "</text>");
  }
  for (let i = 0; i < stepCount; i += 1) {
    const x = padding.left + (stepCount <= 1 ? 0 : plotWidth * i / (stepCount - 1));
    const tick = phase === "transfer" ? dataFor(firstTrial)[i].taskId : "E" + (i + 1);
    grid.push('<text x="' + x + '" y="' + (height - 8) + '" fill="#738279" font-size="8" text-anchor="middle" font-family="DM Mono, monospace">' + escapeHtml(tick) + "</text>");
  }
  const traces = selected.map(function (arm) {
    const rows = study.trials.filter(function (trial) { return trial.arm === arm; });
    const values = [];
    for (let epoch = 0; epoch < stepCount; epoch += 1) {
      values.push(average(rows.map(function (trial) { return dataFor(trial)[epoch][metric]; })));
    }
    const points = values.map(function (value, index) {
      const x = padding.left + (stepCount <= 1 ? 0 : plotWidth * index / (stepCount - 1));
      const y = padding.top + plotHeight * (1 - (value - lower) / (maxValue - lower));
      return [x, y];
    });
    const polyline = points.map(function (point) { return point[0] + "," + point[1]; }).join(" ");
    const circles = points.map(function (point) {
      return '<circle cx="' + point[0] + '" cy="' + point[1] + '" r="3.5" fill="' + COLORS[arm] +
        '" stroke="#17211d" stroke-width="1.5"/>';
    }).join("");
    return '<polyline points="' + polyline + '" fill="none" stroke="' + COLORS[arm] +
      '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' + circles;
  }).join("");
  return '<svg viewBox="0 0 ' + width + " " + height + '" aria-hidden="true">' + grid.join("") +
    '<line x1="' + padding.left + '" y1="' + padding.top + '" x2="' + padding.left +
    '" y2="' + (height - padding.bottom) + '" stroke="#45554d" stroke-width="1"/>' + traces + "</svg>";
}

function renderComparisons(study, selected, metricKey, container, emptyMessage) {
  const rows = selected.filter(function (arm) { return arm !== "closed"; }).map(function (arm) {
    const result = study.metrics[metricKey] && study.metrics[metricKey][arm];
    if (!result) return "";
    const diff = 100 * result.meanPairedDifference;
    const ci = result.interval;
    const dot = '<i class="arm-swatch" style="background:' + COLORS[arm] + '"></i>';
    return '<div class="comparison-row"><span class="comparison-name">' + dot + escapeHtml(ARM_LABELS[arm]) +
      '</span><strong class="comparison-delta">' + (diff > 0 ? "+" : "") + diff.toFixed(1) +
      '</strong><span class="comparison-ci">[' + (100 * ci.low).toFixed(1) + ", " +
      (100 * ci.high).toFixed(1) + "]</span></div>";
  }).join("");
  container.innerHTML = rows || '<div class="empty-table">' + escapeHtml(emptyMessage) + "</div>";
}

function renderSummary(study, selected) {
  const rows = selected.map(function (arm) {
    const stats = study.metrics.arms[arm];
    return "<tr><td><span class=\"arm-swatch\" style=\"display:inline-block;vertical-align:middle;margin-right:7px;background:" +
      COLORS[arm] + "\"></span>" + escapeHtml(stats.label) +
      "</td><td class=\"mono\">" + percent(stats.meanHeldoutAccuracy) +
      "</td><td class=\"mono\">" + (stats.meanTransferAccuracy === undefined ? "—" : percent(stats.meanTransferAccuracy)) +
      "</td><td class=\"mono\">" + (stats.meanTransferExactTaskRate === undefined ? "—" : percent(stats.meanTransferExactTaskRate)) +
      "</td><td class=\"mono\">" + fixed(stats.meanEffectiveProgramSize, 1) +
      "</td><td class=\"mono\">" + (stats.meanTransferEffectiveProgramSize === undefined ? "—" : fixed(stats.meanTransferEffectiveProgramSize, 1)) +
      "</td><td class=\"mono\">" + fixed(stats.meanPopulationDiversity, 2) +
      "</td><td class=\"mono\">" + fixed(stats.meanActiveOpcodesAtEnd, 1) + "</td></tr>";
  }).join("");
  elements.summary.innerHTML = "<table><thead><tr><th>POLICY</th><th>IN-DOMAIN EXACT</th><th>UNSEEN COMPOSITION</th><th>EXACT TRANSFER TASKS</th><th>IN-DOMAIN NODES</th><th>TRANSFER NODES</th><th>DIVERSITY</th><th>ACTIVE OPCODES</th></tr></thead><tbody>" + rows + "</tbody></table>";
}

function renderCommons(study) {
  if (!study) {
    elements.commonsCount.textContent = "NO STUDY LOADED";
    elements.commonsTable.innerHTML = '<div class="empty-table">Run a study to inspect opcode publication and expiry events.</div>';
    elements.gateCount.textContent = "NO STUDY LOADED";
    elements.gateTable.innerHTML = '<div class="empty-table">Gate surveys will show how many distinct candidate functions passed each admission rule.</div>';
    return;
  }
  const publications = study.mutations.filter(function (event) {
    return event.type === "opcode-published";
  });
  const expirations = study.mutations.filter(function (event) {
    return event.type === "opcode-expired";
  });
  const surveys = study.trials.flatMap(function (trial) {
    return trial.events.filter(function (event) {
      return event.type === "opcode-gate-survey";
    }).map(function (event) {
      return Object.assign({ seed: trial.seed }, event);
    });
  });
  elements.commonsCount.textContent = publications.length + " PUBLISHED · " + expirations.length + " EXPIRED";
  const rows = publications.map(function (event) {
    return "<tr><td>" + escapeHtml(ARM_LABELS[event.arm] || event.arm) +
      "</td><td class=\"mono\">" + event.seed +
      "</td><td class=\"mono\">E" + event.epoch +
      "</td><td class=\"mono\">" + escapeHtml(event.id) +
      "</td><td class=\"mono\">" + escapeHtml(event.body) +
      "</td><td class=\"mono\">" + event.independentLineages +
      "</td><td class=\"mono\">" + event.taskFamilies +
      "</td><td class=\"mono\">" + event.samples +
      "</td><td class=\"mono\">" + escapeHtml(event.digest) + "</td></tr>";
  });
  expirations.forEach(function (event) {
    rows.push("<tr><td>" + escapeHtml(ARM_LABELS[event.arm] || event.arm) +
      "</td><td class=\"mono\">" + event.seed +
      "</td><td class=\"mono\">E" + event.epoch +
      "</td><td class=\"mono\">" + escapeHtml(event.id) +
      '</td><td colspan="3">EXPIRED AFTER TWO UNUSED EPOCHS</td><td class="mono">' +
      event.totalUses + '</td><td class="mono">' + escapeHtml(event.digest) + "</td></tr>");
  });
  elements.commonsTable.innerHTML = rows.length ?
    "<table><thead><tr><th>POLICY</th><th>SEED</th><th>EPOCH</th><th>OPCODE</th><th>EXPRESSION</th><th>LINEAGES</th><th>FAMILIES</th><th>CASES</th><th>TABLE DIGEST</th></tr></thead><tbody>" + rows.join("") + "</tbody></table>" :
    '<div class="empty-table">No opcode was admitted in this study. That is a useful mechanism-level result: the language did not cross its publication threshold.</div>';
  elements.gateCount.textContent = surveys.length + " EPOCH SURVEYS";
  elements.gateTable.innerHTML = surveys.length ?
    "<table><thead><tr><th>POLICY</th><th>SEED</th><th>EPOCH</th><th>CANDIDATE FUNCTIONS</th><th>GATE PASSED</th><th>BEST INDEPENDENT LINEAGES</th><th>BEST TASK FAMILIES</th></tr></thead><tbody>" +
    surveys.map(function (event) {
      return "<tr><td>" + escapeHtml(ARM_LABELS[event.arm] || event.arm) +
        "</td><td class=\"mono\">" + event.seed +
        "</td><td class=\"mono\">E" + event.epoch +
        "</td><td class=\"mono\">" + event.candidateFunctions +
        "</td><td class=\"mono\">" + event.gatePassedFunctions +
        "</td><td class=\"mono\">" + event.bestIndependentLineageSupport +
        "</td><td class=\"mono\">" + event.bestTaskFamilySupport + "</td></tr>";
    }).join("") + "</tbody></table>" :
    '<div class="empty-table">This run did not require an opcode admission gate.</div>';
}

function renderLedger() {
  if (!history.length) {
    elements.ledgerTable.innerHTML = '<div class="empty-table">No saved receipts yet. A completed study will appear here.</div>';
    return;
  }
  const rows = history.map(function (study) {
    const ratified = study.metrics.arms.ratifiedOpcodes;
    return "<tr><td class=\"mono\">" + escapeHtml(study.experimentId) +
      "</td><td class=\"mono\">" + escapeHtml(study.timestamp) +
      "</td><td class=\"mono\">" + study.config.replicates +
      "</td><td class=\"mono\">" + study.observations.trialCount +
      "</td><td class=\"mono\">" + (ratified && ratified.meanTransferAccuracy !== undefined ? percent(ratified.meanTransferAccuracy) : "—") +
      '</td><td><button class="secondary-button" data-load-study="' + escapeHtml(study.experimentId) + '">Load</button></td></tr>';
  }).join("");
  elements.ledgerTable.innerHTML = "<table><thead><tr><th>EXPERIMENT ID</th><th>UTC TIME</th><th>PAIRED SEEDS</th><th>TRIALS</th><th>RATIFIED UNSEEN</th><th>RECEIPT</th></tr></thead><tbody>" + rows + "</tbody></table>";
  elements.ledgerTable.querySelectorAll("[data-load-study]").forEach(function (button) {
    button.addEventListener("click", function () {
      const study = history.find(function (item) { return item.experimentId === button.dataset.loadStudy; });
      if (study) {
        currentStudy = study;
        renderStudy(study);
        renderCommons(study);
        showView("study");
      }
    });
  });
}

elements.clearLedger.addEventListener("click", function () {
  if (!history.length) return;
  if (!window.confirm("Remove the saved Tessera study receipts from this browser?")) return;
  history = [];
  writeHistory();
  renderLedger();
});

function loadStudyFromHash() {
  const view = location.hash.replace("#", "");
  if (["study", "commons", "ledger", "protocol"].includes(view)) showView(view);
}

document.querySelector("#hypothesis-text").textContent = experimentHypothesis();
renderLedger();
renderCommons(null);
loadStudyFromHash();
