import { cloneResume, isResumeData, loadResumeDraftFromStorage } from "./resumeDraft";
import { buildResumeVersions, type ResumeVersion } from "./resumeVersions";
import type { PortfolioData } from "./types/portfolio";
import type { ResumeData } from "./types/resume";

export type EditableResumeVersion = {
  id: string;
  label: string;
  shortLabel: string;
  audience: string;
  description: string;
  keywords: string[];
  pdfFileName: string;
  resume: ResumeData;
  createdAt: string;
  updatedAt: string;
};

export type ResumeDraftVersionsLoadResult = {
  selectedVersionId: string;
  source: "stored" | "seed" | "invalid" | "unreadable";
  versions: EditableResumeVersion[];
};

type CreateResumeDraftVersionOptions = {
  audience?: string;
  createdAt?: string;
  description?: string;
  id?: string;
  keywords?: string[];
  label?: string;
  pdfFileName?: string;
  resume: ResumeData;
  shortLabel?: string;
  updatedAt?: string;
};

const fallbackVersionId = "original";

export const localDraftVersionsStorageKey = "resume-editor-local-draft-versions-v1";
export const selectedDraftVersionStorageKey = "resume-editor-selected-draft-version-v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function getStoredSelectedVersionId(versions: EditableResumeVersion[], fallbackId: string) {
  if (typeof window === "undefined") return fallbackId;

  const storedVersionId = window.localStorage.getItem(selectedDraftVersionStorageKey);
  if (storedVersionId && versions.some((version) => version.id === storedVersionId)) return storedVersionId;

  return versions.some((version) => version.id === fallbackId) ? fallbackId : versions[0]?.id ?? fallbackVersionId;
}

export function createResumeDraftVersionId() {
  return `resume-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getResumeDraftShortLabel(label: string) {
  const normalizedLabel = label
    .replace(/^張維麟履歷[｜:：\s]*/u, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedLabel) return "履歷";
  return normalizedLabel.length > 12 ? `${normalizedLabel.slice(0, 12)}…` : normalizedLabel;
}

export function getResumeDraftLabel(resume: ResumeData, fallbackLabel = "未命名履歷") {
  const title = resume.meta.title.trim();
  if (title) return title;

  const role = resume.profile.role.trim();
  if (role) return role;

  return fallbackLabel;
}

export function createResumeDraftVersion(options: CreateResumeDraftVersionOptions): EditableResumeVersion {
  const now = new Date().toISOString();
  const label = (options.label ?? getResumeDraftLabel(options.resume)).trim() || "未命名履歷";
  const name = options.resume.profile.name.trim() || "resume";

  return {
    id: options.id ?? createResumeDraftVersionId(),
    label,
    shortLabel: options.shortLabel?.trim() || getResumeDraftShortLabel(label),
    audience: options.audience?.trim() || "自訂履歷版本",
    description: options.description?.trim() || "可在本地編輯器中獨立維護的履歷版本。",
    keywords: options.keywords?.length ? [...options.keywords] : ["自訂版本"],
    pdfFileName: options.pdfFileName?.trim() || `${name}_${label}`,
    resume: cloneResume(options.resume),
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };
}

function createEditableVersionFromBuiltIn(version: ResumeVersion, now: string) {
  return createResumeDraftVersion({
    audience: version.audience,
    createdAt: now,
    description: version.description,
    id: version.id,
    keywords: version.keywords,
    label: version.label,
    pdfFileName: version.pdfFileName,
    resume: version.resume,
    shortLabel: version.shortLabel,
    updatedAt: now,
  });
}

function cloneResumeDraftVersion(version: EditableResumeVersion): EditableResumeVersion {
  return {
    ...version,
    keywords: [...version.keywords],
    resume: cloneResume(version.resume),
  };
}

export function cloneResumeDraftVersions(versions: EditableResumeVersion[]) {
  return versions.map(cloneResumeDraftVersion);
}

export function isEditableResumeVersion(value: unknown): value is EditableResumeVersion {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.shortLabel === "string" &&
    typeof value.audience === "string" &&
    typeof value.description === "string" &&
    typeof value.pdfFileName === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    isStringArray(value.keywords) &&
    isResumeData(value.resume)
  );
}

export function buildInitialResumeDraftVersions(baseResume: ResumeData, portfolio?: PortfolioData) {
  const now = new Date().toISOString();
  return buildResumeVersions(baseResume, portfolio).map((version) => createEditableVersionFromBuiltIn(version, now));
}

export function loadResumeDraftVersionsFromStorage(
  fallbackVersions: EditableResumeVersion[],
  fallbackSelectedVersionId = fallbackVersionId,
): ResumeDraftVersionsLoadResult {
  const safeFallbackVersions = fallbackVersions.length
    ? cloneResumeDraftVersions(fallbackVersions)
    : [createResumeDraftVersion({ id: fallbackVersionId, resume: loadResumeDraftFromStorage().draft })];

  if (typeof window === "undefined") {
    return {
      selectedVersionId: safeFallbackVersions[0].id,
      source: "seed",
      versions: safeFallbackVersions,
    };
  }

  try {
    const storedVersions = window.localStorage.getItem(localDraftVersionsStorageKey);
    if (!storedVersions) {
      return {
        selectedVersionId: getStoredSelectedVersionId(safeFallbackVersions, fallbackSelectedVersionId),
        source: "seed",
        versions: safeFallbackVersions,
      };
    }

    const parsedVersions = JSON.parse(storedVersions) as unknown;
    if (Array.isArray(parsedVersions) && parsedVersions.length > 0 && parsedVersions.every(isEditableResumeVersion)) {
      const versions = cloneResumeDraftVersions(parsedVersions);

      return {
        selectedVersionId: getStoredSelectedVersionId(versions, fallbackSelectedVersionId),
        source: "stored",
        versions,
      };
    }

    return {
      selectedVersionId: getStoredSelectedVersionId(safeFallbackVersions, fallbackSelectedVersionId),
      source: "invalid",
      versions: safeFallbackVersions,
    };
  } catch {
    return {
      selectedVersionId: getStoredSelectedVersionId(safeFallbackVersions, fallbackSelectedVersionId),
      source: "unreadable",
      versions: safeFallbackVersions,
    };
  }
}

export function getResumeDraftVersionsJson(versions: EditableResumeVersion[]) {
  return `${JSON.stringify(versions, null, 2)}\n`;
}
