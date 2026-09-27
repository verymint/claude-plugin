#!/usr/bin/env node
// Stop: fires after every reply. Nudge at most once per session, and only when
// Claude actually changed files and has not written a worklog since the session began.
import { api, apiKey, readStdin, readSession, writeSession, transcriptHasEdits } from './lib.mjs';

async function main() {
  const input = readStdin();
  if (input.stop_hook_active || !apiKey()) return;

  const state = readSession(input.session_id);
  if (!state || state.nudged || !state.folderId) return;
  if (!transcriptHasEdits(input.transcript_path)) return;

  const res = await api(`/api/v1/worklog?folderId=${encodeURIComponent(state.folderId)}&source=ai&limit=5`);
  if (res.status !== 200) return;
  if ((res.data.logs || []).some((l) => (l.createdAt ?? 0) >= state.startedAt)) return;

  writeSession(input.session_id, { ...state, nudged: true });
  process.stdout.write(
    JSON.stringify({
      decision: 'block',
      reason:
        `Before finishing, record this session in Mint: call mint_add_worklog (folderId="${state.folderId}") ` +
        'with a one-line title, then what changed and where to pick up next. Keep it short.',
    })
  );
}

main().catch(() => process.exit(0));
