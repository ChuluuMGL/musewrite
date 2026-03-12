import { useState, useEffect } from 'react'

// Types
type Page = 'setup' | 'home' | 'result' | 'settings' | 'personas' | 'persona-edit' | 'styles' | 'style-edit'

interface Persona {
  id: string
  name: string
  description: string
  examples: string
  isDefault: boolean
}

interface Style {
  id: string
  name: string
  description: string
  examples: string
  isDefault: boolean
}

// Mock Data
const defaultPersonas: Persona[] = [
  { id: '1', name: '周沫', description: '专业品牌策划人，10年营销经验，擅长商业洞察和犀利表达', examples: '', isDefault: true },
  { id: '2', name: '月瑀', description: '温暖治愈系写手，擅长情感共鸣和细腻表达', examples: '', isDefault: false },
]

const defaultStyles: Style[] = [
  { id: '1', name: '犀利', description: '直击要害，一针见血，不留情面但言之有物', examples: '', isDefault: true },
  { id: '2', name: '温暖', description: '治愈系，情感共鸣，温柔细腻', examples: '', isDefault: false },
  { id: '3', name: '专业', description: '严谨客观，数据支撑，逻辑清晰', examples: '', isDefault: false },
]

function App() {
  // Setup state
  const [setupComplete, setSetupComplete] = useState(() => {
    return localStorage.getItem('musewrite-setup-complete') === 'true'
  })
  const [setupStep, setSetupStep] = useState(1)
  const [setupPersona, setSetupPersona] = useState({ name: '', description: '' })
  const [setupStyle, setSetupStyle] = useState('犀利')
  const [setupPlatforms, setSetupPlatforms] = useState<string[]>(['小红书'])

  // App state
  const [currentPage, setCurrentPage] = useState<Page>(setupComplete ? 'home' : 'setup')
  const [input, setInput] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showApiModal, setShowApiModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Data
  const [personas, setPersonas] = useState<Persona[]>(defaultPersonas)
  const [styles, setStyles] = useState<Style[]>(defaultStyles)
  const [selectedPersona, setSelectedPersona] = useState(defaultPersonas[0])
  const [selectedStyle, setSelectedStyle] = useState(defaultStyles[0])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [withImage, setWithImage] = useState(true)

  // Edit state
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null)
  const [editingStyle, setEditingStyle] = useState<Style | null>(null)

  const platforms = ['小红书', '抖音', '知乎', '微信', '微博', '头条']

  // Setup handlers
  const completeSetup = () => {
    localStorage.setItem('musewrite-setup-complete', 'true')
    setSetupComplete(true)
    setCurrentPage('home')
  }

  // Generate handler
  const handleGenerate = () => {
    if (input.trim()) {
      setCurrentPage('result')
    }
  }

  // Navigation
  const goTo = (page: Page) => {
    setCurrentPage(page)
    setShowPreview(false)
    setShowExportMenu(false)
    setShowApiModal(false)
  }

  // ==================== SETUP PAGES ====================
  if (currentPage === 'setup') {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0A0A0A] flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-xl">
          {/* Logo */}
          <div className="text-center mb-12">
            <div className="text-5xl mb-4">✨</div>
            <h1 className="text-3xl font-semibold mb-2">MuseWrite</h1>
            <p className="text-lg text-gray-500">让创作变得简单而有趣</p>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-12">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step <= setupStep
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`w-12 h-0.5 ${step < setupStep ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-800'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Persona */}
          {setupStep === 1 && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2">创建你的第一个人设</h2>
                <p className="text-gray-500">人设决定了内容的声音和视角</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-base font-medium mb-3">名称</label>
                  <input
                    type="text"
                    value={setupPersona.name}
                    onChange={(e) => setSetupPersona({ ...setupPersona, name: e.target.value })}
                    placeholder="给这个人设起个名字"
                    className="w-full px-5 py-4 text-lg border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-base font-medium mb-3">描述</label>
                  <textarea
                    value={setupPersona.description}
                    onChange={(e) => setSetupPersona({ ...setupPersona, description: e.target.value })}
                    placeholder="描述这个人的身份、背景、专业领域..."
                    rows={4}
                    className="w-full px-5 py-4 text-lg border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white placeholder:text-gray-400 resize-none"
                  />
                </div>
              </div>

              <button
                onClick={() => setSetupStep(2)}
                disabled={!setupPersona.name.trim()}
                className="w-full py-4 text-lg bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-30"
              >
                下一步
              </button>
            </div>
          )}

          {/* Step 2: Style */}
          {setupStep === 2 && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2">选择写作风格</h2>
                <p className="text-gray-500">风格决定了内容的调性和表达方式</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {defaultStyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSetupStyle(style.name)}
                    className={`p-6 rounded-2xl text-left transition-all ${
                      setupStyle === style.name
                        ? 'bg-black text-white dark:bg-white dark:text-black ring-2 ring-black dark:ring-white'
                        : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="text-xl font-semibold mb-2">{style.name}</div>
                    <div className={`text-sm ${setupStyle === style.name ? 'text-white/70 dark:text-black/70' : 'text-gray-500'}`}>
                      {style.description}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setSetupStep(3)}
                className="w-full py-4 text-lg bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                下一步
              </button>
            </div>
          )}

          {/* Step 3: Platforms */}
          {setupStep === 3 && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2">选择发布平台</h2>
                <p className="text-gray-500">内容将自动适配这些平台的格式</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {platforms.map((platform) => (
                  <button
                    key={platform}
                    onClick={() => {
                      setSetupPlatforms(prev =>
                        prev.includes(platform)
                          ? prev.filter(p => p !== platform)
                          : [...prev, platform]
                      )
                    }}
                    className={`p-5 rounded-2xl text-center transition-all ${
                      setupPlatforms.includes(platform)
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="text-lg font-medium">{platform}</div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setSetupStep(4)}
                disabled={setupPlatforms.length === 0}
                className="w-full py-4 text-lg bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-30"
              >
                下一步
              </button>
            </div>
          )}

          {/* Step 4: Complete */}
          {setupStep === 4 && (
            <div className="space-y-8 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-semibold">准备就绪！</h2>
              <p className="text-gray-500">你已经完成了基础设置</p>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 text-left space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">人设</span>
                  <span className="font-medium">{setupPersona.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">风格</span>
                  <span className="font-medium">{setupStyle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">平台</span>
                  <span className="font-medium">{setupPlatforms.join('、')}</span>
                </div>
              </div>

              <button
                onClick={completeSetup}
                className="w-full py-4 text-lg bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                开始创作 ✨
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ==================== SETTINGS PAGE ====================
  if (currentPage === 'settings') {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
        <header className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center px-8">
          <button onClick={() => goTo('home')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-lg">返回</span>
          </button>
          <h1 className="flex-1 text-center text-xl font-semibold">设置</h1>
          <div className="w-20" />
        </header>

        <main className="max-w-2xl mx-auto p-8 space-y-4">
          {[
            { title: '人设管理', desc: '管理和编辑你的人设卡片', page: 'personas' as Page },
            { title: '风格管理', desc: '管理和编辑你的风格卡片', page: 'styles' as Page },
            { title: '平台管理', desc: '管理各平台的适配规则', page: 'home' as Page },
          ].map((item) => (
            <button
              key={item.title}
              onClick={() => goTo(item.page)}
              className="w-full p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="text-lg font-medium mb-1">{item.title}</div>
              <div className="text-gray-500">{item.desc}</div>
            </button>
          ))}

          <div className="pt-6">
            <div className="text-sm text-gray-400 uppercase tracking-wider mb-4">高级</div>
            {[
              { title: 'API 设置', desc: '配置 AI 服务接口' },
              { title: '数据存储', desc: '本地存储路径、云同步设置' },
              { title: '外观', desc: '深色模式 / 浅色模式' },
            ].map((item) => (
              <button
                key={item.title}
                className="w-full p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mb-3"
              >
                <div className="text-lg font-medium mb-1">{item.title}</div>
                <div className="text-gray-500">{item.desc}</div>
              </button>
            ))}
          </div>

          <div className="pt-6">
            <div className="text-sm text-gray-400 uppercase tracking-wider mb-4">关于</div>
            <button className="w-full p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl text-left">
              <div className="text-lg font-medium mb-1">MuseWrite</div>
              <div className="text-gray-500">版本 0.1.0</div>
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ==================== PERSONAS PAGE ====================
  if (currentPage === 'personas') {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
        <header className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center px-8">
          <button onClick={() => goTo('settings')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-lg">返回</span>
          </button>
          <h1 className="flex-1 text-center text-xl font-semibold">人设管理</h1>
          <button
            onClick={() => { setEditingPersona({ id: '', name: '', description: '', examples: '', isDefault: false }); goTo('persona-edit'); }}
            className="text-lg font-medium"
          >
            + 新建
          </button>
        </header>

        <main className="max-w-2xl mx-auto p-8 space-y-4">
          {personas.map((persona) => (
            <div key={persona.id} className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xl font-semibold">{persona.name}</span>
                  {persona.isDefault && (
                    <span className="ml-3 text-sm text-gray-400">默认</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setEditingPersona(persona); goTo('persona-edit'); }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button className="text-gray-400 hover:text-red-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-gray-500">{persona.description}</p>
            </div>
          ))}
        </main>
      </div>
    )
  }

  // ==================== PERSONA EDIT PAGE ====================
  if (currentPage === 'persona-edit') {
    const [formData, setFormData] = useState(editingPersona || { id: '', name: '', description: '', examples: '', isDefault: false })

    return (
      <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
        <header className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center px-8">
          <button onClick={() => goTo('personas')} className="text-lg text-gray-500">取消</button>
          <h1 className="flex-1 text-center text-xl font-semibold">{editingPersona?.id ? '编辑人设' : '新建人设'}</h1>
          <button className="text-lg font-medium">保存</button>
        </header>

        <main className="max-w-2xl mx-auto p-8 space-y-8">
          <div>
            <label className="block text-lg font-medium mb-3">名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="输入人设名称"
              className="w-full px-5 py-4 text-lg border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-lg font-medium mb-3">描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="描述这个人的身份、背景、专业领域、写作特点..."
              rows={4}
              className="w-full px-5 py-4 text-lg border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white placeholder:text-gray-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-lg font-medium mb-3">代表作品（可选）</label>
            <textarea
              value={formData.examples}
              onChange={(e) => setFormData({ ...formData, examples: e.target.value })}
              placeholder="粘贴1-3篇这个人的代表作品，AI会学习其写作风格..."
              rows={6}
              className="w-full px-5 py-4 text-lg border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white placeholder:text-gray-400 resize-none"
            />
            <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex items-center justify-between">
              <span className="text-gray-500">📄 导入 Markdown 文件</span>
              <button className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg">选择文件</button>
            </div>
          </div>

          <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <span className="text-lg">设为默认人设</span>
          </label>
        </main>
      </div>
    )
  }

  // ==================== STYLES PAGE ====================
  if (currentPage === 'styles') {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
        <header className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center px-8">
          <button onClick={() => goTo('settings')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-lg">返回</span>
          </button>
          <h1 className="flex-1 text-center text-xl font-semibold">风格管理</h1>
          <button
            onClick={() => { setEditingStyle({ id: '', name: '', description: '', examples: '', isDefault: false }); goTo('style-edit'); }}
            className="text-lg font-medium"
          >
            + 新建
          </button>
        </header>

        <main className="max-w-2xl mx-auto p-8 space-y-4">
          {styles.map((style) => (
            <div key={style.id} className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-xl font-semibold">{style.name}</span>
                  {style.isDefault && (
                    <span className="ml-3 text-sm text-gray-400">默认</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setEditingStyle(style); goTo('style-edit'); }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button className="text-gray-400 hover:text-red-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-gray-500">{style.description}</p>
            </div>
          ))}
        </main>
      </div>
    )
  }

  // ==================== STYLE EDIT PAGE ====================
  if (currentPage === 'style-edit') {
    const [formData, setFormData] = useState(editingStyle || { id: '', name: '', description: '', examples: '', isDefault: false })

    return (
      <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
        <header className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center px-8">
          <button onClick={() => goTo('styles')} className="text-lg text-gray-500">取消</button>
          <h1 className="flex-1 text-center text-xl font-semibold">{editingStyle?.id ? '编辑风格' : '新建风格'}</h1>
          <button className="text-lg font-medium">保存</button>
        </header>

        <main className="max-w-2xl mx-auto p-8 space-y-8">
          <div>
            <label className="block text-lg font-medium mb-3">风格名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="输入风格名称"
              className="w-full px-5 py-4 text-lg border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-lg font-medium mb-3">风格描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="描述这个风格的特点..."
              rows={3}
              className="w-full px-5 py-4 text-lg border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white placeholder:text-gray-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-lg font-medium mb-3">风格示例（可选）</label>
            <textarea
              value={formData.examples}
              onChange={(e) => setFormData({ ...formData, examples: e.target.value })}
              placeholder="粘贴符合此风格的示例文本，AI会学习..."
              rows={6}
              className="w-full px-5 py-4 text-lg border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white placeholder:text-gray-400 resize-none"
            />
            <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex items-center justify-between">
              <span className="text-gray-500">📄 导入 Markdown 文件</span>
              <button className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg">选择文件</button>
            </div>
          </div>

          <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <span className="text-lg">设为默认风格</span>
          </label>
        </main>
      </div>
    )
  }

  // ==================== RESULT PAGE ====================
  if (currentPage === 'result') {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
        <header className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center px-8">
          <button onClick={() => goTo('home')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-lg">返回</span>
          </button>
          <h1 className="flex-1 text-center text-xl font-semibold">生成结果</h1>
          <div className="text-gray-500">{selectedPersona.name} · {selectedStyle.name}</div>
        </header>

        {/* Tabs */}
        <div className="border-b border-gray-100 dark:border-gray-800 px-8">
          <div className="max-w-4xl mx-auto flex gap-6">
            <button className="py-4 text-lg font-medium border-b-2 border-black dark:border-white">
              生成结果
            </button>
            {platforms.slice(0, 3).map((p) => (
              <button key={p} className="py-4 text-lg text-gray-400 hover:text-gray-600">
                {p}
              </button>
            ))}
          </div>
        </div>

        <main className="max-w-4xl mx-auto p-8 space-y-8">
          {/* Source */}
          <div className="p-6 bg-gray-50 dark:bg-gray-800/30 rounded-2xl">
            <div className="text-sm text-gray-400 mb-2">原始输入</div>
            <p className="text-lg text-gray-600 dark:text-gray-400">{input}</p>
          </div>

          {/* Generated Content */}
          <div className="p-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
            <h2 className="text-2xl font-semibold mb-6">
              {input.slice(0, 40)}{input.length > 40 ? '...' : ''}
            </h2>
            <div className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
              <p>
                基于你的输入「{input.slice(0, 30)}...」，以{selectedPersona.name}的人设、{selectedStyle.name}的风格生成的内容。
              </p>
              <p>
                这里是AI生成的内容区域。内容会根据你选择的人设和风格进行调整，确保语气和表达方式符合预期。
                实际使用时会调用后端API生成真实内容。
              </p>
              <p>
                生成的内容可以一键适配到多个平台，每个平台会根据其特点自动调整格式、字数、标签等。
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <span className="text-gray-400">#创作</span>
              <span className="text-gray-400">#内容</span>
              <span className="text-gray-400">#{selectedStyle.name}</span>
            </div>
            <div className="text-gray-400 mt-4">📊 质量评分 · 📝 字数统计</div>
          </div>

          {/* Platform Selection */}
          <div>
            <div className="text-lg text-gray-400 mb-4">适配到其他平台</div>
            <div className="flex flex-wrap gap-3">
              {platforms.map((platform) => (
                <label
                  key={platform}
                  className={`flex items-center gap-3 px-5 py-3 rounded-xl cursor-pointer transition-colors ${
                    selectedPlatforms.includes(platform)
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(platform)}
                    onChange={(e) => {
                      setSelectedPlatforms(prev =>
                        e.target.checked
                          ? [...prev, platform]
                          : prev.filter(p => p !== platform)
                      )
                    }}
                    className="hidden"
                  />
                  <span className="text-lg">{platform}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={() => goTo('home')}
              className="px-8 py-3 text-lg border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              重新生成
            </button>
            <button className="px-8 py-3 text-lg border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
              📋 复制
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className="px-8 py-3 text-lg bg-black dark:bg-white text-white dark:text-black rounded-xl"
            >
              预览适配结果
            </button>
          </div>
        </main>

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8" onClick={() => setShowPreview(false)}>
            <div
              className="w-full max-w-5xl max-h-[90vh] bg-white dark:bg-[#0A0A0A] rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-8">
                <h2 className="text-xl font-semibold">平台预览</h2>
                <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-100 dark:border-gray-800 px-8">
                <div className="flex gap-6">
                  {selectedPlatforms.length > 0 ? selectedPlatforms.slice(0, 4).map((p, i) => (
                    <button
                      key={p}
                      className={`py-4 text-lg ${i === 0 ? 'font-medium border-b-2 border-black dark:border-white' : 'text-gray-400'}`}
                    >
                      {p}
                    </button>
                  )) : (
                    <button className="py-4 text-lg font-medium border-b-2 border-black dark:border-white">小红书</button>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Text */}
                  <div className="p-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white font-bold">红</div>
                      <span className="text-lg font-medium">小红书格式</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-4">{input.slice(0, 30)}...</h3>
                    <div className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
                      <p>✨ 适配后的小红书内容格式...</p>
                      <p>📍 标题：吸引眼球的标题<br />📍 正文：分段清晰，emoji丰富<br />📍 标签：#相关话题 #热门标签</p>
                    </div>
                    <div className="flex gap-2 mt-6">
                      <span className="text-sm px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full">#标签1</span>
                      <span className="text-sm px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full">#标签2</span>
                    </div>
                  </div>

                  {/* Images */}
                  <div>
                    <div className="text-lg text-gray-400 mb-4">配图预览</div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-400">封面</div>
                      <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-400">图2</div>
                      <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-400">图3</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-center gap-4 mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <button className="px-6 py-3 text-lg border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50">
                    💾 保存
                  </button>
                  <button className="px-6 py-3 text-lg border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50">
                    🔗 分享
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="px-6 py-3 text-lg border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50"
                    >
                      📥 导出 ▾
                    </button>
                    {showExportMenu && (
                      <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                        <button className="block w-full px-6 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800">📄 导出 TXT</button>
                        <button className="block w-full px-6 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800">📋 导出 JSON</button>
                        <button className="block w-full px-6 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800">📝 导出 Markdown</button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowApiModal(true)}
                    className="px-6 py-3 text-lg border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50"
                  >
                    🔌 API
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Modal */}
        {showApiModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-8" onClick={() => setShowApiModal(false)}>
            <div
              className="w-full max-w-2xl bg-white dark:bg-[#0A0A0A] rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-8">
                <h2 className="text-xl font-semibold">API 调用</h2>
                <button onClick={() => setShowApiModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="text-lg text-gray-500">复制以下代码，在你的应用中调用：</div>
                <div className="p-6 bg-gray-900 rounded-2xl text-green-400 font-mono text-sm overflow-x-auto">
                  <div>POST /api/v1/content/generate</div>
                  <div className="mt-4">{'{'}</div>
                  <div className="pl-4">"input": "{input.slice(0, 30)}...",</div>
                  <div className="pl-4">"persona_id": "{selectedPersona.id}",</div>
                  <div className="pl-4">"style": "{selectedStyle.name}",</div>
                  <div className="pl-4">"platforms": {JSON.stringify(selectedPlatforms)}</div>
                  <div>{'}'}</div>
                </div>
                <div>
                  <div className="text-lg font-medium mb-3">API Key</div>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <code className="flex-1 text-lg font-mono">sk-muse-xxxx-xxxx-xxxx</code>
                    <button className="text-gray-400 hover:text-gray-600">👁️</button>
                    <button className="text-gray-400 hover:text-gray-600">📋</button>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button className="flex-1 py-3 text-lg border border-gray-200 dark:border-gray-700 rounded-xl">📋 复制代码</button>
                  <button className="flex-1 py-3 text-lg bg-black dark:bg-white text-white dark:text-black rounded-xl">查看文档</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ==================== HOME PAGE ====================
  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] flex relative overflow-hidden">
      {/* Sidebar - Apple Notes Style */}
      <aside
        className={`
          absolute left-0 top-0 bottom-0 z-20
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
        `}
      >
        <div className="h-full w-72 bg-[#F5F5F7] dark:bg-[#1C1C1E] flex flex-col">
          {/* Sidebar Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-black/5 dark:border-white/5">
            <span className="text-lg font-semibold">MuseWrite</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Persona */}
            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-2">人设</div>
              <button className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-[#2C2C2E] rounded-xl shadow-sm hover:shadow transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
                    {selectedPersona.name[0]}
                  </div>
                  <span className="text-base font-medium">{selectedPersona.name}</span>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Style */}
            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-2">风格</div>
              <button className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-[#2C2C2E] rounded-xl shadow-sm hover:shadow transition-all">
                <span className="text-base font-medium">{selectedStyle.name}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Divider */}
            <div className="h-px bg-black/5 dark:bg-white/5" />

            {/* Options */}
            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-2">选项</div>
              <label className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#2C2C2E] rounded-xl shadow-sm cursor-pointer">
                <span className="text-base">生成配图</span>
                <div className={`w-11 h-6 rounded-full transition-colors ${withImage ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white dark:bg-black shadow transition-transform ${withImage ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </label>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-black/5 dark:border-white/5">
            <button
              onClick={() => goTo('settings')}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-base">设置</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar Toggle Handle - Apple Style */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`
          absolute left-0 top-0 bottom-0 z-10 w-1
          hover:w-2 transition-all duration-200
          ${sidebarOpen ? 'bg-transparent' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'}
        `}
      />

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'md:ml-72' : ''}`}>
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-gray-100 dark:border-gray-800">
          {/* Toggle Button (when sidebar closed) */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <div className={!sidebarOpen ? '' : 'flex-1'} />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">{selectedPersona.name}</span>
              <span>·</span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">{selectedStyle.name}</span>
            </div>
          </div>
          <div className="w-10" />
        </header>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-2xl space-y-8">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="有什么想写的？"
              className="w-full h-64 p-6 text-xl border-0 bg-gray-50 dark:bg-gray-800/50 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 placeholder:text-gray-400"
            />

            {/* Quick Select */}
            <div className="flex items-center justify-center gap-4">
              <button className="px-6 py-3 text-base border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
                {selectedPersona.name}
              </button>
              <button className="px-6 py-3 text-base border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
                {selectedStyle.name}
              </button>
              <label className="flex items-center gap-2 px-6 py-3 text-base border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                <input
                  type="checkbox"
                  checked={withImage}
                  onChange={(e) => setWithImage(e.target.checked)}
                  className="hidden"
                />
                配图 {withImage ? '✓' : ''}
              </label>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!input.trim()}
              className="w-full py-5 text-xl bg-black dark:bg-white text-white dark:text-black rounded-2xl font-medium hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              ✨ 生成内容
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
