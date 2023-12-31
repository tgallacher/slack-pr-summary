import * as core from "@actions/core";
import * as github from "@actions/github";
import axios, { AxiosError } from "axios";
import { intlFormatDistance } from "date-fns";
import Bottleneck from "bottleneck";
import { getRepoFragmentsFromUrl } from "./utils";

interface PRItem {
  /* PR title  */
  title: string;
  /* PR link  */
  url: string;
  /* PR author login  */
  author?: string;
  /* PR number */
  number: number;
  /* Number of PR comments */
  numComments: number | null;
  /* PR opened: ISO8061 */
  opened: string;
}

async function getGithubPRSummary(
  token: string,
  repoOwner: string,
  repoName: string,
): Promise<PRItem[]> {
  core.debug("Getting authenticated Octo client");
  const octokit = github.getOctokit(token);
  const limiter = new Bottleneck({
    reservoir: 1000,
    reservoirRefreshInterval: 60 * 60 * 1000, // 1 hr
    reservoirRefreshAmount: 1000,

    maxConcurrent: 1,
    minTime: 50,
  });

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
    core.setFailed(msg);
    process.exit(1);
  }
  core.info(`Fetched ${openPRsResponse.data.length} open PRs`);

  const prs: PRItem[] = openPRsResponse.data
    .filter(p => p.draft !== true)
    .map(p => ({
      title: p.title,
      url: p.html_url,
      author: p.user?.login,
      opened: p.created_at,
      number: p.number,
      numComments: null,
    }));

  const prsData: PRItem[] = await Promise.all(
    prs.map(async p =>
      limiter.schedule(async () => {
        const resp = await octokit.rest.pulls.get({
          owner: repoOwner,
          repo: repoName,
          pull_number: p.number,
        });

        if (resp.status >= 400) return p;

        return {
          ...p,
          numComments: resp.data.comments,
        };
      }),
    ),
  );

  // allow the limiter to be garbage collected
  limiter.disconnect();

  return prsData;
}

export async function run(): Promise<void> {
  try {
    const token: string = core.getInput("github_token");
    const repoUrl: string = core.getInput("repo");
    const slackMsgHeader: string = core.getInput("msg_header");
    const slackWebhookUrl: string = core.getInput("slack_webhook_url");

    const { repoOwner, repoName } = getRepoFragmentsFromUrl(repoUrl);
    if (!repoOwner || !repoName) {
      return core.setFailed(
        `Failed to parse repo owner and/or name from url, "${repoUrl}"`,
      );
    }

    const prs = await getGithubPRSummary(token, repoOwner, repoName);

    const authorTxt = (pr?: PRItem): string =>
      pr?.author ? `, ${pr.author}` : "";
    const commentsTxt = (pr: PRItem): string =>
      pr.numComments != null ? `, ${pr.numComments} comments` : "";
    const openedTxt = (pr: PRItem): string =>
      pr.opened ? `${intlFormatDistance(new Date(pr.opened), new Date())}` : "";

    const text = prs
      .map(
        p =>
          `- <${p.url}|${p.title}>\t_${openedTxt(p)}${commentsTxt(
            p,
          )}${authorTxt(p)}_`,
      )
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
            text: slackMsgHeader || "Open PRs:",
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
        `Failed to post data to Slack webhook: "HTTP${error.response?.status} ${error.response?.statusText}"`,
      );
      return core.setFailed(error.response?.data);
    }

    // Fail the workflow run if an error occurs
    if (error instanceof Error) return core.setFailed(error.message);
  }
}
