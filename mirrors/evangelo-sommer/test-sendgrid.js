#!/usr/bin/env node
/**
 * SendGrid Email Test Script
 * Tests if SendGrid is properly configured and can send emails
 */

require('dotenv').config({ path: '.env.local' });
const sgMail = require('@sendgrid/mail');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (!SENDGRID_API_KEY) {
  console.error('❌ ERROR: SENDGRID_API_KEY not found in .env.local');
  process.exit(1);
}

// Remove quotes if present
const apiKey = SENDGRID_API_KEY.replace(/^["']|["']$/g, '');

if (!apiKey.startsWith('SG.')) {
  console.error('❌ ERROR: Invalid SendGrid API key format (should start with SG.)');
  console.error('   Found:', apiKey.substring(0, 10) + '...');
  process.exit(1);
}

console.log('✅ SendGrid API Key found:', apiKey.substring(0, 10) + '...');
console.log('');

sgMail.setApiKey(apiKey);

// Test email configuration
const testEmail = {
  to: 'support@evangelosommer.com', // Change this to your test email
  from: {
    email: 'sales@evangelosommer.com',
    name: 'Evangelo Sommer'
  },
  subject: 'SendGrid Test Email - ' + new Date().toISOString(),
  text: 'This is a test email to verify SendGrid configuration.',
  html: `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #D4AF37;">SendGrid Test Email</h2>
      <p>This email confirms that your SendGrid configuration is working correctly.</p>
      <p><strong>Test Details:</strong></p>
      <ul>
        <li>From: sales@evangelosommer.com</li>
        <li>Time: ${new Date().toLocaleString()}</li>
        <li>Purpose: Receipt email delivery test</li>
      </ul>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        If you received this email, your SendGrid setup is working!
      </p>
    </div>
  `
};

console.log('📧 Sending test email...');
console.log('   From:', testEmail.from.email);
console.log('   To:', testEmail.to);
console.log('');

sgMail
  .send(testEmail)
  .then((response) => {
    console.log('✅ SUCCESS! Email sent successfully');
    console.log('');
    console.log('Response Details:');
    console.log('  Status Code:', response[0].statusCode);
    console.log('  Message ID:', response[0].headers['x-message-id']);
    console.log('');
    console.log('✅ Next Steps:');
    console.log('  1. Check', testEmail.to, 'inbox');
    console.log('  2. Check spam folder if not in inbox');
    console.log('  3. If email arrived, SendGrid is working!');
    console.log('  4. If NOT arrived, verify sender in SendGrid dashboard');
    console.log('');
  })
  .catch((error) => {
    console.error('❌ ERROR sending email:');
    console.error('');

    if (error.response) {
      console.error('Status Code:', error.response.statusCode);
      console.error('Error Body:', JSON.stringify(error.response.body, null, 2));
      console.error('');

      // Specific error guidance
      if (error.response.body?.errors?.[0]?.message) {
        const errorMsg = error.response.body.errors[0].message;
        console.error('SendGrid Error:', errorMsg);
        console.error('');

        if (errorMsg.includes('sender identity')) {
          console.error('🔧 FIX: Verify sender email in SendGrid');
          console.error('   1. Go to: https://app.sendgrid.com/settings/sender_auth');
          console.error('   2. Click "Verify a Single Sender"');
          console.error('   3. Add: sales@evangelosommer.com');
          console.error('   4. Click verification link in email');
        } else if (errorMsg.includes('API key')) {
          console.error('🔧 FIX: Invalid API key');
          console.error('   1. Go to: https://app.sendgrid.com/settings/api_keys');
          console.error('   2. Create new API key with "Mail Send" permission');
          console.error('   3. Update SENDGRID_API_KEY in .env.local');
        }
      }
    } else {
      console.error('Error:', error.message);
    }

    console.error('');
    console.error('📖 See EMAIL_FIX_INSTRUCTIONS.md for detailed troubleshooting');
    process.exit(1);
  });
