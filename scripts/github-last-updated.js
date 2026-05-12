import { dirname } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const portfolioPath = process.env.TRACK_PORTFOLIO_PATH || "src/data/portfolio.json";
const outputPath = process.env.TRACK_OUTPUT_PATH || "docs/github-last-updated.json";
const markdownPath = process.env.TRACK_MARKDOWN_PATH || "docs/github-last-updated.md";
const maxHistory = Number.parseInt(process.env.TRACK_MAX_HISTORY || "30", 10);
const portfolioWriteEnabled = process.env.TRACK_PORTFOLIO_WRITE !== "false";
const portfolioDateField = process.env.TRACK_PORTFOLIO_DATE_FIELD === "updated_at" ? "updated_at" : "pushed_at";

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
  const reposInput = process.env.TRACK_REPOS || process.env.GITHUB_REPOSITORY || "";
  return reposInput
    .split(",")
    .map((repo) => normalizeRepoIdentifier(repo))
    .filter(Boolean);
}

function getPortfolio() {
  if (!existsSync(portfolioPath)) return null;

  const raw = readFileSync(portfolioPath, "utf-8");
  return JSON.parse(raw);
}

function getPortfolioRepoMap(portfolio) {
  const repoMap = new Map();

  for (const project of portfolio?.projects ?? []) {
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

async function fetchRepository(repo) {
  const apiUrl = `https://api.github.com/repos/${repo}`;
  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch ${repo}: ${response.status} ${response.statusText} ${body}`);
  }

  return response.json();
}

const portfolio = getPortfolio();
const portfolioRepoMap = getPortfolioRepoMap(portfolio);
const repos = getTrackedRepos(portfolioRepoMap);

if (repos.length === 0) {
  throw new Error(
    `Missing repo list. Add project links.repo entries to ${portfolioPath}, or set TRACK_REPOS (e.g. owner/name,owner2/name2).`,
  );
}

const checkedAt = new Date().toISOString();

const records = await Promise.all(
  repos.map(async (repo) => {
    const data = await fetchRepository(repo);
    const projectTitles = (portfolioRepoMap.get(repo) ?? []).map((project) => project.title).filter(Boolean);
    const portfolioUpdatedAt = data[portfolioDateField] ?? data.updated_at;

    return {
      project_titles: projectTitles,
      repository: data.full_name ?? repo,
      created_at: data.created_at,
      updated_at: data.updated_at,
      pushed_at: data.pushed_at,
      portfolio_updated_at: portfolioUpdatedAt,
      url: data.html_url,
      archived: data.archived ?? false,
    };
  }),
);

if (portfolio && portfolioWriteEnabled) {
  const recordsByRepo = new Map(
    records.map((record) => [normalizeRepoIdentifier(record.repository), record]),
  );

  for (const project of portfolio.projects ?? []) {
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
      `| ${repo.project_titles.join(", ") || "-"} | ${repo.repository} | ${repo.portfolio_updated_at} | ${repo.updated_at} | ${repo.pushed_at} | [link](${repo.url}) |`,
  )
  .join("\n");

const markdown = `# GitHub Project Last Updated\n\nLast checked: ${checkedAt}\nPortfolio date source: ${portfolioDateField}\n\n| project | repository | portfolio updatedAt | github updated_at | github pushed_at | url |\n| --- | --- | --- | --- | --- | --- |\n${markdownRows}\n`;
ensureParentDirectory(markdownPath);
writeFileSync(markdownPath, `${markdown}\n`, "utf-8");

console.log(
  `Tracked ${records.length} repos. Portfolio ${portfolioWriteEnabled ? "synced" : "not written"}. Snapshot written to ${outputPath} and ${markdownPath}`,
);
