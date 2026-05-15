export type PortfolioLinkSet = {
  demo?: string;
  repo?: string;
  caseStudy?: string;
};

export type ProjectScreenshot = {
  src: string;
  alt: string;
};

export type Project = {
  title: string;
  summary: string;
  description: string;
  tags: string[];
  category: string;
  year: string;
  createdAt: string;
  updatedAt: string;
  screenshot?: ProjectScreenshot;
  screenshots?: ProjectScreenshot[];
  links: PortfolioLinkSet;
};

export type PortfolioSocialLink = {
  label: string;
  url: string;
};

export type PortfolioProfile = {
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
  socialLinks: PortfolioSocialLink[];
};

export type PortfolioData = {
  profile: PortfolioProfile;
  projects: Project[];
};
