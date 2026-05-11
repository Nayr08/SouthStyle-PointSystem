import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import packageJson from '@/package.json';

export const dynamic = 'force-dynamic';

async function getAppVersion() {
  const appVersion = packageJson.version;

  if (process.env.NODE_ENV !== 'production') {
    return `${appVersion}+development`;
  }

  try {
    const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');
    const buildId = (await readFile(buildIdPath, 'utf8')).trim();
    return `${appVersion}+${buildId}`;
  } catch {
    const deploymentId = process.env.VERCEL_GIT_COMMIT_SHA
      ?? process.env.RAILWAY_GIT_COMMIT_SHA
      ?? process.env.RENDER_GIT_COMMIT
      ?? 'production';

    return `${appVersion}+${deploymentId}`;
  }
}

export async function GET() {
  const version = await getAppVersion();

  return NextResponse.json(
    { version },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    },
  );
}
