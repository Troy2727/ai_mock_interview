/**
 * This script generates a formatted version of your environment variables
 * that can be easily copied and pasted into Vercel's environment variables section.
 * 
 * Run with: node scripts/generate-vercel-env.js
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Filter for variables we want to include in Vercel
const vercelEnvVars = Object.entries(envConfig)
  .filter(([key]) => 
    key.startsWith('NEXT_PUBLIC_') || 
    key.startsWith('FIREBASE_') ||
    key === 'GOOGLE_GENERATIVE_AI_API_KEY'
  )
  .reduce((acc, [key, value]) => {
    // Format the value properly for Vercel
    acc[key] = value;
    return acc;
  }, {});

// Generate formatted output
console.log('\n=== Vercel Environment Variables ===\n');
console.log('Copy and paste these into your Vercel project settings:\n');

Object.entries(vercelEnvVars).forEach(([key, value]) => {
  // Ensure the value is properly quoted
  const formattedValue = value.includes('"') ? value : `"${value}"`;
  console.log(`${key}=${formattedValue}`);
});

console.log('\n=== End of Vercel Environment Variables ===\n');
console.log('Remember to update NEXT_PUBLIC_BASE_URL to your Vercel deployment URL');
console.log('And add your Vercel domain to Firebase authorized domains!');
