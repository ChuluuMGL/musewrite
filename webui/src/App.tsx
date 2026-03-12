import { useState } from 'react'

function App() {
  const [input, setInput] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState('周沫')
  const [selectedStyle, setSelectedStyle] = useState('犀利')
  const [withImage, setWithImage] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandPersona, setExpandPersona] = useState(false)
  const [expandStyle, setExpandStyle] = useState(false)

  // Mock data for expandable lists
  const personas = ['周沫', '月瑀', '大洋', '大瑀']
  const styles = ['犀利', '温暖', '专业', '幽默']

  const handleGenerate = () => {
    if (input.trim()) {
      setShowResult(true)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-0'} border-r border-gray-100 dark:border-gray-800 transition-all duration-300 overflow-hidden`}>
        <div className="p-4 space-y-6">
          {/* Current Persona - Compact */}
          <div>
            <div className="text-xs text-gray-400 mb-2">当前人设</div>
            <button
              onClick={() => setExpandPersona(!expandPersona)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="font-medium">{selectedPersona}</span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandPersona ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandPersona && (
              <div className="mt-1 space-y-1">
                {personas.filter(p => p !== selectedPersona).map((p) => (
                  <button
                    key={p}
                    onClick={() => { setSelectedPersona(p); setExpandPersona(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    {p}
                  </button>
                ))}
                <button className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  + 新建人设
                </button>
              </div>
            )}
          </div>

          {/* Current Style - Compact */}
          <div>
            <div className="text-xs text-gray-400 mb-2">当前风格</div>
            <button
              onClick={() => setExpandStyle(!expandStyle)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="font-medium">{selectedStyle}</span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandStyle ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandStyle && (
              <div className="mt-1 space-y-1">
                {styles.filter(s => s !== selectedStyle).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSelectedStyle(s); setExpandStyle(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    {s}
                  </button>
                ))}
                <button className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  + 新建风格
                </button>
              </div>
            )}
          </div>

          {/* Options */}
          <div>
            <div className="text-xs text-gray-400 mb-2">选项</div>
            <label className="flex items-center gap-2 px-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={withImage}
                onChange={(e) => setWithImage(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm">配图</span>
            </label>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="h-14 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{selectedPersona} · {selectedStyle}</span>
            <button className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </header>

        {/* Content Area - Input Mode */}
        <div className={`flex-1 flex flex-col items-center justify-center p-8 transition-opacity duration-300 ${showResult ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="w-full max-w-2xl space-y-6">
            {/* Input */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="有什么想写的？"
              className="w-full h-48 p-4 text-lg border-0 bg-gray-50 dark:bg-gray-800/50 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 placeholder:text-gray-400"
            />

            {/* Quick Select */}
            <div className="flex items-center justify-center gap-3">
              <button className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {selectedPersona}
              </button>
              <button className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {selectedStyle}
              </button>
              <label className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                <input type="checkbox" checked={withImage} onChange={(e) => setWithImage(e.target.checked)} className="hidden" />
                配图 {withImage ? '✓' : ''}
              </label>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              ✨ 生成内容
            </button>
          </div>
        </div>

        {/* Result Panel - Full Screen Slide Up */}
        {showResult && (
          <div className="absolute inset-0 bg-white dark:bg-[#0A0A0A] flex flex-col animate-slide-up">
            {/* Header */}
            <div className="h-14 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 flex-shrink-0">
              <button
                onClick={() => setShowResult(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm">返回</span>
              </button>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">{selectedPersona} · {selectedStyle}</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-100 dark:border-gray-800 px-6 flex-shrink-0">
              <button className="px-4 py-3 text-sm font-medium border-b-2 border-black dark:border-white">
                生成结果
              </button>
              <button className="px-4 py-3 text-sm text-gray-400 hover:text-gray-600">
                小红书
              </button>
              <button className="px-4 py-3 text-sm text-gray-400 hover:text-gray-600">
                抖音
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Source Input */}
                <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-4">
                  <div className="text-xs text-gray-400 mb-2">原始输入</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {input}
                  </p>
                </div>

                {/* Generated Content */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                  <h3 className="text-lg font-medium mb-4">
                    {input.slice(0, 30)}{input.length > 30 ? '...' : ''}
                  </h3>
                  <div className="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
                    <p>
                      基于你的输入「{input.slice(0, 20)}...」，以{selectedPersona}的人设、{selectedStyle}的风格生成的内容：
                    </p>
                    <p>
                      这里是生成的内容区域。实际使用时会调用AI接口生成真实内容。
                      内容会根据你选择的人设和风格进行调整，确保语气和表达方式符合预期。
                    </p>
                    <p>
                      生成的内容可以一键适配到多个平台，包括小红书、抖音、知乎、微信、微博等。
                      每个平台会根据其特点自动调整格式、字数、标签等。
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="text-sm text-gray-500">#创作</span>
                    <span className="text-sm text-gray-500">#内容</span>
                    <span className="text-sm text-gray-500">{selectedStyle}</span>
                  </div>
                  <div className="text-sm text-gray-400 mt-4">
                    📊 质量评分 · 📝 字数统计
                  </div>
                </div>

                {/* Platform Selection */}
                <div>
                  <div className="text-sm text-gray-400 mb-3">适配到其他平台</div>
                  <div className="flex flex-wrap gap-2">
                    {['小红书', '抖音', '知乎', '微信', '微博'].map((platform) => (
                      <label key={platform} className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <input type="checkbox" className="w-4 h-4" />
                        <span className="text-sm">{platform}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-center gap-3 pt-4">
                  <button
                    onClick={() => setShowResult(false)}
                    className="px-6 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    重新生成
                  </button>
                  <button className="px-6 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    📋 复制
                  </button>
                  <button
                    onClick={() => setShowPreview(true)}
                    className="px-6 py-2.5 text-sm bg-black dark:bg-white text-white dark:text-black rounded-lg"
                  >
                    适配已选平台
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Preview Panel - Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPreview(false)}>
          <div
            className="w-full max-w-4xl max-h-[85vh] bg-white dark:bg-[#0A0A0A] rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="h-14 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 flex-shrink-0">
              <h2 className="font-medium">平台预览</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-100 dark:border-gray-800 px-6 flex-shrink-0">
              <button className="px-4 py-3 text-sm font-medium border-b-2 border-black dark:border-white">
                小红书
              </button>
              <button className="px-4 py-3 text-sm text-gray-400 hover:text-gray-600">
                抖音
              </button>
              <button className="px-4 py-3 text-sm text-gray-400 hover:text-gray-600">
                知乎
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Text Content */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                      红
                    </div>
                    <span className="font-medium">小红书格式</span>
                  </div>
                  <h3 className="text-lg font-medium mb-3">
                    {input.slice(0, 25)}{input.length > 25 ? '...' : ''}
                  </h3>
                  <div className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm space-y-3">
                    <p>
                      ✨ 适配后的小红书内容格式...
                    </p>
                    <p>
                      📍 标题：吸引眼球的标题
                      📍 正文：分段清晰，emoji丰富
                      📍 标签：#相关话题 #热门标签
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">#标签1</span>
                    <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">#标签2</span>
                    <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">#标签3</span>
                  </div>
                </div>

                {/* Image Preview */}
                <div className="space-y-3">
                  <div className="text-sm text-gray-400">配图预览</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                      封面
                    </div>
                    <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                      配图2
                    </div>
                    <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                      配图3
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-center gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button className="px-5 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  📋 复制全文
                </button>
                <button className="px-5 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  📥 导出
                </button>
                <button className="px-5 py-2 text-sm bg-black dark:bg-white text-white dark:text-black rounded-lg">
                  💾 保存草稿
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
