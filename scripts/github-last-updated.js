import { dirname } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const portfolioPath = process.env.TRACK_PORTFOLIO_PATH || "src/data/portfolio.json";
const outputPath = process.env.TRACK_OUTPUT_PATH || "docs/github-last-updated.json";
const markdownPath = process.env.TRACK_MARKDOWN_PATH || "docs/github-last-updated.md";
const maxHistory = Number.parseInt(process.env.TRACK_MAX_HISTORY || "30", 10);
const portfolioWriteEnabled = process.env.TRACK_PORTFOLIO_WRITE === "true";
const branchOverride = process.env.TRACK_BRANCH_NAME?.trim() || "";
const portfolioDateField = process.env.TRACK_PORTFOLIO_DATE_FIELD || "default_branch_committed_at";

const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "github-last-updated-tracker",
};

if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

function normalizeRepoIdentifier(value) {
  if (!value) return "";

  return value
    .trim()
    .replace(/^git@github\.com:/, "")
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/^http:\/\/github\.com\//, "")
    .replace(/[?#].*$/, "")
    .replace(/\.git$/i, "")
    .replace(/^\/+|\/+$/g, "");
}

function getExplicitRepos() {
  return (process.env.TRACK_REPOS || "")
    .split(",")
    .map((repo) => normalizeRepoIdentifier(repo))
    .filter(Boolean);
}

function getPortfolio() {
  if (!existsSync(portfolioPath)) return null;

  const raw = readFileSync(portfolioPath, "utf-8");
  return JSON.parse(raw);
}

function projectHasDemo(project) {
  return Boolean(project.links?.demo?.trim());
}

function getPortfolioRepoMap(portfolio) {
  const repoMap = new Map();

  for (const project of portfolio?.projects ?? []) {
    if (!projectHasDemo(project)) continue;

    const repo = normalizeRepoIdentifier(project.links?.repo);
    if (!repo) continue;

    const projects = repoMap.get(repo) ?? [];
    projects.push(project);
    repoMap.set(repo, projects);
  }

  return repoMap;
}

function getTrackedRepos(portfolioRepoMap) {
  const explicitRepos = getExplicitRepos();
  const repos = explicitRepos.length > 0 ? explicitRepos : Array.from(portfolioRepoMap.keys());
  return Array.from(new Set(repos));
}

function ensureParentDirectory(path) {
  mkdirSync(dirname(path), { recursive: true });
}

function encodePathSegment(value) {
  return encodeURIComponent(value).replace(/%2F/g, "%2F");
}

async function fetchJson(url, label) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch ${label}: ${response.status} ${response.statusText} ${body}`);
  }

  return response.json();
}

async function fetchRepository(repo) {
  return fetchJson(`https://api.github.com/repos/${repo}`, repo);
}

async function fetchBranch(repo, branchName) {
  return fetchJson(
    `https://api.github.com/repos/${repo}/branches/${encodePathSegment(branchName)}`,
    `${repo}@${branchName}`,
  );
}

function getPortfolioUpdatedAt(record) {
  switch (portfolioDateField) {
    case "updated_at":
      return record.updated_at;
    case "pushed_at":
      return record.pushed_at;
    case "default_branch_authored_at":
      return record.default_branch_authored_at;
    case "default_branch_committed_at":
    default:
      return record.default_branch_committed_at;
  }
}

async function main() {
const portfolio = getPortfolio();
const portfolioRepoMap = getPortfolioRepoMap(portfolio);
const repos = getTrackedRepos(portfolioRepoMap);

if (repos.length === 0) {
  throw new Error(
    `Missing repo list. Add demo projects with links.repo entries to ${portfolioPath}, or set TRACK_REPOS (e.g. owner/name,owner2/name2).`,
  );
}

const checkedAt = new Date().toISOString();

const records = await Promise.all(
  repos.map(async (repo) => {
    const data = await fetchRepository(repo);
    const defaultBranch = branchOverride || data.default_branch || "main";
    const branch = await fetchBranch(repo, defaultBranch);
    const commit = branch.commit?.commit ?? {};
    const projectTitles = (portfolioRepoMap.get(repo) ?? []).map((project) => project.title).filter(Boolean);
    const record = {
      project_titles: projectTitles,
      repository: data.full_name ?? repo,
      default_branch: defaultBranch,
      default_branch_sha: branch.commit?.sha ?? null,
      default_branch_authored_at: commit.author?.date ?? null,
      default_branch_committed_at: commit.committer?.date ?? null,
      created_at: data.created_at,
      updated_at: data.updated_at,
      pushed_at: data.pushed_at,
      url: data.html_url,
      archived: data.archived ?? false,
    };

    return {
      ...record,
      portfolio_updated_at: getPortfolioUpdatedAt(record),
    };
  }),
);

if (portfolio && portfolioWriteEnabled) {
  const recordsByRepo = new Map(
    records.map((record) => [normalizeRepoIdentifier(record.repository), record]),
  );

  for (const project of portfolio.projects ?? []) {
    if (!projectHasDemo(project)) continue;

    const repo = normalizeRepoIdentifier(project.links?.repo);
    const record = recordsByRepo.get(repo);
    if (!record?.portfolio_updated_at) continue;

    project.updatedAt = record.portfolio_updated_at;
  }

  ensureParentDirectory(portfolioPath);
  writeFileSync(portfolioPath, `${JSON.stringify(portfolio, null, 2)}\n`, "utf-8");
}

const snapshot = {
  checked_at: checkedAt,
  source: portfolioDateField,
  branch: branchOverride || "default",
  repositories: records,
};

let history = [];
if (existsSync(outputPath)) {
  try {
    const raw = readFileSync(outputPath, "utf-8");
    const parsed = JSON.parse(raw);
    history = Array.isArray(parsed) ? parsed : [];
  } catch {
    history = [];
  }
}

history.push(snapshot);
if (Number.isFinite(maxHistory) && maxHistory > 0 && history.length > maxHistory) {
  history = history.slice(history.length - maxHistory);
}

ensureParentDirectory(outputPath);
writeFileSync(outputPath, `${JSON.stringify(history, null, 2)}\n`, "utf-8");

const markdownRows = records
  .map(
    (repo) =>
      `| ${repo.project_titles.join(", ") || "-"} | ${repo.repository} | ${repo.default_branch} | ${repo.portfolio_updated_at ?? "-"} | ${repo.default_branch_committed_at ?? "-"} | ${repo.default_branch_authored_at ?? "-"} | ${repo.updated_at} | ${repo.pushed_at} | [link](${repo.url}) |`,
  )
  .join("\n");

const markdown = `# GitHub Project Last Updated\n\nLast checked: ${checkedAt}\nPortfolio date source: ${portfolioDateField}\nTracked branch: ${branchOverride || "repository default branch"}\n\n| project | repository | branch | portfolio updatedAt | branch committed_at | branch authored_at | github updated_at | github pushed_at | url |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${markdownRows}\n`;
ensureParentDirectory(markdownPath);
writeFileSync(markdownPath, `${markdown}\n`, "utf-8");

console.log(
  `Tracked ${records.length} repo(s). Portfolio ${portfolioWriteEnabled ? "synced" : "not written"}. Snapshot written to ${outputPath} and ${markdownPath}`,
);
}

await main().catch((error) => {
  console.error(`[github-updates] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
