// Quick test of status API locally
import { config } from 'dotenv';
config({ path: '.env.local' });

console.log('🧪 Testing status API functionality...\n');

// Test Telegram bot check
async function testTelegramBot() {
  console.log('📱 Testing Telegram bot connectivity...');
  try {
    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`);
    const data = await response.json();
    
    if (data.ok) {
      console.log(`✅ Bot connected: @${data.result.username}`);
      return true;
    } else {
      console.log(`❌ Bot error: ${data.description}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Bot connection failed: ${error.message}`);
    return false;
  }
}

// Test OpenRouter
async function testOpenRouter() {
  console.log('🤖 Testing OpenRouter API...');
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ OpenRouter connected: ${data.data.length} models available`);
      return true;
    } else {
      console.log(`❌ OpenRouter error: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ OpenRouter failed: ${error.message}`);
    return false;
  }
}

// Test GitHub source
async function testGitHub() {
  console.log('📁 Testing GitHub source...');
  try {
    const response = await fetch(process.env.GITHUB_RAW_URL, { method: 'HEAD' });
    
    if (response.ok) {
      const size = response.headers.get('content-length');
      console.log(`✅ GitHub source accessible: ${Math.round(size/1024)}KB`);
      return true;
    } else {
      console.log(`❌ GitHub error: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ GitHub failed: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Environment check:');
  console.log(`- TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '✅' : '❌'}`);
  console.log(`- TELEGRAM_CHANNEL_ID: ${process.env.TELEGRAM_CHANNEL_ID ? '✅' : '❌'}`);
  console.log(`- OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? '✅' : '❌'}`);
  console.log(`- GITHUB_RAW_URL: ${process.env.GITHUB_RAW_URL ? '✅' : '❌'}\n`);

  const results = await Promise.all([
    testTelegramBot(),
    testOpenRouter(), 
    testGitHub()
  ]);

  const allPass = results.every(r => r);
  console.log(`\n🎯 Overall status: ${allPass ? '✅ All systems operational' : '⚠️ Some issues detected'}`);
  
  if (allPass) {
    console.log('\n🚀 Dashboard should work correctly on Vercel!');
  } else {
    console.log('\n⚠️ Fix the issues above before deploying dashboard');
  }
}

runTests();