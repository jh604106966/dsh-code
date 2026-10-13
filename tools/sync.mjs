#!/usr/bin/env node
/**
 * tools/sync.mjs — re-collect this machine's DSH plugin environment into the repo.
 *
 * What it does:
 *   1. discovers local plugin sources  (profile "link:" deps + <DSH_HOME>/plugins/*)
 *   2. discovers installed agent presets (<DSH_HOME>/.agent-presets/*)
 *   3. copies the local sources into plugins/ (recursive, minus node_modules/.git/...)
 *   4. resolves the installed version of every npm (registry) plugin
 *   5. mirrors the machine-wide skill roots (<DSH_HOME>/skills, <AGENTS_HOME>/skills)
 *      into skills/ - except the skills a repo-carried plugin syncs by itself
 *   6. regenerates profile/manifest.json + profile/package.snapshot.json
 *
 * Usage:
 *   node tools/sync.mjs [--check] [--profile desktop] [--dsh-home <dir>] [--agents-home <dir>]
 *
 *   --check   report only, write nothing
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';

const argv = process.argv.slice(2);
const flagValue = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

const CHECK = argv.includes('--check');
const PROFILE = flagValue('--profile') || 'desktop';
const DSH_HOME = path.resolve(
  flagValue('--dsh-home') || process.env.DSH_HOME || path.join(os.homedir(), '.dsh'),
);
const REPO = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');

const PROFILE_DIR = path.join(DSH_HOME, 'profiles', PROFILE);
const MACHINE_PLUGINS = path.join(DSH_HOME, 'plugins');
const MACHINE_PRESETS = path.join(DSH_HOME, '.agent-presets');

const EXCLUDE_DIRS = new Set(['node_modules', '.git', '.tmp', 'docs-local', '.turbo', '.vite', '.cache']);
const EXCLUDE_FILE_RE = /(\.log$)|(^lib\.bak-)|(\.bak-)|(\.rea\.backup$)|(\.tgz$)/i;
const KEEP_TGZ = new Set(['dsh-router-standard-0.3.0.tgz']);

// ---------------------------------------------------------------- helpers
const exists = (p) => { try { fs.statSync(p); return true; } catch { return false; } };
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const rel = (p) => path.relative(REPO, p).split(path.sep).join('/');
const listDirs = (p) => (isDir(p) ? fs.readdirSync(p, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : []);

function copyTree(src, dst, stats) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      copyTree(s, d, stats);
    } else if (entry.isFile()) {
      if (EXCLUDE_FILE_RE.test(entry.name) && !KEEP_TGZ.has(entry.name)) continue;
      fs.copyFileSync(s, d);
      stats.files += 1;
      stats.bytes += fs.statSync(d).size;
    }
  }
}

/**
 * A linked package normally sits at the root of its own repo, so the package dir
 * itself is the unit. Only a sub-package of a workspace monorepo resolves upward
 * (ancestor with .git + package.json.workspaces) - this keeps an unrelated
 * ancestor repo (e.g. a huge multi-project folder) from being mirrored by accident.
 */
function repoRootOf(p) {
  const abs = path.resolve(p);
  let cur = abs;
  for (let i = 0; i < 4; i += 1) {
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
    const pkg = path.join(cur, 'package.json');
    if (exists(path.join(cur, '.git')) && exists(pkg)) {
      try {
        if (readJson(pkg).workspaces) return cur;
      } catch { /* unreadable package.json - keep the package dir */ }
    }
  }
  return abs;
}

