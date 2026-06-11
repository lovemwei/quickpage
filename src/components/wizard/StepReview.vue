<script setup lang="ts">
import { computed } from 'vue'
import { nanoid } from 'nanoid'
import { useMessage } from 'naive-ui'
import type { PageSpec } from '@/types/analysis'
import { useCreateWizardStore } from '@/stores/createWizard'

const wizard = useCreateWizardStore()
const message = useMessage()

const analysis = computed(() => wizard.analysis)

const topMenus = computed(() => analysis.value?.pages.filter((p) => !p.parentId) ?? [])

function childrenOf(topSpecId: string): PageSpec[] {
  return analysis.value?.pages.filter((p) => p.parentId === topSpecId) ?? []
}

const generateCount = computed(
  () => analysis.value?.pages.filter((p) => !p.groupOnly).length ?? 0,
)

const parentOptions = computed(() => [
  { label: '提升为一级菜单', value: '' },
  ...topMenus.value.map((t) => ({ label: `${t.name} 下`, value: t.id })),
])

function addTopMenu(groupOnly = false) {
  analysis.value?.pages.push({
    id: nanoid(),
    name: groupOnly ? '新分组' : '新页面',
    groupOnly: groupOnly || undefined,
    description: '',
    blocks: [],
  })
}

function addChild(top: PageSpec) {
  const a = analysis.value
  if (!a) return
  const child: PageSpec = { id: nanoid(), name: '新页面', parentId: top.id, description: '', blocks: [] }
  let insertAt = a.pages.findIndex((p) => p.id === top.id) + 1
  for (let i = a.pages.length - 1; i >= 0; i--) {
    if (a.pages[i]!.parentId === top.id) {
      insertAt = i + 1
      break
    }
  }
  a.pages.splice(insertAt, 0, child)
}

function removePage(page: PageSpec) {
  const a = analysis.value
  if (!a) return
  if (!page.parentId && childrenOf(page.id).length > 0) {
    message.warning('该一级菜单下还有二级页面，请先删除或移动它们')
    return
  }
  a.pages = a.pages.filter((p) => p.id !== page.id)
}

function movePage(page: PageSpec, dir: -1 | 1) {
  const a = analysis.value
  if (!a) return
  const ps = a.pages
  const idx = ps.findIndex((p) => p.id === page.id)
  if (idx < 0) return
  const key = ps[idx]!.parentId ?? ''
  let j = idx + dir
  while (j >= 0 && j < ps.length && (ps[j]!.parentId ?? '') !== key) j += dir
  if (j < 0 || j >= ps.length) return
  ;[ps[idx], ps[j]] = [ps[j]!, ps[idx]!]
}

function changeParent(page: PageSpec, parentId: string) {
  page.parentId = parentId || undefined
}

function toggleGroupOnly(page: PageSpec, value: boolean) {
  page.groupOnly = value || undefined
}
</script>

<template>
  <div v-if="analysis">
    <n-card size="small" style="margin-bottom: 16px">
      <n-form label-placement="left" label-width="76" size="small">
        <n-form-item label="产品名称">
          <n-input v-model:value="analysis.productName" style="max-width: 360px" />
        </n-form-item>
        <n-form-item label="产品概述">
          <n-input v-model:value="analysis.overview" type="textarea" :rows="2" />
        </n-form-item>
      </n-form>
    </n-card>

    <div class="list-head">
      <n-text depth="2" style="font-size: 13px">
        菜单结构（{{ topMenus.length }} 个一级菜单，共 {{ generateCount }} 个页面待生成）
      </n-text>
      <n-space size="small">
        <n-button size="small" dashed @click="addTopMenu(false)">+ 一级菜单</n-button>
        <n-button size="small" dashed @click="addTopMenu(true)">+ 分组（不生成页面）</n-button>
      </n-space>
    </div>

    <div v-for="top in topMenus" :key="top.id" class="menu-block">
      <div class="menu-row top" :class="{ 'group-only': top.groupOnly }">
        <n-tag size="small" :bordered="false" :type="top.groupOnly ? 'default' : 'primary'">
          {{ top.groupOnly ? '分组' : '一级' }}
        </n-tag>
        <n-input v-model:value="top.name" size="small" style="width: 170px" placeholder="菜单名" />
        <n-checkbox
          size="small"
          :checked="!!top.groupOnly"
          @update:checked="(v: boolean) => toggleGroupOnly(top, v)"
        >
          仅分组
        </n-checkbox>
        <n-input
          v-if="!top.groupOnly"
          v-model:value="top.description"
          size="small"
          style="flex: 1"
          placeholder="页面用途描述"
        />
        <div v-else style="flex: 1" />
        <n-button size="tiny" quaternary title="上移" @click="movePage(top, -1)">↑</n-button>
        <n-button size="tiny" quaternary title="下移" @click="movePage(top, 1)">↓</n-button>
        <n-button size="tiny" quaternary type="primary" @click="addChild(top)">+ 二级</n-button>
        <n-popconfirm @positive-click="removePage(top)">
          <template #trigger>
            <n-button size="tiny" quaternary type="error">删除</n-button>
          </template>
          删除「{{ top.name }}」？
        </n-popconfirm>
      </div>
      <div v-if="!top.groupOnly" class="blocks-row">
        <n-dynamic-tags v-model:value="top.blocks" size="small" />
      </div>

      <div v-for="child in childrenOf(top.id)" :key="child.id" class="child-wrap">
        <div class="menu-row child">
          <span class="indent">└</span>
          <n-tag size="small" :bordered="false">二级</n-tag>
          <n-input
            v-model:value="child.name"
            size="small"
            style="width: 150px"
            placeholder="页面名"
          />
          <n-input
            v-model:value="child.description"
            size="small"
            style="flex: 1"
            placeholder="页面用途描述"
          />
          <n-select
            :value="child.parentId ?? ''"
            size="small"
            :options="parentOptions"
            style="width: 150px"
            @update:value="(v: string) => changeParent(child, v)"
          />
          <n-button size="tiny" quaternary title="上移" @click="movePage(child, -1)">↑</n-button>
          <n-button size="tiny" quaternary title="下移" @click="movePage(child, 1)">↓</n-button>
          <n-popconfirm @positive-click="removePage(child)">
            <template #trigger>
              <n-button size="tiny" quaternary type="error">删除</n-button>
            </template>
            删除「{{ child.name }}」？
          </n-popconfirm>
        </div>
        <div class="blocks-row child-blocks">
          <n-dynamic-tags v-model:value="child.blocks" size="small" />
        </div>
      </div>
    </div>

    <n-alert v-if="!generateCount" type="warning" :bordered="false" style="margin-top: 14px">
      当前没有待生成的页面，请至少保留一个非分组页面
    </n-alert>
  </div>
</template>

<style scoped>
.list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.menu-block {
  border: 1px solid var(--qp-border);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
}

.menu-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-row.top.group-only {
  opacity: 0.85;
}

.blocks-row {
  margin: 8px 0 2px 52px;
}

.child-wrap {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--qp-border);
}

.indent {
  color: var(--qp-text-faint);
  margin-left: 12px;
}

.child-blocks {
  margin-left: 76px;
}
</style>
