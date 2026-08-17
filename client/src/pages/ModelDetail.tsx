import { FreshnessDot, InfoHint, SourceBadge, useMetricExplain } from "@/components/MetaBadges";
import { ProviderDot, Rank, ScoreBar } from "@/components/ScoreBar";
import { WorkbenchLayout } from "@/components/WorkbenchLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/i18n";
import { trpc } from "@/lib/trpc";
import { formatPrice, providerColor } from "@/lib/series";
import { formatContextWindow } from "@shared/formatContext";
import type { CapabilityDomain } from "@shared/metaModel";
import { ArrowLeft, ExternalLink, GitCompare } from "lucide-react";
import { Link, useParams } from "wouter";

/** A labelled figure in the dossier header. */
function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  href?: string | null;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[13px] text-ink-500">
        {label}
        {hint && <InfoHint>{hint}</InfoHint>}
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-ink-400 transition-colors hover:text-ink-700"
            aria-label={label}
          >
            <ExternalLink className="size-3" />
          </a>
        )}
      </div>
      <div className="tnum mt-0.5 text-[19px] text-ink-950 tabular-nums">{value}</div>
    </div>
  );
}

/**
 * Capability profile as horizontal bars rather than a radar polygon.
 *
 * A radar looks more impressive but misreads badly here: its area depends on the
 * arbitrary ordering of axes, and domains backed by one result get the same
 * visual weight as domains backed by eight. Bars keep the comparison
 * one-dimensional and leave room to state the evidence count next to each score.
 */
