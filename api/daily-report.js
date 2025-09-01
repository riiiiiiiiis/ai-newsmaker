import { createHash } from 'crypto';

export default async function handler(req, res) {
  // 1. Проверка cron secret для безопасности
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 2. Получение markdown контента с GitHub
    const mdContent = await fetchMarkdownContent();
    
    // 3. Проверка изменений контента
    if (!hasContentChanged(mdContent)) {
      return res.json({ message: 'No changes detected' });
    }
    
    // 4. Перевод контента через OpenRouter
    const translatedContent = await translateWithOpenRouter(mdContent);
    
    // 5. Простое форматирование для Telegram  
    const telegramText = formatForTelegram(translatedContent);
    
    // 6. Отправка в Telegram канал
    await sendToTelegram(telegramText);
    
    // 7. Сохранение hash для следующей проверки
    await saveContentHash(mdContent);
    
    return res.json({ success: true, message: 'Daily report sent successfully' });
    
  } catch (error) {
    console.error('Error in daily report:', error);
    return res.status(500).json({ error: error.message });
  }
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
  
  console.log('Message sent successfully!');
}