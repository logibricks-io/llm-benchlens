import { WorkbenchLayout } from "@/components/WorkbenchLayout";
import { NoteBlock } from "@/components/MarginNote";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ExternalLink, Radio } from "lucide-react";
import { useT } from "@/i18n";
import { providerColor } from "@/lib/series";
import { ProviderDot } from "@/components/ScoreBar";

export default function Radar() {
  const t = useT();
  const { data, isLoading } = trpc.releases.feed.useQuery({ limit: 30 });
  const rows = data ?? [];

  return (
    <WorkbenchLayout
      title={t.nav.radar}
      subtitle={t.radar.subtitle}
      readNext={[
        { href: "/models", label: t.nav.models, why: t.radar.readNextModelsWhy },
        { href: "/benchmarks", label: t.nav.benchmarks, why: t.radar.readNextBenchmarksWhy },
      ]}
      aside={
        <NoteBlock label={t.radar.noteLabel}>
          <p className="text-[15px] leading-[1.75] text-ink-700">
            {t.radar.noteText1}
            <strong className="text-ink-900 font-semibold">{t.radar.noteText2}</strong>
          </p>
        </NoteBlock>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-sm" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-[280px] items-center justify-center">
          <div className="hair-t px-6 py-5 text-center">
            <Radio className="mx-auto size-5 text-ink-500" />
            <p className="mt-2 text-[14px] text-ink-700">{t.radar.emptyFeed}</p>
          </div>
        </div>
      ) : (
        <div className="relative max-w-3xl">
          <div className="absolute top-2 bottom-2 left-[7px] w-px bg-border" />
          <div className="space-y-1">
            {rows.map((r, i) => (
              <div
                key={r.id}
                className="relative flex gap-4 rounded-sm py-2.5 pl-6 pr-3 transition-colors duration-120 hover:bg-surface-2"
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
              >
                <span 
                  className="absolute top-[18px] left-0 size-[15px] rounded-full border-2 border-background" 
                  style={{ backgroundColor: providerColor(r.provider) }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <ProviderDot provider={r.provider} />
                    <span className="text-[14px] text-ink-900">{r.modelName}</span>
                    <span className="text-[13px] text-ink-400">{r.provider}</span>
                    <span className="tnum ml-auto text-[14px] text-ink-500">{r.releasedAt}</span>
                  </div>
                  {r.headline && (
                    <p className="mt-1 text-[14px] leading-[1.75] text-ink-600">{r.headline}</p>
                  )}
                  {r.sourceUrl && (
                    <a
                      href={r.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-[14px] text-brand-qing hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      {t.common.viewSource}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </WorkbenchLayout>
  );
}
