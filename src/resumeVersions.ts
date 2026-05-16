import { cloneResume } from "./resumeDraft";
import type { PortfolioData, Project } from "./types/portfolio";
import type { ResumeBullet, ResumeData, ResumeProject, SkillColumn, TimelineItem } from "./types/resume";

export type ResumeVersionId = "original" | "hsinchu-edge-ai" | "north-ai-software" | "remote-ai-application";

export type ResumeVersion = {
  id: ResumeVersionId;
  label: string;
  shortLabel: string;
  audience: string;
  description: string;
  keywords: string[];
  pdfFileName: string;
  resume: ResumeData;
};

const versionOrder: ResumeVersionId[] = [
  "original",
  "hsinchu-edge-ai",
  "north-ai-software",
  "remote-ai-application",
];

const projectPriorityByVersion: Record<Exclude<ResumeVersionId, "original">, string[]> = {
  "hsinchu-edge-ai": ["IIR Filter Tool", "Web TSP App", "Hex Snake", "Mapping Elf"],
  "north-ai-software": ["Hex Snake", "Mapping Elf", "IIR Filter Tool", "Web TSP App"],
  "remote-ai-application": ["Hex Snake", "Mapping Elf", "Win Rate Calculator", "Web TSP App"],
};

const remoteSkillColumns: SkillColumn[] = [
  {
    title: "核心程式語言",
    items: [
      "C / C++：嵌入式、DSP、效能導向實作",
      "Python：演算法建模、資料分析、實驗驗證",
      "Linux / Bash / Git：開發、測試與資料流程輔助",
    ],
  },
  {
    title: "Agent Coding 協作",
    items: [
      "LLM 輔助開發：Claude Code、ChatGPT Codex、Gemini、Antigravity",
      "JavaScript / TypeScript / React / Vite 作品主要經由 Agent Coding 完成",
      "本人負責需求拆解、演算法邏輯、測試驗證、重構判斷與文件整理",
    ],
  },
  {
    title: "演算法基礎",
    items: [
      "DSP、音訊/影像/生理訊號處理",
      "OpenCV、YOLO、Random Forest、CNN、DNN",
      "組合最佳化、模擬流程、回歸測試思維",
    ],
  },
];

const hsinchuSkillColumns: SkillColumn[] = [
  {
    title: "核心程式語言",
    items: [
      "C / C++：嵌入式與效能導向實作",
      "Python：演算法建模、資料分析、實驗驗證",
      "Linux / Bash / Git / Matlab / LabVIEW",
    ],
  },
  {
    title: "演算法與 AI",
    items: [
      "Audio DSP、Image Processing、Sensor Signal Processing",
      "OpenCV、YOLO、Random Forest、CNN、DNN",
      "PyTorch / TensorFlow 基礎、模型訓練與評估流程",
    ],
  },
  {
    title: "Edge / Agent 協作",
    items: [
      "MCU / Bluetooth SoC / 資源受限平台最佳化",
      "fixed-point / floating-point 數值處理",
      "前端展示作品主要透過 Agent Coding 完成，本人負責需求、演算法與驗證",
    ],
  },
];

const northAiSoftwareSkillColumns: SkillColumn[] = [
  {
    title: "核心程式語言",
    items: [
      "C / C++：演算法、DSP、嵌入式與效能導向實作",
      "Python：模型模擬、資料分析、實驗驗證",
      "Linux / Bash / Git：自動化與協作流程",
    ],
  },
  {
    title: "AI / ML 工程",
    items: [
      "OpenCV、YOLO、Random Forest、CNN、DNN",
      "資料標記、特徵分析、模型訓練與驗證",
      "PyTorch / TensorFlow 基礎",
    ],
  },
  {
    title: "系統整合 / Agent Coding",
    items: [
      "雷達、熱影像、音訊與 MCU 平台整合",
      "自動化資料收集、遠端 Linux 裝置控制、GUI 工具設計",
      "JavaScript / TypeScript / React 作品主要經由 Agent Coding 完成",
    ],
  },
];

