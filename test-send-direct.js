// Direct test sending to Telegram without readline
import { config } from 'dotenv';
config({ path: '.env.local' });

async function testSendDirect() {
  console.log('🚀 Sending new format directly to Telegram...\n');
  
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
    console.log('📱 MESSAGE TO SEND:');
    console.log('=' .repeat(50));
    console.log(analyzed);
    console.log('=' .repeat(50));
    console.log(`\n📏 Message length: ${analyzed.length} characters`);
    
    // 4. Send to Telegram
    console.log('\n📤 Sending to Telegram channel...');
    await sendToTelegram(analyzed);
    console.log('✅ SENT SUCCESSFULLY to channel:', process.env.TELEGRAM_CHANNEL_ID);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('Telegram')) {
      console.error('Full error:', error);
    }
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
    const errorData = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

async function sendToTelegram(text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  
  console.log(`   Using bot token: ${botToken.substring(0, 10)}...`);
  console.log(`   Sending to channel: ${channelId}`);
  
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    }
  );
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Telegram API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }
  
  const result = await response.json();
  console.log(`   Message ID: ${result.result.message_id}`);
  return result;
}

// Run the test
testSendDirect();