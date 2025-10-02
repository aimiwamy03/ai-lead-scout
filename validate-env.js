/**
 * Simple environment validation script
 * Run with: node validate-env.js
 */

const fs = require('fs');
const path = require('path');

// Load .env file if it exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const required = [
  'AIRTABLE_PAT',
  'AIRTABLE_BASE_ID',
  'SLACK_WEBHOOK_URL',
  'SENDGRID_API_KEY',
  'SEND_FROM_EMAIL',
  'CALENDLY_LINK',
];

const optional = [
  'VERCEL_URL',
  'TEST_EMAIL',
  'WTP_INVESTOR_WHITELIST',
];

console.log('🔍 Validating Environment Configuration...\n');

let hasErrors = false;
let hasWarnings = false;

// Check required variables
console.log('Required Variables:');
required.forEach((key) => {
  const value = process.env[key];
  if (!value || value.includes('your_') || value.includes('YOUR')) {
    console.log(`  ❌ ${key}: Missing or not configured`);
    hasErrors = true;
  } else {
    // Mask sensitive values
    const masked = value.substring(0, 8) + '***';
    console.log(`  ✅ ${key}: ${masked}`);
  }
});

console.log('\nOptional Variables:');
optional.forEach((key) => {
  const value = process.env[key];
  if (!value) {
    console.log(`  ⚠️  ${key}: Not set (optional)`);
    hasWarnings = true;
  } else {
    console.log(`  ✅ ${key}: Set`);
  }
});

// Validate specific formats
console.log('\nFormat Validation:');

// Airtable Base ID
const baseId = process.env.AIRTABLE_BASE_ID;
if (baseId && !baseId.startsWith('app')) {
  console.log('  ❌ AIRTABLE_BASE_ID should start with "app"');
  hasErrors = true;
} else if (baseId && baseId.startsWith('app')) {
  console.log('  ✅ AIRTABLE_BASE_ID format looks good');
}

// Slack Webhook
const slackUrl = process.env.SLACK_WEBHOOK_URL;
if (slackUrl && !slackUrl.startsWith('https://hooks.slack.com/')) {
  console.log('  ❌ SLACK_WEBHOOK_URL should start with "https://hooks.slack.com/"');
  hasErrors = true;
} else if (slackUrl && slackUrl.startsWith('https://hooks.slack.com/')) {
  console.log('  ✅ SLACK_WEBHOOK_URL format looks good');
}

// SendGrid Key
const sgKey = process.env.SENDGRID_API_KEY;
if (sgKey && !sgKey.startsWith('SG.')) {
  console.log('  ⚠️  SENDGRID_API_KEY should start with "SG."');
  hasWarnings = true;
} else if (sgKey && sgKey.startsWith('SG.')) {
  console.log('  ✅ SENDGRID_API_KEY format looks good');
}

// Email format
const fromEmail = process.env.SEND_FROM_EMAIL;
if (fromEmail && !fromEmail.includes('@')) {
  console.log('  ❌ SEND_FROM_EMAIL should be a valid email address');
  hasErrors = true;
} else if (fromEmail && fromEmail.includes('@')) {
  console.log('  ✅ SEND_FROM_EMAIL format looks good');
}

// Calendly URL
const calendly = process.env.CALENDLY_LINK;
if (calendly && !calendly.startsWith('https://calendly.com/')) {
  console.log('  ⚠️  CALENDLY_LINK should start with "https://calendly.com/"');
  hasWarnings = true;
} else if (calendly && calendly.startsWith('https://calendly.com/')) {
  console.log('  ✅ CALENDLY_LINK format looks good');
}

// Summary
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.log('❌ Configuration has errors. Please fix the issues above.');
  console.log('   See SETUP.md for detailed instructions.');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  Configuration is valid but has warnings.');
  console.log('   Optional variables can be added for enhanced functionality.');
  process.exit(0);
} else {
  console.log('✅ Configuration looks good! You\'re ready to run the app.');
  console.log('\nNext steps:');
  console.log('  1. Run: npm run dev');
  console.log('  2. Test: curl http://localhost:3000/api/healthz');
  console.log('  3. Ingest: curl -X POST http://localhost:3000/api/ingest');
  process.exit(0);
}

