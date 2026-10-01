#!/bin/bash
# Dangerous Command Hook — Codex PreToolUse[Bash]
# .claude/settings.json 의 Bash 차단 규칙과 같은 패턴 + Codex가 Windows에서 쓰는 PowerShell 삭제 명령.
# exit 2 대신 deny JSON을 쓴다. 이유: Windows에서는 PowerShell을 거치며 exit 2가 1로 바뀌어 차단되지 않는다.

CMD=$(jq -r '.tool_input.command // empty')

if echo "$CMD" | grep -qiE 'rm\s+-rf|git\s+push\s+--force|git\s+reset\s+--hard|DROP\s+TABLE|Remove-Item\s.*-Recurse.*-Force|Remove-Item\s.*-Force.*-Recurse'; then
  cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "BLOCKED: 위험한 명령어가 감지되었습니다."
  }
}
EOF
fi

exit 0
