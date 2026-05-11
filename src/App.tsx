import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Code2,
  Download,
  ExternalLink,
  Gamepad2,
  Github,
  Languages,
  Linkedin,
  Map,
  Microscope,
  Moon,
  Mountain,
  Printer,
  Radar,
  Route,
  Signal,
  Sparkles,
  Sun,
  Telescope,
  Waves,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

type ThemeMode = "day" | "night";

type ProfileLink = {
  label: string;
  url: string;
  icon: ReactNode;
};

type ResumeHighlight = {
  label: string;
  value: string;
  text: string;
};

type SkillCard = {
  icon: ReactNode;
  title: string;
  text: string;
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
  links: {
    demo: string;
    repo: string;
  };
};

const themeStorageKey = "portfolio-theme-mode";
const profileAvatarImage = `${import.meta.env.BASE_URL}github-avatar.png`;

const profile = {
  name: "張維麟",
  englishName: "Chang Wei-Lin",
  role: "演算法工程師 / AI 與軟體工程師",
  location: "Taipei, Taiwan",
  hometown: "宜蘭羅東",
  resumeUrl: "https://www.cake.me/wei-lin-chang",
  intro:
    "宜蘭羅東人，物理系所畢業，目前專注於演算法工程、深度學習與 AI 輔助開發流程。熟悉運用 Claude Code、ChatGPT Codex、Antigravity 等 AI 工具協助需求拆解、原型開發、程式重構與測試驗證，並以 C/C++、Python 與 JavaScript 把數學模型、訊號處理與使用者體驗整合成可操作的產品。",
  quote: {
    zh: "我愛星空至深，無懼黑夜。",
    en: "We have loved the stars too fondly to fear the dark.",
    source: "The Old Astronomer, Sarah Williams",
  },
};

const profileLinks: ProfileLink[] = [
  {
    label: "Cake 履歷",
    url: profile.resumeUrl,
    icon: <ExternalLink size={18} aria-hidden="true" />,
  },
  {
    label: "GitHub",
    url: "https://github.com/changweilin",
    icon: <Github size={18} aria-hidden="true" />,
  },
  {
    label: "LinkedIn",
    url: "https://www.linkedin.com/in/wei-lin-chang-ba38049a/",
    icon: <Linkedin size={18} aria-hidden="true" />,
  },
];

const resumeHighlights: ResumeHighlight[] = [
  {
    label: "主軸",
    value: "演算法工程",
    text: "深度學習、訊號處理與 AI 輔助開發流程。",
  },
  {
    label: "語言",
    value: "C++ / Python / JavaScript",
    text: "從數學模型、工具開發到瀏覽器互動介面。",
  },
  {
    label: "地點",
    value: profile.location,
    text: "完整經歷可由 Cake、GitHub 與 LinkedIn 延伸查看。",
  },
];

const skillCards: SkillCard[] = [
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
    title: "工具輔助開發",
    text: "善用 Claude Code、ChatGPT Codex、Antigravity 等工具加速需求拆解、原型實作、重構、測試與文件整理，並維持可驗證的工程品質。",
  },
];

