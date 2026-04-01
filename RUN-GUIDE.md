# WA Message Ops Standalone Run Guide

이 폴더는 그대로 복사해서 실행하는 release folder다.

## 포함된 것

- `server.js`
- `.next/`
- `node_modules/`
- `.env.local`
- `.env.example`
- `start.ps1`
- `start.cmd`
- `docs/wa-parity-report.md`

## 실행 전 조건

- Windows
- Node.js 20+

## 실행 방법

방법 1:

```powershell
.\start.cmd
```

방법 2:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1 -Port 3006
```

실행 후 접속:

- `http://127.0.0.1:3006`

## ENV

필요한 ENV는 이미 이 폴더의 `.env.local`에 삽입되어 있다.

포함 키:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WA_WEBHOOK_SECRET`

다른 환경으로 옮길 때만 `.env.local` 값을 교체하면 된다.

## 검증 근거

- HTTP parity report: `docs/wa-parity-report.md`
- parity 결과: `PASS`
- Work Board UI·TanStack·Playwright 구현 요약: `docs/implementation/2026-04-01-work-board-ui-qa-status.md`  
  (release 폴더에 소스만 복사된 경우 해당 md가 없을 수 있음 — 개발 트리 기준 문서.)

## 주의

- 이 폴더는 install 없이 실행되도록 만든 release folder다.
- Node만 있으면 된다.
