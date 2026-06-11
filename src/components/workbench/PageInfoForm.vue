<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useMessage } from 'naive-ui'
import type { PageSpec } from '@/types/analysis'
import { useWorkbenchStore } from '@/stores/workbench'

const wb = useWorkbenchStore()
const message = useMessage()

const form = reactive<PageSpec>({ id: '', name: '', description: '', blocks: [] })
const parentChoice = ref('')

watch(
  () => wb.selectedPage,
  (page) => {
    if (!page) return
    Object.assign(form, JSON.parse(JSON.stringify(page.spec)) as PageSpec)
    form.parentId = page.spec.parentId
    form.groupOnly = page.spec.groupOnly
    parentChoice.value = page.spec.parentId ?? ''
  },
  { immediate: true },
)

const hasChildren = computed(() =>
  wb.pages.some((p) => p.spec.parentId === wb.selectedPage?.spec.id),
)

const parentOptions = computed(() => [
  { label: '一级菜单（无上级）', value: '' },
  ...wb.pages
    .filter((p) => !p.spec.parentId && p.spec.id !== wb.selectedPage?.spec.id)
    .map((p) => ({ label: p.spec.name, value: p.spec.id })),
])

function specKey(s: PageSpec): string {
  return JSON.stringify([s.name, s.parentId ?? '', !!s.groupOnly, s.description, s.blocks])
}

const dirty = computed(() => {
  const spec = wb.selectedPage?.spec
  if (!spec) return false
  return specKey(spec) !== specKey({ ...form, parentId: parentChoice.value || undefined })
})

async function save(regenerate: boolean) {
  if (!form.name.trim()) {
    message.error('页面名不能为空')
    return
  }
  const spec: PageSpec = JSON.parse(
    JSON.stringify({ ...form, parentId: parentChoice.value || undefined }),
  ) as PageSpec
  await wb.updateSelectedSpec(spec)
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
        <n-form-item label="菜单层级">
          <n-space vertical size="small" style="width: 100%">
            <n-select
              v-model:value="parentChoice"
              :options="parentOptions"
              :disabled="hasChildren"
            />
            <n-text v-if="hasChildren" depth="3" style="font-size: 11px">
              该菜单下有二级页面，不能改为二级
            </n-text>
          </n-space>
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
