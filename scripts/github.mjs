// Minimal GitHub REST client. Zero dependencies; Node 22's fetch.
//
// Token: GITHUB_TOKEN (or GH_TOKEN). Public repos work without one, at a much
// lower rate limit. Private repos need a token that can read them.

const API = 'https://api.github.com';
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

export class GitHubError extends Error {
  constructor(status, url, body) {
    super(`GitHub ${status} for ${url}${body ? `: ${body.slice(0, 200)}` : ''}`);
    this.status = status;
  }
}

async function request(path, { accept = 'application/vnd.github+json' } = {}) {
  const url = `${API}${path}`;
  const headers = {
    Accept: accept,
    'User-Agent': 'textbook-registry-ci',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  for (let attempt = 1; ; attempt++) {
    // Renamed or transferred repositories answer 301 with the new location on the
    // same host; fetch follows it and keeps the Authorization header (same origin).
    const res = await fetch(url, { headers, redirect: 'follow' });
    if (res.ok) return res;
    // Retry only what might be transient. A 404 is an answer, not a blip.
    if (attempt < 3 && (res.status >= 500 || res.status === 429)) {
      await new Promise((r) => setTimeout(r, 1000 * attempt * attempt));
      continue;
    }
    throw new GitHubError(res.status, url, await res.text().catch(() => ''));
  }
}

export const hasToken = () => Boolean(token);

export async function getRepo(fullName) {
  return (await request(`/repos/${fullName}`)).json();
}

/** The account at a login, or null if there is none. */
export async function getUser(login) {
  try {
    return await (await request(`/users/${encodeURIComponent(login)}`)).json();
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

export async function branchExists(fullName, branch) {
  try {
    await request(`/repos/${fullName}/branches/${encodeURIComponent(branch)}`);
    return true;
  } catch (e) {
    if (e.status === 404) return false;
    throw e;
  }
}

export async function resolveSha(fullName, ref) {
  const res = await request(`/repos/${fullName}/commits/${encodeURIComponent(ref)}`, {
    accept: 'application/vnd.github.sha',
  });
  return (await res.text()).trim();
}

export async function getFile(fullName, path, sha) {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  const res = await request(`/repos/${fullName}/contents/${encoded}?ref=${sha}`, {
    accept: 'application/vnd.github.raw+json',
  });
  return res.text();
}
