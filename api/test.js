// Edge Function configuration
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Individual component testing endpoint
export async function GET(request) {
  return await handleTest(request);
}

export async function POST(request) {
  return await handleTest(request);
}

async function handleTest(request) {
  // Security check
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ 
      success: false,
      error: 'Unauthorized' 
    }, { status: 401 });
  }

  const url = new URL(request.url);
  const { component } = Object.fromEntries(url.searchParams);
  
  if (!component) {
    return Response.json({
      success: false,
      error: 'Missing component parameter',
      data: {
        availableComponents: ['fetch', 'analyze', 'format', 'send-test', 'hash', 'translation', 'telegram']
      }
    }, { status: 400 });
  }

  try {
    let result;
    
    switch (component) {
      case 'fetch':
        result = await testFetch();
        break;
      case 'analyze':
        result = await testAnalyze();
        break;
      case 'format':
        result = await testFormat();
        break;
      case 'send-test':
        result = await testSend();
        break;
      case 'hash':
        result = await testHash();
        break;
      case 'translation':
        result = await testTranslation();
        break;
      case 'telegram':
        result = await testTelegram();
        break;
      default:
        return Response.json({ 
          success: false,
          error: 'Invalid component',
          data: {
            availableComponents: ['fetch', 'analyze', 'format', 'send-test', 'hash', 'translation', 'telegram']
          }
        }, { status: 400 });
    }

    return Response.json({
      success: true,
      data: {
        component,
        timestamp: new Date().toISOString(),
        ...result
      }
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
      data: {
        component,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// Test GitHub content fetching
async function testFetch() {
  if (!process.env.GITHUB_RAW_URL) {
    throw new Error('GITHUB_RAW_URL not configured');
  }

  const start = Date.now();
  const response = await fetch(process.env.GITHUB_RAW_URL);
  
  if (!response.ok) {
    throw new Error(`GitHub fetch failed: ${response.status} ${response.statusText}`);
  }
  
  const content = await response.text();
  const duration = Date.now() - start;
  
  return {
    status: 'success',
    duration: `${duration}ms`,
    contentLength: content.length,
    contentPreview: content.substring(0, 200) + '...',
    lastModified: response.headers.get('last-modified')
  };
}

// Test AI analysis
async function testAnalyze() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  // Use sample content for testing
  const sampleContent = `# Reddit AI Trends - Sample
  
  ## Top Posts
  | Title | Score | Comments |
  |-------|-------|----------|
  | New LLM breakthrough | 1500 | 200 |
  | AI hardware news | 1200 | 150 |`;

  const start = Date.now();
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/reddit-ai-trends-bot',
      'X-Title': 'Reddit AI Trends Bot'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{
        role: 'system',
        content: 'Extract the top 3 trends from this sample data and format as a brief list.'
      }, {
        role: 'user',
        content: sampleContent
      }],
      temperature: 0.3,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const duration = Date.now() - start;

  return {
    status: 'success',
    duration: `${duration}ms`,
    inputLength: sampleContent.length,
    outputLength: data.choices[0].message.content.length,
    output: data.choices[0].message.content
  };
}

// Test message formatting
async function testFormat() {
  const sampleInput = `🔥 AI Тренды Reddit | 01.09.2025

📊 ГЛАВНОЕ СЕГОДНЯ:
• Тестовый тренд 1
• Тестовый тренд 2

🏆 ТОП-3:
1. 🚀 Test trend
   → Why it matters`;

  const formatted = formatForTelegram(sampleInput);
  
  return {
    status: 'success',
    inputLength: sampleInput.length,
    outputLength: formatted.length,
    withinTelegramLimit: formatted.length <= 4096,
    charUtilization: `${((formatted.length / 4096) * 100).toFixed(1)}%`,
    preview: formatted
  };
}

// Test Telegram sending (with test message)
async function testSend() {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHANNEL_ID) {
    throw new Error('Telegram credentials not configured');
  }

  const testMessage = `🧪 <b>Test Message</b>

This is a test message from the AI News Bot dashboard.
Timestamp: ${new Date().toISOString()}

If you see this, the bot is working correctly! ✅`;

  const start = Date.now();
  
  const response = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHANNEL_ID,
        text: testMessage,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram API failed: ${errorText}`);
  }

  const result = await response.json();
  const duration = Date.now() - start;

  return {
    status: 'success',
    duration: `${duration}ms`,
    messageId: result.result.message_id,
    chatId: result.result.chat.id,
    chatTitle: result.result.chat.title
  };
}

// Test hash functionality
async function testHash() {
  const testContent1 = "Test content 1";
  const testContent2 = "Test content 2";
  const testContent3 = "Test content 1"; // Same as first
  
  const encoder = new TextEncoder();
  
  // Generate hashes using Web Crypto API
  const hashBuffer1 = await crypto.subtle.digest('SHA-256', encoder.encode(testContent1));
  const hashBuffer2 = await crypto.subtle.digest('SHA-256', encoder.encode(testContent2));
  const hashBuffer3 = await crypto.subtle.digest('SHA-256', encoder.encode(testContent3));
  
  const hash1 = Array.from(new Uint8Array(hashBuffer1)).map(b => b.toString(16).padStart(2, '0')).join('');
  const hash2 = Array.from(new Uint8Array(hashBuffer2)).map(b => b.toString(16).padStart(2, '0')).join('');
  const hash3 = Array.from(new Uint8Array(hashBuffer3)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return {
    status: 'success',
    tests: {
      sameContentSameHash: hash1 === hash3,
      differentContentDifferentHash: hash1 !== hash2
    },
    hashes: {
      content1: hash1.substring(0, 16) + '...',
      content2: hash2.substring(0, 16) + '...',
      content3: hash3.substring(0, 16) + '...'
    }
  };
}

// Helper function for formatting (simplified version)
function formatForTelegram(text) {
  const formatted = text.trim();
  
  if (formatted.length > 4096) {
    return formatted.substring(0, 4000) + '\n\n... [обрезано]';
  }
  
  return formatted;
}

// Crypto API is available globally in Edge Runtime

// Test translation functionality
async function testTranslation() {
  try {
    const testText = "# AI Trends Test\n\nThis is a test of the translation system.";
    const start = Date.now();
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://newsmaker-bot.local',
        'X-Title': 'Newsmaker Bot'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages: [{
          role: 'user',
          content: `Translate this English text to Russian, maintaining markdown formatting:\n\n${testText}`
        }],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content;

    if (!translatedText) {
      throw new Error('No translation received from OpenRouter');
    }

    const duration = Date.now() - start;
    
    return {
      status: 'success',
      duration: `${duration}ms`,
      inputLength: testText.length,
      outputLength: translatedText.length,
      original: testText.substring(0, 100),
      translated: translatedText.substring(0, 100)
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Translation test failed: ${error.message}`
    };
  }
}

// Test Telegram functionality
async function testTelegram() {
  try {
    const testMessage = '🔧 Dashboard Test\n\nTesting Telegram connectivity from dashboard.';
    
    const start = Date.now();
    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHANNEL_ID,
        text: testMessage,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Telegram API error: ${errorData.description || response.status}`);
    }

    const data = await response.json();
    const duration = Date.now() - start;
    
    if (!data.ok) {
      throw new Error(`Telegram API returned error: ${data.description}`);
    }

    return {
      status: 'success',
      duration: `${duration}ms`,
      messageId: data.result.message_id,
      chatId: data.result.chat.id,
      chatTitle: data.result.chat.title
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Telegram test failed: ${error.message}`
    };
  }
}