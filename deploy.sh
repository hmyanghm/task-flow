#!/bin/bash
set -e

echo "=== Task Flow 배포 시작 ==="

cd /home/user/task-flow

# 1. 의존성 설치
echo "[1/4] 의존성 설치 중..."
npm install --production=false

# 2. Prisma 클라이언트 생성 & DB 마이그레이션
echo "[2/4] Prisma 설정 중..."
npx prisma generate
npx prisma db push

# 3. Next.js 프로덕션 빌드
echo "[3/4] 프로덕션 빌드 중..."
npm run build

# 4. PM2로 실행 (이미 실행 중이면 재시작)
echo "[4/4] PM2 시작 중..."
mkdir -p logs
pm2 startOrRestart ecosystem.config.js --update-env
pm2 save

echo ""
echo "=== 배포 완료! ==="
echo "앱 URL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-ec2-ip'):3000"
echo ""
echo "유용한 명령어:"
echo "  pm2 status        - 상태 확인"
echo "  pm2 logs task-flow - 로그 보기"
echo "  pm2 restart task-flow - 재시작"
echo "  pm2 stop task-flow    - 중지"
