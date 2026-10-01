#!/bin/bash
# Stop Hook — Codex Stop
# .claude/settings.json 의 Stop 훅과 같은 검사(lint → build → test)를 실행한다.
# Codex Stop 훅은 stdout에 JSON만 허용하므로 검사 출력은 전부 stderr로 보낸다.
# 실패 시 exit 1 — Claude와 같이 경고만 하고 턴을 이어가게 하지는 않는다.

cat > /dev/null
cd "$(git rev-parse --show-toplevel)" || exit 0
[ -f package.json ] || exit 0

(npm run lint && npm run build && npm run test) 1>&2 || exit 1  # exit 2는 Codex에서 '계속 진행' 신호라 피한다
