# 백엔드를 EC2에 배포하기

전제: AWS 콘솔에서 EC2 인스턴스를 이미 만들었고, 보안 그룹에서 22번(SSH, 본인 IP만)과
8080번(0.0.0.0/0)을 열어뒀고, 탄력적 IP를 붙여둔 상태.

**AMI 선택 주의**: 콘솔에서 AMI를 고를 때 반드시 **Ubuntu Server 22.04 LTS**를 명시적으로
선택할 것. 기본 선택값이 Amazon Linux인 경우가 있는데, 잘못 고르면 아래 명령어가 그대로
동작하지 않는다 (Amazon Linux는 `apt`가 아니라 `dnf`를 쓰고, `docker compose`/`docker buildx`
CLI 플러그인이 저장소에 없어서 따로 설치해야 함 — 이미 Amazon Linux로 만들었다면 이 문서
맨 아래 "참고: Amazon Linux로 만들었다면" 참고).

## 1. SSH 접속

```bash
ssh -i <키페어.pem> ubuntu@<EC2 탄력적 IP>
```

`Permission denied (publickey)`가 뜨면 키가 잘못된 게 아니라 **계정명이 틀렸을 가능성**이
크다. AWS는 인스턴스 생성 시 고른 키의 공개키를 AMI가 정해둔 특정 계정 홈에 심어두는데, 그
계정명이 AMI마다 다르다 (Ubuntu → `ubuntu`, Amazon Linux → `ec2-user`). `cat /etc/os-release`로
실제 AMI를 확인하고 맞는 계정으로 재시도할 것.

## 2. Docker 설치 (EC2 위에서 실행)

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo apt-get install -y git

# ubuntu 유저가 sudo 없이 docker 쓰게 하려면 (재로그인 필요)
sudo usermod -aG docker ubuntu
```

재접속 후 `docker ps`가 sudo 없이 동작하는지 확인. `docker compose version`,
`docker buildx version`도 같이 확인 — 둘 다 `docker-ce` 패키지에 포함되어 있어서 Ubuntu
에서는 별도 설치 없이 바로 된다.

## 3. 저장소 가져오기

```bash
git clone --branch feat/ec2-deployment --single-branch https://github.com/<repo>.git claude-lens
cd claude-lens
```

(private repo면 배포 토큰이나 SSH 키가 따로 필요 — 상황에 맞게 조정. 브랜치는 배포용
Dockerfile/compose가 실제로 merge된 브랜치명으로 맞출 것)

## 4. `.env` 작성

```bash
cp .env.production.example docker/.env
chmod 600 docker/.env
nano docker/.env   # 실제 값 채우기 (JWT_SECRET은 openssl rand -base64 64 로 새로 생성)
```

## 5. 빌드 및 실행

```bash
cd docker
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

## 6. DB 스키마 생성 — 자동으로 안 됨, 반드시 수동 실행 필요

`application.yml`의 `hibernate.ddl-auto`가 `validate`로 되어 있어서, Hibernate가 테이블을
자동 생성하지 않고 "이미 있는 스키마와 엔티티가 일치하는지"만 검사한다. 이 프로젝트엔
Flyway/Liquibase 같은 자동 마이그레이션 도구가 없고, `db/migration/V1~V7__*.sql`은
**직접 실행해야 하는** 파일들이다. 이 단계를 건너뛰면 backend가
`Schema-validation: missing table [...]` 에러로 계속 재시작만 반복한다.

Postgres 컨테이너가 뜬 직후, 로컬 파일 순서대로 하나씩 실행:

```bash
for f in ../db/migration/V1__init_schema.sql \
         ../db/migration/V3__add_project_api_key.sql \
         ../db/migration/V4__add_evaluation_activity_stats.sql \
         ../db/migration/V5__replace_scores_with_analysis_dimensions.sql \
         ../db/migration/V6__report_consulting_sections.sql \
         ../db/migration/V7__consult_categories_json.sql; do
  docker exec -i claudelens-postgres psql -U claudelens -d claudelens < "$f"
done
```

(`V2__interaction_log.js`는 실행할 코드가 없는 MongoDB 스키마 문서화용 주석 파일이라
건너뛴다. `db/migration/`에 새 파일이 추가됐다면 그것도 같은 방식으로 순서대로 실행할 것.)

이후 `docker compose -f docker-compose.prod.yml restart backend`.

## 7. 확인

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

`Started BackendApplication in ...`이 찍히면 정상 기동.

로컬 머신에서:

```bash
curl -i http://<EC2 탄력적 IP>:8080/api/v1/projects
```

인증 없이 **403**이 오면 "서버까지는 도달한다"는 뜻이다 (이 프로젝트 Spring Security 설정엔
커스텀 `AuthenticationEntryPoint`가 없어서 401이 아니라 403이 기본값으로 나간다 — 정상
동작이다). 실제 회원가입 → 로그인 → 프로젝트 생성 → 조회까지 curl로 검증:

```bash
# 회원가입
curl -X POST http://<IP>:8080/api/v1/auth/signup -H "Content-Type: application/json" \
  -d '{"email":"...","password":"...","name":"...","role":"...","experienceLevel":"..."}'

# 로그인 (accessToken 발급 확인)
curl -X POST http://<IP>:8080/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"email":"...","password":"..."}'

# JWT로 프로젝트 생성 (응답의 apiKey는 이때만 평문으로 보임 — 따로 저장해둘 것)
curl -X POST http://<IP>:8080/api/v1/projects -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" -d '{"name":"my-project"}'
```

CLI를 원격 서버에 붙이려면:

```bash
claude-lens init --base-url http://<IP>:8080 --project-id <위에서 받은 id> \
  --api-key <위에서 받은 apiKey> --force
claude-lens sync
```

## 참고: 첫 기동 시 backend가 한 번 재시작될 수 있음

`depends_on`은 컨테이너 시작 순서만 보장하고 postgres/mongo가 완전히 준비될 때까지 기다려주지
않는다. backend가 DB 연결에 실패하면 곧바로 죽는데, `restart: unless-stopped`가 걸려있어서
DB가 준비된 후 자동으로 재시작되며 붙는다. `docker compose ps`에서 backend가 한두 번
재시작된 기록이 있어도 정상이다 (단, 6번 단계의 스키마 미생성 문제와는 별개 — 스키마가 아예
없으면 재시작을 반복해도 계속 실패한다).

## 참고: Amazon Linux로 만들었다면

2~3번 단계가 다음과 같이 바뀐다:

```bash
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user   # 계정명이 ubuntu가 아니라 ec2-user

# docker compose 플러그인 (dnf 저장소에 없음)
mkdir -p ~/.docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose

# docker buildx 최신 버전 (내장 버전이 너무 낮아 `docker compose build`가 실패함)
curl -SL https://github.com/docker/buildx/releases/latest/download/buildx-$(curl -sL \
  https://api.github.com/repos/docker/buildx/releases/latest | grep -m1 tag_name | cut -d\" -f4).linux-amd64 \
  -o ~/.docker/cli-plugins/docker-buildx
chmod +x ~/.docker/cli-plugins/docker-buildx
```

나머지 단계는 동일. 접속 계정만 `ec2-user@<IP>`로 바꿀 것.
