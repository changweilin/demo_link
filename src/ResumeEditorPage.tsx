import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  FileJson,
  LockKeyhole,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  type ChangeEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import resumeSeed from "./data/resume.json";
import "./resumeEditor.css";
import type { ResumeBullet, ResumeData, ResumeLinkIcon, TimelineItem } from "./types/resume";

type ResumeSectionKey = "workExperience" | "education";
type SavePhase = "idle" | "loading" | "saving" | "success" | "error";

type AsyncStatus = {
  phase: SavePhase;
  message: string;
  url?: string;
};

type GoogleCredentialResponse = {
  credential: string;
  select_by?: string;
};

type GoogleJwtPayload = {
  aud?: string;
  email?: string;
  email_verified?: boolean;
  exp?: number;
  iss?: string;
  name?: string;
  picture?: string;
  sub?: string;
};

type GoogleUser = {
  email: string;
  name: string;
  picture?: string;
  allowed: boolean;
};

type GitHubContentResponse = {
  sha: string;
  content?: string;
  encoding?: string;
};

type GitHubPutResponse = {
  commit?: {
    html_url?: string;
  };
};

type GoogleButtonConfig = {
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  shape?: "rectangular" | "pill" | "circle" | "square";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  locale?: string;
};

type GoogleIdApi = {
  initialize: (config: {
    auto_select?: boolean;
    callback: (response: GoogleCredentialResponse) => void;
    cancel_on_tap_outside?: boolean;
    client_id: string;
  }) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonConfig) => void;
  disableAutoSelect: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleIdApi;
      };
    };
  }
}

const initialResume = resumeSeed as ResumeData;
const resumeDataPath = "src/data/resume.json";
const githubOwner = import.meta.env.VITE_GITHUB_OWNER || "changweilin";
const githubRepo = import.meta.env.VITE_GITHUB_REPO || "demo_link";
const githubBranch = import.meta.env.VITE_GITHUB_BRANCH || "main";
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const defaultAllowedEmails = ["x111281@gmail.com"];
const linkIconOptions: ResumeLinkIcon[] = ["external", "github", "linkedin", "mail"];

let googleScriptPromise: Promise<void> | null = null;

function cloneResume(data: ResumeData) {
  return JSON.parse(JSON.stringify(data)) as ResumeData;
}

function getAllowedEmails() {
  const configuredEmails = import.meta.env.VITE_RESUME_EDITOR_ALLOWED_EMAILS as string | undefined;
  const source = configuredEmails ? configuredEmails.split(",") : defaultAllowedEmails;
  return source.map((email) => email.trim().toLowerCase()).filter(Boolean);
}

function replaceAt<T>(items: T[], index: number, nextItem: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? nextItem : item));
}