const workPrinciples: SkillCard[] = [
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

const projects: Project[] = [
  {
    title: "Win Rate Calculator",
    summary: "互動式勝率計算器，用於快速試算對戰、抽卡或決策情境中的機率與期望結果。",
    description:
      "是以勝率與機率估算為主題的瀏覽器工具，透過簡潔表單讓使用者輸入成功率、嘗試次數或情境參數，快速得到累積勝率、期望值與比較結果，適合展示機率模型、互動表單與實用型工具設計。",
    tags: ["JavaScript", "Probability", "Calculator", "Statistics", "Interactive Web", "GitHub Pages"],
    category: "機率計算",
    year: "2026",
    createdAt: "2026-05-07T13:54:34Z",
    updatedAt: "2026-05-07T13:54:34Z",
    links: {
      demo: "https://changweilin.github.io/win_rate_calculator/",
      repo: "https://github.com/changweilin/win_rate_calculator",
    },
  },
  {
    title: "Mapping Elf",
    summary: "軌跡生成器與戶外地圖工具，整合路線規劃、高度剖面、離線地圖與沿途天氣資訊。",
    description:
      "是為戶外活動設計的互動式地圖應用。作品支援步行、健行、越野跑、自行車與駕車等路線模式，可匯入/匯出 GPX、KML，並以高度剖面、距離統計、體能參數與天氣時間軸輔助行前規劃。",
    tags: ["JavaScript", "Leaflet", "Chart.js", "Vite", "PWA", "Capacitor", "GPX/KML"],
    category: "戶外地圖",
    year: "2026",
    createdAt: "2026-04-08T13:54:34Z",
    updatedAt: "2026-04-30T11:34:28Z",
    links: {
      demo: "https://changweilin.github.io/mapping_elf/",
      repo: "https://github.com/changweilin/mapping_elf",
    },
  },
  {
    title: "Hex Snake",
    summary: "六角格貪食蛇對戰遊戲，玩家與 AI 在棋盤上搶奪資源並使用角色技能對抗。",
    description:
      "是單頁瀏覽器遊戲，核心包含六角格移動、角色技能、資源庫存、AI 自動對弈、重播控制與平衡模擬。遊戲資料與平衡參數獨立於 data 目錄，並搭配 tools 進行模擬、策略調校與回歸測試。",
    tags: ["HTML", "CSS", "JavaScript", "AI 對弈", "遊戲平衡", "Simulation"],
    category: "遊戲與 AI",
    year: "2026",
    createdAt: "2026-04-27T14:19:02Z",
    updatedAt: "2026-05-06T17:11:34Z",
    links: {
      demo: "https://changweilin.github.io/hex_snake/",
      repo: "https://github.com/changweilin/hex_snake",
    },
  },
  {
    title: "Railway Elf",
    summary: "鐵路主題互動網頁作品，以 GitHub Pages 發布並保留公開程式碼連結。",
    description:
      "目前先作為鐵路主題互動作品收錄，首頁提供 Demo 與 GitHub 入口。由於公開 README 內容目前無法解析，繁中版先保留保守描述，後續可依專案文件補上更完整的功能、技術棧與設計細節。",
    tags: ["JavaScript", "GitHub Pages", "Interactive Web"],
    category: "互動網頁",
    year: "2026",
    createdAt: "2026-04-29T12:55:45Z",
    updatedAt: "2026-05-06T17:04:14Z",
    links: {
      demo: "https://changweilin.github.io/railway_elf/",
      repo: "https://github.com/changweilin/railway_elf",
    },
  },
  {
    title: "Web TSP App",
    summary: "旅行推銷員問題的互動式網頁 Demo，用於展示路徑最佳化與演算法視覺化。",
    description:
      "是以旅行推銷員問題為主題的互動式網頁作品，透過瀏覽器介面展示節點、路徑與最佳化過程，適合用來呈現組合最佳化、啟發式搜尋與演算法視覺化的實作能力。",
    tags: ["JavaScript", "TSP", "Optimization", "Visualization", "GitHub Pages"],
    category: "演算法視覺化",
    year: "2026",
    createdAt: "2026-02-27T03:12:58Z",
    updatedAt: "2026-05-06T17:10:26Z",
    links: {
      demo: "https://changweilin.github.io/web_tsp_app/",
      repo: "https://github.com/changweilin/web_tsp_app",
    },
  },
  {
    title: "IIR Filter Tool",
    summary: "數位濾波器互動工具，用於展示濾波器參數調整、頻率響應與訊號處理視覺化。",
    description:
      "是以數位訊號處理為主題的互動式網頁作品，透過瀏覽器介面呈現 IIR 濾波器設計、參數調整與響應觀察流程，適合展示 DSP、濾波器理論、演算法實作與工程介面的整合能力。",
    tags: ["JavaScript", "DSP", "IIR Filter", "Signal Processing", "Visualization", "GitHub Pages"],
    category: "訊號處理",
    year: "2026",
    createdAt: "2025-04-15T13:23:21Z",
    updatedAt: "2026-05-07T01:20:03Z",
    links: {
      demo: "https://changweilin.github.io/iir_filter_tool/",
      repo: "https://github.com/changweilin/iir_filter_tool",
    },
  },
];

const categoryIconMap: Record<string, ReactNode> = {
  機率計算: <Activity size={18} aria-hidden="true" />,
  戶外地圖: <Map size={18} aria-hidden="true" />,
  "遊戲與 AI": <Gamepad2 size={18} aria-hidden="true" />,
  互動網頁: <Sparkles size={18} aria-hidden="true" />,
  演算法視覺化: <Route size={18} aria-hidden="true" />,
  訊號處理: <Signal size={18} aria-hidden="true" />,
};

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Taipei",
});

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "day";

  try {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    if (storedTheme === "day" || storedTheme === "night") return storedTheme;
  } catch {
    return "day";
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "night" : "day";
}

function formatProjectDate(timestamp: string) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "未設定" : dateFormatter.format(date);
}

