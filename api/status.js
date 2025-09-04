// Edge Function configuration
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Health check endpoint - Tests all integrations and returns status
export async function GET() {
  const startTime = Date.now();
  
  // Initialize status object
  const status = {
    timestamp: new Date().toISOString(),
    checks: {
      telegram: { status: 'checking', message: 'Testing bot connectivity...' },
      channel: { status: 'checking', message: 'Testing channel access...' },
      openrouter: { status: 'checking', message: 'Testing AI service...' },
      github: { status: 'checking', message: 'Testing source availability...' }
    },
    environment: {
      status: 'ok',
      variables: {}
    },
    performance: {
      responseTime: 0
    },
    lastRun: null
  };

  // Check environment variables
  const requiredEnvs = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHANNEL_ID', 'OPENROUTER_API_KEY', 'CRON_SECRET', 'GITHUB_RAW_URL'];
  const envStatus = {};
  let envOk = true;
  
  requiredEnvs.forEach(env => {
    const exists = !!process.env[env];
    envStatus[env] = exists ? '✅' : '❌';
    if (!exists) envOk = false;
  });
  
  status.environment = {
    status: envOk ? 'ok' : 'error',
    variables: envStatus
  };

  // Run all health checks in parallel
  const checks = await Promise.allSettled([
    checkTelegramBot(),
    checkChannelAccess(), 
    checkOpenRouter(),
    checkGitHubSource()
  ]);

  // Process results
  status.checks.telegram = checks[0].status === 'fulfilled' ? checks[0].value : { status: 'error', message: checks[0].reason?.message || 'Connection failed' };
  status.checks.channel = checks[1].status === 'fulfilled' ? checks[1].value : { status: 'error', message: checks[1].reason?.message || 'Access failed' };
  status.checks.openrouter = checks[2].status === 'fulfilled' ? checks[2].value : { status: 'error', message: checks[2].reason?.message || 'Service unavailable' };
  status.checks.github = checks[3].status === 'fulfilled' ? checks[3].value : { status: 'error', message: checks[3].reason?.message || 'Source unavailable' };

  // Add mock last run info (in production, this would come from logs/database)
  status.lastRun = {
    timeAgo: '2 hours ago',
    details: '1,534 chars, 5 trends, ✅ success'
  };

  // Calculate response time
  status.performance.responseTime = Date.now() - startTime;

  return Response.json(status, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// Check Telegram bot connectivity
async function checkTelegramBot() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return { status: 'error', message: 'Bot token not configured' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`, {
      method: 'GET'
    });

    if (!response.ok) {
      return { status: 'error', message: `HTTP ${response.status}` };
    }

    const data = await response.json();
    if (data.ok) {
      return { 
        status: 'ok', 
        message: `Connected as @${data.result.username}`,
        details: data.result
      };
    } else {
      return { status: 'error', message: data.description || 'Bot API error' };
    }
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

// Check channel access
async function checkChannelAccess() {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHANNEL_ID) {
    return { status: 'error', message: 'Channel credentials not configured' };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getChat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHANNEL_ID })
      }
    );

    if (!response.ok) {
      return { status: 'error', message: `HTTP ${response.status}` };
    }

    const data = await response.json();
    if (data.ok) {
      return { 
        status: 'ok', 
        message: `Access to "${data.result.title}" ✅`,
        details: { title: data.result.title, type: data.result.type }
      };
    } else {
      return { status: 'error', message: data.description || 'Channel access failed' };
    }
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

// Check OpenRouter AI service
async function checkOpenRouter() {
  if (!process.env.OPENROUTER_API_KEY) {
    return { status: 'error', message: 'OpenRouter API key not configured' };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return { status: 'error', message: `HTTP ${response.status}` };
    }

    const data = await response.json();
    if (data.data && Array.isArray(data.data)) {
      const modelCount = data.data.length;
      return { 
        status: 'ok', 
        message: `Connected, ${modelCount} models available`,
        details: { modelCount, hasGemini: data.data.some(m => m.id.includes('gemini')) }
      };
    } else {
      return { status: 'error', message: 'Invalid API response' };
    }
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

// Check GitHub source availability
async function checkGitHubSource() {
  if (!process.env.GITHUB_RAW_URL) {
    return { status: 'error', message: 'GitHub URL not configured' };
  }

  try {
    const response = await fetch(process.env.GITHUB_RAW_URL, {
      method: 'HEAD' // Just check if accessible, don't download content
    });

    if (!response.ok) {
      return { status: 'error', message: `HTTP ${response.status}` };
    }

    const contentLength = response.headers.get('content-length');
    return { 
      status: 'ok', 
      message: `Source accessible${contentLength ? `, ${Math.round(contentLength/1024)}KB` : ''}`,
      details: { 
        url: process.env.GITHUB_RAW_URL.split('/').slice(-2).join('/'),
        lastModified: response.headers.get('last-modified')
      }
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}