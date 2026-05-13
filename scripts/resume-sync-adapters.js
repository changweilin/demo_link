import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const platformAdapters = {
  "104": {
    mode: "manual-assist",
    targetUrlEnv: "RESUME_SYNC_104_URL",
    defaultTargetUrl: "https://pda.104.com.tw/profile",
    reason: "104 先使用同步面板逐區塊複製，由本人在平台頁面確認後保存。",
    nextSteps: [
      "在同步面板按「複製區塊」。",
      "開啟 104 履歷編輯頁並貼入對應欄位。",
      "確認預覽後由本人送出保存。",
    ],
  },
  linkedin: {
    mode: "manual-assist",
    targetUrlEnv: "RESUME_SYNC_LINKEDIN_URL",
    defaultTargetUrl: "https://www.linkedin.com/in/",
    reason: "LinkedIn 先使用同步面板逐區塊複製，由本人在平台頁面確認後保存。",
    nextSteps: [
      "在同步面板按「複製區塊」。",
      "開啟 LinkedIn Profile 編輯頁並貼入對應欄位。",
      "確認預覽後由本人送出保存。",
    ],
  },
  cake: {
    mode: "manual-assist",
    targetUrlEnv: "RESUME_SYNC_CAKE_URL",
    defaultTargetUrl: "https://www.cake.me/",
    reason: "Cake 先使用同步面板逐區塊複製，由本人在平台頁面確認後保存。",
    nextSteps: [
      "在同步面板按「複製區塊」。",
      "開啟 Cake 履歷編輯頁並貼入對應欄位。",
      "確認版面與連結後由本人送出保存。",
    ],
  },
};

function getAdapter(platform) {
  return platformAdapters[platform.platform] ?? {
    mode: "dry-run",
    targetUrlEnv: "",
    defaultTargetUrl: "",
    reason: "此平台尚未定義 adapter。",
    nextSteps: ["新增平台 adapter 後再接入實際同步流程。"],
  };
}

function getTargetUrl(adapter) {
  if (!adapter.targetUrlEnv) return adapter.defaultTargetUrl;
  return process.env[adapter.targetUrlEnv] ?? adapter.defaultTargetUrl;
}

function getFilesForPlatform(generatedFiles, platform) {
  return generatedFiles.platformFiles.find((file) => file.platform === platform.platform) ?? null;
}

function formatTimelineItems(items) {
  if (!Array.isArray(items)) return "";

  return items
    .map((item) =>
      [
        item.title,
        item.organization || item.role || item.period
          ? [item.organization, item.role, item.period].filter(Boolean).join(" / ")
          : "",
        item.plainText,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

function createSectionCopyText(section) {
  if (typeof section.manualText === "string") {
    return section.manualText;
  }

  const payload = section.payload;

  if (section.key === "profile" && payload) {
    return [payload.name, payload.headline, payload.location, payload.photoUrl].filter(Boolean).join("\n");
  }

  if (section.key === "summary" && Array.isArray(payload?.paragraphs)) {
    return payload.paragraphs.join("\n\n");
  }

  if (section.key === "skills" && Array.isArray(payload?.groups)) {
    return payload.groups.map((group) => `${group.title}\n${group.items.map((item) => `- ${item}`).join("\n")}`).join("\n\n");
  }

  if ((section.key === "workExperience" || section.key === "education") && Array.isArray(payload?.items)) {
    return formatTimelineItems(payload.items);
  }

  if (section.key === "links" && Array.isArray(payload?.links)) {
    return payload.links.map((link) => `${link.label}\n${link.href}`).join("\n\n");
  }

  return section.preview ?? "";
}

function createSectionPlan(section) {
  return {
    source: section.sourceLabel,
    sourcePath: section.sourcePath,
    target: section.targetLabel,
    itemCount: section.itemCount,
    action: "copy_from_sync_panel",
    copyText: createSectionCopyText(section),
  };
}

export function createAdapterResults(payload, generatedFiles, receivedAt) {
  return payload.platforms.map((platform) => {
    const adapter = getAdapter(platform);
    const files = getFilesForPlatform(generatedFiles, platform);

    return {
      platform: platform.platform,
      platformLabel: platform.platformLabel,
      mode: adapter.mode,
      status: adapter.mode === "manual-assist" ? "manual_ready" : "not_applied",
      targetUrl: getTargetUrl(adapter),
      reason: adapter.reason,
      generatedFiles: files,
      sections: platform.sections.map(createSectionPlan),
      nextSteps: adapter.nextSteps,
      receivedAt,
    };
  });
}

function formatAdapterResult(result) {
  const sections = result.sections
    .map((section) => `- ${section.source} -> ${section.target} (${section.itemCount} 項)`)
    .join("\n");
  const nextSteps = result.nextSteps.map((step, index) => `${index + 1}. ${step}`).join("\n");

  return [
    `## ${result.platformLabel}`,
    "",
    `- 模式：${result.mode}`,
    `- 狀態：${result.status}`,
    `- 目標網址：${result.targetUrl || "未設定"}`,
    `- 原因：${result.reason}`,
    result.generatedFiles?.markdownFile ? `- Markdown：${result.generatedFiles.markdownFile}` : "",
    result.generatedFiles?.jsonFile ? `- JSON：${result.generatedFiles.jsonFile}` : "",
    "",
    "### 區塊",
    "",
    sections,
    "",
    "### 下一步",
    "",
    nextSteps,
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export async function writeAdapterReport({ adapterResults, outputDir, receivedAt }) {
  const reportJsonFile = join(outputDir, "sync-report.json");
  const reportMarkdownFile = join(outputDir, "sync-report.md");
  const report = {
    receivedAt,
    status: "manual_assist_ready",
    message: "已產生 104/LinkedIn/Cake 同步資料；請在同步面板逐區塊複製到外部平台。",
    platforms: adapterResults,
  };

  const markdown = [
    "# 履歷平台同步報告",
    "",
    `接收時間：${receivedAt}`,
    "",
    "目前狀態：104 / LinkedIn / Cake 已產生同步資料；尚未寫回外部平台。",
    "",
    ...adapterResults.map(formatAdapterResult),
  ].join("\n");

  await Promise.all([
    writeFile(reportJsonFile, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(reportMarkdownFile, `${markdown}\n`, "utf8"),
  ]);

  return {
    reportJsonFile,
    reportMarkdownFile,
    adapterResults,
  };
}
