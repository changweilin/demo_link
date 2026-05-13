import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export const resumePlatformAuthRoute = "/api/resume-platform-auth";

const defaultAuthStateFile = "C:\\tmp\\resume-platform-auth.json";
const jsonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
};
const platformConfigs = {
  "104": {
    label: "104",
    mode: "external-login",
    loginUrlEnv: "RESUME_AUTH_104_LOGIN_URL",
    defaultLoginUrl: "https://pda.104.com.tw/profile",
    message: "104 尚未提供個人履歷 OAuth 對接；先開啟登入後的履歷頁，由本人完成平台授權。",
  },
  linkedin: {
    label: "LinkedIn",
    mode: "oauth",
    clientIdEnv: "RESUME_AUTH_LINKEDIN_CLIENT_ID",
    clientSecretEnv: "RESUME_AUTH_LINKEDIN_CLIENT_SECRET",
    scopeEnv: "RESUME_AUTH_LINKEDIN_SCOPE",
    defaultScope: "openid profile email",
    authorizationUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    userInfoUrl: "https://api.linkedin.com/v2/userinfo",
    message: "LinkedIn 使用 OAuth / OpenID Connect 登入，完成後會保存本機授權狀態。",
  },
  cake: {
    label: "Cake",
    mode: "external-login",
    loginUrlEnv: "RESUME_AUTH_CAKE_LOGIN_URL",
    defaultLoginUrl: "https://www.cake.me/users/sign_in",
    message: "Cake 尚未提供公開履歷 OAuth 對接；先開啟 Cake 登入頁，後續可接入官方 API 或瀏覽器自動化。",
  },
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, jsonHeaders);
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function sendHtml(response, statusCode, html) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "text/html; charset=utf-8",
  });
  response.end(html);
}

function redirect(response, targetUrl) {
  response.writeHead(302, { Location: targetUrl });
  response.end();
}

function getEnvValue(envName) {
  return envName ? process.env[envName]?.trim() ?? "" : "";
}

function getAuthStateFile() {
  return getEnvValue("RESUME_AUTH_STATE_FILE") || defaultAuthStateFile;
}

function getRequestBaseUrl(request) {
  const configuredBaseUrl = getEnvValue("RESUME_AUTH_BASE_URL");
  if (configuredBaseUrl) return configuredBaseUrl.replace(/\/+$/, "");

  const forwardedProto = String(request.headers["x-forwarded-proto"] ?? "").split(",")[0].trim();
  const protocol = forwardedProto || "http";
  return `${protocol}://${request.headers.host ?? "127.0.0.1"}`;
}

function getRequestOrigin(request) {
  return `http://${request.headers.host ?? "127.0.0.1"}`;
}

function getPathParts(url) {
  return url.pathname.slice(resumePlatformAuthRoute.length).split("/").filter(Boolean);
}

function getPlatformConfig(platform) {
  return platformConfigs[platform] ?? null;
}

function getLoginUrl(config) {
  return getEnvValue(config.loginUrlEnv) || config.defaultLoginUrl;
}

function getLinkedInClientId(config) {
  return getEnvValue(config.clientIdEnv);
}

function getLinkedInClientSecret(config) {
  return getEnvValue(config.clientSecretEnv);
}

function getLinkedInScope(config) {
  return getEnvValue(config.scopeEnv) || config.defaultScope;
}

function getCallbackUrl(request, platform) {
  return `${getRequestBaseUrl(request)}${resumePlatformAuthRoute}/${platform}/callback`;
}

function createAuthState() {
  return randomBytes(24).toString("hex");
}

function getDefaultStore() {
  return {
    pendingStates: {},
    platforms: {},
  };
}

async function readStore() {
  try {
    const text = await readFile(getAuthStateFile(), "utf8");
    const parsed = JSON.parse(text);

    return {
      ...getDefaultStore(),
      ...parsed,
      pendingStates: parsed.pendingStates && typeof parsed.pendingStates === "object" ? parsed.pendingStates : {},
      platforms: parsed.platforms && typeof parsed.platforms === "object" ? parsed.platforms : {},
    };
  } catch {
    return getDefaultStore();
  }
}

