import { WorkbenchLayout } from "@/components/WorkbenchLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ExternalLink, Radio } from "lucide-react";

export default function Radar() {
  const { data, isLoading } = trpc.releases.feed.useQuery({ limit: 30 });
  const rows = data ?? [];

  return (
    <WorkbenchLayout title="发布雷达" subtitle="新模型与新评测的事件流，按发布日期倒序">
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="grid-canvas flex h-[280px] items-center justify-center">
          <div className="panel px-6 py-5 text-center">
            <Radio className="mx-auto size-5 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">暂无发布事件</p>
          </div>
        </div>
      ) : (
        <div className="relative max-w-3xl">
          <div className="absolute top-2 bottom-2 left-[7px] w-px bg-border" />
          <div className="space-y-1">
            {rows.map((r, i) => (
              <div
                key={r.id}
                className="relative flex gap-4 rounded-md py-2.5 pl-6 pr-3 transition-colors duration-150 hover:bg-secondary/40"
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
              >
                <span className="absolute top-[18px] left-0 size-[15px] rounded-full border-2 border-background bg-primary/70" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[13px] font-semibold">{r.modelName}</span>
                    <span className="text-[11px] text-muted-foreground">{r.provider}</span>
                    <span className="tnum ml-auto text-[11px] text-muted-foreground">{r.releasedAt}</span>
                  </div>
                  {r.headline && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.headline}</p>
                  )}
                  {r.sourceUrl && (
                    <a
                      href={r.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      查看出处
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