const hsinchuSummary = [
  "10 年以上演算法與軟體開發經驗，橫跨音訊 DSP、影像處理、雷達生命徵象、熱影像 CV 與 MCU / 藍牙晶片實作。",
  "熟悉以 Python 建模與驗證，再以 C / C++ 在資源受限平台實作與優化，能處理數值精度、記憶體、效能與實驗資料迭代。",
  "曾實作 ADPCM / SBC、pitch tracking、WSOLA、feedback suppression、audio fingerprinting、VAD / 降噪、OpenCV / YOLO 熱影像姿態與跌倒辨識。",
  "本人擅長的程式語言為 C / C++ / Python；JavaScript / TypeScript / React 相關作品主要經由 Agent Coding 協作完成。",
  "目標職務為新竹地區可非遠端的 AI / CV / Edge AI / 演算法工程角色，偏好結合訊號處理、模型部署、效能分析與跨功能整合的團隊。",
];

const northAiSoftwareSummary = [
  "具演算法工程背景，能把感測資料、模型驗證與軟體介面整合成可操作工具，核心語言為 C / C++ / Python。",
  "曾在醫療照護、語音 IC、藍牙音訊與射頻測試場景中建立演算法、資料收集工具、GUI 與自動化腳本，熟悉從實驗到系統整合的落地過程。",
  "近年以公開作品集展示互動式演算法工具、AI 對弈與地圖資料視覺化；前端與 Web 實作主要透過 Agent Coding 完成，本人負責需求、演算法邏輯與驗證。",
  "目標職務為北台灣且至少部分遠端的 AI Software Engineer、AI/ML Application Engineer 或演算法產品化工程角色。",
];

const remoteAiApplicationSummary = [
  "演算法與軟體工程背景，近期聚焦 AI 輔助開發流程、互動式 Web 工具與可公開驗證的作品集，能在非同步協作中交付清楚的 demo、文件與程式碼。",
  "熟悉 Claude Code、ChatGPT Codex、Gemini 與 Antigravity 等工具，將 LLM 用於需求拆解、原型實作、測試驗證、重構與技術文件整理。",
  "本人擅長的程式語言為 C / C++ / Python；JavaScript / TypeScript / React 產品介面與作品主要經由 Agent Coding 協作完成。",
  "作品涵蓋 AI 對弈、演算法視覺化、DSP 工具與戶外地圖應用，適合作為需求拆解、驗證流程與 AI 協作開發能力的展示。",
  "目標職務為新竹與北台灣以外地區、完全遠端的 AI Application Engineer、AI Software Engineer、LLM 工具/產品工程角色。",
];

function makeBullet(text: string, children?: ResumeBullet[]): ResumeBullet {
  return children?.length ? { text, children } : { text };
}

function patentBullets(): ResumeBullet[] {
  return [
    {
      text: "具聽力保護功能之聲音調整裝置及其聲音調整之方法",
      href: "https://patents.google.com/patent/TWI594233B",
    },
    {
      text: "聲音調整方法及聲音調整裝置",
      href: "https://patents.google.com/patent/TWI708512B",
    },
    {
      text: "聲音播放裝置及其透過遮噪音訊遮蓋干擾音之方法",
      href: "https://patents.google.com/patent/TW202107273A",
    },
  ];
}

