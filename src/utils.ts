export function getRepoFragmentsFromUrl(url: string): {
  repoName: null | string;
  repoOwner: null | string;
} {
  let repoOwner = null;
  let repoName = null;

  if (!url || (url.includes("://") && !url.includes("github.com")))
    return { repoOwner, repoName };

  [, repoOwner, repoName] = /(\w+?)\/([^/]+)\/?$/.exec(url) || [];
  return { repoOwner, repoName };
}
