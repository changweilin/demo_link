import resumeSeed from "./data/resume.json";
import type { ResumeData } from "./types/resume";

export type ResumeDraftLoadResult =
  | {
      draft: ResumeData;
      source: "stored";
    }
  | {
      draft: ResumeData;
      source: "seed";
    }
  | {
      draft: ResumeData;
      source: "invalid" | "unreadable";
    };

export const initialResume = resumeSeed as ResumeData;
export const localDraftStorageKey = "resume-editor-local-draft-v1";
export const platformSyncStorageKey = "resume-editor-platform-sync-package-v1";

export function cloneResume(data: ResumeData) {
  return JSON.parse(JSON.stringify(data)) as ResumeData;
}

export function isResumeData(value: unknown): value is ResumeData {
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

export function getResumeJson(draft: ResumeData) {
  return `${JSON.stringify(draft, null, 2)}\n`;
}

export function loadResumeDraftFromStorage(): ResumeDraftLoadResult {
  const fallbackDraft = cloneResume(initialResume);

  if (typeof window === "undefined") {
    return { draft: fallbackDraft, source: "seed" };
  }

  try {
    const storedDraft = window.localStorage.getItem(localDraftStorageKey);
    if (!storedDraft) return { draft: fallbackDraft, source: "seed" };

    const parsedDraft = JSON.parse(storedDraft) as unknown;
    if (isResumeData(parsedDraft)) {
      return { draft: cloneResume(parsedDraft), source: "stored" };
    }

    return { draft: fallbackDraft, source: "invalid" };
  } catch {
    return { draft: fallbackDraft, source: "unreadable" };
  }
}
