import esbuild from 'esbuild';
import esbuildPluginTsc from 'esbuild-plugin-tsc';

esbuild.build({
  entryPoints: ['index.ts'],
  bundle: true,
  treeShaking: true,
  format: 'esm',
  platform: 'node',
  outfile: './bin/postgresql-backup.mjs',
  plugins: [esbuildPluginTsc({ force: true })],
  banner: {
    js: "import { createRequire as topLevelCreateRequire } from 'module';\nconst require = topLevelCreateRequire(import.meta.url);",
  },
});
