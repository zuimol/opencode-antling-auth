/**
 * 蚂蚁百灵（Ant Ling）的 magpie / OpenCode v1 供应商插件。
 *
 * 平台：https://chat.ant-ling.com （API 控制台 /platform/api）
 * 端点：https://api.ant-ling.com/v1 （OpenAI 兼容：/v1/chat/completions、/v1/models）
 * 鉴权：Authorization: Bearer <API Key>
 *
 * ## 它做什么
 *
 *   1. `config` 钩子声明供应商 `antling` 与初始模型清单；
 *   2. `auth.methods` 提供标准 API Key 录入（authorize 会真实请求
 *      /v1/models 校验 key，只读接口、不消耗余额）；
 *   3. `auth.loader` 把 key 交给 magpie，按 @ai-sdk/openai-compatible
 *      发 `Authorization: Bearer <key>`。
 *
 * ## 模型清单
 *
 * 百灵的公开模型 id 目录不固定，config 里给的是初始清单；装好插件后运行
 *
 *     magpie provider models antling
 *
 * magpie 会从上游 `/v1/models` 拉取真实目录（需要已登录）。
 */
import { buildModels, DEFAULT_BASE_URL } from './models.mjs'

export const PROVIDER = 'antling'

export default async function AntLingPlugin(input = {}) {
  const opts = input?.magpie?.options ?? input?.magpie?.option ?? {}
  const baseUrl = String(
    opts.baseUrl ??
    opts.baseURL ??
    globalThis.process?.env?.ANT_LING_BASE_URL ??
    DEFAULT_BASE_URL,
  ).replace(/\/+$/, '')

  return {
    // ------------------------------------------------------------ 供应商与模型
    config: async (cfg) => {
      cfg.provider ??= {}
      // ??=：不覆盖用户在 magpie 里已有的 antling 配置
      cfg.provider[PROVIDER] ??= {
        name: '百灵 Ant Ling',
        npm: '@ai-sdk/openai-compatible', // chat completions
        api: baseUrl,
        models: buildModels(),
      }
    },

    // ---------------------------------------------------------------- 登录
    auth: {
      provider: PROVIDER,
      maxConcurrency: 8,

      methods: [
        {
          type: 'api',
          label: 'API Key（百灵开放平台）',
          placeholder: 'ant-ling-…',
          async authorize(inputs) {
            const key =
              typeof inputs === 'string'
                ? inputs.trim()
                : String(inputs?.key ?? inputs?.apiKey ?? '').trim()
            if (key.length === 0) {
              return { type: 'failed', error: '需要粘贴百灵 API Key（chat.ant-ling.com/platform/api → 密钥管理）' }
            }

            // 真实校验：/v1/models 需要鉴权、只读、不消耗余额。
            try {
              const res = await fetch(`${baseUrl}/models`, {
                headers: { Authorization: `Bearer ${key}` },
                signal: AbortSignal.timeout(15_000),
              })
              if (res.ok) {
                let count
                try {
                  const body = await res.json()
                  count = Array.isArray(body?.data) ? body.data.length : undefined
                } catch { /* 保留成功结果即可 */ }
                return {
                  type: 'success',
                  key,
                  metadata: {
                    accountName: '百灵 API Key',
                    models: count,
                    baseUrl,
                  },
                }
              }
              const bodyText = await res.text().catch(() => '')
              if (res.status === 401) {
                return { type: 'failed', error: `API Key 无效（${codeOf(bodyText) || '401'}）——请到 chat.ant-ling.com/platform/api 重新复制` }
              }
              return { type: 'failed', error: `上游返回 HTTP ${res.status}：${bodyText.slice(0, 200)}` }
            } catch (error) {
              return { type: 'failed', error: `网络错误：${error?.message ?? error}` }
            }
          },
        },
      ],

      /** 每个账号的请求参数：OpenAI 兼容，Bearer 即可 */
      async loader(getAuth) {
        const auth = await getAuth()
        const key = typeof auth?.key === 'string' ? auth.key : ''
        if (key.length === 0) {
          const error = new Error('百灵：未登录（缺少 API Key）')
          error.signIn = 'required'
          throw error
        }
        return { baseURL: baseUrl, apiKey: key }
      },
    },
  }
}

function codeOf(bodyText) {
  try {
    const j = JSON.parse(bodyText)
    return j?.error?.code ?? j?.code ?? ''
  } catch { return '' }
}