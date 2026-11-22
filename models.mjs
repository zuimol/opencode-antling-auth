/**
 * 初始模型清单。
 *
 * 百灵开放平台的模型 id 目录以登录后 `/v1/models` 的返回为准（运行
 * `magpie provider models antling` 即可拉取并缓存）。这里的初始清单取自
 * Ant Digital 在各转发渠道公开的 Ling 系列型号，保证插件开箱即用；
 * 拉取成功后 magpie 会以上游目录为准。
 */
export const DEFAULT_BASE_URL = 'https://api.ant-ling.com/v1'

/** Ling 系列公开型号（占位目录，id 以上游 /v1/models 为准） */
export const MODELS = [
  { id: 'ling-3.2-flash', name: 'Ling 3.2 Flash', vision: false, reasoning: true },
  { id: 'ling-3.1-flash', name: 'Ling 3.1 Flash', vision: false, reasoning: true },
  { id: 'ling-3.0-flash-vl', name: 'Ling 3.0 Flash VL', vision: true, reasoning: false },
  { id: 'ling-3.0-flash', name: 'Ling 3.0 Flash', vision: false, reasoning: true },
  { id: 'ling-3.0-tiny', name: 'Ling 3.0 Tiny', vision: false, reasoning: false },
]

/** 保守占位：上游未声明时 magpie 需要的窗口字段 */
const CONTEXT = 131_072
const OUTPUT = 16_384

export function buildModels() {
  return Object.fromEntries(MODELS.map((m) => [m.id, {
    id: m.id,
    name: m.name,
    limit: { context: CONTEXT, input: CONTEXT, output: OUTPUT },
    reasoning: m.reasoning,
    tool_call: true,
    attachment: m.vision,
    modalities: { input: m.vision ? ['text', 'image'] : ['text'], output: ['text'] },
  }]))
}