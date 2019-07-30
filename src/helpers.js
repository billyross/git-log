const JiraApi = require('jira-client');
const moment = require('moment');
const Repository = require('nodegit').Repository;

/**
 * Initialise a new Jira client.
 *
 * Create a new Jira API client instance for requesting Jira metadata.
 *
 * @param {string} host      URL of the target Jira instance.
 * @param {string} username  Username for accessing the Jira instance.
 * @param {string} password  Password of the user or API access token.
 *
 * @return {JiraApi} Initialised Jira API client for making API requests.
 */
function initialiseJiraApi(host, username, password) {
  const hostSplit = host.split('://');
  return new JiraApi({
    protocol: hostSplit[0],
    apiVersion: '2',
    strictSSL: true,
    host: hostSplit[1],
    username,
    password,
  });
}

/**
 * Get the list of commits to a given commit in the target repository.
 *
 * Traverse the target git repository and return a promise
 * that resolves to the list of commits from the current HEAD
 * to the provided commit hash.
 *
 * @param {string} hash        SHA of the target commit to traverse to.
 * @param {string} [repo='.']  Path to the target repository.
 *
 * @return {Promise} Promise that resolves to the list of commits.
 */
function getCommitsUntil(hash, repo = '.') {
  return Repository.open(repo)
    .then((r) => {
      const revwalk = r.createRevWalk();
      revwalk.pushHead();
      return revwalk.getCommitsUntil((commit) => commit.sha() !== hash);
    })
    .then((commits) => {
      if (commits.length === 0) {
        throw new Error('Current repo does not exist or contains no commits');
      }
      return commits.map((commit) => ({
        date: moment(commit.date()),
        author: commit.author().name(),
        summary: commit.summary(),
      }));
    });
}

/**
 * Convert a list of commits to a map of Jira codes.
 *
 * Filter a list of commits and return a mapping of Jira codes
 * to matched commits. Ignores missing Jira codes and performs
 * no validation on whether the Jira codes are valid.
 *
 * @param {Array} commits  List of commits to be mapped.
 *
 * @return {Object} Mapping of Jira codes to commits.
 */
function mapCommitsToJiras(commits) {
  const jiraMap = {};
  commits.forEach((commit) => {
    const jiras = commit.summary.match(/\w+-\d+/g);
    if (jiras) {
      jiras.forEach((jira) => {
        const code = jira.toUpperCase();
        if (!jiraMap[code]) {
          jiraMap[code] = [];
        }
        jiraMap[code].push(commit);
      });
    }
  });
  return jiraMap;
}

/**
 * Filter commits from a list that have no Jira codes.
 *
 * Filter a list of commits for missing Jira codes and return
 * a list containing only commits with Jira codes present.
 *
 * @param {Array} commits  List of commits to be filtered.
 *
 * @return {Array} Commits that only have Jira codes present.
 */
function filterMissingJiras(commits) {
  const regex = /\w+-\d+/g;
  return commits.filter((commit) => regex.test(commit.summary));
}

/**
 * Retrieve metadata for a given Jira code from the server.
 *
 * Make a request to the Jira instance using the given API client
 * and return a promise that resolves metadata associated with the
 * Jira.
 *
 * @param {string} code    Jira code of the target Jira.
 * @param {Object} client  JiraAPI client used to make the request.
 *
 * @return {Promise} Promise that resolves to the Jira metadata.
 */
function fetchJiraMetadata(code, client) {
  return client
    .findIssue(code)
    .then((issue) => ({
      title: issue.fields.summary,
      status: issue.fields.status.name,
      fixVersions:
        issue.fields.fixVersions.map((fv) => fv.name).join(', ') ||
        'No Fix Version',
      assignee: issue.fields.assignee
        ? issue.fields.assignee.displayName
        : 'Unassigned',
    }))
    .catch(() => null);
}

/**
 * Aggregate a map of Jira's with their metadata and return a list.
 *
 * Accept a mapping of jira codes to commits and fetch relevant metadata
 * using the client to aggregate into a single list.
 *
 * @param {Object} jiraMap  Mapping of jira codes to commits.
 * @param {Object} client   JiraAPI client used to gather metadata.
 *
 * @return {Promise} Promise that resolves to a list of jira with metadata.
 */
function aggregateJiraMetadata(jiraMap, client) {
  return new Promise((resolve) => {
    const jiraList = [];
    Promise.all(
      Object.keys(jiraMap).map((code) => {
        return fetchJiraMetadata(code, client).then((jira) => {
          if (jira) {
            const commitList = jiraMap[code];
            jiraList.push({
              code,
              lastCommitDate: commitList.sort((a, b) => b.date - a.date)[0]
                .date,
              developers: [
                ...new Set(commitList.map((commit) => commit.author)),
              ].join(', '),
              commits: commitList.length,
              ...jira,
            });
          }
        });
      })
    ).then(() => resolve(jiraList));
  });
}

module.exports = {
  initialiseJiraApi,
  getCommitsUntil,
  mapCommitsToJiras,
  filterMissingJiras,
  fetchJiraMetadata,
  aggregateJiraMetadata,
};
