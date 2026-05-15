export const portfolioGeminiRoute = "/api/portfolio-gemini";

const maxBodyBytes = 2 * 1024 * 1024;
const maxReadmeChars = 120000;
const defaultGeminiModel = "gemini-2.0-flash";
const githubApiBase = "https://api.github.com/repos";
const geminiApiBase = "https://generativelanguage.googleapis.com/v1beta/models";

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
        reject(new Error("新增專案資料超過 2 MB。"));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function getRequestOrigin(request) {
  return `http://${request.headers.host ?? "127.0.0.1"}`;
}

function getTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getGeminiApiKey() {
  return getTrimmedString(process.env.GEMINI_API_KEY) || getTrimmedString(process.env.GOOGLE_API_KEY);
}

function getGeminiModel() {
  return getTrimmedString(process.env.PORTFOLIO_GEMINI_MODEL) || defaultGeminiModel;
}

function getGithubHeaders(accept = "application/vnd.github.raw") {
  const headers = {
    Accept: accept,
    "User-Agent": "demo-link-portfolio-editor",
  };
  const githubToken = getTrimmedString(process.env.GITHUB_TOKEN);

  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  return headers;
}

function normalizeGitHubRepoUrl(repoUrl) {
  if (!repoUrl) return null;

  try {
    const url = new URL(repoUrl);
    const host = url.hostname.toLowerCase();
    if (host !== "github.com" && host !== "www.github.com") return null;

    const [owner, repoWithSuffix] = url.pathname.split("/").filter(Boolean);
    const repo = repoWithSuffix?.replace(/\.git$/i, "");
    if (!owner || !repo) return null;

    return {
      owner,
      repo,
      normalizedUrl: `https://github.com/${owner}/${repo}`,
    };
  } catch {
    return null;
  }
}

function clampReadme(readme) {
  const trimmedReadme = readme.trim();
  if (trimmedReadme.length <= maxReadmeChars) return trimmedReadme;
  return `${trimmedReadme.slice(0, maxReadmeChars)}\n\n[README 已截斷，只保留前 ${maxReadmeChars} 字元]`;
}

async function fetchText(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `讀取 ${url} 失敗，HTTP ${response.status}`);
  }

  return text;
}

async function fetchReadmeFromGitHub(repoUrl) {
  const repo = normalizeGitHubRepoUrl(repoUrl);
  if (!repo) {
    throw new Error("請提供有效的 GitHub repository URL，例如 https://github.com/owner/repo。");
  }

  const readmeUrl = `${githubApiBase}/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/readme`;
  const readme = await fetchText(readmeUrl, {
    headers: getGithubHeaders(),
  });

  return {
    repoUrl: repo.normalizedUrl,
    readme: clampReadme(readme),
    source: readmeUrl,
  };
}

async function fetchReadmeFromUrl(readmeUrl) {
  let url;

  try {
    url = new URL(readmeUrl);
  } catch {
    throw new Error("README URL 格式不正確。");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("README URL 只支援 http 或 https。");
  }

  const readme = await fetchText(url.toString(), {
    headers: {
      Accept: "text/plain, text/markdown, */*",
      "User-Agent": "demo-link-portfolio-editor",
    },
  });

  return {
    repoUrl: "",
    readme: clampReadme(readme),
    source: url.toString(),
  };
}

async function resolveReadme(payload) {
  const pastedReadme = getTrimmedString(payload.readmeText);
  const repoUrl = getTrimmedString(payload.repoUrl);
  const readmeUrl = getTrimmedString(payload.readmeUrl);

  if (pastedReadme) {
    return {
      repoUrl,
      readme: clampReadme(pastedReadme),
      source: "pasted-readme",
    };
  }

  if (readmeUrl) return fetchReadmeFromUrl(readmeUrl);
  if (repoUrl) return fetchReadmeFromGitHub(repoUrl);

  throw new Error("請提供 GitHub repository URL、README URL，或直接貼上 README 內容。");
}

