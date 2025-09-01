// Test the new single-message format
import { config } from 'dotenv';
config({ path: '.env.local' });

// Test the translation/analysis function with sample data
async function testNewFormat() {
  console.log('🧪 Testing new single-message format...\n');
  
  try {
    // 1. Fetch content
    console.log('1️⃣ Fetching Reddit trends...');
    const response = await fetch(process.env.GITHUB_RAW_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    const content = await response.text();
    console.log(`   ✅ Fetched ${content.length} characters\n`);
    
    // 2. Extract and analyze trends
    console.log('2️⃣ Analyzing and extracting top trends...');
    const analyzed = await analyzeContent(content);
    console.log(`   ✅ Generated ${analyzed.length} characters\n`);
    
    // 3. Format for Telegram
    console.log('3️⃣ Formatting for Telegram...');
    const formatted = formatForTelegram(analyzed);
    console.log(`   ✅ Final message: ${formatted.length} characters\n`);
    
    // 4. Check if fits in one message
    if (formatted.length <= 4096) {
      console.log('✅ SUCCESS: Message fits in single Telegram message!\n');
    } else {
      console.log(`⚠️  WARNING: Message is ${formatted.length} chars (exceeds 4096 limit)\n`);
    }
    
    // 5. Display the message
    console.log('📱 PREVIEW OF TELEGRAM MESSAGE:');
    console.log('=' .repeat(50));
    console.log(formatted);
    console.log('=' .repeat(50));
    
    // 6. Optional: Send to Telegram
    console.log('\n💬 Send to Telegram? (y/n)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Analyze content function (same as in daily-report.js)
async function analyzeContent(content) {
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

// Format for Telegram (minimal, as AI already formats)
function formatForTelegram(text) {
  const formatted = text.trim();
  
  if (formatted.length > 4096) {
    console.warn('Message exceeds 4096 chars, truncating...');
    return formatted.substring(0, 4000) + '\n\n... [обрезано]';
  }
  
  return formatted;
}

// Run the test
testNewFormat();