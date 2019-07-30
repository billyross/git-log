const Table = require('cli-table');

function generateJiraTermTable(jiraList) {
  const table = new Table({
    head: [
      'Code',
      'Status',
      'Title',
      'Last Commit',
      'Developer(s)',
      'Commits',
      'Fix Version(s)',
      'Assignee',
    ],
    colWidths: [14, 18, 40, 13, 16, 9, 16, 20],
  });
  jiraList.forEach((li) => {
    table.push([
      li.code,
      li.status,
      li.title,
      li.lastCommitDate.format('ddd D MMM'),
      li.developers,
      li.commits,
      li.fixVersions,
      li.assignee,
    ]);
  });
  console.log(table.toString());
}

module.exports = {
  generateJiraTermTable,
};
