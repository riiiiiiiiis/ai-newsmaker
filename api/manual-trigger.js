import { createHash } from 'crypto';

export default async function handler(req, res) {
  const startTime = Date.now();
  const runId = generateRunId();
  
  // Enhanced logging function
  const log = (step, message, data = {}) => {
    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - startTime;
    console.log(`[${runId}] [MANUAL] [${timestamp}] [${elapsed}ms] ${step}: ${message}`, data);
  };

  log('START', 'Manual trigger execution started', { 
    headers: Object.keys(req.headers), 
    method: req.method 
  });

  // Security check
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    log('AUTH_FAILED', 'Unauthorized access attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    log('EXECUTE', 'Starting bot execution via manual trigger');
    
    // Execute the same logic as the cron job by calling the daily-report endpoint internally
    const internalRequest = {
      headers: { 'authorization': `Bearer ${process.env.CRON_SECRET}` },
      method: 'GET'
    };
    
    // Create a mock response to capture the result
    let internalResult = null;
    const internalResponse = {
      status: (code) => ({ json: (data) => { internalResult = { code, data }; } }),
      json: (data) => { internalResult = { code: 200, data }; }
    };
    
    // Import and execute the daily report handler
    const { default: dailyReportHandler } = await import('./daily-report.js');
    await dailyReportHandler(internalRequest, internalResponse);
    
    // Store execution result in environment (simplified approach)
    process.env.LAST_RUN_TIME = new Date().toISOString();
    
    if (internalResult.code === 200) {
      process.env.LAST_RUN_RESULT = 'success';
      process.env.LAST_RUN_MESSAGE = 'Manual execution completed successfully';
      
      log('COMPLETE', 'Manual execution completed successfully');
      
      res.status(200).json({
        success: true,
        message: 'Bot executed successfully via manual trigger',
        runId: runId,
        executionTime: Date.now() - startTime,
        details: internalResult.data
      });
    } else {
      process.env.LAST_RUN_RESULT = 'error';
      process.env.LAST_RUN_MESSAGE = internalResult.data?.error || 'Execution failed';
      
      log('ERROR', 'Manual execution failed', { result: internalResult });
      
      res.status(500).json({
        success: false,
        message: internalResult.data?.error || 'Execution failed',
        runId: runId
      });
    }
    
  } catch (error) {
    log('ERROR', 'Manual execution failed', { error: error.message });
    
    process.env.LAST_RUN_TIME = new Date().toISOString();
    process.env.LAST_RUN_RESULT = 'error';
    process.env.LAST_RUN_MESSAGE = `Manual execution failed: ${error.message}`;
    
    res.status(500).json({
      success: false,
      message: `Execution failed: ${error.message}`,
      runId: runId
    });
  }
}

function generateRunId() {
  return Math.random().toString(36).substr(2, 9);
}