import portfolioSeed from "./data/portfolio.json";
import type { PortfolioData, PortfolioLinkSet, Project, ProjectScreenshot } from "./types/portfolio";

export type PortfolioDraftLoadResult =
  | {
      draft: PortfolioData;
      source: "stored";
    }
  | {
      draft: PortfolioData;
      source: "seed";
    }
  | {
      draft: PortfolioData;
      source: "invalid" | "unreadable";
    };

export const initialPortfolio = portfolioSeed as PortfolioData;
export const localPortfolioDraftStorageKey = "portfolio-editor-local-draft-v1";

export function clonePortfolio(data: PortfolioData) {
  return JSON.parse(JSON.stringify(data)) as PortfolioData;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isPortfolioLinkSet(value: unknown): value is PortfolioLinkSet {
  if (!isRecord(value)) return false;

  return ["demo", "repo", "caseStudy"].every((key) => {
    const entry = value[key];
    return entry === undefined || typeof entry === "string";
  });
}

function isProjectScreenshot(value: unknown): value is ProjectScreenshot {
  if (!isRecord(value)) return false;
  return typeof value.src === "string" && typeof value.alt === "string";
}

export function isProject(value: unknown): value is Project {
  if (!isRecord(value)) return false;

  const screenshotIsValid = value.screenshot === undefined || isProjectScreenshot(value.screenshot);
  const screenshotsAreValid =
    value.screenshots === undefined || (Array.isArray(value.screenshots) && value.screenshots.every(isProjectScreenshot));

  return (
    typeof value.title === "string" &&
    typeof value.summary === "string" &&
    typeof value.description === "string" &&
    isStringArray(value.tags) &&
    typeof value.category === "string" &&
    typeof value.year === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    isPortfolioLinkSet(value.links) &&
    screenshotIsValid &&
    screenshotsAreValid
  );
}

export function isPortfolioData(value: unknown): value is PortfolioData {
  if (!isRecord(value)) return false;

  const profile = value.profile;
  if (!isRecord(profile)) return false;

  const quote = profile.quote;
  const socialLinks = profile.socialLinks;

  return (
    typeof profile.name === "string" &&
    typeof profile.englishName === "string" &&
    typeof profile.role === "string" &&
    typeof profile.location === "string" &&
    typeof profile.resumeUrl === "string" &&
    typeof profile.intro === "string" &&
    isRecord(quote) &&
    typeof quote.zh === "string" &&
    typeof quote.en === "string" &&
    typeof quote.source === "string" &&
    Array.isArray(socialLinks) &&
    socialLinks.every((link) => isRecord(link) && typeof link.label === "string" && typeof link.url === "string") &&
    Array.isArray(value.projects) &&
    value.projects.every(isProject)
  );
}

export function getPortfolioJson(draft: PortfolioData) {
  return `${JSON.stringify(draft, null, 2)}\n`;
}

export function loadPortfolioDraftFromStorage(): PortfolioDraftLoadResult {
  const fallbackDraft = clonePortfolio(initialPortfolio);

  if (typeof window === "undefined") {
    return { draft: fallbackDraft, source: "seed" };
  }

  try {
    const storedDraft = window.localStorage.getItem(localPortfolioDraftStorageKey);
    if (!storedDraft) return { draft: fallbackDraft, source: "seed" };

    const parsedDraft = JSON.parse(storedDraft) as unknown;
    if (isPortfolioData(parsedDraft)) {
      return { draft: clonePortfolio(parsedDraft), source: "stored" };
    }

    return { draft: fallbackDraft, source: "invalid" };
  } catch {
    return { draft: fallbackDraft, source: "unreadable" };
  }
}
