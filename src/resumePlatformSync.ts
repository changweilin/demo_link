import type { ResumeBullet, ResumeData, TimelineItem } from "./types/resume";

export type ResumeSyncPlatformId = "104" | "linkedin" | "cake";
export type ResumeSyncSectionKey = "profile" | "summary" | "skills" | "workExperience" | "education" | "links";

type ResumeSyncPlatformConfig = {
  id: ResumeSyncPlatformId;
  label: string;
  description: string;
  targetSections: Record<ResumeSyncSectionKey, string>;
};

export type ResumeSyncSection = {
  key: ResumeSyncSectionKey;
  sourceLabel: string;
  sourcePath: string;
  targetLabel: string;
  itemCount: number;
  preview: string;
  manualText?: string;
  payload: unknown;
};

export type ResumePlatformSyncPackage = {
  platform: ResumeSyncPlatformId;
  platformLabel: string;
  description: string;
  updatedAt: string;
  sections: ResumeSyncSection[];
};

export const resumeSyncPlatforms: ResumeSyncPlatformConfig[] = [
  {
    id: "104",
    label: "104",
    description: "對應 My104 履歷編輯頁，保留基本資料、自傳、技能、工作經歷、學歷與作品連結。",
    targetSections: {
      profile: "基本資料",
      summary: "自傳 / 自我介紹",
      skills: "專長技能",
      workExperience: "工作經歷",
      education: "學歷",
      links: "附件 / 作品連結",
    },
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    description: "對應 LinkedIn Profile 的 Intro、About、Skills、Experience、Education 與 Contact / Featured。",
    targetSections: {
      profile: "Intro",
      summary: "About",
      skills: "Skills",
      workExperience: "Experience",
      education: "Education",
      links: "Contact info / Featured",
    },
  },
  {
    id: "cake",
    label: "Cake",
    description: "對應 Cake 履歷區塊，並可用同一份資料更新站內 Cake 版履歷預覽。",
    targetSections: {
      profile: "Profile",
      summary: "Summary",
      skills: "Skills",
      workExperience: "Work Experience",
      education: "Education",
      links: "Social Links / Portfolio",
    },
  },
];

const sourceLabels: Record<ResumeSyncSectionKey, { label: string; path: string }> = {
  profile: { label: "個人資料", path: "profile + meta.profileImage" },
  summary: { label: "自我介紹", path: "profile.summary" },
  skills: { label: "技能", path: "skills" },
  workExperience: { label: "工作經歷", path: "workExperience" },
  education: { label: "學歷", path: "education" },
  links: { label: "個人連結", path: "profile.links" },
};

function compactLines(lines: string[]) {
  return lines.map((line) => line.trim()).filter(Boolean);
}

function getBulletTextLines(bullets: ResumeBullet[], level = 0): string[] {
  return bullets.flatMap((bullet) => {
    const indent = "  ".repeat(level);
    const linkSuffix = bullet.href ? ` (${bullet.href})` : "";
    const currentLine = `${indent}- ${bullet.text}${linkSuffix}`;
    const childLines = bullet.children?.length ? getBulletTextLines(bullet.children, level + 1) : [];

    return [currentLine, ...childLines];
  });
}

function getBulletsPlainText(bullets: ResumeBullet[]) {
  return getBulletTextLines(bullets).join("\n");
}

function splitTimelineTitle(title: string) {
  const [organization = "", role = "", ...periodParts] = title.split(",").map((part) => part.trim());

  return {
    organization,
    role,
    period: periodParts.join(", "),
  };
}