function getPrompt({ payload, readme }) {
  const repoUrl = getTrimmedString(payload.repoUrl);
  const demoUrl = getTrimmedString(payload.demoUrl);
  const preferredCategory = getTrimmedString(payload.category);
  const preferredTitle = getTrimmedString(payload.title);

  return [
    "請閱讀以下 README，為個人作品集產生一筆專案資料。",
    "語氣請使用自然、專業的繁體中文，避免誇大，聚焦使用者能看到的功能、技術重點與工程價值。",
    "請只輸出符合 schema 的 JSON，不要 Markdown，不要額外說明。",
    "",
    `偏好標題：${preferredTitle || "請由 README 判斷"}`,
    `Repository：${repoUrl || "未提供"}`,
    `Demo URL：${demoUrl || "未提供"}`,
    `偏好分類：${preferredCategory || "請由 README 判斷"}`,
    "",
    "欄位要求：",
    "- title：專案名稱，英文或 README 主要名稱。",
    "- summary：30 到 55 字繁體中文，適合列表摘要。",
    "- description：90 到 150 字繁體中文，適合作品詳細介紹。",
    "- tags：4 到 7 個技術或領域標籤，優先保留 README 的框架、語言、演算法。",
    "- category：3 到 10 字繁體中文分類，例如 地圖工具、AI 遊戲、演算法工具、互動網頁。",
    "- year：若 README 看不出年份，使用今年。",
    "",
    "README：",
    "```markdown",
    readme,
    "```",
  ].join("\n");
}

function getPortfolioProjectSchema() {
  return {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      summary: { type: "STRING" },
      description: { type: "STRING" },
      tags: {
        type: "ARRAY",
        items: { type: "STRING" },
      },
      category: { type: "STRING" },
      year: { type: "STRING" },
    },
    required: ["title", "summary", "description", "tags", "category", "year"],
  };
}

function getGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";

  return parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function stripJsonFence(text) {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeGeneratedProject(value) {
  const generated = value && typeof value === "object" ? value : {};
  const tags = Array.isArray(generated.tags)
    ? generated.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 8)
    : [];
  const now = new Date();

  return {
    title: getTrimmedString(generated.title) || "未命名專案",
    summary: getTrimmedString(generated.summary),
    description: getTrimmedString(generated.description),
    tags,
    category: getTrimmedString(generated.category) || "互動網頁",
    year: getTrimmedString(generated.year) || String(now.getFullYear()),
  };
}

async function generateProjectCopy({ payload, readme }) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("請在 .env.local 設定 GEMINI_API_KEY，重新啟動 dev server 後再使用 Gemini 產生文案。");
  }

  const model = getGeminiModel();
  const response = await fetch(`${geminiApiBase}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: getPrompt({ payload, readme }) }],
        },
      ],
      generationConfig: {
        response_mime_type: "application/json",
        response_schema: getPortfolioProjectSchema(),
      },
    }),
  });
  const geminiPayload = await response.json();

  if (!response.ok) {
    throw new Error(geminiPayload?.error?.message || `Gemini API 回應 ${response.status}`);
  }

  const responseText = stripJsonFence(getGeminiText(geminiPayload));
  if (!responseText) {
    throw new Error("Gemini 沒有回傳可用文案。");
  }

  return {
    model,
    project: normalizeGeneratedProject(JSON.parse(responseText)),
  };
}

async function handlePortfolioGeminiRequest(request, response) {
  const url = new URL(request.url ?? "/", getRequestOrigin(request));
  const isRoute = url.pathname === portfolioGeminiRoute;

  if (!isRoute) return false;

  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return true;
  }

  if (request.method === "GET") {
    sendJson(response, 200, {
      ok: true,
      route: portfolioGeminiRoute,
      model: getGeminiModel(),
      hasGeminiApiKey: Boolean(getGeminiApiKey()),
      message: "作品文案 endpoint 已啟動，請用 POST 傳入 repoUrl、readmeUrl 或 readmeText。",
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
    const payload = body ? JSON.parse(body) : {};
    const readmeResult = await resolveReadme(payload);
    const generated = await generateProjectCopy({ payload, readme: readmeResult.readme });

    sendJson(response, 200, {
      ok: true,
      ...generated,
      readmeSource: readmeResult.source,
      repoUrl: readmeResult.repoUrl || getTrimmedString(payload.repoUrl),
    });
  } catch (error) {
    sendJson(response, 400, {
      ok: false,
      message: error instanceof Error ? error.message : "Gemini 作品文案產生失敗。",
    });
  }

  return true;
}

export function createPortfolioGeminiMiddleware() {
  return (request, response, next) => {
    handlePortfolioGeminiRequest(request, response)
      .then((handled) => {
        if (!handled) next();
      })
      .catch((error) => {
        sendJson(response, 500, {
          ok: false,
          message: error instanceof Error ? error.message : "作品文案服務失敗。",
        });
      });
  };
}
