import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  CloudUpload,
  Download,
  ExternalLink,
  FileJson,
  Link2,
  LogIn,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { type ChangeEvent, type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  cloneResume,
  getResumeJson,
  initialResume,
  isResumeData,
  loadResumeDraftFromStorage,
  localDraftStorageKey,
  platformSyncStorageKey,
} from "./resumeDraft";
import "./resumeEditor.css";
import {
  clonePortfolio,
  getPortfolioJson,
  initialPortfolio,
  isPortfolioData,
  loadPortfolioDraftFromStorage,
  localPortfolioDraftStorageKey,
} from "./portfolioDraft";
import {
  buildResumePlatformSyncPackages,
  getResumePlatformClipboardText,
  getResumePlatformSyncJson,
  getResumeSyncSectionText,
  type ResumePlatformSyncPackage,
  type ResumeSyncPlatformId,
  type ResumeSyncSectionKey,
} from "./resumePlatformSync";
import type { PortfolioData, Project, ProjectScreenshot } from "./types/portfolio";
import type { ResumeBullet, ResumeData, ResumeLinkIcon, TimelineItem } from "./types/resume";

type ResumeSectionKey = "workExperience" | "education";
type SavePhase = "idle" | "loading" | "saving" | "success" | "error";

type AsyncStatus = {
  phase: SavePhase;
  message: string;
};

type PlatformAuthProfile = {
  email?: string;
  name?: string;
  picture?: string;
};

type PlatformAuthState = {
  connectedAt?: string;
  expiresAt?: string;
  message: string;
  mode: "oauth" | "external-login";
  platform: ResumeSyncPlatformId;
  platformLabel: string;
  profile?: PlatformAuthProfile;
  status: "connected" | "error" | "external_login" | "external_login_started" | "not_configured" | "ready";
};

type PlatformAuthStatus = {
  phase: SavePhase;
  message: string;
  platforms: PlatformAuthState[];
};

type EditorInitialState = {
  draft: ResumeData;
  status: AsyncStatus;
};

type PortfolioEditorInitialState = {
  draft: PortfolioData;
  status: AsyncStatus;
};

type ProjectGeminiRequest = {
  caseStudyUrl: string;
  category: string;
  demoUrl: string;
  readmeText: string;
  readmeUrl: string;
  repoUrl: string;
  screenshotAlt: string;
  screenshotSrc: string;
  title: string;
};

type GeminiGeneratedProject = Pick<Project, "category" | "description" | "summary" | "tags" | "title" | "year">;

const linkIconOptions: ResumeLinkIcon[] = ["external", "github", "linkedin", "mail"];
const manualSyncTextsStorageKey = "resume-editor-platform-sync-manual-texts-v1";
type ManualSyncTextKey = `${ResumeSyncPlatformId}:${ResumeSyncSectionKey}`;
type ManualSyncTexts = Partial<Record<ManualSyncTextKey, string>>;

const defaultPlatformResumeUrls: Record<ResumeSyncPlatformId, string> = {
  "104": "https://pda.104.com.tw/profile",
  linkedin: "https://www.linkedin.com/in/",
  cake: "https://www.cake.me/",
};

function getManualSyncTextKey(platform: ResumeSyncPlatformId, section: ResumeSyncSectionKey): ManualSyncTextKey {
  return `${platform}:${section}` as ManualSyncTextKey;
}

function applyManualSyncTexts(packages: ResumePlatformSyncPackage[], manualSyncTexts: ManualSyncTexts) {
  return packages.map((syncPackage) => ({
    ...syncPackage,
    sections: syncPackage.sections.map((section) => {
      const manualText = manualSyncTexts[getManualSyncTextKey(syncPackage.platform, section.key)];

      if (manualText === undefined) return section;

      return {
        ...section,
        manualText,
        preview: manualText,
      };
    }),
  }));
}

function isManualSyncTexts(value: unknown): value is ManualSyncTexts {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  return Object.entries(value).every(
    ([key, entryValue]) =>
      /^(104|linkedin|cake):(profile|summary|skills|workExperience|education|links)$/.test(key) &&
      typeof entryValue === "string",
  );
}

function getInitialManualSyncTexts(): ManualSyncTexts {
  if (typeof window === "undefined") return {};

  try {
    const storedManualSyncTexts = window.localStorage.getItem(manualSyncTextsStorageKey);
    if (!storedManualSyncTexts) return {};

    const parsedManualSyncTexts = JSON.parse(storedManualSyncTexts) as unknown;
    return isManualSyncTexts(parsedManualSyncTexts) ? parsedManualSyncTexts : {};
  } catch {
    return {};
  }
}

function findProfileLink(draft: ResumeData, pattern: RegExp) {
  return draft.profile.links.find((link) => pattern.test(link.href) || pattern.test(link.label))?.href;
}

function getPlatformResumeUrls(draft: ResumeData): Record<ResumeSyncPlatformId, string> {
  const sourceUrl = draft.meta.sourceUrl.trim();
  const cakeUrl = /cake\.me/i.test(sourceUrl) ? sourceUrl : findProfileLink(draft, /cake\.me/i);

  return {
    "104": import.meta.env.VITE_RESUME_SYNC_104_URL?.trim() || defaultPlatformResumeUrls["104"],
    linkedin:
      import.meta.env.VITE_RESUME_SYNC_LINKEDIN_URL?.trim() ||
      findProfileLink(draft, /linkedin\.com/i) ||
      defaultPlatformResumeUrls.linkedin,
    cake: import.meta.env.VITE_RESUME_SYNC_CAKE_URL?.trim() || cakeUrl || defaultPlatformResumeUrls.cake,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isResumeSyncPlatformId(value: unknown): value is ResumeSyncPlatformId {
  return value === "104" || value === "linkedin" || value === "cake";
}

function isPlatformAuthState(value: unknown): value is PlatformAuthState {
  if (!isRecord(value)) return false;
  if (!isResumeSyncPlatformId(value.platform)) return false;

  return (
    typeof value.platformLabel === "string" &&
    (value.mode === "oauth" || value.mode === "external-login") &&
    typeof value.status === "string" &&
    typeof value.message === "string"
  );
}

function getPlatformAuthStates(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.platforms)) return [];
  return value.platforms.filter(isPlatformAuthState);
}

function getPlatformAuthStartUrl(authEndpoint: string, platform: ResumeSyncPlatformId) {
  const path = `${authEndpoint.replace(/\/+$/, "")}/${platform}/start`;
  if (typeof window === "undefined") return path;

  const url = new URL(path, window.location.origin);
  url.searchParams.set("returnTo", `${window.location.pathname}${window.location.search}#resume-editor`);
  return url.toString();
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

function getBulletLineContent(bullet: ResumeBullet) {
  if (!bullet.href) return bullet.text;
  return `[${bullet.text}](${bullet.href})`;
}

function serializeBullets(bullets: ResumeBullet[], level = 0): string {
  return bullets
    .flatMap((bullet) => {
      const currentLine = `${"\t".repeat(level)}${getBulletLineContent(bullet)}`;
      const childLines = bullet.children?.length ? serializeBullets(bullet.children, level + 1).split("\n") : [];

      return [currentLine, ...childLines];
    })
    .join("\n");
}

function getIndentedLineParts(line: string) {
  let level = 0;
  let index = 0;

  while (index < line.length) {
    if (line[index] === "\t") {
      level += 1;
      index += 1;
      continue;
    }

    if (line.slice(index, index + 4) === "    ") {
      level += 1;
      index += 4;
      continue;
    }

    break;
  }

  return {
    content: line.slice(index).replace(/^[-*•]\s+/, "").trim(),
    level,
  };
}

function parseBulletContent(content: string): ResumeBullet {
  const markdownLink = content.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if (!markdownLink) return { text: content };

  return {
    text: markdownLink[1].trim(),
    href: markdownLink[2].trim(),
  };
}

function parseIndentedBullets(value: string): ResumeBullet[] {
  const roots: ResumeBullet[] = [];
  const latestBulletByLevel: ResumeBullet[] = [];

  value.split(/\r?\n/).forEach((line) => {
    const { content, level: rawLevel } = getIndentedLineParts(line);
    if (!content) return;

    const level = Math.min(rawLevel, latestBulletByLevel.length);
    const bullet = parseBulletContent(content);

    if (level === 0) {
      roots.push(bullet);
    } else {
      const parent = latestBulletByLevel[level - 1];
      parent.children = [...(parent.children ?? []), bullet];
    }

    latestBulletByLevel[level] = bullet;
    latestBulletByLevel.length = level + 1;
  });

  return roots;
}

function serializeStringItems(items: string[]) {
  return items.join("\n");
}

function parseIndentedStringItems(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => getIndentedLineParts(line).content)
    .filter(Boolean);
}

