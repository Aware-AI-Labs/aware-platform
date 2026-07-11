/**
 * AWARE's GitHub hands. Reads freely; writes only via pull requests that a
 * human approved. Never touches main directly.
 */

const API = "https://api.github.com";

function headers() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not configured");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export function githubEnabled() {
  return Boolean(process.env.GITHUB_TOKEN);
}

async function gh(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...headers(), ...init?.headers } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

export async function readRepoFile(repo: string, path: string, ref?: string) {
  const data = await gh(
    `/repos/${repo}/contents/${encodeURIComponent(path).replaceAll("%2F", "/")}${ref ? `?ref=${ref}` : ""}`
  );
  if (Array.isArray(data)) {
    return {
      type: "dir" as const,
      entries: data.map((e: { name: string; type: string }) => `${e.type === "dir" ? "dir " : "file"} ${e.name}`),
    };
  }
  return {
    type: "file" as const,
    sha: data.sha as string,
    content: Buffer.from(data.content, "base64").toString("utf-8"),
  };
}

export async function listRecentCommits(repo: string, perPage = 10) {
  const data = await gh(`/repos/${repo}/commits?per_page=${perPage}`);
  return (data as Array<{ sha: string; commit: { message: string; author: { name: string; date: string } } }>).map(
    (c) => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message.split("\n")[0],
      author: c.commit.author?.name,
      date: c.commit.author?.date,
    })
  );
}

/** Create branch → commit one file → open PR. Returns the PR URL. */
export async function openEditPr(args: {
  repo: string;
  path: string;
  newContent: string;
  commitMessage: string;
  prTitle: string;
  prBody: string;
}) {
  const { repo, path, newContent, commitMessage, prTitle, prBody } = args;

  const repoInfo = await gh(`/repos/${repo}`);
  const base: string = repoInfo.default_branch;

  const baseRef = await gh(`/repos/${repo}/git/ref/heads/${base}`);
  const baseSha: string = baseRef.object.sha;

  const branch = `aware/${Date.now().toString(36)}`;
  await gh(`/repos/${repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
  });

  // Existing file sha (if the file exists) is required to update it.
  let existingSha: string | undefined;
  try {
    const existing = await readRepoFile(repo, path, base);
    if (existing.type === "file") existingSha = existing.sha;
  } catch {
    /* new file */
  }

  await gh(`/repos/${repo}/contents/${encodeURIComponent(path).replaceAll("%2F", "/")}`, {
    method: "PUT",
    body: JSON.stringify({
      message: commitMessage,
      content: Buffer.from(newContent, "utf-8").toString("base64"),
      branch,
      ...(existingSha ? { sha: existingSha } : {}),
    }),
  });

  const pr = await gh(`/repos/${repo}/pulls`, {
    method: "POST",
    body: JSON.stringify({
      title: prTitle,
      head: branch,
      base,
      body: `${prBody}\n\n—\nOpened by AWARE via Aware OS. Approved by a human before filing.`,
    }),
  });

  return { url: pr.html_url as string, number: pr.number as number };
}