async function writeStore(store) {
  const authStateFile = getAuthStateFile();

  await mkdir(dirname(authStateFile), { recursive: true });
  await writeFile(authStateFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function normalizeReturnTo(returnTo, request) {
  if (!returnTo) return "/#resume-editor";

  try {
    const baseUrl = new URL(getRequestBaseUrl(request));
    const url = new URL(returnTo, baseUrl);

    if (url.origin !== baseUrl.origin) return "/#resume-editor";
    return `${url.pathname}${url.search}${url.hash || "#resume-editor"}`;
  } catch {
    return "/#resume-editor";
  }
}

function isConnected(platformState) {
  if (platformState?.status !== "connected") return false;
  if (!platformState.expiresAt) return true;

  return Date.parse(platformState.expiresAt) > Date.now();
}

function getPublicProfile(profile) {
  if (!profile || typeof profile !== "object") return undefined;

  return {
    name: typeof profile.name === "string" ? profile.name : "",
    email: typeof profile.email === "string" ? profile.email : "",
    picture: typeof profile.picture === "string" ? profile.picture : "",
  };
}

function createPublicPlatformStatus(platform, config, store) {
  const storedPlatform = store.platforms[platform];

  if (config.mode === "oauth") {
    const clientId = getLinkedInClientId(config);
    const clientSecret = getLinkedInClientSecret(config);

    if (!clientId || !clientSecret) {
      return {
        platform,
        platformLabel: config.label,
        mode: config.mode,
        status: "not_configured",
        message: `請設定 ${config.clientIdEnv} 與 ${config.clientSecretEnv} 後再登入。`,
      };
    }

    if (isConnected(storedPlatform)) {
      return {
        platform,
        platformLabel: config.label,
        mode: config.mode,
        status: "connected",
        message: "LinkedIn 已完成登入授權。",
        connectedAt: storedPlatform.connectedAt,
        expiresAt: storedPlatform.expiresAt,
        profile: getPublicProfile(storedPlatform.profile),
      };
    }

    return {
      platform,
      platformLabel: config.label,
      mode: config.mode,
      status: storedPlatform?.status === "error" ? "error" : "ready",
      message: storedPlatform?.errorMessage || config.message,
    };
  }

  if (storedPlatform?.status === "external_login_started") {
    return {
      platform,
      platformLabel: config.label,
      mode: config.mode,
      status: "external_login_started",
      message: "已開啟平台登入頁；登入狀態會保留在該平台網站中。",
      connectedAt: storedPlatform.startedAt,
    };
  }

  return {
    platform,
    platformLabel: config.label,
    mode: config.mode,
    status: "external_login",
    message: config.message,
  };
}

function createPublicAuthStatus(store) {
  return {
    ok: true,
    route: resumePlatformAuthRoute,
    stateFile: getAuthStateFile(),
    platforms: Object.entries(platformConfigs).map(([platform, config]) =>
      createPublicPlatformStatus(platform, config, store),
    ),
  };
}

async function handleStatus(response) {
  const store = await readStore();
  sendJson(response, 200, createPublicAuthStatus(store));
}

async function handleExternalLoginStart({ config, platform, request, response, url }) {
  const store = await readStore();
  const startedAt = new Date().toISOString();

  store.platforms[platform] = {
    mode: config.mode,
    status: "external_login_started",
    startedAt,
    returnTo: normalizeReturnTo(url.searchParams.get("returnTo"), request),
  };

  await writeStore(store);
  redirect(response, getLoginUrl(config));
}

async function handleLinkedInStart({ config, platform, request, response, url }) {
  const clientId = getLinkedInClientId(config);
  const clientSecret = getLinkedInClientSecret(config);

  if (!clientId || !clientSecret) {
    sendHtml(
      response,
      400,
      createResultHtml({
        title: "LinkedIn 尚未設定",
        message: `請先設定 ${config.clientIdEnv} 與 ${config.clientSecretEnv}。`,
        returnTo: normalizeReturnTo(url.searchParams.get("returnTo"), request),
      }),
    );
    return;
  }

  const state = createAuthState();
  const redirectUri = getCallbackUrl(request, platform);
  const returnTo = normalizeReturnTo(url.searchParams.get("returnTo"), request);
  const store = await readStore();

  store.pendingStates[state] = {
    platform,
    redirectUri,
    returnTo,
    createdAt: new Date().toISOString(),
  };

  await writeStore(store);

  const authorizationUrl = new URL(config.authorizationUrl);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("scope", getLinkedInScope(config));

  redirect(response, authorizationUrl.toString());
}

async function exchangeLinkedInCode({ code, config, redirectUri }) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: getLinkedInClientId(config),
    client_secret: getLinkedInClientSecret(config),
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || `LinkedIn token API 回應 ${response.status}`);
  }

  return payload;
}

async function fetchLinkedInProfile(config, accessToken) {
  const response = await fetch(config.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) return null;

  return response.json();
}

