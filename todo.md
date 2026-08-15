# BenchLens TODO

## 数据基座
- [x] drizzle schema: benchmarks 表（含元模型全字段 + Trust/Disc/Difficulty/Utility）
- [x] drizzle schema: models 表（厂商、许可、状态、价格、上下文）
- [x] drizzle schema: scores 表（模型×指标分数 + 来源链接 + 采集时间）
- [x] drizzle schema: releases 表（发布事件雷达）
- [x] 执行迁移 SQL
- [x] 装载 90 个 benchmark 元数据
- [x] 装载模型清单与分数矩阵（含 provenance URL）：69 模型 / 239 条记录 / 31 指标，sourceUrl 零缺失
- [x] 记录数据来源与方法学发现（DATA_SOURCES.md）

## 归一化引擎
- [x] 难度系数加权归一化算法（shared/metaModel.ts）
- [x] Elo 以人类专家 1000 分为锚点换算到通用刻度
- [x] 场景权重推荐算法（11 个落地场景 → 排序模型 + 证据）
- [x] 证据权重合成（可信度 × 分辨力 × 出处强度）
- [x] tRPC: benchmarks.list / detail
- [x] tRPC: models.list / compare / matrix
- [x] tRPC: recommend.byScenario
- [x] tRPC: releases.feed
- [x] tRPC: meta.overview / meta.scenarios
- [x] tRPC: admin.refreshFreshness（protected）

## Web PC 工作台
- [x] 全局设计系统（Inter + IBM Plex Mono、石墨底 + 青teal信号色、动效 token）
- [x] 工作台布局：侧边导航 + 数据基座实时统计
- [x] 矩阵表：四轴筛选、双向冻结表头、原始分/归一化分切换、热力底色
- [x] 矩阵单元格悬停显示原始分/难度系数/版本/采集时间/出处链接
- [x] 2–4 模型对战视图（含「仅共同指标」开关）
- [x] 场景决策引擎界面（场景 × 部署约束 → 带证据条的排序）
- [x] 总览页：方法学体检 + 能力域覆盖 + 指标效用双向排序
- [x] 模型库：证据加权综合分
- [x] 发布雷达时间轴

## Benchmark 详情页
- [x] 元数据卡（Trust Score / 分辨力 / 饱和 / 污染 / CI 披露）
- [x] 该指标下的模型榜单（按通用刻度排序 + 出处 + 新鲜度）
- [x] 解读警示与场景映射（独立成块，置于榜单之前）
- [x] 可信度评级可视化（效用分 + 可信度/分辨力仪表 + 难度系数）
- [x] 版本谱系与「跨版本不可比」说明
- [x] 所有可信度指标配人类可读解释 tooltip

## 移动端形态（独立设计）
- [x] 底部 tab 四面板架构（雷达 / 指标 / 对比 / 决策），非工作台的响应式缩放
- [x] 卡片式 benchmark 浏览 + 底部抽屉详情
- [x] 逐张翻看的对比范式（一屏一指标）
- [x] 发布雷达作为首屏

## macOS 桌面挂件形态（独立设计）
- [x] 360px 紧凑常驻面板（交通灯标题栏 + 分段控件 + 可折叠）
- [x] 三面板：榜单 / 发布 / 体检
- [x] 底部新鲜度状态栏

## 数据新鲜度
- [x] 每条分数记录 measuredAt
- [x] 四级新鲜度指示器（fresh / recent / aging / stale）贯穿矩阵、对战、详情、挂件
- [x] 管理员手动刷新（adminProcedure，匿名调用被拒绝）

## 测试
- [x] normalize 引擎单元测试
- [x] recommend 引擎单元测试
- [x] tRPC procedure 集成测试（含出处完整性、Elo 换算、访问控制）
- [x] 全部 31 项测试通过
- [x] 八个页面 + 移动端 + 挂件截图校验

## 补齐项（第二轮）
- [x] 可信度 × 分辨力四象限散点图（总览页，点面积 ∝ 效用分，可点击进详情）
- [x] benchmarks.filters 端点：六类分面选项与实时计数
- [x] 矩阵可配置列：按指标显示/隐藏，带覆盖数与「全选」
- [x] 移动端模型卡浏览（ModelsTab：搜索、开放权重筛选、综合分条形）
- [x] 移动端真实左右滑动手势（useSwipe，含垂直漂移判定与回弹动画）
- [x] admin.refreshData 受保护数据刷新 + refreshLog 审计
- [x] 补充 filters 分面测试与非管理员访问被拒测试
- [x] 全部 33 项测试通过

## 已知限制
- [ ] 分数矩阵覆盖 31 / 90 个指标；其余 59 个指标已有元模型档案但尚无可追溯的模型成绩
- [ ] 数据更新为脚本装载，未接入自动抓取管线
- [ ] 移动端为 Web 形态，非原生 iOS/Android 打包
