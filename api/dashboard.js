export default async function handler(req, res) {
  // Security check
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized' 
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    // Get basic dashboard data with proper fallbacks
    const dashboardData = {
      success: true,
      data: {
        status: 'idle',
        lastRun: formatLastRunTime(),
        lastResult: getLastResultStatus(),
        logs: getRecentLogs()
      }
    };

    return res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to load dashboard data',
      data: {
        status: 'error',
        lastRun: 'Unknown',
        lastResult: 'error',
        logs: [
          {
            timestamp: new Date().toLocaleString(),
            message: 'Dashboard error: ' + error.message,
            type: 'error'
          }
        ]
      }
    });
  }
}

// Format last run time with proper fallback
function formatLastRunTime() {
  // In serverless, we can't persist state in environment variables
  // This would need a proper database in production
  return 'Status information not available in serverless mode';
}

// Get last result status with fallback
function getLastResultStatus() {
  // In serverless, we can't persist state in environment variables
  // This would need a proper database in production
  return 'unknown';
}

// Get recent logs with proper fallbacks
function getRecentLogs() {
  // Since we can't persist state in serverless environment,
  // return helpful static information
  const currentTime = new Date().toLocaleString();
  
  return [
    {
      timestamp: currentTime,
      message: 'Dashboard loaded successfully',
      type: 'success'
    },
    {
      timestamp: currentTime,
      message: 'Bot ready for manual execution',
      type: 'info'
    },
    {
      timestamp: currentTime,
      message: 'Note: Execution history not available in stateless mode',
      type: 'info'
    }
  ];
}