function human(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function presetName(dir) {
  for (const marker of ['preset.yml', 'agent.cordis.yml', 'agent.cordis.yaml']) {
    if (exists(path.join(dir, marker))) return true;
  }
  return false;
}

// ------------------------------------------------- 1. profile + deps
if (!exists(path.join(PROFILE_DIR, 'package.json'))) {
  console.error(`! profile not found: ${rel(PROFILE_DIR)} (pass --profile <name>)`);
  process.exit(1);
}
const profilePkg = readJson(path.join(PROFILE_DIR, 'package.json'));
const deps = profilePkg.dependencies || {};
const prevManifest = exists(path.join(REPO, 'profile', 'manifest.json'))
  ? readJson(path.join(REPO, 'profile', 'manifest.json'))
  : { localPlugins: [], registryPlugins: [], presets: [] };
const prevLocal = new Map((prevManifest.localPlugins || []).map((p) => [p.path, p]));
const prevRegistry = new Map((prevManifest.registryPlugins || []).map((p) => [p.name, p]));

// ------------------------------------------------- 2. local plugin units
/** unit = a directory mirrored wholesale into plugins/<basename> */
const units = new Map(); // absolute machine path -> { target, origin }

const addUnit = (dir, origin) => {
  const abs = path.resolve(dir);
  if (!units.has(abs)) units.set(abs, { target: `plugins/${path.basename(abs)}`, origin });
};
const underPluginRoot = (p) => {
  const r = path.relative(MACHINE_PLUGINS, path.resolve(p));
  return r !== '' && !r.startsWith('..') && !path.isAbsolute(r);
};

for (const name of listDirs(MACHINE_PLUGINS)) {
  addUnit(path.join(MACHINE_PLUGINS, name), 'DSH_HOME/plugins');
}

for (const [depName, spec] of Object.entries(deps)) {
  if (typeof spec !== 'string' || !spec.startsWith('link:')) continue;
  const target = path.resolve(spec.slice('link:'.length));
  if (underPluginRoot(target)) continue; // ships with its top-level dir above
  addUnit(repoRootOf(target), `profile link: ${depName}`);
}

// plugins injected at runtime by dsh-super-injector (they are not in profile package.json)
const injectorRegistry = path.join(DSH_HOME, 'super-injector', 'registry.json');
if (exists(injectorRegistry)) {
  try {
    for (const entry of readJson(injectorRegistry)) {
      if (!entry || !entry.dir || underPluginRoot(entry.dir)) continue;
      addUnit(repoRootOf(entry.dir), `injector registry (${entry.at || '?'})`);
    }
  } catch { /* malformed registry - ignore */ }
}

// ------------------------------------------------- 3. registry plugins
const registryPlugins = [];
for (const [depName, spec] of Object.entries(deps)) {
  if (typeof spec === 'string' && spec.startsWith('link:')) continue;
  const installedPkg = path.join(PROFILE_DIR, 'node_modules', depName, 'package.json');
  const version = exists(installedPkg) ? readJson(installedPkg).version : null;
  const prev = prevRegistry.get(depName);
  registryPlugins.push({
    name: depName,
    version: version || spec,
    declared: spec,
    ...(prev && prev.summary ? { summary: prev.summary } : { summary: 'TODO: one-line description' }),
  });
}
registryPlugins.sort((a, b) => a.name.localeCompare(b.name));

// ------------------------------------------------- 4. copy local sources
const report = { units: [], skippedPresets: [], stale: [], normalized: [] };
const ordered = [...units.entries()].sort((a, b) => a[1].target.localeCompare(b[1].target));
for (const [src, { target: targetRel, origin }] of ordered) {
  const dst = path.join(REPO, targetRel);
  const stats = { files: 0, bytes: 0 };
  if (!CHECK) {
    fs.rmSync(dst, { recursive: true, force: true });
    copyTree(src, dst, stats);
  } else {
    const walk = (p) => {
      for (const e of fs.readdirSync(p, { withFileTypes: true })) {
        const c = path.join(p, e.name);
        if (e.isDirectory()) { if (!EXCLUDE_DIRS.has(e.name)) walk(c); }
        else if (e.isFile() && (!EXCLUDE_FILE_RE.test(e.name) || KEEP_TGZ.has(e.name))) {
          stats.files += 1; stats.bytes += fs.statSync(c).size;
        }
      }
    };
    walk(src);
  }
  report.units.push({ target: targetRel, source: src, origin, ...stats });
}

// ------------------------------------------------- 5. presets
// repo presets that ship inside a plugin repo...
const bundled = new Map(); // name -> repo path
for (const [src, u] of units.entries()) {
  for (const sub of listDirs(path.join(src, 'preset'))) {
    const p = path.join(src, 'preset', sub);
    if (presetName(p)) bundled.set(sub, `${u.target}/preset/${sub}`);
  }
}
const looseDir = path.join(REPO, 'presets');
const presetEntries = [];

for (const name of listDirs(MACHINE_PRESETS)) {
  const src = path.join(MACHINE_PRESETS, name);
  if (!presetName(src)) continue;
  if (bundled.has(name)) {
    report.skippedPresets.push(`${name} (ships inside ${bundled.get(name)})`);
  } else {
    const targetRel = `presets/${name}`;
    const stats = { files: 0, bytes: 0 };
    if (!CHECK) {
      fs.rmSync(path.join(REPO, targetRel), { recursive: true, force: true });
      copyTree(src, path.join(REPO, targetRel), stats);
    }
    report.units.push({ target: targetRel, source: src, ...stats });
  }
  presetEntries.push({ name, dir: bundled.get(name) || `presets/${name}`, installed: true });
}

// presets available in the repo but not installed locally
for (const [name, p] of bundled) {
  if (!presetEntries.some((e) => e.name === name)) presetEntries.push({ name, dir: p, installed: false });
}
for (const name of listDirs(looseDir)) {
  if (!presetEntries.some((e) => e.name === name) && presetName(path.join(looseDir, name))) {
    presetEntries.push({ name, dir: `presets/${name}`, installed: false });
  }
}
presetEntries.sort((a, b) => a.name.localeCompare(b.name));

// ------------------------------------------------- 5b. keep prebuilt output tracked
// Upstream .gitignore files ignore lib/ and dist/ (build output). This snapshot ships
// that output on purpose - a missing lib/index.js means "plugin loads nothing" on the
// next machine - so those rules are commented out right after copying.
const PREBUILT_IGNORES = new Set(['lib', 'lib/', '/lib', '/lib/', 'dist', 'dist/', '/dist', '/dist/']);
function neutralizePrebuiltIgnores(root, changed) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) neutralizePrebuiltIgnores(p, changed);
      continue;
    }
    if (entry.name !== '.gitignore') continue;
    const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    let hit = 0;
    const out = lines.map((l) => {
      const t = l.trim();
      if (!PREBUILT_IGNORES.has(t)) return l;
      hit += 1;
      return `# ${t}   <- neutralized by tools/sync.mjs: this snapshot tracks prebuilt lib/ and dist/`;
    });
    if (hit) {
      if (!CHECK) fs.writeFileSync(p, out.join('\n'));
      changed.push(`${rel(p)} (${hit} rule${hit > 1 ? 's' : ''})`);
    }
  }
}
for (const { target } of report.units) {
  const dir = path.join(REPO, target);
  if (isDir(dir)) neutralizePrebuiltIgnores(dir, report.normalized);
}
if (report.normalized.length) {
  report.normalized = [...new Set(report.normalized)];
}

