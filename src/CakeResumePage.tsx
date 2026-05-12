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

type ResumeBullet = {
  text: string;
  href?: string;
  children?: ResumeBullet[];
};

type SkillColumn = {
  title: string;
  items: string[];
};

type TimelineItem = {
  title: string;
  bullets: ResumeBullet[];
  image: string;
  imageAlt: string;
  imageHref?: string;
};

type CakeResumePageProps = {
  onBackHome: () => void;
};

const cakeResumeUrl =
  "https://www.cake.me/resumes/s--ZPVljOGfbQ4Quk-5tutNFw--/wei-lin-chang";

const profileImage =
  "https://images.cakeresume.com/Y6vOX/wei-lin-chang/90b9d5fb-d154-4bb5-a793-d283cab9f463.png";

const profileSummary = [
  "我是宜蘭羅東人，物理系所畢業，是一名演算法工程師，擅長C/C++/Python。興趣是登山與桌遊。",
  "我喜歡閱讀，對這個世界好奇。時常涉獵各領域的書籍擴張知識與想像力的邊界，如《Dive into Deep Learning》、《Modern C++》、《深入淺出設計模式》、《雜訊：人類判斷的缺陷》等書。",
  "我積極透過AI與網路資源學習，精進演算法與深度學習，也經常在LeetCode 上進行腦力挑戰。",
  "我對最新的 AI 技術充滿熱情，特別關注 YOLO、Stable Diffusion 以及大型語言模型（LLM）在模型架構、訓練與 prompt 設計等方面的進展。",
  "我享受編程過程中思維碰撞的樂趣，喜歡運用數學工具與邏輯推理來完成專案，從數據中抽取關鍵特徵。這與我在物理學中，從基本定理出發來描述世界的過程頗為相似。",
  "近年來，我多方嘗試Gemini/chatGPT/Claude/Gork等LLM模型，使用Antigravity/Claude code等AI工具，透過AI代理協助完成工作，包括編碼與測試驗證、學習新知、關注前沿科技的最新發展等。",
];

const profileLinks = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/wei-lin-chang-ba38049a/",
    icon: <Linkedin size={18} aria-hidden="true" />,
  },
  {
    label: "GitHub",
    href: "https://github.com/changweilin",
    icon: <Github size={18} aria-hidden="true" />,
  },
  {
    label: "作品集",
    href: "https://changweilin.github.io/demo_link/",
    icon: <ExternalLink size={18} aria-hidden="true" />,
  },
  {
    label: "x111281@gmail.com",
    href: "mailto:x111281@gmail.com",
    icon: <Mail size={18} aria-hidden="true" />,
  },
];

const skills: SkillColumn[] = [
  {
    title: "物理學",
    items: [
      "雷射: 調頻飛秒脈衝雷射光源",
      "顯微鏡: 共軛焦顯微鏡/ 雙光子螢光顯微鏡/ 二倍頻顯微鏡 干涉式顯微鏡",
      "望遠鏡: 牛頓式天文望遠鏡",
    ],
  },
  {
    title: "程式語言",
    items: [
      "C/C++: QT/ OpenCV",
      "C#",
      "Python: TensorFlow/ PyTorch",
      "Linux/Bash",
      "Matlab/ LabVIEW",
    ],
  },
  {
    title: "演算法",
    items: [
      "音訊訊號處理",
      "影像訊號處理",
      "生理與物理訊號處理",
      "ML/DL: YOLO/Stable Diffusion/LLM",
      "網路爬蟲",
    ],
  },
];

