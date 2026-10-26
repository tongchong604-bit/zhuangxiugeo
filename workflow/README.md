# 在 Codex 里自己用：不接 API 的个人工作流

把这个仓库作为 Codex 项目打开，项目根目录的 AGENTS.md 会告诉 Codex 如何执行任务。没有 API 密钥输入框，不需要 Vercel，不会自动调用网站的 OpenAI API。

你只要在项目对话中说：

> 按项目工作流处理下面关键词，每组 3 张图，现代简约风。关键词：苏州装修公司哪家好、苏州旧房翻新注意事项。没有指定公司，写甄选指南。

Codex 按规划、文案、配图、审核、导出五项任务工作。资料和进度共享在磁盘，支持中断后继续；不是额外安装的 Memory 集成，也不会自动在 Codex 桌面端创建左侧聊天任务。

## 工具与费用

文案由当前 Codex 对话完成；图片由当前会话实际可用的图片生成工具完成。能否使用、订阅是否包含、剩余额度由你的账户和客户端决定，不能保证所有 Codex 客户端支持图片工具或承诺免费无限量。若当前工具不可用，会保留文案、图片提示词和任务进度，明确停在“等待图片”。

个人流程不调用 OpenAI API，因此不要求 API 充值；原网站仍是另一套需要 API 额度的运行方式。若网站不再使用，可以暂停 Vercel 项目，不影响这里的文件工作流。

## 文件与状态

```text
content-workspace/              # 已忽略，不随 Git 提交
  company.json                  # 真实公司资料，允许留空
  批次名/
    batch.json                  # 固定的任务需求与组号
    index.html                  # 本地静态图文看板
    01/
      brief.json
      文案任务.md
      copy.json                 # 文案任务完成后产生
      prompts/01.txt            # 逐图提示词
      images/01.png             # 实际生成后归档
      review.json               # 实际审核后产生
      发布文案.md               # 导出时产生
    exports/第01组.zip
```

状态由实际文件推导：等待文案 → 等待图片 → 等待审核 → 审核通过。代码不会把待办或占位图记为完成。修改文案或图片后审核自动失效；brief.json 是批次需求快照，直接修改会阻止审核和导出，需要新建批次。所有组审核通过后才能导出整批成品。

## 手动命令（通常由 Codex 执行）

```bash
npm ci
npm run workflow -- init
# 根据需要编辑 content-workspace/company.json；不要填客户隐私或密钥
npm run workflow -- plan --keywords workflow/templates/keywords.example.txt --name suzhou-001 --count 3
npm run workflow -- status --batch suzhou-001
```

文案和图片由 Codex 实际工具产出，CLI 本身不调用模型：

```bash
npm run workflow -- copy --batch suzhou-001 --group 01 --file /实际路径/copy.json
npm run workflow -- attach --batch suzhou-001 --group 01 --index 1 --file /实际路径/image.png
# 其余图片按 index 2、3、4 归档
npm run workflow -- review --batch suzhou-001 --group 01 --note '填写已实际检查的内容'
npm run workflow -- export --batch suzhou-001
npm run workflow -- board --batch suzhou-001
```

用文件浏览器打开批次中的 index.html 即可看图文，不需要启动 Next.js。这是本地静态看板，命令执行后会更新文件；没有云端同步。可以将 ZIP 解压后自行发布，发布前核实事实。默认输出不随 Git 上传，应自行备份。

参数 `--workspace` 可指定其他资料目录，`--city` 和 `--style` 覆盖建批次时的默认设置。批次名只能使用文字、数字、短横线或下划线，已存在的同名批次不会覆盖。attach 默认保留已有图片；明确要换图时加 `--replace`，之后需要重审。
