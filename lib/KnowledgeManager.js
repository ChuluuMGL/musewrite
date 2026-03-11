/**
 * MuseWrite 知识管理器
 * 管理品牌库、产品卡、风格学习、创作记忆
 */

const fs = require('fs');
const path = require('path');

class KnowledgeManager {
  constructor(dataPath) {
    this.dataPath = dataPath;
    this.brandsPath = path.join(dataPath, 'brands');
    this.productsPath = path.join(dataPath, 'products');
    this.stylesPath = path.join(dataPath, 'styles');
    this.memoriesPath = path.join(dataPath, 'memories');
    this.projectsPath = path.join(dataPath, 'projects');

    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.dataPath, this.brandsPath, this.productsPath,
     this.stylesPath, this.memoriesPath, this.projectsPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // ==================== 项目管理 ====================

  /**
   * 创建项目
   */
  createProject(data) {
    const id = `project-${Date.now()}`;
    const project = {
      id,
      name: data.name,
      description: data.description || '',
      brands: [],
      accounts: data.accounts || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(this.projectsPath, `${id}.json`),
      JSON.stringify(project, null, 2)
    );

    return project;
  }

  /**
   * 获取项目
   */
  getProject(projectId) {
    const file = path.join(this.projectsPath, `${projectId}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }

  /**
   * 列出所有项目
   */
  listProjects() {
    if (!fs.existsSync(this.projectsPath)) return [];
    return fs.readdirSync(this.projectsPath)
      .filter(f => f.startsWith('project-') && f.endsWith('.json'))
      .map(f => {
        const project = JSON.parse(fs.readFileSync(path.join(this.projectsPath, f)));
        return {
          id: project.id,
          name: project.name,
          brandCount: project.brands?.length || 0,
          accountCount: project.accounts?.length || 0
        };
      });
  }

  // ==================== 品牌管理 ====================

  /**
   * 创建品牌
   */
  createBrand(data) {
    const id = `brand-${Date.now()}`;
    const brand = {
      id,
      projectId: data.projectId,
      name: data.name,
      fullName: data.fullName || data.name,
      industry: data.industry || '',
      positioning: data.positioning || '',
      tone: data.tone || [],
      slogans: data.slogans || [],
      colors: data.colors || [],
      taboos: data.taboos || [],
      keywords: data.keywords || [],
      description: data.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(this.brandsPath, `${id}.json`),
      JSON.stringify(brand, null, 2)
    );

    // 更新项目的品牌列表
    if (data.projectId) {
      const project = this.getProject(data.projectId);
      if (project) {
        project.brands = project.brands || [];
        project.brands.push(id);
        project.updatedAt = new Date().toISOString();
        fs.writeFileSync(
          path.join(this.projectsPath, `${data.projectId}.json`),
          JSON.stringify(project, null, 2)
        );
      }
    }

    return brand;
  }

  /**
   * 获取品牌
   */
  getBrand(brandId) {
    const file = path.join(this.brandsPath, `${brandId}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }

  /**
   * 获取品牌（别名）
   */
  getBrands(projectId) {
    return this.listBrands(projectId);
  }

  /**
   * 列出品牌
   */
  listBrands(projectId = null) {
    if (!fs.existsSync(this.brandsPath)) return [];

    let brands = fs.readdirSync(this.brandsPath)
      .filter(f => f.startsWith('brand-') && f.endsWith('.json'))
      .map(f => JSON.parse(fs.readFileSync(path.join(this.brandsPath, f))));

    if (projectId) {
      brands = brands.filter(b => b.projectId === projectId);
    }

    return brands;
  }

  /**
   * 更新品牌
   */
  updateBrand(brandId, updates) {
    const brand = this.getBrand(brandId);
    if (!brand) throw new Error(`品牌 ${brandId} 不存在`);

    const updated = {
      ...brand,
      ...updates,
      id: brand.id, // 防止修改 ID
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(this.brandsPath, `${brandId}.json`),
      JSON.stringify(updated, null, 2)
    );

    return updated;
  }

  /**
   * 删除品牌
   */
  deleteBrand(brandId) {
    const brand = this.getBrand(brandId);
    if (!brand) throw new Error(`品牌 ${brandId} 不存在`);

    // 删除品牌下的所有产品
    const products = this.listProducts(brandId);
    products.forEach(p => this.deleteProduct(p.id));

    // 删除品牌文件
    fs.unlinkSync(path.join(this.brandsPath, `${brandId}.json`));

    // 更新项目
    if (brand.projectId) {
      const project = this.getProject(brand.projectId);
      if (project && project.brands) {
        project.brands = project.brands.filter(id => id !== brandId);
        fs.writeFileSync(
          path.join(this.projectsPath, `${brand.projectId}.json`),
          JSON.stringify(project, null, 2)
        );
      }
    }

    return { success: true, message: `品牌 ${brandId} 已删除` };
  }

  // ==================== 产品管理 ====================

  /**
   * 创建产品
   */
  createProduct(data) {
    const id = `product-${Date.now()}`;
    const product = {
      id,
      brandId: data.brandId,
      name: data.name,
      fullName: data.fullName || data.name,
      category: data.category || '',
      sellingPoints: data.sellingPoints || [],
      scenarios: data.scenarios || [],
      targetAudience: data.targetAudience || [],
      price: data.price || '',
      specs: data.specs || '',
      images: data.images || [],
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(this.productsPath, `${id}.json`),
      JSON.stringify(product, null, 2)
    );

    return product;
  }

  /**
   * 获取产品
   */
  getProduct(productId) {
    const file = path.join(this.productsPath, `${productId}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }

  /**
   * 列出产品
   */
  listProducts(brandId = null) {
    if (!fs.existsSync(this.productsPath)) return [];

    let products = fs.readdirSync(this.productsPath)
      .filter(f => f.startsWith('product-') && f.endsWith('.json'))
      .map(f => JSON.parse(fs.readFileSync(path.join(this.productsPath, f))));

    if (brandId) {
      products = products.filter(p => p.brandId === brandId);
    }

    return products;
  }

  /**
   * 更新产品
   */
  updateProduct(productId, updates) {
    const product = this.getProduct(productId);
    if (!product) throw new Error(`产品 ${productId} 不存在`);

    const updated = {
      ...product,
      ...updates,
      id: product.id,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(this.productsPath, `${productId}.json`),
      JSON.stringify(updated, null, 2)
    );

    return updated;
  }

  /**
   * 删除产品
   */
  deleteProduct(productId) {
    const file = path.join(this.productsPath, `${productId}.json`);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
    return { success: true, message: `产品 ${productId} 已删除` };
  }

  // ==================== 风格管理 ====================

  /**
   * 获取账号风格
   */
  getStyle(accountId) {
    const file = path.join(this.stylesPath, `${accountId}-style.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }

  /**
   * 更新账号风格
   */
  updateStyle(accountId, styleData) {
    const existing = this.getStyle(accountId) || {
      id: `${accountId}-style`,
      accountId,
      learnedStyle: {},
      samples: [],
      createdAt: new Date().toISOString()
    };

    const updated = {
      ...existing,
      learnedStyle: {
        ...existing.learnedStyle,
        ...styleData.learnedStyle
      },
      samples: styleData.samples || existing.samples,
      lastTrainedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(this.stylesPath, `${accountId}-style.json`),
      JSON.stringify(updated, null, 2)
    );

    return updated;
  }

  /**
   * 从历史内容学习风格
   */
  learnFromContent(accountId, contents) {
    // 分析内容特征
    const analysis = {
      avgSentenceLength: 0,
      commonOpenings: [],
      commonClosings: [],
      frequentWords: {},
      emojiCount: 0,
      hashtagCount: 0
    };

    let totalSentences = 0;
    let totalLength = 0;
    const openings = [];
    const closings = [];
    const wordFreq = {};

    contents.forEach(content => {
      const text = content.content || '';
      const sentences = text.split(/[。！？\n]/).filter(s => s.trim());

      sentences.forEach(s => {
        totalLength += s.length;
        totalSentences++;
      });

      // 开场
      if (sentences[0]) openings.push(sentences[0].trim());

      // 结尾
      if (sentences[sentences.length - 1]) closings.push(sentences[sentences.length - 1].trim());

      // 词频（简化版）
      const words = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
      words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });

      // Emoji 统计
      const emojis = text.match(/[\u{1F300}-\u{1F9FF}]/gu) || [];
      analysis.emojiCount += emojis.length;

      // Hashtag 统计
      const hashtags = text.match(/#[^\s#]+/g) || [];
      analysis.hashtagCount += hashtags.length;
    });

    analysis.avgSentenceLength = totalSentences > 0 ? Math.round(totalLength / totalSentences) : 0;
    analysis.commonOpenings = this.getTopItems(openings, 5);
    analysis.commonClosings = this.getTopItems(closings, 5);

    // 高频词排序
    analysis.frequentWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {});

    // 更新风格
    const styleData = {
      learnedStyle: {
        sentenceLength: `${analysis.avgSentenceLength}字/句`,
        openingPatterns: analysis.commonOpenings,
        closingPatterns: analysis.commonClosings,
        keywords: Object.keys(analysis.frequentWords).slice(0, 10),
        emojiUsage: analysis.emojiCount > contents.length ? '常用' : '克制',
        hashtagStyle: analysis.hashtagCount > contents.length * 3 ? '丰富' : '精简'
      },
      samples: contents.slice(0, 10).map(c => ({
        contentId: c.id,
        title: c.title
      }))
    };

    return this.updateStyle(accountId, styleData);
  }

  getTopItems(arr, n) {
    const counts = {};
    arr.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([item]) => item);
  }

