// Тест реального перевода через OpenRouter API
import 'dotenv/config';

const GITHUB_RAW_URL = process.env.GITHUB_RAW_URL || 'https://raw.githubusercontent.com/liyedanpdx/reddit-ai-trends/main/reports/latest_report_en.md';

// Реальный OpenRouter API ключ для теста
const OPENROUTER_API_KEY = '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';

async function testTranslation() {
  try {
    console.log('🔍 Загружаем контент с GitHub...');
    const response = await fetch(GITHUB_RAW_URL);
    const content = await response.text();
    
    // Берем первую часть для экономии токенов
    const firstPart = content.split('\n').slice(0, 20).join('\n');
    
    console.log('📝 Исходный контент (первые 20 строк):');
    console.log('=' + '='.repeat(50));
    console.log(firstPart);
    console.log('=' + '='.repeat(50));
    
    console.log('🔄 Отправляем на перевод в OpenRouter...');
    console.log('⚠️  Нужен реальный API ключ для тестирования');
    
    // API ключ предоставлен, продолжаем тест
    
    const translationResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/reddit-ai-trends-bot',
        'X-Title': 'Reddit AI Trends Bot Test'
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
    
    if (!translationResponse.ok) {
      throw new Error(`OpenRouter API error: ${translationResponse.statusText}`);
    }
    
    const data = await translationResponse.json();
    const translatedText = data.choices[0].message.content;
    
    console.log('✅ Переведенный текст:');
    console.log('=' + '='.repeat(50));
    console.log(translatedText);
    console.log('=' + '='.repeat(50));
    
    console.log('📊 Статистика:');
    console.log('  - Исходный размер:', firstPart.length, 'символов');
    console.log('  - Переведенный размер:', translatedText.length, 'символов'); 
    console.log('  - Лимит Telegram:', 4096, 'символов');
    console.log('  - В пределах лимита:', translatedText.length <= 4096 ? '✅ ДА' : '❌ НЕТ');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

console.log('🧪 Тестирование реального перевода через OpenRouter...');
testTranslation();