#!/usr/bin/env node
// SessionStart: find-or-create this repo's Mint project, then hand Claude the
// last few worklogs + open tasks so the session resumes where the last one ended.
import { api, apiKey, readStdin, projectName, writeSession, SETUP_URL } from './lib.mjs';

function emit(context) {
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context } })
  );
}

const firstLine = (s) => (s || '').split('\n')[0].slice(0, 140);
const fmt = (ms) => (ms ? new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '');

async function main() {
  const input = readStdin();
  const cwd = input.cwd || process.cwd();

  if (!apiKey()) {
    emit(`[Mint] Not connected yet. Tell the user once: create an API key at ${SETUP_URL} and run /plugin to configure the mint plugin.`);
    return;
  }

  const name = projectName(cwd);
  const ensure = await api('/api/v1/projects', { method: 'POST', body: { name } });
  if (ensure.status === 401) {
    emit(`[Mint] The API key was rejected. Tell the user once to create a new key at ${SETUP_URL} and update it with /plugin.`);
    return;
  }
  if (ensure.status === 402) {
    emit(`[Mint] Project "${name}" was not created: the free plan's project limit is reached. Mention once that Mint Pro unlocks more projects (${SETUP_URL}). Do not call Mint tools for this project.`);
    return;
  }
  if (ensure.status >= 300 || !ensure.data.id) return; // unknown failure: stay quiet

  const folderId = ensure.data.id;
  writeSession(input.session_id, { folderId, name, startedAt: Date.now(), nudged: false });

  const [logs, tasks] = await Promise.all([
    api(`/api/v1/worklog?folderId=${encodeURIComponent(folderId)}&limit=4`),
    api(`/api/v1/tasks?folderId=${encodeURIComponent(folderId)}&status=open`),
  ]);

  const parts = [`[Mint] This session's project is "${name}" (folderId="${folderId}").`];
  const recent = logs.data.logs || [];
  if (recent.length) {
    parts.push('Recent worklogs (newest first):\n' + recent.map((l) => `- ${fmt(l.createdAt)} ${firstLine(l.text)}`).join('\n'));
  }
  const open = (tasks.data.tasks || []).slice(0, 10);
  if (open.length) parts.push('Open tasks:\n' + open.map((t) => `- [ ] ${t.title}`).join('\n'));
  parts.push(
    `When you finish meaningful work, call mint_add_worklog (folderId="${folderId}"): a one-line title, then what was done and where to pick up next. Record follow-ups with mint_add_task.`
  );
  emit(parts.join('\n\n'));
}

main().catch(() => process.exit(0));