function CapabilityProfile({
  domains,
  provider,
  t,
}: {
  domains: { domain: string; score: number | null; count: number; confidence: number; best: string }[];
  provider: string;
  t: ReturnType<typeof useT>;
}) {
  if (domains.length === 0) return null;
  return (
    <div className="space-y-2.5">
      {domains.map((d, i) => (
        <div key={d.domain} className="flex items-center gap-3">
          <div className="flex w-[210px] shrink-0 items-center gap-1.5 text-[14px] text-ink-700">
            <span className="truncate">
              {t.capability[d.domain as CapabilityDomain] ?? d.domain}
            </span>
            {d.count < 3 && (
              <span className="shrink-0 rounded-sm px-1 text-[12px] text-ink-500 ring-1 ring-border">
                {t.modelDetail.thin}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <ScoreBar value={d.score} provider={provider} delay={i} />
          </div>
          <span className="tnum w-[52px] shrink-0 text-right text-[13px] text-ink-500 tabular-nums">
            n={d.count}
          </span>
          <Link
            href={`/benchmarks/${d.best}`}
            className="hidden w-[132px] shrink-0 truncate text-[13px] text-ink-500 transition-colors hover:text-ink-900 lg:block"
            title={d.best}
          >
            {t.modelDetail.bestIn} {d.best}
          </Link>
        </div>
      ))}
    </div>
  );
}

export default function ModelDetail() {
  const { slug = "" } = useParams<{ slug: string }>();
  const t = useT();
  const explain = useMetricExplain();
  /*
   * No retries on a 404. React Query retries three times by default, which for a
   * bad slug means the page sits on a skeleton for several seconds and only then
   * admits the model does not exist — indistinguishable from a slow load.
   */
  const { data, isLoading, error } = trpc.models.detail.useQuery(
    { slug },
    {
      retry: (count, err) =>
        (err as { data?: { httpStatus?: number } })?.data?.httpStatus === 404 ? false : count < 2,
    },
  );

  if (error) {
    return (
      <WorkbenchLayout title={t.modelDetail.eyebrow}>
        <p className="text-[15px] text-ink-700">{t.modelDetail.notFound}</p>
        <p className="mt-1 text-[14px] text-ink-500">{slug}</p>
        <Link
          href="/models"
          className="mt-4 inline-flex items-center gap-1.5 text-[14px] text-ink-700 transition-colors hover:text-ink-950"
        >
          <ArrowLeft className="size-3.5" />
          {t.modelDetail.backToLibrary}
        </Link>
      </WorkbenchLayout>
    );
  }

  if (isLoading || !data) {
    return (
      <WorkbenchLayout title={t.modelDetail.eyebrow}>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </WorkbenchLayout>
    );
  }

  const m = data.model;
  const price = formatPrice(m.priceOutput);
  const priceIn = formatPrice(m.priceInput);
  const ctx = m.contextTokens ? formatContextWindow(Number(m.contextTokens)) : m.contextWindow;

  return (
    <WorkbenchLayout
      title={m.name}
      subtitle={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <ProviderDot provider={m.provider} />
          <span>{m.provider}</span>
          {m.license && (
            <>
              <span className="text-ink-300">·</span>
              <span>
                {m.license === "open_weights" ? t.common.openWeights : t.common.closedWeights}
              </span>
            </>
          )}
          {m.status === "superseded" && (
            <>
              <span className="text-ink-300">·</span>
              <span>{t.common.superseded}</span>
            </>
          )}
        </span>
      }
      actions={
        <Link
          href={`/compare?models=${m.slug}`}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[14px] text-ink-700 ring-1 ring-border transition-colors hover:text-ink-950"
        >
          <GitCompare className="size-3.5" />
          {t.modelDetail.compareWith}
        </Link>
      }
      aside={
        <div className="space-y-5">
          <div>
            <h3 className="eyebrow mb-2">{t.modelDetail.profileTitle}</h3>
            <p className="text-[14px] leading-relaxed text-ink-600">{t.modelDetail.profileNote}</p>
          </div>
          <div>
            <h3 className="eyebrow mb-2">{t.modelDetail.peersTitle}</h3>
            <p className="text-[14px] leading-relaxed text-ink-600">{t.modelDetail.peersNote}</p>
          </div>
        </div>
      }
    >
      <div className="space-y-10">
        <Link
          href="/models"
          className="inline-flex items-center gap-1.5 text-[14px] text-ink-500 transition-colors hover:text-ink-900"
        >
          <ArrowLeft className="size-3.5" />
          {t.modelDetail.backToLibrary}
        </Link>

        {/* Header figures */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-y border-border py-5 sm:grid-cols-3 lg:grid-cols-6">
          <Stat
            label={t.modelDetail.composite}
            value={data.compositeScore === null ? "—" : data.compositeScore.toFixed(1)}
            hint={explain.composite}
          />
          <Stat label={t.modelDetail.coverage} value={data.coverage} hint={explain.evidence} />
          <Stat
            label={t.modelDetail.confidence}
            value={`${Math.round(data.confidence * 100)}%`}
            hint={explain.evidence}
          />
          <Stat
            label={t.modelDetail.outputPrice}
            value={price ?? <span className="text-[15px] text-ink-500">{t.modelDetail.priceUnavailable}</span>}
            href={m.priceSourceUrl}
          />
          <Stat label={t.modelDetail.inputPrice} value={priceIn ?? "—"} href={m.priceSourceUrl} />
          <Stat label={t.modelDetail.context} value={ctx ?? "—"} href={m.contextSourceUrl} />
        </div>

        {m.commercialNote && (
          <p className="text-[14px] leading-relaxed text-ink-600">
            <span className="text-ink-500">{t.modelDetail.commercialNote}: </span>
            {m.commercialNote}
          </p>
        )}

        {/* Capability profile */}
        <section>
          <h2 className="mb-1 text-[19px] text-ink-950">{t.modelDetail.profileTitle}</h2>
          <p className="mb-4 max-w-[62ch] text-[14px] leading-relaxed text-ink-500">
            {t.modelDetail.profileNote}
          </p>
          <CapabilityProfile domains={data.domains} provider={m.provider} t={t} />
        </section>

        {/* Nearest alternatives */}
        {data.peers.length > 0 && (
          <section>
            <h2 className="mb-4 text-[19px] text-ink-950">{t.modelDetail.peersTitle}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <tbody>
                  {data.peers.map((p, i) => (
                    <tr key={p.slug} className="border-b border-border/60 last:border-0">
                      <td className="w-[34px] py-2.5 pr-2 align-middle">
                        <Rank n={i + 1} />
                      </td>
                      <td className="py-2.5 pr-3 align-middle">
                        <Link
                          href={`/models/${p.slug}`}
                          className="flex items-center gap-2 text-[15px] text-ink-900 transition-colors hover:text-ink-950"
                        >
                          <ProviderDot provider={p.provider} />
                          <span className="truncate">{p.name}</span>
                        </Link>
                        <div className="pl-4 text-[13px] text-ink-500">{p.provider}</div>
                      </td>
                      <td className="w-[168px] py-2.5 pr-3 align-middle">
                        <ScoreBar value={p.compositeScore} provider={p.provider} delay={i} />
                      </td>
                      <td className="tnum w-[64px] py-2.5 pr-3 text-right align-middle text-[13px] text-ink-500 tabular-nums">
                        {t.modelDetail.peerGap} {p.gap.toFixed(1)}
                      </td>
                      <td className="tnum w-[76px] py-2.5 text-right align-middle text-[14px] text-ink-700 tabular-nums">
                        {formatPrice(p.priceOutput) ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* All evidence */}
        <section>
          <h2 className="mb-4 text-[19px] text-ink-950">{t.modelDetail.scoresTitle}</h2>
          <p className="-mt-3 mb-4 text-[14px] text-ink-500">{t.modelDetail.scoresNote}</p>
          {data.scores.length === 0 ? (
            <p className="text-[15px] text-ink-500">{t.modelDetail.noScores}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 pr-3 text-[14px] font-semibold text-ink-700">
                      {t.modelDetail.colBenchmark}
                    </th>
                    <th className="pb-2 pr-3 text-[14px] font-semibold text-ink-700">
                      {t.modelDetail.colDomain}
                    </th>
                    <th className="pb-2 pr-3 text-right text-[14px] font-semibold text-ink-700">
                      {t.modelDetail.colRaw}
                    </th>
                    <th className="pb-2 pr-3 text-[14px] font-semibold text-ink-700">
                      {t.modelDetail.colNormalized}
                    </th>
                    <th className="pb-2 pr-3 text-right text-[14px] font-semibold text-ink-700">
                      {t.modelDetail.colDifficulty}
                    </th>
                    <th className="pb-2 pr-3 text-[14px] font-semibold text-ink-700">
                      {t.modelDetail.colSource}
                    </th>
                    <th className="pb-2 text-[14px] font-semibold text-ink-700">
                      {t.modelDetail.colMeasured}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.scores.map((s, i) => (
                    <tr key={`${s.benchmarkSlug}-${i}`} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 pr-3 align-middle">
                        <Link
                          href={`/benchmarks/${s.benchmarkSlug}`}
                          className="text-[14px] text-ink-900 transition-colors hover:text-ink-950"
                        >
                          {s.benchmarkName}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 align-middle text-[14px] text-ink-600">
                        {t.capability[s.capabilityDomain as CapabilityDomain] ?? s.capabilityDomain}
                      </td>
                      <td className="tnum py-2.5 pr-3 text-right align-middle text-[14px] text-ink-700 tabular-nums">
                        {s.rawScore}
                      </td>
                      <td className="w-[152px] py-2.5 pr-3 align-middle">
                        <ScoreBar value={s.normalized} provider={m.provider} delay={i} />
                      </td>
                      <td className="tnum py-2.5 pr-3 text-right align-middle text-[14px] text-ink-600 tabular-nums">
                        ×{s.difficultyCoefficient.toFixed(2)}
                      </td>
                      <td className="py-2.5 pr-3 align-middle">
                        <span className="flex items-center gap-1.5">
                          <SourceBadge sourceType={s.sourceType} />
                          {s.sourceUrl && (
                            <a
                              href={s.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-ink-400 transition-colors hover:text-ink-700"
                              aria-label={t.common.viewSource}
                            >
                              <ExternalLink className="size-3" />
                            </a>
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 align-middle">
                        <span className="flex items-center gap-1.5 text-[13px] text-ink-500">
                          <FreshnessDot freshness={s.freshness} />
                          {s.measuredAt ?? t.common.noRecord}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </WorkbenchLayout>
  );
}