function removeAt<T>(items: T[], index: number) {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

function createEmptyBullet(): ResumeBullet {
  return { text: "" };
}

function createEmptyTimelineItem(): TimelineItem {
  return {
    title: "新項目",
    image: "",
    imageAlt: "",
    imageHref: "",
    bullets: [createEmptyBullet()],
  };
}

function updateBulletTree(
  bullets: ResumeBullet[],
  path: number[],
  updater: (bullet: ResumeBullet) => ResumeBullet,
): ResumeBullet[] {
  const [targetIndex, ...restPath] = path;

  return bullets.map((bullet, index) => {
    if (index !== targetIndex) return bullet;
    if (!restPath.length) return updater(bullet);

    return {
      ...bullet,
      children: updateBulletTree(bullet.children ?? [], restPath, updater),
    };
  });
}

function removeBulletFromTree(bullets: ResumeBullet[], path: number[]): ResumeBullet[] {
  const [targetIndex, ...restPath] = path;

  if (!restPath.length) return removeAt(bullets, targetIndex);

  return bullets.map((bullet, index) => {
    if (index !== targetIndex) return bullet;

    return {
      ...bullet,
      children: removeBulletFromTree(bullet.children ?? [], restPath),
    };
  });
}

function encodeUtf8Base64(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeUtf8Base64(base64: string) {
  const binary = atob(base64.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function decodeBase64UrlJson(tokenPart: string) {
  const normalized = tokenPart.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return JSON.parse(decodeUtf8Base64(padded)) as unknown;
}

function decodeGoogleCredential(credential: string): GoogleJwtPayload | null {
  const [, payload] = credential.split(".");
  if (!payload) return null;

  try {
    return decodeBase64UrlJson(payload) as GoogleJwtPayload;
  } catch {
    return null;
  }
}

function isResumeData(value: unknown): value is ResumeData {
  if (!value || typeof value !== "object") return false;

  const resume = value as Partial<ResumeData>;
  return Boolean(
    resume.meta &&
      resume.profile &&
      Array.isArray(resume.skills) &&
      Array.isArray(resume.workExperience) &&
      Array.isArray(resume.education),
  );
}

function getGitHubContentUrl() {
  const encodedPath = resumeDataPath.split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${encodedPath}`;
}

async function parseGitHubError(response: Response) {
  const fallback = `${response.status} ${response.statusText}`;
  const text = await response.text();
  if (!text) return fallback;

  try {
    const payload = JSON.parse(text) as { message?: string };
    return payload.message || fallback;
  } catch {
    return text;
  }
}

async function githubJsonRequest<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await parseGitHubError(response));
  }

  return (await response.json()) as T;
}

async function loadRemoteResume(token: string) {
  const contentUrl = `${getGitHubContentUrl()}?ref=${encodeURIComponent(githubBranch)}`;
  const file = await githubJsonRequest<GitHubContentResponse>(contentUrl, token);
  if (file.encoding !== "base64" || !file.content) {
    throw new Error("GitHub 回傳的檔案格式不是 base64。");
  }

  const parsed = JSON.parse(decodeUtf8Base64(file.content)) as unknown;
  if (!isResumeData(parsed)) {
    throw new Error("線上履歷資料格式不符合目前編輯器。");
  }

  return parsed;
}

async function saveRemoteResume(token: string, draft: ResumeData) {
  const contentUrl = getGitHubContentUrl();
  const currentFile = await githubJsonRequest<GitHubContentResponse>(
    `${contentUrl}?ref=${encodeURIComponent(githubBranch)}`,
    token,
  );
  const content = `${JSON.stringify(draft, null, 2)}\n`;

  return githubJsonRequest<GitHubPutResponse>(contentUrl, token, {
    body: JSON.stringify({
      branch: githubBranch,
      content: encodeUtf8Base64(content),
      message: "docs: update resume content",
      sha: currentFile.sha,
    }),
    method: "PUT",
  });
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Google script failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google script failed to load."));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

function ResumeEditorPage({
  onBackHome,
  onOpenResume,
}: {
  onBackHome: () => void;
  onOpenResume: () => void;
}) {
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const allowedEmails = useMemo(() => getAllowedEmails(), []);
  const allowedEmailSet = useMemo(() => new Set(allowedEmails), [allowedEmails]);
  const [draft, setDraft] = useState<ResumeData>(() => cloneResume(initialResume));
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [googleStatus, setGoogleStatus] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [status, setStatus] = useState<AsyncStatus>({ phase: "idle", message: "" });
  const canEdit = Boolean(googleUser?.allowed);

  const handleGoogleCredential = useCallback(
    (response: GoogleCredentialResponse) => {
      const payload = decodeGoogleCredential(response.credential);
      const email = payload?.email?.toLowerCase() ?? "";
      const nowInSeconds = Math.floor(Date.now() / 1000);

      if (!payload || payload.aud !== googleClientId || payload.iss !== "https://accounts.google.com") {
        setGoogleStatus("Google 登入回應無法驗證。");
        setGoogleUser(null);
        return;
      }

      if (!payload.email_verified || !email || (payload.exp ?? 0) < nowInSeconds) {
        setGoogleStatus("Google 帳戶尚未完成信箱驗證，或登入狀態已過期。");
        setGoogleUser(null);
        return;
      }

      const allowed = allowedEmailSet.has(email);
      setGoogleUser({
        allowed,
        email,
        name: payload.name || email,
        picture: payload.picture,
      });
      setGoogleStatus(allowed ? "" : "這個 Google 帳戶沒有履歷編輯權限。");
    },
    [allowedEmailSet],
  );

  useEffect(() => {
    if (!googleClientId) {
      setGoogleStatus("尚未設定 Google OAuth Client ID。");
      return;
    }

    let active = true;
    setGoogleStatus("正在載入 Google 登入。");

    loadGoogleIdentityScript()
      .then(() => {
        if (!active || !googleButtonRef.current || !window.google?.accounts?.id) return;

        googleButtonRef.current.innerHTML = "";
        window.google.accounts.id.initialize({
          auto_select: false,
          callback: handleGoogleCredential,
          cancel_on_tap_outside: true,
          client_id: googleClientId,
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          locale: "zh_TW",
          shape: "rectangular",
          size: "large",
          text: "signin_with",
          theme: "outline",
        });
        setGoogleStatus("");
      })
      .catch(() => {
        if (active) setGoogleStatus("Google 登入元件載入失敗。");
      });

    return () => {
      active = false;
    };
  }, [handleGoogleCredential]);

  const handleSignOut = () => {
    window.google?.accounts?.id?.disableAutoSelect();
    setGoogleUser(null);
    setGoogleStatus("");
  };

  const requireEditorAccess = () => {
    if (!canEdit) {
      setStatus({ phase: "error", message: "請先用允許的 Google 帳戶登入。" });
      return false;
    }

    if (!githubToken.trim()) {
      setStatus({ phase: "error", message: "請輸入具有 repo contents 讀寫權限的 GitHub token。" });
      return false;
    }

    return true;
  };

  const handleLoadRemote = async () => {
    if (!requireEditorAccess()) return;

    setStatus({ phase: "loading", message: "正在讀取 GitHub 上的履歷資料。" });
    try {
      const remoteResume = await loadRemoteResume(githubToken.trim());
      setDraft(cloneResume(remoteResume));
      setStatus({ phase: "success", message: "已載入 GitHub 上的最新履歷資料。" });
    } catch (error) {
      setStatus({
        phase: "error",
        message: error instanceof Error ? error.message : "讀取線上履歷資料失敗。",
      });
    }
  };

  const handleSave = async () => {
    if (!requireEditorAccess()) return;

    setStatus({ phase: "saving", message: "正在提交履歷更新到 GitHub。" });
    try {
      const result = await saveRemoteResume(githubToken.trim(), draft);
      setStatus({
        phase: "success",
        message: "履歷已提交。GitHub Pages 會在 Actions 完成後更新網站。",
        url: result.commit?.html_url,
      });
    } catch (error) {
      setStatus({
        phase: "error",
        message: error instanceof Error ? error.message : "儲存履歷資料失敗。",
      });
    }
  };

  const handleCopyJson = async () => {
    await navigator.clipboard?.writeText(`${JSON.stringify(draft, null, 2)}\n`);
    setStatus({ phase: "success", message: "已複製目前履歷 JSON。" });
  };

  const updateMeta = (field: keyof ResumeData["meta"], value: string) => {
    setDraft((current) => ({
      ...current,
      meta: {
        ...current.meta,
        [field]: value,
      },
    }));
  };

  const updateProfile = (field: "name" | "role" | "location", value: string) => {
    setDraft((current) => ({
      ...current,
      profile: {
        ...current.profile,
        [field]: value,
      },
    }));
  };

  const updateProfileSummary = (items: string[]) => {
    setDraft((current) => ({
      ...current,
      profile: {
        ...current.profile,
        summary: items,
      },
    }));
  };

  const updateProfileLinks = (links: ResumeData["profile"]["links"]) => {
    setDraft((current) => ({
      ...current,
      profile: {
        ...current.profile,
        links,
      },
    }));
  };

  const updateSkills = (skills: ResumeData["skills"]) => {
    setDraft((current) => ({
      ...current,
      skills,
    }));
  };

  const updateTimelineField = <K extends keyof TimelineItem>(
    section: ResumeSectionKey,
    index: number,
    field: K,
    value: TimelineItem[K],
  ) => {
    setDraft((current) => {
      const items = current[section].map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      );

      return {
        ...current,
        [section]: items,
      };
    });
  };

  const updateTimelineItems = (section: ResumeSectionKey, items: TimelineItem[]) => {
    setDraft((current) => ({
      ...current,
      [section]: items,
    }));
  };

  const updateBullet = (
    section: ResumeSectionKey,
    itemIndex: number,
    path: number[],
    updater: (bullet: ResumeBullet) => ResumeBullet,
  ) => {
    setDraft((current) => {
      const items = current[section].map((item, index) =>
        index === itemIndex
          ? {
              ...item,
              bullets: updateBulletTree(item.bullets, path, updater),
            }
          : item,
      );

      return {
        ...current,
        [section]: items,
      };
    });
  };

  const addBullet = (section: ResumeSectionKey, itemIndex: number, parentPath?: number[]) => {
    if (!parentPath) {
      setDraft((current) => {
        const items = current[section].map((item, index) =>
          index === itemIndex
            ? {
                ...item,
                bullets: [...item.bullets, createEmptyBullet()],
              }
            : item,
        );

        return {
          ...current,
          [section]: items,
        };
      });
      return;
    }

    updateBullet(section, itemIndex, parentPath, (bullet) => ({
      ...bullet,
      children: [...(bullet.children ?? []), createEmptyBullet()],
    }));
  };

  const removeBullet = (section: ResumeSectionKey, itemIndex: number, path: number[]) => {
    setDraft((current) => {
      const items = current[section].map((item, index) =>
        index === itemIndex
          ? {
              ...item,
              bullets: removeBulletFromTree(item.bullets, path),
            }
          : item,
      );

      return {
        ...current,
        [section]: items,
      };
    });
  };

  return (
    <main className="resume-editor-page">
      <header className="resume-editor-toolbar">
        <button className="editor-secondary-action" type="button" onClick={onBackHome}>
          <ArrowLeft size={18} aria-hidden="true" />
          回首頁
        </button>
        <div>
          <p>Resume editor</p>
          <h1>線上編輯履歷</h1>
        </div>
        <div className="resume-editor-toolbar-actions">
          <button className="editor-secondary-action" type="button" onClick={onOpenResume}>
            查看履歷
            <ExternalLink size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className={canEdit ? "resume-editor-shell" : "resume-editor-shell login-only"}>
        <AuthPanel
          allowedEmails={allowedEmails}
          googleButtonRef={googleButtonRef}
          googleClientId={googleClientId}
          googleStatus={googleStatus}
          googleUser={googleUser}
          onSignOut={handleSignOut}
        />

        {canEdit ? (
          <>
            <section className="editor-save-panel" aria-label="儲存設定">
              <label>
                <span>GitHub token</span>
                <input
                  autoComplete="off"
                  inputMode="text"
                  type="password"
                  value={githubToken}
                  onChange={(event) => setGithubToken(event.target.value)}
                  placeholder="github_pat_..."
                />
              </label>
              <div className="editor-save-actions">
                <button className="editor-secondary-action" type="button" onClick={handleLoadRemote}>
                  <RefreshCw size={18} aria-hidden="true" />
                  讀取線上版
                </button>
                <button className="editor-secondary-action" type="button" onClick={handleCopyJson}>
                  <FileJson size={18} aria-hidden="true" />
                  複製 JSON
                </button>
                <button className="editor-primary-action" type="button" onClick={handleSave}>
                  <Save size={18} aria-hidden="true" />
                  儲存到 GitHub
                </button>
              </div>
              <StatusMessage status={status} />
            </section>

            <section className="resume-editor-grid" aria-label="履歷編輯表單">
              <EditorCard title="頁面資訊">
                <TextField label="工具列標籤" value={draft.meta.eyebrow} onChange={(value) => updateMeta("eyebrow", value)} />
                <TextField label="頁面標題" value={draft.meta.title} onChange={(value) => updateMeta("title", value)} />
                <TextField label="Cake 履歷網址" value={draft.meta.sourceUrl} onChange={(value) => updateMeta("sourceUrl", value)} />
                <TextField label="照片網址" value={draft.meta.profileImage} onChange={(value) => updateMeta("profileImage", value)} />
              </EditorCard>

              <EditorCard title="個人資料">
                <TextField label="姓名" value={draft.profile.name} onChange={(value) => updateProfile("name", value)} />
                <TextField label="角色" value={draft.profile.role} onChange={(value) => updateProfile("role", value)} />
                <TextField label="地點" value={draft.profile.location} onChange={(value) => updateProfile("location", value)} />
                <StringListEditor
                  addLabel="新增自我介紹"
                  items={draft.profile.summary}
                  label="自我介紹"
                  multiline
                  onChange={updateProfileSummary}
                />
                <ProfileLinkEditor links={draft.profile.links} onChange={updateProfileLinks} />
              </EditorCard>

              <EditorCard title="技能">
                <SkillsEditor skills={draft.skills} onChange={updateSkills} />
              </EditorCard>
            </section>

            <TimelineEditor
              items={draft.workExperience}
              section="workExperience"
              title="工作經歷"
              onAddBullet={addBullet}
              onRemoveBullet={removeBullet}
              onUpdateBullet={updateBullet}
              onUpdateField={updateTimelineField}
              onUpdateItems={updateTimelineItems}
            />

            <TimelineEditor
              items={draft.education}
              section="education"
              title="學歷"
              onAddBullet={addBullet}
              onRemoveBullet={removeBullet}
              onUpdateBullet={updateBullet}
              onUpdateField={updateTimelineField}
              onUpdateItems={updateTimelineItems}
            />
          </>
        ) : null}
      </section>
    </main>
  );
}

function AuthPanel({
  allowedEmails,
  googleButtonRef,
  googleClientId,
  googleStatus,
  googleUser,
  onSignOut,
}: {
  allowedEmails: string[];
  googleButtonRef: RefObject<HTMLDivElement | null>;
  googleClientId: string;
  googleStatus: string;
  googleUser: GoogleUser | null;
  onSignOut: () => void;
}) {
  return (
    <section className="editor-auth-panel" aria-label="Google 登入">
      <div className="editor-auth-copy">
        <span className={googleUser?.allowed ? "editor-auth-badge allowed" : "editor-auth-badge"}>
          {googleUser?.allowed ? <ShieldCheck size={18} aria-hidden="true" /> : <LockKeyhole size={18} aria-hidden="true" />}
          {googleUser?.allowed ? "已授權" : "需要 Google 登入"}
        </span>
        <h2>履歷管理</h2>
        <p>允許帳戶：{allowedEmails.join(", ")}</p>
      </div>

      <div className="editor-auth-action">
        {googleUser ? (
          <div className="editor-user-card">
            {googleUser.picture ? <img src={googleUser.picture} alt="" /> : null}
            <div>
              <strong>{googleUser.name}</strong>
              <span>{googleUser.email}</span>
            </div>
            <button className="editor-icon-action" type="button" aria-label="登出 Google 帳戶" onClick={onSignOut}>
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="google-button-slot" ref={googleButtonRef} aria-disabled={!googleClientId} />
        )}
        {googleStatus ? (
          <p className={googleUser && !googleUser.allowed ? "editor-status error" : "editor-status"}>{googleStatus}</p>
        ) : null}
      </div>
    </section>
  );
}

function StatusMessage({ status }: { status: AsyncStatus }) {
  if (!status.message) return null;

  return (
    <p className={`editor-status ${status.phase}`}>
      {status.phase === "error" ? <AlertTriangle size={16} aria-hidden="true" /> : null}
      <span>{status.message}</span>
      {status.url ? (
        <a href={status.url} target="_blank" rel="noreferrer">
          查看 commit
        </a>
      ) : null}
    </p>
  );
}

function EditorCard({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="editor-card">
      <h2>{title}</h2>
      <div className="editor-fields">{children}</div>
    </section>
  );
}

function TextField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="editor-field">
      <span>{label}</span>
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextAreaField({
  label,
  onChange,
  placeholder,
  rows = 3,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  value: string;
}) {
  return (
    <label className="editor-field">
      <span>{label}</span>
      <textarea value={value} placeholder={placeholder} rows={rows} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function StringListEditor({
  addLabel,
  items,
  label,
  multiline = false,
  onChange,
}: {
  addLabel: string;
  items: string[];
  label: string;
  multiline?: boolean;
  onChange: (items: string[]) => void;
}) {
  const updateItem = (index: number, value: string) => {
    onChange(replaceAt(items, index, value));
  };

  return (
    <div className="editor-list-block">
      <div className="editor-list-heading">
        <span>{label}</span>
        <button className="editor-small-action" type="button" onClick={() => onChange([...items, ""])}>
          <Plus size={15} aria-hidden="true" />
          {addLabel}
        </button>
      </div>
      <div className="editor-list">
        {items.map((item, index) => (
          <div className="editor-list-row" key={`${label}-${index}`}>
            {multiline ? (
              <textarea value={item} rows={3} onChange={(event) => updateItem(index, event.target.value)} />
            ) : (
              <input value={item} onChange={(event) => updateItem(index, event.target.value)} />
            )}
            <button
              className="editor-icon-action danger"
              type="button"
              aria-label={`移除${label}`}
              onClick={() => onChange(removeAt(items, index))}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileLinkEditor({
  links,
  onChange,
}: {
  links: ResumeData["profile"]["links"];
  onChange: (links: ResumeData["profile"]["links"]) => void;
}) {
  const updateLink = (index: number, field: keyof ResumeData["profile"]["links"][number], value: string) => {
    const nextLink = {
      ...links[index],
      [field]: field === "icon" ? (value as ResumeLinkIcon) : value,
    };
    onChange(replaceAt(links, index, nextLink));
  };

  return (
    <div className="editor-list-block">
      <div className="editor-list-heading">
        <span>個人連結</span>
        <button
          className="editor-small-action"
          type="button"
          onClick={() => onChange([...links, { href: "", icon: "external", label: "新連結" }])}
        >
          <Plus size={15} aria-hidden="true" />
          新增連結
        </button>
      </div>
      <div className="editor-stack">
        {links.map((link, index) => (
          <article className="editor-nested-card" key={`${link.label}-${index}`}>
            <TextField label="標籤" value={link.label} onChange={(value) => updateLink(index, "label", value)} />
            <TextField label="網址" value={link.href} onChange={(value) => updateLink(index, "href", value)} />
            <label className="editor-field">
              <span>圖示</span>
              <select value={link.icon} onChange={(event: ChangeEvent<HTMLSelectElement>) => updateLink(index, "icon", event.target.value)}>
                {linkIconOptions.map((icon) => (
                  <option value={icon} key={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </label>
            <button className="editor-small-action danger" type="button" onClick={() => onChange(removeAt(links, index))}>
              <Trash2 size={15} aria-hidden="true" />
              移除連結
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function SkillsEditor({
  onChange,
  skills,
}: {
  onChange: (skills: ResumeData["skills"]) => void;
  skills: ResumeData["skills"];
}) {
  const updateSkill = (index: number, nextSkill: ResumeData["skills"][number]) => {
    onChange(replaceAt(skills, index, nextSkill));
  };

  return (
    <div className="editor-stack">
      {skills.map((skill, index) => (
        <article className="editor-nested-card" key={`${skill.title}-${index}`}>
          <TextField label="技能分類" value={skill.title} onChange={(value) => updateSkill(index, { ...skill, title: value })} />
          <StringListEditor
            addLabel="新增技能"
            items={skill.items}
            label="技能項目"
            onChange={(items) => updateSkill(index, { ...skill, items })}
          />
          <button className="editor-small-action danger" type="button" onClick={() => onChange(removeAt(skills, index))}>
            <Trash2 size={15} aria-hidden="true" />
            移除分類
          </button>
        </article>
      ))}
      <button className="editor-small-action" type="button" onClick={() => onChange([...skills, { items: [""], title: "新分類" }])}>
        <Plus size={15} aria-hidden="true" />
        新增技能分類
      </button>
    </div>
  );
}

function TimelineEditor({
  items,
  onAddBullet,
  onRemoveBullet,
  onUpdateBullet,
  onUpdateField,
  onUpdateItems,
  section,
  title,
}: {
  items: TimelineItem[];
  onAddBullet: (section: ResumeSectionKey, itemIndex: number, parentPath?: number[]) => void;
  onRemoveBullet: (section: ResumeSectionKey, itemIndex: number, path: number[]) => void;
  onUpdateBullet: (
    section: ResumeSectionKey,
    itemIndex: number,
    path: number[],
    updater: (bullet: ResumeBullet) => ResumeBullet,
  ) => void;
  onUpdateField: <K extends keyof TimelineItem>(
    section: ResumeSectionKey,
    index: number,
    field: K,
    value: TimelineItem[K],
  ) => void;
  onUpdateItems: (section: ResumeSectionKey, items: TimelineItem[]) => void;
  section: ResumeSectionKey;
  title: string;
}) {
  return (
    <section className="editor-card timeline-editor-section">
      <div className="timeline-editor-heading">
        <h2>{title}</h2>
        <button className="editor-small-action" type="button" onClick={() => onUpdateItems(section, [...items, createEmptyTimelineItem()])}>
          <Plus size={15} aria-hidden="true" />
          新增項目
        </button>
      </div>

      <div className="editor-stack">
        {items.map((item, index) => (
          <article className="editor-timeline-card" key={`${item.title}-${index}`}>
            <div className="editor-timeline-head">
              <h3>{item.title || "未命名項目"}</h3>
              <button className="editor-small-action danger" type="button" onClick={() => onUpdateItems(section, removeAt(items, index))}>
                <Trash2 size={15} aria-hidden="true" />
                移除項目
              </button>
            </div>
            <div className="editor-two-column">
              <TextField label="標題" value={item.title} onChange={(value) => onUpdateField(section, index, "title", value)} />
              <TextField label="圖片路徑" value={item.image ?? ""} onChange={(value) => onUpdateField(section, index, "image", value)} />
              <TextField label="圖片替代文字" value={item.imageAlt} onChange={(value) => onUpdateField(section, index, "imageAlt", value)} />
              <TextField label="圖片連結" value={item.imageHref ?? ""} onChange={(value) => onUpdateField(section, index, "imageHref", value)} />
            </div>
            <div className="editor-list-heading">
              <span>重點條列</span>
              <button className="editor-small-action" type="button" onClick={() => onAddBullet(section, index)}>
                <Plus size={15} aria-hidden="true" />
                新增條列
              </button>
            </div>
            <BulletListEditor
              bullets={item.bullets}
              onAddChild={(path) => onAddBullet(section, index, path)}
              onRemove={(path) => onRemoveBullet(section, index, path)}
              onUpdate={(path, updater) => onUpdateBullet(section, index, path, updater)}
            />
          </article>
        ))}
      </div>
    </section>
  );
}

function BulletListEditor({
  bullets,
  onAddChild,
  onRemove,
  onUpdate,
  pathPrefix = [],
}: {
  bullets: ResumeBullet[];
  onAddChild: (path: number[]) => void;
  onRemove: (path: number[]) => void;
  onUpdate: (path: number[], updater: (bullet: ResumeBullet) => ResumeBullet) => void;
  pathPrefix?: number[];
}) {
  return (
    <div className="bullet-editor-list">
      {bullets.map((bullet, index) => {
        const path = [...pathPrefix, index];

        return (
          <div className="bullet-editor-item" key={path.join("-")}>
            <TextAreaField
              label="內容"
              rows={2}
              value={bullet.text}
              onChange={(value) => onUpdate(path, (current) => ({ ...current, text: value }))}
            />
            <TextField
              label="連結"
              value={bullet.href ?? ""}
              onChange={(value) =>
                onUpdate(path, (current) => {
                  const next = { ...current };
                  if (value) next.href = value;
                  else delete next.href;
                  return next;
                })
              }
            />
            <div className="bullet-editor-actions">
              <button className="editor-small-action" type="button" onClick={() => onAddChild(path)}>
                <Plus size={15} aria-hidden="true" />
                子條列
              </button>
              <button className="editor-small-action danger" type="button" onClick={() => onRemove(path)}>
                <Trash2 size={15} aria-hidden="true" />
                移除
              </button>
            </div>
            {bullet.children?.length ? (
              <BulletListEditor
                bullets={bullet.children}
                pathPrefix={path}
                onAddChild={onAddChild}
                onRemove={onRemove}
                onUpdate={onUpdate}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default ResumeEditorPage;