function rewriteWorkExperience(item: TimelineItem, versionId: Exclude<ResumeVersionId, "original">): TimelineItem {
  if (item.title.includes("九齊科技")) {
    return {
      ...item,
      bullets: [
        makeBullet("為語音控制 IC、語音微控制器與 LCD 微控制器開發演算法函式庫，使用 Python 進行建模與測試，再以 C 在 MCU 資源限制下實作。"),
        makeBullet("實作與優化 ADPCM、SBC、pitch tracking、syllable segmentation、resampling + WSOLA、feedback suppression、audio fingerprinting 與 beat tracking 等音訊演算法。"),
        makeBullet("參與圖像縮放與圖像壓縮演算法，將訊號處理模型整理為可整合、可維護的嵌入式函式庫接口。"),
      ],
    };
  }

  if (item.title.includes("亞迪電子")) {
    return {
      ...item,
      bullets: [
        makeBullet("以 Python 模擬、C++ 實作微波雷達非接觸式呼吸與心跳監測演算法，支援醫療照護、防疫與畜牧應用場景。"),
        makeBullet("建立微波資料標記 GUI 與視覺化流程，協助資料收集、品質檢查、特徵分析與模型迭代。"),
        makeBullet("運用 OpenCV 與 YOLO 開發熱影像姿態與跌倒辨識，並以 Random Forest、CNN、DNN 探索病徵辨識模型。"),
        makeBullet("編寫 Bash 腳本控制遠端 Linux 裝置並收集實驗資料，以 SMAC 步進馬達建立呼吸與心跳模擬平台。"),
      ],
    };
  }

  if (item.title.includes("元鼎音訊")) {
    return {
      ...item,
      bullets: [
        makeBullet("在 CSR8670、AB1539/T 等藍牙晶片上以 C 與 Assembly 實作音訊演算法，負責 Python 模擬到晶片端整合。"),
        makeBullet("開發與優化 VAD、LRT、音訊降噪、超低音移頻、EQ、DRC、雙耳拍音與自然聲生成等 DSP 功能。"),
        makeBullet("處理 fixed-point / floating-point 數值轉換與資源受限平台最佳化，兼顧運算效率、聲音品質與穩定性。"),
        makeBullet("與團隊共同申請 3 件聲音調整與聽力保護相關專利。", patentBullets()),
      ],
    };
  }

  if (item.title.includes("廣達電腦")) {
    return {
      ...item,
      bullets: [
        makeBullet("協助客戶進行射頻元件開發、試產與測試實驗，整理結果報告並追蹤改善項目。"),
        makeBullet("撰寫與維護自動化測試程式，進行儀器控制、數據收集、良率追蹤與錯誤分析。"),
      ],
    };
  }

  if (item.title.includes("中央研究院")) {
    return {
      ...item,
      bullets: [
        makeBullet("設計干涉式散射光學顯微鏡（iSCAT），建立生物膜奈米粒子高幀率影像與定位追蹤流程。"),
        makeBullet("以 1k 至 100k fps 高速攝影資料分析細胞膜物理特性，研究成果共同發表於 Optics Express。"),
      ],
    };
  }

  if (versionId === "remote-ai-application") {
    return {
      ...item,
      bullets: item.bullets.slice(0, 2),
    };
  }

  return item;
}

function rewriteEducation(item: TimelineItem): TimelineItem {
  if (item.title.includes("國立台灣大學")) {
    return {
      ...item,
      bullets: [
        makeBullet("物理研究所碩士，研究非線性光學、飛秒雷射、超解析螢光顯微鏡與非侵入式 3D 生醫影像。"),
        makeBullet("參與中研院、清大、陽明、逢甲與大阪大學等跨校合作計畫，並曾擔任光學與物理課程助教。"),
      ],
    };
  }

  if (item.title.includes("國立成功大學")) {
    return {
      ...item,
      bullets: [
        makeBullet("物理學系學士，參與電漿與太空科學中心探測計畫，透過軟體模擬天線、傳輸線與探測器頻譜。"),
        makeBullet("物理、光學、電磁學與數值模擬背景，支援後續訊號處理與演算法建模能力。"),
      ],
    };
  }

  return item;
}

function mapProjectLinks(project: Project): ResumeProject["links"] {
  return [
    project.links.demo ? { label: "Demo", href: project.links.demo } : null,
    project.links.repo ? { label: "GitHub", href: project.links.repo } : null,
    project.links.caseStudy ? { label: "Case Study", href: project.links.caseStudy } : null,
  ].filter((link): link is ResumeProject["links"][number] => Boolean(link));
}

function buildFeaturedProjects(portfolio: PortfolioData | undefined, versionId: Exclude<ResumeVersionId, "original">) {
  if (!portfolio) return [];

  const priority = projectPriorityByVersion[versionId];
  const projectByTitle = new Map(portfolio.projects.map((project) => [project.title, project]));

  return priority
    .map((title) => projectByTitle.get(title))
    .filter((project): project is Project => Boolean(project))
    .map((project) => ({
      title: project.title,
      summary: project.summary,
      tags: project.tags.slice(0, 6),
      links: mapProjectLinks(project),
    }));
}

