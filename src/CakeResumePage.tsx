import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  Github,
  Linkedin,
  Mail,
  MapPin,
} from "lucide-react";
import { useMemo, useState } from "react";
import "./cakeResume.css";
import { loadPortfolioDraftFromStorage } from "./portfolioDraft";
import { loadResumeDraftFromStorage } from "./resumeDraft";
import { buildResumeVersions, type ResumeVersion, type ResumeVersionId } from "./resumeVersions";
import type {
  ResumeBullet,
  ResumeData,
  ResumeLink,
  ResumeLinkIcon,
  ResumeProject,
  SkillColumn,
  TimelineItem,
} from "./types/resume";

type CakeResumePageProps = {
  onBackHome: () => void;
};

function resolveAssetPath(path?: string) {
  if (!path) return "";
  if (/^(https?:|mailto:|tel:|data:)/.test(path)) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
}

function getLinkIcon(icon: ResumeLinkIcon) {
  const iconProps = { size: 18, "aria-hidden": true };

  if (icon === "linkedin") return <Linkedin {...iconProps} />;
  if (icon === "github") return <Github {...iconProps} />;
  if (icon === "mail") return <Mail {...iconProps} />;
  return <ExternalLink {...iconProps} />;
}

function CakeResumePage({ onBackHome }: CakeResumePageProps) {
  const baseResume = useMemo(() => loadResumeDraftFromStorage().draft, []);
  const portfolio = useMemo(() => loadPortfolioDraftFromStorage().draft, []);
  const resumeVersions = useMemo(() => buildResumeVersions(baseResume, portfolio), [baseResume, portfolio]);
  const [selectedVersionId, setSelectedVersionId] = useState<ResumeVersionId>("original");
  const selectedVersion =
    resumeVersions.find((version) => version.id === selectedVersionId) ?? resumeVersions[0];
  const resume = selectedVersion.resume;

  const handlePrint = () => {
    const previousTitle = document.title;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };

    document.title = selectedVersion.pdfFileName;
    window.addEventListener("afterprint", restoreTitle, { once: true });
    window.print();
    window.setTimeout(restoreTitle, 1200);
  };

  return (
    <main className="cake-clone-page">
      <header className="cake-clone-toolbar no-print" aria-label="完整版履歷工具列">
        <button className="cake-clone-secondary-action" type="button" onClick={onBackHome}>
          <ArrowLeft size={18} aria-hidden="true" />
          回首頁
        </button>
        <div>
          <p>{resume.meta.eyebrow}</p>
          <h1>{resume.meta.title}</h1>
        </div>
        <div className="cake-clone-actions">
          <button type="button" onClick={handlePrint}>
            輸出 PDF
            <Download size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <ResumeVersionSelector
        versions={resumeVersions}
        selectedVersion={selectedVersion}
        onSelectVersion={setSelectedVersionId}
      />

      <section className="cake-clone-stage" aria-label="中文完整履歷">
        <article className="cake-clone-paper">
          <ResumeVersionHeader version={selectedVersion} />
          <ResumeProfile profile={resume.profile} profileImage={resume.meta.profileImage} />
          <SkillsSection skills={resume.skills} />
          {resume.projects?.length ? <FeaturedProjectsSection projects={resume.projects} /> : null}
          <TimelineSection title="工作經歷" items={resume.workExperience} />
          <TimelineSection title="學歷" items={resume.education} />
        </article>
      </section>
    </main>
  );
}

