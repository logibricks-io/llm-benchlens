/**
 * A wrong address is still a page of this publication, so it is set like one.
 * The template's version arrived as a centred white card with a blue button on a
 * slate gradient — nothing in it belonged to this site, which makes a mistyped
 * URL feel like leaving rather than misreading. It also offers somewhere to go
 * instead of only a way back: a dead end that says "go home" wastes the visit.
 */
import { Link } from "wouter";
import { useT } from "@/i18n";
import type { Dict } from "@/i18n/en";

function getElsewhere(t: Dict) {
  return [
    { href: "/", label: t.nav.home, why: t.notFound.whyHome },
    { href: "/benchmarks", label: t.nav.benchmarks, why: t.notFound.whyBenchmarks },
    { href: "/matrix", label: t.nav.matrix, why: t.notFound.whyMatrix },
  ];
}

export default function NotFound() {
  const t = useT();
  const ELSEWHERE = getElsewhere(t);

  return (
    <div className="paper min-h-screen">
      <div className="mx-auto max-w-[880px] px-7 pt-28 pb-16">
        <div className="ui text-ink-400 text-[13px] tracking-[0.18em] uppercase">
          404 · Not found
        </div>
        <h1 className="display text-ink-900 mt-4 text-[40px] leading-[1.1]">
          {t.notFound.title}
        </h1>
        <p className="text-ink-600 mt-4 max-w-[46ch] text-[13px] leading-[1.95]">
          {t.notFound.p1}
          <br />
          {t.notFound.p2}
        </p>

        <div className="hair-t mt-12 pt-6">
          <div className="ui text-ink-400 mb-4 text-[13px] tracking-[0.18em] uppercase">
            {t.notFound.elsewhere}
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
                <p className="ui text-ink-500 mt-1 text-[13px] leading-relaxed">{item.why}</p>
              </Link>
            ))}
          </div>
        </div>

        <p className="ui text-ink-400 mt-12 text-[13px]">
          {t.notFound.shortcutHintPrefix} <span className="text-ink-600">Ctrl / Cmd + K</span> {t.notFound.shortcutHintSuffix}
        </p>
      </div>
    </div>
  );
}
