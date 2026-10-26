# 装小果 AI · 苏州装修 GEO 图文工作流

输入一批装修关键词，每个关键词生成一组 **3 张或 4 张装修图片 + 配套文案**。

例如：

```text
苏州装修公司哪家好
苏州靠谱装修公司怎么选
苏州旧房翻新注意事项
```

每组包括：

- 3 张图：客厅、餐厅、卧室；或 4 张图：再加厨房。
- 1 个发布标题、3 条可选中文发布文案、每张图对应的配文，以及咨询引导语。
- 独立预览、逐项复制、图片下载、整组 ZIP 下载（JPEG 图片 + 文案.txt + 说明.txt）。

支持每批最多 10 个不同关键词，按行输入并自动去重。默认城市苏州，也可以修改。可选择装修风格、图片用途，并提供真实公司名称和资料。未提供资料时，输出装修公司甄选指南，不编造推荐榜单、口碑、报价、案例或公司排名。内容结构面向 GEO 问题解答，不保证 AI 引用、推荐或搜索排名。

## 本地运行

需要 Node.js 22+ 和 npm。

```bash
npm ci
cp .env.example .env.local
# 用编辑器在 .env.local 填写 OPENAI_API_KEY
npm run dev
```

在本机浏览器访问开发服务的 3000 端口。没有密钥仍可查看界面，生成时会明确提示配置缺失，不会伪造 AI 结果。首页插画只是风格示意。

| 服务端变量 | 作用 |
| --- | --- |
| OPENAI_API_KEY | 必填，OpenAI 项目密钥 |
| OPENAI_TEXT_MODEL | 默认 `gpt-4.1-mini`，要求支持 Responses API 和结构化输出 |
| OPENAI_IMAGE_MODEL | 默认 `gpt-image-2.5-sunburst`，要求支持 Images API、JPEG、base64 输出 |

密钥仅由服务端读取，不得放入 `NEXT_PUBLIC_` 变量、客户端代码或 Git。`.env*` 已忽略，只允许提交不含真实密钥的 `.env.example`。修改变量后重启本地服务或重新部署。

## 使用工作流

1. 一行一个关键词，输入一批苏州装修问题。
2. 选择每组 3 张或 4 张图片、风格、图片用途。图中文字单独提供，方便自行排版。
3. 可展开公司资料，填写可核实的公司信息，所有关键词共享这份资料。
4. 点击生成；系统逐组运行，每组最多同时请求 2 个素材，进度实时显示。
5. 检查每组图片和文案，复制或整组下载 ZIP。发布前核实事实，不把 AI 设计图当成真实完工案例。

图片和文案分别请求，单张图片响应受大小预算保护，避免多图 base64 合并响应超过 Vercel 限制。JPEG 使用 80% 压缩。部分生成失败不会丢弃成功内容；使用“只补生成未完成项”重试单组，或“继续所有未完成项”恢复整批。成功项不会重复生成。

“停止后续生成”会取消客户端请求并停止排队；已发出的上游请求可能仍产生费用。重新点击主生成按钮会建立新批次，请先下载已有结果。结果仅保留在本页内存，刷新或关闭页面会丢失；没有数据库、跨设备历史或后台持久任务。

## 模型与接口核对

2026-10-26 OpenAI 文档站返回 HTTP 403，改为核对官方 SDK 最新源码：

