// Простой тест конвертации Markdown в HTML для Telegram
import 'dotenv/config';
import { marked } from 'marked';

const GITHUB_RAW_URL = process.env.GITHUB_RAW_URL || 'https://raw.githubusercontent.com/liyedanpdx/reddit-ai-trends/main/reports/latest_report_en.md';

// Функция для конвертации в Telegram HTML (упрощенная версия из основного кода)
function convertToTelegramHtml(markdown) {
  const renderer = new marked.Renderer();
  
  // Telegram поддерживает только: <b>, <i>, <u>, <s>, <code>, <pre>, <a>
  renderer.strong = (text) => `<b>${text}</b>`;
  renderer.em = (text) => `<i>${text}</i>`;
  renderer.link = (href, title, text) => `<a href="${href}">${text}</a>`;
  renderer.code = (code) => `<code>${escapeHtml(code)}</code>`;
  renderer.codespan = (code) => `<code>${escapeHtml(code)}</code>`;
  renderer.heading = (text, level) => `<b>${text}</b>\n\n`;
  renderer.paragraph = (text) => `${text}\n\n`;
  renderer.listitem = (text) => `• ${text}\n`;
  
  let html = marked(markdown, { renderer });
  
  // Очищаем от неподдерживаемых тегов и лишних переносов
  html = html
    .replace(/\n\n/g, '\n')
    .trim();
  
  return html;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

console.log('🔍 Тестируем конвертацию Markdown в Telegram HTML...');

try {
  const response = await fetch(GITHUB_RAW_URL);
  const content = await response.text();
  
  // Берем только первую часть для тестирования
  const firstPart = content.split('\n').slice(0, 30).join('\n');
  
  console.log('📝 Исходный Markdown (первые 30 строк):');
  console.log('=' + '='.repeat(50));
  console.log(firstPart);
  console.log('=' + '='.repeat(50));
  
  const telegramHtml = convertToTelegramHtml(firstPart);
  
  console.log('🤖 Конвертированный HTML для Telegram:');
  console.log('=' + '='.repeat(50));
  console.log(telegramHtml);
  console.log('=' + '='.repeat(50));
  
  console.log('📊 Статистика:');
  console.log('  - Исходный размер:', firstPart.length, 'символов');
  console.log('  - HTML размер:', telegramHtml.length, 'символов');
  console.log('  - Лимит Telegram: 4096 символов');
  console.log('  - В пределах лимита:', telegramHtml.length <= 4096 ? '✅ ДА' : '❌ НЕТ, нужна разбивка');
  
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
}