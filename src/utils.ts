export function getRepoFragmentsFromUrl(url: string) {
  const repo = url.replace(/https?:\/\//, "");
  const [, repoOwner = null, repoName = null] =
    repo.match(/github\.com\/(.+?)\/([^/]+)/) || [];

  return { repoOwner, repoName };
}
