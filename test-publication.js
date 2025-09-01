// Test publication to Telegram channel
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createHash } from 'crypto';

// Import the handler function (copying the logic for testing)
async function testPublication() {
  console.log('🚀 Testing publication to channel:', process.env.TELEGRAM_CHANNEL_ID);
  
  try {
    // 1. Fetch content
    console.log('1️⃣ Fetching content...');
    const mdContent = await fetchMarkdownContent();
    console.log(`   ✅ Fetched ${mdContent.length} characters`);
    
    // 2. Check if content changed (force it for testing)
    console.log('2️⃣ Checking changes (forced for test)...');
    
    // 3. Translate content
    console.log('3️⃣ Translating content...');
    const translatedContent = await translateWithOpenRouter(mdContent);
    console.log(`   ✅ Translated to ${translatedContent.length} characters`);
    
    // 4. Format for Telegram
    console.log('4️⃣ Formatting for Telegram...');
    const telegramText = formatForTelegram(translatedContent);
    console.log(`   ✅ Formatted to ${telegramText.length} characters`);
    
    // 5. Send to Telegram
    console.log('5️⃣ Sending to Telegram...');
    await sendToTelegram(telegramText);
    console.log('   ✅ Sent successfully!');
    
    console.log('\n✅ TEST COMPLETED SUCCESSFULLY!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Copy functions from daily-report.js
async function fetchMarkdownContent() {
  const response = await fetch(process.env.GITHUB_RAW_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.statusText}`);
  }
  return await response.text();
}

async function translateWithOpenRouter(markdownContent) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/newsmaker-bot',
      'X-Title': 'Reddit AI Trends Bot'
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-chat',
      messages: [{
        role: 'system',
        content: `Ты переводчик технических новостей об AI. Переведи этот отчет с английского на русский, сохраняя:
- Структуру markdown
- Ссылки и форматирование
- Технические термины (но объясняй сложные)
- Профессиональный но живой тон`
      }, {
        role: 'user',
        content: markdownContent
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function formatForTelegram(markdownText) {
  return markdownText
    .replace(/### (.*)/g, '<b>$1</b>')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

async function sendToTelegram(text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  
  const chunks = splitIntoChunks(text, 4000);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    const payload = {
      chat_id: channelId,
      text: chunk,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    };

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Telegram API error: ${response.status} - ${errorData.description || response.statusText}`);
    }

    console.log(`   📤 Part ${i + 1}/${chunks.length} sent`);
    
    // Rate limiting
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

function splitIntoChunks(text, maxLength = 4000) {
  if (text.length <= maxLength) return [text];
  
  const chunks = [];
  let currentChunk = '';
  const lines = text.split('\n');
  
  for (const line of lines) {
    if ((currentChunk + line + '\n').length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = line + '\n';
      } else {
        chunks.push(line.substring(0, maxLength));
        currentChunk = line.substring(maxLength) + '\n';
      }
    } else {
      currentChunk += line + '\n';
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Run the test
testPublication();