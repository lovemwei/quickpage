export interface PageSpec {
  id: string
  name: string
  /** 上级一级菜单的 PageSpec.id；为空表示自身是一级菜单 */
  parentId?: string
  /** 仅作为导航分组（一级），不生成页面 */
  groupOnly?: boolean
  description: string
  blocks: string[]
}

export interface RequirementAnalysis {
  productName: string
  overview: string
  targetUsers?: string
  /** 两级菜单结构的页面清单：parentId 为空的是一级菜单，其余为二级 */
  pages: PageSpec[]
}