// ------------------------------------------------- 5c. skills (the DSH skill library)
// DSH discovers skills in <project>/.dsh/skills, <project>/.agents/skills,
// config.customSkillDirs, <DSH_HOME>/skills and <AGENTS_HOME>/skills
// (@deepseek-ai/dsh-skill-filesystem). Only the two home-level roots are
// machine-wide, so those are what this snapshot mirrors: every skill that a
// repo-carried plugin does NOT ship itself is copied into skills/<name>.
// Skills a plugin syncs at boot (dsh-memory-evolve ships 5 under
// plugins/dsh-memory-evolve/skills/) are recorded with providedBy and skipped -
// re-installing that plugin restores them, so copying them here as well would
// only create a second, drifting copy.
const AGENTS_HOME = path.resolve(
  flagValue('--agents-home') || process.env.DSH_AGENTS_HOME || path.join(os.homedir(), '.agents'),
);
const SKILL_ROOTS = [
  { dir: path.join(DSH_HOME, 'skills'), origin: 'DSH_HOME/skills' },
  { dir: path.join(AGENTS_HOME, 'skills'), origin: 'AGENTS_HOME/skills' },
];
const prevSkills = new Map((prevManifest.skills || []).map((s) => [s.name, s]));

// profile/manifest.json > skillSources is the hand-written/updater-maintained
// provenance block (one entry per external upstream). It wins over the previous
// manifest entry, so tools/update-superpowers.* only has to refresh it.
const skillSourceOf = (name) => {
  for (const src of prevManifest.skillSources || []) {
    if (Array.isArray(src.skills) && src.skills.includes(name)) return src;
  }
  return null;
};

/** "plugins/<unit>/skills/<name>" when a repo-carried plugin ships this skill. */
const pluginSkillSource = (name) => {
  for (const u of units.values()) {
    if (exists(path.join(REPO, u.target, 'skills', name, 'SKILL.md'))) return `${u.target}/skills/${name}`;
  }
  return null;
};

