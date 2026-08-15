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

## 补齐项（第三轮）
- [x] 并行普查 59 个空白指标的公开成绩，扩大分数矩阵
- [x] 分数矩阵扩容至 89 / 90 指标 · 360 模型 · 844 条记录，sourceUrl 仍为零缺失
- [x] 综合分与矩阵均分加入证据数量置信收缩（n/(n+4) 向全库中位收缩）
- [x] 模型库展示置信度条与收缩前观测均值
- [x] 管理员数据运维页：健康度审计、能力域覆盖、陈旧指标清单、受保护刷新
- [x] 高频端点进程内 TTL 缓存（60s），任何写入即失效
- [x] PWA：manifest + maskable 图标 + service worker（API network-first）
- [x] iOS/Android 安装引导（Chromium 一键安装、iOS 手动步骤说明）
- [x] 离线降级提示（保留出处与采集时间的可信性声明）
- [x] PWA 契约测试 8 项，全部 42 项测试通过

## 补齐项（第四轮）
- [x] chartqa-pro 仍无可追溯成绩（89 / 90）→ 修正：普查后确认 chartqa-pro 已有成绩，真正的零成绩指标是 CyberSecEval 4；已按实际情况关闭
- [x] vector-search 能力域仅 1 个指标，覆盖偏薄 → 已完成：该能力域在库中实名为 embedding_retrieval，已从 1 个扩至 6 个指标
- [x] 补齐 CyberSecEval 4 成绩（原为唯一零成绩指标，如实录入单条厂商自报证据）
- [x] 向量与检索能力域从 1 个扩至 6 个指标（MTEB / MMTEB / BEIR / BRIGHT / FreshStack / RTEB）
- [x] 全库扩至 95 指标 · 384 模型 · 872 条记录，出处仍零缺失
- [x] 修复派生量满分溢出：22 项分辨力=100、2 项效用=100 已渐近压缩至上限 97
- [x] 效用分加入证据充分性折减（零证据指标显式降权，如 FreshStack）
- [x] 指标卡与列表标注「暂无可追溯成绩」与证据条数列
- [x] 新增标定自检测试 3 项（禁止触顶、保持分布跨度、零证据必须低于同质同侪）
- [x] 全部 45 项测试通过

## 已知限制
- [x] 数据刷新仍需人工触发采集脚本，未接入定时抓取管线 → 已接入 Heartbeat 定时审计端点 /api/scheduled/auditData（自动重算覆盖率、新鲜度分布、出处完整性并写入刷新记录）

## 补齐项（第五轮）
- [x] server/scheduled.ts：定时审计回调，403 拒绝非 cron 调用而非 500（避免平台重试）
- [x] 在 server/_core/index.ts 注册 /api/scheduled/auditData
- [x] 数据运维页新增「定时审计」面板，明确自动化只覆盖体检、不覆盖采集
- [x] 定时端点测试 3 项（匿名拒绝、非 cron 拒绝、cron 正常返回体检摘要）
- [x] 全部 48 项测试通过

## 待用户操作（不属于开发任务）
> 站点发布后才能创建定时任务：平台会向生产 URL 发起 POST，沙箱地址不可达。
> 请在界面点击 Publish，之后即可创建 Heartbeat 定时审计任务。

## 补齐项（第六轮：实体一致性）
- [x] 归一 sourceType：9 种取值折叠为 4 种（leaderboard/official → official_leaderboard，third_party/aggregator → third_party_aggregator，vendor → self_reported）
- [x] 归并推理档位别名：-high/-max 等后缀视为推理设置而非独立模型，合并至规范模型并保留 effort 标签
- [x] 模型数 384 → 353，去重后 857 条证据，覆盖 94/95
- [x] 保守归并策略：仅在同厂商且规范行已存在时合并；带日期快照、尺寸、preview/flash/turbo 变体保持独立
- [x] 新增实体一致性测试 4 项（来源封闭词表、无未归并别名、无重复证据行、出处仍零缺失）

## 补齐项（第七轮：加载态）
- [x] 修复冷启动瞬间总览页显示「平均可信度 0 / 分辨力 0」的问题——0 会被误读为结论而非缺值，改为骨架
- [x] 能力域覆盖、可信度散点图、证据新鲜度均补上加载态

## 补齐项（第八轮：移动端可分享状态）
- [x] 移动端 tab 从组件状态改为 URL 状态（?tab=browse/models/duel/decide）
- [x] 未知 tab 值回落到雷达面板；默认面板保持干净 URL
- [x] 修复安装后分享链接与刷新无法回到原面板、返回手势直接退出应用的问题
- [x] 新增移动端路由测试 4 项，全部 56 项测试通过

## 补齐项（第九轮：标签词表同步）
- [x] 修复来源归一后 SourceBadge 词表失配：界面直接显示 third_party_aggregator 等原始值
- [x] 四种正规取值配中文标签与解释，并保留旧值别名以防缓存响应漏出生词
- [x] 新增词表同步测试：库中出现的每种 sourceType 都必须有人类可读标签
- [x] 全部 57 项测试通过

## 设计取舍（有意为之，非待办）
> 移动端为可安装 PWA 而非原生 iOS/Android 打包：三端共享同一归一化引擎与出处数据，
> 原生打包会引入两套构建链而不改变任何分析能力。
>
> macOS 挂件为 Web 形态的常驻面板，而非原生 menubar 应用：同上，形态与交互范式已按
> 桌面常驻场景独立设计，非响应式缩放。
>
> 部分指标仅有 1–2 条证据：这是公开数据的真实状态，不是数据错误。系统的选择是
> 如实录入并显式降权（置信收缩 + 界面标注），而不是补造同伴数据把表格填满。
