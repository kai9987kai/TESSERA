import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultConfig, runStudy, csvForStudy } from "../src/engine.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(args) {
  const config = defaultConfig();
  let outputDir = path.join(projectRoot, "results");
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") return { help: true };
    if (arg === "--out") {
      outputDir = path.resolve(args[++i] || "");
      continue;
    }
    if (arg === "--arms") {
      config.arms = (args[++i] || "").split(",").filter(Boolean);
      continue;
    }
    if (arg.startsWith("--arms=")) {
      config.arms = arg.slice("--arms=".length).split(",").filter(Boolean);
      continue;
    }
    const match = arg.match(/^--(replicates|seed|population|generations|epochs|examples)=(.+)$/);
    if (match) {
      const field = {
        replicates: "replicates",
        seed: "startSeed",
        population: "population",
        generations: "generations",
        epochs: "epochs",
        examples: "examplesPerTask"
      }[match[1]];
      config[field] = Number(match[2]);
      continue;
    }
    throw new Error("Unknown argument: " + arg);
  }
  return { config: config, outputDir: outputDir };
}

function usage() {
  return [
    "Tessera Lab headless experiment runner",
    "",
    "Usage: npm run study -- [options]",
    "",
    "Options:",
    "  --replicates=N    Paired seed count (2-32)",
    "  --seed=N          Starting unsigned 32-bit seed",
    "  --population=N    Programs per world (16-120)",
    "  --generations=N   Generations per task (4-80)",
    "  --epochs=N        Task epochs (2-5)",
    "  --examples=N      Training examples per task (8-128)",
    "  --arms=LIST       Comma-separated arm IDs",
    "  --out PATH        Output directory",
    "  --help            Show this help",
    "",
    "Arm IDs: closed, fragments, openOpcodes, ratifiedOpcodes"
  ].join("\n");
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help) {
    process.stdout.write(usage() + "\n");
    return;
  }
  const result = runStudy(parsed.config, function (progress) {
    process.stdout.write(
      "\rTrial " + (progress.stage === "transfer" ? progress.completed + 1 : progress.completed) + "/" + progress.total +
      " · seed " + progress.replicate + "/" + progress.replicateCount +
      " · " + progress.label +
      (progress.stage === "transfer" ? " · " + progress.transferTaskId + " " + progress.transferTaskIndex + "/" + progress.transferTaskCount : "") +
      "                         "
    );
  });
  process.stdout.write("\n");
  await mkdir(parsed.outputDir, { recursive: true });
  const jsonPath = path.join(parsed.outputDir, result.experimentId + ".json");
  const csvPath = path.join(parsed.outputDir, result.experimentId + ".csv");
  await writeFile(jsonPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  await writeFile(csvPath, csvForStudy(result) + "\n", "utf8");
  process.stdout.write("Saved JSON: " + jsonPath + "\n");
  process.stdout.write("Saved CSV:  " + csvPath + "\n\n");
  Object.keys(result.metrics.arms).forEach(function (arm) {
    const item = result.metrics.arms[arm];
    process.stdout.write(
      item.label.padEnd(28) +
      (100 * item.meanHeldoutAccuracy).toFixed(1) + "% in-domain · " +
      (100 * item.meanTransferAccuracy).toFixed(1) + "% unseen · " +
      item.meanTransferEffectiveProgramSize.toFixed(1) + " transfer nodes · " +
      item.meanPopulationDiversity.toFixed(2) + " diversity\n"
    );
  });
  process.stdout.write("\nSynthetic benchmark only. Inspect the receipt and protocol before interpreting results.\n");
}

main().catch(function (error) {
  process.stderr.write((error && error.message ? error.message : String(error)) + "\n");
  process.exitCode = 1;
});