  // ==================== 创作记忆 ====================

  /**
   * 获取创作记忆
   */
  getMemory(projectId, accountId = null) {
    const filename = accountId
      ? `${projectId}-${accountId}-memory.json`
      : `${projectId}-memory.json`;
    const file = path.join(this.memoriesPath, filename);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }

  /**
   * 添加记忆条目
   */
  addMemory(projectId, accountId, entry) {
    const memoryId = accountId ? `${projectId}-${accountId}` : projectId;
    const filename = `${memoryId}-memory.json`;
    const file = path.join(this.memoriesPath, filename);

    let memory = this.getMemory(projectId, accountId) || {
      id: memoryId,
      projectId,
      accountId,
      entries: [],
      createdAt: new Date().toISOString()
    };

    memory.entries.push({
      ...entry,
      id: `entry-${Date.now()}`,
      recordedAt: new Date().toISOString()
    });

    memory.updatedAt = new Date().toISOString();

    fs.writeFileSync(file, JSON.stringify(memory, null, 2));

    return memory;
  }

  /**
   * 获取记忆洞察
   */
  getInsights(projectId, accountId = null) {
    const memory = this.getMemory(projectId, accountId);
    if (!memory || !memory.entries.length) {
      return { insights: [], summary: '暂无足够数据' };
    }

    const insights = {
      successPatterns: [],
      revisionPatterns: [],
      taboos: [],
      topPerformers: []
    };

    memory.entries.forEach(entry => {
      if (entry.type === 'success') {
        insights.successPatterns.push(entry.insight);
        if (entry.metrics) {
          insights.topPerformers.push({
            title: entry.title,
            likes: entry.metrics.likes || 0
          });
        }
      } else if (entry.type === 'revision') {
        insights.revisionPatterns.push({
          from: entry.originalApproach,
          to: entry.revisedTo,
          reason: entry.reason
        });
      } else if (entry.type === 'taboo') {
        insights.taboos.push({
          content: entry.content,
          reason: entry.reason
        });
      }
    });

    // 排序 top performers
    insights.topPerformers.sort((a, b) => b.likes - a.likes);
    insights.topPerformers = insights.topPerformers.slice(0, 5);

    return insights;
  }

