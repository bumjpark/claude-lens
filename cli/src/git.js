import { execFileSync } from 'node:child_process';

// 커밋마다 이 구분자로 블록을 나눠서 파싱한다 (커밋 메시지에 절대 등장하지 않을 문자열).
const DELIM = '@@CLAUDE_LENS_COMMIT@@';

// Jackson의 LocalDateTime은 'Z'나 '+09:00' 같은 타임존 오프셋이 붙은 문자열을 못 읽으므로
// 제거한다 (parser.js의 toLocalDateTimeString과 동일한 이유).
function toLocalDateTimeString(isoTimestamp) {
  return isoTimestamp.replace(/(Z|[+-]\d{2}:\d{2})$/, '');
}

export function isGitRepo(cwd = process.cwd()) {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
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
export function getCommits(cwd = process.cwd(), sinceIso) {
  const args = ['log', '--name-only', `--pretty=format:${DELIM}%n%H%n%aI%n%s`];
  if (sinceIso) args.push(`--since=${sinceIso}`);

  let output;
  try {
    output = execFileSync('git', args, { cwd, maxBuffer: 1024 * 1024 * 50 }).toString();
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
