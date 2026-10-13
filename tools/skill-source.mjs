#!/usr/bin/env node
/**
 * Record the provenance of an external skill source in profile/manifest.json.
 *
 * tools/sync.mjs reads this block and stamps version/commit/license/upstream onto
 * every skill that belongs to the source, so the updater scripts (which own the
 * checkout) never have to touch the generated manifest fields by hand.
 *
 * Usage:
 *   node tools/skill-source.mjs --id superpowers --upstream <url> --ref main \
 *        --checkout <dir> --license MIT --version 7.0.0 --commit <sha> \
 *        --skills brainstorming,writing-plans
 *
 * Missing profile/manifest.json is a warning, not an error (run tools/sync.mjs first).
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const REPO = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(REPO, 'profile', 'manifest.json');

const flagValue = (name) => {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
};

const id = flagValue('--id');
if (!id) {
  console.error('usage: node tools/skill-source.mjs --id <id> [--upstream url] [--ref ref] [--checkout dir] [--license spdx] [--version v] [--commit sha] [--skills a,b,c]');
  process.exit(2);
}

const skills = (flagValue('--skills') || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const entry = { id };
for (const [key, flag] of [
  ['upstream', '--upstream'],
  ['ref', '--ref'],
  ['checkout', '--checkout'],
  ['license', '--license'],
  ['version', '--version'],
  ['commit', '--commit'],
  ['updatedAt', '--updated-at'],
]) {
  const value = flagValue(flag);
  if (value) entry[key] = value;
}
if (!entry.updatedAt) entry.updatedAt = new Date().toISOString().slice(0, 10);
if (skills.length) entry.skills = skills;

if (!fs.existsSync(MANIFEST)) {
  console.warn(`! ${path.relative(REPO, MANIFEST)} not found - run tools/sync.mjs first, then re-run this.`);
  process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const others = (manifest.skillSources || []).filter((s) => s.id !== id);
manifest.skillSources = [...others, entry];
fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`  ~ profile/manifest.json > skillSources[${id}] = ${entry.version || '?'} ${(entry.commit || '').slice(0, 7)} (${entry.skills ? entry.skills.length : 0} skills)`);
