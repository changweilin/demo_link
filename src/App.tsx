import {
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  CalendarPlus,
  Check,
  ChevronLeft,
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
  X,
} from "lucide-react";
import {
  type ComponentType,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import CakeResumePage from "./CakeResumePage";
import { loadPortfolioDraftFromStorage } from "./portfolioDraft";
import type { PortfolioData, PortfolioLinkSet, PortfolioSocialLink, Project, ProjectScreenshot } from "./types/portfolio";

type ResumeSummaryItem = {
  organization: string;
  title: string;
  period: string;
  summary: string;
  tags: string[];
  icon: string;
};

type ResumeEditorPageProps = {
  onBackHome: () => void;
  onOpenResume: () => void;
  onPortfolioChange: (portfolio: PortfolioData) => void;
};

type ThemeMode = "day" | "night";
type PageMode = "home" | "full-resume" | "resume-editor";
type ProjectSortMode = "updatedAt" | "createdAt";
type ProjectSortDirection = "desc" | "asc";
type ProjectSwipeDirection = "previous" | "next";

const themeStorageKey = "portfolio-theme-mode";
const defaultProjectSort: ProjectSortMode = "updatedAt";
const defaultProjectSortDirection: ProjectSortDirection = "desc";
const profileAvatarImage = `${import.meta.env.BASE_URL}github-avatar.png`;
const resumeIconPath = (fileName: string) => `${import.meta.env.BASE_URL}resume-icons/${fileName}`;
const resumeEditorEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_RESUME_EDITOR !== "false";
const resumeEditorModulePath = "/src/ResumeEditorPage.tsx";
const LazyResumeEditorPage = resumeEditorEnabled
  ? lazy(
      () =>
        import(/* @vite-ignore */ resumeEditorModulePath) as Promise<{
          default: ComponentType<ResumeEditorPageProps>;
        }>,
    )
  : null;
const linkLabels: Record<keyof PortfolioLinkSet, string> = {
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
  return getPageModeFromHash();
}

function getPageModeFromHash(): PageMode {
  if (typeof window === "undefined") return "home";
  if (resumeEditorEnabled && window.location.hash === "#resume-editor") return "resume-editor";
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

function resolvePublicAssetPath(path: string) {
  if (/^(https?:|data:)/.test(path)) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
}

function getLocalResumeUrl() {
  if (typeof window === "undefined") return "#full-resume";
  return `${window.location.origin}${window.location.pathname}${window.location.search}#full-resume`;
}

function App() {
  const [portfolioDraft, setPortfolioDraft] = useState<PortfolioData>(() => loadPortfolioDraftFromStorage().draft);
  const [activeCategory, setActiveCategory] = useState("全部");
  const [projectSortMode, setProjectSortMode] = useState<ProjectSortMode>(defaultProjectSort);
  const [projectSortDirection, setProjectSortDirection] =
    useState<ProjectSortDirection>(defaultProjectSortDirection);
  const [selectedProject, setSelectedProject] = useState<Project | null>(() => {
    const initialProjects = loadPortfolioDraftFromStorage().draft.projects;
    return sortProjects(initialProjects, defaultProjectSort, defaultProjectSortDirection)[0] ?? initialProjects[0] ?? null;
  });
  const [copied, setCopied] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme);
  const [pageMode, setPageMode] = useState<PageMode>(getInitialPageMode);
  const projects = portfolioDraft.projects;
  const profile = portfolioDraft.profile;
  const categories = useMemo(() => ["全部", ...Array.from(new Set(projects.map((project) => project.category)))], [projects]);
  const isNightMode = themeMode === "night";
  const activeSortOption =
    projectSortOptions.find((option) => option.value === projectSortMode) ?? projectSortOptions[0];

  const visibleProjects = useMemo(() => {
    const categoryProjects =
      activeCategory === "全部" ? projects : projects.filter((project) => project.category === activeCategory);
    return sortProjects(categoryProjects, projectSortMode, projectSortDirection);
  }, [activeCategory, projectSortDirection, projectSortMode, projects]);

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
    if (categories.includes(activeCategory)) return;
    setActiveCategory("全部");
  }, [activeCategory, categories]);

  useEffect(() => {
    setSelectedProject((currentProject) => {
      if (currentProject) {
        const refreshedProject = projects.find((project) => project.title === currentProject.title);
        if (refreshedProject) return refreshedProject;
      }

      return visibleProjects[0] ?? projects[0] ?? null;
    });
  }, [projects, visibleProjects]);

  useEffect(() => {
    const handleHashChange = () => {
      setPageMode(getPageModeFromHash());
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleCopyProfile = async () => {
    const text = `${profile.name} / ${profile.role}\n${getLocalResumeUrl()}`;

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

  const handleOpenPage = (nextPageMode: PageMode, hash: string) => {
    setPageMode(nextPageMode);
    window.location.hash = hash;
    window.scrollTo({ top: 0 });
  };

  const handleOpenCakeResume = () => {
    handleOpenPage("full-resume", "full-resume");
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
    const selectedProjectIsVisible = sortedCategoryProjects.some((project) => project.title === selectedProject?.title);

    if (!selectedProjectIsVisible && sortedCategoryProjects[0]) {
      setSelectedProject(sortedCategoryProjects[0]);
    }
  };

  const handleProjectSelect = (project: Project) => {
    if (project.title === selectedProject?.title && project.links.demo) {
      window.location.assign(project.links.demo);
      return;
    }

    setSelectedProject(project);
  };

  const handleProjectSwipe = (direction: ProjectSwipeDirection) => {
    if (!selectedProject) return;

    const currentIndex = visibleProjects.findIndex((project) => project.title === selectedProject.title);
    if (currentIndex === -1) return;

    const nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    const nextProject = visibleProjects[nextIndex];
    if (!nextProject) return;

    setSelectedProject(nextProject);
  };

  if (pageMode === "full-resume") {
    return <CakeResumePage onBackHome={handleBackHome} />;
  }

  if (pageMode === "resume-editor" && LazyResumeEditorPage) {
    return (
      <Suspense
        fallback={
          <main className="section-shell" aria-live="polite">
            <p>履歷編輯器載入中...</p>
          </main>
        }
      >
        <LazyResumeEditorPage
          onBackHome={handleBackHome}
          onOpenResume={handleOpenCakeResume}
          onPortfolioChange={setPortfolioDraft}
        />
      </Suspense>
    );
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
            <button className="button button-secondary" type="button" onClick={handleOpenCakeResume}>
              完整版履歷
              <ArrowRight size={19} aria-hidden="true" />
            </button>
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
            {visibleProjects.map((project) => {
              const isSelectedProject = project.title === selectedProject?.title;

              return (
                <div className="project-list-item" key={project.title}>
                  <button
                    className={isSelectedProject ? "project-row selected" : "project-row"}
                    type="button"
                    aria-label={
                      project.title === selectedProject?.title && project.links.demo
                        ? `${project.title}，再次點擊開啟 Demo`
                        : project.title
                    }
                    aria-expanded={isSelectedProject}
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
                  {isSelectedProject ? (
                    <div className="mobile-project-detail">
                      <ProjectDetail project={project} onProjectSwipe={handleProjectSwipe} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          {selectedProject ? (
            <div className="desktop-project-detail">
              <ProjectDetail project={selectedProject} onProjectSwipe={handleProjectSwipe} />
            </div>
          ) : (
            <article className="project-detail desktop-project-detail" aria-live="polite">
              <div className="detail-meta">
                <span>尚未建立作品</span>
              </div>
              <h3>作品列表是空的</h3>
              <p>請到本地編輯頁新增作品，主頁會讀取同一份瀏覽器草稿。</p>
            </article>
          )}
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
          <p>目前先建立繁體中文版本。可透過站內完整履歷、GitHub 或 LinkedIn 查看完整經歷與作品。</p>
        </div>
        <div className="contact-actions">
          <button className="button button-primary" type="button" onClick={handleCopyProfile}>
            {copied ? "已複製履歷資訊" : "複製履歷資訊"}
            <Check size={20} aria-hidden="true" />
          </button>
          <button className="button button-secondary" type="button" onClick={handleOpenCakeResume}>
            完整版履歷
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  );
}

function SocialLinks({ links }: { links: PortfolioSocialLink[] }) {
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

function getProjectScreenshots(project: Project) {
  const screenshots = project.screenshots?.length ? project.screenshots : project.screenshot ? [project.screenshot] : [];
  return screenshots.filter((screenshot) => Boolean(screenshot.src));
}

type ImageZoomState = {
  scale: number;
  x: number;
  y: number;
};

type ImageGesture =
  | {
      type: "pinch";
      startDistance: number;
      startMidpoint: { x: number; y: number };
      startZoom: ImageZoomState;
    }
  | {
      type: "pan";
      startX: number;
      startY: number;
      startZoom: ImageZoomState;
    }
  | null;

const defaultImageZoom: ImageZoomState = { scale: 1, x: 0, y: 0 };
type ProjectTouchList = ReactTouchEvent<HTMLDivElement>["touches"];
type ProjectSwipeGesture = {
  startX: number;
  startY: number;
  ignore: boolean;
} | null;
type GallerySwipeGesture = {
  startX: number;
  startY: number;
  startScrollLeft: number;
  startIndex: number;
  intent: "pending" | "horizontal" | "vertical";
  ignore: boolean;
} | null;
type LightboxSwipeGesture = {
  pointerId: number;
  startX: number;
  startY: number;
  intent: "pending" | "horizontal" | "vertical";
} | null;

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getTouchDistance(touches: ProjectTouchList) {
  const firstTouch = touches[0];
  const secondTouch = touches[1];
  return Math.hypot(secondTouch.clientX - firstTouch.clientX, secondTouch.clientY - firstTouch.clientY);
}

function getTouchMidpoint(touches: ProjectTouchList) {
  const firstTouch = touches[0];
  const secondTouch = touches[1];
  return {
    x: (firstTouch.clientX + secondTouch.clientX) / 2,
    y: (firstTouch.clientY + secondTouch.clientY) / 2,
  };
}

function constrainImageZoom(zoom: ImageZoomState, frame: HTMLDivElement | null): ImageZoomState {
  const scale = clampValue(zoom.scale, 1, 4);
  if (scale <= 1.01 || !frame) return defaultImageZoom;

  const maxX = (frame.clientWidth * (scale - 1)) / 2;
  const maxY = (frame.clientHeight * (scale - 1)) / 2;

  return {
    scale,
    x: clampValue(zoom.x, -maxX, maxX),
    y: clampValue(zoom.y, -maxY, maxY),
  };
}

function ZoomableProjectImage({ src, alt, onOpen }: { src: string; alt: string; onOpen: () => void }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<ImageGesture>(null);
  const tapGestureRef = useRef<{ startX: number; startY: number; moved: boolean } | null>(null);
  const [zoom, setZoom] = useState<ImageZoomState>(defaultImageZoom);
  const zoomRef = useRef<ImageZoomState>(defaultImageZoom);
  const isZoomed = zoom.scale > 1.01;

  useEffect(() => {
    const resetZoom = defaultImageZoom;
    zoomRef.current = resetZoom;
    gestureRef.current = null;
    setZoom(resetZoom);
  }, [src]);

  const updateZoom = (nextZoom: ImageZoomState) => {
    const constrainedZoom = constrainImageZoom(nextZoom, frameRef.current);
    zoomRef.current = constrainedZoom;
    setZoom(constrainedZoom);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;

    tapGestureRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const tapGesture = tapGestureRef.current;
    if (!tapGesture || !event.isPrimary) return;

    if (Math.hypot(event.clientX - tapGesture.startX, event.clientY - tapGesture.startY) > 8) {
      tapGesture.moved = true;
    }
  };

  const handleClick = () => {
    const tapGesture = tapGestureRef.current;
    tapGestureRef.current = null;
    if (tapGesture?.moved) return;

    onOpen();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    onOpen();
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (event.touches.length >= 2) {
      event.preventDefault();
      gestureRef.current = {
        type: "pinch",
        startDistance: getTouchDistance(event.touches),
        startMidpoint: getTouchMidpoint(event.touches),
        startZoom: zoomRef.current,
      };
      return;
    }

    if (event.touches.length === 1 && zoomRef.current.scale > 1.01) {
      const touch = event.touches[0];
      gestureRef.current = {
        type: "pan",
        startX: touch.clientX,
        startY: touch.clientY,
        startZoom: zoomRef.current,
      };
    }
  };

  const handleTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture) return;

    if (gesture.type === "pinch" && event.touches.length >= 2) {
      event.preventDefault();
      const nextDistance = getTouchDistance(event.touches);
      const nextMidpoint = getTouchMidpoint(event.touches);
      const nextScale = gesture.startZoom.scale * (nextDistance / Math.max(gesture.startDistance, 1));

      updateZoom({
        scale: nextScale,
        x: gesture.startZoom.x + nextMidpoint.x - gesture.startMidpoint.x,
        y: gesture.startZoom.y + nextMidpoint.y - gesture.startMidpoint.y,
      });
      return;
    }

    if (gesture.type === "pan" && event.touches.length === 1 && zoomRef.current.scale > 1.01) {
      event.preventDefault();
      const touch = event.touches[0];

      updateZoom({
        ...gesture.startZoom,
        x: gesture.startZoom.x + touch.clientX - gesture.startX,
        y: gesture.startZoom.y + touch.clientY - gesture.startY,
      });
    }
  };

  const handleTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (event.touches.length >= 2) {
      gestureRef.current = {
        type: "pinch",
        startDistance: getTouchDistance(event.touches),
        startMidpoint: getTouchMidpoint(event.touches),
        startZoom: zoomRef.current,
      };
      return;
    }

    if (event.touches.length === 1 && zoomRef.current.scale > 1.01) {
      const touch = event.touches[0];
      gestureRef.current = {
        type: "pan",
        startX: touch.clientX,
        startY: touch.clientY,
        startZoom: zoomRef.current,
      };
      return;
    }

    gestureRef.current = null;
    if (zoomRef.current.scale <= 1.01) updateZoom(defaultImageZoom);
  };

  return (
    <div
      className="zoomable-image-frame"
      data-zoomed={isZoomed ? "true" : undefined}
      ref={frameRef}
      role="button"
      tabIndex={0}
      aria-label="開啟圖片預覽"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerCancel={() => {
        tapGestureRef.current = null;
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable="false"
        style={{ transform: `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${zoom.scale})` }}
      />
    </div>
  );
}

function ProjectImageLightbox({
  screenshots,
  activeIndex,
  projectTitle,
  onClose,
  onSelect,
}: {
  screenshots: ProjectScreenshot[];
  activeIndex: number;
  projectTitle: string;
  onClose: () => void;
  onSelect: (index: number) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const swipeRef = useRef<LightboxSwipeGesture>(null);
  const lastTapAtRef = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const activeScreenshot = screenshots[activeIndex];
  const hasMultipleScreenshots = screenshots.length > 1;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (!hasMultipleScreenshots) return;

      if (event.key === "ArrowLeft") {
        onSelect(Math.max(activeIndex - 1, 0));
      }

      if (event.key === "ArrowRight") {
        onSelect(Math.min(activeIndex + 1, screenshots.length - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, hasMultipleScreenshots, onClose, onSelect, screenshots.length]);

  useEffect(() => {
    setDragOffset(0);
    swipeRef.current = null;
  }, [activeIndex]);

  if (!activeScreenshot) return null;

  const selectImage = (index: number) => {
    setDragOffset(0);
    onSelect(clampValue(index, 0, screenshots.length - 1));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;

    swipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      intent: "pending",
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = swipeRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (gesture.intent === "pending") {
      if (absX < 7 && absY < 7) return;
      gesture.intent = absX > absY * 1.2 ? "horizontal" : "vertical";
    }

    if (gesture.intent !== "horizontal") return;

    event.preventDefault();
    const stageWidth = Math.max(stageRef.current?.clientWidth ?? 1, 1);
    setDragOffset(clampValue(deltaX, -stageWidth * 0.34, stageWidth * 0.34));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = swipeRef.current;
    swipeRef.current = null;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const stageWidth = Math.max(stageRef.current?.clientWidth ?? 1, 1);
    const isTap = absX < 8 && absY < 8;

    if (isTap) {
      const now = window.performance.now();
      if (now - lastTapAtRef.current < 320) {
        lastTapAtRef.current = 0;
        onClose();
        return;
      }

      lastTapAtRef.current = now;
      setDragOffset(0);
      return;
    }

    lastTapAtRef.current = 0;

    if (hasMultipleScreenshots && gesture.intent === "horizontal") {
      const shouldSwitch = absX >= 70 || absX / stageWidth >= 0.18;
      if (shouldSwitch) {
        selectImage(activeIndex + (deltaX < 0 ? 1 : -1));
        return;
      }
    }

    setDragOffset(0);
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = swipeRef.current;
    swipeRef.current = null;

    if (gesture && event.currentTarget.hasPointerCapture(gesture.pointerId)) {
      event.currentTarget.releasePointerCapture(gesture.pointerId);
    }

    setDragOffset(0);
  };

  const activeAlt = activeScreenshot.alt || `${projectTitle} 作品圖片 ${activeIndex + 1}`;

  return (
    <div className="project-image-lightbox" role="dialog" aria-modal="true" aria-label={`${projectTitle} 圖片預覽`}>
      <button className="project-lightbox-close" type="button" aria-label="關閉圖片" onClick={onClose}>
        <X size={22} aria-hidden="true" />
      </button>
      {hasMultipleScreenshots ? (
        <button
          className="project-lightbox-nav project-lightbox-nav-previous"
          type="button"
          aria-label="上一張圖片"
          disabled={activeIndex === 0}
          onClick={() => selectImage(activeIndex - 1)}
        >
          <ChevronLeft size={28} aria-hidden="true" />
        </button>
      ) : null}
      <div
        className="project-lightbox-stage"
        data-dragging={dragOffset !== 0 ? "true" : undefined}
        ref={stageRef}
        onDoubleClick={onClose}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <img
          src={resolvePublicAssetPath(activeScreenshot.src)}
          alt={activeAlt}
          draggable="false"
          style={{ transform: `translate3d(${dragOffset}px, 0, 0)` }}
        />
      </div>
      {hasMultipleScreenshots ? (
        <button
          className="project-lightbox-nav project-lightbox-nav-next"
          type="button"
          aria-label="下一張圖片"
          disabled={activeIndex === screenshots.length - 1}
          onClick={() => selectImage(activeIndex + 1)}
        >
          <ChevronRight size={28} aria-hidden="true" />
        </button>
      ) : null}
      {hasMultipleScreenshots ? (
        <div className="project-lightbox-counter" aria-live="polite">
          {activeIndex + 1} / {screenshots.length}
        </div>
      ) : null}
    </div>
  );
}

function shouldIgnoreProjectSwipe(event: ReactTouchEvent<HTMLElement>) {
  const target = event.target;
  if (!(target instanceof Element)) return true;

  return Boolean(target.closest(".project-gallery, .detail-links, a, button"));
}

function shouldIgnoreGallerySwipe(event: ReactTouchEvent<HTMLDivElement>) {
  const target = event.target;
  if (!(target instanceof Element)) return true;

  return Boolean(target.closest('.zoomable-image-frame[data-zoomed="true"]'));
}

function ProjectDetail({
  project,
  onProjectSwipe,
}: {
  project: Project;
  onProjectSwipe: (direction: ProjectSwipeDirection) => void;
}) {
  const galleryRef = useRef<HTMLDivElement>(null);
  const galleryWheelRef = useRef({ delta: 0, lastSwitchAt: 0 });
  const gallerySwipeRef = useRef<GallerySwipeGesture>(null);
  const projectSwipeRef = useRef<ProjectSwipeGesture>(null);
  const screenshots = getProjectScreenshots(project);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxImageIndex, setLightboxImageIndex] = useState<number | null>(null);
  const hasMultipleScreenshots = screenshots.length > 1;

  useEffect(() => {
    setActiveImageIndex(0);
    setLightboxImageIndex(null);
    gallerySwipeRef.current = null;
    galleryRef.current?.scrollTo({ left: 0 });
  }, [project.title]);

  const handleImageSelect = (index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), screenshots.length - 1);
    const gallery = galleryRef.current;

    setActiveImageIndex(nextIndex);
    gallery?.scrollTo({
      left: gallery.clientWidth * nextIndex,
      behavior: "smooth",
    });
  };

  const handleImageOpen = (index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), screenshots.length - 1);

    handleImageSelect(nextIndex);
    setLightboxImageIndex(nextIndex);
  };

  const handleLightboxImageSelect = (index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), screenshots.length - 1);

    handleImageSelect(nextIndex);
    setLightboxImageIndex(nextIndex);
  };

  const handleGalleryScroll = () => {
    const gallery = galleryRef.current;
    if (!gallery || screenshots.length === 0) return;

    const nextIndex = Math.round(gallery.scrollLeft / Math.max(gallery.clientWidth, 1));
    setActiveImageIndex(Math.min(Math.max(nextIndex, 0), screenshots.length - 1));
  };

  const handleGalleryWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!hasMultipleScreenshots || event.ctrlKey) return;

    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(delta) < 2) return;

    event.preventDefault();

    const now = window.performance.now();
    const wheelState = galleryWheelRef.current;
    if (now - wheelState.lastSwitchAt > 420) wheelState.delta = 0;

    wheelState.delta += delta;

    if (Math.abs(wheelState.delta) < 42) return;

    const direction = wheelState.delta > 0 ? 1 : -1;
    const nextIndex = Math.min(Math.max(activeImageIndex + direction, 0), screenshots.length - 1);
    wheelState.delta = 0;
    wheelState.lastSwitchAt = now;

    if (nextIndex !== activeImageIndex) handleImageSelect(nextIndex);
  };

  const handleGalleryTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    const gallery = galleryRef.current;
    if (!hasMultipleScreenshots || !gallery || event.touches.length !== 1) {
      gallerySwipeRef.current = null;
      return;
    }

    const touch = event.touches[0];
    gallerySwipeRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startScrollLeft: gallery.scrollLeft,
      startIndex: activeImageIndex,
      intent: "pending",
      ignore: shouldIgnoreGallerySwipe(event),
    };
  };

  const handleGalleryTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    const gesture = gallerySwipeRef.current;
    const gallery = galleryRef.current;
    if (!gesture || gesture.ignore || !gallery || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (gesture.intent === "pending") {
      if (absX < 8 && absY < 8) return;
      if (absY > absX * 1.15) {
        gesture.intent = "vertical";
        return;
      }
      if (absX <= absY * 1.15) return;
      gesture.intent = "horizontal";
    }

    if (gesture.intent === "vertical") return;

    event.preventDefault();
    gallery.scrollLeft = gesture.startScrollLeft - deltaX;
  };

  const handleGalleryTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    const gesture = gallerySwipeRef.current;
    gallerySwipeRef.current = null;
    if (!gesture || gesture.ignore || event.changedTouches.length === 0) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const gallery = galleryRef.current;
    const slideWidth = Math.max(gallery?.clientWidth ?? 1, 1);
    const isHorizontalSwipe = gesture.intent === "horizontal" || (absX >= 24 && absX > absY * 1.2);

    if (!isHorizontalSwipe) return;

    const shouldSwitch = absX >= 54 || absX / slideWidth >= 0.18;
    const direction = deltaX < 0 ? 1 : -1;
    const nextIndex = shouldSwitch
      ? Math.min(Math.max(gesture.startIndex + direction, 0), screenshots.length - 1)
      : gesture.startIndex;

    handleImageSelect(nextIndex);
  };

  const handleGalleryTouchCancel = () => {
    const gesture = gallerySwipeRef.current;
    gallerySwipeRef.current = null;
    if (gesture?.intent === "horizontal") handleImageSelect(gesture.startIndex);
  };

  const handleProjectTouchStart = (event: ReactTouchEvent<HTMLElement>) => {
    if (event.touches.length !== 1) {
      projectSwipeRef.current = null;
      return;
    }

    const touch = event.touches[0];
    projectSwipeRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      ignore: shouldIgnoreProjectSwipe(event),
    };
  };

  const handleProjectTouchMove = (event: ReactTouchEvent<HTMLElement>) => {
    const gesture = projectSwipeRef.current;
    if (!gesture || gesture.ignore || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;

    if (Math.abs(deltaX) > 18 && Math.abs(deltaX) > Math.abs(deltaY) * 1.35) {
      event.preventDefault();
    }
  };

  const handleProjectTouchEnd = (event: ReactTouchEvent<HTMLElement>) => {
    const gesture = projectSwipeRef.current;
    projectSwipeRef.current = null;
    if (!gesture || gesture.ignore || event.changedTouches.length === 0) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    const isProjectSwipe = Math.abs(deltaX) >= 64 && Math.abs(deltaX) > Math.abs(deltaY) * 1.45;

    if (!isProjectSwipe) return;
    onProjectSwipe(deltaX < 0 ? "next" : "previous");
  };

  return (
    <article
      className="project-detail"
      aria-live="polite"
      onTouchStart={handleProjectTouchStart}
      onTouchMove={handleProjectTouchMove}
      onTouchEnd={handleProjectTouchEnd}
      onTouchCancel={() => {
        projectSwipeRef.current = null;
      }}
    >
      <div className="detail-meta">
        <span>{project.category}</span>
        <span>{project.year}</span>
        <span>建立 {formatProjectDate(project.createdAt)}</span>
        <span>更新 {formatProjectDate(project.updatedAt)}</span>
      </div>
      <h3>{project.title}</h3>
      <p>{project.description}</p>
      {screenshots.length > 0 ? (
        <section className="project-gallery" aria-label={`${project.title} 作品圖片`}>
          <div className="project-gallery-heading">
            <h4>作品圖片</h4>
            {hasMultipleScreenshots ? (
              <div className="project-gallery-controls" aria-label="作品圖片切換">
                <button
                  type="button"
                  aria-label="上一張作品圖片"
                  disabled={activeImageIndex === 0}
                  onClick={() => handleImageSelect(activeImageIndex - 1)}
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <span>
                  {activeImageIndex + 1} / {screenshots.length}
                </span>
                <button
                  type="button"
                  aria-label="下一張作品圖片"
                  disabled={activeImageIndex === screenshots.length - 1}
                  onClick={() => handleImageSelect(activeImageIndex + 1)}
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
          <div
            className="project-gallery-viewport"
            ref={galleryRef}
            onScroll={handleGalleryScroll}
            onWheel={handleGalleryWheel}
            onTouchStart={handleGalleryTouchStart}
            onTouchMove={handleGalleryTouchMove}
            onTouchEnd={handleGalleryTouchEnd}
            onTouchCancel={handleGalleryTouchCancel}
          >
            {screenshots.map((screenshot, index) => {
              const alt = screenshot.alt || `${project.title} 作品圖片 ${index + 1}`;

              return (
                <figure className="project-gallery-slide" key={`${screenshot.src}-${index}`}>
                  <ZoomableProjectImage
                    src={resolvePublicAssetPath(screenshot.src)}
                    alt={alt}
                    onOpen={() => handleImageOpen(index)}
                  />
                </figure>
              );
            })}
          </div>
          {hasMultipleScreenshots ? (
            <div className="project-gallery-dots" aria-label="作品圖片位置">
              {screenshots.map((screenshot, index) => (
                <button
                  key={`${screenshot.src}-dot`}
                  className={index === activeImageIndex ? "active" : ""}
                  type="button"
                  aria-label={`切換到第 ${index + 1} 張作品圖片`}
                  aria-current={index === activeImageIndex ? "true" : undefined}
                  onClick={() => handleImageSelect(index)}
                />
              ))}
            </div>
          ) : null}
          {lightboxImageIndex !== null ? (
            <ProjectImageLightbox
              screenshots={screenshots}
              activeIndex={lightboxImageIndex}
              projectTitle={project.title}
              onClose={() => setLightboxImageIndex(null)}
              onSelect={handleLightboxImageSelect}
            />
          ) : null}
        </section>
      ) : null}
      <div className="tag-row">
        {project.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className="detail-links">
        {(Object.entries(project.links) as [keyof PortfolioLinkSet, string][])
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
