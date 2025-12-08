#!/usr/bin/env node
// Password hashing utility for generating bcrypt hashes
// Usage: node scripts/hash-password.js

const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('\n🔐 Password Hash Generator\n');
console.log('This tool generates a bcrypt hash for your admin password.');
console.log('Add the generated hash to your .env file as ADMIN_PASSWORD_HASH\n');

rl.question('Enter the password to hash: ', async (password) => {
  if (!password || password.trim().length === 0) {
    console.log('❌ Error: Password cannot be empty');
    rl.close();
    return;
  }

  if (password.length < 8) {
    console.log('⚠️  Warning: Password is less than 8 characters. Consider using a stronger password.');
  }

  try {
    console.log('\n⏳ Generating hash (this may take a moment)...\n');

    // Use cost factor of 12 for good security/performance balance
    const saltRounds = 12;
    const hash = await bcrypt.hash(password, saltRounds);

    console.log('✅ Hash generated successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Add this line to your .env.local file:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`ADMIN_PASSWORD_HASH=${hash}`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT:');
    console.log('1. Remove or comment out the old ADMIN_PASSWORD line');
    console.log('2. Keep this hash secret and never commit it to git');
    console.log('3. In production, add ADMIN_PASSWORD_HASH to your Vercel environment variables');
    console.log('4. Restart your development server after updating .env.local\n');
  } catch (error) {
    console.error('❌ Error generating hash:', error.message);
  }

  rl.close();
});

rl.on('close', () => {
  console.log('👋 Done!\n');
  process.exit(0);
});