/** name/description/provider out of a SKILL.md YAML head (front matter only). */
function skillFrontMatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const head = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm = head ? head[1] : '';
  const field = (key) => {
    const hit = fm.match(new RegExp(`^${key}:[ \t]*(.*)$`, 'm'));
    return hit ? hit[1].trim().replace(/^["']|["']$/g, '') : null;
  };
  return { name: field('name'), description: field('description'), provider: field('x-provider') };
}

const skills = [];
const skillUnits = [];
const skippedSkills = [];
const staleSkills = [];
for (const root of SKILL_ROOTS) {
  for (const name of listDirs(root.dir)) {
    const dir = path.join(root.dir, name);
    const file = path.join(dir, 'SKILL.md');
    if (!exists(file)) {
      skippedSkills.push(`${name} (${root.origin}: no SKILL.md)`);
      continue;
    }
    const meta = skillFrontMatter(file);
    const providedBy = pluginSkillSource(name);
    const prev = prevSkills.get(name) || {};
    if (providedBy) {
      skills.push({
        name,
        providedBy,
        provider: meta.provider || prev.provider || null,
        description: meta.description || prev.description || null,
        installedFrom: root.origin,
      });
      continue;
    }
    const targetRel = `skills/${name}`;
    const stats = { files: 0, bytes: 0 };
    if (!CHECK) {
      fs.rmSync(path.join(REPO, targetRel), { recursive: true, force: true });
      copyTree(dir, path.join(REPO, targetRel), stats);
    } else {
      const walk = (p) => {
        for (const e of fs.readdirSync(p, { withFileTypes: true })) {
          const c = path.join(p, e.name);
          if (e.isDirectory()) { if (!EXCLUDE_DIRS.has(e.name)) walk(c); }
          else if (e.isFile() && !EXCLUDE_FILE_RE.test(e.name)) {
            stats.files += 1; stats.bytes += fs.statSync(c).size;
          }
        }
      };
      walk(dir);
    }
    skillUnits.push({ target: targetRel, source: dir, origin: root.origin, ...stats });
    const prov = skillSourceOf(name);
    skills.push({
      name,
      path: targetRel,
      description: meta.description || prev.description || null,
      provider: meta.provider || prev.provider || null,
      source: prov ? prov.upstream : prev.source || root.origin,
      upstream: prov ? prov.upstream : prev.upstream ?? null,
      license: prov ? prov.license ?? null : prev.license ?? null,
      version: prov ? prov.version ?? null : prev.version ?? null,
      commit: prov ? prov.commit ?? null : prev.commit ?? null,
      installedFrom: root.origin,
    });
  }
}
skills.sort((a, b) => a.name.localeCompare(b.name));
const skillBytes = new Map(skillUnits.map((u) => [u.target, u.bytes]));
for (const name of listDirs(path.join(REPO, 'skills'))) {
  if (!skills.some((s) => s.path === `skills/${name}`)) staleSkills.push(`skills/${name}`);
}

// ------------------------------------------------- 6. installable local plugin records
// The authoritative "must be re-added on the next machine" set is the profile's
// link: dependencies - that is exactly what DSH loads here. Each is mapped to the
// path it occupies inside the repo, keeping hand-written summary/upstream text.
const prevByName = new Map((prevManifest.localPlugins || []).map((p) => [p.name, p]));
const localPlugins = [];
for (const [depName, spec] of Object.entries(deps)) {
  if (typeof spec !== 'string' || !spec.startsWith('link:')) continue;
  const target = path.resolve(spec.slice('link:'.length));
  const unit = [...units.keys()].find((u) => target === u || target.startsWith(u + path.sep));
  if (!unit) continue;
  const repoPath = path.posix.join(
    units.get(unit).target,
    path.relative(unit, target).split(path.sep).filter(Boolean).join('/'),
  );
  const pkgPath = path.join(REPO, repoPath, 'package.json');
  if (!exists(pkgPath)) continue;
  const pkg = readJson(pkgPath);
  const prev = prevByName.get(pkg.name) || prevLocal.get(repoPath) || {};
  localPlugins.push({
    name: pkg.name || depName,
    version: pkg.version || null,
    path: repoPath,
    license: pkg.license || prev.license || null,
    upstream: prev.upstream ?? null,
    bundlePatch: pkg.dsh?.bundle?.patch
      || (exists(path.join(REPO, repoPath, 'cordis.patch.yml')) ? 'cordis.patch.yml' : null),
    summary: prev.summary || pkg.description || 'TODO: one-line description',
  });
}
localPlugins.sort((a, b) => a.path.localeCompare(b.path));

// plugin packages sitting in the repo that this machine does not load via link:
// (informational - install scripts only add manifest.localPlugins)
const linked = localPlugins.map((p) => p.path);
const isPluginPkg = (dir) => {
  if (!exists(path.join(dir, 'package.json'))) return false;
  if (exists(path.join(dir, 'dsh.plugin.json')) || exists(path.join(dir, 'cordis.patch.yml'))) return true;
  try { return Boolean(readJson(path.join(dir, 'package.json')).dsh); } catch { return false; }
};
const extraPluginDirs = [];
for (const [unit, u] of units.entries()) {
  const stack = [{ abs: unit, rel: u.target, depth: 0 }];
  while (stack.length) {
    const cur = stack.pop();
    if (!isPluginPkg(cur.abs)) {
      if (cur.depth >= 3) continue;
      for (const sub of listDirs(cur.abs)) {
        if (!EXCLUDE_DIRS.has(sub)) stack.push({ abs: path.join(cur.abs, sub), rel: `${cur.rel}/${sub}`, depth: cur.depth + 1 });
      }
      continue;
    }
    const covered = linked.some((l) => l === cur.rel || l.startsWith(`${cur.rel}/`) || cur.rel.startsWith(`${l}/`));
    if (!covered) {
      const pkg = readJson(path.join(cur.abs, 'package.json'));
      extraPluginDirs.push({ name: pkg.name || path.basename(cur.rel), version: pkg.version || null, path: cur.rel });
    }
  }
}
extraPluginDirs.sort((a, b) => a.path.localeCompare(b.path));

// stale repo dirs (present in repo, no machine source anymore)
for (const name of listDirs(path.join(REPO, 'plugins'))) {
  if (![...units.values()].some((u) => u.target === `plugins/${name}` || u.target.startsWith(`plugins/${name}/`))) {
    report.stale.push(`plugins/${name}`);
  }
}

// ------------------------------------------------- 7. write metadata
const today = new Date().toISOString().slice(0, 10);
let dshInfo = prevManifest.dsh && typeof prevManifest.dsh === 'object' ? prevManifest.dsh : {};
const runtimeFile = path.join(DSH_HOME, 'dsh-runtimes', 'dsh-primary-runtime', 'runtime.json');
if (exists(runtimeFile)) {
  try {
    const r = readJson(runtimeFile);
    dshInfo = {
      desktopVersion: r.desktopVersion || dshInfo.desktopVersion || null,
      platform: r.platform || dshInfo.platform || null,
      arch: r.arch || dshInfo.arch || null,
      node: r.node || dshInfo.node || null,
      pnpm: r.pnpm || dshInfo.pnpm || null,
    };
  } catch { /* keep the previous block */ }
}
const manifest = {
  name: 'dsh-code',
  description: 'DeepSeek Harness (DSH) plugin environment snapshot: local plugin sources + agent presets + pinned community plugin versions',
  capturedAt: today,
  dsh: dshInfo,
  profile: PROFILE,
  dshHome: DSH_HOME,
  localPlugins,
  extraPluginDirs,
  presets: presetEntries,
  registryPlugins,
  skills,
  // Hand-written provenance for skills that come from an external upstream
  // (id -> {upstream, ref, checkout, license, version, commit, skills[]}); kept
  // verbatim across runs, refreshed by tools/update-superpowers.ps1.
  skillSources: prevManifest.skillSources || undefined,
  sources: report.units.map((u) => ({ repo: u.target, machine: u.source, origin: u.origin })),
  excluded: prevManifest.excluded || undefined,
};

const snapshot = {
  _snapshot: {
    note: "Generate a fresh profile on the target machine with install.ps1 / install.sh - do not copy this file over a profile package.json (link: paths are machine-specific).",
    capturedAt: today,
    profile: PROFILE,
    dshHome: DSH_HOME,
  },
  _profilePackage: profilePkg,
};

if (!CHECK) {
  const dir = path.join(REPO, 'profile');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, 'package.snapshot.json'), `${JSON.stringify(snapshot, null, 2)}\n`);
}