function mapTimelineItem(item: TimelineItem) {
  const titleParts = splitTimelineTitle(item.title);

  return {
    title: item.title,
    ...titleParts,
    image: item.image ?? "",
    imageAlt: item.imageAlt,
    imageHref: item.imageHref ?? "",
    bullets: item.bullets,
    plainText: getBulletsPlainText(item.bullets),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function formatTimelineSyncText(items: unknown[]) {
  return items
    .map((item) => {
      if (!isRecord(item)) return "";

      const title = getStringValue(item.title);
      const organization = getStringValue(item.organization);
      const role = getStringValue(item.role);
      const period = getStringValue(item.period);
      const details = getStringValue(item.plainText);
      const timelineLabel = organization || role || period ? [organization, role, period].filter(Boolean).join(" / ") : "";

      return [title, timelineLabel, details].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

export function getResumeSyncSectionText(section: ResumeSyncSection) {
  if (typeof section.manualText === "string") return section.manualText;

  const payload = section.payload;

  if (section.key === "profile" && isRecord(payload)) {
    return [payload.name, payload.headline, payload.location, payload.photoUrl].map(getStringValue).filter(Boolean).join("\n");
  }

  if (section.key === "summary" && isRecord(payload)) {
    return getStringArray(payload.paragraphs).join("\n\n");
  }

  if (section.key === "skills" && isRecord(payload) && Array.isArray(payload.groups)) {
    return payload.groups
      .map((group) => {
        if (!isRecord(group)) return "";

        const title = getStringValue(group.title);
        const items = getStringArray(group.items).map((item) => `- ${item}`);

        return [title, ...items].filter(Boolean).join("\n");
      })
      .filter(Boolean)
      .join("\n\n");
  }

  if ((section.key === "workExperience" || section.key === "education") && isRecord(payload) && Array.isArray(payload.items)) {
    return formatTimelineSyncText(payload.items);
  }

  if (section.key === "links" && isRecord(payload) && Array.isArray(payload.links)) {
    return payload.links
      .map((link) => {
        if (!isRecord(link)) return "";
        return [link.label, link.href].map(getStringValue).filter(Boolean).join("\n");
      })
      .filter(Boolean)
      .join("\n\n");
  }

  return section.preview;
}

function getTimelinePreview(items: TimelineItem[]) {
  return items
    .map((item) => {
      const { organization, role, period } = splitTimelineTitle(item.title);
      return compactLines([organization, role, period]).join(" / ") || item.title;
    })
    .join("\n");
}

function getSkillsPreview(resume: ResumeData) {
  return resume.skills.map((skill) => `${skill.title}: ${skill.items.join(", ")}`).join("\n");
}

function getLinksPreview(resume: ResumeData) {
  return resume.profile.links.map((link) => `${link.label}: ${link.href}`).join("\n");
}

function createSection(
  key: ResumeSyncSectionKey,
  targetLabel: string,
  itemCount: number,
  preview: string,
  payload: unknown,
): ResumeSyncSection {
  const source = sourceLabels[key];

  return {
    key,
    sourceLabel: source.label,
    sourcePath: source.path,
    targetLabel,
    itemCount,
    preview,
    payload,
  };
}

function buildSections(resume: ResumeData, config: ResumeSyncPlatformConfig): ResumeSyncSection[] {
  return [
    createSection(
      "profile",
      config.targetSections.profile,
      1,
      compactLines([resume.profile.name, resume.profile.role, resume.profile.location]).join("\n"),
      {
        name: resume.profile.name,
        headline: resume.profile.role,
        location: resume.profile.location,
        photoUrl: resume.meta.profileImage,
      },
    ),
    createSection("summary", config.targetSections.summary, resume.profile.summary.length, resume.profile.summary.join("\n"), {
      paragraphs: resume.profile.summary,
    }),
    createSection("skills", config.targetSections.skills, resume.skills.length, getSkillsPreview(resume), {
      groups: resume.skills,
    }),
    createSection(
      "workExperience",
      config.targetSections.workExperience,
      resume.workExperience.length,
      getTimelinePreview(resume.workExperience),
      {
        items: resume.workExperience.map(mapTimelineItem),
      },
    ),
    createSection("education", config.targetSections.education, resume.education.length, getTimelinePreview(resume.education), {
      items: resume.education.map(mapTimelineItem),
    }),
    createSection("links", config.targetSections.links, resume.profile.links.length, getLinksPreview(resume), {
      links: resume.profile.links,
    }),
  ];
}

export function buildResumePlatformSyncPackages(resume: ResumeData, updatedAt: string): ResumePlatformSyncPackage[] {
  return resumeSyncPlatforms.map((config) => ({
    platform: config.id,
    platformLabel: config.label,
    description: config.description,
    updatedAt,
    sections: buildSections(resume, config),
  }));
}

export function getResumePlatformSyncJson(packages: ResumePlatformSyncPackage[]) {
  return `${JSON.stringify({ schemaVersion: 1, platforms: packages }, null, 2)}\n`;
}

export function getResumePlatformClipboardText(packages: ResumePlatformSyncPackage[]) {
  return packages
    .map((syncPackage) => {
      const sections = syncPackage.sections
        .map(
          (section) =>
            `## ${section.sourceLabel} -> ${syncPackage.platformLabel} / ${section.targetLabel}\n${getResumeSyncSectionText(section)}`,
        )
        .join("\n\n");

      return `# ${syncPackage.platformLabel} 履歷同步資料\n更新時間：${syncPackage.updatedAt}\n\n${sections}`;
    })
    .join("\n\n---\n\n");
}
