import { loadConfig, saveConfig } from '../config.js';
import { findSessionFiles, parseSessionFile } from '../parser.js';
import { uploadBatch } from '../api.js';

const CHUNK_SIZE = 50;

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export async function syncCommand() {
  const config = loadConfig();
  if (!config) {
    console.error('설정이 없습니다. 먼저 claude-lens init 을 실행하세요.');
    process.exitCode = 1;
    return;
  }

  const files = findSessionFiles();
  if (files.length === 0) {
    console.log('이 프로젝트의 Claude Code 세션 로그를 찾을 수 없습니다.');
    return;
  }

  config.syncedCounts ??= {};
  let totalUploaded = 0;

  for (const file of files) {
    const interactions = parseSessionFile(file.path);
    const alreadySynced = config.syncedCounts[file.name] ?? 0;
    const newInteractions = interactions.slice(alreadySynced);

    if (newInteractions.length === 0) continue;

    const logs = newInteractions.map((interaction) => ({
      projectId: config.projectId,
      ...interaction,
    }));

    for (const batch of chunk(logs, CHUNK_SIZE)) {
      await uploadBatch(config.baseUrl, config.apiKey, batch);
    }

    config.syncedCounts[file.name] = interactions.length;
    totalUploaded += newInteractions.length;
    console.log(`${file.name}: ${newInteractions.length}건 업로드`);
  }

  saveConfig(config);

  if (totalUploaded === 0) {
    console.log('새로 업로드할 대화가 없습니다.');
  } else {
    console.log(`\n총 ${totalUploaded}건 업로드 완료.`);
  }
}