function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme);
  const [copied, setCopied] = useState(false);
  const isNightMode = themeMode === "night";

  const sortedProjects = useMemo(
    () =>
      [...projects].sort((projectA, projectB) => {
        const updatedDelta = Date.parse(projectB.updatedAt) - Date.parse(projectA.updatedAt);
        if (updatedDelta !== 0) return updatedDelta;
        return projectA.title.localeCompare(projectB.title, "zh-TW");
      }),
    [],
  );

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = themeMode;
    root.style.colorScheme = isNightMode ? "dark" : "light";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", isNightMode ? "#111512" : "#0f6d78");

    try {
      window.localStorage.setItem(themeStorageKey, themeMode);
    } catch {
      // Theme still works for this session when storage is unavailable.
    }
  }, [isNightMode, themeMode]);

  const handleThemeToggle = () => {
    setThemeMode((currentTheme) => (currentTheme === "day" ? "night" : "day"));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyProfile = async () => {
    const text = `${profile.name} / ${profile.role}\n${profile.resumeUrl}\nhttps://github.com/changweilin\nhttps://www.linkedin.com/in/wei-lin-chang-ba38049a/`;

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
    window.setTimeout(() => setCopied(false), 3200);
  };

  return (
    <main className="resume-app">
      <header className="site-header no-print" aria-label="主選單">
        <a className="brand" href="#top" aria-label={`${profile.name} 首頁`}>
          <span className="brand-mark" aria-hidden="true">
            &gt;_
          </span>
          <span>{profile.name}</span>
        </a>
        <div className="header-actions">
          <nav>
            <a href="#resume">履歷</a>
            <a href="#skills">能力</a>
            <a href="#works">作品</a>
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
            <div>
              <h1 id="hero-title">{profile.name}</h1>
              <p className="english-name">{profile.englishName}</p>
            </div>
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
          <div className="hero-actions no-print">
            <a className="button button-primary" href="#works">
              查看作品
              <ArrowRight size={20} aria-hidden="true" />
            </a>
            <button className="button button-secondary" type="button" onClick={handlePrint}>
              輸出 PDF
              <Download size={20} aria-hidden="true" />
            </button>
          </div>
        </div>

        <aside className="resume-panel hero-panel" aria-labelledby="resume-panel-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Resume Snapshot</p>
              <h2 id="resume-panel-title">履歷重點</h2>
            </div>
            <Printer size={24} aria-hidden="true" />
          </div>
          <div className="resume-highlight-grid">
            {resumeHighlights.map((item) => (
              <ResumeHighlightCard key={item.label} {...item} />
            ))}
          </div>
          <div className="resume-links no-print">
            {profileLinks.map((link) => (
              <a key={link.label} href={link.url} target="_blank" rel="noreferrer">
                {link.icon}
                {link.label}
              </a>
            ))}
          </div>
        </aside>
      </section>

      <article id="resume" className="print-resume section-shell" aria-labelledby="resume-title">
        <div className="resume-title-block">
          <div>
            <p className="eyebrow">Full Resume</p>
            <h2 id="resume-title">完整版履歷</h2>
          </div>
          <button className="button button-primary no-print" type="button" onClick={handlePrint}>
            輸出 PDF
            <Download size={20} aria-hidden="true" />
          </button>
        </div>

        <section className="resume-sheet" aria-label="可列印履歷">
          <div className="sheet-header">
            <div>
              <p className="sheet-kicker">Algorithm Engineer / AI Software</p>
              <h2>{profile.name}</h2>
              <p>{profile.englishName}</p>
            </div>
            <div className="sheet-contact">
              <span>{profile.role}</span>
              <span>{profile.location}</span>
              <span>{profile.hometown}</span>
            </div>
          </div>

          <div className="sheet-grid">
            <section className="sheet-main" aria-labelledby="summary-title">
              <ResumeSection title="關於" id="summary-title">
                <p>{profile.intro}</p>
              </ResumeSection>

              <ResumeSection title="能力與技術" id="skills-title">
                <div className="compact-card-grid">
                  {skillCards.map((skill) => (
                    <CompactCard key={skill.title} {...skill} />
                  ))}
                </div>
              </ResumeSection>

              <ResumeSection title="作品經歷" id="project-title">
                <div className="project-timeline">
                  {sortedProjects.map((project) => (
                    <ProjectResumeItem key={project.title} project={project} />
                  ))}
                </div>
              </ResumeSection>
            </section>

            <aside className="sheet-side" aria-label="履歷側欄">
              <ResumeSection title="履歷重點" id="highlight-title">
                <div className="side-stack">
                  {resumeHighlights.map((item) => (
                    <ResumeHighlightCard key={item.label} {...item} />
                  ))}
                </div>
              </ResumeSection>

              <ResumeSection title="工作方式" id="principles-title">
                <div className="side-stack">
                  {workPrinciples.map((principle) => (
                    <PrincipleCard key={principle.title} {...principle} />
                  ))}
                </div>
              </ResumeSection>

              <ResumeSection title="個人連結" id="links-title">
                <div className="sheet-link-list">
                  {profileLinks.map((link) => (
                    <a key={link.label} href={link.url} target="_blank" rel="noreferrer">
                      {link.icon}
                      <span>{link.label}</span>
                    </a>
                  ))}
                </div>
              </ResumeSection>
            </aside>
          </div>
        </section>
      </article>

      <section id="skills" className="section-shell skills-section" aria-labelledby="skills-heading">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Resume Focus</p>
            <h2 id="skills-heading">履歷重點</h2>
          </div>
          <p>
            履歷以演算法、深度學習、訊號處理、物理背景與 AI 工具實作能力為主軸；作品則把這些能力落到地圖工具、AI 遊戲與互動網頁。
          </p>
        </div>
        <div className="resume-layout">
          <div className="skill-grid">
            {skillCards.map((skill) => (
              <SkillCardView key={skill.title} {...skill} />
            ))}
          </div>
          <div className="principle-list" aria-label="工作方式">
            {workPrinciples.map((principle) => (
              <Principle key={principle.title} {...principle} />
            ))}
          </div>
        </div>
      </section>

      <section id="works" className="section-shell works" aria-labelledby="works-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Portfolio Index</p>
            <h2 id="works-title">作品</h2>
          </div>
          <div className="sort-pill no-print">
            <CalendarClock size={16} aria-hidden="true" />
            最後更新日期，由新到舊
          </div>
        </div>
        <div className="project-grid" aria-label="作品列表">
          {sortedProjects.map((project) => (
            <ProjectCard key={project.title} project={project} />
          ))}
        </div>
      </section>

      <section id="contact" className="section-shell contact" aria-labelledby="contact-title">
        <div>
          <p className="eyebrow">Profile Links</p>
          <h2 id="contact-title">聯絡與履歷</h2>
          <p>目前先建立繁體中文版本。可透過 Cake 履歷、GitHub 或 LinkedIn 查看完整經歷與作品。</p>
        </div>
        <div className="contact-actions no-print">
          <button className="button button-primary" type="button" onClick={handleCopyProfile}>
            {copied ? "已複製履歷資訊" : "複製履歷資訊"}
            <CheckCircle2 size={20} aria-hidden="true" />
          </button>
          <button className="button button-secondary" type="button" onClick={handlePrint}>
            輸出 PDF
            <Download size={20} aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  );
}

