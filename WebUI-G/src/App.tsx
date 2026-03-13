import React, { useState, useMemo, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { apiService } from './services/api';
import { 
  PenTool, 
  Sparkles, 
  Layers, 
  Settings2, 
  Loader2,
  Plus,
  History,
  Check,
  Zap,
  ChevronRight,
  MessageCircle,
  PanelRightClose,
  PanelRightOpen,
  ArrowUpRight,
  Copy,
  Globe,
  MessageSquare,
  BookOpen,
  Hash,
  X,
  ArrowLeft,
  Settings,
  Trash2,
  Edit3,
  Download,
  Share2,
  Code,
  FileText,
  ChevronLeft,
  ExternalLink,
  Upload,
  Sword,
  Coffee,
  Briefcase,
  Smile,
  Music,
  Send,
  Newspaper,
  UserCircle,
  Palette,
  Layout,
  RefreshCw,
  CheckCircle2,
  MoreVertical,
  Cpu,
  Cloud,
  Database,
  Search
} from 'lucide-react';

// --- Types ---
type Identity = { id: string; name: string; bio: string; isDefault?: boolean };
type StylePreset = { id: string; name: string; desc: string; iconId: string };
type Platform = { 
  id: string; 
  name: string; 
  iconId: string; 
  isSelected?: boolean;
  specs: {
    titleLimit: number;
    contentLimit: number;
    tagLimit: number;
    imageRatio: string;
    imageCount: number;
  }
};

type SidebarTab = 'selection' | 'history' | 'identity' | 'style' | 'settings';
type MainView = 'editor' | 'refine-info' | 'identity-form' | 'style-form' | 'api-settings' | 'platform-settings' | 'data-settings' | 'appearance-settings' | 'about' | 'result' | 'setup';

type GenerationResult = {
  title: string;
  content: string;
  tags: string[];
  score: number;
  feedback?: string[];
  wordCount: number;
  imageUrl?: string;
  platformOverrides?: Record<string, { title: string; content: string; tags: string[] }>;
};

// --- Constants & Initial Data ---
const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  xiaohongshu: <BookOpen size={18} />,
  douyin: <Music size={18} />,
  zhihu: <MessageCircle size={18} />,
  wechat: <MessageSquare size={18} />,
  weibo: <Send size={18} />,
  toutiao: <Newspaper size={18} />,
  wordpress: <Globe size={18} />,
  twitter: <Hash size={18} />,
  instagram: <Palette size={18} />,
  facebook: <Share2 size={18} />,
};

const STYLE_ICONS: Record<string, React.ReactNode> = {
  s1: <Sword size={18} />,
  s2: <Coffee size={18} />,
  s3: <Briefcase size={18} />,
  s4: <Smile size={18} />,
  zap: <Zap size={18} />,
  sparkles: <Sparkles size={18} />,
  pen: <PenTool size={18} />,
  book: <BookOpen size={18} />,
  default: <Sparkles size={18} />,
};

const STYLE_PRESETS: StylePreset[] = [
  { id: 's1', name: '犀利', desc: '直击要害，一针见血', iconId: 's1' },
  { id: 's2', name: '温暖', desc: '治愈共鸣，温柔细腻', iconId: 's2' },
  { id: 's3', name: '专业', desc: '严谨客观，逻辑清晰', iconId: 's3' },
  { id: 's4', name: '幽默', desc: '轻松有趣，接地气', iconId: 's4' },
];

const PLATFORM_PRESETS: Platform[] = [
  { id: 'xiaohongshu', name: '小红书', iconId: 'xiaohongshu', specs: { titleLimit: 20, contentLimit: 1000, tagLimit: 10, imageRatio: '3:4', imageCount: 9 } },
  { id: 'douyin', name: '抖音', iconId: 'douyin', specs: { titleLimit: 50, contentLimit: 200, tagLimit: 5, imageRatio: '9:16', imageCount: 1 } },
  { id: 'zhihu', name: '知乎', iconId: 'zhihu', specs: { titleLimit: 100, contentLimit: 5000, tagLimit: 5, imageRatio: '16:9', imageCount: 20 } },
  { id: 'wechat', name: '微信', iconId: 'wechat', specs: { titleLimit: 64, contentLimit: 10000, tagLimit: 0, imageRatio: '2.35:1', imageCount: 1 } },
  { id: 'weibo', name: '微博', iconId: 'weibo', specs: { titleLimit: 0, contentLimit: 2000, tagLimit: 10, imageRatio: '1:1', imageCount: 9 } },
  { id: 'toutiao', name: '头条', iconId: 'toutiao', specs: { titleLimit: 30, contentLimit: 10000, tagLimit: 5, imageRatio: '16:9', imageCount: 3 } },
  { id: 'wordpress', name: 'WordPress', iconId: 'wordpress', specs: { titleLimit: 100, contentLimit: 50000, tagLimit: 20, imageRatio: '16:9', imageCount: 10 } },
  { id: 'twitter', name: 'Twitter/X', iconId: 'twitter', specs: { titleLimit: 0, contentLimit: 280, tagLimit: 3, imageRatio: '16:9', imageCount: 4 } },
  { id: 'instagram', name: 'Instagram', iconId: 'instagram', specs: { titleLimit: 0, contentLimit: 2200, tagLimit: 30, imageRatio: '1:1', imageCount: 10 } },
];



