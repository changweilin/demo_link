import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  CalendarPlus,
  Check,
  ChevronRight,
  Code2,
  ExternalLink,
  Gamepad2,
  Github,
  Linkedin,
  Map,
  Microscope,
  Moon,
  Mountain,
  Radar,
  Route,
  Sun,
  Telescope,
  Train,
  Waves,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import portfolio from "./data/portfolio.json";

type LinkSet = {
  demo?: string;
  repo?: string;
  caseStudy?: string;
};

type Project = {
  title: string;
  summary: string;
  description: string;
  tags: string[];
  category: string;
  year: string;
  createdAt: string;
  updatedAt: string;
  links: LinkSet;
};

type SocialLink = {
  label: string;
  url: string;
};

type Profile = {
  name: string;
  englishName: string;
  role: string;
  location: string;
  resumeUrl: string;
  intro: string;
  quote: {
    zh: string;
    en: string;
    source: string;
  };
  socialLinks: SocialLink[];
};

type ThemeMode = "day" | "night";
type ProjectSortMode = "updatedAt" | "createdAt";

const themeStorageKey = "portfolio-theme-mode";
const defaultProjectSort: ProjectSortMode = "updatedAt";
const projects = portfolio.projects as Project[];
const profile = portfolio.profile as Profile;
const categories = ["全部", ...Array.from(new Set(projects.map((project) => project.category)))];
const defaultSortedProjects = sortProjects(projects, defaultProjectSort);
const heroProject = defaultSortedProjects[0] ?? projects[0];
const profileAvatarImage = `${import.meta.env.BASE_URL}github-avatar.png`;
const linkLabels: Record<keyof LinkSet, string> = {
  demo: "開啟作品",
  repo: "GitHub",
  caseStudy: "專案筆記",
};
const projectSortOptions: { value: ProjectSortMode; label: string; metaLabel: string }[] = [
  { value: "updatedAt", label: "最後更新日期", metaLabel: "更新" },
  { value: "createdAt", label: "建立日期", metaLabel: "建立" },
];
const projectDateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Taipei",
});

const resumeHighlights = [
  {
    label: "主軸",
    value: "演算法工程",
    text: "深度學習、訊號處理與 AI 輔助開發流程。",
  },
  {
    label: "語言",
    value: "C++ / Python / JS",
    text: "從數學模型、工具開發到瀏覽器互動介面。",
  },
  {
    label: "地點",
    value: profile.location,
    text: "完整經歷可由 Cake、GitHub 與 LinkedIn 延伸查看。",
  },
];

const skillCards = [
  {
    icon: <BrainCircuit />,
    title: "演算法與深度學習",
    text: "熟悉 DSP、影像/生理訊號處理、Random Forest、CNN、DNN、Transformer 與 Stable Diffusion 等技術脈絡。",
  },
  {
    icon: <Waves />,
    title: "音訊與嵌入式最佳化",
    text: "曾開發語音編碼、音高追蹤、變速變調、VAD、降噪、節拍偵測與 MCU 資源受限環境最佳化。",
  },
  {
    icon: <Microscope />,
    title: "物理與光學背景",
    text: "具天文、光學、電磁學、雷射與顯微技術背景，能把物理直覺轉換為可驗證的演算法模型。",
  },
  {
    icon: <Code2 />,
    title: "AI 工具輔助開發",
    text: "善用 Claude Code、ChatGPT Codex、Antigravity 等工具加速需求拆解、原型實作、重構、測試與文件整理，並維持可驗證的工程品質。",
  },
];

const principleCards = [
  {
    icon: <Telescope />,
    title: "從現象回到模型",
    text: "先理解問題背後的物理、訊號或資料結構，再選擇合適的演算法與介面呈現方式。",
  },
  {
    icon: <Radar />,
    title: "用模擬檢查直覺",
    text: "對遊戲平衡、AI 策略與訊號處理參數保持可重跑的模擬流程，讓調整有依據。",
  },
  {
    icon: <Mountain />,
    title: "把工具帶到真實場景",
    text: "從戶外路線規劃到瀏覽器遊戲，偏好能被實際使用、反覆測試與持續改善的作品。",
  },
];

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "day";

  try {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    if (storedTheme === "day" || storedTheme === "night") return storedTheme;
  } catch {
    // Keep rendering even when storage is unavailable.
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "night" : "day";
}