  // ==================== 知识组装 ====================

  /**
   * 为生成内容组装知识上下文
   */
  assembleContext(options) {
    const { projectId, brandId, productId, accountId, platform } = options;

    const context = {
      brand: null,
      product: null,
      style: null,
      memory: null,
      platformCard: null
    };

    // 加载品牌
    if (brandId) {
      context.brand = this.getBrand(brandId);
    } else if (projectId) {
      const brands = this.listBrands(projectId);
      if (brands.length > 0) context.brand = brands[0];
    }

    // 加载产品
    if (productId) {
      context.product = this.getProduct(productId);
    } else if (context.brand) {
      const products = this.listProducts(context.brand.id);
      if (products.length > 0) context.product = products[0];
    }

    // 加载风格
    if (accountId) {
      context.style = this.getStyle(accountId);
    }

    // 加载记忆
    if (projectId && accountId) {
      context.memory = this.getMemory(projectId, accountId);
    }

    return context;
  }

  /**
   * 将知识上下文转换为提示词
   */
  contextToPrompt(context) {
    let prompt = '';

    if (context.brand) {
      prompt += `\n【品牌信息】\n`;
      prompt += `品牌名：${context.brand.name}\n`;
      if (context.brand.positioning) prompt += `定位：${context.brand.positioning}\n`;
      if (context.brand.tone?.length) prompt += `调性：${context.brand.tone.join('、')}\n`;
      if (context.brand.keywords?.length) prompt += `关键词：${context.brand.keywords.join('、')}\n`;
      if (context.brand.taboos?.length) prompt += `禁止：${context.brand.taboos.join('、')}\n`;
    }

    if (context.product) {
      prompt += `\n【产品信息】\n`;
      prompt += `产品名：${context.product.name}\n`;
      if (context.product.sellingPoints?.length) {
        prompt += `卖点：\n${context.product.sellingPoints.map(p => `- ${p}`).join('\n')}\n`;
      }
      if (context.product.scenarios?.length) {
        prompt += `使用场景：${context.product.scenarios.join('、')}\n`;
      }
    }

    if (context.style?.learnedStyle) {
      const s = context.style.learnedStyle;
      prompt += `\n【写作风格】\n`;
      if (s.sentenceLength) prompt += `句长：${s.sentenceLength}\n`;
      if (s.keywords?.length) prompt += `常用词：${s.keywords.join('、')}\n`;
      if (s.openingPatterns?.length) {
        prompt += `开场风格参考：\n${s.openingPatterns.slice(0, 2).map(p => `- ${p}`).join('\n')}\n`;
      }
      if (s.emojiUsage) prompt += `表情使用：${s.emojiUsage}\n`;
    }

    if (context.memory?.entries?.length) {
      const insights = this.getInsightsFromMemory(context.memory);
      if (insights.taboos?.length) {
        prompt += `\n【注意事项（基于历史反馈）】\n`;
        insights.taboos.slice(0, 3).forEach(t => {
          prompt += `- ${t.content}（${t.reason}）\n`;
        });
      }
    }

    return prompt;
  }

  getInsightsFromMemory(memory) {
    const insights = {
      successPatterns: [],
      taboos: []
    };

    memory.entries.forEach(entry => {
      if (entry.type === 'success' && entry.insight) {
        insights.successPatterns.push(entry.insight);
      } else if (entry.type === 'taboo') {
        insights.taboos.push({
          content: entry.content,
          reason: entry.reason
        });
      }
    });

    return insights;
  }
}

module.exports = KnowledgeManager;
