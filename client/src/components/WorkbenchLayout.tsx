import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  Boxes,
  Compass,
  Database,
  GitCompareArrows,
  Grid3x3,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { Link, useLocation } from "wouter";

const NAV = [
  { href: "/", label: "总览", icon: Activity, hint: "数据基座状态与方法学体检" },
  { href: "/matrix", label: "指标矩阵", icon: Grid3x3, hint: "模型 × 指标全量对比" },
  { href: "/benchmarks", label: "指标库", icon: Database, hint: "90 项评测的元模型档案" },
  { href: "/models", label: "模型库", icon: Boxes, hint: "按证据加权的模型名录" },
  { href: "/compare", label: "对战台", icon: GitCompareArrows, hint: "两到四个模型的同尺对比" },
  { href: "/decide", label: "场景决策", icon: Compass, hint: "按落地场景输出推荐与依据" },
  { href: "/radar", label: "发布雷达", icon: Radio, hint: "新模型与新评测事件流" },
];

function Sidebar() {
  const [location] = useLocation();
  return (
    <aside className="hidden w-[212px] shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
      <Link
        href="/"
        className="flex h-14 items-center gap-2.5 border-b border-border px-4 transition-colors duration-150 hover:bg-sidebar-accent/40"
      >
        <div className="grid size-7 place-items-center rounded-md bg-primary/15 ring-1 ring-primary/30">
          <ShieldCheck className="size-4 text-primary" />
        </div>
        <div className="leading-none">
          <div className="text-[13px] font-semibold tracking-tight">BenchLens</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">评测元智能</div>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {NAV.map(item => {
          const active = item.href === "/" ? location === "/" : location.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors duration-150",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
              )}
              title={item.hint}
            >
              {active && <span className="absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 rounded-r bg-primary" />}
              <Icon className={cn("size-4 shrink-0", active && "text-primary")} />
              <span className="truncate font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <CoverageFooter />
    </aside>
  );
}

function CoverageFooter() {
  const { data } = trpc.meta.overview.useQuery();
  return (
    <div className="border-t border-border p-3">
      <div className="mb-2 text-[10px] tracking-wide text-muted-foreground uppercase">数据基座</div>
      <dl className="space-y-1.5 text-[11px]">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">指标</dt>
          <dd className="tnum">{data?.benchmarks ?? "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">模型</dt>
          <dd className="tnum">{data?.models ?? "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">分数记录</dt>
          <dd className="tnum">{data?.scores ?? "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">CI 披露率</dt>
          <dd className="tnum text-[color:var(--signal-danger)]">
            {data ? `${data.ciDisclosureRate}%` : "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/** Mobile / tablet fallback nav for the PC workbench routes. */
function TopNav() {
  const [location] = useLocation();
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-sidebar px-3 py-2 lg:hidden">
      {NAV.map(item => {
        const active = item.href === "/" ? location === "/" : location.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors duration-150",
              active ? "bg-sidebar-accent text-foreground" : "text-muted-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function WorkbenchLayout({
  children,
  title,
  subtitle,
  actions,
  wide,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav />
        <header className="flex h-auto shrink-0 flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-3.5 lg:h-14 lg:flex-nowrap lg:py-0">
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
        <main className={cn("min-w-0 flex-1 overflow-auto", wide ? "" : "px-5 py-5")}>{children}</main>
      </div>
    </div>
  );
}
