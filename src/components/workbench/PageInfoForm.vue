<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useMessage } from 'naive-ui'
import type { PageSpec } from '@/types/analysis'
import { useWorkbenchStore } from '@/stores/workbench'

const wb = useWorkbenchStore()
const message = useMessage()

const form = reactive<PageSpec>({ id: '', name: '', moduleId: '', description: '', blocks: [] })

watch(
  () => wb.selectedPage,
  (page) => {
    if (!page) return
    Object.assign(form, JSON.parse(JSON.stringify(page.spec)) as PageSpec)
  },
  { immediate: true, deep: false },
)

const moduleOptions = computed(
  () => wb.project?.analysis?.modules.map((m) => ({ label: m.name, value: m.id })) ?? [],
)

const dirty = computed(() => {
  const spec = wb.selectedPage?.spec
  if (!spec) return false
  return JSON.stringify(spec) !== JSON.stringify(form)
})

async function save(regenerate: boolean) {
  if (!form.name.trim()) {
    message.error('页面名不能为空')
    return
  }
  await wb.updateSelectedSpec(JSON.parse(JSON.stringify(form)) as PageSpec)
  message.success('已保存')
  if (regenerate) wb.regenerateSelected()
}
</script>

<template>
  <div class="page-info">
    <n-empty v-if="!wb.selectedPage" size="small" description="未选择页面" style="margin-top: 40px" />
    <template v-else>
      <n-form label-placement="top" size="small">
        <n-form-item label="页面名称">
          <n-input v-model:value="form.name" />
        </n-form-item>
        <n-form-item label="所属模块">
          <n-select v-model:value="form.moduleId" :options="moduleOptions" />
        </n-form-item>
        <n-form-item label="页面描述">
          <n-input v-model:value="form.description" type="textarea" :rows="3" />
        </n-form-item>
        <n-form-item label="内容区块（从上到下）">
          <n-dynamic-tags v-model:value="form.blocks" />
        </n-form-item>
      </n-form>
      <n-space vertical size="small">
        <n-button size="small" block :disabled="!dirty" @click="save(false)">保存</n-button>
        <n-button size="small" block type="primary" secondary @click="save(true)">
          保存并重新生成
        </n-button>
        <n-text depth="3" style="font-size: 11px">修改页面信息后需重新生成才会体现在设计图中</n-text>
      </n-space>
    </template>
  </div>
</template>

<style scoped>
.page-info {
  padding: 14px;
  height: 100%;
  overflow: auto;
}
</style>