async function handleLinkedInCallback({ config, platform, response, url }) {
  const store = await readStore();
  const state = url.searchParams.get("state") ?? "";
  const pendingState = store.pendingStates[state];
  const returnTo = pendingState?.returnTo || "/#resume-editor";

  if (url.searchParams.has("error")) {
    const errorMessage = url.searchParams.get("error_description") || url.searchParams.get("error") || "LinkedIn 登入失敗。";
    store.platforms[platform] = {
      mode: config.mode,
      status: "error",
      errorMessage,
      updatedAt: new Date().toISOString(),
    };
    delete store.pendingStates[state];
    await writeStore(store);
    sendHtml(response, 400, createResultHtml({ title: "LinkedIn 登入失敗", message: errorMessage, returnTo }));
    return;
  }

  if (!pendingState || pendingState.platform !== platform) {
    sendHtml(
      response,
      400,
      createResultHtml({
        title: "LinkedIn 登入狀態不符",
        message: "請回到履歷編輯頁重新開始 LinkedIn 登入。",
        returnTo,
      }),
    );
    return;
  }

  try {
    const code = url.searchParams.get("code");
    if (!code) throw new Error("LinkedIn callback 缺少 code。");

    const token = await exchangeLinkedInCode({ code, config, redirectUri: pendingState.redirectUri });
    const profile = token.access_token ? await fetchLinkedInProfile(config, token.access_token) : null;
    const connectedAt = new Date().toISOString();
    const expiresAt =
      typeof token.expires_in === "number" ? new Date(Date.now() + token.expires_in * 1000).toISOString() : "";

    store.platforms[platform] = {
      mode: config.mode,
      status: "connected",
      connectedAt,
      expiresAt,
      scope: token.scope ?? getLinkedInScope(config),
      profile,
      token: {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenType: token.token_type,
        expiresIn: token.expires_in,
      },
    };
    delete store.pendingStates[state];
    await writeStore(store);

    sendHtml(
      response,
      200,
      createResultHtml({
        title: "LinkedIn 登入完成",
        message: "已完成 LinkedIn OAuth 授權，回到履歷編輯頁後可刷新登入狀態。",
        returnTo,
      }),
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "LinkedIn 登入失敗。";

    store.platforms[platform] = {
      mode: config.mode,
      status: "error",
      errorMessage,
      updatedAt: new Date().toISOString(),
    };
    delete store.pendingStates[state];
    await writeStore(store);

    sendHtml(response, 400, createResultHtml({ title: "LinkedIn 登入失敗", message: errorMessage, returnTo }));
  }
}

function createResultHtml({ title, message, returnTo }) {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const safeReturnTo = JSON.stringify(returnTo || "/#resume-editor");

  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif; color: #21302f; background: #f6f4ee; }
    main { width: min(100% - 40px, 560px); border: 1px solid #d8d4c8; border-radius: 8px; padding: 28px; background: #fffdfa; box-shadow: 0 22px 60px rgba(40, 45, 40, 0.12); }
    h1 { margin: 0 0 10px; font-size: 1.5rem; }
    p { margin: 0 0 18px; line-height: 1.7; color: #66716e; }
    a { color: #0f766e; font-weight: 760; }
  </style>
</head>
<body>
  <main>
    <h1>${safeTitle}</h1>
    <p>${safeMessage}</p>
    <a href="${escapeAttribute(returnTo || "/#resume-editor")}">回到履歷編輯頁</a>
  </main>
  <script>
    window.setTimeout(() => {
      window.location.assign(${safeReturnTo});
    }, 900);
  </script>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

async function handleAuthRequest(request, response) {
  const url = new URL(request.url ?? "/", getRequestOrigin(request));
  const isAuthPath = url.pathname === resumePlatformAuthRoute || url.pathname.startsWith(`${resumePlatformAuthRoute}/`);

  if (!isAuthPath) return false;

  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return true;
  }

  if (url.pathname === resumePlatformAuthRoute) {
    if (request.method !== "GET") {
      sendJson(response, 405, { ok: false, message: "只支援 GET、OPTIONS 與平台 start/callback route。" });
      return true;
    }

    await handleStatus(response);
    return true;
  }

  const [platform, action] = getPathParts(url);
  const config = getPlatformConfig(platform);

  if (!config) {
    sendJson(response, 404, { ok: false, message: `不支援的平台：${platform ?? "未知"}` });
    return true;
  }

  if (action === "start" && request.method === "GET") {
    if (config.mode === "oauth") {
      await handleLinkedInStart({ config, platform, request, response, url });
      return true;
    }

    await handleExternalLoginStart({ config, platform, request, response, url });
    return true;
  }

  if (action === "callback" && request.method === "GET") {
    if (platform !== "linkedin") {
      sendJson(response, 400, { ok: false, message: `${config.label} 目前沒有 callback route。` });
      return true;
    }

    await handleLinkedInCallback({ config, platform, response, url });
    return true;
  }

  sendJson(response, 404, { ok: false, message: `找不到 ${url.pathname}。` });
  return true;
}

export function createResumePlatformAuthMiddleware() {
  return (request, response, next) => {
    handleAuthRequest(request, response)
      .then((handled) => {
        if (!handled) next();
      })
      .catch((error) => {
        sendJson(response, 500, {
          ok: false,
          message: error instanceof Error ? error.message : "平台登入服務失敗。",
        });
      });
  };
}
