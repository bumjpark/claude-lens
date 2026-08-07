import { FileText, RefreshCw, Terminal, UserPlus } from 'lucide-react';

const STEPS = [
  {
    icon: UserPlus,
    title: '가입 & 프로젝트 생성',
    description: '가입 후 대시보드에서 프로젝트를 만들면 API Key가 바로 발급돼요.',
  },
  {
    icon: Terminal,
    title: 'CLI 연결',
    description: '프로젝트 페이지에 뜨는 명령어를 프로젝트 루트에서 한 번 실행하면 끝.',
  },
  {
    icon: RefreshCw,
    title: '동기화',
    description: 'claude-lens sync로 Claude Code 대화 기록과 git 커밋 이력을 업로드해요.',
  },
  {
    icon: FileText,
    title: '리포트 확인',
    description: '실제 프롬프트 인용을 근거로 한 9섹션 분석 리포트를 바로 볼 수 있어요.',
  },
] as const;

export default function UsageGuide() {
  return (
    <div className="flex max-w-md flex-col gap-9">
      <div>
        <p className="mb-3 text-xs font-semibold tracking-wide text-gray-400 uppercase">
          사용 방법
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          가입부터 리포트까지, 4단계
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          AI 사용량이 아니라 협업 방식을 근거와 함께 보여드려요.
        </p>
      </div>

      <ol className="flex flex-col gap-6">
        {STEPS.map(({ icon: Icon, title, description }, i) => (
          <li key={title} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white">
                <Icon className="h-4 w-4" />
              </span>
              {i < STEPS.length - 1 && <span className="mt-1 w-px flex-1 bg-gray-200" />}
            </div>
            <div className="pb-1">
              <p className="text-sm font-semibold text-gray-900">{title}</p>
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
