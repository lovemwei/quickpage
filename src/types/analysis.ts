export interface ModuleSpec {
  id: string
  name: string
  description: string
}

export interface PageSpec {
  id: string
  name: string
  moduleId: string
  description: string
  blocks: string[]
}

export interface RequirementAnalysis {
  productName: string
  overview: string
  targetUsers?: string
  modules: ModuleSpec[]
  pages: PageSpec[]
}
