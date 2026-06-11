<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDialog, useMessage } from 'naive-ui'
import type { Project } from '@/types/project'
import { projectRepo, pageRepo } from '@/services/storage/repositories'
import { getStylePreset } from '@/data/stylePresets'
import { formatTime } from '@/utils/format'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const dialog = useDialog()
const message = useMessage()
const settings = useSettingsStore()

const projects = ref<Project[]>([])
const pageCounts = ref(new Map<string, number>())
const loading = ref(true)

const renameShow = ref(false)
const renameTarget = ref<Project | null>(null)
const renameValue = ref('')

async function refresh() {
  loading.value = true
  try {
    projects.value = await projectRepo.list()
    const counts = new Map<string, number>()
    for (const p of projects.value) {
      counts.set(p.id, (await pageRepo.listByProject(p.id)).length)
    }
    pageCounts.value = counts
  } finally {
    loading.value = false
  }
}

function confirmRemove(project: Project) {
  dialog.warning({
    title: '删除项目',
    content: `删除「${project.name}」及其全部页面、版本历史与文档？此操作不可恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await projectRepo.removeCascade(project.id)
      message.success('已删除')
      await refresh()
    },
  })
}

function openRename(project: Project) {
  renameTarget.value = project
  renameValue.value = project.name
  renameShow.value = true
}

async function submitRename() {
  const name = renameValue.value.trim()
  if (!name || !renameTarget.value) return
  await projectRepo.update(renameTarget.value.id, { name })
  renameShow.value = false
  await refresh()
}

onMounted(refresh)
</script>

<template>
  <div class="project-list-page">
    <header class="page-head">
      <div>
        <h1 class="title">快页 <span class="title-en">QuickPage</span></h1>
        <n-text depth="3">上传需求文档，自动理解需求并批量生成统一风格的高保真原型</n-text>
      </div>
      <n-space>
        <n-button
          quaternary
          :title="settings.appTheme === 'dark' ? '切换到浅色' : '切换到深色'"
          @click="settings.toggleAppTheme()"
        >
          {{ settings.appTheme === 'dark' ? '🌙' : '☀️' }}
        </n-button>
        <n-button quaternary @click="router.push('/settings')">设置</n-button>
        <n-button type="primary" @click="router.push('/project/new')">+ 新建项目</n-button>
      </n-space>
    </header>

    <n-spin v-if="loading" style="margin: 80px auto; display: block" />

    <n-empty
      v-else-if="!projects.length"
      description="还没有项目"
      style="margin-top: 100px"
      size="large"
    >
      <template #extra>
        <n-button type="primary" @click="router.push('/project/new')">创建第一个项目</n-button>
      </template>
    </n-empty>

    <div v-else class="card-grid">
      <n-card
        v-for="p in projects"
        :key="p.id"
        size="small"
        hoverable
        class="project-card"
        @click="router.push(`/project/${p.id}`)"
      >
        <template #header>
          <span
            class="proj-dot"
            :style="{ background: p.styleSpec.tokens.primaryColor }"
          />
          {{ p.name }}
        </template>
        <template #header-extra>
          <n-tag size="small" :bordered="false">
            {{ p.platform === 'pc' ? 'PC' : 'H5' }}
          </n-tag>
        </template>
        <n-space vertical size="small">
          <n-text depth="3" style="font-size: 12px">
            {{ getStylePreset(p.styleSpec.presetId)?.name ?? '自定义风格' }}
            · {{ pageCounts.get(p.id) ?? 0 }} 个页面
          </n-text>
          <n-text depth="3" style="font-size: 12px">
            更新于 {{ formatTime(p.updatedAt) }}
          </n-text>
        </n-space>
        <template #action>
          <n-space justify="end" size="small" @click.stop>
            <n-button size="tiny" quaternary @click="openRename(p)">重命名</n-button>
            <n-button size="tiny" quaternary type="error" @click="confirmRemove(p)">删除</n-button>
          </n-space>
        </template>
      </n-card>
    </div>

    <n-modal v-model:show="renameShow" preset="card" title="重命名项目" style="width: 400px">
      <n-input v-model:value="renameValue" @keyup.enter="submitRename" />
      <template #footer>
        <n-space justify="end">
          <n-button @click="renameShow = false">取消</n-button>
          <n-button type="primary" :disabled="!renameValue.trim()" @click="submitRename">
            保存
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.project-list-page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 32px 24px;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 28px;
}

.title {
  margin: 0 0 4px;
  font-size: 22px;
}

.title-en {
  font-size: 15px;
  font-weight: 500;
  opacity: 0.55;
  margin-left: 2px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.project-card {
  cursor: pointer;
}

.proj-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
}
</style>
