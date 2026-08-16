import { useAuth } from "@/_core/hooks/useAuth";
import { FreshnessDot, InfoHint } from "@/components/MetaBadges";
import { WorkbenchLayout } from "@/components/WorkbenchLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { AlertTriangle, CheckCircle2, Clock, Database, ExternalLink, Lock, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const SOURCE_LABELS: Record<string, string> = {
  official_leaderboard: "官方榜单",
  paper: "论文",
  github: "代码仓库",
  third_party_aggregator: "第三方聚合",
  vendor_blog: "厂商发布",
  self_reported: "厂商自报",
  third_party: "第三方聚合",
  leaderboard: "官方榜单",
};

/**
 * Maintainer-only surface. Everything shown here is derived from the score
 * table, so the page doubles as the honest answer to "how good is this data
 * actually?" — including the parts that are not good.
 */
export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";

  const audit = trpc.admin.audit.useQuery(undefined, { enabled: isAdmin });
  const log = trpc.admin.refreshLog.useQuery(undefined, { enabled: isAdmin });
  const utils = trpc.useUtils();
  const [busy, setBusy] = useState(false);

  const refresh = trpc.admin.refreshData.useMutation({
    onSuccess: res => {
      toast.success(`已复核 ${res.rowsTouched} 条记录`);
      utils.admin.audit.invalidate();
      utils.admin.refreshLog.invalidate();
      utils.meta.overview.invalidate();
      utils.models.matrix.invalidate();
    },
    onError: e => toast.error(e.message),
    onSettled: () => setBusy(false),
  });

  if (authLoading) {
    return (
      <WorkbenchLayout title="数据运维" subtitle="覆盖度审计、陈旧证据与刷新记录">
        <div className="space-y-3 p-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </WorkbenchLayout>
    );
  }

  if (!isAdmin) {
    return (
      <WorkbenchLayout title="数据运维" subtitle="覆盖度审计、陈旧证据与刷新记录">
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="hair-t max-w-md p-8 text-center">
            <Lock className="mx-auto size-8 text-ink-500" />
            <h2 className="mt-4 text-base">仅维护者可见</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
              数据刷新会改写全库的证据新鲜度状态，因此这一页只对管理员开放。
              浏览与对比功能无需登录，可直接使用。
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              {!user ? (
                <button
                  type="button"
                  onClick={() => startLogin()}
                  className="ui text-ink-700 hover:text-frost-qing hair-all px-3 py-1.5 text-[11px] transition-colors duration-150"
                >
                  登录
                </button>
              ) : (
                <span className="text-xs text-ink-500">
                  当前账号 {user.name ?? user.openId} 无管理员权限
                </span>
              )}
              <Link
                href="/"
                className="ui text-ink-600 hover:text-frost-qing px-3 py-1.5 text-[11px] transition-colors duration-150"
              >
                返回总览 →
              </Link>
            </div>
          </div>
        </div>
      </WorkbenchLayout>
    );
  }

  const t = audit.data?.totals;

  return (
    <WorkbenchLayout
      title="数据运维"
      subtitle="覆盖度审计、陈旧证据与刷新记录"
      actions={
        /* A filled dark block reads as a foreign object on a frost-white page,
           and this is a maintenance action, not the page's purpose. Set it as a
           quiet hairline affordance instead. */
        <button
          type="button"
          className="ui text-ink-600 hover:text-frost-qing hair-all flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] transition-colors duration-150 disabled:opacity-50"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            refresh.mutate({ scope: "all" });
          }}
        >
          <RefreshCw className={busy ? "size-3 animate-spin" : "size-3"} />
          全库复核
        </button>
      }
    >
      <div className="space-y-4">
        {/* Health tiles */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Tile
            label="指标覆盖率"
            value={t ? `${t.coverageRate}%` : "—"}
            note={t ? `${t.coveredBenchmarks} / ${t.benchmarks} 个指标有成绩` : ""}
            tone={t && t.coverageRate >= 90 ? "good" : "warn"}
          />
          <Tile label="分数记录" value={t ? String(t.scoreRows) : "—"} note="每条均带出处链接" />
          <Tile
            label="出处缺失"
            value={t ? String(t.missingProvenance) : "—"}
            note={t?.missingProvenance === 0 ? "装载脚本硬性拒绝无出处记录" : "需要补齐"}
            tone={t?.missingProvenance === 0 ? "good" : "danger"}
          />
          <Tile
            label="CI 披露"
            value={t ? `${t.ciDisclosed} / ${t.benchmarks}` : "—"}
            note="上游方法学缺陷，非本库可修补"
            tone="danger"
          />
        </div>

        {/* Source mix */}
        <div className="hair-t p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Database className="size-3.5 text-ink-500" />
            <h3 className="text-[13px]">证据来源构成</h3>
            <InfoHint>
              官方榜单与论文的证据强度高于厂商自报与第三方聚合。归一化引擎在合成综合分时按来源强度加权，
              因此这个构成会直接影响排序结果。
            </InfoHint>
          </div>
          {audit.isLoading ? (
            <Skeleton className="h-6 w-full" />
          ) : (
            <div className="space-y-2">
              {Object.entries(audit.data?.sourceMix ?? {})
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => {
                  const total = t?.scoreRows ?? 1;
                  return (
                    <div key={k} className="flex items-center gap-2.5">
                      <span className="w-24 shrink-0 text-[11px] text-ink-500">
                        {SOURCE_LABELS[k] ?? k}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-frost-mist/50">
                        <div className="h-full rounded-full bg-frost-qing/60" style={{ width: `${(v / total) * 100}%` }} />
                      </div>
                      <span className="tnum w-12 shrink-0 text-right text-[11px]">{v}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Automation boundary */}
        <div className="hair-t p-4">
          <div className="mb-2 flex items-center gap-1.5">
            <Clock className="size-3.5 text-ink-500" />
            <h3 className="text-[13px]">定时审计</h3>
            <InfoHint>
              Heartbeat 定时任务会 POST 到 /api/scheduled/auditData，重算覆盖率、证据新鲜度分布与出处完整性，
              并把结果写入上方的刷新记录。需站点发布后由维护者创建定时任务。
            </InfoHint>
          </div>
          <p className="text-[12px] leading-relaxed text-ink-500">
            自动化只覆盖「体检」，不覆盖「采集」。定时任务负责持续测量数据基座的健康度，让陈旧和缺口自己浮现；
            而抓取第三方榜单、消解模型别名、重算元模型派生量无法安全地塞进一次两分钟的无状态调用——
            更重要的是，静默导入未经核验的数字会破坏这个系统唯一不可让渡的前提：
            <span className="text-ink-900">每一条分数都必须能追溯到真实出处</span>。
            因此新增成绩仍由维护者显式运行采集脚本并复核后装载。
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {/* Gaps */}
          <div className="hair-t p-4">
            <div className="mb-3 flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-[color:var(--signal-warn)]" />
              <h3 className="text-[13px]">待补齐的指标</h3>
            </div>
            {audit.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (audit.data?.uncovered.length ?? 0) === 0 && (audit.data?.thin.length ?? 0) === 0 ? (
              <div className="flex items-center gap-2 py-6 text-[13px] text-ink-500">
                <CheckCircle2 className="size-4 text-good" />
                每个指标都有至少四条成绩记录。
              </div>
            ) : (
              <div className="space-y-3">
                {(audit.data?.uncovered.length ?? 0) > 0 && (
                  <div>
                    <p className="mb-1.5 text-[11px] text-ink-500">
                      无任何成绩（{audit.data?.uncovered.length}）——已建元模型档案，但尚未找到可追溯的模型成绩
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {audit.data?.uncovered.map(u => (
                        <Link
                          key={u.slug}
                          href={`/benchmarks/${u.slug}`}
                          className="rounded hair-all bg-frost-mist/50 px-1.5 py-0.5 text-[10px] transition-colors hover:border-frost-qing/40"
                        >
                          {u.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {(audit.data?.thin.length ?? 0) > 0 && (
                  <div>
                    <p className="mb-1.5 text-[11px] text-ink-500">
                      样本过薄（{audit.data?.thin.length}）——少于四条成绩，排名不具统计意义
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {audit.data?.thin.map(u => (
                        <Link
                          key={u.slug}
                          href={`/benchmarks/${u.slug}`}
                          className="flex items-center gap-1 rounded hair-all bg-frost-mist/50 px-1.5 py-0.5 text-[10px] transition-colors hover:border-frost-qing/40"
                        >
                          {u.name}
                          <span className="tnum text-ink-500">{u.scoreCount}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Refresh ledger */}
          <div className="hair-t p-4">
            <div className="mb-3 flex items-center gap-1.5">
              <RefreshCw className="size-3.5 text-ink-500" />
              <h3 className="text-[13px]">刷新记录</h3>
              <InfoHint>
                每次复核都会留痕：谁触发、范围、影响行数。刷新只更新「最后核验时间」，不会改写分数本身——
                分数只能通过装载脚本从原始出处重新采集。
              </InfoHint>
            </div>
            {log.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (log.data?.length ?? 0) === 0 ? (
              <p className="py-6 text-[13px] text-ink-500">尚无刷新记录。</p>
            ) : (
              <div className="space-y-1.5">
                {log.data?.map(l => (
                  <div key={l.id} className="flex items-baseline justify-between gap-2 hair-b pb-1.5 text-[11px] last:border-0">
                    <span className="min-w-0 flex-1 truncate">
                      <span className="text-ink-900">{l.triggeredBy}</span>
                      <span className="text-ink-500"> · {l.scope}</span>
                      {l.note && <span className="text-ink-400"> · {l.note}</span>}
                    </span>
                    <span className="tnum shrink-0 text-ink-500">{l.rowsTouched} 行</span>
                    <span className="shrink-0 text-ink-400">
                      {new Date(l.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stalest evidence */}
        <div className="hair-t p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <h3 className="text-[13px]">最陈旧的证据</h3>
            <InfoHint>按采集时间升序。陈旧证据不代表错误，但当榜单已经更新过若干轮时，这些分数的参考价值会显著下降。</InfoHint>
          </div>
          {audit.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (audit.data?.stalest.length ?? 0) === 0 ? (
            <p className="py-4 text-[13px] text-ink-500">没有陈旧或老化的记录。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="hair-b text-left text-ink-500">
                    <th className="pb-1.5">指标</th>
                    <th className="pb-1.5">模型</th>
                    <th className="pb-1.5">采集时间</th>
                    <th className="pb-1.5">出处</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.data?.stalest.map((s, i) => (
                    <tr key={i} className="hair-b last:border-0">
                      <td className="py-1.5">
                        <Link href={`/benchmarks/${s.benchmarkSlug}`} className="hover:text-frost-qing">
                          {s.benchmarkName}
                        </Link>
                      </td>
                      <td className="py-1.5 text-ink-500">{s.modelName}</td>
                      <td className="py-1.5">
                        <span className="flex items-center gap-1.5">
                          <FreshnessDot freshness={s.freshness} />
                          <span className="tnum text-ink-500">{s.measuredAt ?? "未标注"}</span>
                        </span>
                      </td>
                      <td className="py-1.5">
                        {s.sourceUrl && (
                          <a
                            href={s.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 text-frost-qing hover:underline"
                          >
                            出处
                            <ExternalLink className="size-2.5" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </WorkbenchLayout>
  );
}

function Tile({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "neutral" | "good" | "warn" | "danger";
}) {
  const color =
    tone === "good"
      ? "var(--signal-good)"
      : tone === "warn"
        ? "var(--signal-warn)"
        : tone === "danger"
          ? "var(--signal-danger)"
          : undefined;
  return (
    <div className="hair-t p-4">
      <p className="text-[11px] text-ink-500">{label}</p>
      <p className="tnum mt-1 text-2xl" style={color ? { color } : undefined}>
        {value}
      </p>
      {note && <p className="mt-1 text-[10px] leading-relaxed text-ink-400">{note}</p>}
    </div>
  );
}
