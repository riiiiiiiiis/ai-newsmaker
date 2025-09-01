// Dashboard at root - Monitor AI News Bot status
export default async function handler(req, res) {
  // Set HTML content type
  res.setHeader('Content-Type', 'text/html');
  
  // Get current time info
  const now = new Date();
  const nextRun = getNextCronRun();
  const timeToNext = Math.max(0, Math.floor((nextRun - now) / 1000 / 60 / 60)); // hours
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🤖 AI News Bot Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }
        .status-card { border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status-good { background: linear-gradient(45deg, #28a745, #20c997); }
        .status-bad { background: linear-gradient(45deg, #dc3545, #e83e8c); }
        .status-warning { background: linear-gradient(45deg, #ffc107, #fd7e14); }
        .status-indicator { width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin-right: 8px; }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .metric-card { transition: transform 0.2s; }
        .metric-card:hover { transform: translateY(-2px); }
        .console { background: #1a1a1a; color: #00ff00; font-family: 'Courier New', monospace; padding: 15px; border-radius: 8px; height: 200px; overflow-y: scroll; font-size: 12px; }
        .btn-trigger { background: linear-gradient(45deg, #007bff, #6f42c1); border: none; }
        .loading { opacity: 0.6; pointer-events: none; }
    </style>
</head>
<body>
    <div class="container py-4">
        <!-- Header -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="card status-card bg-white">
                    <div class="card-body text-center">
                        <h1 class="mb-3">🤖 AI News Bot Dashboard</h1>
                        <div class="row">
                            <div class="col-md-4">
                                <h5>Bot Status</h5>
                                <div id="overall-status" class="pulse">
                                    <span class="status-indicator bg-secondary"></span>
                                    <span>Checking...</span>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <h5>Last Run</h5>
                                <div id="last-run">
                                    <span>Loading...</span>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <h5>Next Run</h5>
                                <div class="text-primary">
                                    <strong>in ~${timeToNext} hours</strong><br>
                                    <small class="text-muted">Daily at 12:00 UTC</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Health Checks -->
        <div class="row mb-4">
            <div class="col-12">
                <h3 class="mb-3">🔍 Health Checks</h3>
            </div>
            <div class="col-md-6 col-lg-3 mb-3">
                <div class="card metric-card status-card h-100">
                    <div class="card-body text-center">
                        <div id="telegram-status">
                            <span class="status-indicator bg-secondary pulse"></span>
                            <h6>Telegram Bot</h6>
                            <small class="text-muted">Checking...</small>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6 col-lg-3 mb-3">
                <div class="card metric-card status-card h-100">
                    <div class="card-body text-center">
                        <div id="channel-status">
                            <span class="status-indicator bg-secondary pulse"></span>
                            <h6>Channel Access</h6>
                            <small class="text-muted">Checking...</small>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6 col-lg-3 mb-3">
                <div class="card metric-card status-card h-100">
                    <div class="card-body text-center">
                        <div id="openrouter-status">
                            <span class="status-indicator bg-secondary pulse"></span>
                            <h6>OpenRouter AI</h6>
                            <small class="text-muted">Checking...</small>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6 col-lg-3 mb-3">
                <div class="card metric-card status-card h-100">
                    <div class="card-body text-center">
                        <div id="github-status">
                            <span class="status-indicator bg-secondary pulse"></span>
                            <h6>GitHub Source</h6>
                            <small class="text-muted">Checking...</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Controls -->
        <div class="row mb-4">
            <div class="col-md-6">
                <div class="card status-card">
                    <div class="card-body">
                        <h5 class="card-title">🚀 Manual Controls</h5>
                        <button id="trigger-btn" class="btn btn-trigger text-white me-2 mb-2" onclick="triggerManual()">
                            <span id="trigger-text">Trigger Daily Report</span>
                            <span id="trigger-spinner" class="spinner-border spinner-border-sm ms-2" style="display:none;"></span>
                        </button>
                        <button class="btn btn-outline-secondary mb-2" onclick="refreshStatus()">🔄 Refresh Status</button>
                        <div id="trigger-result" class="mt-2"></div>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card status-card">
                    <div class="card-body">
                        <h5 class="card-title">⚙️ Configuration</h5>
                        <div class="small">
                            <div><strong>Cron Schedule:</strong> Daily at 12:00 UTC</div>
                            <div><strong>Function Timeout:</strong> 30 seconds</div>
                            <div><strong>Environment:</strong> <span id="env-status">Checking...</span></div>
                            <div><strong>Deployment:</strong> Vercel Serverless</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Activity Log -->
        <div class="row">
            <div class="col-12">
                <div class="card status-card">
                    <div class="card-body">
                        <h5 class="card-title">📊 Activity Console</h5>
                        <div id="activity-console" class="console">
                            <div>🤖 AI News Bot Dashboard initialized</div>
                            <div>📡 Starting health checks...</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let statusData = {};
        
        // Initialize dashboard
        window.onload = function() {
            log('🚀 Dashboard loaded, running initial health checks...');
            checkAllStatus();
            setInterval(refreshStatus, 30000); // Auto-refresh every 30 seconds
        };

        function log(message) {
            const console = document.getElementById('activity-console');
            const time = new Date().toLocaleTimeString();
            console.innerHTML += \`<div>[\${time}] \${message}</div>\`;
            console.scrollTop = console.scrollHeight;
        }

        async function checkAllStatus() {
            log('🔍 Running comprehensive health checks...');
            
            try {
                const response = await fetch('/api/status');
                statusData = await response.json();
                updateUI();
                log('✅ Health check completed successfully');
            } catch (error) {
                log('❌ Health check failed: ' + error.message);
                updateUIError();
            }
        }

        function updateUI() {
            // Overall status
            const overallEl = document.getElementById('overall-status');
            const allGood = Object.values(statusData.checks).every(check => check.status === 'ok');
            
            if (allGood) {
                overallEl.innerHTML = '<span class="status-indicator bg-success"></span><span class="text-success">All Systems Operational</span>';
                overallEl.className = '';
            } else {
                overallEl.innerHTML = '<span class="status-indicator bg-warning"></span><span class="text-warning">Some Issues Detected</span>';
                overallEl.className = 'pulse';
            }

            // Individual checks
            updateCheck('telegram-status', statusData.checks.telegram, 'Telegram Bot');
            updateCheck('channel-status', statusData.checks.channel, 'Channel Access');  
            updateCheck('openrouter-status', statusData.checks.openrouter, 'OpenRouter AI');
            updateCheck('github-status', statusData.checks.github, 'GitHub Source');

            // Environment status
            document.getElementById('env-status').textContent = statusData.environment.status === 'ok' ? '✅ Complete' : '⚠️ Issues';

            // Last run info
            if (statusData.lastRun) {
                document.getElementById('last-run').innerHTML = 
                    \`<span class="text-success">✅ \${statusData.lastRun.timeAgo}</span><br>
                     <small class="text-muted">\${statusData.lastRun.details}</small>\`;
            }
        }

        function updateCheck(elementId, checkData, name) {
            const el = document.getElementById(elementId);
            const isOk = checkData.status === 'ok';
            const statusColor = isOk ? 'success' : 'danger';
            const statusIcon = isOk ? '✅' : '❌';
            
            el.innerHTML = \`
                <span class="status-indicator bg-\${statusColor}"></span>
                <h6>\${name}</h6>
                <small class="text-\${statusColor}">\${statusIcon} \${checkData.message}</small>
            \`;
        }

        function updateUIError() {
            document.getElementById('overall-status').innerHTML = 
                '<span class="status-indicator bg-danger pulse"></span><span class="text-danger">Status Check Failed</span>';
        }

        async function triggerManual() {
            const btn = document.getElementById('trigger-btn');
            const text = document.getElementById('trigger-text');
            const spinner = document.getElementById('trigger-spinner');
            const result = document.getElementById('trigger-result');
            
            btn.classList.add('loading');
            text.textContent = 'Triggering...';
            spinner.style.display = 'inline-block';
            
            log('🚀 Manual trigger initiated...');

            try {
                const response = await fetch('/api/daily-report', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + prompt('Enter CRON_SECRET:') }
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    result.innerHTML = '<div class="alert alert-success mt-2">✅ Report sent successfully!</div>';
                    log('✅ Manual trigger completed successfully');
                } else {
                    result.innerHTML = \`<div class="alert alert-danger mt-2">❌ Error: \${data.error}</div>\`;
                    log('❌ Manual trigger failed: ' + data.error);
                }
            } catch (error) {
                result.innerHTML = \`<div class="alert alert-danger mt-2">❌ Network error: \${error.message}</div>\`;
                log('❌ Manual trigger error: ' + error.message);
            }

            btn.classList.remove('loading');
            text.textContent = 'Trigger Daily Report';
            spinner.style.display = 'none';
            
            setTimeout(() => result.innerHTML = '', 5000);
        }

        function refreshStatus() {
            log('🔄 Refreshing status...');
            checkAllStatus();
        }
    </script>
</body>
</html>
  `;

  return res.status(200).send(html);
}

// Helper function to calculate next cron run
function getNextCronRun() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(12, 0, 0, 0); // 12:00 UTC
  
  // If we've passed today's run, set for tomorrow
  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  
  return next;
}