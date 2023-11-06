import { getRepoFragmentsFromUrl } from "../src/utils";

describe("getRepoFragmentsFromUrl", () => {
  const owner = "tgallacher";
  const name = "slack-pr-summary";

  it.each([
    [`${owner}/${name}`],
    [`github.com/${owner}/${name}`],
    [`http://github.com/${owner}/${name}`],
    [`https://github.com/${owner}/${name}`],
  ])("returns the correct fragments when the url has the format: '%s'", url => {
    let { repoOwner, repoName } = getRepoFragmentsFromUrl(url);

    expect(repoOwner).toBe(owner);
    expect(repoName).toBe(name);

    // with trailing slash
    ({ repoOwner, repoName } = getRepoFragmentsFromUrl(`${url}/`));

    expect(repoOwner).toBe(owner);
    expect(repoName).toBe(name);
  });

  it("returns null when the url is not what we expect https://example.com/fakeowner/fakename", () => {
    const url = `https://example.com/fakeowner/fakename`;
    const { repoOwner, repoName } = getRepoFragmentsFromUrl(url);

    expect(repoOwner).toBeNull();
    expect(repoName).toBeNull();
  });
});
