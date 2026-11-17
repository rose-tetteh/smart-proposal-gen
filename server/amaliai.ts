/**
 * Mounts the backend (server/core.ts) inside the Vite dev and preview servers,
 * so `npm run dev` works exactly like the Vercel deployment.
 *
 * Settings come from .env, which is re-read on every request: editing it
 * takes effect without restarting the server. On Vercel the same settings
 * live in the project's Environment Variables instead (see api/*.ts).
 */
import { loadEnv, type Connect, type Plugin } from 'vite';
import { handleApi } from './core.js';

const PREFIXES = ['AMALIAI_', 'APP_PASSCODE', 'AUTH_SECRET'];

function middleware(envDir: string, mode: string): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const handled = await handleApi(req, res, loadEnv(mode, envDir, PREFIXES));
    if (!handled) next();
  };
}

export function amaliaiProxy(): Plugin {
  let envDir = process.cwd();
  let mode = 'development';
  return {
    name: 'amaliai-proxy',
    configResolved(c) {
      envDir = c.envDir || c.root;
      mode = c.mode;
    },
    configureServer(server) {
      server.middlewares.use(middleware(envDir, mode));
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware(envDir, mode));
    },
  };
}
