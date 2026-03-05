#!/bin/bash

PEM=~/claude/yhm-claude.pem
EC2=ec2-user@ec2-43-201-16-235.ap-northeast-2.compute.amazonaws.com
RDS=claude.cd4coiukc9v8.ap-northeast-2.rds.amazonaws.com

echo "SSH 터널 열기..."
ssh -i $PEM -L 3307:$RDS:3306 $EC2 -N -f -o StrictHostKeyChecking=no
echo "터널 연결됨 (127.0.0.1:3307)"

# Next.js 실행
npx next dev

# 종료 시 터널 닫기
echo "터널 종료 중..."
pkill -f "ssh.*3307:$RDS"
