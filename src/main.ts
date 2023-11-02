import * as core from "@actions/core";
import * as github from "@actions/github";
import axios, { AxiosError } from "axios";

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
    const rawRepo: string = core.getInput("repo");
    const slackMsgHeader: string = core.getInput("msg_header");
    const slackWebhookUrl: string = core.getInput("slack_webhook_url");

    core.debug("Getting authenticated Octo client");
    const octokit = github.getOctokit(token);

    const repo = rawRepo.replace(/https?:\/\//, "").replace("github.com/", "");
    const [repoOwner, repoName] = repo.match(/(.+?)\/(.+)/) || [];

    if (!repoOwner || !repoName) {
      return core.setFailed(
        `Failed to parse repo owner and/or name from url, "${rawRepo}"`,
      );
    }

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

    const text = prs
      .map(p => `- <${p.url}|${p.title}>${p.author ? "\t_(p.author)_" : ""}`)
      .join("\n");

    core.debug("Formatted Slack PR list:");
    core.debug(text);

    // Slack
    const message = {
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: slackMsgHeader,
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text,
          },
        },
      ],
    };

    core.debug("Posting summary to slack webhook..");
    await axios.post(slackWebhookUrl, message);
  } catch (error) {
    if (error instanceof AxiosError) {
      core.error(
        `Failed to pose data to Slack webhook: "HTTP${error.response?.status} ${error.response?.statusText}"`,
      );
      return core.setFailed(error.response?.data);
    }

    // Fail the workflow run if an error occurs
    if (error instanceof Error) return core.setFailed(error.message);
  }
}
