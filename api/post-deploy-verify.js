// Edge Function configuration
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const startTime = Date.now();

  // Auth: accept Authorization: Bearer <CRON_SECRET> or ?token=<CRON_SECRET>
  const authHeader = request.headers.get('authorization') || '';
  const url = new URL(request.url);
  const tokenParam = url.searchParams.get('token');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  const authorized = (authHeader === expected) || (tokenParam && tokenParam === process.env.CRON_SECRET);

  if (!authorized) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Optional flags
    const delayMs = Number(process.env.POST_DEPLOY_DELAY_MS || url.searchParams.get('delayMs') || 10000);
    const runTelegramTest = String(url.searchParams.get('testTelegram') || '').toLowerCase() === 'true';

    // Wait ~10s after deploy to let routes warm up and envs settle
    await new Promise(resolve => setTimeout(resolve, delayMs));

    const baseUrl = `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;

    // Check status endpoint
    const statusResp = await fetch(`${baseUrl}/api/status`, { method: 'GET' });
    const statusOk = statusResp.ok;
    const statusData = await statusResp.json().catch(() => ({}));

    let telegramTest = null;
    if (runTelegramTest) {
      const testResp = await fetch(`${baseUrl}/api/test?component=telegram`, {
        method: 'GET',
        headers: { 'Authorization': expected }
      });
      telegramTest = {
        ok: testResp.ok,
        data: await testResp.json().catch(() => ({}))
      };
    }

    const duration = Date.now() - startTime;
    return Response.json({
      success: true,
      duration,
      delayMs,
      verified: statusOk,
      status: statusData,
      telegramTest
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}


