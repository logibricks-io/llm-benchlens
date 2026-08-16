/**
 * A wrong address is still a page of this publication, so it is set like one.
 * The template's version arrived as a centred white card with a blue button on a
 * slate gradient — nothing in it belonged to this site, which makes a mistyped
 * URL feel like leaving rather than misreading. It also offers somewhere to go
 * instead of only a way back: a dead end that says "go home" wastes the visit.
 */
import { Link } from "wouter";

const ELSEWHERE = [
  { href: "/", label: "总览", why: "为什么这些分数不可直接比较" },
  { href: "/benchmarks", label: "指标库", why: "95 把尺各自的严格度与可信度" },
  { href: "/matrix", label: "指标矩阵", why: "模型 × 指标的全量对照" },
];

export default function NotFound() {
  return (
    <div className="paper min-h-screen">
      <div className="mx-auto max-w-[880px] px-7 pt-28 pb-16">
        <div className="ui text-ink-400 text-[10px] tracking-[0.18em] uppercase">
          404 · Not found
        </div>
        <h1 className="display text-ink-900 mt-4 text-[40px] leading-[1.1]">
          这一页不在本刊
        </h1>
        <p className="text-ink-600 mt-4 max-w-[46ch] text-[13px] leading-[1.95]">
          地址可能拼写有误，或指向了一个已经改名的指标。
          指标详情页的地址会随口径修订而变化，旧链接不保证长期有效。
        </p>

        <div className="hair-t mt-12 pt-6">
          <div className="ui text-ink-400 mb-4 text-[10px] tracking-[0.18em] uppercase">
            换个去处 · Elsewhere
          </div>
          <div className="grid gap-x-10 gap-y-4 sm:grid-cols-3">
            {ELSEWHERE.map(item => (
              <Link key={item.href} href={item.href} className="group block">
                <div className="text-ink-800 group-hover:text-frost-qing flex items-baseline gap-2 text-[14px] transition-colors duration-150">
                  {item.label}
                  <span className="text-ink-400 group-hover:text-frost-qing transition-transform duration-150 group-hover:translate-x-0.5">
                    →
                  </span>
                </div>
                <p className="ui text-ink-500 mt-1 text-[11px] leading-relaxed">{item.why}</p>
              </Link>
            ))}
          </div>
        </div>

        <p className="ui text-ink-400 mt-12 text-[11px]">
          也可以按 <span className="text-ink-600">Ctrl / Cmd + K</span> 打开目录直接跳转。
        </p>
      </div>
    </div>
  );
}
