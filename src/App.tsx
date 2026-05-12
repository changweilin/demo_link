import {
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  CalendarPlus,
  Check,
  ChevronRight,
  Code2,
  ExternalLink,
  Github,
  Linkedin,
  Microscope,
  Moon,
  Mountain,
  Radar,
  Sun,
  Telescope,
  Waves,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import CakeResumePage from "./CakeResumePage";
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

type ResumeSummaryItem = {
  organization: string;
  title: string;
  period: string;
  summary: string;
  tags: string[];
  icon: string;
};

type ThemeMode = "day" | "night";
type PageMode = "home" | "full-resume";
type ProjectSortMode = "updatedAt" | "createdAt";
type ProjectSortDirection = "desc" | "asc";

const themeStorageKey = "portfolio-theme-mode";
const defaultProjectSort: ProjectSortMode = "updatedAt";
const defaultProjectSortDirection: ProjectSortDirection = "desc";
const projects = portfolio.projects as Project[];
const profile = portfolio.profile as Profile;
const categories = ["全部", ...Array.from(new Set(projects.map((project) => project.category)))];
const defaultSortedProjects = sortProjects(projects, defaultProjectSort, defaultProjectSortDirection);
const heroProject = defaultSortedProjects[0] ?? projects[0];
const profileAvatarImage = `${import.meta.env.BASE_URL}github-avatar.png`;
const resumeIconPath = (fileName: string) => `${import.meta.env.BASE_URL}resume-icons/${fileName}`;
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

const workHighlights: ResumeSummaryItem[] = [
  {
    organization: "九齊科技",
    title: "演算法工程師",
    period: "2022 - 現在",
    summary:
      "開發語音控制 IC 與 MCU 端演算法，負責音訊編碼、音高追蹤、變速變調、迴授抑制與圖像處理等函式庫。工作橫跨 Python 模擬、C 語言實作與資源受限環境最佳化。",
    tags: ["DSP", "C", "Python", "MCU"],
    icon: resumeIconPath("nyquest.png"),
  },
  {
    organization: "亞迪電子",
    title: "演算法工程師",
    period: "2020 - 2022",
    summary:
      "結合熱像鏡頭與微波雷達資料，開發非接觸式呼吸心跳監測、熱影像姿態/跌倒辨識與病徵模型。也建立 GUI、資料收集與自動化腳本支援實驗流程。",
    tags: ["Python", "C++", "OpenCV", "YOLO"],
    icon: resumeIconPath("adi.png"),
  },
  {
    organization: "元鼎音訊",
    title: "軟體工程師",
    period: "2016 - 2020",
    summary:
      "投入藍牙耳機與輔聽器相關演算法，在 CSR/AB 晶片上實作語音增強、VAD、降噪、DRC 與雙耳拍音。重點是把 DSP 模型壓進有限算力並維持聲音品質。",
    tags: ["Audio DSP", "C", "Assembly"],
    icon: resumeIconPath("avantree.png"),
  },
  {
    organization: "廣達電腦",
    title: "射頻工程師",
    period: "2014 - 2016",
    summary:
      "負責射頻元件測試與客戶專案支援，撰寫自動化測試程式進行儀器控制、數據分析與良率追蹤。也參與試產、問題定位與改善報告整理。",
    tags: ["RF", "Automation", "Data Analysis"],
    icon: resumeIconPath("quanta.png"),
  },
  {
    organization: "中央研究院",
    title: "研究助理",
    period: "2013 - 2014",
    summary:
      "在原分所實驗室設計干涉式散射光學顯微鏡，建立高幀率奈米粒子定位與追蹤流程。研究聚焦細胞膜物理特性，成果發表於 Optics Express。",
    tags: ["Optics", "Microscopy", "Research"],
    icon: resumeIconPath("academia-sinica.png"),
  },
];

const educationHighlights: ResumeSummaryItem[] = [
  {
    organization: "國立台灣大學",
    title: "物理研究所 碩士",
    period: "2009 - 2012",
    summary:
      "碩士期間加入生醫光學實驗室，研究非線性光學、飛秒雷射與超解析顯微技術。也參與跨校合作計畫，將光學工具應用於非侵入式 3D 生醫影像。",
    tags: ["Physics", "Bio-Optics", "Microscopy"],
    icon: resumeIconPath("ntu.png"),
  },
  {
    organization: "國立成功大學",
    title: "物理學系 學士",
    period: "2005 - 2009",
    summary:
      "大學主修物理，參與電漿與太空科學中心的探測計畫，透過軟體模擬天線、傳輸線與探測器頻譜。課程與社團經驗養成跨領域探索習慣。",
    tags: ["Physics", "Plasma", "Simulation"],
    icon: resumeIconPath("ncku.png"),
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

function getInitialPageMode(): PageMode {
  if (typeof window === "undefined") return "home";
  return window.location.hash === "#full-resume" ? "full-resume" : "home";
}

function getProjectDateValue(project: Project, sortMode: ProjectSortMode) {
  const timestamp = Date.parse(project[sortMode]);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortProjects(projectList: Project[], sortMode: ProjectSortMode, direction: ProjectSortDirection) {
  return [...projectList].sort((projectA, projectB) => {
    const dateDelta = getProjectDateValue(projectB, sortMode) - getProjectDateValue(projectA, sortMode);
    const sortedByDirection = direction === "asc" ? -dateDelta : dateDelta;
    if (sortedByDirection !== 0) return sortedByDirection;
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
  const [projectSortDirection, setProjectSortDirection] =
    useState<ProjectSortDirection>(defaultProjectSortDirection);
  const [selectedProject, setSelectedProject] = useState<Project>(heroProject);
  const [copied, setCopied] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme);
  const [pageMode, setPageMode] = useState<PageMode>(getInitialPageMode);
  const isNightMode = themeMode === "night";
  const activeSortOption =
    projectSortOptions.find((option) => option.value === projectSortMode) ?? projectSortOptions[0];

  const visibleProjects = useMemo(() => {
    const categoryProjects =
      activeCategory === "全部" ? projects : projects.filter((project) => project.category === activeCategory);
    return sortProjects(categoryProjects, projectSortMode, projectSortDirection);
  }, [activeCategory, projectSortMode, projectSortDirection]);

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

  useEffect(() => {
  const handleHashChange = () => {
      setPageMode(window.location.hash === "#full-resume" ? "full-resume" : "home");
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

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

  const handleOpenCakeResume = () => {
    setPageMode("full-resume");
    window.location.hash = "full-resume";
    window.scrollTo({ top: 0 });
  };

  const handleBackHome = () => {
    setPageMode("home");
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}`);
    window.scrollTo({ top: 0 });
  };

  const handleCategorySelect = (category: string) => {
    setActiveCategory(category);

    const categoryProjects =
      category === "全部" ? projects : projects.filter((project) => project.category === category);
    const sortedCategoryProjects = sortProjects(categoryProjects, projectSortMode, projectSortDirection);
    const selectedProjectIsVisible = sortedCategoryProjects.some((project) => project.title === selectedProject.title);

    if (!selectedProjectIsVisible && sortedCategoryProjects[0]) {
      setSelectedProject(sortedCategoryProjects[0]);
    }
  };

  const handleProjectSelect = (project: Project) => {
    if (project.title === selectedProject.title && project.links.demo) {
      window.location.assign(project.links.demo);
      return;
    }

    setSelectedProject(project);
  };

  if (pageMode === "full-resume") {
    return <CakeResumePage onBackHome={handleBackHome} />;
  }

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
            <a href="#full-resume" onClick={handleOpenCakeResume}>
              完整版履歷
            </a>
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
          <SocialLinks links={profile.socialLinks.filter((link) => link.label !== "履歷")} />
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
                const directionSuffix = isActive
                  ? projectSortDirection === "desc"
                    ? "（由新到舊）"
                    : "（由舊到新）"
                  : "";

                return (
                  <button
                    key={option.value}
                    className={isActive ? "active" : ""}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      if (projectSortMode === option.value) {
                        setProjectSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
                      } else {
                        setProjectSortMode(option.value);
                        setProjectSortDirection("desc");
                      }
                    }}
                  >
                    <SortIcon size={16} aria-hidden="true" />
                    <span>
                      {option.label}
                      {directionSuffix}
                    </span>
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
                aria-label={
                  project.title === selectedProject.title && project.links.demo
                    ? `${project.title}，再次點擊開啟 Demo`
                    : project.title
                }
                onClick={() => handleProjectSelect(project)}
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
        <div className="experience-preview" aria-labelledby="experience-preview-title">
          <div className="experience-preview-heading">
            <div>
              <p className="eyebrow">Career Snapshot</p>
              <h3 id="experience-preview-title">學經歷摘要</h3>
            </div>
            <a className="inline-link" href="#full-resume" onClick={handleOpenCakeResume}>
              查看完整版履歷
              <ExternalLink size={17} aria-hidden="true" />
            </a>
          </div>
          <div className="experience-columns">
            <ResumeSummaryGroup id="work-experience-summary" title="工作經歷" items={workHighlights} />
            <ResumeSummaryGroup id="education-summary" title="學歷" items={educationHighlights} />
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

function ResumeSummaryGroup({
  id,
  title,
  items,
}: {
  id: string;
  title: string;
  items: ResumeSummaryItem[];
}) {
  return (
    <section className="experience-list" aria-labelledby={id}>
      <h4 id={id}>{title}</h4>
      <div className="experience-items">
        {items.map((item) => (
          <article className="experience-item" key={`${item.organization}-${item.period}`}>
            <div className="experience-card-header">
              <img className="experience-logo" src={item.icon} alt={`${item.organization} 圖示`} loading="lazy" />
              <div>
                <div className="experience-meta">
                  <span>{item.period}</span>
                  <span>{item.organization}</span>
                </div>
                <h5>{item.title}</h5>
              </div>
            </div>
            <p>{item.summary}</p>
            <div className="tag-row">
              {item.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default App;
