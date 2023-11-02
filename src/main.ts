import * as core from "@actions/core";
import * as github from "@actions/github";

interface PRItem {
  /* PR title  */
  title: string;
  /* PR link  */
  url: string;
  /* PR author login  */
  author?: string;
}

export async function run(): Promise<void> {
  try {
    const token: string = core.getInput("github_token");
    const repoOwner: string = core.getInput("repoOwner");
    const repoName: string = core.getInput("repoName");

    core.debug("Getting authenticated Octo client");
    const octokit = github.getOctokit(token);

    core.debug(`Fetching open PRs for repo: "${repoOwner}/${repoName}"`);
    const openPRsResponse = await octokit.rest.pulls.list({
      owner: repoOwner,
      repo: repoName,
      state: "open",
      sort: "created",
      direction: "desc",
    });

    if (openPRsResponse.status >= 400) {
      const msg = `Failed to fetch PRs, HTTP${openPRsResponse.status}`;
      return core.setFailed(msg);
    }

    core.info(`Fetched ${openPRsResponse.data.length} open PRs`);

    const prs: PRItem[] = openPRsResponse.data
      .filter(p => p.draft !== true)
      .map(p => ({
        title: p.title,
        url: p.url,
        author: p.user?.login,
      }));

    core.setOutput("prs", prs);
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message);
  }
}
