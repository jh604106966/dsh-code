// dsh-ua-skills — 把 skills/ 目录下的 9 个 SKILL.md 注册进 DSH skills registry。
//
// 与 dsh-understand-anything/index.js 完全同一套机制（ctx.inject(['skills']) +
// registerProvider），但刻意做成【零依赖】：不 import '@deepseek-ai/dsh-skill'
// （BUNDLED_SKILL_RANK 直接取常量 600），入口放 lib/ 下符合 DSH bundle 约定。
// 目的：排除「link: 插件自带 node_modules + 宿主运行时解析拦截」这条可疑链路。

import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const name = 'dsh-ua-skills';

const PROVIDER = name;
const RANK = 600; // == BUNDLED_SKILL_RANK
const INVOCATION = { modelInvocable: true, userInvocable: true };
const DEFAULT_ROOT = fileURLToPath(new URL('../skills/', import.meta.url));
const LOG = 'C:/Users/60410/Documents/deepseek-harness/default-workspace/ua-skills-plugin.log';

function log(message) {
  try {
    appendFileSync(LOG, `${new Date().toISOString()} ${message}\n`);
  } catch {
    /* 日志失败不影响加载 */
  }
}

log(`module evaluated root=${DEFAULT_ROOT} exists=${existsSync(DEFAULT_ROOT)}`);

/** 列出 root 下每个含 SKILL.md 的一级目录，转成 skill registry 候选。 */
export function listBundledSkills(root = DEFAULT_ROOT) {
  if (!existsSync(root)) return [];
  const skills = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillFile = join(root, entry.name, 'SKILL.md');
    if (!existsSync(skillFile)) continue;
    const body = readFileSync(skillFile, 'utf8');
    const fm = parseFrontmatter(body);
    skills.push({
      name: fm.name || entry.name,
      description: fm.description || firstParagraph(body),
      invocation: INVOCATION,
      provider: PROVIDER,
      source: 'bundled',
      rank: RANK,
      resourceBase: { kind: 'directory', path: join(root, entry.name) },
      locator: skillFile,
    });
  }
  return skills;
}

/** 从 SKILL.md 的 YAML frontmatter 抽出 name / description。 */
export function parseFrontmatter(markdown) {
  const match = /^---\n([\s\S]*?)\n---/u.exec(markdown);
  if (!match) return {};
  const block = match[1] ?? '';
  const field = (key) => {
    const line = new RegExp(`^${key}:\\s*(.+)$`, 'mu').exec(block)?.[1]?.trim();
    return line === undefined ? undefined : line.replace(/^['"]|['"]$/g, '').trim();
  };
  return { name: field('name'), description: field('description') };
}

/** frontmatter 之后第一段非空、非标题文字（description 缺漏时的 fallback）。 */
function firstParagraph(markdown) {
  const body = markdown.replace(/^---[\s\S]*?---\n?/u, '');
  return body
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('#'));
}

export function apply(ctx) {
  log('apply called');
  ctx.inject(['skills'], (skillCtx) => {
    const candidates = listBundledSkills();
    log(`registering provider with ${candidates.length} candidates`);
    if (candidates.length === 0) return;
    const provider = {
      name: PROVIDER,
      list: () => Promise.resolve(candidates),
      async get(candidate) {
        if (typeof candidate.locator !== 'string' || !existsSync(candidate.locator)) return undefined;
        return {
          name: candidate.name,
          description: candidate.description,
          invocation: candidate.invocation,
          provider: candidate.provider,
          source: candidate.source,
          resourceBase: candidate.resourceBase,
          content: readFileSync(candidate.locator, 'utf8'),
        };
      },
    };
    skillCtx.skills.registerProvider(() => provider);
  });
}
