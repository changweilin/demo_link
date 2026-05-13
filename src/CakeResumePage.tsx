import {
  ArrowLeft,
  Download,
  ExternalLink,
  Github,
  Linkedin,
  Mail,
  MapPin,
} from "lucide-react";
import "./cakeResume.css";
import { loadResumeDraftFromStorage } from "./resumeDraft";
import type { ResumeBullet, ResumeData, ResumeLink, ResumeLinkIcon, SkillColumn, TimelineItem } from "./types/resume";

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
  const resume = loadResumeDraftFromStorage().draft;

  const handlePrint = () => {
    window.print();
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

      <section className="cake-clone-stage" aria-label="中文完整履歷">
        <article className="cake-clone-paper">
          <ResumeProfile profile={resume.profile} profileImage={resume.meta.profileImage} />
          <SkillsSection skills={resume.skills} />
          <TimelineSection title="工作經歷" items={resume.workExperience} />
          <TimelineSection title="學歷" items={resume.education} />
        </article>
      </section>
    </main>
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

function TimelineSection({ title, items }: { title: string; items: TimelineItem[] }) {
  return (
    <section className="cake-clone-section" aria-labelledby={`cake-${title}-title`}>
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
