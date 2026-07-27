# 백엔드를 EC2에 배포하기

전제: AWS 콘솔에서 EC2 인스턴스(Ubuntu 22.04, 예: t3.small)를 이미 만들었고, 보안 그룹에서
22번(SSH, 본인 IP만)과 8080번(0.0.0.0/0)을 열어뒀고, 탄력적 IP를 붙여둔 상태.

## 1. SSH 접속

```bash
ssh -i <키페어.pem> ubuntu@<EC2 탄력적 IP>
```

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

# ubuntu 유저가 sudo 없이 docker 쓰게 하려면 (재로그인 필요)
sudo usermod -aG docker ubuntu
```

재접속 후 `docker ps`가 sudo 없이 동작하는지 확인.

## 3. 저장소 가져오기

```bash
git clone https://github.com/<repo>.git
cd claude-lens
```

(private repo면 배포 토큰이나 SSH 키가 따로 필요 — 상황에 맞게 조정)

## 4. `.env` 작성

```bash
cp .env.production.example docker/.env
nano docker/.env   # 실제 값 채우기 (JWT_SECRET은 openssl rand -base64 64 로 새로 생성)
```

## 5. 빌드 및 실행

```bash
cd docker
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

## 6. 확인

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

로컬 머신에서:

```bash
curl http://<EC2 탄력적 IP>:8080/api/v1/projects
```

인증 없이 401이 오면 "서버까지는 도달한다"는 뜻. 실제 로그인 → 프로젝트 조회까지 되는지도 확인.

CLI를 원격 서버에 붙이려면 `.claude-lens/config.json`의 `baseUrl`을 EC2 주소로 바꾸고
`claude-lens sync`를 실행해 실제로 데이터가 올라가는지 확인.

## 참고: 첫 기동 시 backend가 한 번 재시작될 수 있음

`depends_on`은 컨테이너 시작 순서만 보장하고 postgres/mongo가 완전히 준비될 때까지 기다려주지
않는다. backend가 DB 연결에 실패하면 곧바로 죽는데, `restart: unless-stopped`가 걸려있어서
DB가 준비된 후 자동으로 재시작되며 붙는다. `docker compose ps`에서 backend가 한두 번
재시작된 기록이 있어도 정상이다.
