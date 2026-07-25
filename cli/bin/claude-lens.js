#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from '../src/commands/init.js';
import { syncCommand } from '../src/commands/sync.js';

const program = new Command();

program
  .name('claude-lens')
  .description('Claude Code 세션 로그를 claude-lens 서버로 수집/업로드하는 CLI');

program
  .command('init')
  .description('현재 프로젝트를 claude-lens에 등록합니다')
  .option('--base-url <url>', 'claude-lens 서버 주소')
  .option('--project-id <id>', '웹 대시보드에서 복사한 프로젝트 ID')
  .option('--api-key <key>', '웹 대시보드에서 복사한 API Key')
  .option('--force', '이미 설정된 프로젝트도 다시 설정')
  .action(async (opts) => {
    try {
      await initCommand(opts);
    } catch (err) {
      console.error(`오류: ${err.message}`);
      process.exitCode = 1;
    }
  });

program
  .command('sync')
  .description('Claude Code 세션 로그를 파싱해서 서버로 업로드합니다')
  .action(async () => {
    try {
      await syncCommand();
    } catch (err) {
      console.error(`오류: ${err.message}`);
      process.exitCode = 1;
    }
  });

program.parse();
