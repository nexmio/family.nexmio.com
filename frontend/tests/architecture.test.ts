import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = resolve(__dirname, "../src");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

/** Module folders that import from another module folder (hard rule 1). */
export function crossModuleImports(src: string): string[] {
  const modulesDir = join(src, "modules");
  const found: string[] = [];
  for (const file of files(modulesDir).filter((f) => /\.(ts|tsx)$/.test(f))) {
    const own = file.slice(modulesDir.length + 1).split("/")[0];
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/from\s+["']([^"']+)["']/g)) {
      const spec = m[1];
      if (!spec.startsWith(".")) continue;
      const target = resolve(join(file, ".."), spec);
      if (target.startsWith(modulesDir + "/")) {
        const other = target.slice(modulesDir.length + 1).split("/")[0];
        if (other !== own) found.push(`${file.slice(src.length)}: ${spec}`);
      }
    }
  }
  return found;
}

describe("module rules", () => {
  it("no module imports another module", () => {
    expect(crossModuleImports(SRC)).toEqual([]);
  });

  it("the check finds a violation", () => {
    const fixture = resolve(__dirname, "fixtures/bad-src");
    expect(crossModuleImports(fixture).length).toBe(1);
  });

  it("shared code does not import from modules or shell", () => {
    const bad = files(join(SRC, "shared"))
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .filter((f) => /from\s+["'](\.\.\/)+(modules|shell)\//.test(readFileSync(f, "utf8")));
    expect(bad).toEqual([]);
  });

  it("no hex colours are written in components or code", () => {
    const bad = files(SRC)
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .filter((f) => /#[0-9a-fA-F]{6}\b/.test(readFileSync(f, "utf8")));
    expect(bad).toEqual([]);
  });

  it("no UI text is written directly in a component", () => {
    const bad: string[] = [];
    for (const f of files(SRC).filter((x) => x.endsWith(".tsx"))) {
      const text = readFileSync(f, "utf8");
      for (const m of text.matchAll(/<[A-Za-z][^<>]*>\s*([A-Za-zÆØÅæøå][^<>{}]{2,}?)\s*<\//g)) {
        if (["exmio", "Family"].includes(m[1].trim()) || /^podman /.test(m[1].trim())) continue; // brand names and shell commands are not translated
        bad.push(`${f.slice(SRC.length)}: ${m[1].trim()}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
