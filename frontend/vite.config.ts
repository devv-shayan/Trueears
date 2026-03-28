import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

const workspaceRoot = path.resolve(__dirname, '..');

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(path.resolve(workspaceRoot, 'package.json'), 'utf-8')
);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, workspaceRoot, '');
  const host = process.env.TAURI_DEV_HOST;
  const isTauriDebug = process.env.TAURI_ENV_DEBUG === 'true';
  const tauriPlatform = process.env.TAURI_ENV_PLATFORM;
  const paymentPort = env.PAYMENT_API_PORT || '3002';
  const paymentServiceUrl =
    env.VITE_PAYMENT_SERVICE_URL ||
    env.PAYMENT_SERVICE_URL ||
    `http://127.0.0.1:${paymentPort}`;

  const variantBasic =
    env.VITE_LEMONSQUEEZY_VARIANT_ID_BASIC ||
    env.LEMONSQUEEZY_VARIANT_ID_BASIC ||
    env.LEMONSQUEEZY_VARIANT_ID_BASIC_MONTHLY ||
    '';

  const variantPro =
    env.VITE_LEMONSQUEEZY_VARIANT_ID_PRO ||
    env.LEMONSQUEEZY_VARIANT_ID_PRO ||
    env.LEMONSQUEEZY_VARIANT_ID_PRO_MONTHLY ||
    '';
  
  return {
    base: './',
    // Load .env from workspace root (single centralized location).
    envDir: workspaceRoot,
    // Inject version as a global define
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
      // Safe client-side values only (never inject API keys or secrets here).
      'import.meta.env.VITE_PAYMENT_SERVICE_URL': JSON.stringify(paymentServiceUrl),
      'import.meta.env.VITE_LEMONSQUEEZY_VARIANT_ID_BASIC': JSON.stringify(variantBasic),
      'import.meta.env.VITE_LEMONSQUEEZY_VARIANT_ID_PRO': JSON.stringify(variantPro),
    },
    // prevent vite from obscuring rust errors
    clearScreen: false,
    server: {
      // make sure this port matches the devUrl port in tauri.conf.json file
      port: 3000,
      // Tauri expects a fixed port, fail if that port is not available
      strictPort: true,
      // if the host Tauri is expecting is set, use it
      host: host || false,
      hmr: host
        ? {
            protocol: 'ws',
            host,
            port: 3001,
          }
        : undefined,
      watch: {
        // tell vite to ignore watching `backend`
        ignored: ['**/backend/**'],
      },
    },
    // Env variables starting with the item of `envPrefix` will be exposed in tauri's source code through `import.meta.env`.
    envPrefix: ['VITE_', 'TAURI_ENV_'],
    plugins: [react()],
    optimizeDeps: {
      exclude: ['@tauri-apps/api', '@tauri-apps/api/*'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      // Tauri uses Chromium on Windows and WebKit on macOS and Linux
      target: tauriPlatform === 'windows' ? 'chrome105' : 'safari13',
      // Let Vite 8 use its default minifier in release builds; keep debug builds unminified.
      minify: isTauriDebug ? false : undefined,
      // produce sourcemaps for debug builds
      sourcemap: isTauriDebug,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          style: path.resolve(__dirname, 'src/index.css')
        },
        output: {
          entryFileNames: '[name].js',
          assetFileNames: 'assets/[name].[ext]'
        }
      }
    }
  };
});
