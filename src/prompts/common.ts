export function buildRepairPrompt(error: string): string {
  return `你上面的输出无法解析（错误：${error}）。请重新输出完整、合法的结果：从头开始完整输出，不要续写上一次的内容，不要任何解释，严格遵守 system 中规定的输出格式。`
}
