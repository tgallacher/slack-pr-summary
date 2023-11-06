import { getRepoFragmentsFromUrl } from "../src/utils";

describe("getRepoFragmentsFromUrl", () => {
  const owner = "tgallacher";
  const name = "slack-pr-summary";

  it("returns the correct fragments when the url includes github.com", () => {
    let url = `github.com/${owner}/${name}`;
    let { repoOwner, repoName } = getRepoFragmentsFromUrl(url);

    expect(repoOwner).toBe(owner);
    expect(repoName).toBe(name);

    url = `github.com/${owner}/${name}/`;
    ({ repoOwner, repoName } = getRepoFragmentsFromUrl(url));

    expect(repoOwner).toBe(owner);
    expect(repoName).toBe(name);
  });

  it("returns the correct fragments when the url includes http://github.com", () => {
    const url = `http://github.com/${owner}/${name}`;
    const { repoOwner, repoName } = getRepoFragmentsFromUrl(url);

    expect(repoOwner).toBe(owner);
    expect(repoName).toBe(name);
  });

  it("returns the correct fragments when the url includes https://github.com", () => {
    const url = `https://github.com/${owner}/${name}`;
    const { repoOwner, repoName } = getRepoFragmentsFromUrl(url);

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
