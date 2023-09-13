import esbuild from 'esbuild';
import esbuildPluginTsc from 'esbuild-plugin-tsc';

esbuild.build({
  entryPoints: ['lib.ts'],
  bundle: true,
  treeShaking: true,
  format: 'esm',
  platform: 'node',
  outfile: './dist/postgresql-backup-lib.mjs',
  plugins: [esbuildPluginTsc({ force: true })],
  banner: {
    js: "import { createRequire as topLevelCreateRequire } from 'module';\nconst require = topLevelCreateRequire(import.meta.url);",
  },
});
