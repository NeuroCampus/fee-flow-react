// Copy this file to src/config/env.ts and update with your actual values
export const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_stripe_publishable_key_here',
};

// Environment variables to set in your .env file:
// VITE_API_BASE_URL=http://localhost:8000
// VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
