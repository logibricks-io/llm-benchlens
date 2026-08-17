import { useAuth } from "@/_core/hooks/useAuth";
import { FreshnessDot, InfoHint } from "@/components/MetaBadges";
import { WorkbenchLayout } from "@/components/WorkbenchLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { AlertTriangle, CheckCircle2, Clock, Database, ExternalLink, Lock, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useT, type Dict } from "@/i18n";
import { toast } from "sonner";
import { Link } from "wouter";

function getSourceLabel(t: Dict, key: string): string {
  const aliases: Record<string, string> = {
    github: t.admin.source.github,
    vendor_blog: t.admin.source.vendor_blog,
    third_party: t.sourceType.third_party_aggregator,
    leaderboard: t.sourceType.official_leaderboard,
  };
  return t.sourceType[key as keyof typeof t.sourceType] ?? aliases[key] ?? key;
}

/**
 * Maintainer-only surface. Everything shown here is derived from the score
 * table, so the page doubles as the honest answer to "how good is this data
 * actually?" — including the parts that are not good.
 */
export default function Admin() {
  const t = useT();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";

  const audit = trpc.admin.audit.useQuery(undefined, { enabled: isAdmin });
  const log = trpc.admin.refreshLog.useQuery(undefined, { enabled: isAdmin });
  const utils = trpc.useUtils();
  const [busy, setBusy] = useState(false);

  const refresh = trpc.admin.refreshData.useMutation({
    onSuccess: res => {
      toast.success(t.admin.actions.refreshed.replace("{n}", String(res.rowsTouched)));
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
      <WorkbenchLayout title={t.admin.title} subtitle={t.admin.subtitle}>
        <div className="space-y-3 p-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </WorkbenchLayout>
    );
  }

  if (!isAdmin) {
    return (
      <WorkbenchLayout title={t.admin.title} subtitle={t.admin.subtitle}>
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="hair-t max-w-md p-8 text-center">
            <Lock className="mx-auto size-8 text-ink-500" />
            <h2 className="mt-4 text-base">{t.admin.auth.title}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
              {t.admin.auth.desc}
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              {!user ? (
                <button
                  type="button"
                  onClick={() => startLogin()}
                  className="ui text-ink-700 hover:text-brand-qing hair-all px-3 py-1.5 text-[14px] transition-colors duration-120"
                >
                  {t.admin.auth.login}
                </button>
              ) : (
                <span className="text-[14px] text-ink-500">
                  {t.admin.auth.noAccess.replace("{name}", user.name ?? user.openId)}
                </span>
              )}
              <Link
                href="/"
                className="ui text-ink-600 hover:text-brand-qing px-3 py-1.5 text-[14px] transition-colors duration-120"
              >
                {t.admin.auth.back}
              </Link>
            </div>
          </div>
        </div>
      </WorkbenchLayout>
    );
  }

  /*
   * Named `stats`, not `t`: the dictionary already owns `t` in this scope. The
   * i18n conversion originally shadowed it here, which made every `t.admin.*`
   * lookup below resolve against the audit totals instead.
   */
  const stats = audit.data?.totals;

  return (
    <WorkbenchLayout
      title={t.admin.title}
      subtitle={t.admin.subtitle}
      actions={
        /* A filled dark block reads as a foreign object on a frost-white page,
           and this is a maintenance action, not the page's purpose. Set it as a
           quiet hairline affordance instead. */
        <button
          type="button"
          className="ui text-ink-600 hover:text-brand-qing hair-all flex items-center gap-1.5 px-2.5 py-1.5 text-[14px] transition-colors duration-120 disabled:opacity-50"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            refresh.mutate({ scope: "all" });
          }}
        >
          <RefreshCw className={busy ? "size-3 animate-spin" : "size-3"} />
          {t.admin.actions.refreshAll}
        </button>
      }
    >
      <div className="space-y-4">
        {/* Health tiles */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Tile
            label={t.admin.tiles.coverage}
            value={stats ? `${stats.coverageRate}%` : <span className="text-ink-400">—</span>}
            note={
              stats
                ? t.admin.tiles.coverageNote
                    .replace("{covered}", String(stats.coveredBenchmarks))
                    .replace("{total}", String(stats.benchmarks))
                : ""
            }
            tone={stats && stats.coverageRate >= 90 ? "good" : "warn"}
          />
          <Tile
            label={t.admin.tiles.scores}
            value={stats ? String(stats.scoreRows) : <span className="text-ink-400">—</span>}
            note={t.admin.tiles.scoresNote}
          />
          <Tile
            label={t.admin.tiles.missingProv}
            value={stats ? String(stats.missingProvenance) : <span className="text-ink-400">—</span>}
            note={
              stats?.missingProvenance === 0
                ? t.admin.tiles.missingProvZero
                : t.admin.tiles.missingProvNeed
            }
            tone={stats?.missingProvenance === 0 ? "good" : "danger"}
          />
          <Tile
            label={t.admin.tiles.ci}
            value={stats ? `${stats.ciDisclosed} / ${stats.benchmarks}` : <span className="text-ink-400">—</span>}
            note={t.admin.tiles.ciNote}
            tone="danger"
          />
        </div>

        {/* Source mix */}
        <div className="hair-t p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Database className="size-3.5 text-ink-500" />
            <h3 className="text-[14px]">{t.admin.source.title}</h3>
            <InfoHint>
              {t.admin.source.desc}
            </InfoHint>
          </div>
          {audit.isLoading ? (
            <Skeleton className="h-6 w-full" />
          ) : (
            <div className="space-y-2">
              {Object.entries(audit.data?.sourceMix ?? {})
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => {
                  const total = stats?.scoreRows ?? 1;
                  return (
                    <div key={k} className="flex items-center gap-2.5">
                      <span className="w-24 shrink-0 text-[14px] text-ink-500">
                        {getSourceLabel(t, k)}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-brand-qing/60" style={{ width: `${(v / total) * 100}%` }} />
                      </div>
                      <span className="tnum w-12 shrink-0 text-right text-[14px]">{v}</span>
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
            <h3 className="text-[14px]">{t.admin.audit.title}</h3>
            <InfoHint>
              {t.admin.audit.desc}
            </InfoHint>
          </div>
          <p className="text-[14px] leading-relaxed text-ink-500">
            {t.admin.audit.philosophy1}
            {t.admin.audit.philosophy2}
            {t.admin.audit.philosophy3}
            <span className="text-ink-900">{t.admin.audit.philosophy4}</span>。
            {t.admin.audit.philosophy5}
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {/* Gaps */}
          <div className="hair-t p-4">
            <div className="mb-3 flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-caution" />
              <h3 className="text-[14px]">{t.admin.gaps.title}</h3>
            </div>
            {audit.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (audit.data?.uncovered.length ?? 0) === 0 && (audit.data?.thin.length ?? 0) === 0 ? (
              <div className="flex items-center gap-2 py-6 text-[14px] text-ink-500">
                <CheckCircle2 className="size-4 text-good" />
                {t.admin.gaps.allCovered}
              </div>
            ) : (
              <div className="space-y-3">
                {(audit.data?.uncovered.length ?? 0) > 0 && (
                  <div>
                    <p className="mb-1.5 text-[14px] text-ink-500">
                      {t.admin.gaps.uncovered.replace("{n}", String(audit.data?.uncovered.length))}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {audit.data?.uncovered.map(u => (
                        <Link
                          key={u.slug}
                          href={`/benchmarks/${u.slug}`}
                          className="rounded hair-all bg-surface-2 px-1.5 py-0.5 text-[14px] transition-colors hover:border-brand-qing/40"
                        >
                          {u.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {(audit.data?.thin.length ?? 0) > 0 && (
                  <div>
                    <p className="mb-1.5 text-[14px] text-ink-500">
                      {t.admin.gaps.thin.replace("{n}", String(audit.data?.thin.length))}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {audit.data?.thin.map(u => (
                        <Link
                          key={u.slug}
                          href={`/benchmarks/${u.slug}`}
                          className="flex items-center gap-1 rounded hair-all bg-surface-2 px-1.5 py-0.5 text-[14px] transition-colors hover:border-brand-qing/40"
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
              <h3 className="text-[14px]">{t.admin.logs.title}</h3>
              <InfoHint>
                {t.admin.logs.desc}
              </InfoHint>
            </div>
            {log.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (log.data?.length ?? 0) === 0 ? (
              <p className="py-6 text-[14px] text-ink-500">{t.admin.logs.empty}</p>
            ) : (
              <div className="space-y-1.5">
                {log.data?.map(l => (
                  <div key={l.id} className="flex items-baseline justify-between gap-2 hair-b pb-1.5 text-[14px] last:border-0">
                    <span className="min-w-0 flex-1 truncate">
                      <span className="text-ink-900">{l.triggeredBy}</span>
                      <span className="text-ink-500"> · {l.scope}</span>
                      {l.note && <span className="text-ink-400"> · {l.note}</span>}
                    </span>
                    <span className="tnum shrink-0 text-ink-500">{t.admin.logs.rows.replace("{n}", String(l.rowsTouched))}</span>
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
            <h3 className="text-[14px]">{t.admin.stale.title}</h3>
            <InfoHint>{t.admin.stale.desc}</InfoHint>
          </div>
          {audit.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (audit.data?.stalest.length ?? 0) === 0 ? (
            <p className="py-4 text-[14px] text-ink-500">{t.admin.stale.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="hair-b text-left text-ink-700 font-semibold">
                    <th className="pb-1.5">{t.admin.stale.columns.benchmark}</th>
                    <th className="pb-1.5">{t.admin.stale.columns.model}</th>
                    <th className="pb-1.5">{t.admin.stale.columns.measuredAt}</th>
                    <th className="pb-1.5">{t.admin.stale.columns.source}</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.data?.stalest.map((s, i) => (
                    <tr key={i} className="hair-row hover:bg-surface transition-colors duration-120">
                      <td className="py-1.5">
                        <Link href={`/benchmarks/${s.benchmarkSlug}`} className="hover:text-brand-qing">
                          {s.benchmarkName}
                        </Link>
                      </td>
                      <td className="py-1.5 text-ink-900">
                        {/* The stale-evidence row shape carries no provider, so
                            no vendor dot here — it is keyed by model name only. */}
                        {s.modelName}
                      </td>
                      <td className="py-1.5">
                        <span className="flex items-center gap-1.5">
                          <FreshnessDot freshness={s.freshness} />
                          <span className="tnum text-ink-500">{s.measuredAt ?? <span className="text-ink-400">—</span>}</span>
                        </span>
                      </td>
                      <td className="py-1.5">
                        {s.sourceUrl ? (
                          <a
                            href={s.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 text-brand-qing hover:underline"
                          >
                            {t.admin.stale.sourceLink}
                            <ExternalLink className="size-2.5" />
                          </a>
                        ) : (
                          <span className="text-ink-400">—</span>
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
  value: React.ReactNode;
  note: string;
  tone?: "neutral" | "good" | "warn" | "danger";
}) {
  const color =
    tone === "good"
      ? "var(--signal-good)"
      : tone === "warn"
        ? "var(--signal-caution)"
        : tone === "danger"
          ? "var(--signal-danger)"
          : undefined;
  return (
    <div className="hair-t p-4">
      <p className="text-[14px] text-ink-500">{label}</p>
      <p className="tnum mt-1 text-2xl" style={color ? { color } : undefined}>
        {value}
      </p>
      {note && <p className="mt-1 text-[14px] leading-relaxed text-ink-400">{note}</p>}
    </div>
  );
}
