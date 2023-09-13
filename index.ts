#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import runCommand, { exitError } from './lib.js';

(async function () {
  try {
    // Define required arguments, help section and get arguments
    const argv = yargs(hideBin(process.argv))
      .usage(
        `$0`,
        'Backup a PostgreSQL database. By default, uses the local .env file. The resulting string can be compressed and uploaded.',
        (y) =>
          y
            .option('env', {
              describe: "Environment file location. The default value is './.env'.",
              alias: 'e',
              type: 'string',
              default: './.env',
            })
            .option('no-env', {
              describe: 'Prevents .env file from loading.',
              alias: 'n',
              type: 'boolean',
            })
            .option('ask-password', {
              describe: 'Force to ask for a password.',
              alias: 'k',
              type: 'boolean',
            })
            .option('output', {
              describe: 'The output path.',
              alias: 'o',
              type: 'string',
            })
            .option('prefix', {
              describe: 'The prefix to filename.',
              alias: '-',
              type: 'string',
              default: '',
            })
            .option('gcp', {
              describe: 'Send backup to Google Cloud Platform.',
              alias: 'g',
              type: 'boolean',
            })
            .option('create-bucket', {
              describe: "Create the bucket if it doesn't exist.",
              type: 'boolean',
            })
            .option('no-check-bucket', {
              describe: "Skip checking whether the bucket exists.",
              type: 'boolean',
            })
      )
      .command(`generate`, 'Generate base .env file.', (y) =>
        y
          .option('output', {
            describe: 'The output path.',
            alias: 'o',
            type: 'string',
            default: '.',
          })
          .option('filename', {
            describe: "The env filename. The default is '.env'.",
            alias: 'f',
            type: 'string',
            default: '.env',
          })
          .option('overwrite', {
            describe: 'Whether to overwrite .env file if it already exists.',
            alias: 'w',
            type: 'boolean',
          })
      )
      .help()
      .alias('h', 'help')
      .version('1.0')
      .completion().argv;

    const {
      _: commands,
      env: envFilePath,
      noEnv: noEnvLoading,
      askPassword,
      prefix,
      gcp,
      output,
      filename,
      overwrite,
      createBucket,
      noCheckBucket,
    } = argv as any;

    return await runCommand({
      commands,
      envFilePath,
      noEnvLoading,
      askPassword,
      prefix,
      gcp,
      output,
      filename,
      overwrite,
      createBucket,
      noCheckBucket,
    });
  } catch (error) {
    return exitError(error);
  }
})();