function haveSameStringItems(left: string[], right: string[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function serializeSkills(skills: ResumeData["skills"]) {
  return skills
    .flatMap((skill) => [skill.title, ...skill.items.map((item) => `\t${item}`)])
    .join("\n");
}

function parseIndentedSkills(value: string): ResumeData["skills"] {
  const skills: ResumeData["skills"] = [];
  let currentSkill: ResumeData["skills"][number] | null = null;

  value.split(/\r?\n/).forEach((line) => {
    const { content, level } = getIndentedLineParts(line);
    if (!content) return;

    if (level === 0) {
      currentSkill = { title: content, items: [] };
      skills.push(currentSkill);
      return;
    }

    if (!currentSkill) {
      currentSkill = { title: "未分類技能", items: [] };
      skills.push(currentSkill);
    }

    currentSkill.items = [...currentSkill.items, content];
  });

  return skills;
}

function normalizeSkillsForComparison(skills: ResumeData["skills"]) {
  return skills.map((skill) => ({
    title: skill.title,
    items: skill.items,
  }));
}

function haveSameSkills(left: ResumeData["skills"], right: ResumeData["skills"]) {
  return JSON.stringify(normalizeSkillsForComparison(left)) === JSON.stringify(normalizeSkillsForComparison(right));
}

function normalizeBulletsForComparison(bullets: ResumeBullet[]): ResumeBullet[] {
  return bullets.map((bullet) => ({
    text: bullet.text,
    ...(bullet.href ? { href: bullet.href } : {}),
    ...(bullet.children?.length ? { children: normalizeBulletsForComparison(bullet.children) } : {}),
  }));
}

function haveSameBulletShape(left: ResumeBullet[], right: ResumeBullet[]) {
  return JSON.stringify(normalizeBulletsForComparison(left)) === JSON.stringify(normalizeBulletsForComparison(right));
}

function outdentLine(line: string) {
  if (line.startsWith("\t")) return line.slice(1);
  if (line.startsWith("    ")) return line.slice(4);
  return line;
}

function updateTextAreaSelection(textarea: HTMLTextAreaElement, start: number, end: number) {
  window.requestAnimationFrame(() => {
    textarea.selectionStart = start;
    textarea.selectionEnd = end;
  });
}

function handleIndentedTextAreaKeyDown(
  event: KeyboardEvent<HTMLTextAreaElement>,
  value: string,
  onChange: (value: string) => void,
) {
  if (event.key !== "Tab") return;

  event.preventDefault();

  const textarea = event.currentTarget;
  const { selectionStart, selectionEnd } = textarea;
  const hasSelection = selectionStart !== selectionEnd;

  if (!hasSelection) {
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const currentLine = value.slice(lineStart, selectionStart);

    if (event.shiftKey) {
      const outdentedLine = outdentLine(value.slice(lineStart, value.indexOf("\n", lineStart) === -1 ? value.length : value.indexOf("\n", lineStart)));
      const lineEnd = value.indexOf("\n", lineStart) === -1 ? value.length : value.indexOf("\n", lineStart);
      const removedLength = lineEnd - lineStart - outdentedLine.length;
      const nextValue = `${value.slice(0, lineStart)}${outdentedLine}${value.slice(lineEnd)}`;
      const nextCursor = selectionStart - Math.min(removedLength, currentLine.length);

      onChange(nextValue);
      updateTextAreaSelection(textarea, nextCursor, nextCursor);
      return;
    }

    const nextValue = `${value.slice(0, selectionStart)}\t${value.slice(selectionEnd)}`;
    const nextCursor = selectionStart + 1;

    onChange(nextValue);
    updateTextAreaSelection(textarea, nextCursor, nextCursor);
    return;
  }

  const blockStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const blockEndCandidate = value.indexOf("\n", selectionEnd);
  const blockEnd = blockEndCandidate === -1 ? value.length : blockEndCandidate;
  const block = value.slice(blockStart, blockEnd);
  const lines = block.split("\n");
  const nextBlock = event.shiftKey ? lines.map(outdentLine).join("\n") : lines.map((line) => `\t${line}`).join("\n");
  const nextValue = `${value.slice(0, blockStart)}${nextBlock}${value.slice(blockEnd)}`;
  const firstLineDelta = nextBlock.split("\n")[0].length - lines[0].length;
  const totalDelta = nextBlock.length - block.length;

  onChange(nextValue);
  updateTextAreaSelection(textarea, Math.max(blockStart, selectionStart + firstLineDelta), selectionEnd + totalDelta);
}

function getInitialEditorState(): EditorInitialState {
  const fallbackStatus = { phase: "idle", message: "" } satisfies AsyncStatus;

  const loadedDraft = loadResumeDraftFromStorage();
  if (loadedDraft.source === "stored") {
    return {
      draft: loadedDraft.draft,
      status: { phase: "success", message: "已載入瀏覽器保存的本機草稿。" },
    };
  }

  if (loadedDraft.source === "invalid") {
    return {
      draft: loadedDraft.draft,
      status: { phase: "error", message: "本機草稿格式不符合履歷資料，已改用內建履歷。" },
    };
  }

  if (loadedDraft.source === "unreadable") {
    return {
      draft: loadedDraft.draft,
      status: { phase: "error", message: "無法讀取本機草稿，已改用內建履歷。" },
    };
  }

  return { draft: loadedDraft.draft, status: fallbackStatus };
}

function getInitialPortfolioEditorState(): PortfolioEditorInitialState {
  const fallbackStatus = { phase: "idle", message: "" } satisfies AsyncStatus;

  const loadedDraft = loadPortfolioDraftFromStorage();
  if (loadedDraft.source === "stored") {
    return {
      draft: loadedDraft.draft,
      status: { phase: "success", message: "已載入瀏覽器保存的作品草稿。" },
    };
  }

  if (loadedDraft.source === "invalid") {
    return {
      draft: loadedDraft.draft,
      status: { phase: "error", message: "本機作品草稿格式不符合資料結構，已改用內建作品。" },
    };
  }

  if (loadedDraft.source === "unreadable") {
    return {
      draft: loadedDraft.draft,
      status: { phase: "error", message: "無法讀取本機作品草稿，已改用內建作品。" },
    };
  }

  return { draft: loadedDraft.draft, status: fallbackStatus };
}

function downloadTextFile(fileName: string, text: string) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function writeClipboardText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // Fall back to the selection-based copy path below.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

async function readResumeFile(file: File) {
  const text = await file.text();
  const parsed = JSON.parse(text) as unknown;

  if (!isResumeData(parsed)) {
    throw new Error("匯入的 JSON 格式不符合目前履歷資料結構。");
  }

  return parsed;
}

async function readPortfolioFile(file: File) {
  const text = await file.text();
  const parsed = JSON.parse(text) as unknown;

  if (!isPortfolioData(parsed)) {
    throw new Error("匯入的 JSON 格式不符合目前作品資料結構。");
  }

  return parsed;
}

function createEmptyProject(): Project {
  const now = new Date().toISOString();

  return {
    title: "新專案",
    summary: "",
    description: "",
    tags: [],
    category: "互動網頁",
    year: String(new Date().getFullYear()),
    createdAt: now,
    updatedAt: now,
    links: {
      demo: "",
      repo: "",
      caseStudy: "",
    },
  };
}

function createProjectFromGemini(request: ProjectGeminiRequest, generated: GeminiGeneratedProject, repoUrl: string): Project {
  const now = new Date().toISOString();
  const screenshotSrc = request.screenshotSrc.trim();
  const screenshotAlt = request.screenshotAlt.trim() || `${generated.title} 作品截圖`;
  const screenshot = screenshotSrc ? { src: screenshotSrc, alt: screenshotAlt } : undefined;

  return {
    title: generated.title || request.title.trim() || "未命名專案",
    summary: generated.summary,
    description: generated.description,
    tags: generated.tags,
    category: generated.category || request.category.trim() || "互動網頁",
    year: generated.year || String(new Date().getFullYear()),
    createdAt: now,
    updatedAt: now,
    ...(screenshot ? { screenshot, screenshots: [screenshot] } : {}),
    links: {
      demo: request.demoUrl.trim(),
      repo: repoUrl || request.repoUrl.trim(),
      caseStudy: request.caseStudyUrl.trim(),
    },
  };
}

function normalizeGeneratedProject(value: unknown): GeminiGeneratedProject {
  if (!isRecord(value)) {
    throw new Error("Gemini 回傳的 project 格式不正確。");
  }

  return {
    title: typeof value.title === "string" ? value.title.trim() : "",
    summary: typeof value.summary === "string" ? value.summary.trim() : "",
    description: typeof value.description === "string" ? value.description.trim() : "",
    tags: Array.isArray(value.tags) ? value.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
    category: typeof value.category === "string" ? value.category.trim() : "",
    year: typeof value.year === "string" ? value.year.trim() : "",
  };
}

function ResumeEditorPage({
  onBackHome,
  onOpenResume,
  onPortfolioChange,
}: {
  onBackHome: () => void;
  onOpenResume: () => void;
  onPortfolioChange: (portfolio: PortfolioData) => void;
}) {
  const [initialState] = useState(getInitialEditorState);
  const [initialPortfolioState] = useState(getInitialPortfolioEditorState);
  const [draft, setDraft] = useState<ResumeData>(() => initialState.draft);
  const [status, setStatus] = useState<AsyncStatus>(() => initialState.status);
  const [portfolioDraft, setPortfolioDraft] = useState<PortfolioData>(() => initialPortfolioState.draft);
  const [portfolioStatus, setPortfolioStatus] = useState<AsyncStatus>(() => initialPortfolioState.status);
  const [platformSyncStatus, setPlatformSyncStatus] = useState<AsyncStatus>({ phase: "idle", message: "" });
  const [platformAuthStatus, setPlatformAuthStatus] = useState<PlatformAuthStatus>({
    phase: "idle",
    message: "",
    platforms: [],
  });
  const [selectedPlatformId, setSelectedPlatformId] = useState<ResumeSyncPlatformId>("104");
  const [manualSyncTexts, setManualSyncTexts] = useState<ManualSyncTexts>(getInitialManualSyncTexts);
  const [lastSyncDraftAt, setLastSyncDraftAt] = useState(() => new Date().toISOString());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const portfolioFileInputRef = useRef<HTMLInputElement>(null);
  const platformAuthEndpoint = import.meta.env.VITE_RESUME_AUTH_ENDPOINT?.trim() || "/api/resume-platform-auth";
  const syncBridgeEndpoint = import.meta.env.VITE_RESUME_SYNC_ENDPOINT?.trim();
  const portfolioGeminiEndpoint = import.meta.env.VITE_PORTFOLIO_GEMINI_ENDPOINT?.trim() || "/api/portfolio-gemini";
  const platformResumeUrls = useMemo(() => getPlatformResumeUrls(draft), [draft]);
  const baseSyncPackages = useMemo(
    () => buildResumePlatformSyncPackages(draft, lastSyncDraftAt),
    [draft, lastSyncDraftAt],
  );
  const syncPackages = useMemo(
    () => applyManualSyncTexts(baseSyncPackages, manualSyncTexts),
    [baseSyncPackages, manualSyncTexts],
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(localDraftStorageKey, getResumeJson(draft));
    } catch {
      setStatus({ phase: "error", message: "無法保存本機草稿，請改用下載 JSON 備份。" });
    }
  }, [draft]);

  useEffect(() => {
    try {
      window.localStorage.setItem(localPortfolioDraftStorageKey, getPortfolioJson(portfolioDraft));
      onPortfolioChange(portfolioDraft);
    } catch {
      setPortfolioStatus({ phase: "error", message: "無法保存作品草稿，請改用下載 JSON 備份。" });
    }
  }, [onPortfolioChange, portfolioDraft]);

  useEffect(() => {
    setLastSyncDraftAt(new Date().toISOString());
  }, [draft]);

  useEffect(() => {
    try {
      window.localStorage.setItem(platformSyncStorageKey, getResumePlatformSyncJson(syncPackages));
    } catch {
      setPlatformSyncStatus({ phase: "error", message: "無法保存平台同步資料包，請改用複製或下載。" });
    }
  }, [syncPackages]);

  useEffect(() => {
    try {
      if (Object.keys(manualSyncTexts).length === 0) {
        window.localStorage.removeItem(manualSyncTextsStorageKey);
        return;
      }

      window.localStorage.setItem(manualSyncTextsStorageKey, JSON.stringify(manualSyncTexts));
    } catch {
      setPlatformSyncStatus({ phase: "error", message: "無法儲存同步面板手動覆寫，請先同步或下載備份。" });
    }
  }, [manualSyncTexts]);

  useEffect(() => {
    const refreshPlatformAuthStatus = async () => {
      setPlatformAuthStatus((current) => ({ ...current, phase: "loading", message: "正在讀取平台登入狀態。" }));

      try {
        const response = await fetch(platformAuthEndpoint);
        const payload = (await response.json()) as unknown;

        if (!response.ok) {
          throw new Error(isRecord(payload) && typeof payload.message === "string" ? payload.message : `登入 API 回應 ${response.status}`);
        }

        setPlatformAuthStatus({
          phase: "success",
          message: "已更新平台登入狀態。",
          platforms: getPlatformAuthStates(payload),
        });
      } catch (error) {
        setPlatformAuthStatus((current) => ({
          ...current,
          phase: "error",
          message: error instanceof Error ? error.message : "無法讀取平台登入狀態。",
        }));
      }
    };

    void refreshPlatformAuthStatus();
  }, [platformAuthEndpoint]);

  const refreshPlatformAuthStatus = async () => {
    setPlatformAuthStatus((current) => ({ ...current, phase: "loading", message: "正在讀取平台登入狀態。" }));

    try {
      const response = await fetch(platformAuthEndpoint);
      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        throw new Error(isRecord(payload) && typeof payload.message === "string" ? payload.message : `登入 API 回應 ${response.status}`);
      }

      setPlatformAuthStatus({
        phase: "success",
        message: "已更新平台登入狀態。",
        platforms: getPlatformAuthStates(payload),
      });
    } catch (error) {
      setPlatformAuthStatus((current) => ({
        ...current,
        phase: "error",
        message: error instanceof Error ? error.message : "無法讀取平台登入狀態。",
      }));
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setStatus({ phase: "loading", message: "正在匯入本機履歷 JSON。" });
    try {
      const importedResume = await readResumeFile(file);
      setDraft(cloneResume(importedResume));
      setManualSyncTexts({});
      setStatus({ phase: "success", message: "已匯入本機履歷 JSON。" });
    } catch (error) {
      setStatus({
        phase: "error",
        message: error instanceof Error ? error.message : "匯入履歷 JSON 失敗。",
      });
    } finally {
      input.value = "";
    }
  };

  const handleCopyJson = async () => {
    try {
      await writeClipboardText(getResumeJson(draft));
      setStatus({ phase: "success", message: "已複製目前履歷 JSON。" });
    } catch {
      setStatus({ phase: "error", message: "無法複製 JSON，請改用下載檔案。" });
    }
  };

  const handleDownloadJson = () => {
    try {
      downloadTextFile("resume.json", getResumeJson(draft));
      setStatus({ phase: "success", message: "已下載本機履歷 JSON。" });
    } catch {
      setStatus({ phase: "error", message: "無法下載 JSON，請改用複製內容。" });
    }
  };

  const handleResetDraft = () => {
    const resetDraft = cloneResume(initialResume);
    setDraft(resetDraft);
    setManualSyncTexts({});
    setStatus({ phase: "success", message: "已重設為專案內建履歷資料。" });
  };

  const handlePortfolioImportClick = () => {
    portfolioFileInputRef.current?.click();
  };

  const handleImportPortfolioJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setPortfolioStatus({ phase: "loading", message: "正在匯入作品 JSON。" });
    try {
      const importedPortfolio = await readPortfolioFile(file);
      setPortfolioDraft(clonePortfolio(importedPortfolio));
      setPortfolioStatus({ phase: "success", message: "已匯入作品 JSON。" });
    } catch (error) {
      setPortfolioStatus({
        phase: "error",
        message: error instanceof Error ? error.message : "匯入作品 JSON 失敗。",
      });
    } finally {
      input.value = "";
    }
  };

  const handleCopyPortfolioJson = async () => {
    try {
      await writeClipboardText(getPortfolioJson(portfolioDraft));
      setPortfolioStatus({ phase: "success", message: "已複製目前作品 JSON。" });
    } catch {
      setPortfolioStatus({ phase: "error", message: "無法複製作品 JSON，請改用下載檔案。" });
    }
  };

  const handleDownloadPortfolioJson = () => {
    try {
      downloadTextFile("portfolio.json", getPortfolioJson(portfolioDraft));
      setPortfolioStatus({ phase: "success", message: "已下載作品 JSON。" });
    } catch {
      setPortfolioStatus({ phase: "error", message: "無法下載作品 JSON，請改用複製內容。" });
    }
  };

  const handleResetPortfolioDraft = () => {
    setPortfolioDraft(clonePortfolio(initialPortfolio));
    setPortfolioStatus({ phase: "success", message: "已重設為專案內建作品資料。" });
  };

  const updateProjects = (projects: Project[]) => {
    setPortfolioDraft((current) => ({
      ...current,
      projects,
    }));
  };

  const updateProject = (projectIndex: number, project: Project) => {
    setPortfolioDraft((current) => ({
      ...current,
      projects: replaceAt(current.projects, projectIndex, project),
    }));
  };

  const handleAddEmptyProject = () => {
    setPortfolioDraft((current) => ({
      ...current,
      projects: [createEmptyProject(), ...current.projects],
    }));
    setPortfolioStatus({ phase: "success", message: "已新增空白專案。" });
  };

  const handleGenerateProjectFromReadme = async (request: ProjectGeminiRequest) => {
    setPortfolioStatus({ phase: "saving", message: "正在讀取 README 並請 Gemini 產生作品文案。" });

    try {
      const response = await fetch(portfolioGeminiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });
      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        throw new Error(isRecord(payload) && typeof payload.message === "string" ? payload.message : `Gemini API 回應 ${response.status}`);
      }

      if (!isRecord(payload)) {
        throw new Error("Gemini API 回傳格式不正確。");
      }

      const generatedProject = normalizeGeneratedProject(payload.project);
      const repoUrl = typeof payload.repoUrl === "string" ? payload.repoUrl : request.repoUrl.trim();
      const nextProject = createProjectFromGemini(request, generatedProject, repoUrl);

      setPortfolioDraft((current) => ({
        ...current,
        projects: [nextProject, ...current.projects],
      }));
      setPortfolioStatus({
        phase: "success",
        message: `已新增 ${nextProject.title}，文案由 README 與 Gemini 產生。`,
      });
    } catch (error) {
      setPortfolioStatus({
        phase: "error",
        message: error instanceof Error ? error.message : "Gemini 作品文案產生失敗。",
      });
    }
  };

  const updateManualSyncText = (
    platform: ResumeSyncPlatformId,
    section: ResumeSyncSectionKey,
    value: string,
  ) => {
    setManualSyncTexts((current) => ({
      ...current,
      [getManualSyncTextKey(platform, section)]: value,
    }));
  };

  const resetManualSyncText = (platform: ResumeSyncPlatformId, section: ResumeSyncSectionKey) => {
    setManualSyncTexts((current) => {
      const nextManualSyncTexts = { ...current };
      delete nextManualSyncTexts[getManualSyncTextKey(platform, section)];
      return nextManualSyncTexts;
    });
  };

  const resetAllManualSyncTexts = () => {
    setManualSyncTexts({});
    setPlatformSyncStatus({ phase: "success", message: "已清除同步面板的手動覆寫。" });
  };

  const handleCopyPlatformSection = async (platformId: ResumeSyncPlatformId, sectionKey: ResumeSyncSectionKey) => {
    const syncPackage = syncPackages.find((item) => item.platform === platformId);
    const section = syncPackage?.sections.find((item) => item.key === sectionKey);
    if (!syncPackage || !section) return;

    try {
      await writeClipboardText(getResumeSyncSectionText(section));
      setPlatformSyncStatus({
        phase: "success",
        message: `已複製 ${syncPackage.platformLabel} / ${section.targetLabel} 區塊內容。`,
      });
    } catch {
      setPlatformSyncStatus({ phase: "error", message: "無法複製此區塊，請改用文字框手動選取。" });
    }
  };

  const handleCopySelectedPlatformSync = async () => {
    const selectedPackage = syncPackages.find((syncPackage) => syncPackage.platform === selectedPlatformId);
    if (!selectedPackage) return;

    try {
      await writeClipboardText(getResumePlatformClipboardText([selectedPackage]));
      setPlatformSyncStatus({ phase: "success", message: `已複製 ${selectedPackage.platformLabel} 的履歷同步內容。` });
    } catch {
      setPlatformSyncStatus({ phase: "error", message: "無法複製平台同步內容，請改用下載 JSON。" });
    }
  };

  const handleDownloadPlatformSync = () => {
    try {
      downloadTextFile("resume-platform-sync.json", getResumePlatformSyncJson(syncPackages));
      setPlatformSyncStatus({ phase: "success", message: "已下載 104 / LinkedIn / Cake 同步資料包。" });
    } catch {
      setPlatformSyncStatus({ phase: "error", message: "無法下載同步資料包，請改用複製內容。" });
    }
  };

  const handlePushPlatformSync = async () => {
    const syncJson = getResumePlatformSyncJson(syncPackages);

    if (!syncBridgeEndpoint) {
      try {
        await writeClipboardText(syncJson);
        setPlatformSyncStatus({
          phase: "success",
          message: "尚未設定同步 API endpoint；已複製全平台同步資料包。",
        });
      } catch {
        setPlatformSyncStatus({ phase: "error", message: "尚未設定同步 API endpoint，且無法複製同步資料包。" });
      }
      return;
    }

    setPlatformSyncStatus({ phase: "saving", message: "正在送出同步資料包。" });

    try {
      const response = await fetch(syncBridgeEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: syncJson,
      });

      if (!response.ok) {
        throw new Error(`同步 API 回應 ${response.status}`);
      }

      setPlatformSyncStatus({ phase: "success", message: "已送出 104 / LinkedIn / Cake 同步資料包。" });
    } catch (error) {
      setPlatformSyncStatus({
        phase: "error",
        message: error instanceof Error ? error.message : "同步 API 送出失敗。",
      });
    }
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

  const updateTimelineBullets = (section: ResumeSectionKey, itemIndex: number, bullets: ResumeBullet[]) => {
    setDraft((current) => {
      const items = current[section].map((item, index) =>
        index === itemIndex
          ? {
              ...item,
              bullets,
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
          <h1>本地編輯履歷</h1>
        </div>
        <div className="resume-editor-toolbar-actions">
          <button className="editor-secondary-action" type="button" onClick={onOpenResume}>
            查看履歷
            <ExternalLink size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="resume-editor-shell">
        <section className="editor-local-panel" aria-label="本地履歷編輯">
          <div className="editor-local-copy">
            <span className="editor-local-badge allowed">
              <ShieldCheck size={18} aria-hidden="true" />
              離線模式
            </span>
            <h2>本機履歷草稿</h2>
            <p>
              不需要登入或 token；變更會保存在此瀏覽器，可匯入、複製或下載為 <code>resume.json</code>。
            </p>
          </div>
          <div className="editor-local-actions">
            <button className="editor-secondary-action" type="button" onClick={handleImportClick}>
              <Upload size={18} aria-hidden="true" />
              匯入 JSON
            </button>
            <button className="editor-secondary-action" type="button" onClick={handleCopyJson}>
              <FileJson size={18} aria-hidden="true" />
              複製 JSON
            </button>
            <button className="editor-primary-action" type="button" onClick={handleDownloadJson}>
              <Download size={18} aria-hidden="true" />
              下載 JSON
            </button>
            <button className="editor-secondary-action" type="button" onClick={handleResetDraft}>
              <RotateCcw size={18} aria-hidden="true" />
              重設
            </button>
          </div>
          <input
            ref={fileInputRef}
            className="editor-file-input"
            type="file"
            accept="application/json,.json"
            onChange={handleImportJson}
          />
          <StatusMessage status={status} />
        </section>

        <PlatformSyncPanel
          authEndpoint={platformAuthEndpoint}
          authStatus={platformAuthStatus}
          manualSyncTexts={manualSyncTexts}
          platformResumeUrls={platformResumeUrls}
          packages={syncPackages}
          selectedPlatformId={selectedPlatformId}
          status={platformSyncStatus}
          syncBridgeEndpoint={syncBridgeEndpoint}
          onCopySelected={handleCopySelectedPlatformSync}
          onCopySection={handleCopyPlatformSection}
          onDownloadAll={handleDownloadPlatformSync}
          onPlatformChange={setSelectedPlatformId}
          onPushAll={handlePushPlatformSync}
          onRefreshAuthStatus={refreshPlatformAuthStatus}
          onResetAllManualTexts={resetAllManualSyncTexts}
          onResetSectionText={resetManualSyncText}
          onUpdateSectionText={updateManualSyncText}
        />

        <ProjectManagementPanel
          geminiEndpoint={portfolioGeminiEndpoint}
          portfolio={portfolioDraft}
          status={portfolioStatus}
          onAddEmptyProject={handleAddEmptyProject}
          onCopyJson={handleCopyPortfolioJson}
          onDownloadJson={handleDownloadPortfolioJson}
          onGenerateProject={handleGenerateProjectFromReadme}
          onImportClick={handlePortfolioImportClick}
          onResetPortfolio={handleResetPortfolioDraft}
          onUpdateProject={updateProject}
          onUpdateProjects={updateProjects}
        />

        <input
          ref={portfolioFileInputRef}
          className="editor-file-input"
          type="file"
          accept="application/json,.json"
          onChange={handleImportPortfolioJson}
        />

        <section className="resume-editor-grid" aria-label="履歷編輯表單">
          <EditorCard title="頁面資訊">
            <TextField label="工具列標籤" value={draft.meta.eyebrow} onChange={(value) => updateMeta("eyebrow", value)} />
            <TextField label="頁面標題" value={draft.meta.title} onChange={(value) => updateMeta("title", value)} />
            <TextField label="參考來源網址" value={draft.meta.sourceUrl} onChange={(value) => updateMeta("sourceUrl", value)} />
            <TextField label="照片網址" value={draft.meta.profileImage} onChange={(value) => updateMeta("profileImage", value)} />
          </EditorCard>

          <EditorCard title="個人資料">
            <TextField label="姓名" value={draft.profile.name} onChange={(value) => updateProfile("name", value)} />
            <TextField label="角色" value={draft.profile.role} onChange={(value) => updateProfile("role", value)} />
            <TextField label="地點" value={draft.profile.location} onChange={(value) => updateProfile("location", value)} />
            <ProfileSummaryEditor items={draft.profile.summary} onChange={updateProfileSummary} />
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
          onUpdateBullets={updateTimelineBullets}
          onUpdateField={updateTimelineField}
          onUpdateItems={updateTimelineItems}
        />

        <TimelineEditor
          items={draft.education}
          section="education"
          title="學歷"
          onUpdateBullets={updateTimelineBullets}
          onUpdateField={updateTimelineField}
          onUpdateItems={updateTimelineItems}
        />
      </section>
    </main>
  );
}

function StatusMessage({ status }: { status: AsyncStatus }) {
  if (!status.message) return null;

  return (
    <p className={`editor-status ${status.phase}`}>
      {status.phase === "error" ? <AlertTriangle size={16} aria-hidden="true" /> : null}
      <span>{status.message}</span>
    </p>
  );
}

function PlatformSyncPanel({
  authEndpoint,
  authStatus,
  manualSyncTexts,
  onCopySelected,
  onCopySection,
  onDownloadAll,
  onPlatformChange,
  onPushAll,
  onRefreshAuthStatus,
  onResetAllManualTexts,
  onResetSectionText,
  onUpdateSectionText,
  platformResumeUrls,
  packages,
  selectedPlatformId,
  status,
  syncBridgeEndpoint,
}: {
  authEndpoint: string;
  authStatus: PlatformAuthStatus;
  manualSyncTexts: ManualSyncTexts;
  onCopySelected: () => void;
  onCopySection: (platform: ResumeSyncPlatformId, section: ResumeSyncSectionKey) => void;
  onDownloadAll: () => void;
  onPlatformChange: (platformId: ResumeSyncPlatformId) => void;
  onPushAll: () => void;
  onRefreshAuthStatus: () => void;
  onResetAllManualTexts: () => void;
  onResetSectionText: (platform: ResumeSyncPlatformId, section: ResumeSyncSectionKey) => void;
  onUpdateSectionText: (platform: ResumeSyncPlatformId, section: ResumeSyncSectionKey, value: string) => void;
  platformResumeUrls: Record<ResumeSyncPlatformId, string>;
  packages: ResumePlatformSyncPackage[];
  selectedPlatformId: ResumeSyncPlatformId;
  status: AsyncStatus;
  syncBridgeEndpoint?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const selectedPackage = packages.find((syncPackage) => syncPackage.platform === selectedPlatformId) ?? packages[0];
  const selectedPlatformResumeUrl = platformResumeUrls[selectedPackage.platform];
  const isSaving = status.phase === "saving";
  const hasManualSyncText = Object.keys(manualSyncTexts).length > 0;

  return (
    <section
      className={`editor-local-panel platform-sync-panel${isExpanded ? " expanded" : " collapsed"}`}
      aria-label="104 LinkedIn Cake 履歷同步"
    >
      <div className="editor-local-copy">
        <span className="editor-local-badge sync">
          <Link2 size={18} aria-hidden="true" />
          平台同步
        </span>
        <h2>104 / LinkedIn / Cake 區塊對應</h2>
        <p>
          每次編輯會即時重建三個平台的同步資料包；若設定 <code>VITE_RESUME_SYNC_ENDPOINT</code>
          ，按同步會送到你的後端 API，否則會複製可貼上的 JSON。
        </p>
        <p className="sync-endpoint">
          {syncBridgeEndpoint ? (
            <>
              Endpoint <code>{syncBridgeEndpoint}</code>
            </>
          ) : (
            "尚未設定同步 API endpoint"
          )}
        </p>
      </div>
      <div className="editor-local-actions platform-sync-actions">
        <button
          className="editor-secondary-action platform-sync-toggle"
          type="button"
          aria-expanded={isExpanded}
          aria-controls="platform-sync-body"
          onClick={() => setIsExpanded((expanded) => !expanded)}
        >
          {isExpanded ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
          {isExpanded ? "收合平台同步" : "展開平台同步"}
        </button>
      </div>

      {isExpanded ? (
        <>
          <div className="editor-local-actions platform-sync-command-row">
            <button className="editor-primary-action" type="button" disabled={isSaving} onClick={onPushAll}>
              <CloudUpload size={18} aria-hidden="true" />
              {syncBridgeEndpoint ? "同步到平台" : "產生同步包"}
            </button>
            <button className="editor-secondary-action" type="button" onClick={onCopySelected}>
              <ClipboardCopy size={18} aria-hidden="true" />
              複製目前平台
            </button>
            <button className="editor-secondary-action" type="button" onClick={onDownloadAll}>
              <Download size={18} aria-hidden="true" />
              下載全平台 JSON
            </button>
            <button className="editor-secondary-action" type="button" disabled={!hasManualSyncText} onClick={onResetAllManualTexts}>
              <RotateCcw size={18} aria-hidden="true" />
              清除手動覆寫
            </button>
          </div>

          <div className="platform-sync-body" id="platform-sync-body">
          <PlatformAuthPanel
            authEndpoint={authEndpoint}
            packages={packages}
            status={authStatus}
            onRefresh={onRefreshAuthStatus}
          />

          <div className="platform-tab-list" role="tablist" aria-label="同步平台">
            {packages.map((syncPackage) => (
              <button
                className={syncPackage.platform === selectedPlatformId ? "active" : ""}
                type="button"
                role="tab"
                aria-selected={syncPackage.platform === selectedPlatformId}
                key={syncPackage.platform}
                onClick={() => onPlatformChange(syncPackage.platform)}
              >
                {syncPackage.platformLabel}
              </button>
            ))}
          </div>

          <div className="platform-sync-summary">
            <div className="platform-sync-heading">
              <div className="platform-sync-title">
                <strong>{selectedPackage.platformLabel}</strong>
                <span>{selectedPackage.description}</span>
              </div>
              <a className="platform-resume-link" href={selectedPlatformResumeUrl} rel="noreferrer" target="_blank">
                開啟履歷頁
                <ExternalLink size={15} aria-hidden="true" />
              </a>
            </div>
            <div className="sync-section-map">
              {selectedPackage.sections.map((section) => {
                const manualKey = getManualSyncTextKey(selectedPackage.platform, section.key);
                const isManual = manualSyncTexts[manualKey] !== undefined;
                const syncText = getResumeSyncSectionText(section);

                return (
                  <article
                    className={`sync-section-row${isManual ? " manual" : ""}`}
                    key={`${selectedPackage.platform}-${section.key}`}
                  >
                    <div className="sync-section-source">
                      <span>{section.sourceLabel}</span>
                      <small>{section.sourcePath}</small>
                    </div>
                    <strong aria-hidden="true">→</strong>
                    <div className="sync-section-target">
                      <span>{section.targetLabel}</span>
                      <small>{section.itemCount} 項</small>
                    </div>
                    <label className="sync-section-editor">
                      <span>{isManual ? "手動同步內容" : "同步內容"}</span>
                      <textarea
                        className="sync-section-textarea"
                        rows={Math.max(4, Math.min(12, syncText.split(/\r?\n/).length + 1))}
                        value={syncText}
                        onChange={(event) => onUpdateSectionText(selectedPackage.platform, section.key, event.target.value)}
                      />
                    </label>
                    <div className="sync-section-actions">
                      <small className={isManual ? "manual" : ""}>
                        {isManual ? "使用手動覆寫，會出現在複製、下載與同步資料包。" : "目前使用履歷來源自動產生內容。"}
                      </small>
                      <button
                        className="editor-small-action"
                        type="button"
                        onClick={() => onCopySection(selectedPackage.platform, section.key)}
                      >
                        <ClipboardCopy size={15} aria-hidden="true" />
                        複製區塊
                      </button>
                      <button
                        className="editor-small-action"
                        type="button"
                        disabled={!isManual}
                        onClick={() => onResetSectionText(selectedPackage.platform, section.key)}
                      >
                        <RotateCcw size={15} aria-hidden="true" />
                        還原來源
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
          </div>
        </>
      ) : null}

      <StatusMessage status={status} />
    </section>
  );
}

function getPlatformAuthLabel(authState?: PlatformAuthState) {
  if (!authState) return "未知";

  if (authState.status === "connected") return "已登入";
  if (authState.status === "ready") return "可登入";
  if (authState.status === "not_configured") return "待設定";
  if (authState.status === "external_login_started") return "已開啟";
  if (authState.status === "error") return "登入失敗";
  return "外部登入";
}

function getPlatformAuthActionLabel(authState?: PlatformAuthState) {
  if (authState?.mode === "oauth") return authState.status === "connected" ? "重新登入" : "登入";
  return authState?.status === "external_login_started" ? "重新開啟" : "開啟登入";
}

function getPlatformAuthDetail(authState?: PlatformAuthState) {
  const profileName = authState?.profile?.name?.trim();
  const profileEmail = authState?.profile?.email?.trim();
  const profileLabel = [profileName, profileEmail].filter(Boolean).join(" / ");

  if (profileLabel) return profileLabel;
  return authState?.message || "尚未讀取登入狀態。";
}

function PlatformAuthPanel({
  authEndpoint,
  onRefresh,
  packages,
  status,
}: {
  authEndpoint: string;
  onRefresh: () => void;
  packages: ResumePlatformSyncPackage[];
  status: PlatformAuthStatus;
}) {
  const authStateByPlatform = new Map(status.platforms.map((authState) => [authState.platform, authState]));
  const isLoading = status.phase === "loading";

  return (
    <section className="platform-auth-panel" aria-label="平台登入">
      <div className="platform-auth-heading">
        <div>
          <strong>平台登入</strong>
          <span>LinkedIn 使用 OAuth；104 / Cake 先開啟官方登入頁銜接帳號。</span>
        </div>
        <button className="editor-small-action" type="button" disabled={isLoading} onClick={onRefresh}>
          <RefreshCw size={15} aria-hidden="true" />
          刷新
        </button>
      </div>

      <div className="platform-auth-grid">
        {packages.map((syncPackage) => {
          const authState = authStateByPlatform.get(syncPackage.platform);
          const startUrl = getPlatformAuthStartUrl(authEndpoint, syncPackage.platform);

          return (
            <article className={`platform-auth-card ${authState?.status ?? "unknown"}`} key={syncPackage.platform}>
              <div className="platform-auth-card-title">
                <span>{syncPackage.platformLabel}</span>
                <small>{getPlatformAuthLabel(authState)}</small>
              </div>
              <p>{getPlatformAuthDetail(authState)}</p>
              <a className="editor-small-action" href={startUrl} rel="noreferrer" target="_blank">
                <LogIn size={15} aria-hidden="true" />
                {getPlatformAuthActionLabel(authState)}
              </a>
            </article>
          );
        })}
      </div>

      {status.phase === "error" ? <StatusMessage status={status} /> : null}
    </section>
  );
}

function ProjectManagementPanel({
  geminiEndpoint,
  onAddEmptyProject,
  onCopyJson,
  onDownloadJson,
  onGenerateProject,
  onImportClick,
  onResetPortfolio,
  onUpdateProject,
  onUpdateProjects,
  portfolio,
  status,
}: {
  geminiEndpoint: string;
  onAddEmptyProject: () => void;
  onCopyJson: () => void;
  onDownloadJson: () => void;
  onGenerateProject: (request: ProjectGeminiRequest) => void;
  onImportClick: () => void;
  onResetPortfolio: () => void;
  onUpdateProject: (projectIndex: number, project: Project) => void;
  onUpdateProjects: (projects: Project[]) => void;
  portfolio: PortfolioData;
  status: AsyncStatus;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isGenerating = status.phase === "saving";

  return (
    <section
      className={`editor-local-panel project-management-panel${isExpanded ? " expanded" : " collapsed"}`}
      aria-label="作品管理"
    >
      <div className="editor-local-copy">
        <span className="editor-local-badge project">
          <FileJson size={18} aria-hidden="true" />
          Portfolio
        </span>
        <h2>作品管理</h2>
        <p>
          新增、編輯、刪除的作品會暫存在此瀏覽器，可下載為 <code>portfolio.json</code> 後放回專案資料檔。
        </p>
        <p className="sync-endpoint">
          Gemini endpoint <code>{geminiEndpoint}</code>
        </p>
      </div>
      <div className="editor-local-actions project-management-actions">
        <button
          className="editor-secondary-action platform-sync-toggle"
          type="button"
          aria-expanded={isExpanded}
          aria-controls="project-management-body"
          onClick={() => setIsExpanded((expanded) => !expanded)}
        >
          {isExpanded ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
          {isExpanded ? "收合作品管理" : "展開作品管理"}
        </button>
      </div>

      {isExpanded ? (
        <div className="project-management-body" id="project-management-body">
          <div className="editor-local-actions project-command-row">
            <button className="editor-secondary-action" type="button" onClick={onImportClick}>
              <Upload size={18} aria-hidden="true" />
              匯入作品 JSON
            </button>
            <button className="editor-secondary-action" type="button" onClick={onCopyJson}>
              <FileJson size={18} aria-hidden="true" />
              複製作品 JSON
            </button>
            <button className="editor-primary-action" type="button" onClick={onDownloadJson}>
              <Download size={18} aria-hidden="true" />
              下載作品 JSON
            </button>
            <button className="editor-secondary-action" type="button" onClick={onAddEmptyProject}>
              <Plus size={18} aria-hidden="true" />
              新增空白專案
            </button>
            <button className="editor-secondary-action" type="button" onClick={onResetPortfolio}>
              <RotateCcw size={18} aria-hidden="true" />
              重設作品
            </button>
          </div>

          <ProjectGeminiCreator disabled={isGenerating} onGenerateProject={onGenerateProject} />

          <div className="project-editor-list">
            {portfolio.projects.map((project, index) => (
              <ProjectEditorCard
                index={index}
                key={`${project.title}-${index}`}
                project={project}
                onChange={(nextProject) => onUpdateProject(index, nextProject)}
                onDelete={() => onUpdateProjects(removeAt(portfolio.projects, index))}
              />
            ))}
          </div>
        </div>
      ) : null}

      <StatusMessage status={status} />
    </section>
  );
}

function ProjectGeminiCreator({
  disabled,
  onGenerateProject,
}: {
  disabled: boolean;
  onGenerateProject: (request: ProjectGeminiRequest) => void;
}) {
  const [form, setForm] = useState<ProjectGeminiRequest>({
    caseStudyUrl: "",
    category: "",
    demoUrl: "",
    readmeText: "",
    readmeUrl: "",
    repoUrl: "",
    screenshotAlt: "",
    screenshotSrc: "",
    title: "",
  });

  const updateForm = (field: keyof ProjectGeminiRequest, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <section className="project-gemini-creator" aria-label="Gemini 新增專案">
      <div className="project-gemini-heading">
        <div>
          <h3>Gemini README 產文案</h3>
          <p>提供 GitHub repository、README URL 或直接貼上 README；新增時會產生標題、摘要、介紹、標籤與分類。</p>
        </div>
        <button
          className="editor-primary-action"
          type="button"
          disabled={disabled}
          onClick={() => onGenerateProject(form)}
        >
          <RefreshCw size={18} aria-hidden="true" />
          {disabled ? "產生中" : "讀取 README 新增"}
        </button>
      </div>
      <div className="project-gemini-grid">
        <TextField label="偏好專案名稱" value={form.title} onChange={(value) => updateForm("title", value)} />
        <TextField label="GitHub repository URL" value={form.repoUrl} onChange={(value) => updateForm("repoUrl", value)} />
        <TextField label="README URL" value={form.readmeUrl} onChange={(value) => updateForm("readmeUrl", value)} />
        <TextField label="Demo URL" value={form.demoUrl} onChange={(value) => updateForm("demoUrl", value)} />
        <TextField label="專案筆記 URL" value={form.caseStudyUrl} onChange={(value) => updateForm("caseStudyUrl", value)} />
        <TextField label="偏好分類" value={form.category} onChange={(value) => updateForm("category", value)} />
        <TextField label="主截圖路徑" value={form.screenshotSrc} onChange={(value) => updateForm("screenshotSrc", value)} />
        <TextField label="主截圖替代文字" value={form.screenshotAlt} onChange={(value) => updateForm("screenshotAlt", value)} />
        <TextAreaField
          className="project-readme-textarea"
          label="README 內容"
          rows={7}
          value={form.readmeText}
          placeholder="若 repository 不是公開 GitHub，可直接貼上 README。"
          onChange={(value) => updateForm("readmeText", value)}
        />
      </div>
    </section>
  );
}

function ProjectEditorCard({
  index,
  onChange,
  onDelete,
  project,
}: {
  index: number;
  onChange: (project: Project) => void;
  onDelete: () => void;
  project: Project;
}) {
  const screenshots = project.screenshots?.length ? project.screenshots : project.screenshot ? [project.screenshot] : [];

  const updateField = <K extends keyof Project>(field: K, value: Project[K]) => {
    onChange({
      ...project,
      [field]: value,
    });
  };

  const updateLink = (field: keyof Project["links"], value: string) => {
    onChange({
      ...project,
      links: {
        ...project.links,
        [field]: value,
      },
    });
  };

  const updateScreenshots = (nextScreenshots: ProjectScreenshot[]) => {
    const { screenshot: _screenshot, screenshots: _screenshots, ...projectWithoutScreenshots } = project;
    const firstScreenshot = nextScreenshots[0];

    onChange({
      ...projectWithoutScreenshots,
      ...(firstScreenshot ? { screenshot: firstScreenshot, screenshots: nextScreenshots } : { screenshots: [] }),
    });
  };

  return (
    <article className="project-editor-card">
      <div className="editor-timeline-head">
        <h3>
          {index + 1}. {project.title || "未命名專案"}
        </h3>
        <button className="editor-small-action danger" type="button" onClick={onDelete}>
          <Trash2 size={15} aria-hidden="true" />
          刪除專案
        </button>
      </div>

      <div className="editor-two-column">
        <TextField label="專案名稱" value={project.title} onChange={(value) => updateField("title", value)} />
        <TextField label="分類" value={project.category} onChange={(value) => updateField("category", value)} />
        <TextField label="年份" value={project.year} onChange={(value) => updateField("year", value)} />
        <TextField label="建立時間" value={project.createdAt} onChange={(value) => updateField("createdAt", value)} />
        <TextField label="更新時間" value={project.updatedAt} onChange={(value) => updateField("updatedAt", value)} />
        <TextField label="Demo URL" value={project.links.demo ?? ""} onChange={(value) => updateLink("demo", value)} />
        <TextField label="Repository URL" value={project.links.repo ?? ""} onChange={(value) => updateLink("repo", value)} />
        <TextField label="專案筆記 URL" value={project.links.caseStudy ?? ""} onChange={(value) => updateLink("caseStudy", value)} />
      </div>

      <TextAreaField label="列表摘要" rows={3} value={project.summary} onChange={(value) => updateField("summary", value)} />
      <TextAreaField label="詳細介紹" rows={5} value={project.description} onChange={(value) => updateField("description", value)} />
      <ProjectTagsEditor tags={project.tags} onChange={(tags) => updateField("tags", tags)} />
      <ProjectScreenshotsEditor
        projectTitle={project.title}
        screenshots={screenshots}
        onChange={updateScreenshots}
      />
    </article>
  );
}

function serializeProjectTags(tags: string[]) {
  return tags.join("\n");
}

function parseProjectTags(value: string) {
  const tags = value
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  return Array.from(new Set(tags));
}

function haveSameProjectTags(left: string[], right: string[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function ProjectTagsEditor({ onChange, tags }: { onChange: (tags: string[]) => void; tags: string[] }) {
  const [text, setText] = useState(() => serializeProjectTags(tags));

  useEffect(() => {
    if (haveSameProjectTags(parseProjectTags(text), tags)) return;
    setText(serializeProjectTags(tags));
  }, [tags, text]);

  const updateText = (nextText: string) => {
    setText(nextText);
    onChange(parseProjectTags(nextText));
  };

  return (
    <TextAreaField
      label="標籤"
      rows={5}
      value={text}
      placeholder={"JavaScript\nVite\nInteractive Web"}
      onChange={updateText}
    />
  );
}

function serializeProjectScreenshots(screenshots: ProjectScreenshot[]) {
  return screenshots.map((screenshot) => `${screenshot.src} | ${screenshot.alt}`).join("\n");
}

function parseProjectScreenshots(value: string, projectTitle: string): ProjectScreenshot[] {
  return value
    .split(/\r?\n/)
    .map((line, index) => {
      const [src, ...altParts] = line.split("|");
      const trimmedSrc = src.trim();
      const alt = altParts.join("|").trim() || `${projectTitle || "專案"} 作品圖片 ${index + 1}`;

      return trimmedSrc ? { src: trimmedSrc, alt } : null;
    })
    .filter((screenshot): screenshot is ProjectScreenshot => Boolean(screenshot));
}

function haveSameProjectScreenshots(left: ProjectScreenshot[], right: ProjectScreenshot[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function ProjectScreenshotsEditor({
  onChange,
  projectTitle,
  screenshots,
}: {
  onChange: (screenshots: ProjectScreenshot[]) => void;
  projectTitle: string;
  screenshots: ProjectScreenshot[];
}) {
  const [text, setText] = useState(() => serializeProjectScreenshots(screenshots));

  useEffect(() => {
    if (haveSameProjectScreenshots(parseProjectScreenshots(text, projectTitle), screenshots)) return;
    setText(serializeProjectScreenshots(screenshots));
  }, [projectTitle, screenshots, text]);

  const updateText = (nextText: string) => {
    setText(nextText);
    onChange(parseProjectScreenshots(nextText, projectTitle));
  };

  return (
    <TextAreaField
      label="截圖清單"
      rows={5}
      value={text}
      placeholder={"project-screenshots/example.png | Example desktop\nproject-screenshots/example-mobile.png | Example mobile"}
      onChange={updateText}
    />
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
  className,
  label,
  onChange,
  placeholder,
  rows = 4,
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  value: string;
}) {
  return (
    <label className={`editor-field${className ? ` ${className}` : ""}`}>
      <span>{label}</span>
      <textarea rows={rows} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ProfileSummaryEditor({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  const [text, setText] = useState(() => serializeStringItems(items));

  useEffect(() => {
    if (haveSameStringItems(parseIndentedStringItems(text), items)) return;
    setText(serializeStringItems(items));
  }, [items, text]);

  const updateText = (nextText: string) => {
    setText(nextText);
    onChange(parseIndentedStringItems(nextText));
  };

  return (
    <label className="editor-field indented-textarea-block">
      <span>自我介紹</span>
      <textarea
        className="indented-textarea"
        rows={Math.max(5, text.split("\n").length + 1)}
        value={text}
        placeholder="每行一段自我介紹"
        onChange={(event) => updateText(event.target.value)}
        onKeyDown={(event) => handleIndentedTextAreaKeyDown(event, text, updateText)}
      />
      <small className="indent-help">每行會轉成一個自我介紹項目；Tab / Shift+Tab 可調整縮排。</small>
    </label>
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
  const [text, setText] = useState(() => serializeSkills(skills));

  useEffect(() => {
    if (haveSameSkills(parseIndentedSkills(text), skills)) return;
    setText(serializeSkills(skills));
  }, [skills, text]);

  const updateText = (nextText: string) => {
    setText(nextText);
    onChange(parseIndentedSkills(nextText));
  };

  return (
    <label className="editor-field indented-textarea-block">
      <span>技能分類與項目</span>
      <textarea
        className="indented-textarea"
        rows={Math.max(8, text.split("\n").length + 1)}
        value={text}
        placeholder={"技能分類\n    技能項目\n    技能項目\n另一個分類"}
        onChange={(event) => updateText(event.target.value)}
        onKeyDown={(event) => handleIndentedTextAreaKeyDown(event, text, updateText)}
      />
      <small className="indent-help">不縮排的行是技能分類；Tab 或四個半形空格縮排的行會成為該分類下的技能項目。</small>
    </label>
  );
}

function TimelineEditor({
  items,
  onUpdateField,
  onUpdateBullets,
  onUpdateItems,
  section,
  title,
}: {
  items: TimelineItem[];
  onUpdateField: <K extends keyof TimelineItem>(
    section: ResumeSectionKey,
    index: number,
    field: K,
    value: TimelineItem[K],
  ) => void;
  onUpdateBullets: (section: ResumeSectionKey, itemIndex: number, bullets: ResumeBullet[]) => void;
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
            <BulletListEditor
              bullets={item.bullets}
              onChange={(bullets) => onUpdateBullets(section, index, bullets)}
            />
          </article>
        ))}
      </div>
    </section>
  );
}

function BulletListEditor({
  bullets,
  onChange,
}: {
  bullets: ResumeBullet[];
  onChange: (bullets: ResumeBullet[]) => void;
}) {
  const [text, setText] = useState(() => serializeBullets(bullets));

  useEffect(() => {
    if (haveSameBulletShape(parseIndentedBullets(text), bullets)) return;
    setText(serializeBullets(bullets));
  }, [bullets, text]);

  const updateText = (nextText: string) => {
    setText(nextText);
    onChange(parseIndentedBullets(nextText));
  };

  return (
    <label className="editor-field bullet-textarea-block">
      <span>重點條列</span>
      <textarea
        className="bullet-textarea"
        rows={Math.max(5, text.split("\n").length + 1)}
        value={text}
        placeholder={"每行一項；Tab 或四個半形空格表示子條列\n[連結文字](https://example.com)"}
        onChange={(event) => updateText(event.target.value)}
        onKeyDown={(event) => handleIndentedTextAreaKeyDown(event, text, updateText)}
      />
      <small className="bullet-indent-help">Tab / Shift+Tab 可調整縮排，四個半形空格也會視為一層。</small>
    </label>
  );
}

export default ResumeEditorPage;
