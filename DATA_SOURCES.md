# BenchLens 数据基座来源记录

## 一、元模型层（benchmarks 表，90 行）
来源：对 90 个评测基准逐一调研（官方站点 / arXiv / GitHub / 榜单页），产出结构化元数据。
派生字段 Trust Score、Discriminative Power、Difficulty Coefficient、Utility Score 由
`/home/ubuntu/build_base.py` 计算，原始调研数据保存在
`/home/ubuntu/benchmark_metadata_survey.json` 与 `/home/ubuntu/benchmark_base.json`。

关键统计（截至装载时）：
- 能力域分布：coding 17、agentic_tool_use 15、professional_knowledge_work 11、multimodal 11、knowledge_reasoning 9、math 7、safety_security 6、computer_use 5、composite 5、web_research 3、embedding_retrieval 1
- 评分机制：execution_verification 25、exact_match 22、rubric_llm_judge 17、composite_index 11、state_assertion 9、human_preference_elo 6
- 严格度：all_or_nothing 48、partial_credit 26、single_answer 16
- 饱和状态：contested 44、saturated 25、frontier 21
- 置信区间披露：仅 12 / 90（13.3%）
- 平均 Trust 71.5，平均分辨力 68.1，难度系数区间 0.61–2.03

## 二、分数层（scores 表）
每行均带 sourceUrl / sourceType / measuredAt，零缺失。

| 来源 | 用途 | URL |
| --- | --- | --- |
| Steel.dev Agent Leaderboard | 14 个 agent benchmark、333 条带出处记录，抽取其中可对应到模型的行 | https://leaderboard.steel.dev/results/ |
| BenchLM BenchAlign v5 API | 模型名录、许可、价格、分类聚合分 | https://benchlm.ai/api/data/leaderboard?mode=bench-align-v5 |
| xAI Grok 4.6 发布表 | 用户提供的图一：AA Index、GDPval-AA v2、CursorBench v3.2、DeepSWE v1.1、FrontierCode v1.1 Extended、APEX-Agents、Terminal-Bench v3.0、APEX-SWE、AA-Briefcase、Harvey LAB | https://x.ai/news/grok-4-6 |
| DeepSeek V4 Pro 发布表 | 用户提供的图二：HLE（wo/w tools 双读数）、Terminal Bench 2.1、NL2Repo、CyberGym、DeepSWE、Toolathlon-Verified、Agents' Last Exam、AutomationBench Public | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro |
| Vals AI Vals Index | 独立第三方复跑的综合指数（15 个模型） | https://www.vals.ai/home |
| Epoch AI Benchmarking Hub | 交叉核对 FrontierMath / MirrorCode 口径 | https://epoch.ai/benchmarks |

## 三、重要方法学发现（驱动产品设计）
1. Steel.dev 在榜单顶部明确声明「本页分数不可跨 benchmark 比较，本索引不做方法论归一化」——行业公开承认该问题但无人解决，这是 BenchLens 的立足点。
2. Terminal-Bench 2.1 已饱和（顶级 85–88%），3.0 的设计目标是「发布时最强模型解决率 ≤30%」，两版之间完全不可比。
3. Harvey LAB 采用 all-pass 全通过评分（57 条判据全过才算完成），因此绝对分数天然只有个位数到十几。
4. AutomationBench 设有负向断言（guardrail），违规直接归零；官方报告大量失败属于「agent 报告完成但世界状态是错的」。
5. GDPval 以人类专家交付物锚定 1000 Elo，是少数具备绝对参照的指标。
6. DSBench-FullStack / DSBench-Hard 为 DeepSeek 内部自建集，与学术界同名 DSBench 不是同一评测，只能看版本间趋势（因此未纳入公开 benchmark 元数据库）。
