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

// tool_use가 실제로 건드린 파일 경로/명령어를 뽑아낸다. 이 turn이 프로젝트와
// 관련 있는 작업이었는지 판단하는 근거로 쓴다 (아래 isProjectRelevant 참고).
function extractToolUsePaths(entry) {
  const content = entry.message?.content;
  if (!Array.isArray(content)) return [];
  return content
    .filter((block) => block.type === 'tool_use')
    .map((block) => {
      const input = block.input ?? {};
      return input.file_path ?? input.path ?? input.notebook_path ?? input.command ?? null;
    })
    .filter(Boolean);
}

// 이 프로젝트 폴더 밖의 파일/명령만 건드렸거나 tool_use 자체가 없는 turn(순수 잡담,
// 관련 없는 질문 등)은 분석 대상에서 제외한다. 실제로 이 프로젝트 코드를 건드린
// 흔적이 하나라도 있으면 관련 있다고 본다.
function isProjectRelevant(toolPaths, cwd) {
  return toolPaths.some((p) => p.includes(cwd));
}

// Jackson의 LocalDateTime은 'Z'(UTC 오프셋)가 붙은 문자열을 못 읽으므로 제거한다.
function toLocalDateTimeString(isoTimestamp) {
  return isoTimestamp.replace('Z', '');
}

// 세션 파일 하나를 (실제 사용자 프롬프트, 다음 프롬프트 전까지 나온 assistant 텍스트 전부)
// 쌍의 목록으로 변환한다. 각 항목에는 relevant 플래그가 붙는데, 이 turn에서 실제로
// 이 프로젝트 폴더(cwd) 안의 파일/명령을 건드린 tool_use가 있었는지를 나타낸다.
// 프로젝트와 무관한 잡담(다른 폴더 작업, 순수 Q&A 등)을 걸러내는 데 쓴다.
export function parseSessionFile(filePath, cwd = process.cwd()) {
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
        relevant: isProjectRelevant(current.toolPaths, cwd),
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
          toolPaths: [],
        };
      }
    } else if (entry.type === 'assistant' && current) {
      const text = extractAssistantText(entry);
      if (text) {
        current.responseParts.push(text);
        current.lastTimestamp = entry.timestamp;
      }
      current.toolPaths.push(...extractToolUsePaths(entry));
    }
  }
  flush();

  return interactions;
}
