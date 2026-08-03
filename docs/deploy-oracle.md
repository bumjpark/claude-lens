# 백엔드를 Oracle Cloud Always Free로 배포하기

전제: OCI(Oracle Cloud Infrastructure) 계정에서 **Always Free** Ampere A1 인스턴스를
만들고 SSH로 접속할 수 있는 상태. `docker/docker-compose.prod.yml`은 클라우드에 종속적인
설정이 없어서 EC2든 OCI든 그대로 쓸 수 있고, 바뀌는 건 인스턴스 생성/네트워크 설정 부분뿐이다.

## 0. 인스턴스 생성 시 체크포인트

- **Shape**: `VM.Standard.A1.Flex` (Ampere ARM, Always Free)
- **스펙**: 2026-06에 Oracle이 공지 없이 Always Free 한도를 4 OCPU/24GB → **2 OCPU/12GB**로
  줄였다. 계정 생성 시점에 따라 다를 수 있으니 콘솔에서 실제 한도를 먼저 확인할 것.
  2 OCPU/12GB면 postgres + mongo + ai + backend 네 컨테이너를 올리기에 충분하다.
- **이미지**: Ubuntu 22.04 (Canonical 제공) — 아래 단계는 이 기준.
- **아키텍처 주의**: A1은 ARM(aarch64)이다. `postgres:16`, `mongo:7`, `eclipse-temurin:21-jre`,
  `python:3.12-slim`은 전부 공식 이미지가 `linux/arm64`를 지원하므로 compose 파일 수정 없이
  그대로 빌드/실행된다.
- **"Out of capacity" 에러**: A1 무료 인스턴스는 수요가 많아 생성이 자주 실패한다. 가용성
  도메인(AD)을 바꿔가며 재시도하거나, 오전 시간대에 시도하면 성공률이 올라간다.
- **공인 IP**: 인스턴스 생성 시 자동 할당되는 임시 공인 IP 말고, 무료 한도 안에 있는
  **예약 공인 IP(Reserved Public IP)**를 하나 붙여두면 인스턴스를 재시작해도 주소가
  안 바뀐다. (Networking → IP Management에서 예약 후 인스턴스에 연결)

## 1. SSH 접속

```bash
ssh -i <생성한_개인키> ubuntu@<인스턴스 공인 IP>
```

(AWS처럼 .pem을 다운로드해주는 게 아니라, 인스턴스 생성 화면에서 본인이 만든 SSH 공개키를
직접 붙여넣는 방식이다 — 개인키는 생성 시점에 로컬에 미리 준비해둘 것)

## 2. Docker 설치 (인스턴스 위에서 실행)

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

# ubuntu 유저가 sudo 없이 docker 쓰게 하려면 (재로그인 필요)
sudo usermod -aG docker ubuntu
```

`dpkg --print-architecture`가 `arm64`로 나오는 게 정상이고, Docker 공식 apt 저장소가
arm64를 지원하므로 설치 과정 자체는 EC2(x86)와 동일하다. 재접속 후 `docker ps`가 sudo 없이
동작하는지 확인.

## 3. 네트워크 열기 — OCI는 두 군데를 다 열어야 한다

AWS는 보안 그룹 하나만 열면 끝이지만, **OCI Ubuntu 이미지는 iptables가 기본적으로
SSH(22) 외의 인바운드를 막아둔 상태**로 나온다. 이걸 놓치면 Security List를 열어도
계속 접속이 안 돼서 헷갈리기 쉽다.

**(1) OCI 콘솔 — Security List / NSG**
VCN → Security Lists (또는 Network Security Group) → Ingress Rules 추가:
- 22/tcp: 본인 IP만
- 8080/tcp: 0.0.0.0/0 (백엔드 직접 노출 시)

**(2) 인스턴스 내부 — iptables**

```bash
sudo iptables -I INPUT -p tcp --dport 8080 -j ACCEPT
sudo netfilter-persistent save   # 재부팅 후에도 유지되게 저장
```

둘 다 열어야 실제로 8080 포트에 외부에서 접속된다.

## 4. 저장소 가져오기

```bash
git clone https://github.com/<repo>.git
cd claude-lens
```

(private repo면 배포 토큰이나 SSH 키가 따로 필요 — 상황에 맞게 조정)

## 5. `.env` 작성

```bash
cp .env.production.example docker/.env
nano docker/.env   # 실제 값 채우기 (JWT_SECRET은 openssl rand -base64 64 로 새로 생성)
```

## 6. 빌드 및 실행

```bash
cd docker
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

ARM 위에서 `gradle:8-jdk21` 빌드는 x86보다 다소 느릴 수 있다 (첫 빌드 기준 수 분 추가 소요
가능) — 실패가 아니라 정상 범위이니 기다릴 것.

## 7. 확인

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

로컬 머신에서:

```bash
curl http://<인스턴스 공인 IP>:8080/api/v1/projects
```

인증 없이 401이 오면 "서버까지는 도달한다"는 뜻. 실제 로그인 → 프로젝트 조회까지 되는지도
확인.

CLI를 원격 서버에 붙이려면 `.claude-lens/config.json`의 `baseUrl`을 인스턴스 공인 IP로 바꾸고
`claude-lens sync`를 실행해 실제로 데이터가 올라가는지 확인.

## 참고: 첫 기동 시 backend가 한 번 재시작될 수 있음

`depends_on`은 컨테이너 시작 순서만 보장하고 postgres/mongo가 완전히 준비될 때까지 기다려주지
않는다. backend가 DB 연결에 실패하면 곧바로 죽는데, `restart: unless-stopped`가 걸려있어서
DB가 준비된 후 자동으로 재시작되며 붙는다. `docker compose ps`에서 backend가 한두 번
재시작된 기록이 있어도 정상이다.

## 참고: 프리티어 인스턴스가 회수(reclaim)될 수 있음

Oracle은 Always Free 인스턴스를 일정 기간 CPU 사용률이 매우 낮으면(유휴 상태) 회수해가는
정책이 있다. 데모/개발용으로만 쓰고 오래 방치할 예정이면, 가끔 접속해 상태를 확인하거나
모니터링을 하나 걸어두는 걸 권장.