// ------------------------------------------------- 8. report
const docsPath = path.join(REPO, 'PLUGINS.md');
const docs = exists(docsPath) ? fs.readFileSync(docsPath, 'utf8') : '';
const undocumented = localPlugins
  .filter((p) => !docs.includes(p.name) && !docs.includes(path.basename(p.path)))
  .map((p) => `${p.name} (${p.path})`);

console.log(`${CHECK ? '[check] ' : ''}DSH plugin snapshot — profile=${PROFILE} home=${DSH_HOME}`);
console.log('');
console.log('sources mirrored into plugins/:');
for (const u of report.units) {
  console.log(`  ${u.target.padEnd(46)} <- ${u.source}   (${u.files} files, ${human(u.bytes)})`);
  console.log(`${' '.repeat(6)}origin: ${u.origin}`);
}
if (!report.units.length) console.log('  (none)');
if (report.skippedPresets.length) {
  console.log('');
  console.log('presets already shipped inside a plugin repo (not duplicated):');
  for (const s of report.skippedPresets) console.log(`  - ${s}`);
}
if (report.normalized.length) {
  console.log('');
  console.log('prebuilt-output ignore rules neutralized (lib/, dist/ stay in the repo):');
  for (const n of report.normalized) console.log(`  - ${n}`);
}
console.log('');
console.log('local plugins (link: deps - these get re-added by install.ps1/install.sh):');
for (const p of localPlugins) console.log(`  ${p.name}@${p.version}  -> ${p.path}`);
console.log('');
console.log('registry plugins (version lock):');
for (const p of registryPlugins) {
  const drift = p.declared !== p.version ? `  [declared ${p.declared}]` : '';
  console.log(`  ${p.name}@${p.version}${drift}`);
}
console.log('');
console.log('agent presets:');
for (const p of presetEntries) {
  console.log(`  ${p.installed ? '[installed]' : '[repo only]'} ${p.name} -> ${p.dir}`);
}
const shippedSkills = skills.filter((s) => s.path);
const bundledSkills = skills.filter((s) => s.providedBy);
if (skills.length) {
  console.log('');
  console.log('skills mirrored into skills/ (restored by install.ps1/install.sh):');
  for (const s of shippedSkills) {
    const src = s.source && s.source !== s.installedFrom ? `${s.installedFrom} from ${s.source}` : s.installedFrom;
    const ver = s.version ? `@${s.version}` : '';
    console.log(`  ${s.name.padEnd(32)} ${human(skillBytes.get(s.path) || 0).padStart(8)}  <- ${src}${ver}`);
  }
  if (!shippedSkills.length) console.log('  (none)');
  if (bundledSkills.length) {
    console.log('');
    console.log('skills a repo plugin syncs by itself (recorded, not duplicated):');
    for (const s of bundledSkills) console.log(`  ${s.name.padEnd(32)} <- ${s.providedBy}`);
  }
  if (skippedSkills.length) {
    console.log('');
    console.log('! skill directories without a SKILL.md (left alone):');
    for (const s of skippedSkills) console.log(`  - ${s}`);
  }
  if (staleSkills.length) {
    console.log('');
    console.log('! in repo skills/ but not installed on this machine (left untouched, decide by hand):');
    for (const s of staleSkills) console.log(`  - ${s}`);
  }
}
if (extraPluginDirs.length) {
  console.log('');
  console.log('! plugin packages in the repo that no link: dep loads (not auto-installed):');
  for (const e of extraPluginDirs) console.log(`  - ${e.name}@${e.version} (${e.path})`);
}
if (report.stale.length) {
  console.log('');
  console.log('! in repo but has no machine source any more (left untouched, decide by hand):');
  for (const s of report.stale) console.log(`  - ${s}`);
}
if (undocumented.length) {
  console.log('');
  console.log('! missing a section in PLUGINS.md (add one by hand):');
  for (const d of undocumented) console.log(`  - ${d}`);
}
const skillsDocsPath = path.join(REPO, 'SKILLS.md');
const skillsDocs = exists(skillsDocsPath) ? fs.readFileSync(skillsDocsPath, 'utf8') : '';
const undocumentedSkills = skills.filter((s) => !skillsDocs.includes(s.name)).map((s) => s.name);
if (undocumentedSkills.length) {
  console.log('');
  console.log(`! missing a row in SKILLS.md${exists(skillsDocsPath) ? '' : ' (file does not exist yet)'} (add one by hand):`);
  for (const d of undocumentedSkills) console.log(`  - ${d}`);
}
console.log('');
console.log(CHECK ? 'check only - nothing written.' : 'wrote profile/manifest.json + profile/package.snapshot.json');