- [Images API 及模型声明](https://github.com/openai/openai-node/blob/master/src/resources/images.ts)
- [文本模型声明](https://github.com/openai/openai-node/blob/master/src/resources/shared.ts)
- [结构化输出 helper](https://github.com/openai/openai-node/blob/master/src/helpers/zod.ts)
- [Responses API 文档](https://developers.openai.com/api/docs/api-reference/responses)

文本使用 `client.responses.parse` + `zodTextFormat`，要求逐图配文数量和图片数量一致；图片使用 `client.images.generate`，每次 `n: 1`，读取 `b64_json`，不传 GPT 图片模型不支持的 `response_format`。图片按序传入不同空间主题，同组共享风格和色调；各张图是独立生成，不保证同一住宅的精确空间连续性。

默认模型来自 SDK 声明，不代表你的账户一定有权限。图片模型 `gpt-image-1` 在当前官方声明中已标记停用，未用作默认模型。配置密钥后运行：

```bash
npm run check:models
```

该命令使用 `.env.local` 和 Models API 检查模型可见性，不打印密钥、不生成图片。模型可见仍不代表生成权限；请从页面生成一组，检查图片、配文、复制和 ZIP 下载。真实生成需要有效额度、模型权限和 `api.openai.com` HTTPS 访问，并产生费用。

## 检查与生产运行

```bash
npm test
npm run build
npm run typecheck
npm start
```

自动测试覆盖 3/4 图校验、关键词去重和限制、逐图配文数量、单素材生成、大小保护、队列并发、部分失败后仅补未完成项和停止行为。实际 API 验证需要密钥，自动化替身测试不等于真实 OpenAI 调用成功。

`POST /api/generate` 请求：

```json
{
  "keyword": "苏州装修公司哪家好",
  "city": "苏州",
  "style": "现代简约",
  "usage": "小红书配图",
  "imageCount": 4,
  "companyName": "",
  "companyFacts": "",
  "task": "image",
  "imageIndex": 0
}
```

- `task: "copy"` 返回 `{ copy: { title, copies, imageCaptions, consultation } }`。
- `task: "image"` 返回 `{ image: "data:image/jpeg;base64,..." }`，imageIndex 从 0 开始，小于 imageCount。
- 每次只生成一个素材，批次由前端队列协调，不向服务端提交整个批次。
- 非法输入 400，跨站请求 403，超过 8KB 413，无密钥 503，上游生成失败 502；错误不会透出密钥或上游原始错误。
- 文本请求设置 `store: false`，服务端不记录提示词或公司资料。

## 部署到 Vercel

1. 把项目提交并推送到 GitHub 仓库，空仓库不需要预先存在 main。
2. Vercel → Add New → Project → 导入仓库，框架选择 Next.js。
3. 根目录选择包含 package.json 的目录；构建命令使用 `npm run build`。
4. Settings → Environment Variables 配置 `OPENAI_API_KEY` 和可选模型变量，按需为 Production / Preview / Development 分别设置。
5. Deploy，修改变量后重新部署。API 为 Node.js runtime，`maxDuration = 180` 秒；所选套餐应支持该时长。
6. 实际生成一组，检查逐图配文、剪贴板复制、JPEG 和 ZIP 下载。

当前没有账号、支付或持久化限流。公开运营前应使用 Vercel Deployment Protection 或身份验证与限流控制生成费用；同源检查不能阻止直接 HTTP 调用。本项目不自动发布、不自动检索外部公司资料，也不生成虚假公司测评。

## GitHub 仓库

当前目录是 `/workspace/zhuangxiugeo`，已有 origin 指向 `tongchong604-bit/zhuangxiugeo`。此前消息中的 `zhuangxiuguo` 与实际远端不同，未擅自改远端。

确认目标仓库后，在有写权限的终端执行：

```bash
git status --short
# 确认没有真实密钥或 .env.local 被暂存
git add .
git commit -m "feat: add decoration GEO batch content workflow"
git push -u origin HEAD:main
```

如已有本地提交，跳过无变更的 commit；如果目标是其他仓库，先确认并修改 origin。不要强制推送覆盖已有提交。

## 文件结构

- `app/page.tsx`：批量输入、配置、逐组调度、进度、停止与恢复。
- `components/group-card.tsx`：每组图片与文案、复制、JPEG 与 ZIP 下载。
- `app/api/generate/route.ts`：服务端单素材 API。
- `lib/openai.ts`：服务端 OpenAI 调用与装修 GEO 提示词。
- `lib/schema.ts`：输入、文案、图片数量与图片序号校验。
- `lib/workflow.ts`：关键词解析、双并发队列、失败重试和状态。
- `lib/generate.ts`：素材生成与响应大小保护。
- `tests/generate.test.ts`：工作流回归测试。
- `scripts/check-models.mjs`：项目模型可见性检查。
- `.env.example`、`package-lock.json`：密钥模板和依赖锁定。
