import { existsSync, readFileSync, writeFileSync } from "node:fs";

const reposInput = process.env.TRACK_REPOS || process.env.GITHUB_REPOSITORY || "";
if (!reposInput.trim()) {
  throw new Error("Missing repo list. Set TRACK_REPOS (e.g. owner/name,owner2/name2) or run inside a GitHub repo.");
}

const repos = reposInput
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean)
  .map((repo) => repo.replace(/^https:\/\/github\.com\//, ""));

const outputPath = process.env.TRACK_OUTPUT_PATH || "docs/github-last-updated.json";
const markdownPath = process.env.TRACK_MARKDOWN_PATH || "docs/github-last-updated.md";
const maxHistory = Number.parseInt(process.env.TRACK_MAX_HISTORY || "30", 10);

const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "github-last-updated-tracker",
};

if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

const records = [];
const checkedAt = new Date().toISOString();

for (const repo of repos) {
  const apiUrl = `https://api.github.com/repos/${repo}`;
  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch ${repo}: ${response.status} ${response.statusText} ${body}`);
  }

  const data = await response.json();
  records.push({
    repository: data.full_name ?? repo,
    updated_at: data.updated_at,
    pushed_at: data.pushed_at,
    url: data.html_url,
    archived: data.archived ?? false,
  });
}

const snapshot = {
  checked_at: checkedAt,
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

writeFileSync(outputPath, `${JSON.stringify(history, null, 2)}\n`, "utf-8");

const markdownRows = records
  .map(
    (repo) =>
      `| ${repo.repository} | ${repo.updated_at} | ${repo.pushed_at} | [link](${repo.url}) |`,
  )
  .join("\n");

const markdown = `# GitHub Project Last Updated\n\nLast checked: ${checkedAt}\n\n| repository | updated_at | pushed_at | url |\n| --- | --- | --- | --- |\n${markdownRows}\n`;
writeFileSync(markdownPath, `${markdown}\n`, "utf-8");

console.log(`Tracked ${records.length} repos. Snapshot written to ${outputPath} and ${markdownPath}`);
