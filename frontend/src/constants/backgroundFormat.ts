/**
 * 「我的背景」正文展示约定：纯文本 + emoji 大节 + 段落分层（与后端简历 PDF 解析提示一致）
 */
export const BACKGROUND_SECTION_ORDER = [
  '📋 基本信息',
  '🎓 学历',
  '💼 实习经历',
  '🚀 项目经历',
  '🎨 个人作品集',
  '⚡ 核心技能',
  '💬 自我评价',
] as const;

export const BACKGROUND_FORMAT_SHORT_HINT =
  `推荐按大节书写（无内容可省略该节）：${BACKGROUND_SECTION_ORDER.join(' → ')}。每节标题单独一行，节与节之间空一行；字段用「姓名：」「学校：」等；列表行以 • 开头。`;
