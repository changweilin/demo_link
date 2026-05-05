import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Clipboard,
  Code2,
  DatabaseZap,
  ExternalLink,
  Github,
  Layers3,
  Linkedin,
  Mail,
  Network,
  RadioTower,
  Sparkles,
  TerminalSquare,
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

const projects = portfolio.projects as Project[];
const profile = portfolio.profile;
const categories = ["All", ...Array.from(new Set(projects.map((project) => project.category)))];
const heroProject = projects.find((project) => project.featured) ?? projects[0];
const linkLabels: Record<keyof LinkSet, string> = {
  demo: "Live Demo",
  repo: "GitHub",
  caseStudy: "Case Study",
};

function App() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedProject, setSelectedProject] = useState<Project>(heroProject);
  const [copied, setCopied] = useState(false);

  const visibleProjects = useMemo(() => {
    if (activeCategory === "All") return projects;
    return projects.filter((project) => project.category === activeCategory);
  }, [activeCategory]);

  const handleCopyEmail = async () => {
    let didCopy = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(profile.email);
        didCopy = true;
      }
    } catch {
      didCopy = false;
    }

    if (!didCopy) {
      const textarea = document.createElement("textarea");
      textarea.value = profile.email;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      didCopy = document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 6000);
  };

  return (
    <main>
      <header className="site-header" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label={`${profile.name} homepage`}>
          <span className="brand-mark" aria-hidden="true">
            &gt;_
          </span>
          <span>{profile.name}</span>
        </a>
        <nav>
          <a href="#works">作品集</a>
          <a href="#featured">精選作品</a>
          <a href="#skills">技能</a>
          <a href="#principles">工作原則</a>
          <a href="#contact">聯絡我</a>
        </nav>
      </header>

      <section id="top" className="hero section-shell" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">&lt; Senior Software Engineer /&gt;</p>
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
            <button className="button button-secondary" type="button" onClick={handleCopyEmail}>
              {copied ? "已複製" : "聯絡我"}
              {copied ? <Check size={19} aria-hidden="true" /> : <Mail size={19} aria-hidden="true" />}
            </button>
          </div>
          <div className="social-links" aria-label="Social links">
            {profile.socialLinks.map((link) => (
              <a key={link.label} href={link.url} target="_blank" rel="noreferrer" aria-label={link.label}>
                {link.label === "GitHub" ? <Github size={22} /> : <Linkedin size={22} />}
              </a>
            ))}
            <a href={`mailto:${profile.email}`} aria-label="Email">
              <Mail size={22} />
            </a>
          </div>
        </div>

        <div className="hero-panel" aria-label={`${heroProject.title} project preview`}>
          <DashboardPreview />
          <article className="hero-project">
            <span className="pill">精選作品</span>
            <div>
              <h2>{heroProject.title}</h2>
              <p>{heroProject.summary}</p>
            </div>
            <div className="tag-row">
              {heroProject.tags.slice(0, 6).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <a href={heroProject.links.caseStudy || heroProject.links.demo || heroProject.links.repo} target="_blank" rel="noreferrer">
              查看專案
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
          <div className="filter-group" aria-label="Filter projects by category">
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
          <div className="project-list" aria-label="Project list">
            {visibleProjects.map((project) => (
              <button
                key={project.title}
                className={project.title === selectedProject.title ? "project-row selected" : "project-row"}
                type="button"
                onClick={() => setSelectedProject(project)}
              >
                <span>
                  <strong>{project.title}</strong>
                  <small>{project.category} / {project.year}</small>
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
            <p className="eyebrow">Engineering Stack</p>
            <h2 id="skills-title">技能</h2>
          </div>
          <p>從產品問題、系統邊界到部署流程，都用可觀測、可測試、可維護的方式收斂。</p>
        </div>
        <div className="skill-grid">
          <SkillCard icon={<TerminalSquare />} title="Backend Systems" text="API design、事件流、資料一致性與高可用服務設計。" />
          <SkillCard icon={<RadioTower />} title="Platform Engineering" text="Kubernetes、CI/CD、Observability 與 release automation。" />
          <SkillCard icon={<Code2 />} title="Frontend Craft" text="React、TypeScript、設計系統與精準的產品互動細節。" />
          <SkillCard icon={<DatabaseZap />} title="Data Reliability" text="PostgreSQL、Redis、Kafka 與可回放的資料處理流程。" />
        </div>
      </section>

      <section id="principles" className="section-shell principles" aria-labelledby="principles-title">
        <div className="principle-copy">
          <p className="eyebrow">Operating Principles</p>
          <h2 id="principles-title">工作原則</h2>
          <p>
            我喜歡把模糊需求拆成可驗證的技術決策，讓團隊看得見風險、進度與取捨。好的工程不只是跑得動，也要讓下一個接手的人讀得懂。
          </p>
        </div>
        <div className="principle-list">
          <Principle icon={<Network />} title="系統先畫邊界" text="先確認資料流、責任歸屬與失敗模式，再談工具與實作。" />
          <Principle icon={<Layers3 />} title="設計可替換的核心" text="把變動快的需求放在外層，讓核心邏輯維持穩定且容易測試。" />
          <Principle icon={<BriefcaseBusiness />} title="交付能被理解" text="文件、儀表板、告警與 release note 都是產品的一部分。" />
        </div>
      </section>

      <section id="contact" className="section-shell contact" aria-labelledby="contact-title">
        <div>
          <p className="eyebrow">Available for thoughtful teams</p>
          <h2 id="contact-title">聯絡我</h2>
          <p>如果你正在打造需要可靠架構、細膩產品工程和清楚技術判斷的團隊，我很樂意聊聊。</p>
        </div>
        <div className="contact-actions">
          <button className="button button-primary" type="button" onClick={handleCopyEmail}>
            {copied ? "Email 已複製" : "複製 Email"}
            {copied ? <Check size={20} aria-hidden="true" /> : <Clipboard size={20} aria-hidden="true" />}
          </button>
          <a className="button button-secondary" href={profile.socialLinks[0].url} target="_blank" rel="noreferrer">
            GitHub
            <Github size={20} aria-hidden="true" />
          </a>
        </div>
      </section>
    </main>
  );
}

function DashboardPreview() {
  const deploys = ["api-gateway", "user-service", "billing-service"];

  return (
    <div className="dashboard">
      <aside>
        <div className="dashboard-logo">
          <span>A</span>
          <strong>Atlas</strong>
        </div>
        {["概覽", "服務", "指標", "日誌", "部署", "設定"].map((item, index) => (
          <span key={item} className={index === 0 ? "active" : ""}>
            <Sparkles size={15} aria-hidden="true" />
            {item}
          </span>
        ))}
      </aside>
      <div className="dashboard-main">
        <div className="dashboard-top">
          <strong>概覽</strong>
          <span className="avatar">Y</span>
        </div>
        <div className="metric-grid">
          <Metric label="服務指數" value="128" delta="+12%" />
          <Metric label="成功請求率" value="99.95%" delta="+0.21%" />
          <Metric label="平均延遲" value="120ms" delta="-8%" />
        </div>
        <div className="chart-card">
          <div className="chart-head">
            <strong>請求數趨勢</strong>
            <span>成功請求</span>
          </div>
          <div className="chart-lines" aria-hidden="true">
            <span />
            <span />
            <span />
            <svg viewBox="0 0 420 170" role="img" aria-label="A rising line chart">
              <polyline points="0,125 34,94 68,112 102,70 136,78 170,55 204,85 238,58 272,77 306,49 340,72 374,63 420,32" />
              <polyline className="coral" points="0,148 34,138 68,143 102,132 136,140 170,127 204,139 238,135 272,125 306,139 340,132 374,144 420,136" />
            </svg>
          </div>
        </div>
      </div>
      <div className="deploy-panel">
        <strong>近期部署</strong>
        {deploys.map((deploy, index) => (
          <span key={deploy}>
            <i />
            <span>
              {deploy}
              <small>v{index + 1}.{index + 8}.{index + 1}</small>
            </span>
            <small>{index + 1}h ago</small>
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
      <button type="button" onClick={onSelect} aria-label={`Select ${project.title}`}>
        <span className={`project-icon icon-${index + 1}`}>{project.title.slice(0, 1)}</span>
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
