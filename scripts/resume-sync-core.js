import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createAdapterResults, writeAdapterReport } from "./resume-sync-adapters.js";

export const resumeSyncRoute = "/api/resume-sync";

const outputFile = process.env.RESUME_SYNC_OUTFILE ?? "C:\\tmp\\resume-platform-sync-latest.json";
const outputDir = process.env.RESUME_SYNC_OUTDIR ?? "C:\\tmp\\resume-platform-sync";
const maxBodyBytes = 5 * 1024 * 1024;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBodyBytes) {
        request.destroy();
        reject(new Error("同步資料包超過 5 MB。"));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function assertSyncPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("同步資料包必須是 JSON object。");
  }

  if (!Array.isArray(payload.platforms)) {
    throw new Error("同步資料包缺少 platforms 陣列。");
  }

  payload.platforms.forEach((platform) => {
    if (!platform || typeof platform !== "object") {
      throw new Error("platforms 內每一項都必須是 object。");
    }

    if (!Array.isArray(platform.sections)) {
      throw new Error(`${platform.platformLabel ?? platform.platform ?? "未知平台"} 缺少 sections 陣列。`);
    }
  });
}

function getPlatformSlug(platform) {
  return (
    String(platform.platform ?? platform.platformLabel ?? "platform")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "platform"
  );
}

function formatSectionMarkdown(platform, section) {
  const preview = (typeof section.manualText === "string" ? section.manualText : section.preview)?.trim() || "此區塊目前沒有內容。";

  return [
    `## ${section.sourceLabel} -> ${platform.platformLabel} / ${section.targetLabel}`,
    "",
    `- 來源：\`${section.sourcePath}\``,
    `- 項目數：${section.itemCount}`,
    "",
    preview,
  ].join("\n");
}

function formatPlatformMarkdown(platform, receivedAt) {
  const sections = platform.sections.map((section) => formatSectionMarkdown(platform, section)).join("\n\n");

  return [
    `# ${platform.platformLabel} 履歷同步稿`,
    "",
    `更新時間：${platform.updatedAt ?? receivedAt}`,
    `接收時間：${receivedAt}`,
    "",
    platform.description ?? "",
    "",
    sections,
    "",
  ].join("\n");
}

async function writePlatformFiles(payload, receivedAt) {
  await mkdir(outputDir, { recursive: true });

  const platformFiles = await Promise.all(
    payload.platforms.map(async (platform) => {
      const slug = getPlatformSlug(platform);
      const jsonFile = join(outputDir, `${slug}.json`);
      const markdownFile = join(outputDir, `${slug}.md`);

      await Promise.all([
        writeFile(jsonFile, `${JSON.stringify(platform, null, 2)}\n`, "utf8"),
        writeFile(markdownFile, formatPlatformMarkdown(platform, receivedAt), "utf8"),
      ]);

      return {
        platform: platform.platform,
        platformLabel: platform.platformLabel,
        jsonFile,
        markdownFile,
      };
    }),
  );

  const indexFile = join(outputDir, "index.json");
  await writeFile(
    indexFile,
    `${JSON.stringify(
      {
        receivedAt,
        latestPackage: outputFile,
        platforms: platformFiles,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return {
    indexFile,
    platformFiles,
  };
}

function getRequestOrigin(request) {
  return `http://${request.headers.host ?? "127.0.0.1"}`;
}

async function handleResumeSyncRequest(request, response) {
  const url = new URL(request.url ?? "/", getRequestOrigin(request));
  const isSyncPath = url.pathname === resumeSyncRoute;

  if (!isSyncPath) {
    return false;
  }

  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return true;
  }

  if (request.method === "GET") {
    sendJson(response, 200, {
      ok: true,
      route: resumeSyncRoute,
      outputFile,
      outputDir,
      message: "履歷同步 endpoint 已啟動，請用 POST 送出同步資料包。",
    });
    return true;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, {
      ok: false,
      message: "只支援 GET、POST、OPTIONS。",
    });
    return true;
  }

  try {
    const body = await readBody(request);
    const payload = JSON.parse(body);
    assertSyncPayload(payload);
    const receivedAt = new Date().toISOString();

    await mkdir(dirname(outputFile), { recursive: true });
    await writeFile(outputFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    const generatedFiles = await writePlatformFiles(payload, receivedAt);
    const adapterResults = createAdapterResults(payload, generatedFiles, receivedAt);
    const adapterReport = await writeAdapterReport({ adapterResults, outputDir, receivedAt });

    sendJson(response, 200, {
      ok: true,
      outputFile,
      outputDir,
      generatedFiles,
      adapterReport,
      platforms: payload.platforms.map((platform) => platform.platformLabel ?? platform.platform),
      receivedAt,
    });
  } catch (error) {
    sendJson(response, 400, {
      ok: false,
      message: error instanceof Error ? error.message : "同步資料包處理失敗。",
    });
  }

  return true;
}

export function createResumeSyncMiddleware() {
  return (request, response, next) => {
    handleResumeSyncRequest(request, response)
      .then((handled) => {
        if (!handled) next();
      })
      .catch((error) => {
        sendJson(response, 500, {
          ok: false,
          message: error instanceof Error ? error.message : "履歷同步服務失敗。",
        });
      });
  };
}

export async function handleStandaloneResumeSyncRequest(request, response) {
  const handled = await handleResumeSyncRequest(request, response);

  if (!handled) {
    sendJson(response, 404, {
      ok: false,
      message: `找不到 ${request.url ?? "/"}，請使用 ${resumeSyncRoute}。`,
    });
  }
}

export function getResumeSyncPaths() {
  return {
    outputFile,
    outputDir,
    resumeSyncRoute,
  };
}
