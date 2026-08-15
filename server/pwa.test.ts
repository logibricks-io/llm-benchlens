import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pub = (f: string) => resolve(__dirname, "..", "client", "public", f);

describe("PWA installability contract", () => {
  const manifest = JSON.parse(readFileSync(pub("manifest.json"), "utf8"));

  it("declares the fields browsers require before offering an install", () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.display).toBe("standalone");
    // Installing from the phone should land on the mobile paradigm, not the
    // desktop workbench squeezed into 390px.
    expect(manifest.start_url).toBe("/m");
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
  });

  it("keeps theme colour aligned with the app shell background", () => {
    expect(manifest.theme_color).toBe("#0b0f10");
    expect(manifest.background_color).toBe("#0b0f10");
  });

  it("ships every icon the manifest points at", () => {
    for (const icon of manifest.icons as Array<{ src: string }>) {
      const svg = readFileSync(pub(icon.src.replace(/^\//, "")), "utf8");
      expect(svg).toContain("<svg");
    }
  });

  it("references the manifest and iOS meta tags from the document head", () => {
    const html = readFileSync(resolve(__dirname, "..", "client", "index.html"), "utf8");
    expect(html).toContain('rel="manifest"');
    expect(html).toContain("apple-mobile-web-app-capable");
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain('name="theme-color"');
  });
});

describe("service worker caching policy", () => {
  const sw = readFileSync(pub("sw.js"), "utf8");

  it("serves API traffic network-first so scores are never silently stale", () => {
    // The API branch must attempt fetch() before falling back to the cache.
    const apiBranch = sw.slice(sw.indexOf('url.pathname.startsWith("/api/")'));
    const fetchAt = apiBranch.indexOf("fetch(request)");
    const cacheAt = apiBranch.indexOf("caches.match(request)");
    expect(fetchAt).toBeGreaterThan(-1);
    expect(cacheAt).toBeGreaterThan(fetchAt);
  });

  it("only caches GET requests and same-origin traffic", () => {
    expect(sw).toContain('request.method !== "GET"');
    expect(sw).toContain("url.origin !== self.location.origin");
  });

  it("cleans up caches from previous versions on activate", () => {
    expect(sw).toContain("caches.delete");
    expect(sw).toContain("self.clients.claim()");
  });

  it("falls back to the mobile shell for offline navigations", () => {
    expect(sw).toContain('caches.match("/m")');
  });
});
