// Shared helpers for the Mint hooks. Zero dependencies (Node 18+ fetch).
// Every failure path is fail-open: a hook must never block or break a session.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';

export const API_BASE = (process.env.MINT_API_BASE || 'https://verymint.app').replace(/\/$/, '');
export const SETUP_URL = 'https://verymint.app/work';

export function apiKey() {
  return (process.env.CLAUDE_PLUGIN_OPTION_API_KEY || process.env.MINT_API_KEY || '').trim();
}

export function readStdin() {
  try {
    return JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON error page */
  }
  return { status: res.status, data };
}

/** Project name: .mint.json {"project": "..."} > git repo folder name > cwd folder name. */
export function projectName(cwd) {
  try {
    const cfg = JSON.parse(readFileSync(join(cwd, '.mint.json'), 'utf8'));
    if (typeof cfg.project === 'string' && cfg.project.trim()) return cfg.project.trim().slice(0, 100);
  } catch {
    /* no override */
  }
  try {
    const top = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (top) return basename(top).slice(0, 100);
  } catch {
    /* not a git repo */
  }
  return (basename(cwd) || 'my-project').slice(0, 100);
}

// Per-session state (start time, project id, whether we already nudged).
function stateDir() {
  const dir = process.env.CLAUDE_PLUGIN_DATA || join(tmpdir(), 'mint-claude-plugin');
  mkdirSync(dir, { recursive: true });
  return dir;
}
function stateFile(sessionId) {
  return join(stateDir(), `session-${String(sessionId || 'default').replace(/[^\w-]/g, '')}.json`);
}
export function readSession(sessionId) {
  try {
    return JSON.parse(readFileSync(stateFile(sessionId), 'utf8'));
  } catch {
    return null;
  }
}
export function writeSession(sessionId, state) {
  try {
    writeFileSync(stateFile(sessionId), JSON.stringify(state));
  } catch {
    /* best effort */
  }
}

/** True if the transcript shows Claude changed files (worth a worklog). */
export function transcriptHasEdits(transcriptPath) {
  if (!transcriptPath) return false;
  try {
    return /"name":\s*"(Edit|Write|MultiEdit|NotebookEdit)"/.test(readFileSync(transcriptPath, 'utf8'));
  } catch {
    return false;
  }
}
