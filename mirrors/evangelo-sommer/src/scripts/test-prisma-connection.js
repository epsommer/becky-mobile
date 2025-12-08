#!/usr/bin/env node
/**
 * Test script to verify Prisma client initialization and database connection
 * Run with: node src/scripts/test-prisma-connection.js
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.join(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log('✓ Environment variables loaded from .env.local');
} else {
  console.error('✗ .env.local file not found');
  process.exit(1);
}

// Test environment configuration
console.log('\n=== Environment Configuration ===');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ Set' : '✗ Not set');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');

async function testPrismaConnection() {
  try {
    console.log('\n=== Testing Prisma Connection ===');
    
    // Import Prisma client
    const { PrismaClient } = require('@prisma/client');
    console.log('✓ Prisma client imported successfully');
    
    // Create client instance
    const prisma = new PrismaClient({
      log: ['error', 'warn', 'info'],
    });
    console.log('✓ Prisma client instance created');
    
    // Test connection
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('✓ Database connection successful');
    
    // Test a simple query
    console.log('Testing basic query...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✓ Basic query successful:', result);
    
    // Test schema introspection
    console.log('Testing schema introspection...');
    const tables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name;
    `;
    console.log('✓ Schema introspection successful');
    console.log('Tables found:', tables.map(t => t.name).join(', '));
    
    // Test client record model
    console.log('Testing ClientRecord model...');
    const clientCount = await prisma.clientRecord.count();
    console.log(`✓ ClientRecord model working - found ${clientCount} clients`);
    
    // Test follow-up model
    console.log('Testing FollowUp model...');
    const followUpCount = await prisma.followUp.count();
    console.log(`✓ FollowUp model working - found ${followUpCount} follow-ups`);
    
    // Disconnect
    await prisma.$disconnect();
    console.log('✓ Database connection closed');
    
    console.log('\n🎉 All tests passed! Prisma connection is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Prisma connection test failed:');
    console.error('Error:', error.message);
    
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    
    if (error.meta) {
      console.error('Error Meta:', error.meta);
    }
    
    // Common error scenarios
    if (error.message.includes('ENOENT')) {
      console.error('\n💡 Solution: The database file might not exist. Run: npm run db:push');
    } else if (error.message.includes('Environment variable not found')) {
      console.error('\n💡 Solution: Make sure DATABASE_URL is set in .env.local');
    } else if (error.message.includes('Schema engine')) {
      console.error('\n💡 Solution: Try running: npm run db:generate');
    }
    
    process.exit(1);
  }
}

async function testOurUtility() {
  try {
    console.log('\n=== Testing Our Prisma Utility ===');
    
    // Test our utility functions
    const { getPrismaClient, isPrismaAvailable } = require('../lib/prisma');
    console.log('✓ Prisma utility imported successfully');
    
    const isAvailable = isPrismaAvailable();
    console.log('✓ isPrismaAvailable():', isAvailable);
    
    const client = getPrismaClient();
    console.log('✓ getPrismaClient():', client ? 'Client returned' : 'No client returned');
    
    if (client) {
      // Test a query using our utility
      const result = await client.$queryRaw`SELECT 1 as test`;
      console.log('✓ Query using utility successful:', result);
    }
    
    console.log('\n🎉 Prisma utility tests passed!');
    
  } catch (error) {
    console.error('\n❌ Prisma utility test failed:');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run tests
async function main() {
  console.log('🚀 Starting Prisma Connection Tests\n');
  
  await testPrismaConnection();
  await testOurUtility();
  
  console.log('\n✅ All tests completed successfully!');
  console.log('\nYour Prisma setup is ready for the API routes.');
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
main().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});