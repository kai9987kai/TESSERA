import { runStudy } from "./engine.js";

self.addEventListener("message", function (event) {
  const message = event.data || {};
  if (message.type !== "run-study") return;
  try {
    const result = runStudy(message.config, function (progress) {
      self.postMessage({ type: "progress", progress: progress });
    });
    self.postMessage({ type: "complete", study: result });
  } catch (error) {
    self.postMessage({
      type: "error",
      error: error && error.message ? error.message : String(error)
    });
  }
});
