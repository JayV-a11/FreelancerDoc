/**
 * Global test setup — runs before every test file.
 *
 * Injects the minimum env vars required for env.ts Zod validation to pass
 * during unit/integration tests without connecting to real services.
 *
 * Rules:
 *   - JWT_SECRET, JWT_REFRESH_SECRET, and COOKIE_SECRET must all be distinct
 *     (enforced by env.ts cross-validation)
 *   - SUPABASE_SERVICE_KEY must start with 'eyJ' (Supabase JWT format)
 *   - SMTP_FROM is required (no longer optional)
 *
 * Security tests that need a real Supabase project must also have
 * TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_KEY set in .env.
 */
process.env['NODE_ENV'] = 'test'
process.env['PORT'] = '3001'
process.env['DATABASE_URL'] =
  'postgresql://postgres:password@localhost:5432/freelancedoc_test'
process.env['DIRECT_URL'] =
  'postgresql://postgres:password@localhost:5432/freelancedoc_test'
process.env['SUPABASE_URL'] = 'https://test.supabase.co'
// Must start with 'eyJ' to pass SUPABASE_SERVICE_KEY format validation
process.env['SUPABASE_SERVICE_KEY'] =
  'eyJhbGciOiJIUzI1NiJ9.test_service_key_placeholder_for_unit_tests'
// All three secrets must be >= 32 chars and distinct
process.env['JWT_SECRET'] =
  'test_jwt_access_secret_min_32_chars_AAAAAA'
process.env['JWT_REFRESH_SECRET'] =
  'test_jwt_refresh_secret_min_32_chars_BBBBBB'
process.env['COOKIE_SECRET'] =
  'test_cookie_signing_secret_min_32_chars_CCCCCC'
process.env['JWT_ACCESS_EXPIRY'] = '15m'
process.env['JWT_REFRESH_EXPIRY'] = '7d'
process.env['ALLOWED_ORIGIN'] = 'http://localhost:3000'
process.env['SMTP_HOST'] = 'localhost'
process.env['SMTP_PORT'] = '1025'
process.env['SMTP_USER'] = 'test@test.com'
process.env['SMTP_PASS'] = 'testpassword'
process.env['SMTP_FROM'] = 'noreply@test.com'

