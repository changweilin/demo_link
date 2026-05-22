import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const schedulerKey = Symbol.for("demo-link.github-last-updated-scheduler");
const trackerScriptPath = fileURLToPath(new URL("./github-last-updated.js", import.meta.url));

function isDisabled(value) {
  return ["0", "false", "no", "off"].includes(String(value ?? "").trim().toLowerCase());
}

function readIntegerEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) ? value : fallback;
}

function getNextRunDate(now = new Date()) {
  const hour = Math.min(Math.max(readIntegerEnv("TRACK_GITHUB_UPDATES_HOUR", 4), 0), 23);
  const minute = Math.min(Math.max(readIntegerEnv("TRACK_GITHUB_UPDATES_MINUTE", 0), 0), 59);
  const nextRun = new Date(now);

  nextRun.setHours(hour, minute, 0, 0);
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  return nextRun;
}

function formatDateTime(date) {
  return date.toLocaleString("zh-TW", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function startGithubLastUpdatedScheduler(options = {}) {
  if (isDisabled(process.env.TRACK_GITHUB_UPDATES_ON_SERVER)) {
    console.log("[github-updates] Server scheduler disabled by TRACK_GITHUB_UPDATES_ON_SERVER.");
    return { stop() {} };
  }

  if (globalThis[schedulerKey]) {
    return globalThis[schedulerKey];
  }

  const label = options.label || "server";
  let timer = null;
  let running = false;
  let stopped = false;

  function runTracker(reason) {
    if (running || stopped) return;

    running = true;
    console.log(`[github-updates] Running ${reason} sync for ${label}.`);

    const child = spawn(process.execPath, [trackerScriptPath], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", (error) => {
      running = false;
      console.warn(`[github-updates] Sync failed to start: ${error.message}`);
    });

    child.on("exit", (code, signal) => {
      running = false;
      if (code === 0) {
        console.log(`[github-updates] Sync finished for ${label}.`);
        return;
      }

      console.warn(
        `[github-updates] Sync exited with ${signal ? `signal ${signal}` : `code ${code}`}.`,
      );
    });
  }

  function scheduleNext() {
    if (stopped) return;

    const nextRun = getNextRunDate();
    const delay = Math.max(1000, nextRun.getTime() - Date.now());

    console.log(`[github-updates] Next ${label} sync scheduled for ${formatDateTime(nextRun)}.`);
    timer = setTimeout(() => {
      runTracker("scheduled");
      scheduleNext();
    }, delay);
    timer.unref?.();
  }

  const scheduler = {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (globalThis[schedulerKey] === scheduler) {
        delete globalThis[schedulerKey];
      }
    },
  };

  globalThis[schedulerKey] = scheduler;
  scheduleNext();

  if (!isDisabled(process.env.TRACK_GITHUB_UPDATES_ON_START)) {
    setTimeout(() => runTracker("startup"), 1000).unref?.();
  }

  return scheduler;
}