const workExperience: TimelineItem[] = [
  {
    title: "九齊科技, 演算法工程師, Nov 2022 ~",
    image:
      "https://images.cakeresume.com/Y6vOX/wei-lin-chang/0e23bbbd-65a8-4f31-b74e-3e6b51ed472d.png",
    imageAlt: "九齊科技",
    imageHref: "https://www.nyquest.com.tw/tw",
    bullets: [
      {
        text: "我參與開發與優化應用於語音控制IC、語音微控制器及LCD微控制器等核心產品上的語音演算法函式庫。",
      },
      {
        text: "使用 Python進行演算法模擬，並以 C 語言在資源有限的 MCU環境中達成高效運算與優化。實現並改進以下演算法：",
        children: [
          { text: "音訊編碼演算法。(ADPCM、SBC)" },
          { text: "音高追蹤與音節分割演算法。(ptich tracking/Syllable segmentation)" },
          { text: "音訊變速變調演算法。(resampling + WSOLA)" },
          { text: "迴授抑制。（Feedback Suppression)" },
          { text: "聲紋辨識演算法。(Audio Fingerprinting)" },
          { text: "節拍偵測演算法。(beat tracking)" },
          { text: "圖像縮放演算法。(Image scaling)" },
          { text: "圖像壓縮演算法。" },
        ],
      },
    ],
  },
  {
    title: "亞迪電子, 演算法工程師, Jul 2020 ~ Oct 2022",
    image:
      "https://images.cakeresume.com/Y6vOX/wei-lin-chang/bee18f9b-190b-4a8d-81a0-75554eb516f8.png",
    imageAlt: "亞迪電子",
    bullets: [
      {
        text: "我參與結合熱像鏡頭與微波雷達的關鍵技術開發，應用於醫療照護、防疫及畜牧等領域。我的主要工作內容包括：",
      },
      {
        text: "生理監測演算法開發：",
        children: [
          { text: "以Python模擬、C++實現，透過微波雷達，進行非接觸式呼吸心跳監測演算法。" },
          { text: "設計微波標記GUI工具，以提高便利性與數據視覺化。" },
          { text: "使用微波數據訓練模型（包含 Random Forest、CNN 與 DNN），實現病徵辨識。" },
        ],
      },
      {
        text: "視覺與姿態辨識：",
        children: [{ text: "運用 OpenCV 與 YOLO 技術開發熱影像姿態與跌倒辨識系統。" }],
      },
      {
        text: "系統整合與自動化：",
        children: [
          { text: "編寫 Bash 腳本控制遠端 Linux 裝置並收集數據，以支援多元應用。" },
          { text: "以 SMAC 步進馬達模擬病人呼吸與心跳運動，為演算法調試提供模擬平台。" },
        ],
      },
    ],
  },
  {
    title: "元鼎音訊, 軟體工程師, May 2016 ~ Jun 2020",
    image:
      "https://images.cakeresume.com/wei-lin-chang/51fa6a74-fe6a-4581-8341-3f09f5f75510.png",
    imageAlt: "元鼎音訊",
    bullets: [
      {
        text: "我參與藍芽耳機與輔聽器的演算法研發，專注聽力健康技術的創新。我利用Python進行演算法模擬，並在CSR8670、AB1539/T等藍芽晶片上以C與Assembly實現，包括：",
      },
      {
        text: "語音增強：開發並優化演算法，包括VAD、LRT、音訊降噪以及超低音移頻技術。",
      },
      {
        text: "聽力保護：實現EQ、DRC與雙耳拍音生成，提供更安全舒適的聽覺體驗。",
      },
      {
        text: "自然聲隨機生成：利用亂數、白噪聲與水滴物理學生成自然聲音，豐富音效表現。",
      },
      {
        text: "DSP演算法優化：如浮點數與定點數運算，確保系統在資源受限環境下高效與精準運行。",
      },
      {
        text: "與同事一起合作申請的專利：",
        children: [
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
        ],
      },
    ],
  },
  {
    title: "廣達電腦, 射頻工程師, Nov 2014 ~ May 2016",
    image:
      "https://images.cakeresume.com/wei-lin-chang/e22b8480-e768-4f41-8174-bcf833e2fe9a.png",
    imageAlt: "廣達電腦",
    imageHref: "https://www.quantatw.com/Quanta/chinese/Default.aspx",
    bullets: [
      { text: "我的主要工作內容為協助客戶進行射頻元件開發。" },
      { text: "撰寫、維護自動化測試程式，進行儀器控制與數據分析。" },
      { text: "改善良率、收集數據、並對生產線進行錯誤分析與改善計畫。" },
      { text: "協助客戶進行測試實驗、試產，提出結果報告。" },
    ],
  },
  {
    title: "中央研究院, 研究助理, Jul 2013 ~ Apr 2014",
    image:
      "https://images.cakeresume.com/wei-lin-chang/b1a72bd6-632a-457f-95ab-dd64259bc4ad.png",
    imageAlt: "中央研究院",
    imageHref: "https://www.iams.sinica.edu.tw/tw/",
    bullets: [
      { text: "退伍後，我加入中研院原分所謝佳龍老師的實驗室。" },
      { text: "設計干涉式散射光學顯微鏡(iSCAT)，以建立生物膜奈米粒子影像。" },
      { text: "以高速攝影機(1k~100k fps)，對細胞膜分子上的奈米粒子定位，並追蹤動態軌跡。" },
      { text: "透過大量的動態軌跡數據，分析出細胞膜物理特性。" },
      {
        text: "與同事、老師一同將研究成果發表在Optics Express的期刊論文，收穫良多。",
        children: [
          {
            text: "Shot-noise limited localization of single 20 nm gold particles with nanometer spatial precision within microseconds",
            href: "http://www.opticsinfobase.org/oe/abstract.cfm?uri=oe-22-8-9159",
          },
        ],
      },
    ],
  },
];

