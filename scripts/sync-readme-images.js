import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, posix as pathPosix } from "node:path";

const portfolioPath = process.env.README_IMAGE_PORTFOLIO_PATH || "src/data/portfolio.json";
const outputDirectory = process.env.README_IMAGE_OUTPUT_DIR || "public/project-screenshots";
const maxImagesPerProject = Number.parseInt(process.env.README_IMAGE_MAX_IMAGES || "8", 10);

const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "portfolio-readme-image-sync",
};

if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"]);
const extensionByContentType = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/gif", "gif"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);

function normalizeRepoIdentifier(value) {
  if (!value) return "";

  return value
    .trim()
    .replace(/^git@github\.com:/, "")
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/[?#].*$/, "")
    .replace(/\.git$/i, "")
    .replace(/^\/+|\/+$/g, "");
}

function slugify(value) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

async function fetchJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText} ${body}`);
  }

  return response.json();
}

async function fetchImage(url) {
  const response = await fetch(url, { headers: { "User-Agent": headers["User-Agent"] } });
  if (!response.ok) {
    throw new Error(`Failed to fetch image ${url}: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0]?.toLowerCase() || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Skipped non-image response ${url}: ${contentType || "unknown content-type"}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, contentType };
}

function decodeReadmeContent(data) {
  if (data.content && data.encoding === "base64") {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }

  if (typeof data.content === "string") return data.content;
  return "";
}

function getRawUrlParts(readmeData) {
  const readmePath = readmeData.path || "README.md";
  const downloadUrl = readmeData.download_url;
  if (!downloadUrl) return null;

  const rootUrl = downloadUrl.endsWith(readmePath)
    ? downloadUrl.slice(0, -readmePath.length).replace(/\/$/, "")
    : downloadUrl.replace(/\/[^/]*$/, "");
  const readmeDirectory = pathPosix.dirname(readmePath);
  const readmeDirectoryUrl = readmeDirectory === "." ? rootUrl : `${rootUrl}/${readmeDirectory}`;

  return { rootUrl, readmeDirectoryUrl };
}

function getAttribute(markup, attributeName) {
  const pattern = new RegExp(`${attributeName}\\s*=\\s*["']([^"']+)["']`, "i");
  return markup.match(pattern)?.[1]?.trim() || "";
}

function extractReferenceDefinitions(markdown) {
  const references = new Map();
  const referencePattern = /^\s*\[([^\]]+)]:\s*(\S+)(?:\s+["'][^"']*["'])?\s*$/gm;
  let match;

  while ((match = referencePattern.exec(markdown))) {
    references.set(match[1].toLowerCase(), match[2]);
  }

  return references;
}

function cleanImageUrl(value) {
  return value
    .trim()
    .replace(/^<|>$/g, "")
    .replace(/^["']|["']$/g, "");
}

function extractReadmeImages(markdown) {
  const images = [];
  const references = extractReferenceDefinitions(markdown);
  const seen = new Set();

  function addImage(url, alt = "") {
    const cleanedUrl = cleanImageUrl(url);
    if (!cleanedUrl || seen.has(cleanedUrl)) return;

    seen.add(cleanedUrl);
    images.push({ url: cleanedUrl, alt: alt.trim() });
  }

  const inlineImagePattern = /!\[([^\]]*)]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  let match;
  while ((match = inlineImagePattern.exec(markdown))) {
    addImage(match[2], match[1]);
  }

  const referenceImagePattern = /!\[([^\]]*)]\[([^\]]*)]/g;
  while ((match = referenceImagePattern.exec(markdown))) {
    const referenceId = (match[2] || match[1]).toLowerCase();
    const referenceUrl = references.get(referenceId);
    if (referenceUrl) addImage(referenceUrl, match[1]);
  }

  const htmlImagePattern = /<img\b[^>]*>/gi;
  while ((match = htmlImagePattern.exec(markdown))) {
    const tag = match[0];
    const src = getAttribute(tag, "src");
    if (src) addImage(src, getAttribute(tag, "alt"));
  }

  return images;
}

function isImagePath(path) {
  return allowedExtensions.has(extname(path).toLowerCase());
}

