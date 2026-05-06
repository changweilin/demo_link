import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronRight,
  Code2,
  Compass,
  ExternalLink,
  Gamepad2,
  Github,
  Linkedin,
  Map,
  Microscope,
  Mountain,
  Radar,
  Route,
  Sparkles,
  Telescope,
  Train,
  Waves,
} from "lucide-react";
import { useMemo, useState } from "react";
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
  featured: boolean;
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

const projects = portfolio.projects as Project[];
const profile = portfolio.profile as Profile;
const categories = ["全部", ...Array.from(new Set(projects.map((project) => project.category)))];
const heroProject = projects[0];
const linkLabels: Record<keyof LinkSet, string> = {
  demo: "開啟作品",
  repo: "GitHub",
  caseStudy: "專案筆記",
};

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

function App() {
  const [activeCategory, setActiveCategory] = useState("全部");
  const [selectedProject, setSelectedProject] = useState<Project>(heroProject);
  const [copied, setCopied] = useState(false);

  const visibleProjects = useMemo(() => {
    if (activeCategory === "全部") return projects;
    return projects.filter((project) => project.category === activeCategory);
  }, [activeCategory]);

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

  return (
    <main>
      <header className="site-header" aria-label="主選單">
        <a className="brand" href="#top" aria-label={`${profile.name} 首頁`}>
          <span className="brand-mark" aria-hidden="true">
            &gt;_
          </span>
          <span>{profile.name}</span>
        </a>
        <nav>
          <a href="#works">作品集</a>
          <a href="#featured">精選作品</a>
          <a href="#skills">技能</a>
          <a href="#principles">工作方式</a>
          <a href="#contact">聯絡</a>
        </nav>
      </header>

      <section id="top" className="hero section-shell" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">&lt; Algorithm Engineer / AI Software /&gt;</p>
          <h1 id="hero-title">{profile.name}</h1>
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
              查看履歷
              <ExternalLink size={19} aria-hidden="true" />
            </a>
          </div>
          <SocialLinks links={profile.socialLinks} />
        </div>

        <div className="hero-panel" aria-label={`${heroProject.title} 專案摘要`}>
          <ProjectConsole selectedProject={selectedProject} onSelect={setSelectedProject} />
          <article className="hero-project">
            <span className="pill">精選作品</span>
            <div>
              <h2>{selectedProject.title}</h2>
              <p>{selectedProject.summary}</p>
            </div>
            <div className="tag-row">
              {selectedProject.tags.slice(0, 6).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <a href={selectedProject.links.demo || selectedProject.links.repo} target="_blank" rel="noreferrer">
              開啟作品
              <ExternalLink size={17} aria-hidden="true" />
            </a>
          </article>
        </div>
      </section>

      <section id="featured" className="section-shell featured" aria-labelledby="featured-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Selected Work</p>
            <h2 id="featured-title">精選作品</h2>
          </div>
          <a className="text-link" href="#works">
            查看全部作品
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
        <div className="featured-grid">
          {projects
            .filter((project) => project.featured)
            .map((project, index) => (
              <ProjectCard
                key={project.title}
                project={project}
                index={index}
                isSelected={selectedProject.title === project.title}
                onSelect={() => setSelectedProject(project)}
              />
            ))}
        </div>
      </section>

      <section id="works" className="section-shell works" aria-labelledby="works-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Portfolio Index</p>
            <h2 id="works-title">作品集</h2>
          </div>
          <div className="filter-group" aria-label="依作品類型篩選">
            {categories.map((category) => (
              <button
                key={category}
                className={category === activeCategory ? "active" : ""}
                type="button"
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
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
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
          <ProjectDetail project={selectedProject} />
        </div>
      </section>

      <section id="skills" className="section-shell skills" aria-labelledby="skills-title">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Skill Set</p>
            <h2 id="skills-title">技能</h2>
          </div>
          <p>
            履歷以演算法、深度學習、訊號處理、物理背景與 AI 工具實作能力為主軸；作品則把這些能力落到地圖工具、AI
            遊戲與互動網頁。
          </p>
        </div>
        <div className="skill-grid">
          {skillCards.map((skill) => (
            <SkillCard key={skill.title} {...skill} />
          ))}
        </div>
      </section>

      <section id="principles" className="section-shell principles" aria-labelledby="principles-title">
        <div className="principle-copy">
          <p className="eyebrow">Working Style</p>
          <h2 id="principles-title">工作方式</h2>
          <p>
            我把程式視為一種理解世界的工具：用物理與數學建立模型，用演算法與模擬驗證假設，再把結果整理成能被使用者操作的介面。
          </p>
        </div>
        <div className="principle-list">
          {principleCards.map((principle) => (
            <Principle key={principle.title} {...principle} />
          ))}
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
          {link.label === "GitHub" ? <Github size={22} /> : link.label === "LinkedIn" ? <Linkedin size={22} /> : <ExternalLink size={22} />}
        </a>
      ))}
    </div>
  );
}

function ProjectConsole({
  selectedProject,
  onSelect,
}: {
  selectedProject: Project;
  onSelect: (project: Project) => void;
}) {
  const projectIcon = (title: string) => {
    if (title.includes("Mapping")) return <Map size={19} aria-hidden="true" />;
    if (title.includes("Hex")) return <Gamepad2 size={19} aria-hidden="true" />;
    if (title.includes("TSP")) return <Route size={19} aria-hidden="true" />;
    return <Train size={19} aria-hidden="true" />;
  };

  return (
    <div className="project-console">
      <div className="console-sidebar">
        <div className="dashboard-logo">
          <Compass size={22} aria-hidden="true" />
          <strong>Works</strong>
        </div>
        {projects.map((project) => (
          <button
            key={project.title}
            className={selectedProject.title === project.title ? "active" : ""}
            type="button"
            onClick={() => onSelect(project)}
          >
            {projectIcon(project.title)}
            <span>{project.title}</span>
          </button>
        ))}
      </div>
      <div className="console-main">
        <div className="dashboard-top">
          <strong>作品摘要</strong>
          <span className="avatar">WL</span>
        </div>
        <div className="metric-grid">
          <Metric label="公開作品" value={`${projects.length}`} delta="GitHub Pages" />
          <Metric label="主軸" value="AI" delta="Algorithm" />
          <Metric label="語言" value="C++" delta="Python / JS" />
        </div>
        <div className="chart-card">
          <div className="chart-head">
            <strong>{selectedProject.title}</strong>
            <span>{selectedProject.category}</span>
          </div>
          <p className="console-summary">{selectedProject.summary}</p>
          <div className="console-focus">
            {selectedProject.tags.slice(0, 5).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="deploy-panel">
        <strong>履歷重點</strong>
        {["演算法工程", "深度學習", "訊號處理"].map((item) => (
          <span key={item}>
            <i />
            <span>
              {item}
              <small>{profile.role}</small>
            </span>
            <small>Taipei</small>
          </span>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{delta}</small>
    </div>
  );
}

function ProjectCard({
  project,
  index,
  isSelected,
  onSelect,
}: {
  project: Project;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <article className={isSelected ? "project-card selected" : "project-card"}>
      <button type="button" onClick={onSelect} aria-label={`選取 ${project.title}`}>
        <span className={`project-icon icon-${index + 1}`}>
          {project.title.includes("Mapping") ? (
            <Map size={32} />
          ) : project.title.includes("Hex") ? (
            <Gamepad2 size={32} />
          ) : project.title.includes("TSP") ? (
            <Route size={32} />
          ) : (
            <Train size={32} />
          )}
        </span>
        <ExternalLink size={19} aria-hidden="true" />
      </button>
      <h3>{project.title}</h3>
      <p>{project.summary}</p>
      <div className="slash-tags">
        {project.tags.slice(0, 4).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </article>
  );
}

function ProjectDetail({ project }: { project: Project }) {
  return (
    <article className="project-detail" aria-live="polite">
      <div className="detail-meta">
        <span>{project.category}</span>
        <span>{project.year}</span>
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

function SkillCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <article className="skill-card">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function Principle({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
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
