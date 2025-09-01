import { createHash } from 'crypto';

export default async function handler(req, res) {
  const startTime = Date.now();
  const runId = generateRunId();
  
  // Enhanced logging function
  const log = (step, message, data = {}) => {
    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - startTime;
    console.log(`[${runId}] [${timestamp}] [${elapsed}ms] ${step}: ${message}`, data);
  };

  log('START', 'Daily report execution started', { 
    headers: Object.keys(req.headers), 
    method: req.method 
  });

  // 1. Проверка cron secret для безопасности
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    log('AUTH', 'Authorization failed - invalid secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  log('AUTH', 'Authorization successful');

  try {
    // 2. Получение markdown контента с GitHub
    log('FETCH', 'Fetching content from GitHub...');
    const mdContent = await fetchMarkdownContent();
    log('FETCH', 'Content fetched successfully', { 
      sourceLength: mdContent.length,
      sourcePreview: mdContent.substring(0, 100) + '...'
    });
    
    // 3. Проверка изменений контента
    log('HASH', 'Checking for content changes...');
    if (!hasContentChanged(mdContent)) {
      log('HASH', 'No changes detected - skipping report');
      return res.json({ 
        message: 'No changes detected',
        runId,
        duration: Date.now() - startTime
      });
    }
    log('HASH', 'Content changes detected - proceeding with report');
    
    // 4. Анализ и извлечение трендов через OpenRouter
    log('ANALYZE', 'Starting AI analysis and trend extraction...');
    const analysisStart = Date.now();
    const analyzedContent = await translateWithOpenRouter(mdContent);
    const analysisTime = Date.now() - analysisStart;
    log('ANALYZE', 'AI analysis completed', { 
      inputLength: mdContent.length,
      outputLength: analyzedContent.length,
      analysisTime: analysisTime,
      efficiency: `${((analyzedContent.length / mdContent.length) * 100).toFixed(1)}% compression`
    });
    
    // 5. Форматирование для Telegram  
    log('FORMAT', 'Formatting for Telegram...');
    const telegramText = formatForTelegram(analyzedContent);
    log('FORMAT', 'Formatting completed', { 
      finalLength: telegramText.length,
      withinLimit: telegramText.length <= 4096,
      charUtilization: `${((telegramText.length / 4096) * 100).toFixed(1)}%`
    });
    
    // 6. Отправка в Telegram канал
    log('SEND', 'Sending to Telegram channel...');
    const sendStart = Date.now();
    const sendResult = await sendToTelegram(telegramText);
    const sendTime = Date.now() - sendStart;
    log('SEND', 'Message sent successfully', { 
      messageId: sendResult?.message_id,
      sendTime: sendTime,
      channelId: process.env.TELEGRAM_CHANNEL_ID
    });
    
    // 7. Сохранение hash для следующей проверки
    await saveContentHash(mdContent);
    log('HASH', 'Content hash saved for next run');
    
    const totalTime = Date.now() - startTime;
    log('SUCCESS', 'Daily report completed successfully', {
      totalDuration: totalTime,
      stages: {
        fetch: 'completed',
        analyze: analysisTime,
        format: 'completed', 
        send: sendTime
      },
      metrics: {
        sourceChars: mdContent.length,
        finalChars: telegramText.length,
        compressionRatio: `${((telegramText.length / mdContent.length) * 100).toFixed(1)}%`
      }
    });
    
    return res.json({ 
      success: true, 
      message: 'Daily report sent successfully',
      runId,
      duration: totalTime,
      metrics: {
        sourceLength: mdContent.length,
        finalLength: telegramText.length,
        analysisTime: analysisTime,
        sendTime: sendTime
      }
    });
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    log('ERROR', 'Daily report failed', {
      error: error.message,
      stack: error.stack,
      duration: totalTime
    });
    
    console.error(`[${runId}] Full error details:`, error);
    
    return res.status(500).json({ 
      error: error.message,
      runId,
      duration: totalTime
    });
  }
}

// Generate unique run ID for tracking
function generateRunId() {
  return 'run_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Получение markdown контента с GitHub
async function fetchMarkdownContent() {
  const response = await fetch(process.env.GITHUB_RAW_URL);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.statusText}`);
  }
  
  return await response.text();
}

// Проверка изменений контента через hash
function hasContentChanged(newContent) {
  const newHash = createHash('sha256').update(newContent).digest('hex');
  const lastHash = process.env.LAST_CONTENT_HASH || '';
  
  return newHash !== lastHash;
}

// Сохранение hash контента (в продакшене можно использовать Vercel KV)
async function saveContentHash(content) {
  const hash = createHash('sha256').update(content).digest('hex');
  // В MVP просто логируем - в продакшене сохранить в KV или базу
  console.log('New content hash:', hash);
}

// Анализ и извлечение ключевых трендов через OpenRouter API
async function translateWithOpenRouter(content) {
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
    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// Форматирование для Telegram (минимальное, т.к. AI уже форматирует)
function formatForTelegram(text) {
  // AI уже возвращает текст в нужном формате
  // Просто убираем лишние пробелы и проверяем длину
  const formatted = text.trim();
  
  // Проверка длины для безопасности
  if (formatted.length > 4096) {
    console.warn('Message exceeds 4096 chars, truncating...');
    return formatted.substring(0, 4000) + '\n\n... [обрезано]';
  }
  
  return formatted;
}



// Отправка одного сообщения в Telegram
async function sendToTelegram(text) {
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
    const errorText = await response.text();
    throw new Error(`Telegram API error: ${errorText}`);
  }
  
  const result = await response.json();
  console.log('Message sent successfully!', { messageId: result.result?.message_id });
  
  return result.result; // Return the message result for logging
}