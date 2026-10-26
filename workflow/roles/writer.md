# 文案任务

带字三卡模式先读 `workflow/production-preferences.md`：顺序为关键词封面、公司选择参考、业主问题；不套用下文空间效果图的固定场景和纯图规则。不同组的图文必须体现明显差异。

读取本组 brief.json 和 company.json；后者或任务需求有更新时应新建批次，避免混用资料。

输出 copy.json，字段为 title、copies（恰好 3 条）、imageCaptions（恰好 3 或 4 条，等于图片数）、consultation。每条正文约 100–180 中文字，三个角度分别为甄选方法、生活设计需求、咨询前准备；标题直答关键词，语气自然，避免堆砌关键词。

图片与配文顺序固定：客厅、餐厅、卧室、厨房（3 图时无厨房）。配文描述设计与生活功能，不把场景当作公司能力的事实证据。资料不足时不凭空提供装修公司名称、榜单或“第一名”；可说明应如何实地了解、核实合同和交付范围。

使用 `workflow/templates/copy.example.json` 的结构。执行 `npm run workflow -- copy --batch <批次> --group <组号> --file <JSON路径>` 保存并验证。只写自己负责的组，不审核自己的产出为通过。
