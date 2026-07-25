import { basename } from 'node:path';
import prompts from 'prompts';
import { loadConfig, saveConfig, ensureGitignored } from '../config.js';
import { login, createProject } from '../api.js';

// opts: commander가 넘겨주는 --email/--password/--name/... 플래그.
// 넘어온 값은 그대로 쓰고, 빠진 값만 대화형으로 물어본다. (테스트/스크립트에서는
// 전부 플래그로 넘기면 prompts가 아예 뜨지 않는다.)
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
  if (!opts.email) questions.push({ type: 'text', name: 'email', message: '이메일' });
  if (!opts.password) questions.push({ type: 'password', name: 'password', message: '비밀번호' });
  if (!opts.name) {
    questions.push({
      type: 'text',
      name: 'name',
      message: '프로젝트 이름',
      initial: basename(process.cwd()),
    });
  }

  const answers = await prompts(questions);
  const email = opts.email || answers.email;
  const password = opts.password || answers.password;
  const name = opts.name || answers.name;
  const baseUrl = (opts.baseUrl || answers.baseUrl || 'http://localhost:8080').replace(/\/$/, '');

  if (!email || !password || !name) {
    console.error('입력이 취소되었습니다.');
    process.exitCode = 1;
    return;
  }

  console.log('로그인 중...');
  const auth = await login(baseUrl, email, password);

  console.log('프로젝트 생성 중...');
  const project = await createProject(baseUrl, auth.accessToken, {
    name,
    language: opts.language || null,
    framework: opts.framework || null,
  });

  saveConfig({
    baseUrl,
    projectId: project.id,
    projectName: project.name,
    apiKey: project.apiKey,
    syncedCounts: {},
  });
  ensureGitignored();

  console.log(`\n설정 완료: "${project.name}" (${project.id})`);
  console.log('이제 claude-lens sync 로 대화 로그를 업로드할 수 있습니다.');
}