export default function App() {
  // --- Global State ---
  const [mainView, setMainView] = useState<MainView>(() => {
    return localStorage.getItem('musewrite_setup_complete') === 'true' ? 'editor' : 'setup';
  });
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('selection');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [setupStep, setSetupStep] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('musewrite_theme') === 'dark');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // --- Data State ---
  const [history, setHistory] = useState<GenerationResult[]>(() => {
    const saved = localStorage.getItem('musewrite_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [identities, setIdentities] = useState<Identity[]>(() => {
    const saved = localStorage.getItem('musewrite_identities');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: '周沫', bio: '专业品牌策划人，擅长商业洞察和犀利表达', isDefault: true }
    ];
  });
  const [selectedIdentityId, setSelectedIdentityId] = useState(() => localStorage.getItem('musewrite_selected_identity') || '1');
  const [selectedStyleId, setSelectedStyleId] = useState(() => localStorage.getItem('musewrite_selected_style') || 's1');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(() => {
    const saved = localStorage.getItem('musewrite_selected_platforms');
    return saved ? JSON.parse(saved) : ['p1', 'p2'];
  });
  const [platformConfigs, setPlatformConfigs] = useState<Platform[]>(() => {
    const saved = localStorage.getItem('musewrite_platform_configs');
    return saved ? JSON.parse(saved) : PLATFORM_PRESETS;
  });

  // --- Helper Functions ---
  const handleTabClick = (tab: SidebarTab) => {
    if (sidebarTab === tab && isSidebarOpen) {
      setIsSidebarOpen(false);
    } else {
      setSidebarTab(tab);
      setIsSidebarOpen(true);
      if (tab === 'selection' || tab === 'history') setMainView('editor');
    }
  };

  const [customStyles, setCustomStyles] = useState<StylePreset[]>(() => {
    const saved = localStorage.getItem('musewrite_custom_styles');
    return saved ? JSON.parse(saved) : [];
  });

  const [isGeneratingPlatform, setIsGeneratingPlatform] = useState<Record<string, boolean>>({});

  const handleGenerateForPlatform = async (platformId: string) => {
    if (!editableResult) return;
    setIsGeneratingPlatform(prev => ({ ...prev, [platformId]: true }));
    
    try {
      // 优先使用用户在 UI 中输入的 API Key，其次是环境变量，最后是全局 window 对象
      const apiKey = userApiKey || (process.env as any).GEMINI_API_KEY || (process.env as any).GOOGLE_API_KEY || (window as any).GEMINI_API_KEY;
      
      console.log(`Starting platform adaptation: ${platformId} using ${selectedModel}`);
      
      if (!apiKey) {
        throw new Error("API_KEY_MISSING");
      }

      // @google/genai 1.29.0 SDK
      const ai = new GoogleGenAI({ apiKey });
      const platform = platformConfigs.find(p => p.id === platformId);
      
      const prompt = `
        你是一个专业的社交媒体运营专家。请将以下内容适配到 "${platform?.name}" 平台。
        
        平台规范:
        - 标题限制: ${platform?.specs.titleLimit || '无'} 字
        - 正文限制: ${platform?.specs.contentLimit || '无'} 字
        - 标签限制: ${platform?.specs.tagLimit || '无'} 个
        
        母版内容:
        标题: ${editableResult.title}
        正文: ${editableResult.content}
        标签: ${editableResult.tags.join(', ')}
        
        请严格遵守字数限制，如果是短内容平台，请务必精简。
        请直接输出纯 JSON 对象，格式如下：
        {
          "title": "适配后的标题",
          "content": "适配后的正文",
          "tags": ["标签1", "标签2"]
        }
        不要包含 Markdown 代码块标记（如 \`\`\`json）。
      `;

      // 使用 ai.models.generateContent 语法
      const response = await ai.models.generateContent({
        model: selectedModel || 'gemini-2.0-flash',
        contents: prompt
      });

      if (!response || !response.text) {
        throw new Error("AI_RETURNED_EMPTY_RESPONSE");
      }

      const text = response.text;
      console.log("Adaptation response text:", text);

      const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || text;
      let result;
      try {
        result = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Failed to parse JSON adaptation content:", text);
        throw new Error("INVALID_JSON");
      }
      
      setEditableResult(prev => {
        if (!prev) return null;
        return {
          ...prev,
          platformOverrides: {
            ...(prev.platformOverrides || {}),
            [platformId]: result
          }
        };
      });
    } catch (error) {
      console.error("Platform generation failed:", error);
      alert("适配失败，请重试。");
    } finally {
      setIsGeneratingPlatform(prev => ({ ...prev, [platformId]: false }));
    }
  };

  // --- UI State ---
  const [material, setMaterial] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState('master');
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [editableResult, setEditableResult] = useState<GenerationResult | null>(null);
  const [autoImage, setAutoImage] = useState(true);
  const [extractedInfo, setExtractedInfo] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  // --- Edit State ---
  const [editingIdentity, setEditingIdentity] = useState<Identity | null>(null);
  const [editingStyle, setEditingStyle] = useState<StylePreset | null>(null);

  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('musewrite_user_api_key') || '');
  const [tempApiKey, setTempApiKey] = useState(() => localStorage.getItem('musewrite_user_api_key') || '');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [llmConfig, setLlmConfig] = useState<{
    providers: { name: string, model: string, configured: boolean, description?: string, type?: string }[],
    defaultProvider: string
  }>({ providers: [], defaultProvider: '' });
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [selection, setSelection] = useState({ start: 0, end: 0, text: '' });
  const [isRefining, setIsRefining] = useState(false);
  const materialRef = useRef<HTMLTextAreaElement>(null);

  const [isEditingImage, setIsEditingImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [isModifyingImage, setIsModifyingImage] = useState(false);

  // --- Persistence Effects ---
  useEffect(() => {
    localStorage.setItem('musewrite_identities', JSON.stringify(identities));
  }, [identities]);

  useEffect(() => {
    localStorage.setItem('musewrite_selected_identity', selectedIdentityId);
  }, [selectedIdentityId]);

  useEffect(() => {
    localStorage.setItem('musewrite_selected_style', selectedStyleId);
  }, [selectedStyleId]);

  useEffect(() => {
    localStorage.setItem('musewrite_selected_platforms', JSON.stringify(selectedPlatforms));
  }, [selectedPlatforms]);

  useEffect(() => {
    localStorage.setItem('musewrite_custom_styles', JSON.stringify(customStyles));
  }, [customStyles]);

  useEffect(() => {
    localStorage.setItem('musewrite_platform_configs', JSON.stringify(platformConfigs));
  }, [platformConfigs]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('musewrite_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('musewrite_theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Backend Synchronization ---
  useEffect(() => {
    const syncWithBackend = async () => {
      try {
        const isConnected = await apiService.checkConnection();
        setIsBackendConnected(isConnected);
        
        if (!isConnected) return;

        // Sync Identities (Accounts)
        const accountsRes = await apiService.getAccounts();
        if (accountsRes.success && accountsRes.accounts.length > 0) {
          const backendIdentities = accountsRes.accounts.map((a: any) => ({
            id: a.id,
            name: a.name,
            bio: '后端配置的专业人设',
            isDefault: a.id === 'stone'
          }));
          setIdentities(prev => {
            // 合并后端与本地（去重）
            const combined = [...backendIdentities];
            prev.forEach(p => {
              if (!combined.find(c => c.id === p.id)) combined.push(p);
            });
            return combined;
          });
        }

        // Sync History (Drafts)
        const draftsRes = await apiService.getDrafts();
        if (draftsRes.success && draftsRes.drafts.length > 0) {
          const backendHistory = draftsRes.drafts.map((d: any) => ({
            title: d.title,
            content: '从后端加载的内容...',
            tags: [],
            score: d.score,
            wordCount: 0,
            platform: d.platform
          }));
          setHistory(prev => {
            const combined = [...backendHistory];
            prev.forEach(p => {
              if (!combined.find(c => c.title === p.title)) combined.push(p);
            });
            return combined.slice(0, 20);
          });
        }

        // Sync Styles
        const stylesRes = await apiService.getStyles();
        if (stylesRes.success && stylesRes.styles.length > 0) {
          const backendStyles = stylesRes.styles.map((s: any) => ({
            id: s.id,
            name: s.name,
            desc: s.desc || '来自后端的专业写作风格',
            iconId: 'sparkles'
          }));
          
          setCustomStyles(prev => {
            // 过滤掉已知的非法名称（兼容旧数据清理）
            const filteredPrev = prev.filter(s => 
              !['CONFIG', 'README', 'WRITING_STANDARDS', 'clients'].includes(s.name.toUpperCase()) &&
              !['CONFIG', 'README', 'WRITING_STANDARDS'].includes(s.id)
            );

            const combined = [...filteredPrev];
            backendStyles.forEach(bs => {
              // 再次确认不是系统文件
              if (['CONFIG', 'README', 'WRITING_STANDARDS'].includes(bs.id)) return;

              // 检查是否已存在同名或同ID的风格（包括内置风格）
              const isPreset = STYLE_PRESETS.find(p => p.id === bs.id);
              if (isPreset) return; // 优先保留硬编码的预设

              const existingIndex = combined.findIndex(c => c.id === bs.id);
              
              if (existingIndex >= 0) {
                // 如果已存在，用后端数据更新（主要是为了更新名称）
                combined[existingIndex] = bs;
              } else {
                combined.push(bs);
              }
            });
            return combined;
          });
        }

        // Sync LLM Config
        const llmRes = await apiService.getLlmConfig();
        if (llmRes.success) {
          setLlmConfig(llmRes.llm);
        }
      } catch (error) {
        console.warn('Backend sync failed, staying in offline mode:', error);
      }
    };
    
    syncWithBackend();
  }, []);

  // --- Derived ---
  const allStyles = useMemo(() => [...STYLE_PRESETS, ...customStyles], [customStyles]);
  const currentIdentity = useMemo(() => identities.find(i => i.id === selectedIdentityId) || identities[0], [identities, selectedIdentityId]);
  const currentStyle = useMemo(() => allStyles.find(s => s.id === selectedStyleId) || allStyles[0], [allStyles, selectedStyleId]);

  // --- Handlers ---
  const handleStartCreating = () => {
    localStorage.setItem('musewrite_setup_complete', 'true');
    setMainView('editor');
  };

  const handleRefineSelection = async (instruction: string) => {
    if (!selection.text.trim()) return;
    setIsRefining(true);
    
    try {
      const apiKey = userApiKey || (process.env as any).GEMINI_API_KEY;
      if (!apiKey) throw new Error("API_KEY_MISSING");

      const ai = new GoogleGenAI({ apiKey });
      const model = selectedModel;
      
      const prompt = `
        你是一个专业的写作助手。请根据以下指令修改选中的文字。
        
        原文字: ${selection.text}
        指令: ${instruction}
        
        请只返回修改后的文字，不要包含任何解释。
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt
      });

      const refinedText = response.text;
      const newMaterial = material.slice(0, selection.start) + refinedText + material.slice(selection.end);
      setMaterial(newMaterial);
      setSelection({ start: 0, end: 0, text: '' });
    } catch (error: any) {
      console.error("Refinement failed:", error);
      if (error.message === 'API_KEY_MISSING') {
        alert("未配置 API Key，请在左下角设置中配置。");
        setMainView('api-settings');
      } else {
        alert("修改失败，请重试。");
      }
    } finally {
      setIsRefining(false);
    }
  };

  const handleExtractInfo = async () => {
    if (!material.trim()) return;
    setIsExtracting(true);
    setMainView('refine-info');
    
    try {
      const apiKey = userApiKey || (process.env as any).GEMINI_API_KEY;
      if (!apiKey) throw new Error("API_KEY_MISSING");

      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-2.0-flash";
      
      const prompt = `
        你是一个专业的信息提取专家。请从以下素材中提取核心信息点、关键事实和重要数据。
        
        素材: ${material}
        
        请以简洁的列表形式返回，不要包含任何修饰性语言。
      `;

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: prompt
      });

      setExtractedInfo(response.text);
    } catch (error: any) {
      console.error("Extraction failed:", error);
      if (error.message === 'API_KEY_MISSING') {
        alert("未配置 API Key，请在左下角设置中配置。");
        setMainView('api-settings');
      }
      setExtractedInfo(material); // Fallback to raw material
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      const response = await apiService.generateContent({
        source: extractedInfo,
        platform: selectedPlatforms[0], // 暂时取第一个
        info: currentIdentity.name,
        style: currentStyle.name,
        image: autoImage,
        model: selectedModel
      });

      if (!response.success) throw new Error("GENERATION_FAILED");

      const result = {
        ...response.draft,
        score: response.quality?.score || 80,
        wordCount: response.draft.content.length,
        imageUrl: response.imageUrl
      };

      setGenerationResult(result as any);
      setEditableResult(result as any);
      setActivePreviewTab('master');
      setHistory(prev => {
        const newHistory = [result, ...prev].slice(0, 20);
        localStorage.setItem('musewrite_history', JSON.stringify(newHistory));
        return newHistory;
      });
      setMainView('result');
    } catch (error: any) {
      console.error("Generation failed:", error);
      if (error.message === 'API_KEY_MISSING') {
        alert("未配置 API Key，请点击左下角设置图标，在 API 设置中输入 Key。");
        setMainView('api-settings');
      } else {
        alert(`生成失败: ${error.message || "请检查网络或配置"}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDirectGenerate = async () => {
    if (!material.trim()) return;
    setIsGenerating(true);
    setMainView('result');
    
    try {
      const response = await apiService.generateContent({
        source: material,
        platform: selectedPlatforms[0],
        info: currentIdentity.name,
        style: currentStyle.name,
        image: autoImage,
        model: selectedModel
      });

      if (!response.success) throw new Error("GENERATION_FAILED");

      const result = {
        ...response.draft,
        score: response.quality?.score || 80,
        wordCount: response.draft.content.length,
        imageUrl: response.imageUrl
      };

      setGenerationResult(result as any);
      setEditableResult(result as any);
      setActivePreviewTab('master');
      setHistory(prev => {
        const newHistory = [result, ...prev].slice(0, 20);
        localStorage.setItem('musewrite_history', JSON.stringify(newHistory));
        return newHistory;
      });
    } catch (error: any) {
      console.error("Direct generation failed:", error);
      if (error.message === 'API_KEY_MISSING') {
        alert("未配置 API Key，请在左下角设置中配置。");
        setMainView('api-settings');
      } else {
        alert("生成失败，请重试。");
      }
      setMainView('editor');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleModifyImage = async () => {
    if (!imagePrompt.trim() || !generationResult?.imageUrl) return;
    setIsModifyingImage(true);
    
    try {
      const apiKey = userApiKey || (process.env as any).GEMINI_API_KEY;
      if (!apiKey) throw new Error("API_KEY_MISSING");

      const ai = new GoogleGenAI({ apiKey });
      
      // Fetch the original image as base64
      const imgRes = await fetch(generationResult.imageUrl);
      const blob = await imgRes.blob();
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const base64 = await base64Promise;
      const base64Data = base64.split(',')[1];

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: blob.type } },
            { text: `请根据以下指令修改这张图片: ${imagePrompt}` }
          ]
        }
      });

      let newImageUrl = generationResult.imageUrl;
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          newImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      setGenerationResult(prev => prev ? { ...prev, imageUrl: newImageUrl } : null);
      setEditableResult(prev => prev ? { ...prev, imageUrl: newImageUrl } : null);
      setIsEditingImage(false);
      setImagePrompt('');
    } catch (error: any) {
      console.error("Image modification failed:", error);
      if (error.message === 'API_KEY_MISSING') {
        alert("未配置 API Key，请在左下角设置中配置。");
        setMainView('api-settings');
      } else {
        alert("图片修改失败，请重试。");
      }
    } finally {
      setIsModifyingImage(false);
    }
  };

  const handleSaveApiKey = () => {
    setUserApiKey(tempApiKey);
    localStorage.setItem('musewrite_user_api_key', tempApiKey);
    alert('API Key 已保存');
  };

  const handleTestConnection = async () => {
    if (!tempApiKey.trim()) {
      alert('请先输入 API Key');
      return;
    }
    setIsTestingKey(true);
    try {
      const ai = new GoogleGenAI({ apiKey: tempApiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: 'ping'
      });
      if (response && response.text) {
        alert('连接成功！API Key 有效。');
      } else {
        throw new Error('No response');
      }
    } catch (error: any) {
      console.error('Test connection failed:', error);
      alert(`连接失败：${error.message || '请检查网络或 API Key 是否正确'}`);
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleSaveIdentity = (idData: Partial<Identity>) => {
    if (editingIdentity) {
      setIdentities(prev => prev.map(i => i.id === editingIdentity.id ? { ...i, ...idData } : i));
    } else {
      const newId = { ...idData, id: Date.now().toString() } as Identity;
      setIdentities(prev => [...prev, newId]);
    }
    setMainView('editor');
    setEditingIdentity(null);
  };

  const handleDeleteIdentity = (id: string) => {
    if (identities.length <= 1) return;
    const newIdentities = identities.filter(i => i.id !== id);
    setIdentities(newIdentities);
    if (selectedIdentityId === id) {
      setSelectedIdentityId(newIdentities[0].id);
    }
  };

  const handleSaveStyle = (styleData: Partial<StylePreset>) => {
    if (editingStyle) {
      setCustomStyles(prev => prev.map(s => s.id === editingStyle.id ? { ...s, ...styleData } : s));
    } else {
      const newStyle = { ...styleData, id: `c${Date.now()}` } as StylePreset;
      setCustomStyles(prev => [...prev, newStyle]);
    }
    setMainView('editor');
    setEditingStyle(null);
  };

  const handleDeleteStyle = (id: string) => {
    setCustomStyles(prev => prev.filter(s => s.id !== id));
    if (selectedStyleId === id) setSelectedStyleId('s1');
  };

  const handleCopy = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => alert('已复制到剪贴板'));
    } else {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        alert('已复制到剪贴板');
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleExportData = () => {
    const data = {
      identities,
      customStyles,
      platformConfigs,
      history,
      selectedIdentityId,
      selectedStyleId,
      selectedPlatforms
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `musewrite_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.identities) setIdentities(data.identities);
        if (data.customStyles) setCustomStyles(data.customStyles);
        if (data.platformConfigs) setPlatformConfigs(data.platformConfigs);
        if (data.history) setHistory(data.history);
        if (data.selectedIdentityId) setSelectedIdentityId(data.selectedIdentityId);
        if (data.selectedStyleId) setSelectedStyleId(data.selectedStyleId);
        if (data.selectedPlatforms) setSelectedPlatforms(data.selectedPlatforms);
        alert('数据导入成功！');
        window.location.reload();
      } catch (err) {
        alert('导入失败：无效的备份文件');
      }
    };
    reader.readAsText(file);
  };

  const handleImportMarkdown = (e: React.ChangeEvent<HTMLInputElement>, callback: (content: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      callback(content);
    };
    reader.readAsText(file);
  };

  // --- Renderers ---

  // 1. Setup Flow
  const renderSetup = () => (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <div className="max-w-[560px] w-full space-y-12">
        <header className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-black dark:text-white mb-4">
            <PenTool size={24} strokeWidth={2.5} />
            <h1 className="text-2xl font-bold tracking-tight">MuseWrite</h1>
          </div>
          <p className="text-[#666] dark:text-[#8E8E93] text-sm">让创作变得简单而有趣</p>
        </header>

        {/* Progress Bar */}
        <div className="space-y-4">
          <div className="h-1 w-full bg-[#F0F0F0] dark:bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-black dark:bg-white/80" 
              initial={{ width: '0%' }}
              animate={{ width: `${(setupStep / 4) * 100}%` }}
            />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1] dark:text-[#636366] text-center">Step {setupStep}/4</div>
        </div>

        <AnimatePresence mode="wait">
          {setupStep === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <h2 className="text-xl font-bold text-center">创建你的第一个人设</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1]">名称</label>
                  <input type="text" defaultValue="周沫" className="w-full px-4 py-3 rounded-xl border border-[#EDEDED] outline-none focus:border-black transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1]">描述一下这个人是谁</label>
                  <textarea rows={4} defaultValue="专业品牌策划人，10年营销经验，擅长商业洞察和犀利表达..." className="w-full px-4 py-3 rounded-xl border border-[#EDEDED] outline-none focus:border-black transition-colors resize-none" />
                </div>
              </div>
              <button onClick={() => setSetupStep(2)} className="w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-[#333] transition-all">下一步 →</button>
            </motion.div>
          )}

          {setupStep === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <h2 className="text-xl font-bold text-center">选择你的写作风格</h2>
              <div className="grid grid-cols-2 gap-4">
                {STYLE_PRESETS.map(s => (
          <button 
            key={s.id} 
            onClick={() => setSelectedStyleId(s.id)}
            className={`p-6 rounded-2xl border text-left transition-all ${selectedStyleId === s.id ? 'border-accent-blue bg-accent-blue/10 dark:bg-accent-blue/20 shadow-lg scale-[1.02]' : 'border-border-subtle bg-surface-low hover:border-accent-blue/30 dark:text-white'}`}
          >
            <div className={`mb-2 ${selectedStyleId === s.id ? 'text-accent-blue' : 'text-[#666] dark:text-[#A1A1A6]'}`}>{STYLE_ICONS[s.iconId] || STYLE_ICONS.default}</div>
            <div className={`font-bold mb-1 ${selectedStyleId === s.id ? 'text-accent-blue' : ''}`}>{s.name}</div>
            <div className={`text-[11px] ${selectedStyleId === s.id ? 'text-accent-blue/80' : 'text-[#666] dark:text-[#8E8E93]'}`}>{s.desc}</div>
          </button>
                ))}
              </div>
              <button onClick={() => setSetupStep(3)} className="w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-[#333] transition-all">下一步 →</button>
            </motion.div>
          )}

          {setupStep === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <h2 className="text-xl font-bold text-center">选择你要发布的平台</h2>
              <div className="grid grid-cols-3 gap-4">
                {PLATFORM_PRESETS.map(p => {
                  const isSelected = selectedPlatforms.includes(p.id);
                  return (
                    <button 
                      key={p.id} 
                      onClick={() => setSelectedPlatforms(prev => isSelected ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                      className={`p-6 rounded-2xl border flex flex-col items-center gap-3 transition-all ${isSelected ? 'border-accent-blue bg-accent-blue/10 dark:bg-accent-blue/20 shadow-lg scale-[1.02]' : 'border-border-subtle bg-surface-low hover:border-accent-blue/30 dark:text-white'}`}
                    >
                      <div className={isSelected ? 'text-accent-blue' : 'text-[#666] dark:text-[#A1A1A6]'}>{PLATFORM_ICONS[p.iconId]}</div>
                      <div className={`text-xs font-bold ${isSelected ? 'text-accent-blue' : ''}`}>{p.name}</div>
                      {isSelected ? <Check size={14} className="text-accent-blue" /> : <div className="w-3.5 h-3.5 border border-border-subtle rounded group-hover:border-accent-blue/30" />}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setSetupStep(4)} className="w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-[#333] transition-all">下一步 →</button>
            </motion.div>
          )}

          {setupStep === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12 text-center py-12">
              <div className="space-y-6">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto shadow-2xl">
                    <CheckCircle2 size={48} className="text-white dark:text-black" />
                  </div>
                  <motion.div 
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-white dark:border-black"
                  >
                    <Sparkles size={16} className="text-white" />
                  </motion.div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight dark:text-white">一切准备就绪</h2>
                  <p className="text-[#666] dark:text-[#A1A1A1]">你的创作引擎已调至最佳状态</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto">
                <div className="p-4 bg-surface-low border border-border-subtle rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white dark:bg-black rounded-xl flex items-center justify-center border border-border-subtle">
                      <UserCircle size={20} className="text-[#A1A1A1]" />
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1]">当前人设</div>
                      <div className="text-sm font-bold dark:text-white">{currentIdentity.name}</div>
                    </div>
                  </div>
                  <Check size={16} className="text-emerald-500" />
                </div>
                
                <div className="p-4 bg-surface-low border border-border-subtle rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white dark:bg-black rounded-xl flex items-center justify-center border border-border-subtle">
                      <Palette size={20} className="text-[#A1A1A1]" />
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1]">写作风格</div>
                      <div className="text-sm font-bold dark:text-white">{currentStyle.name}</div>
                    </div>
                  </div>
                  <Check size={16} className="text-emerald-500" />
                </div>
              </div>

              <button 
                onClick={handleStartCreating} 
                className="group relative w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-black/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative flex items-center justify-center gap-2">
                  开启创作之旅 <ArrowUpRight size={18} />
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  // 2. Main Integrated Layout
  const renderMainLayout = () => (
    <div className="flex h-screen bg-[var(--background)] overflow-hidden transition-colors duration-300">
      {/* Rail Navigation (Far Left) */}
      <aside className="w-[56px] bg-[var(--surface-low)] border-r border-border-subtle flex flex-col items-center py-5 gap-5 shrink-0 z-20">
        <div 
          onClick={() => handleTabClick('selection')}
          className="w-8 h-8 rounded-lg bg-brand text-white dark:text-black flex items-center justify-center shadow-md cursor-pointer hover:scale-105 transition-transform"
        >
          <PenTool size={16} strokeWidth={2.5} />
        </div>
        <nav className="flex flex-col gap-1">
          <button 
            onClick={() => handleTabClick('selection')}
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${sidebarTab === 'selection' && isSidebarOpen ? 'bg-white dark:bg-surface-high text-black dark:text-white shadow-sm border border-black/5 dark:border-white/10' : 'text-[#A1A1A1] hover:text-black dark:hover:text-white hover:bg-[#F0F0F0] dark:hover:bg-white/5'}`}
            title="创作设置"
          >
            <Layout size={18} />
          </button>
          <button 
            onClick={() => handleTabClick('history')}
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${sidebarTab === 'history' && isSidebarOpen ? 'bg-white dark:bg-surface-high text-black dark:text-white shadow-sm border border-black/5 dark:border-white/10' : 'text-[#A1A1A1] hover:text-black dark:hover:text-white hover:bg-[#F0F0F0] dark:hover:bg-white/5'}`}
            title="历史记录"
          >
            <History size={18} />
          </button>
          <button 
            onClick={() => handleTabClick('identity')}
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${sidebarTab === 'identity' && isSidebarOpen ? 'bg-white dark:bg-surface-high text-black dark:text-white shadow-sm border border-black/5 dark:border-white/10' : 'text-[#A1A1A1] hover:text-black dark:hover:text-white hover:bg-[#F0F0F0] dark:hover:bg-white/5'}`}
            title="人设管理"
          >
            <UserCircle size={18} />
          </button>
          <button 
            onClick={() => handleTabClick('style')}
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${sidebarTab === 'style' && isSidebarOpen ? 'bg-white dark:bg-surface-high text-black dark:text-white shadow-sm border border-black/5 dark:border-white/10' : 'text-[#A1A1A1] hover:text-black dark:hover:text-white hover:bg-[#F0F0F0] dark:hover:bg-white/5'}`}
            title="风格管理"
          >
            <Palette size={18} />
          </button>

        </nav>
        <div className="mt-auto flex flex-col gap-3">
          <button 
            onClick={() => handleTabClick('settings')}
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${sidebarTab === 'settings' && isSidebarOpen ? 'bg-white dark:bg-surface-high text-black dark:text-white shadow-sm border border-black/5 dark:border-white/10' : 'text-[#A1A1A1] hover:text-black dark:hover:text-white hover:bg-[#F0F0F0] dark:hover:bg-white/5'}`}
            title="设置"
          >
            <Settings size={18} />
          </button>
          <div 
            onClick={() => handleTabClick('settings')}
            className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden border border-black/5 cursor-pointer hover:ring-2 hover:ring-black/10 transition-all"
          >
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
          </div>
        </div>
      </aside>

      {/* Dynamic Sidebar (Expandable) */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex flex-col bg-[var(--surface-mid)] border-r border-border-subtle overflow-hidden relative"
          >
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-10 min-w-[240px]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1]">
                  {sidebarTab === 'selection' && '快速选择'}
                  {sidebarTab === 'history' && '历史记录'}
                  {sidebarTab === 'identity' && '人设管理'}
                  {sidebarTab === 'style' && '风格管理'}
                  {sidebarTab === 'settings' && '系统设置'}
                </h3>
              </div>

              {sidebarTab === 'selection' && (
                <>
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1]">当前人设</h3>
                    </div>
                    <div className="space-y-2">
                      {identities.map(id => (
                        <div 
                          key={id.id}
                          className={`group relative w-full p-3 border rounded-xl flex items-center justify-between transition-all ${selectedIdentityId === id.id ? 'border-black bg-white dark:bg-white/10 dark:border-white shadow-sm' : 'border-transparent hover:bg-[#F0F0F0] dark:hover:bg-white/5 text-[#666] dark:text-[#A1A1A1]'}`}
                        >
                          <span className="text-sm font-bold cursor-pointer flex-1" onClick={() => setSelectedIdentityId(id.id)}>{id.name}</span>
                          <div className="flex items-center gap-2">
                            {selectedIdentityId === id.id && <Check size={14} />}
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteIdentity(id.id); }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-500 transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1]">当前风格</h3>
                    <div className="space-y-2">
                      {allStyles.map(s => (
                        <div 
                          key={s.id}
                          className={`group relative w-full p-3 border rounded-xl flex items-center justify-between transition-all ${selectedStyleId === s.id ? 'border-black bg-white dark:bg-white/10 dark:border-white shadow-sm' : 'border-transparent hover:bg-[#F0F0F0] dark:hover:bg-white/5 text-[#666] dark:text-[#A1A1A1]'}`}
                        >
                          <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => setSelectedStyleId(s.id)}>
                            <span className={`text-sm ${selectedStyleId === s.id ? 'text-black dark:text-white' : 'text-[#A1A1A1]'}`}>{STYLE_ICONS[s.iconId] || STYLE_ICONS.default}</span>
                            <span className="text-sm font-bold dark:text-white">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedStyleId === s.id && <Check size={14} />}
                            {s.id.startsWith('c') && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteStyle(s.id); }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-500 transition-all"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="space-y-4 pt-4 border-t border-[#EDEDED]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1]">自动配图</span>
                      <button 
                        onClick={() => setAutoImage(!autoImage)}
                        className={`w-8 h-4 rounded-full relative transition-colors ${autoImage ? 'bg-black' : 'bg-[#EDEDED]'}`}
                      >
                        <motion.div 
                          animate={{ x: autoImage ? 16 : 2 }}
                          initial={false}
                          className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm" 
                        />
                      </button>
                    </div>
                  </section>
                </>
              )}

              {sidebarTab === 'history' && (
                <section className="space-y-4">
                  <div className="space-y-2">
                    {history.length === 0 ? (
                      <div className="py-20 flex flex-col items-center justify-center text-[#A1A1A1] gap-4">
                        <History size={32} strokeWidth={1.5} />
                        <p className="text-[10px] uppercase tracking-widest font-bold">暂无记录</p>
                      </div>
                    ) : (
                      history.map((item, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => { 
                            setGenerationResult(item); 
                            setEditableResult(item);
                            setActivePreviewTab('master');
                            setMainView('result'); 
                          }}
                          className="p-3 border border-transparent hover:border-black/10 dark:hover:border-white/10 hover:bg-white dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer group relative"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold truncate dark:text-white">{item.title}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[#A1A1A1]">{item.wordCount}字</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('确定要删除这条记录吗？')) {
                                    setHistory(prev => {
                                      const newHistory = prev.filter((_, i) => i !== idx);
                                      localStorage.setItem('musewrite_history', JSON.stringify(newHistory));
                                      return newHistory;
                                    });
                                  }
                                }}
                                className="p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded text-[#A1A1A1] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          <p className="text-[10px] text-[#666] dark:text-[#A1A1A1] line-clamp-2 leading-relaxed">{item.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}

              {sidebarTab === 'identity' && (
                <section className="space-y-6">
                  <div className="flex items-center justify-end">
                    <button 
                      onClick={() => { setEditingIdentity(null); setMainView('identity-form'); }}
                      className="p-1 hover:bg-[#F0F0F0] dark:hover:bg-white/10 rounded-md text-black dark:text-white transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {identities.map(id => (
                      <div 
                        key={id.id}
                        onClick={() => setSelectedIdentityId(id.id)}
                        className={`group w-full p-3 border rounded-xl flex flex-col gap-2 transition-all cursor-pointer ${selectedIdentityId === id.id ? 'border-black bg-white dark:bg-white/10 dark:border-white shadow-sm' : 'border-transparent hover:bg-[#F0F0F0] dark:hover:bg-white/5 text-[#666] dark:text-[#A1A1A1]'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold dark:text-white">{id.name}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); setEditingIdentity(id); setMainView('identity-form'); }} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded text-[#666] dark:text-[#A1A1A1] hover:text-black dark:hover:text-white"><Edit3 size={14} /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteIdentity(id.id); }} className="p-1 hover:bg-red-50 rounded text-[#666] dark:text-[#A1A1A1] hover:text-red-500"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        <p className="text-[10px] line-clamp-2 text-[#A1A1A1]">{id.bio}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {sidebarTab === 'style' && (
                <section className="space-y-6">
                  <div className="flex items-center justify-end">
                    <button 
                      onClick={() => { setEditingStyle(null); setMainView('style-form'); }}
                      className="p-1 hover:bg-[#F0F0F0] dark:hover:bg-white/10 rounded-md text-black dark:text-white transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {allStyles.map(s => (
                      <div 
                        key={s.id}
                        onClick={() => setSelectedStyleId(s.id)}
                        className={`group w-full p-3 border rounded-xl flex flex-col gap-2 transition-all cursor-pointer ${selectedStyleId === s.id ? 'border-black bg-white shadow-sm' : 'border-transparent hover:bg-[#F0F0F0] text-[#666]'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${selectedStyleId === s.id ? 'text-black' : 'text-[#A1A1A1]'}`}>{STYLE_ICONS[s.iconId] || STYLE_ICONS.default}</span>
                            <span className="text-sm font-bold">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); setEditingStyle(s); setMainView('style-form'); }} className="p-1 hover:bg-black/5 rounded text-[#666] hover:text-black"><Edit3 size={14} /></button>
                            {s.id.startsWith('c') && <button onClick={(e) => { e.stopPropagation(); handleDeleteStyle(s.id); }} className="p-1 hover:bg-red-50 rounded text-[#666] hover:text-red-500"><Trash2 size={14} /></button>}
                          </div>
                        </div>
                        <p className="text-[10px] line-clamp-2 text-[#A1A1A1]">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}


              {sidebarTab === 'settings' && (
                <section className="space-y-6">
                  <nav className="space-y-1">
                    <SettingsNavItem label="API 设置" active={mainView === 'api-settings'} onClick={() => setMainView('api-settings')} icon={<Zap size={16} />} />
                    <SettingsNavItem label="平台管理" active={mainView === 'platform-settings'} onClick={() => setMainView('platform-settings')} icon={<Globe size={16} />} />
                    <SettingsNavItem label="数据存储" active={mainView === 'data-settings'} onClick={() => setMainView('data-settings')} icon={<Download size={16} />} />
                    <div className="h-px bg-border-subtle my-4" />
                    <SettingsNavItem label="外观" active={mainView === 'appearance-settings'} onClick={() => setMainView('appearance-settings')} icon={<Layout size={16} />} />
                    <SettingsNavItem label="关于" active={mainView === 'about'} onClick={() => setMainView('about')} icon={<MessageSquare size={16} />} />
                  </nav>
                </section>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[var(--background)] relative transition-colors duration-300">
        {/* Sidebar Toggle Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-4 h-12 bg-white dark:bg-black border border-l-0 border-border-subtle rounded-r-md flex items-center justify-center text-[#A1A1A1] hover:text-black dark:hover:text-white hover:bg-[#F7F7F7] dark:hover:bg-white/5 transition-all"
        >
          {isSidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
        </button>

        <header className="h-14 border-b border-border-subtle px-6 flex items-center justify-between shrink-0 bg-[var(--background)]/80 backdrop-blur-md sticky top-0 z-20 transition-colors duration-300">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1] dark:text-[#666]">MuseWrite</span>
            <ChevronRight size={10} className="text-[#D1D1D1]" />
            <span className="text-[10px] font-medium text-[#666] dark:text-[#A1A1A1]">
              {mainView === 'editor' && '新创作'}
              {mainView === 'identity-form' && (editingIdentity ? '编辑人设' : '新建人设')}
              {mainView === 'style-form' && (editingStyle ? '编辑风格' : '新建风格')}
              {mainView === 'api-settings' && 'API 设置'}
              {mainView === 'result' && '生成结果'}
            </span>
          </div>
          <div className="flex items-center gap-4 relative">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold border ${isBackendConnected ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isBackendConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              {isBackendConnected ? '已连通 MuseServer' : 'Server 未连接'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {mainView === 'editor' && (
              <motion.div 
                key="editor" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="h-full overflow-y-auto custom-scrollbar flex flex-col items-center"
              >
                <div className="max-w-[640px] w-full px-6 py-20 space-y-16">
                  <div className="space-y-10">
                    <div className="relative group/textarea">
                        <textarea 
                          ref={materialRef}
                          value={material}
                          onChange={(e) => setMaterial(e.target.value)}
                          onMouseUp={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            const text = target.value.substring(target.selectionStart, target.selectionEnd);
                            if (text.trim()) {
                              setSelection({ start: target.selectionStart, end: target.selectionEnd, text });
                            } else {
                              setSelection({ start: 0, end: 0, text: '' });
                            }
                          }}
                          onKeyUp={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            const text = target.value.substring(target.selectionStart, target.selectionEnd);
                            if (text.trim()) {
                              setSelection({ start: target.selectionStart, end: target.selectionEnd, text });
                            }
                          }}
                          placeholder="有什么想写的？"
                          className="w-full h-64 resize-none outline-none text-2xl font-medium placeholder:text-[#E0E0E0] dark:placeholder:text-white/10 leading-relaxed bg-transparent dark:text-white"
                        />
                      
                      <AnimatePresence>
                        {selection.text && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-full left-0 mb-4 p-2 bg-surface-high border border-border-subtle rounded-2xl shadow-2xl flex items-center gap-2 z-40 transition-colors"
                          >
                            <button 
                              onClick={() => handleRefineSelection('润色一下，让表达更生动')}
                              className="px-3 py-1.5 text-xs font-bold hover:bg-brand/5 dark:hover:bg-brand/10 rounded-lg transition-colors flex items-center gap-2 dark:text-white"
                            >
                              <Sparkles size={14} className="text-amber-500" /> 润色
                            </button>
                            <button 
                              onClick={() => handleRefineSelection('扩写这段内容，增加细节')}
                              className="px-3 py-1.5 text-xs font-bold hover:bg-brand/5 dark:hover:bg-brand/10 rounded-lg transition-colors flex items-center gap-2 dark:text-white"
                            >
                              <Plus size={14} className="text-blue-500" /> 扩写
                            </button>
                            <button 
                              onClick={() => handleRefineSelection('简练一些，去除冗余')}
                              className="px-3 py-1.5 text-xs font-bold hover:bg-brand/5 dark:hover:bg-brand/10 rounded-lg transition-colors flex items-center gap-2 dark:text-white"
                            >
                              <Zap size={14} className="text-green-500" /> 简练
                            </button>
                            <div className="w-px h-4 bg-border-subtle mx-1" />
                            <button 
                              onClick={() => setSelection({ start: 0, end: 0, text: '' })}
                              className="p-1.5 hover:bg-[#F7F7F7] dark:hover:bg-white/5 rounded-lg text-[#A1A1A1]"
                            >
                              <X size={14} />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                        {material && (
                          <div className="absolute right-0 top-0 flex flex-col gap-2">
                            <button 
                              onClick={() => {
                                if (confirm('确定要清空当前素材吗？')) setMaterial('');
                              }}
                              className="p-2 text-[#A1A1A1] hover:text-red-500 transition-colors bg-surface-low/50 backdrop-blur-sm rounded-full"
                              title="清空素材"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        )}
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-center gap-4">
                      <StatusPill label={currentIdentity.name} onClick={() => setSidebarTab('identity')} />
                      <div className="relative group/style">
                        <StatusPill label={currentStyle.name} onClick={() => setSidebarTab('style')} />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-4 bg-white dark:bg-[#1A1A1A] border border-border-subtle rounded-2xl shadow-2xl opacity-0 invisible group-hover/style:opacity-100 group-hover/style:visible transition-all z-50">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1] mb-2">当前风格</div>
                          <div className="prose prose-xs dark:prose-invert">
                            <Markdown>{currentStyle.desc}</Markdown>
                          </div>
                        </div>
                      </div>
                      <StatusPill label={autoImage ? "配图 ✓" : "配图 ✗"} onClick={() => setAutoImage(!autoImage)} />
                      
                      <div className="relative group/model">
                        <button className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white rounded-full text-[12px] font-bold flex items-center gap-2 hover:opacity-80 transition-all">
                          <Zap size={14} className="text-amber-500" />
                          {selectedModel === 'gemini-2.0-flash' ? 'Gemini 2.0 Flash' : 'Gemini 1.5 Pro'}
                        </button>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-white dark:bg-[#1A1A1A] border border-border-subtle rounded-2xl shadow-xl opacity-0 invisible group-hover/model:opacity-100 group-hover/model:visible transition-all z-50 p-2">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1] px-3 py-2">选择模型</div>
                          <button 
                            onClick={() => setSelectedModel('gemini-2.0-flash')}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${selectedModel === 'gemini-2.0-flash' ? 'bg-black text-white' : 'hover:bg-[#F7F7F7] dark:hover:bg-white/5 dark:text-white'}`}
                          >
                            <span>Gemini 2.0 Flash</span>
                            {selectedModel === 'gemini-2.0-flash' && <Check size={12} />}
                          </button>
                          <button 
                            onClick={() => setSelectedModel('gemini-1.5-pro')}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${selectedModel === 'gemini-1.5-pro' ? 'bg-black text-white' : 'hover:bg-[#F7F7F7] dark:hover:bg-white/5 dark:text-white'}`}
                          >
                            <span>Gemini 1.5 Pro</span>
                            {selectedModel === 'gemini-1.5-pro' && <Check size={12} />}
                          </button>
                          <div className="h-px bg-border-subtle my-1" />
                          <div className="px-3 py-2 text-[10px] text-[#A1A1A1]">更多模型即将支持 (Ollama/Claude)</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-4 pt-12">
                      <button 
                        onClick={handleDirectGenerate}
                        disabled={!material.trim() || isGenerating}
                        className="group relative px-16 py-5 bg-black dark:bg-white text-white dark:text-black rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_40px_-15px_rgba(255,255,255,0.1)] transition-all hover:scale-[1.05] active:scale-[0.98] disabled:opacity-50 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <span className="relative flex items-center gap-3 text-lg font-bold tracking-tight">
                          {isGenerating ? <Loader2 size={22} className="animate-spin" /> : <ArrowUpRight size={22} />}
                          {isGenerating ? '生成中...' : '立即生成'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {mainView === 'refine-info' && (
              <motion.div 
                key="refine-info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-y-auto custom-scrollbar p-12"
              >
                <div className="max-w-[640px] mx-auto space-y-12">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setMainView('editor')} className="p-2 hover:bg-[#F7F7F7] dark:hover:bg-white/5 rounded-full dark:text-white"><ChevronLeft size={20} /></button>
                    <h2 className="text-2xl font-bold tracking-tight dark:text-white">信息卡 (Information Card)</h2>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="p-8 border border-border-subtle rounded-[32px] bg-surface-mid shadow-lg space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1] dark:text-white">核心信息提取</label>
                        {isExtracting ? (
                          <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <Loader2 size={32} className="animate-spin text-black dark:text-white" />
                            <p className="text-sm text-[#666] dark:text-[#A1A1A1]">正在为您提取核心信息点...</p>
                          </div>
                        ) : (
                          <textarea 
                            value={extractedInfo}
                            onChange={(e) => setExtractedInfo(e.target.value)}
                            rows={12}
                            className="w-full resize-none outline-none text-lg leading-relaxed bg-transparent dark:text-white border-b border-transparent focus:border-black/10 dark:focus:border-white/10"
                            placeholder="核心信息点..."
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <button 
                        onClick={handleGenerate}
                        disabled={!extractedInfo.trim() || isGenerating}
                        className="relative group px-12 py-4 bg-brand text-white dark:text-black shadow-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <span className="relative flex items-center gap-3">
                          {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                          {isGenerating ? '生成中...' : '开始灵感成文'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {mainView === 'identity-form' && (
              <motion.div 
                key="id-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-y-auto custom-scrollbar p-12"
              >
                <div className="max-w-[640px] mx-auto space-y-12">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setMainView('editor')} className="p-2 hover:bg-[#F7F7F7] rounded-full dark:text-white"><ChevronLeft size={20} /></button>
                    <h2 className="text-2xl font-bold tracking-tight dark:text-white">{editingIdentity ? '编辑人设' : '新建人设'}</h2>
                  </div>
                  <IdentityForm 
                    initialData={editingIdentity || { name: '', bio: '' }} 
                    onSave={handleSaveIdentity}
                    onImport={(e, cb) => handleImportMarkdown(e, cb)}
                  />
                </div>
              </motion.div>
            )}

            {mainView === 'style-form' && (
              <motion.div 
                key="style-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-y-auto custom-scrollbar p-12"
              >
                <div className="max-w-[640px] mx-auto space-y-12">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setMainView('editor')} className="p-2 hover:bg-[#F7F7F7] rounded-full dark:text-white"><ChevronLeft size={20} /></button>
                    <h2 className="text-2xl font-bold tracking-tight dark:text-white">{editingStyle ? '编辑风格' : '新建风格'}</h2>
                  </div>
                  <StyleForm 
                    initialData={editingStyle || { name: '', desc: '', iconId: 'default' }} 
                    onSave={handleSaveStyle}
                  />
                </div>
              </motion.div>
            )}

            {mainView === 'api-settings' && (
              <motion.div 
                key="api-settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-y-auto custom-scrollbar p-12"
              >
                <div className="max-w-[640px] mx-auto space-y-12">
                  {/* Removed main title header as it's repetitive with breadcrumbs */}

                  <div className="p-8 bg-surface-low rounded-3xl space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold dark:text-white">API Key</h3>
                      </div>
                      <p className="text-xs text-[#666] dark:text-[#A1A1A1]">请输入您的模型 API Key。如果是本地 Ollama，则无需配置。</p>
                      <div className="flex items-center gap-2 mt-4">
                        <input 
                          type="password"
                          value={tempApiKey}
                          onChange={(e) => setTempApiKey(e.target.value)}
                          placeholder="在此粘贴您的 API Provider Key"
                          className="flex-1 px-4 py-2.5 bg-white dark:bg-black/20 border border-border-subtle rounded-xl font-mono text-xs outline-none focus:border-brand dark:text-white"
                        />
                        {tempApiKey && (
                          <button 
                            onClick={() => { setTempApiKey(''); }}
                            className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
                            title="清除"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={handleSaveApiKey}
                          className="flex-1 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold hover:opacity-90 transition-all"
                        >
                          保存配置
                        </button>
                        <button 
                          onClick={handleTestConnection}
                          disabled={isTestingKey}
                          className="flex-1 py-2.5 bg-white dark:bg-black/20 border border-border-subtle rounded-xl text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                        >
                          {isTestingKey ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} className="text-amber-500" />}
                          连通性测试
                        </button>
                      </div>
                    </div>
                    <div className="h-px bg-border-subtle" />
                    <div className="space-y-4">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1] dark:text-white">当前后端 API 服务</label>
                        <div className="flex items-center gap-3 p-4 bg-white dark:bg-black/20 border border-border-subtle rounded-2xl">
                          <div className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                          <div className="flex-1">
                            <div className="text-sm font-bold dark:text-white">Local MuseWrite Server</div>
                            <div className="text-[10px] text-[#666] dark:text-[#A1A1A1]">已连接到本地 MuseWrite Server，提供更强大的 AI 能力</div>
                          </div>
                        </div>
                      </div>
                    <div className="h-px bg-border-subtle" />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1] dark:text-white">模型选择</label>
                        {isBackendConnected && (
                          <div className="text-[10px] text-green-500 flex items-center gap-1 font-bold">
                            <CheckCircle2 size={10} />
                            已同步
                          </div>
                        )}
                      </div>
                      
                      {/* Dropdown Container */}
                      <div className="relative">
                        <button 
                          onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                          className={`w-full p-5 bg-white dark:bg-black/20 border rounded-3xl flex items-center justify-between transition-all group ${isModelDropdownOpen ? 'border-brand ring-4 ring-brand/5 shadow-lg' : 'border-border-subtle hover:border-brand/40'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-brand/5 text-brand rounded-2xl group-hover:scale-110 transition-transform">
                              {selectedModel.includes('gemini') ? <Sparkles size={20} /> : 
                               selectedModel.includes('gpt') ? <Zap size={20} /> : 
                               <Cloud size={20} />}
                            </div>
                            <div className="text-left">
                              <div className="text-sm font-bold dark:text-white capitalize">{selectedModel}</div>
                              <div className="text-[10px] text-[#666] dark:text-[#A1A1A1]">正在使用</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[#A1A1A1]">
                            <ChevronRight size={16} className={`transition-transform duration-300 ${isModelDropdownOpen ? 'rotate-90' : ''}`} />
                          </div>
                        </button>

                        {/* Searchable Inline Dropdown */}
                        <AnimatePresence>
                          {isModelDropdownOpen && (
                            <>
                              {/* Overlay to close on click outside */}
                              <div 
                                className="fixed inset-0 z-[60]" 
                                onClick={() => setIsModelDropdownOpen(false)} 
                              />
                              
                              <motion.div 
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full left-0 right-0 mt-3 p-3 bg-white dark:bg-[#1A1A1A] border border-border-subtle rounded-[32px] shadow-2xl z-[70] overflow-hidden flex flex-col max-h-[420px]"
                              >


                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 px-1 pb-2">
                                  {(() => {
                                    const filtered = llmConfig.providers.filter(p => 
                                      p.name.toLowerCase().includes(modelSearch.toLowerCase()) || 
                                      p.model.toLowerCase().includes(modelSearch.toLowerCase())
                                    );
                                    
                                    const grouped = filtered.reduce((acc, p) => {
                                      if (!acc[p.name]) acc[p.name] = [];
                                      acc[p.name].push(p);
                                      return acc;
                                    }, {} as Record<string, any[]>);

                                    return Object.entries(grouped).length > 0 ? (
                                      Object.entries(grouped).map(([pName, models]) => (
                                        <div key={pName} className="space-y-1">
                                          <div className="px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#A1A1A1]/60">
                                            {pName}
                                          </div>
                                          {(models as any[]).map(p => (
                                            <button 
                                              key={p.model}
                                              onClick={() => {
                                                setSelectedModel(p.model);
                                                setIsModelDropdownOpen(false);
                                                setModelSearch('');
                                              }}
                                              className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all group ${selectedModel === p.model ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg shadow-black/5' : 'hover:bg-[#F7F7F7] dark:hover:bg-white/5'}`}
                                            >
                                              <div className="flex items-center gap-3 min-w-0">
                                                <div className={`p-1.5 rounded-lg ${selectedModel === p.model ? 'bg-white/20' : 'bg-surface-low dark:bg-white/5 text-[#A1A1A1]'}`}>
                                                  {p.name === 'ollama' ? <Cpu size={12} /> : <Cloud size={12} />}
                                                </div>
                                                <div className="text-left min-w-0">
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-[12px] font-bold truncate">{p.model}</span>
                                                    {p.configured && <Check size={10} className={selectedModel === p.model ? 'text-white/60' : 'text-green-500'} />}
                                                  </div>
                                                </div>
                                              </div>
                                              {selectedModel === p.model && <CheckCircle2 size={14} />}
                                            </button>
                                          ))}
                                        </div>
                                      ))
                                    ) : (
                                      <div className="py-12 text-center text-[#A1A1A1] text-[10px] font-bold">未找到匹配结果</div>
                                    );
                                  })()}
                                </div>

                                {/* Search at the bottom for advanced filtering only */}
                                <div className="p-3 border-t border-border-subtle bg-surface-low dark:bg-black/20">
                                  <div className="relative">
                                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1A1]" />
                                    <input 
                                      type="text"
                                      placeholder="搜索更多模型接口..."
                                      value={modelSearch}
                                      onChange={(e) => setModelSearch(e.target.value)}
                                      className="w-full pl-8 pr-4 py-2 bg-white dark:bg-white/5 border border-border-subtle rounded-xl text-[10px] outline-none dark:text-white transition-all"
                                    />
                                  </div>
                                </div>
                              </motion.div>

                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {mainView === 'platform-settings' && (
              <motion.div 
                key="platform-settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-y-auto custom-scrollbar p-12"
              >
                <div className="max-w-[800px] mx-auto space-y-12">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setMainView('editor')} className="p-2 hover:bg-[#F7F7F7] dark:hover:bg-white/5 rounded-full dark:text-white"><ChevronLeft size={20} /></button>
                    <h2 className="text-2xl font-bold tracking-tight dark:text-white">平台管理</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {platformConfigs.map(p => (
                      <div key={p.id} className="p-6 border border-border-subtle rounded-3xl space-y-6 bg-[#FBFBFB] dark:bg-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-black/20 border border-border-subtle flex items-center justify-center text-black dark:text-white shadow-sm">
                            {PLATFORM_ICONS[p.iconId]}
                          </div>
                          <h3 className="font-bold dark:text-white">{p.name} 规范</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1] dark:text-white">标题字数</label>
                            <input 
                              type="number" 
                              value={p.specs.titleLimit} 
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setPlatformConfigs(prev => prev.map(x => x.id === p.id ? { ...x, specs: { ...x.specs, titleLimit: val } } : x));
                              }}
                              className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-border-subtle rounded-lg text-sm outline-none focus:border-black dark:focus:border-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1] dark:text-white">正文字数</label>
                            <input 
                              type="number" 
                              value={p.specs.contentLimit} 
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setPlatformConfigs(prev => prev.map(x => x.id === p.id ? { ...x, specs: { ...x.specs, contentLimit: val } } : x));
                              }}
                              className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-border-subtle rounded-lg text-sm outline-none focus:border-black dark:focus:border-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1] dark:text-white">话题个数</label>
                            <input 
                              type="number" 
                              value={p.specs.tagLimit} 
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setPlatformConfigs(prev => prev.map(x => x.id === p.id ? { ...x, specs: { ...x.specs, tagLimit: val } } : x));
                              }}
                              className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-border-subtle rounded-lg text-sm outline-none focus:border-black dark:focus:border-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1] dark:text-white">配图比例</label>
                            <select 
                              value={p.specs.imageRatio} 
                              onChange={(e) => {
                                setPlatformConfigs(prev => prev.map(x => x.id === p.id ? { ...x, specs: { ...x.specs, imageRatio: e.target.value } } : x));
                              }}
                              className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-border-subtle rounded-lg text-sm outline-none focus:border-black dark:focus:border-white"
                            >
                              <option value="1:1">1:1 正方形</option>
                              <option value="3:4">3:4 纵向</option>
                              <option value="4:3">4:3 横向</option>
                              <option value="9:16">9:16 全屏</option>
                              <option value="16:9">16:9 宽屏</option>
                              <option value="2.35:1">2.35:1 电影</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {mainView === 'data-settings' && (
              <motion.div 
                key="data-settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-y-auto custom-scrollbar p-12"
              >
                <div className="max-w-[640px] mx-auto space-y-12">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setMainView('editor')} className="p-2 hover:bg-[#F7F7F7] dark:hover:bg-white/5 rounded-full dark:text-white"><ChevronLeft size={20} /></button>
                    <h2 className="text-2xl font-bold tracking-tight dark:text-white">数据存储</h2>
                  </div>
                  <div className="space-y-6">
                    <div className="p-8 bg-surface-low rounded-3xl space-y-6">
                      <div className="space-y-2">
                        <h3 className="text-sm font-bold dark:text-white">本地备份</h3>
                        <p className="text-xs text-[#666] dark:text-[#A1A1A1]">导出所有配置、人设、风格和历史记录到本地 JSON 文件。</p>
                        <button 
                          onClick={handleExportData}
                          className="mt-4 px-6 py-3 bg-brand text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2"
                        >
                          <Download size={16} /> 导出备份文件
                        </button>
                      </div>
                      <div className="h-px bg-border-subtle" />
                      <div className="space-y-2">
                        <h3 className="text-sm font-bold dark:text-white">恢复数据</h3>
                        <p className="text-xs text-[#666] dark:text-[#A1A1A1]">从备份文件恢复所有数据。注意：这会覆盖当前所有数据。</p>
                        <label className="mt-4 inline-flex items-center gap-2 px-6 py-3 border border-border-subtle rounded-xl font-bold text-sm hover:border-black dark:hover:border-white transition-all cursor-pointer">
                          <Upload size={16} /> 导入备份文件
                          <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {mainView === 'appearance-settings' && (
              <motion.div 
                key="appearance-settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-y-auto custom-scrollbar p-12"
              >
                <div className="max-w-[640px] mx-auto space-y-12">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setMainView('editor')} className="p-2 hover:bg-[#F7F7F7] dark:hover:bg-white/5 rounded-full dark:text-white"><ChevronLeft size={20} /></button>
                    <h2 className="text-2xl font-bold tracking-tight dark:text-white">外观设置</h2>
                  </div>
                  <div className="p-8 bg-surface-low rounded-3xl space-y-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold dark:text-white">深色模式</h3>
                        <p className="text-xs text-[#666] dark:text-[#A1A1A1]">切换应用程序的视觉主题</p>
                      </div>
                      <button 
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`w-12 h-6 rounded-full relative transition-colors ${isDarkMode ? 'bg-white' : 'bg-black'}`}
                      >
                        <motion.div 
                          animate={{ x: isDarkMode ? 26 : 2 }}
                          initial={false}
                          className={`absolute top-1 w-4 h-4 rounded-full shadow-sm ${isDarkMode ? 'bg-black' : 'bg-white'}`} 
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {mainView === 'about' && (
              <motion.div 
                key="about" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-y-auto custom-scrollbar p-12"
              >
                <div className="max-w-[640px] mx-auto space-y-12">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setMainView('editor')} className="p-2 hover:bg-[#F7F7F7] dark:hover:bg-white/5 rounded-full dark:text-white"><ChevronLeft size={20} /></button>
                    <h2 className="text-2xl font-bold tracking-tight dark:text-white">关于 MuseWrite</h2>
                  </div>
                  <div className="space-y-8">
                    <div className="flex flex-col items-center text-center space-y-4 py-12">
                      <div className="w-20 h-20 bg-black dark:bg-white rounded-[24px] flex items-center justify-center text-white dark:text-black shadow-2xl">
                        <PenTool size={40} strokeWidth={2.5} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-2xl font-bold dark:text-white">MuseWrite</h3>
                        <p className="text-sm text-[#A1A1A1]">Version 2.0.0 (Stable)</p>
                      </div>
                    </div>
                    
                    <div className="prose dark:prose-invert max-w-none space-y-6 text-[#666] dark:text-[#A1A1A1] leading-relaxed">
                      <p>MuseWrite 是一款为您量身定制的 AI 创作助手。它基于先进的四层卡片系统，旨在让创作过程如流水般自然。</p>
                      
                      <div className="grid grid-cols-2 gap-6">
                        <div className="p-6 border border-border-subtle rounded-2xl">
                          <h4 className="font-bold text-black dark:text-white mb-2">四层卡片系统</h4>
                          <p className="text-xs">素材卡 → 信息卡 → 风格卡 → 平台卡，构建完整的创作逻辑。</p>
                        </div>
                        <div className="p-6 border border-border-subtle rounded-2xl">
                          <h4 className="font-bold text-black dark:text-white mb-2">多平台适配</h4>
                          <p className="text-xs">支持 16+ 个主流平台，自动适配发布规范与配图比例。</p>
                        </div>
                      </div>

                      <div className="p-6 bg-surface-low rounded-2xl space-y-4">
                        <h4 className="font-bold text-black dark:text-white">致谢</h4>
                        <p className="text-xs">感谢 Google Gemini 提供强大的 AI 能力支持。</p>
                        <div className="flex gap-4">
                          <a href="https://github.com/ChuluuMGL/musewrite" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-black dark:text-white flex items-center gap-1 hover:underline">
                            <ExternalLink size={12} /> GitHub 仓库
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {mainView === 'result' && (
              <motion.div 
                key="result" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                className="h-full overflow-y-auto custom-scrollbar"
              >
                <div className="max-w-[960px] mx-auto px-6 py-12 space-y-12">
                  {/* Platform Tabs */}
                  <div className="flex border-b border-border-subtle gap-8">
                    <button 
                      onClick={() => setActivePreviewTab('master')}
                      className={`pb-4 text-sm font-bold transition-all relative ${activePreviewTab === 'master' ? 'text-brand' : 'text-[#A1A1A1] hover:text-[#666]'}`}
                    >
                      母版内容
                      {activePreviewTab === 'master' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />}
                    </button>
                    {selectedPlatforms.map(pid => {
                      const p = platformConfigs.find(x => x.id === pid);
                      return (
                        <button 
                          key={pid} 
                          onClick={() => setActivePreviewTab(pid)}
                          className={`pb-4 text-sm font-bold transition-all relative flex items-center gap-2 ${activePreviewTab === pid ? 'text-brand' : 'text-[#A1A1A1] hover:text-[#666]'}`}
                        >
                          {PLATFORM_ICONS[pid] || (p?.iconId && PLATFORM_ICONS[p.iconId])}
                          {p?.name}
                          {activePreviewTab === pid && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Content Card */}
                  {editableResult && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                      <div className="lg:col-span-7 space-y-8">
                        <div className="p-8 border border-border-subtle rounded-[32px] space-y-8 shadow-xl bg-surface-mid relative overflow-hidden">
                          {activePreviewTab !== 'master' && !editableResult.platformOverrides?.[activePreviewTab] && (
                            <div className="absolute inset-0 z-10 bg-[var(--background)]/90 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center space-y-6">
                              <div className="w-16 h-16 bg-brand text-white dark:text-black rounded-2xl flex items-center justify-center shadow-2xl">
                                <Zap size={32} />
                              </div>
                              <div className="space-y-2">
                                <h3 className="text-xl font-bold dark:text-white">适配 {platformConfigs.find(p => p.id === activePreviewTab)?.name}</h3>
                                <p className="text-sm text-[#666] dark:text-[#A1A1A6]">点击下方按钮，AI 将根据平台规范自动优化内容长度和表达方式。</p>
                              </div>
                              <button 
                                onClick={() => handleGenerateForPlatform(activePreviewTab)}
                                disabled={isGeneratingPlatform[activePreviewTab]}
                                className="px-8 py-3 bg-brand text-white dark:text-black rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                              >
                                {isGeneratingPlatform[activePreviewTab] ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                {isGeneratingPlatform[activePreviewTab] ? '正在适配...' : '立即适配'}
                              </button>
                            </div>
                          )}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1]">标题</label>
                              {activePreviewTab !== 'master' && (
                                <span className={`text-[10px] font-bold ${
                                  (editableResult.platformOverrides?.[activePreviewTab]?.title || editableResult.title).length > (platformConfigs.find(p => p.id === activePreviewTab)?.specs.titleLimit || 999)
                                  ? 'text-red-500' : 'text-[#A1A1A1]'
                                }`}>
                                  {(editableResult.platformOverrides?.[activePreviewTab]?.title || editableResult.title).length} / {platformConfigs.find(p => p.id === activePreviewTab)?.specs.titleLimit || '∞'}
                                </span>
                              )}
                            </div>
                            <input 
                              type="text"
                              value={activePreviewTab === 'master' ? editableResult.title : (editableResult.platformOverrides?.[activePreviewTab]?.title || editableResult.title)}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (activePreviewTab === 'master') {
                                  setEditableResult(prev => prev ? { ...prev, title: val } : null);
                                } else {
                                  setEditableResult(prev => {
                                    if (!prev) return null;
                                    const overrides = prev.platformOverrides || {};
                                    return {
                                      ...prev,
                                      platformOverrides: {
                                        ...overrides,
                                        [activePreviewTab]: { ...(overrides[activePreviewTab] || { title: prev.title, content: prev.content, tags: prev.tags }), title: val }
                                      }
                                    };
                                  });
                                }
                              }}
                              className="w-full text-2xl font-bold tracking-tight outline-none bg-transparent border-b border-transparent focus:border-black/10 dark:focus:border-white/10 pb-2 dark:text-white"
                            />
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1]">正文</label>
                              {activePreviewTab !== 'master' && (
                                <span className={`text-[10px] font-bold ${
                                  (editableResult.platformOverrides?.[activePreviewTab]?.content || editableResult.content).length > (platformConfigs.find(p => p.id === activePreviewTab)?.specs.contentLimit || 9999)
                                  ? 'text-red-500' : 'text-[#A1A1A1]'
                                }`}>
                                  {(editableResult.platformOverrides?.[activePreviewTab]?.content || editableResult.content).length} / {platformConfigs.find(p => p.id === activePreviewTab)?.specs.contentLimit || '∞'}
                                </span>
                              )}
                            </div>
                            <textarea 
                              rows={12}
                              value={activePreviewTab === 'master' ? editableResult.content : (editableResult.platformOverrides?.[activePreviewTab]?.content || editableResult.content)}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (activePreviewTab === 'master') {
                                  setEditableResult(prev => prev ? { ...prev, content: val } : null);
                                } else {
                                  setEditableResult(prev => {
                                    if (!prev) return null;
                                    const overrides = prev.platformOverrides || {};
                                    return {
                                      ...prev,
                                      platformOverrides: {
                                        ...overrides,
                                        [activePreviewTab]: { ...(overrides[activePreviewTab] || { title: prev.title, content: prev.content, tags: prev.tags }), content: val }
                                      }
                                    };
                                  });
                                }
                              }}
                              className="w-full text-sm text-[#333] dark:text-[#E0E0E0] leading-relaxed outline-none bg-transparent resize-none border-b border-transparent focus:border-black/10 dark:focus:border-white/10"
                            />
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1]">话题标签</label>
                              {activePreviewTab !== 'master' && (
                                <span className={`text-[10px] font-bold ${
                                  (editableResult.platformOverrides?.[activePreviewTab]?.tags || editableResult.tags).length > (platformConfigs.find(p => p.id === activePreviewTab)?.specs.tagLimit || 99)
                                  ? 'text-red-500' : 'text-[#A1A1A1]'
                                }`}>
                                  {(editableResult.platformOverrides?.[activePreviewTab]?.tags || editableResult.tags).length} / {platformConfigs.find(p => p.id === activePreviewTab)?.specs.tagLimit || '∞'}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(activePreviewTab === 'master' ? editableResult.tags : (editableResult.platformOverrides?.[activePreviewTab]?.tags || editableResult.tags)).map((tag, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium border border-blue-100 dark:border-blue-500/20 group">
                                  #{tag}
                                  <button 
                                    onClick={() => {
                                      if (activePreviewTab === 'master') {
                                        setEditableResult(prev => prev ? { ...prev, tags: prev.tags.filter((_, i) => i !== idx) } : null);
                                      } else {
                                        setEditableResult(prev => {
                                          if (!prev) return null;
                                          const overrides = prev.platformOverrides || {};
                                          const currentTags = overrides[activePreviewTab]?.tags || prev.tags;
                                          return {
                                            ...prev,
                                            platformOverrides: {
                                              ...overrides,
                                              [activePreviewTab]: { ...(overrides[activePreviewTab] || { title: prev.title, content: prev.content, tags: prev.tags }), tags: currentTags.filter((_, i) => i !== idx) }
                                            }
                                          };
                                        });
                                      }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ))}
                              <input 
                                type="text"
                                placeholder="+ 标签"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = (e.target as HTMLInputElement).value.trim();
                                    if (val) {
                                      if (activePreviewTab === 'master') {
                                        setEditableResult(prev => prev ? { ...prev, tags: [...prev.tags, val] } : null);
                                      } else {
                                        setEditableResult(prev => {
                                          if (!prev) return null;
                                          const overrides = prev.platformOverrides || {};
                                          const currentTags = overrides[activePreviewTab]?.tags || prev.tags;
                                          return {
                                            ...prev,
                                            platformOverrides: {
                                              ...overrides,
                                              [activePreviewTab]: { ...(overrides[activePreviewTab] || { title: prev.title, content: prev.content, tags: prev.tags }), tags: [...currentTags, val] }
                                            }
                                          };
                                        });
                                      }
                                      (e.target as HTMLInputElement).value = '';
                                    }
                                  }
                                }}
                                className="px-3 py-1 bg-transparent border border-dashed border-border-subtle rounded-full text-xs text-[#A1A1A1] outline-none focus:border-black dark:focus:border-white w-20 transition-all"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-6 pt-6 border-t border-[#EDEDED] text-[12px] font-bold text-[#A1A1A1]">
                            <span className="flex items-center gap-1.5"><Sparkles size={14} className="text-amber-500" /> {editableResult.score}分</span>
                            <span className="flex items-center gap-1.5"><FileText size={14} /> {(activePreviewTab === 'master' ? editableResult.content : (editableResult.platformOverrides?.[activePreviewTab]?.content || editableResult.content)).length}字</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <button 
                            onClick={handleGenerate}
                            className="px-8 py-3.5 rounded-2xl border border-[#EDEDED] text-sm font-bold hover:border-black transition-colors flex items-center gap-2"
                          >
                            <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} /> 重新生成
                          </button>
                          <button 
                            onClick={() => {
                              const title = activePreviewTab === 'master' ? editableResult.title : (editableResult.platformOverrides?.[activePreviewTab]?.title || editableResult.title);
                              const content = activePreviewTab === 'master' ? editableResult.content : (editableResult.platformOverrides?.[activePreviewTab]?.content || editableResult.content);
                              const tags = activePreviewTab === 'master' ? editableResult.tags : (editableResult.platformOverrides?.[activePreviewTab]?.tags || editableResult.tags);
                              const text = `${title}\n\n${content}\n\n${tags.map(t => `#${t}`).join(' ')}`;
                              handleCopy(text);
                            }}
                            className="px-8 py-3.5 rounded-2xl border border-[#EDEDED] text-sm font-bold hover:border-black transition-colors flex items-center gap-2"
                          >
                            <Copy size={16} /> 复制全文
                          </button>
                          <button 
                            onClick={() => {
                              alert('发布功能：已模拟发布至 ' + (platformConfigs.find(p => p.id === activePreviewTab)?.name || '云端'));
                            }}
                            className="flex-1 py-3.5 bg-black text-white rounded-2xl font-bold hover:bg-[#333] transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2"
                          >
                            <ArrowUpRight size={18} /> 🚀 立即发布
                          </button>
                        </div>
                      </div>

                      <div className="lg:col-span-5 space-y-8">
                        <div className="sticky top-12 space-y-8">
                          {/* Quality Analysis */}
                          <div className="p-6 rounded-[32px] bg-gradient-to-br from-[#FAFAFA] to-[#F0F0F0] dark:from-white/5 dark:to-white/[0.02] border border-white dark:border-white/10 shadow-xl space-y-6">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-[#666] dark:text-[#A1A1A1]">智能质量检测</h4>
                              <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${editableResult.score >= 80 ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                {editableResult.score >= 80 ? '优质' : '良好'}
                              </div>
                            </div>
                            
                            <div className="flex items-end gap-2">
                              <span className="text-5xl font-black tracking-tighter dark:text-white">{editableResult.score}</span>
                              <span className="text-sm font-bold text-[#A1A1A1] mb-2">/ 100</span>
                            </div>

                            <div className="space-y-3">
                              {(editableResult.feedback || ['表达清晰', '重点突出', '符合人设']).map((item, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-[#666] dark:text-[#E0E0E0]">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                  {item}
                                </div>
                              ))}
                            </div>

                            <div className="pt-4 border-t border-black/5 dark:border-white/5">
                              <button className="w-full py-2.5 rounded-xl bg-white dark:bg-white/5 text-[10px] font-bold text-black dark:text-white border border-border-subtle hover:border-black dark:hover:border-white transition-all">
                                重新进行深度质量审计
                              </button>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1]">配图预览</h4>
                            <div className="grid grid-cols-1 gap-4">
                              {editableResult.imageUrl ? (
                                <div className="rounded-[32px] bg-surface-low border border-border-subtle overflow-hidden relative group cursor-pointer aspect-square shadow-sm">
                                  <img src={editableResult.imageUrl} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" alt="" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                    <button 
                                      onClick={() => setIsEditingImage(true)}
                                      className="px-6 py-2.5 bg-white text-black rounded-full text-xs font-bold flex items-center gap-2 hover:scale-105 transition-all"
                                    >
                                      <Edit3 size={14} /> 二次修改
                                    </button>
                                    <button 
                                      onClick={handleGenerate}
                                      className="px-6 py-2.5 bg-black/50 text-white border border-white/20 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-black/70 transition-all"
                                    >
                                      <RefreshCw size={14} /> 重新生成
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-4">
                                  {[1, 2, 3, 4].map(i => {
                                    const ratio = activePreviewTab === 'master' ? '1:1' : (platformConfigs.find(p => p.id === activePreviewTab)?.specs.imageRatio || '1:1');
                                    const ratioClass = ratio === '3:4' ? 'aspect-[3/4]' : ratio === '9:16' ? 'aspect-[9/16]' : ratio === '16:9' ? 'aspect-[16/9]' : ratio === '2.35:1' ? 'aspect-[2.35/1]' : 'aspect-square';
                                    return (
                                      <div key={i} className={`rounded-2xl bg-surface-low border border-border-subtle overflow-hidden relative group cursor-pointer ${ratioClass}`}>
                                        <img src={`https://picsum.photos/seed/muse-${activePreviewTab}-${i}/800/800`} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" alt="" />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <RefreshCw size={20} className="text-white" />
                                        </div>
                                        <div className="absolute top-3 left-3 z-10 text-[10px] font-bold text-white bg-black/40 px-2 py-1 rounded-md backdrop-blur-sm">{ratio}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] text-[#A1A1A1] text-center font-bold uppercase tracking-widest">符合 {activePreviewTab === 'master' ? '默认' : platformConfigs.find(p => p.id === activePreviewTab)?.name} 规范的配图建议</p>
                          </div>

                          <div className="p-6 bg-surface-low border border-border-subtle rounded-[32px] space-y-4">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1]">平台规范检查</h4>
                            <div className="space-y-3">
                              {activePreviewTab === 'master' ? (
                                <p className="text-xs text-[#666] dark:text-[#A1A1A1]">当前为通用母版，切换至具体平台查看规范检查。</p>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-[#666] dark:text-[#A1A1A1]">标题长度</span>
                                    <span className={(editableResult.platformOverrides?.[activePreviewTab]?.title || editableResult.title).length > (platformConfigs.find(p => p.id === activePreviewTab)?.specs.titleLimit || 999) ? 'text-red-500 font-bold' : 'text-green-600'}>
                                      {(editableResult.platformOverrides?.[activePreviewTab]?.title || editableResult.title).length <= (platformConfigs.find(p => p.id === activePreviewTab)?.specs.titleLimit || 999) ? '符合' : '超出'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-[#666] dark:text-[#A1A1A1]">正文长度</span>
                                    <span className={(editableResult.platformOverrides?.[activePreviewTab]?.content || editableResult.content).length > (platformConfigs.find(p => p.id === activePreviewTab)?.specs.contentLimit || 9999) ? 'text-red-500 font-bold' : 'text-green-600'}>
                                      {(editableResult.platformOverrides?.[activePreviewTab]?.content || editableResult.content).length <= (platformConfigs.find(p => p.id === activePreviewTab)?.specs.contentLimit || 9999) ? '符合' : '超出'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-[#666] dark:text-[#A1A1A1]">话题数量</span>
                                    <span className={(editableResult.platformOverrides?.[activePreviewTab]?.tags || editableResult.tags).length > (platformConfigs.find(p => p.id === activePreviewTab)?.specs.tagLimit || 99) ? 'text-red-500 font-bold' : 'text-green-600'}>
                                      {(editableResult.platformOverrides?.[activePreviewTab]?.tags || editableResult.tags).length <= (platformConfigs.find(p => p.id === activePreviewTab)?.specs.tagLimit || 99) ? '符合' : '超出'}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );

  // 3. Setup Flow
  const renderPreviewModal = () => null; // Removed modal in favor of integrated tabbed view


  return (
    <div className={`font-sans antialiased text-foreground bg-[var(--background)] selection:bg-accent-blue selection:text-white overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      <AnimatePresence mode="wait">
        {mainView === 'setup' ? renderSetup() : renderMainLayout()}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showPreview && renderPreviewModal()}
      </AnimatePresence>

      <AnimatePresence>
        {isEditingImage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-[#1A1A1A] rounded-3xl overflow-hidden shadow-2xl border border-border-subtle"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold dark:text-white">修改配图</h3>
                  <button onClick={() => setIsEditingImage(false)} className="p-2 hover:bg-[#F7F7F7] dark:hover:bg-white/5 rounded-full transition-colors dark:text-white">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1]">修改建议</label>
                  <textarea 
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="例如：把背景换成森林，或者让角色穿上红色的衣服..."
                    className="w-full h-32 p-4 bg-surface-low border border-border-subtle rounded-2xl outline-none focus:border-brand transition-all text-sm resize-none dark:text-white"
                  />
                </div>
                
                <button 
                  onClick={handleModifyImage}
                  disabled={!imagePrompt.trim() || isModifyingImage}
                  className="w-full py-4 bg-brand text-white rounded-2xl font-bold hover:opacity-90 transition-all disabled:opacity-20 flex items-center justify-center gap-2"
                >
                  {isModifyingImage ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  {isModifyingImage ? '修改中...' : '确认修改'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #EDEDED; border-radius: 10px; }
        .custom-scrollbar-h::-webkit-scrollbar { height: 4px; }
        .custom-scrollbar-h::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-h::-webkit-scrollbar-thumb { background: #EDEDED; border-radius: 10px; }
      `}} />
    </div>
  );
}

// --- Sub-components ---

function StatusPill({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="px-4 py-1.5 bg-surface-low border border-border-subtle rounded-full text-[12px] font-bold text-[#666] dark:text-[#A1A1A1] hover:text-black dark:hover:text-white hover:border-black dark:hover:border-white transition-all cursor-pointer"
    >
      {label}
    </div>
  );
}

function ActionButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="px-6 py-2.5 rounded-xl border border-[#EDEDED] text-[12px] font-bold hover:border-black transition-all flex items-center gap-2"
    >
      {icon} {label}
    </button>
  );
}

function SettingsNavItem({ label, active = false, onClick, icon }: { label: string; active?: boolean; onClick?: () => void; icon?: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${active ? 'bg-white text-black dark:bg-white/10 dark:text-white shadow-sm border border-black/5 dark:border-white/5' : 'text-[#A1A1A1] hover:text-black dark:hover:text-white hover:bg-[#F0F0F0] dark:hover:bg-white/5'}`}
    >
      {icon}
      {label}
    </button>
  );
}

function SettingsCard({ title, desc, onClick }: { title: string; desc: string; onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="p-6 border border-border-subtle rounded-2xl flex items-center justify-between cursor-pointer hover:border-black dark:hover:border-white transition-colors group"
    >
      <div>
        <div className="font-bold mb-1 dark:text-white">{title}</div>
        <div className="text-xs text-[#666] dark:text-[#A1A1A1]">{desc}</div>
      </div>
      <ChevronRight size={18} className="text-[#D1D1D1] group-hover:text-black dark:group-hover:text-white transition-colors" />
    </div>
  );
}

function IdentityForm({ initialData, onSave, onImport }: { initialData: Partial<Identity>; onSave: (data: Partial<Identity>) => void; onImport: (e: React.ChangeEvent<HTMLInputElement>, cb: (content: string) => void) => void }) {
  const [name, setName] = useState(initialData.name || '');
  const [bio, setBio] = useState(initialData.bio || '');

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1]">名称</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border-subtle dark:bg-black/20 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors" 
            placeholder="例如：周沫"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1]">人设描述 / 学习数据</label>
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-500 cursor-pointer hover:text-blue-600 transition-colors">
              <Upload size={12} /> 导入 Markdown
              <input type="file" accept=".md" className="hidden" onChange={(e) => onImport(e, setBio)} />
            </label>
          </div>
          <textarea 
            rows={10} 
            value={bio} 
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border-subtle dark:bg-black/20 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors resize-none text-sm leading-relaxed" 
            placeholder="描述一下这个人是谁，或者粘贴一些他的作品作为学习数据..."
          />
        </div>
      </div>
      <button 
        onClick={() => onSave({ name, bio })}
        disabled={!name || !bio}
        className="w-full py-4 bg-brand text-white dark:text-black rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-20"
      >
        保存人设
      </button>
    </div>
  );
}

function StyleForm({ initialData, onSave }: { initialData: Partial<StylePreset>; onSave: (data: Partial<StylePreset>) => void }) {
  const [name, setName] = useState(initialData.name || '');
  const [desc, setDesc] = useState(initialData.desc || '');
  const [iconId, setIconId] = useState(initialData.iconId || 'default');

  const iconOptions = [
    { id: 'zap', icon: <Zap size={18} /> },
    { id: 'sparkles', icon: <Sparkles size={18} /> },
    { id: 'sword', icon: <Sword size={18} /> },
    { id: 'coffee', icon: <Coffee size={18} /> },
    { id: 'briefcase', icon: <Briefcase size={18} /> },
    { id: 'smile', icon: <Smile size={18} /> },
    { id: 'pen', icon: <PenTool size={18} /> },
    { id: 'book', icon: <BookOpen size={18} /> },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div className="space-y-4">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1]">选择图标</label>
          <div className="flex flex-wrap gap-3">
            {iconOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setIconId(opt.id)}
                className={`p-3 rounded-xl border transition-all ${iconId === opt.id ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black' : 'border-border-subtle hover:border-black dark:hover:border-white bg-white dark:bg-white/5 dark:text-white'}`}
              >
                {opt.icon}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1]">风格名称</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border-subtle dark:bg-black/20 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors" 
            placeholder="例如：犀利"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1A1]">风格描述</label>
          <textarea 
            rows={4} 
            value={desc} 
            onChange={(e) => setDesc(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border-subtle dark:bg-black/20 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors resize-none text-sm leading-relaxed" 
            placeholder="描述这种风格的特点，例如：语言简练，多用反问句..."
          />
        </div>
      </div>
      <button 
        onClick={() => onSave({ name, desc, iconId })}
        disabled={!name || !desc}
        className="w-full py-4 bg-brand text-white dark:text-black rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-20"
      >
        保存风格
      </button>
    </div>
  );
}


