export default async function handler(req, res) {
  const startTime = Date.now();

  // Allow only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Auth: accept Authorization: Bearer <CRON_SECRET> or ?token=<CRON_SECRET>
  const authHeader = req.headers['authorization'] || '';
  const tokenParam = req.query?.token;
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  const authorized = (authHeader === expected) || (tokenParam && tokenParam === process.env.CRON_SECRET);

  if (!authorized) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    // Optional flags
    const delayMs = Number(process.env.POST_DEPLOY_DELAY_MS || req.query?.delayMs || 10000);
    const runTelegramTest = String(req.query?.testTelegram || '').toLowerCase() === 'true';

    // Wait ~10s after deploy to let routes warm up and envs settle
    await new Promise(resolve => setTimeout(resolve, delayMs));

    const baseUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;

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
    return res.status(200).json({
      success: true,
      duration,
      delayMs,
      verified: statusOk,
      status: statusData,
      telegramTest
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}


