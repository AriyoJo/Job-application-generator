import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const config = {
  packagerConfig: {
    asar: true,
  },

  rebuildConfig: {},

  hooks: {
    packageAfterCopy: async (_forgeConfig, buildPath) => {
      // Salin better-sqlite3 ke dalam buildPath karena plugin Vite mengabaikan node_modules saat packaging
      const src = path.join(rootDir, 'node_modules', 'better-sqlite3');
      const dest = path.join(buildPath, 'node_modules', 'better-sqlite3');
      fs.cpSync(src, dest, { recursive: true });
    },
  },

  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],

  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main.js',
          config: 'vite.main.config.mjs',
          target: 'main',
        },
        {
          entry: 'src/preload.js',
          config: 'vite.preload.config.mjs',
          target: 'preload',
        },
      ],

      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mjs',
        },
      ],
    }),

    new AutoUnpackNativesPlugin(),

    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;