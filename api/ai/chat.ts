/** Vercel serverless function: see server/core.ts for what this endpoint does. */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleApi } from '../../server/core.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await handleApi(req, res, process.env);
}