function getProjectDateValue(project: Project, sortMode: ProjectSortMode) {
  const timestamp = Date.parse(project[sortMode]);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortProjects(projectList: Project[], sortMode: ProjectSortMode) {
  return [...projectList].sort((projectA, projectB) => {
    const dateDelta = getProjectDateValue(projectB, sortMode) - getProjectDateValue(projectA, sortMode);
    if (dateDelta !== 0) return dateDelta;
    return projectA.title.localeCompare(projectB.title, "zh-TW");
  });
}

function formatProjectDate(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "未設定";
  return projectDateFormatter.format(date);
}

function App() {
  const [activeCategory, setActiveCategory] = useState("全部");
  const [projectSortMode, setProjectSortMode] = useState<ProjectSortMode>(defaultProjectSort);
  const [selectedProject, setSelectedProject] = useState<Project>(heroProject);
  const [copied, setCopied] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme);
  const isNightMode = themeMode === "night";
  const activeSortOption =
    projectSortOptions.find((option) => option.value === projectSortMode) ?? projectSortOptions[0];

  const visibleProjects = useMemo(() => {
    const categoryProjects =
      activeCategory === "全部" ? projects : projects.filter((project) => project.category === activeCategory);
    return sortProjects(categoryProjects, projectSortMode);
  }, [activeCategory, projectSortMode]);

  useEffect(() => {
    const root = document.documentElement;
    const themeColor = isNightMode ? "#111512" : "#0f6d78";

    root.dataset.theme = themeMode;
    root.style.colorScheme = isNightMode ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);

    try {
      window.localStorage.setItem(themeStorageKey, themeMode);
    } catch {
      // Theme still works for the current session when storage is unavailable.
    }
  }, [isNightMode, themeMode]);

  const handleCopyProfile = async () => {
    const text = `${profile.name} / ${profile.role}\n${profile.resumeUrl}`;

    try {
      await navigator.clipboard?.writeText(text);
    } catch {
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

    setCopied(true);
    window.setTimeout(() => setCopied(false), 4200);
  };

  const handleThemeToggle = () => {
    setThemeMode((currentTheme) => (currentTheme === "day" ? "night" : "day"));
  };

  const handleCategorySelect = (category: string) => {
    setActiveCategory(category);

    const categoryProjects =
      category === "全部" ? projects : projects.filter((project) => project.category === category);
    const sortedCategoryProjects = sortProjects(categoryProjects, projectSortMode);
    const selectedProjectIsVisible = sortedCategoryProjects.some((project) => project.title === selectedProject.title);

    if (!selectedProjectIsVisible && sortedCategoryProjects[0]) {
      setSelectedProject(sortedCategoryProjects[0]);
    }
  };

  return (
    <main>
      <header className="site-header" aria-label="主選單">
        <a className="brand" href="#top" aria-label={`${profile.name} 首頁`}>
          <span className="brand-mark" aria-hidden="true">
            &gt;_
          </span>
          <span>{profile.name}</span>
        </a>
        <div className="header-actions">
          <nav>
            <a href="#works">作品</a>
            <a href="#resume">履歷</a>
            <a href="#contact">聯絡</a>
          </nav>
          <button
            className="theme-toggle"
            type="button"
            aria-label={isNightMode ? "目前晚上模式，切換為白天模式" : "目前白天模式，切換為晚上模式"}
            aria-pressed={isNightMode}
            onClick={handleThemeToggle}
          >
            <span className="theme-toggle-icon" aria-hidden="true">
              {isNightMode ? <Moon size={17} /> : <Sun size={17} />}
            </span>
            <span>{isNightMode ? "晚上" : "白天"}</span>
          </button>
        </div>
      </header>

      <section id="top" className="hero section-shell" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">&lt; Algorithm Engineer / AI Software /&gt;</p>
          <div className="hero-identity">
            <img className="profile-avatar" src={profileAvatarImage} alt={`${profile.name} 真人照片`} />
            <h1 id="hero-title">{profile.name}</h1>
          </div>
          <p className="role">{profile.role}</p>
          <span className="title-rule" aria-hidden="true" />
          <p className="intro">{profile.intro}</p>
          <figure className="quote">
            <blockquote>
              <span>{profile.quote.zh}</span>
              <span>{profile.quote.en}</span>
            </blockquote>
            <figcaption>- {profile.quote.source}</figcaption>
          </figure>
          <div className="hero-actions">
            <a className="button button-primary" href="#works">
              查看作品
              <ArrowRight size={20} aria-hidden="true" />
            </a>
            <a className="button button-secondary" href={profile.resumeUrl} target="_blank" rel="noreferrer">
              Cake 履歷
              <ExternalLink size={19} aria-hidden="true" />
            </a>
          </div>
          <SocialLinks links={profile.socialLinks} />
        </div>

        <div className="hero-stack" aria-label="作品與履歷快速入口">
          <ProjectQuickPanel selectedProject={selectedProject} onSelect={setSelectedProject} />
          <ResumePanel />
        </div>
      </section>

      <section id="works" className="section-shell works" aria-labelledby="works-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Portfolio Index</p>
            <h2 id="works-title">作品</h2>
          </div>
          <div className="project-controls">
            <div className="sort-group" role="radiogroup" aria-label="專案排序">
              {projectSortOptions.map((option) => {
                const isActive = option.value === projectSortMode;
                const SortIcon = option.value === "updatedAt" ? CalendarClock : CalendarPlus;

                return (
                  <button
                    key={option.value}
                    className={isActive ? "active" : ""}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setProjectSortMode(option.value)}
                  >
                    <SortIcon size={16} aria-hidden="true" />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="filter-group" aria-label="依作品類型篩選">
              {categories.map((category) => (
                <button
                  key={category}
                  className={category === activeCategory ? "active" : ""}
                  type="button"
                  onClick={() => handleCategorySelect(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="work-layout">
          <div className="project-list" aria-label="作品列表">
            {visibleProjects.map((project) => (
              <button
                key={project.title}
                className={project.title === selectedProject.title ? "project-row selected" : "project-row"}
                type="button"
                onClick={() => setSelectedProject(project)}
              >
                <span>
                  <strong>{project.title}</strong>
                  <small>
                    {project.category} / {project.year}
                  </small>
                  <small>
                    {activeSortOption.metaLabel} {formatProjectDate(project[projectSortMode])}
                  </small>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
          <ProjectDetail project={selectedProject} />
        </div>
      </section>

      <section id="resume" className="section-shell resume" aria-labelledby="resume-title">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Resume Focus</p>
            <h2 id="resume-title">履歷重點</h2>
          </div>
          <p>
            履歷以演算法、深度學習、訊號處理、物理背景與 AI 工具實作能力為主軸；作品則把這些能力落到地圖工具、AI
            遊戲與互動網頁。
          </p>
        </div>
        <div className="resume-layout">
          <div className="skill-grid">
            {skillCards.map((skill) => (
              <SkillCard key={skill.title} {...skill} />
            ))}
          </div>
          <div className="principle-list" aria-label="工作方式">
            {principleCards.map((principle) => (
              <Principle key={principle.title} {...principle} />
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="section-shell contact" aria-labelledby="contact-title">
        <div>
          <p className="eyebrow">Profile Links</p>
          <h2 id="contact-title">聯絡與履歷</h2>
          <p>目前先建立繁體中文版本。可透過 Cake 履歷、GitHub 或 LinkedIn 查看完整經歷與作品。</p>
        </div>
        <div className="contact-actions">
          <button className="button button-primary" type="button" onClick={handleCopyProfile}>
            {copied ? "已複製履歷資訊" : "複製履歷資訊"}
            <Check size={20} aria-hidden="true" />
          </button>
          <a className="button button-secondary" href={profile.resumeUrl} target="_blank" rel="noreferrer">
            Cake 履歷
            <ExternalLink size={20} aria-hidden="true" />
          </a>
        </div>
      </section>
    </main>
  );
}

function SocialLinks({ links }: { links: SocialLink[] }) {
  return (
    <div className="social-links" aria-label="個人連結">
      {links.map((link) => (
        <a key={link.label} href={link.url} target="_blank" rel="noreferrer" aria-label={link.label}>
          {link.label === "GitHub" ? (
            <Github size={22} />
          ) : link.label === "LinkedIn" ? (
            <Linkedin size={22} />
          ) : (
            <ExternalLink size={22} />
          )}
        </a>
      ))}
    </div>
  );
}

function ProjectQuickPanel({
  selectedProject,
  onSelect,
}: {
  selectedProject: Project;
  onSelect: (project: Project) => void;
}) {
  const selectedUrl = selectedProject.links.demo || selectedProject.links.repo;

  return (
    <section className="quick-panel" aria-labelledby="quick-projects-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Quick Portfolio</p>
          <h2 id="quick-projects-title">作品快速入口</h2>
        </div>
        <span>{projects.length} 件公開作品</span>
      </div>
      <div className="quick-project-list">
        {defaultSortedProjects.map((project) => (
          <button
            key={project.title}
            className={project.title === selectedProject.title ? "quick-project active" : "quick-project"}
            type="button"
            onClick={() => onSelect(project)}
          >
            <span className="project-mini-icon">{getProjectIcon(project.title, 19)}</span>
            <span>
              <strong>{project.title}</strong>
              <small>
                {project.category} / {project.year}
              </small>
              <small>更新 {formatProjectDate(project.updatedAt)}</small>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        ))}
      </div>
      <article className="quick-detail" aria-live="polite">
        <div className="detail-meta">
          <span>目前選取</span>
          <span>更新 {formatProjectDate(selectedProject.updatedAt)}</span>
        </div>
        <h3>{selectedProject.title}</h3>
        <p>{selectedProject.summary}</p>
        <div className="tag-row">
          {selectedProject.tags.slice(0, 5).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <a className="text-link" href={selectedUrl} target="_blank" rel="noreferrer">
          開啟作品
          <ExternalLink size={17} aria-hidden="true" />
        </a>
      </article>
    </section>
  );
}

function ResumePanel() {
  return (
    <section className="resume-panel" aria-labelledby="quick-resume-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Resume Snapshot</p>
          <h2 id="quick-resume-title">履歷重點</h2>
        </div>
      </div>
      <div className="resume-highlight-grid">
        {resumeHighlights.map((item) => (
          <article key={item.label} className="resume-highlight">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
      <div className="resume-links">
        {profile.socialLinks.map((link) => (
          <a key={link.label} href={link.url} target="_blank" rel="noreferrer">
            {link.label}
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        ))}
      </div>
    </section>
  );
}

function getProjectIcon(title: string, size: number) {
  if (title.includes("Mapping")) return <Map size={size} aria-hidden="true" />;
  if (title.includes("Hex")) return <Gamepad2 size={size} aria-hidden="true" />;
  if (title.includes("TSP")) return <Route size={size} aria-hidden="true" />;
  if (title.includes("IIR")) return <Activity size={size} aria-hidden="true" />;
  return <Train size={size} aria-hidden="true" />;
}

function ProjectDetail({ project }: { project: Project }) {
  return (
    <article className="project-detail" aria-live="polite">
      <div className="detail-meta">
        <span>{project.category}</span>
        <span>{project.year}</span>
        <span>建立 {formatProjectDate(project.createdAt)}</span>
        <span>更新 {formatProjectDate(project.updatedAt)}</span>
      </div>
      <h3>{project.title}</h3>
      <p>{project.description}</p>
      <div className="tag-row">
        {project.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className="detail-links">
        {(Object.entries(project.links) as [keyof LinkSet, string][])
          .filter(([, url]) => Boolean(url))
          .map(([key, url]) => (
            <a key={key} href={url} target="_blank" rel="noreferrer">
              {linkLabels[key]}
              <ExternalLink size={17} aria-hidden="true" />
            </a>
          ))}
      </div>
    </article>
  );
}

function SkillCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="skill-card">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function Principle({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="principle">
      <span>{icon}</span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  );
}

export default App;