function applyRevision(
  baseResume: ResumeData,
  portfolio: PortfolioData | undefined,
  versionId: Exclude<ResumeVersionId, "original">,
) {
  const resume = cloneResume(baseResume);
  const variantText = {
    "hsinchu-edge-ai": {
      title: "張維麟履歷｜新竹版（可非遠端）",
      role: "Algorithm Engineer / Edge AI Software Engineer",
      summary: hsinchuSummary,
      skills: hsinchuSkillColumns,
    },
    "north-ai-software": {
      title: "張維麟履歷｜北台灣版（至少部分遠端）",
      role: "AI Software Engineer / AI-ML Application Engineer",
      summary: northAiSoftwareSummary,
      skills: northAiSoftwareSkillColumns,
    },
    "remote-ai-application": {
      title: "張維麟履歷｜其他地區版（完全遠端）",
      role: "AI Application Engineer / AI Software Engineer",
      summary: remoteAiApplicationSummary,
      skills: remoteSkillColumns,
    },
  }[versionId];

  resume.meta = {
    ...resume.meta,
    eyebrow: "Resume variant",
    title: variantText.title,
  };
  resume.profile = {
    ...resume.profile,
    role: variantText.role,
    summary: variantText.summary,
  };
  resume.skills = variantText.skills;
  resume.projects = buildFeaturedProjects(portfolio, versionId);
  resume.workExperience = resume.workExperience.map((item) => rewriteWorkExperience(item, versionId));
  resume.education = resume.education.map(rewriteEducation);

  return resume;
}

function buildOriginalVersion(baseResume: ResumeData): ResumeVersion {
  const resume = cloneResume(baseResume);

  return {
    id: "original",
    label: "原始完整版",
    shortLabel: "原始",
    audience: "保留目前 Cake / 站內履歷內容",
    description: "不改寫內容，用於比對原始敘事、完整經歷與目前公開履歷資料。",
    keywords: ["完整經歷", "原始敘事", "Cake 對照"],
    pdfFileName: `${resume.profile.name}_原始完整版履歷`,
    resume,
  };
}

function buildRevisedVersion(
  baseResume: ResumeData,
  portfolio: PortfolioData | undefined,
  versionId: Exclude<ResumeVersionId, "original">,
): ResumeVersion {
  const resume = applyRevision(baseResume, portfolio, versionId);
  const metadata: Record<Exclude<ResumeVersionId, "original">, Omit<ResumeVersion, "id" | "resume">> = {
    "hsinchu-edge-ai": {
      label: "新竹版（可非遠端）",
      shortLabel: "新竹",
      audience: "新竹 / 竹科職缺，可接受非遠端或現場工作",
      description: "主打 C/C++/Python、DSP、MCU、OpenCV/YOLO、Edge AI 與效能導向經驗。",
      keywords: ["新竹", "可非遠端", "C/C++", "Python", "DSP", "MCU"],
      pdfFileName: `${resume.profile.name}_新竹版_可非遠端履歷`,
    },
    "north-ai-software": {
      label: "北台灣版（至少部分遠端）",
      shortLabel: "北台灣",
      audience: "北台灣職缺，至少需要部分遠端或彈性混合辦公",
      description: "主打 C/C++/Python 的 AI/ML 工程、資料工具、Linux 自動化與跨系統整合能力。",
      keywords: ["北台灣", "部分遠端", "C/C++", "Python", "AI/ML", "Automation"],
      pdfFileName: `${resume.profile.name}_北台灣版_至少部分遠端履歷`,
    },
    "remote-ai-application": {
      label: "其他地區版（完全遠端）",
      shortLabel: "其他地區",
      audience: "新竹與北台灣以外職缺，僅接受完全遠端",
      description: "主打 C/C++/Python 基礎、Agent Coding 協作、公開作品、非同步協作、文件化與可展示 demo。",
      keywords: ["完全遠端", "C/C++", "Python", "Agent Coding", "Async", "Documentation"],
      pdfFileName: `${resume.profile.name}_其他地區版_完全遠端履歷`,
    },
  };

  return {
    id: versionId,
    resume,
    ...metadata[versionId],
  };
}

export function buildResumeVersions(baseResume: ResumeData, portfolio?: PortfolioData) {
  const versions = versionOrder.map((versionId) => {
    if (versionId === "original") return buildOriginalVersion(baseResume);
    return buildRevisedVersion(baseResume, portfolio, versionId);
  });

  return versions;
}
