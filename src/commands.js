const {
  initialiseJiraApi,
  getCommitsUntil,
  filterMissingJiras,
  mapCommitsToJiras,
  aggregateJiraMetadata,
} = require('./helpers');

const { generateJiraTermTable } = require('./formatters');

// Retrieve the list of Jiras to the specified commit hash
function listJira(args) {
  const { url, auth, commit } = args;
  const authSplit = auth.split(':');
  const client = initialiseJiraApi(url, authSplit[0], authSplit[1]);
  getCommitsUntil(commit)
    .then((commits) => filterMissingJiras(commits))
    .then((commits) => mapCommitsToJiras(commits))
    .then((jiraMap) => aggregateJiraMetadata(jiraMap, client))
    .catch((err) => console.log(err.message))
    .then((jiraList) => generateJiraTermTable(jiraList));
}

function listInvalid(args) {}

module.exports = {
  listJira,
  listInvalid,
};
