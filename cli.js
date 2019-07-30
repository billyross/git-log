#!/usr/bin/env node
const { listJira, listInvalid } = require('./src/commands');

const { argv } = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .command({
    command: '$0',
    alias: 'listjira',
    desc: 'Retrieve the list of Jiras to the specified commit hash',
    handler: (argv) => listJira(argv),
  })
  .option('u', {
    alias: 'url',
    desc: 'Host URL of the jira instance',
    nargs: 1,
    demandOption: true,
  })
  .option('a', {
    alias: 'auth',
    desc: 'Jira username and access token as user:token',
    nargs: 1,
    demandOption: true,
  })
  .option('c', {
    alias: 'commit',
    desc: 'SHA hash of the last commit to log to',
    nargs: 1,
    demandOption: true,
  })
  .help('h')
  .alias('h', 'help');
