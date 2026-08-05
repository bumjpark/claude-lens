import { loadConfig, saveConfig } from '../config.js';
import { findSessionFiles, parseSessionFile } from '../parser.js';
import { uploadBatch, uploadCommitBatch } from '../api.js';
import { isGitRepo, getCommits } from '../git.js';

const CHUNK_SIZE = 50;

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// 실제 커밋 이력을 AI 분석의 근거로 쓰기 위해 git log를 동기화한다.
// git 저장소가 아니거나 새 커밋이 없으면 조용히 건너뛴다.
async function syncCommits(config) {
  if (!isGitRepo()) return;

  const commits = getCommits(process.cwd(), config.commitSyncedAt);
  if (commits.length === 0) return;

  const commitLogs = commits.map((c) => ({
    projectId: config.projectId,
    commitHash: c.hash,
    message: c.message,
    committedAt: c.committedAt,
    filesChanged: c.filesChanged,
  }));

  for (const batch of chunk(commitLogs, CHUNK_SIZE)) {
    await uploadCommitBatch(config.baseUrl, config.apiKey, batch);
  }

  // git log는 최신 커밋이 먼저 나오므로 첫 항목의 시각을 다음 커서로 쓴다.
  config.commitSyncedAt = commits[0].committedAt;
  saveConfig(config);
  console.log(`커밋 ${commits.length}건 업로드.`);
}

export async function syncCommand() {
  const config = loadConfig();
  if (!config) {
    console.error('설정이 없습니다. 먼저 claude-lens init 을 실행하세요.');
    process.exitCode = 1;
    return;
  }

  await syncCommits(config);

  const files = findSessionFiles();
  if (files.length === 0) {
    console.log('이 프로젝트의 Claude Code 세션 로그를 찾을 수 없습니다.');
    return;
  }

  config.syncedAt ??= {};
  let totalUploaded = 0;

  for (const file of files) {
    const allInteractions = parseSessionFile(file.path);

    // 예전 방식(syncedCounts: 배열 인덱스 기준)에서 새 방식(syncedAt: 시각 기준)으로
    // 1회 마이그레이션한다. 관련 없는 대화를 걸러내기 시작하면 배열 인덱스가 더 이상
    // 안정적인 기준이 아니기 때문에, 시각을 기준으로 바꿔야 필터링과 같이 써도 안전하다.
    const oldCount = config.syncedCounts?.[file.name];
    if (oldCount !== undefined && config.syncedAt[file.name] === undefined) {
      const idx = Math.min(oldCount, allInteractions.length) - 1;
      const cutoff = allInteractions[idx]?.requestedAt;
      if (cutoff) config.syncedAt[file.name] = cutoff;
    }

    const lastSyncedAt = config.syncedAt[file.name];
    const relevantInteractions = allInteractions.filter((i) => i.relevant);
    const newInteractions = lastSyncedAt
      ? relevantInteractions.filter((i) => i.requestedAt > lastSyncedAt)
      : relevantInteractions;

    const latestTimestamp = allInteractions.at(-1)?.requestedAt;
    if (newInteractions.length === 0) {
      if (latestTimestamp) config.syncedAt[file.name] = latestTimestamp;
      continue;
    }

    const logs = newInteractions.map(({ relevant, ...interaction }) => ({
      projectId: config.projectId,
      ...interaction,
    }));

    for (const batch of chunk(logs, CHUNK_SIZE)) {
      await uploadBatch(config.baseUrl, config.apiKey, batch);
    }

    config.syncedAt[file.name] = latestTimestamp;
    totalUploaded += newInteractions.length;
    console.log(`${file.name}: ${newInteractions.length}건 업로드 (프로젝트 무관 대화 제외)`);
  }

  delete config.syncedCounts;
  saveConfig(config);

  if (totalUploaded === 0) {
    console.log('새로 업로드할 대화가 없습니다.');
  } else {
    console.log(`\n총 ${totalUploaded}건 업로드 완료.`);
  }
}
