import { config as dotenvConfig } from 'dotenv';
import { $ } from 'execa';
import { createGzip, gzip } from 'node:zlib';
import { createWriteStream } from 'node:fs';
import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { access, writeFile } from 'node:fs/promises';
import { Storage } from '@google-cloud/storage';

export default async function runCommand({
  commands = [],
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
}: any) {
  if (commands[0] === 'generate') {
    await generateBaseEnvFile(output, filename, overwrite);
    return exitSuccess('Base .env file generated.');
  }

  if (!noEnvLoading) dotenvConfig({ path: envFilePath });

  let askedPassword: null | string = null;
  if (askPassword) {
    askedPassword = await askForPassword();
  }

  const c = {
    DB_HOST: process.env.DB_HOST as string,
    DB_PORT: process.env.DB_PORT as string,
    DB_DATABASE: process.env.DB_DATABASE as string,
    DB_USER: process.env.DB_USER as string,
    DB_PASSWORD: (askedPassword ?? process.env.DB_PASSWORD) as string,
  };

  checkRequiredEnv(c);

  process.env.PGPASSWORD = c.DB_PASSWORD;

  const { stdout: databaseContent } =
    await $`pg_dump -h ${c.DB_HOST} -p ${c.DB_PORT} -U ${c.DB_USER} -w -F p ${c.DB_DATABASE}`;

  const dumpFilename =
    (prefix ? `${prefix}-` : '') + `dump-pg-${new Date().toISOString().slice(0, -5).replace(/T|:/g, '-')}.sql.gz`;

  if (output) {
    const source = Readable.from([databaseContent]);
    const outputPath = join(output, dumpFilename);
    const destination = createWriteStream(outputPath);

    console.log('Output to file ' + outputPath);

    await pipeline(source, createGzip(), destination);
  }

  if (gcp) {
    console.log(`Send ${dumpFilename} to Google Cloud Platform to bucket ${process.env.GOOGLE_CLOUD_BUCKET_NAME}.`);

    const databaseContentCompressed = await new Promise<Buffer>((res, rej) =>
      gzip(databaseContent, (err, buffer) => (err ? rej(err) : res(buffer)))
    );

    await uploadToGCloudStorage(dumpFilename, databaseContentCompressed, createBucket, noCheckBucket);
  }

  return exitSuccess(`Finished on ${new Date().toLocaleString()}.`);
}

export function exitSuccess(message: string) {
  console.error(message);
  process.exit(0);
}

export function exitError(error: any) {
  console.error('An error occurred:', error);
  process.exit((error && error.code) || 1);
}

async function askForPassword() {
  const reader = createInterface({
    input: process.stdin,
    output: new Writable({
      write: function (_, __, callback) {
        callback();
      },
    }),
    terminal: true,
  });

  console.log('Password:');
  const password = await reader.question('');
  reader.close();

  return password;
}

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function generateBaseEnvFile(output: string, filename: string, mustOverwrite: boolean) {
  const data =
    [
      '# PostgreSQL database credentials',
      'DB_HOST=',
      'DB_PORT=',
      'DB_DATABASE=',
      'DB_USER=',
      'DB_PASSWORD=',
      '',
      '# Google Cloud Storage credentials',
      'GOOGLE_CLOUD_PROJECT=',
      'GOOGLE_CLOUD_BUCKET_NAME=',
    ].join('\n') + '\n';

  const outputPath = join(output, filename);

  if (mustOverwrite || (!mustOverwrite && !(await exists(outputPath)))) return await writeFile(outputPath, data);
  else throw new Error(`File ${outputPath} already exists.`);
}

async function uploadToGCloudStorage(filename: string, data: string | Buffer, createBucket: boolean, noCheckBucket: boolean) {
  const envParams = {
    GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT as string,
    GOOGLE_CLOUD_BUCKET_NAME: process.env.GOOGLE_CLOUD_BUCKET_NAME as string,
  };

  checkRequiredEnv(envParams);

  const storage = new Storage({
    projectId: envParams.GOOGLE_CLOUD_PROJECT,
  });

  const bucket = storage.bucket(envParams.GOOGLE_CLOUD_BUCKET_NAME);
  if (!noCheckBucket && !(await bucket.exists()))
    if (createBucket) await storage.createBucket(envParams.GOOGLE_CLOUD_BUCKET_NAME);
    else throw new Error(`The bucket ${envParams.GOOGLE_CLOUD_BUCKET_NAME} not exists.`);

  await storage.bucket(envParams.GOOGLE_CLOUD_BUCKET_NAME).file(filename).save(data);
}

function checkRequiredEnv(params: object) {
  const keys = Object.keys(params);
  const errors = Object.values(params)
    .map((value, i) => (value ? null : keys[i]))
    .filter((v) => v);

  if (errors.length > 0) throw new Error(`The following parameters were not provided:\n${errors.join(', ')}`);
}
