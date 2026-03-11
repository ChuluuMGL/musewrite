/**
 * AI-Writer Type Definitions
 */

export interface Draft {
  title: string;
  content: string;
  tags: string[];
  platform: string;
  account?: string;
  image?: ImageResult;
  quality?: QualityResult;
  rawContent?: string;
  createdAt?: string;
}

export interface ImageResult {
  filename: string;
  path: string;
  url?: string;
  width: number;
  height: number;
}

export interface QualityResult {
  score: number;
  issues: string[];
  warnings: string[];
}

export interface CardConfig {
  type: 'source' | 'info' | 'style' | 'platform';
  name: string;
  content: string;
  path?: string;
}

export interface InfoCard {
  name: string;
  account: string;
  platform?: string;
  position?: string;
  background?: string;
  audience?: AudienceProfile;
  brandAssets?: BrandAssets;
}

export interface AudienceProfile {
  age: string;
  occupation: string;
  painPoints: string[];
}

export interface BrandAssets {
  catchphrase?: string;
  signatureExpressions?: string[];
}

export interface StyleCard {
  name: string;
  tone: 'casual' | 'professional' | 'humorous' | 'storytelling';
  pronoun: 'first' | 'second' | 'third';
  vocabulary: 'colloquial' | 'formal';
  features: string[];
  template?: string;
}

export interface PlatformCard {
  name: string;
  type: 'image-text' | 'video' | 'long-form';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  titleLimit: number;
  contentLimit: number;
  imageSpecs: ImageSpecs;
  videoSpecs?: VideoSpecs;
  rules: string[];
}

export interface ImageSpecs {
  count: string;
  ratio: string;
  width?: number;
  height?: number;
}

export interface VideoSpecs {
  duration: string;
  ratio: string;
  size?: string;
}

export interface LLMConfig {
  provider: 'ollama' | 'openai' | 'claude' | 'zhipu' | 'deepseek' | 'volcengine' | 'gemini' | 'mock';
  endpoint?: string;
  model: string;
  apiKey?: string;
}

export interface GenerateOptions {
  source: string;
  platform: string;
  info?: string;
  style?: string;
  withImage?: boolean;
  checkFeedback?: boolean;
}

export interface Feedback {
  id: string;
  draft: string;
  problem: string;
  suggestion: string;
  type?: string;
  account?: string;
  category: string;
  status: 'new' | 'reviewed' | 'applied';
  date: string;
}

export interface FeedbackAnalysis {
  totalFeedbacks: number;
  rules: ExtractedRule[];
  categoryStats: Record<string, { count: number }>;
}

export interface ExtractedRule {
  category: string;
  rule: string;
  frequency: number;
  lastSeen: string;
}

export interface QualityScore {
  scores: {
    title: number;
    content: number;
    completeness: number;
    readability: number;
    engagement: number;
  };
  total: number;
  threshold: number;
  pass: boolean;
  suggestions: string[];
}

export interface TaskQueueItem {
  id: string;
  type: 'generate' | 'publish' | 'image';
  status: 'pending' | 'running' | 'completed' | 'failed';
  data: Record<string, unknown>;
  result?: unknown;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CLIOption {
  name: string;
  alias?: string;
  type: 'string' | 'boolean' | 'number';
  description: string;
  default?: unknown;
}
