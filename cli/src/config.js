import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const CONFIG_DIR = '.claude-lens';
const CONFIG_FILE = 'config.json';

function configPath(cwd) {
  return join(cwd, CONFIG_DIR, CONFIG_FILE);
}

export function loadConfig(cwd = process.cwd()) {
  const path = configPath(cwd);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

export function saveConfig(config, cwd = process.cwd()) {
  const dir = join(cwd, CONFIG_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(configPath(cwd), JSON.stringify(config, null, 2));
}

// .claude-lens/ 안에 apiKey 같은 비밀값이 들어가므로, 대상 프로젝트의
// .gitignore에 없으면 자동으로 추가해준다.
export function ensureGitignored(cwd = process.cwd()) {
  const gitignorePath = join(cwd, '.gitignore');
  const entry = '.claude-lens/';

  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, `${entry}\n`);
    return;
  }

  const content = readFileSync(gitignorePath, 'utf-8');
  if (!content.split('\n').some((line) => line.trim() === entry || line.trim() === '.claude-lens')) {
    appendFileSync(gitignorePath, `\n${entry}\n`);
  }
}
