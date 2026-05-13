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
import { type ChangeEvent, type ReactNode, useEffect, useRef, useState } from "react";
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
