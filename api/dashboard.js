export default async function handler(req, res) {
  // Security check
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get basic dashboard data
    const dashboardData = {
      status: 'idle',
      lastRun: process.env.LAST_RUN_TIME || null,
      lastResult: process.env.LAST_RUN_RESULT || null,
      logs: await getRecentLogs()
    };

    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ 
      error: 'Failed to load dashboard data',
      details: error.message 
    });
  }
}

async function getRecentLogs() {
  // Simple log storage - in a real app you'd use a database
  // For now, we'll return some basic info from environment variables
  const logs = [];
  
  if (process.env.LAST_RUN_TIME) {
    const result = process.env.LAST_RUN_RESULT || 'unknown';
    const message = process.env.LAST_RUN_MESSAGE || `Bot execution ${result}`;
    
    logs.push({
      timestamp: new Date(process.env.LAST_RUN_TIME).toLocaleString(),
      message: message,
      type: result === 'success' ? 'success' : result === 'error' ? 'error' : 'info'
    });
  }

  // Add some static info logs
  if (logs.length === 0) {
    logs.push({
      timestamp: new Date().toLocaleString(),
      message: 'Dashboard initialized - no recent bot activity',
      type: 'info'
    });
  }

  return logs.slice(0, 10); // Return last 10 logs max
}