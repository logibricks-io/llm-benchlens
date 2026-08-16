import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
    /*
     * Several suites assert against the real database (coverage, provenance,
     * closed vocabularies) rather than fixtures, because the invariants worth
     * protecting are properties of the corpus, not of a mock. A cold connection
     * to the managed instance can exceed the 5s default and produce a failure
     * that says nothing about correctness — which is worse than a slow test,
     * since a flaky suite trains you to ignore it.
     */
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