function getDisplayPathScore(path) {
  const lower = path.toLowerCase();
  if (!isImagePath(lower)) return 0;
  if (
    /(^|\/)(node_modules|dist|build|android|ios)\//.test(lower) ||
    /(favicon|apple-touch|launcher|logo|icon|splash|avatar|train-icons)/.test(lower)
  ) {
    return 0;
  }

  let score = 0;
  if (/(^|\/)screenshots?(\/|$)/.test(lower)) score += 100;
  if (/(^|\/)readme(\/|$)/.test(lower)) score += 90;
  if (/(^|\/)images(\/|$)/.test(lower)) score += 82;
  if (/(^|\/)promos\//.test(lower)) score += 78;
  if (/(^|\/)promos?-/.test(lower)) score += 38;
  if (/(backup|scratch|generated-after-plan)/.test(lower)) score -= 45;
  if (/desktop/.test(lower)) score += 5;
  if (/mobile/.test(lower)) score += 4;

  return Math.max(score, 0);
}

function toRawGitHubUrl(repo, branch, path) {
  return `https://raw.githubusercontent.com/${repo}/${encodeURIComponent(branch)}/${path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

function getAltFromPath(projectTitle, path, index) {
  const fileName = pathPosix.basename(path).replace(/\.[^.]+$/, "");
  const readableName = fileName.replace(/[-_]+/g, " ").trim();
  return readableName ? `${projectTitle} ${readableName} 作品圖片` : `${projectTitle} README 作品圖片 ${index + 1}`;
}

async function getRepositoryDisplayImages(repo, projectTitle) {
  const repository = await fetchJson(`https://api.github.com/repos/${repo}`);
  const branch = repository.default_branch || "main";
  const tree = await fetchJson(
    `https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  );

  return (tree.tree ?? [])
    .filter((item) => item.type === "blob")
    .map((item) => ({ path: item.path, score: getDisplayPathScore(item.path) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .map((item, index) => ({
      url: toRawGitHubUrl(repo, branch, item.path),
      alt: getAltFromPath(projectTitle, item.path, index),
    }));
}

function convertGitHubBlobUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return url;

    const parts = parsed.pathname.split("/").filter(Boolean);
    const blobIndex = parts.indexOf("blob");
    const rawIndex = parts.indexOf("raw");
    const modeIndex = blobIndex === -1 ? rawIndex : blobIndex;
    if (parts.length < 5 || modeIndex !== 2) return url;

    const [owner, repo] = parts;
    const branch = parts[3];
    const filePath = parts.slice(4).join("/");
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}${parsed.search}`;
  } catch {
    return url;
  }
}

function resolveImageUrl(imageUrl, rawUrlParts) {
  if (/^data:/i.test(imageUrl)) return "";
  if (/^https?:\/\//i.test(imageUrl)) return convertGitHubBlobUrl(imageUrl);
  if (!rawUrlParts) return "";

  if (imageUrl.startsWith("/")) {
    return `${rawUrlParts.rootUrl}${imageUrl}`;
  }

  return new URL(imageUrl, `${rawUrlParts.readmeDirectoryUrl}/`).toString();
}

function shouldTryImage(image) {
  const lower = `${image.url} ${image.alt}`.toLowerCase();
  if (
    lower.includes("shields.io") ||
    lower.includes("badge") ||
    lower.includes("license") ||
    lower.includes("coveralls") ||
    lower.includes("codecov")
  ) {
    return false;
  }

  const extension = extname(new URL(image.url, "https://example.invalid").pathname).toLowerCase();
  return !extension || allowedExtensions.has(extension);
}

function getFileExtension(url, contentType) {
  const extension = extname(new URL(url).pathname).toLowerCase();
  if (allowedExtensions.has(extension)) {
    return extension === ".jpeg" ? "jpg" : extension.slice(1);
  }

  return extensionByContentType.get(contentType) || "png";
}

async function getProjectReadmeImages(project) {
  const repo = normalizeRepoIdentifier(project.links?.repo);
  if (!repo) return [];

  const readmeData = await fetchJson(`https://api.github.com/repos/${repo}/readme`);
  const markdown = decodeReadmeContent(readmeData);
  const rawUrlParts = getRawUrlParts(readmeData);
  const readmeImages = extractReadmeImages(markdown)
    .map((image) => ({
      ...image,
      url: resolveImageUrl(image.url, rawUrlParts),
    }))
    .filter((image) => image.url && shouldTryImage(image));
  const repositoryDisplayImages = await getRepositoryDisplayImages(repo, project.title);
  const seen = new Set();

  return [...readmeImages, ...repositoryDisplayImages]
    .filter((image) => {
      if (seen.has(image.url)) return false;
      seen.add(image.url);
      return true;
    })
    .filter((image) => image.url && shouldTryImage(image))
    .slice(0, Number.isFinite(maxImagesPerProject) && maxImagesPerProject > 0 ? maxImagesPerProject : 8);
}

async function syncProjectImages(project) {
  const sourceImages = await getProjectReadmeImages(project);
  const slug = slugify(project.title);
  const downloadedImages = [];

  for (const sourceImage of sourceImages) {
    try {
      const downloadedImage = await fetchImage(sourceImage.url);
      downloadedImages.push({ ...sourceImage, ...downloadedImage });
    } catch (error) {
      console.warn(`[${project.title}] ${error.message}`);
    }
  }

  if (downloadedImages.length === 0) {
    if (project.screenshot && !Array.isArray(project.screenshots)) {
      project.screenshots = [project.screenshot];
    }

    console.warn(`[${project.title}] No README images found; keeping existing screenshot data.`);
    return false;
  }

  mkdirSync(outputDirectory, { recursive: true });

  const screenshots = downloadedImages.map((image, index) => {
    const extension = getFileExtension(image.url, image.contentType);
    const fileName = index === 0 ? `${slug}.${extension}` : `${slug}-${index + 1}.${extension}`;
    const outputPath = join(outputDirectory, fileName);
    writeFileSync(outputPath, image.buffer);

    return {
      src: `project-screenshots/${fileName}`,
      alt: image.alt || `${project.title} README 作品圖片 ${index + 1}`,
    };
  });

  project.screenshot = screenshots[0];
  project.screenshots = screenshots;
  return true;
}

if (!existsSync(portfolioPath)) {
  throw new Error(`Portfolio data file not found: ${portfolioPath}`);
}

const portfolio = JSON.parse(readFileSync(portfolioPath, "utf-8"));
const results = [];

for (const project of portfolio.projects ?? []) {
  try {
    const changed = await syncProjectImages(project);
    results.push({ title: project.title, changed, count: project.screenshots?.length ?? 0 });
  } catch (error) {
    if (project.screenshot && !Array.isArray(project.screenshots)) {
      project.screenshots = [project.screenshot];
    }

    console.warn(`[${project.title}] ${error.message}`);
    results.push({ title: project.title, changed: false, count: project.screenshots?.length ?? 0 });
  }
}

writeFileSync(portfolioPath, `${JSON.stringify(portfolio, null, 2)}\n`, "utf-8");

for (const result of results) {
  console.log(`${result.changed ? "updated" : "kept"} ${result.title}: ${result.count} image(s)`);
}
