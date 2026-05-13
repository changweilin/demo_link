import {
  AlertTriangle,
  ArrowLeft,
  Download,
  ExternalLink,
  FileJson,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { type ChangeEvent, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";
import resumeSeed from "./data/resume.json";
import "./resumeEditor.css";
import type { ResumeBullet, ResumeData, ResumeLinkIcon, TimelineItem } from "./types/resume";

type ResumeSectionKey = "workExperience" | "education";
type SavePhase = "idle" | "loading" | "saving" | "success" | "error";

type AsyncStatus = {
  phase: SavePhase;
  message: string;
};

type EditorInitialState = {
  draft: ResumeData;
  status: AsyncStatus;
};

const initialResume = resumeSeed as ResumeData;
const localDraftStorageKey = "resume-editor-local-draft-v1";
const linkIconOptions: ResumeLinkIcon[] = ["external", "github", "linkedin", "mail"];

function cloneResume(data: ResumeData) {
  return JSON.parse(JSON.stringify(data)) as ResumeData;
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

function getResumeJson(draft: ResumeData) {
  return `${JSON.stringify(draft, null, 2)}\n`;
}

function getInitialEditorState(): EditorInitialState {
  const fallbackDraft = cloneResume(initialResume);
  const fallbackStatus = { phase: "idle", message: "" } satisfies AsyncStatus;

  if (typeof window === "undefined") {
    return { draft: fallbackDraft, status: fallbackStatus };
  }

  try {
    const storedDraft = window.localStorage.getItem(localDraftStorageKey);
    if (!storedDraft) return { draft: fallbackDraft, status: fallbackStatus };

    const parsedDraft = JSON.parse(storedDraft) as unknown;
    if (isResumeData(parsedDraft)) {
      return {
        draft: cloneResume(parsedDraft),
        status: { phase: "success", message: "已載入瀏覽器保存的本機草稿。" },
      };
    }

    return {
      draft: fallbackDraft,
      status: { phase: "error", message: "本機草稿格式不符合履歷資料，已改用內建履歷。" },
    };
  } catch {
    return {
      draft: fallbackDraft,
      status: { phase: "error", message: "無法讀取本機草稿，已改用內建履歷。" },
    };
  }
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

function ResumeEditorPage({
  onBackHome,
  onOpenResume,
}: {
  onBackHome: () => void;
  onOpenResume: () => void;
}) {
  const [initialState] = useState(getInitialEditorState);
  const [draft, setDraft] = useState<ResumeData>(() => initialState.draft);
  const [status, setStatus] = useState<AsyncStatus>(() => initialState.status);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(localDraftStorageKey, getResumeJson(draft));
    } catch {
      setStatus({ phase: "error", message: "無法保存本機草稿，請改用下載 JSON 備份。" });
    }
  }, [draft]);

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
    setStatus({ phase: "success", message: "已重設為專案內建履歷資料。" });
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