const education: TimelineItem[] = [
  {
    title: "國立台灣大學, 碩士學位, 物理研究所, 2009 ~ 2012",
    image:
      "https://images.cakeresume.com/Y6vOX/wei-lin-chang/9747e837-834c-4609-9125-8d08df613412.png",
    imageAlt: "國立台灣大學",
    imageHref: "https://phys.ntu.edu.tw/Default.html",
    bullets: [
      { text: "我碩士班時加入朱士維老師的生醫光學實驗室。" },
      { text: "非線性光學現象：非線性晶體、光子晶體光纖、飛秒脈衝雷射光源。" },
      { text: "顯微鏡技術：超解析度螢光顯微鏡、非線性光學顯微鏡，運用於非侵入式3D生醫影像。" },
      { text: "中研院、清大、陽明、逢甲、大阪大學等地多次進行合作計畫。" },
      { text: "曾擔任光學和物理的大學課程助教，設計日常生活中、關於光的趣味演示實驗。" },
    ],
  },
  {
    title: "國立成功大學, 學士學位, 物理學系, 2005 ~ 2009",
    image:
      "https://images.cakeresume.com/wei-lin-chang/623a1def-915f-49f2-9043-fd90d4909721.png",
    imageAlt: "國立成功大學",
    imageHref: "https://www.phys.ncku.edu.tw/en/",
    bullets: [
      { text: "我加入電漿與太空科學中心的電漿探測計畫，開發太空儀器。" },
      { text: "透過軟體模擬天線與傳輸線的結構、計算探測器的頻譜與傳輸效率。" },
      { text: "藉由高頻微波對電漿粒子的交互作用，觀察電漿的物理特性。" },
      {
        text: "大學期間，最喜愛的課程有：天文學、廣義相對論、近代物理實驗、大腦的功能、世界音樂、越南社會與文化等課程。",
      },
      { text: "也積極參加社團活動：系學會、系羽球隊、蘭友會、熱舞社、羽球社。" },
    ],
  },
];

function CakeResumePage({ onBackHome }: CakeResumePageProps) {
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
          <p>Full resume</p>
          <h1>張維麟完整中文履歷</h1>
        </div>
        <div className="cake-clone-actions">
          <a href={cakeResumeUrl} target="_blank" rel="noreferrer">
            原始 Cake 頁面
            <ExternalLink size={18} aria-hidden="true" />
          </a>
          <button type="button" onClick={handlePrint}>
            輸出 PDF
            <Download size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="cake-clone-stage" aria-label="中文完整履歷">
        <article className="cake-clone-paper">
          <ResumeProfile />
          <SkillsSection />
          <TimelineSection title="工作經歷" items={workExperience} />
          <TimelineSection title="學歷" items={education} />
        </article>
      </section>
    </main>
  );
}

function ResumeProfile() {
  return (
    <section className="cake-clone-profile" aria-labelledby="cake-profile-title">
      <div className="cake-clone-photo-wrap">
        <img className="cake-clone-photo" src={profileImage} alt="張維麟個人照片" />
      </div>
      <div className="cake-clone-profile-content">
        <h2 id="cake-profile-title">張維麟</h2>
        <ul className="cake-clone-summary">
          {profileSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="cake-clone-social no-print" aria-label="個人連結">
          {profileLinks.map((link) => (
            <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
              {link.icon}
              <span>{link.label}</span>
            </a>
          ))}
        </div>
        <p className="cake-clone-role">人工智慧工程師, 深度學習工程師, 演算法工程師, 軟體工程師</p>
        <p className="cake-clone-location">
          <MapPin size={16} aria-hidden="true" />
          Hsinchu, Taiwan
        </p>
      </div>
    </section>
  );
}

function SkillsSection() {
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
  const image = <img src={item.image} alt={item.imageAlt} loading="lazy" />;

  return (
    <article className="cake-clone-entry">
      <div className="cake-clone-marker" aria-hidden="true" />
      <div className="cake-clone-copy">
        <h3>{item.title}</h3>
        <BulletList items={item.bullets} />
      </div>
      <div className="cake-clone-image">
        {item.imageHref ? (
          <a href={item.imageHref} target="_blank" rel="noreferrer" aria-label={item.imageAlt}>
            {image}
          </a>
        ) : (
          image
        )}
      </div>
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
          {item.children ? <BulletList items={item.children} /> : null}
        </li>
      ))}
    </ul>
  );
}

export default CakeResumePage;
