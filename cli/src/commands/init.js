import prompts from 'prompts';
import { loadConfig, saveConfig, ensureGitignored } from '../config.js';
import { verifyApiKey } from '../api.js';

// 웹 대시보드(프로젝트 상세 페이지)에서 복사한 --project-id/--api-key를 붙여넣는 방식이
// 기본 흐름이다. 로그인은 웹에서 하고, CLI는 그 결과물(키)만 받는다.
export async function initCommand(opts = {}) {
  const existing = loadConfig();
  if (existing && !opts.force) {
    const { proceed } = await prompts({
      type: 'confirm',
      name: 'proceed',
      message: '이미 이 디렉토리는 claude-lens 프로젝트로 설정되어 있습니다. 다시 설정할까요?',
      initial: false,
    });
    if (!proceed) {
      console.log('설정을 유지합니다.');
      return;
    }
  }

  const questions = [];
  if (!opts.baseUrl) {
    questions.push({
      type: 'text',
      name: 'baseUrl',
      message: 'claude-lens 서버 주소',
      initial: 'http://localhost:8080',
    });
  }
  if (!opts.projectId) {
    questions.push({
      type: 'text',
      name: 'projectId',
      message: '프로젝트 ID (웹 대시보드 > 프로젝트 페이지에서 복사)',
    });
  }
  if (!opts.apiKey) {
    questions.push({
      type: 'password',
      name: 'apiKey',
      message: 'API Key (웹 대시보드 > 프로젝트 페이지에서 복사)',
    });
  }

  const answers = await prompts(questions);
  const projectId = opts.projectId || answers.projectId;
  const apiKey = opts.apiKey || answers.apiKey;
  const baseUrl = (opts.baseUrl || answers.baseUrl || 'http://localhost:8080').replace(/\/$/, '');

  if (!projectId || !apiKey) {
    console.error('입력이 취소되었습니다.');
    process.exitCode = 1;
    return;
  }

  console.log('API Key 확인 중...');
  await verifyApiKey(baseUrl, apiKey, projectId);

  saveConfig({ baseUrl, projectId, apiKey, syncedCounts: {} });
  ensureGitignored();

  console.log('\n설정 완료.');
  console.log('이제 claude-lens sync 로 대화 로그를 업로드할 수 있습니다.');
}
