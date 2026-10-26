# 装小果 AI Implementation Plan

Goal: 按用户给定九项要求实现可运行的中文装修营销网站。
Architecture: Next.js App Router + TypeScript；浏览器只向同源 API 发送装修需求；服务端使用 OpenAI Responses 和 Images API。模型通过服务端变量配置。

- [x] 创建项目配置和锁文件，使用现有空仓库，不依赖 main。
- [x] 测试并实现输入校验、结构化三条营销文案和并行图片生成；失败允许保留成功部分，错误不泄露上游详情或密钥。
- [x] 实现响应式表单、风格、用途、结果预览、复制和下载。
- [x] 写密钥与 Vercel 部署文档，运行测试、类型检查、生产构建和 HTTP 冒烟检查。

Review focus: 空/超长输入；无密钥；上游超时/权限失败；部分生成失败；前端无服务端密钥。

## 验证记录

- npm test: 6/6 通过。
- npm run build: 生产构建通过；npm run typecheck 通过。
- HTTP: 首页 200；无效输入 400；无密钥 503；超过 8KB 输入 413；跨站或非法 Origin 403。
- Chromium 浏览器: 同源提交、缺密钥提示、风格与用途选择、测试数据结果渲染、真实剪贴板复制、JPEG 下载、390px 手机宽度无横向溢出、无页面运行时异常。
- 真实 OpenAI 调用未执行：当前未提供 OPENAI_API_KEY。模型访问须用户安全配置后验证。
- 独立审查发现 PNG base64 响应过大的 Vercel 风险；已改为 JPEG 压缩并加入 4,000,000 字符预算与回归测试。
- 浏览器发现 Next 内部地址引起同源校验误拦截；已改为比较 Origin 与实际 Host，并通过同源、跨源及畸形 Origin 测试。
- Ruling: 用户写 zhuangxiuguo，实际检出/远端为 zhuangxiugeo；按当前项目指令在已有目录实现，未擅自修改远端或推送。
