// Test sending the new format to Telegram
import { config } from 'dotenv';
config({ path: '.env.local' });
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function testSendNew() {
  console.log('🚀 Testing new format with actual Telegram sending...\n');
  
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
    
    // 3. Display preview
    console.log('📱 PREVIEW:');
    console.log('=' .repeat(50));
    console.log(analyzed);
    console.log('=' .repeat(50));
    console.log(`\n📏 Message length: ${analyzed.length} characters`);
    
    // 4. Ask for confirmation
    rl.question('\n💬 Send to Telegram channel? (y/n): ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        console.log('\n📤 Sending to Telegram...');
        await sendToTelegram(analyzed);
        console.log('✅ Sent successfully!');
      } else {
        console.log('❌ Cancelled');
      }
      rl.close();
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
  }
}

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
}

// Run the test
testSendNew();