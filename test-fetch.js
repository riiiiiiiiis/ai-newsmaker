// Простой тест загрузки данных с GitHub
import 'dotenv/config';

const GITHUB_RAW_URL = process.env.GITHUB_RAW_URL || 'https://raw.githubusercontent.com/liyedanpdx/reddit-ai-trends/main/reports/latest_report_en.md';

console.log('🔍 Тестируем загрузку данных с GitHub...');
console.log('📎 URL:', GITHUB_RAW_URL);

try {
  const response = await fetch(GITHUB_RAW_URL);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const content = await response.text();
  
  console.log('✅ Успешно загружено!');
  console.log('📊 Размер контента:', content.length, 'символов');
  console.log('🔤 Первые 500 символов:');
  console.log('=' + '='.repeat(50));
  console.log(content.substring(0, 500) + (content.length > 500 ? '...' : ''));
  console.log('=' + '='.repeat(50));
  
  // Проверим структуру markdown
  const lines = content.split('\n');
  const headerLines = lines.filter(line => line.startsWith('#'));
  
  console.log('📋 Найдено заголовков:', headerLines.length);
  console.log('📝 Заголовки:');
  headerLines.slice(0, 5).forEach(header => {
    console.log('  ' + header.substring(0, 80));
  });
  
  if (headerLines.length > 5) {
    console.log(`  ... и ещё ${headerLines.length - 5} заголовков`);
  }
  
} catch (error) {
  console.error('❌ Ошибка при загрузке:', error.message);
  process.exit(1);
}