function ResumeVersionSelector({
  versions,
  selectedVersion,
  onSelectVersion,
}: {
  versions: ResumeVersion[];
  selectedVersion: ResumeVersion;
  onSelectVersion: (versionId: ResumeVersionId) => void;
}) {
  return (
    <section className="cake-clone-version-panel no-print" aria-label="履歷版本">
      <div className="cake-clone-version-buttons" role="radiogroup" aria-label="選擇履歷版本">
        {versions.map((version) => (
          <button
            key={version.id}
            className={version.id === selectedVersion.id ? "active" : ""}
            type="button"
            role="radio"
            aria-checked={version.id === selectedVersion.id}
            onClick={() => onSelectVersion(version.id)}
          >
            <FileText size={17} aria-hidden="true" />
            <span>{version.shortLabel}</span>
          </button>
        ))}
      </div>
      <div className="cake-clone-version-copy" aria-live="polite">
        <p>{selectedVersion.audience}</p>
        <strong>{selectedVersion.description}</strong>
        <div className="cake-clone-version-tags" aria-label="版本關鍵字">
          {selectedVersion.keywords.map((keyword) => (
            <span key={keyword}>{keyword}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function ResumeVersionHeader({ version }: { version: ResumeVersion }) {
  return (
    <header className="cake-clone-paper-header" aria-label="履歷版本資訊">
      <span>{version.label}</span>
      <p>{version.audience}</p>
    </header>
  );
}

function ResumeProfile({
  profile,
  profileImage,
}: {
  profile: ResumeData["profile"];
  profileImage: string;
}) {
  return (
    <section className="cake-clone-profile" aria-labelledby="cake-profile-title">
      <div className="cake-clone-photo-wrap">
        <img className="cake-clone-photo" src={resolveAssetPath(profileImage)} alt={`${profile.name}個人照片`} />
      </div>
      <div className="cake-clone-profile-content">
        <h2 id="cake-profile-title">{profile.name}</h2>
        <ul className="cake-clone-summary">
          {profile.summary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <ProfileLinks links={profile.links} />
        <p className="cake-clone-role">{profile.role}</p>
        <p className="cake-clone-location">
          <MapPin size={16} aria-hidden="true" />
          {profile.location}
        </p>
      </div>
    </section>
  );
}

function ProfileLinks({ links }: { links: ResumeLink[] }) {
  return (
    <div className="cake-clone-social no-print" aria-label="個人連結">
      {links.map((link) => (
        <a key={`${link.label}-${link.href}`} href={link.href} target="_blank" rel="noreferrer">
          {getLinkIcon(link.icon)}
          <span>{link.label}</span>
        </a>
      ))}
    </div>
  );
}

function SkillsSection({ skills }: { skills: SkillColumn[] }) {
  return (
    <section className="cake-clone-section" aria-labelledby="cake-skills-title">
      <h2 id="cake-skills-title">技能</h2>
      <div className="cake-clone-skill-columns">
        {skills.map((skill) => (
          <article className="cake-clone-skill" key={skill.title}>
            <hr />
            <h3>{skill.title}</h3>
            <ul>
              {skill.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function FeaturedProjectsSection({ projects }: { projects: ResumeProject[] }) {
  return (
    <section className="cake-clone-section cake-clone-projects-section" aria-labelledby="cake-projects-title">
      <h2 id="cake-projects-title">精選作品</h2>
      <div className="cake-clone-projects">
        {projects.map((project) => (
          <article className="cake-clone-project" key={project.title}>
            <h3>{project.title}</h3>
            <p>{project.summary}</p>
            <div className="cake-clone-project-tags" aria-label={`${project.title} 技術標籤`}>
              {project.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            {project.links.length ? (
              <div className="cake-clone-project-links">
                {project.links.map((link) => (
                  <a key={`${project.title}-${link.label}`} href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function TimelineSection({ title, items }: { title: string; items: TimelineItem[] }) {
  const sectionClassName =
    title === "工作經歷"
      ? "cake-clone-section cake-clone-work-section"
      : title === "學歷"
        ? "cake-clone-section cake-clone-education-section"
        : "cake-clone-section";

  return (
    <section className={sectionClassName} aria-labelledby={`cake-${title}-title`}>
      <h2 id={`cake-${title}-title`}>{title}</h2>
      <div className="cake-clone-timeline">
        {items.map((item) => (
          <TimelineEntry item={item} key={item.title} />
        ))}
      </div>
    </section>
  );
}

function TimelineEntry({ item }: { item: TimelineItem }) {
  const imagePath = resolveAssetPath(item.image);
  const image = imagePath ? <img src={imagePath} alt={item.imageAlt} loading="lazy" /> : null;

  return (
    <article className="cake-clone-entry">
      <div className="cake-clone-marker" aria-hidden="true" />
      <div className="cake-clone-copy">
        <h3>{item.title}</h3>
        <BulletList items={item.bullets} />
      </div>
      {image ? (
        <div className="cake-clone-image">
          {item.imageHref ? (
            <a href={item.imageHref} target="_blank" rel="noreferrer" aria-label={item.imageAlt}>
              {image}
            </a>
          ) : (
            image
          )}
        </div>
      ) : null}
    </article>
  );
}

function BulletList({ items }: { items: ResumeBullet[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={`${item.text}-${item.href ?? ""}`}>
          {item.href ? (
            <a href={item.href} target="_blank" rel="noreferrer">
              {item.text}
            </a>
          ) : (
            item.text
          )}
          {item.children?.length ? <BulletList items={item.children} /> : null}
        </li>
      ))}
    </ul>
  );
}

export default CakeResumePage;
