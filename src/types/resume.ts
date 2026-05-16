export type ResumeLinkIcon = "external" | "github" | "linkedin" | "mail";

export type ResumeBullet = {
  text: string;
  href?: string;
  children?: ResumeBullet[];
};

export type ResumeLink = {
  label: string;
  href: string;
  icon: ResumeLinkIcon;
};

export type SkillColumn = {
  title: string;
  items: string[];
};

export type TimelineItem = {
  title: string;
  image?: string;
  imageAlt: string;
  imageHref?: string;
  bullets: ResumeBullet[];
};

export type ResumeProjectLink = {
  label: string;
  href: string;
};

export type ResumeProject = {
  title: string;
  summary: string;
  tags: string[];
  links: ResumeProjectLink[];
};

export type ResumeData = {
  meta: {
    eyebrow: string;
    title: string;
    sourceUrl: string;
    profileImage: string;
  };
  profile: {
    name: string;
    role: string;
    location: string;
    summary: string[];
    links: ResumeLink[];
  };
  skills: SkillColumn[];
  projects?: ResumeProject[];
  workExperience: TimelineItem[];
  education: TimelineItem[];
};