function ResumeHighlightCard({ label, value, text }: ResumeHighlight) {
  return (
    <article className="resume-highlight">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{text}</p>
    </article>
  );
}

function ResumeSection({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <section className="resume-section" aria-labelledby={id}>
      <h3 id={id}>{title}</h3>
      {children}
    </section>
  );
}

function CompactCard({ icon, title, text }: SkillCard) {
  return (
    <article className="compact-card">
      <span>{icon}</span>
      <div>
        <h4>{title}</h4>
        <p>{text}</p>
      </div>
    </article>
  );
}

function PrincipleCard({ icon, title, text }: SkillCard) {
  return (
    <article className="principle-card">
      <span>{icon}</span>
      <h4>{title}</h4>
      <p>{text}</p>
    </article>
  );
}

function ProjectResumeItem({ project }: { project: Project }) {
  return (
    <article className="project-resume-item">
      <div className="project-resume-head">
        <div>
          <span>{project.category}</span>
          <h4>{project.title}</h4>
        </div>
        <time>{project.year}</time>
      </div>
      <p>{project.description}</p>
      <div className="meta-row">
        <span>建立 {formatProjectDate(project.createdAt)}</span>
        <span>更新 {formatProjectDate(project.updatedAt)}</span>
      </div>
      <div className="tag-row">
        {project.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </article>
  );
}

function SkillCardView({ icon, title, text }: SkillCard) {
  return (
    <article className="skill-card">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function Principle({ icon, title, text }: SkillCard) {
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

function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="project-card">
      <div className="project-card-top">
        <span className="project-mini-icon">{categoryIconMap[project.category] ?? <Languages size={18} />}</span>
        <div>
          <p>{project.category}</p>
          <h3>{project.title}</h3>
        </div>
      </div>
      <p>{project.summary}</p>
      <div className="meta-row">
        <span>建立 {formatProjectDate(project.createdAt)}</span>
        <span>更新 {formatProjectDate(project.updatedAt)}</span>
      </div>
      <div className="tag-row">
        {project.tags.slice(0, 6).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className="detail-links no-print">
        <a href={project.links.demo} target="_blank" rel="noreferrer">
          開啟作品
          <ExternalLink size={17} aria-hidden="true" />
        </a>
        <a href={project.links.repo} target="_blank" rel="noreferrer">
          GitHub
          <Github size={17} aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

export default App;
