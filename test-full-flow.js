// Тест полного флоу обновленной архитектуры (без отправки в Telegram)
import 'dotenv/config';
import { createHash } from 'crypto';

const GITHUB_RAW_URL = process.env.GITHUB_RAW_URL || 'https://raw.githubusercontent.com/liyedanpdx/reddit-ai-trends/main/reports/latest_report_en.md';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';

// Копии функций из daily-report.js для тестирования
async function fetchMarkdownContent() {
  const response = await fetch(GITHUB_RAW_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.statusText}`);
  }
  return await response.text();
}

function hasContentChanged(newContent) {
  const newHash = createHash('sha256').update(newContent).digest('hex');
  const lastHash = process.env.LAST_CONTENT_HASH || '';
  return newHash !== lastHash;
}

async function translateWithOpenRouter(content) {
  // Берем только первую часть для экономии токенов
  const firstPart = content.split('\n').slice(0, 25).join('\n');
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/reddit-ai-trends-bot',
      'X-Title': 'Reddit AI Trends Bot'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{
        role: 'system',
        content: `Ты - технический переводчик. Переведи следующий отчет о трендах AI на русский язык.
                  Сохрани ВСЕ технические термины, названия проектов и компаний на английском.
                  ПРЕОБРАЗУЙ таблицы в читаемые списки.
                  Адаптируй текст для русскоязычных разработчиков.
                  НЕ добавляй своих комментариев.`
      }, {
        role: 'user',
        content: firstPart
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

function formatForTelegram(text) {
  return text
    .replace(/^# (.+)$/gm, '<b>$1</b>')  // Главные заголовки
    .replace(/^## (.+)$/gm, '<b>$1</b>') // Подзаголовки  
    .trim();
}

function splitTextByLength(text, maxLength = 4096) {
  if (text.length <= maxLength) {
    return [text];
  }
  
  const chunks = [];
  let currentChunk = '';
  
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (currentChunk.length + line.length + 1 <= maxLength) {
      currentChunk += (currentChunk ? '\n' : '') + line;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = line;
      } else {
        chunks.push(line.substring(0, maxLength));
        currentChunk = line.substring(maxLength);
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

// Основной тест
async function testFullFlow() {
  console.log('🧪 Тестирование полного флоу обновленной архитектуры...\n');
  
  try {
    console.log('1️⃣ Загружаем контент с GitHub...');
    const mdContent = await fetchMarkdownContent();
    console.log(`   ✅ Загружено ${mdContent.length} символов\n`);
    
    console.log('2️⃣ Проверяем изменения...');
    const hasChanged = hasContentChanged(mdContent);
    console.log(`   ${hasChanged ? '✅ Контент изменился' : '⚠️ Контент не изменился'}\n`);
    
    console.log('3️⃣ Переводим через OpenRouter...');
    const translatedContent = await translateWithOpenRouter(mdContent);
    console.log(`   ✅ Переведено в ${translatedContent.length} символов\n`);
    
    console.log('4️⃣ Форматируем для Telegram...');
    const telegramText = formatForTelegram(translatedContent);
    console.log(`   ✅ Отформатировано в ${telegramText.length} символов\n`);
    
    console.log('5️⃣ Разбиваем на части...');
    const chunks = splitTextByLength(telegramText, 4096);
    console.log(`   ✅ Разбито на ${chunks.length} частей\n`);
    
    console.log('📊 РЕЗУЛЬТАТ:');
    console.log('=' + '='.repeat(50));
    chunks.forEach((chunk, i) => {
      const message = chunks.length > 1 
        ? `📊 <b>AI Тренды Reddit [Часть ${i+1}/${chunks.length}]</b>\n\n${chunk}`
        : `📊 <b>AI Тренды Reddit</b>\n\n${chunk}`;
      
      console.log(`\n🔹 Часть ${i+1} (${message.length} символов):`);
      console.log(message.substring(0, 500) + (message.length > 500 ? '\n...\n[ОБРЕЗАНО]' : ''));
      console.log('-'.repeat(30));
    });
    
    console.log('\n✅ ТЕСТ УСПЕШНО ЗАВЕРШЕН!');
    console.log('🎯 Архитектура работает корректно');
    console.log('📱 Готово для отправки в Telegram');
    
  } catch (error) {
    console.error('❌ Ошибка в тесте:', error.message);
    process.exit(1);
  }
}

testFullFlow();