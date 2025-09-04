// Edge Function configuration
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const startTime = Date.now();
  const runId = generateRunId();
  
  // Enhanced logging function
  const log = (step, message, data = {}) => {
    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - startTime;
    console.log(`[${runId}] [MANUAL] [${timestamp}] [${elapsed}ms] ${step}: ${message}`, data);
  };

  log('START', 'Manual trigger execution started', { 
    headers: Array.from(request.headers.keys()), 
    method: request.method 
  });

  // Security check
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    log('AUTH_FAILED', 'Unauthorized access attempt');
    return Response.json({ 
      success: false, 
      error: 'Unauthorized' 
    }, { status: 401 });
  }

  try {
    log('EXECUTE', 'Starting bot execution via manual trigger');
    
    // 1. Fetch markdown content from GitHub
    log('FETCH', 'Fetching content from GitHub...');
    const mdContent = await fetchMarkdownContent();
    log('FETCH', 'Content fetched successfully', { 
      sourceLength: mdContent.length,
      sourcePreview: mdContent.substring(0, 100) + '...'
    });
    
    // 2. Check for content changes (skip for manual trigger)
    log('HASH', 'Manual trigger - skipping content change check');
    
    // 3. Analyze and translate with OpenRouter
    log('ANALYZE', 'Starting AI analysis and trend extraction...');
    const analysisStart = Date.now();
    const analyzedContent = await translateWithOpenRouter(mdContent);
    const analysisTime = Date.now() - analysisStart;
    log('ANALYZE', 'AI analysis completed', { 
      inputLength: mdContent.length,
      outputLength: analyzedContent.length,
      analysisTime: analysisTime
    });
    
    // 4. Format for Telegram  
    log('FORMAT', 'Formatting for Telegram...');
    const telegramText = formatForTelegram(analyzedContent);
    log('FORMAT', 'Formatting completed', { 
      finalLength: telegramText.length,
      withinLimit: telegramText.length <= 4096
    });
    
    // 5. Send to Telegram channel
    log('SEND', 'Sending to Telegram channel...');
    const sendStart = Date.now();
    const sendResult = await sendToTelegram(telegramText);
    const sendTime = Date.now() - sendStart;
    log('SEND', 'Message sent successfully', { 
      messageId: sendResult?.message_id,
      sendTime: sendTime
    });
    
    const totalTime = Date.now() - startTime;
    log('SUCCESS', 'Manual execution completed successfully', {
      totalDuration: totalTime,
      messageId: sendResult?.message_id
    });
    
    return Response.json({
      success: true,
      message: 'Bot executed successfully via manual trigger',
      data: {
        runId: runId,
        executionTime: totalTime,
        messageId: sendResult?.message_id,
        metrics: {
          sourceLength: mdContent.length,
          finalLength: telegramText.length,
          analysisTime: analysisTime,
          sendTime: sendTime
        }
      }
    });
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    log('ERROR', 'Manual execution failed', {
      error: error.message,
      duration: totalTime
    });
    
    console.error(`[${runId}] Manual trigger error:`, error);
    
    return Response.json({
      success: false,
      error: `Manual execution failed: ${error.message}`,
      data: {
        runId: runId,
        executionTime: totalTime
      }
    }, { status: 500 });
  }
}

// Generate unique run ID for tracking
function generateRunId() {
  return 'manual_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Fetch markdown content from GitHub
async function fetchMarkdownContent() {
  if (!process.env.GITHUB_RAW_URL) {
    throw new Error('GITHUB_RAW_URL not configured');
  }
  
  const response = await fetch(process.env.GITHUB_RAW_URL);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
  }
  
  return await response.text();
}

// Analyze and extract key trends via OpenRouter API
async function translateWithOpenRouter(content) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }
  
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
        content: `Ты - AI аналитик и UX-писатель для Telegram канала о трендах AI.
                  Твоя задача - создать ОДНО краткое сообщение (макс 3500 символов) на русском языке.
                  
                  ФОРМАТ СООБЩЕНИЯ:
                  
                  🔥 AI Тренды Reddit | [дата в формате DD.MM.YYYY]
                  
                  📊 ГЛАВНОЕ СЕГОДНЯ:
                  • [Ключевая тема 1 - одна строка]
                  • [Ключевая тема 2 - одна строка]
                  • [Ключевая тема 3 - одна строка]
                  
                  🏆 ТОП-5 ТРЕНДОВ:
                  
                  1. [Emoji] [Краткий заголовок]
                     → [Одно предложение: почему это важно и какое влияние]
                  
                  2. [Emoji] [Краткий заголовок]
                     → [Одно предложение: почему это важно и какое влияние]
                  
                  [И так далее для топ-5]
                  
                  💡 Полный отчет: github.com/liyedanpdx/reddit-ai-trends
                  
                  ПРАВИЛА:
                  - Выбери 5 САМЫХ важных трендов по критериям: score, comments, потенциальное влияние
                  - Используй эмодзи: 🚀 (прорыв), 💰 (экономика/UBI), 🤖 (новая модель), 🎨 (генеративное AI), 🔥 (горячая тема), 💬 (дискуссия), ⚡ (производительность), 🧪 (исследование)
                  - Заголовки макс 50 символов
                  - Инсайты должны объяснять ПОЧЕМУ это важно, а не ЧТО произошло
                  - Технические термины оставляй на английском (LLM, GPU, MoE, и т.д.)
                  - Пиши живым языком, избегай канцелярита
                  - НЕ включай ссылки на Reddit посты
                  - НЕ указывай точные scores и количество комментариев`
      }, {
        role: 'user',
        content: content
      }],
      temperature: 0.3,
      max_tokens: 4000
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error || response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('No content received from OpenRouter API');
  }
  
  return data.choices[0].message.content;
}

// Format for Telegram (minimal as AI already formats)
function formatForTelegram(text) {
  const formatted = text.trim();
  
  if (formatted.length > 4096) {
    console.warn('Message exceeds 4096 chars, truncating...');
    return formatted.substring(0, 4000) + '\n\n... [обрезано]';
  }
  
  return formatted;
}

// Send message to Telegram
async function sendToTelegram(text) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHANNEL_ID) {
    throw new Error('Telegram credentials not configured');
  }
  
  const response = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHANNEL_ID,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    }
  );
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Telegram API error: ${response.status} - ${errorData.description || response.statusText}`);
  }
  
  const result = await response.json();
  
  if (!result.ok) {
    throw new Error(`Telegram API returned error: ${result.description}`);
  }
  
  return result.result;
}