import type { RequirementAnalysis } from './analysis'
import type { ModelSelection } from './provider'

export type Platform = 'pc' | 'mobile'

export interface DesignTokens {
  primaryColor: string
  /** 辅助/强调色，可选 */
  accentColor?: string
  neutralTone: 'gray' | 'slate' | 'zinc' | 'stone' | 'neutral'
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full'
  fontFamily: 'system' | 'serif' | 'rounded'
  density: 'compact' | 'comfortable' | 'spacious'
  colorMode: 'light' | 'dark'
}

/** 布局容器：PC 用前 5 项，移动端用 auto + 后 3 项 */
export type LayoutMode =
  | 'auto'
  | 'side-nav'
  | 'top-nav'
  | 'mixed-nav'
  | 'none'
  | 'bottom-tab'
  | 'top-bar'
  | 'immersive'

export interface StyleSpec {
  /** 内置预设 id；'custom' 表示完全自定义风格 */
  presetId: string
  tokens: DesignTokens
  layout?: LayoutMode
  /** 布局的补充说明 */
  layoutNotes?: string
  /** presetId 为 'custom' 时的自定义风格描述 */
  customStyleText?: string
  /** 风格补充要求 */
  customNotes?: string
}

export interface Project {
  id: string
  name: string
  platform: Platform
  styleSpec: StyleSpec
  analysis?: RequirementAnalysis
  modelOverride?: Partial<ModelSelection>
  createdAt: number
  updatedAt: number
}
