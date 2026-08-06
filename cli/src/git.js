import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';

// 커밋마다 이 구분자로 블록을 나눠서 파싱한다 (커밋 메시지에 절대 등장하지 않을 문자열).
const DELIM = '@@CLAUDE_LENS_COMMIT@@';

// execFileSync에 'git'처럼 이름만 넘기면 OS가 PATH를 뒤져서 실행 파일을 찾는데, 이
// 탐색 자체가 PATH 하이재킹에 취약하다는 지적(SonarCloud javascript:S4036)을 받는다.
// OS 종류나 설치 방식(Homebrew/시스템 git/Windows 등)에 따라 경로가 달라서 고정
// 디렉터리로 하드코딩할 수 없으므로, 현재 PATH를 우리가 직접 순회해서 git의 절대
// 경로를 한 번 찾아두고 그 절대 경로로만 실행한다 (OS의 PATH 탐색을 아예 거치지 않음).
function resolveGitPath() {
  const names = process.platform === 'win32' ? ['git.exe', 'git.cmd'] : ['git'];
  const dirs = (process.env.PATH || '').split(delimiter);
  for (const dir of dirs) {
    for (const name of names) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

const GIT_PATH = resolveGitPath();

// Jackson의 LocalDateTime은 'Z'나 '+09:00' 같은 타임존 오프셋이 붙은 문자열을 못 읽으므로
// 제거한다 (parser.js의 toLocalDateTimeString과 동일한 이유).
function toLocalDateTimeString(isoTimestamp) {
  return isoTimestamp.replace(/(Z|[+-]\d{2}:\d{2})$/, '');
}

export function isGitRepo(cwd = process.cwd()) {
  if (!GIT_PATH) return false;
  try {
    execFileSync(GIT_PATH, ['rev-parse', '--is-inside-work-tree'], {
      cwd,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

// sinceIso가 있으면 그 시각 이후 커밋만, 없으면 전체 히스토리를 가져온다.
// 해시로 서버 쪽에서 중복 제거하므로 경계에서 살짝 겹쳐도 문제없다.
export function getCommits(cwd, sinceIso) {
  cwd ??= process.cwd();
  if (!GIT_PATH) return [];

  const args = ['log', '--name-only', `--pretty=format:${DELIM}%n%H%n%aI%n%s`];
  if (sinceIso) args.push(`--since=${sinceIso}`);

  let output;
  try {
    output = execFileSync(GIT_PATH, args, { cwd, maxBuffer: 1024 * 1024 * 50 }).toString();
  } catch {
    return [];
  }

  return output
    .split(DELIM)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [hash, committedAt, message, ...rest] = block.split('\n');
      const filesChanged = rest.map((line) => line.trim()).filter(Boolean);
      return { hash, committedAt: toLocalDateTimeString(committedAt), message, filesChanged };
    });
}
