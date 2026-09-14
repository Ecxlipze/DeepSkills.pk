import fs from 'node:fs';
import path from 'node:path';

// Confirms the running Node release without accessing accounts, DB or SMTP.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ status: 'error', message: 'Method not allowed.' });
  }
  let release = process.env.VERCEL_GIT_COMMIT_SHA || 'local';
  try { release = fs.readFileSync(path.join(process.cwd(), '.release-id'), 'utf8').trim(); }
  catch (error) {
    if (error.code !== 'ENOENT') return res.status(503).json({ status: 'error' });
  }
  return res.status(200).json({ status: 'ok', runtime: 'node', release });
}
