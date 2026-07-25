import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const SESSION_FILE_PATTERN = /^[0-9a-f-]{36}\.jsonl$/i;

// Claude Code는 프로젝트 절대 경로의 '/'를 '-'로 바꿔서 세션 로그 폴더 이름을 만든다.
// 예: /Users/me/claude-lens -> -Users-me-claude-lens
export function encodeProjectPath(cwd) {
  return cwd.replace(/\//g, '-');
}

export function findSessionDir(cwd = process.cwd()) {
  return join(homedir(), '.claude', 'projects', encodeProjectPath(cwd));
}

// agent-*.jsonl(서브에이전트 로그), memory/ 등은 제외하고 메인 세션 파일만 찾는다.
export function findSessionFiles(cwd = process.cwd()) {
  const dir = findSessionDir(cwd);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((name) => SESSION_FILE_PATTERN.test(name))
    .map((name) => ({ name, path: join(dir, name) }));
}

function extractUserText(entry) {
  // promptSource === 'typed'인 턴만 사람이 실제로 입력한 프롬프트다.
  // 그 외(undefined/system 등)는 슬래시 커맨드 출력, task-notification,
  // tool_result 릴레이처럼 사람이 타이핑한 게 아니라서 분석 대상에서 제외한다.
  if (entry.promptSource !== 'typed') return null;

  const content = entry.message?.content;
  if (typeof content === 'string') return content.trim() || null;
  if (Array.isArray(content)) {
    const text = content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();
    return text || null;
  }
  return null;
}

function extractAssistantText(entry) {
  if (entry.isApiErrorMessage) return null;
  const content = entry.message?.content;
  if (!Array.isArray(content)) return null;
  const text = content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
  return text || null;
}

// Jackson의 LocalDateTime은 'Z'(UTC 오프셋)가 붙은 문자열을 못 읽으므로 제거한다.
function toLocalDateTimeString(isoTimestamp) {
  return isoTimestamp.replace('Z', '');
}

// 세션 파일 하나를 (실제 사용자 프롬프트, 다음 프롬프트 전까지 나온 assistant 텍스트 전부)
// 쌍의 목록으로 변환한다.
export function parseSessionFile(filePath) {
  const lines = readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
  const interactions = [];
  let current = null;

  const flush = () => {
    if (current && current.responseParts.length > 0) {
      const responseTimeMs = new Date(current.lastTimestamp) - new Date(current.requestedAt);
      interactions.push({
        promptText: current.promptText,
        responseText: current.responseParts.join('\n\n'),
        requestedAt: toLocalDateTimeString(current.requestedAt),
        responseTimeMs: Number.isFinite(responseTimeMs) && responseTimeMs >= 0 ? responseTimeMs : null,
      });
    }
  };

  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    if (entry.type === 'user') {
      const promptText = extractUserText(entry);
      if (promptText) {
        flush();
        current = {
          promptText,
          requestedAt: entry.timestamp,
          lastTimestamp: entry.timestamp,
          responseParts: [],
        };
      }
    } else if (entry.type === 'assistant' && current) {
      const text = extractAssistantText(entry);
      if (text) {
        current.responseParts.push(text);
        current.lastTimestamp = entry.timestamp;
      }
    }
  }
  flush();

  return interactions;
}
