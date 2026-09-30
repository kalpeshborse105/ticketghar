-- MahaTicket Phase 2 ADMIN - Optional Database Schema Extensions
-- These are OPTIONAL - the current schema already supports all Phase 2 features
-- Only run these if you want additional bilingual support or tracking fields

-- ==============================================================================
-- 1. VERIFY CURRENT SCHEMA (Tables should already exist)
-- ==============================================================================

-- Check if coupons table exists with extended fields
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'coupons';

-- Check if announcements table exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'announcements';

-- Check if audit_logs table exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'audit_logs';

-- ==============================================================================
-- 2. OPTIONAL: Add Bilingual Fields to Announcements (Marathi Support)
-- ==============================================================================

-- If you want titleMr and messageMr for bilingual announcements:
ALTER TABLE announcements 
  ADD COLUMN IF NOT EXISTS title_mr TEXT,
  ADD COLUMN IF NOT EXISTS message_mr TEXT;

COMMENT ON COLUMN announcements.title_mr IS 'Marathi title for announcement';
COMMENT ON COLUMN announcements.message_mr IS 'Marathi message body';

-- ==============================================================================
-- 3. OPTIONAL: Add Usage Tracking to Coupons (If Not Present)
-- ==============================================================================

-- These fields should already exist from the schema, but if missing:
ALTER TABLE coupons 
  ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0 NOT NULL;

COMMENT ON COLUMN coupons.used_count IS 'Track actual redemption count';

-- ==============================================================================
-- 4. CREATE SUPER ADMIN USER (First Login)
-- ==============================================================================

-- Insert a super_admin user for system operations
INSERT INTO users (uid, email, full_name, phone_number, role, city, preferred_language, created_at, updated_at)
VALUES (
  'super_admin_2026',
  'admin@mahaticket.com',
  'MahaTicket Super Admin',
  '+91-9876543210',
  'super_admin',
  'Pune',
  'mr',
  NOW(),
  NOW()
)
ON CONFLICT (uid) DO NOTHING;

-- Verify user created
SELECT id, email, full_name, role, city FROM users WHERE role = 'super_admin';

-- ==============================================================================
-- 5. SAMPLE DATA: Create Test Coupon
-- ==============================================================================

-- Create a sample discount coupon for testing
INSERT INTO coupons (
  code, 
  discount_type, 
  discount_value, 
  min_order_value, 
  max_discount,
  usage_limit,
  per_user_limit,
  starts_at,
  ends_at,
  active,
  created_at
)
VALUES (
  'WELCOME2026',
  'percentage',
  1000, -- 10% discount
  20000, -- Min order ₹200
  5000, -- Max discount ₹50
  100, -- 100 total uses
  1, -- 1 per user
  NOW(),
  NOW() + INTERVAL '30 days',
  1,
  NOW()
)
ON CONFLICT (code) DO NOTHING;

-- Verify coupon created
SELECT * FROM coupons WHERE code = 'WELCOME2026';

-- ==============================================================================
-- 6. SAMPLE DATA: Create Test Announcement
-- ==============================================================================

-- Create a sample system announcement
INSERT INTO announcements (
  title,
  message,
  image_url,
  cta_label,
  cta_url,
  city,
  category,
  starts_at,
  ends_at,
  active,
  created_at,
  updated_at
)
VALUES (
  'Welcome to MahaTicket!',
  'Book Marathi plays, concerts, and cultural events across Maharashtra. Exclusive launch offer: Use code WELCOME2026 for 10% off!',
  'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=800',
  'Explore Events',
  '/events',
  NULL, -- Global announcement
  'platform',
  NOW(),
  NOW() + INTERVAL '60 days',
  1,
  NOW(),
  NOW()
)
RETURNING id, title, active;

-- Verify announcement created
SELECT id, title, message, active, starts_at, ends_at FROM announcements WHERE active = 1;

-- ==============================================================================
-- 7. VERIFY AUDIT LOGGING IS WORKING
-- ==============================================================================

-- Check recent audit log entries
SELECT 
  id,
  actor_id,
  actor_role,
  action,
  entity_type,
  entity_id,
  created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 10;

-- ==============================================================================
-- 8. VERIFY EVENT STATUS SOFT-DELETE SUPPORT
-- ==============================================================================

-- Check events table has status field with correct values
SELECT DISTINCT status FROM events;

-- Expected values: 'draft', 'published', 'unpublish', 'cancelled'

-- Example: Soft-delete an event (unpublish)
-- UPDATE events SET status = 'unpublish' WHERE id = 1;

-- ==============================================================================
-- 9. VERIFY SESSION STATUS SUPPORT
-- ==============================================================================

-- Check event_sessions table has status field
SELECT DISTINCT status FROM event_sessions;

-- Expected values: 'active', 'cancelled', 'completed', 'sold_out'

-- ==============================================================================
-- 10. INDEXES FOR PERFORMANCE (Optional but Recommended)
-- ==============================================================================

-- Index on coupons.code for fast lookup during checkout
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code) WHERE active = 1;

-- Index on announcements for active queries
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(active, starts_at, ends_at) 
WHERE active = 1;

-- Index on audit_logs for date range queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Index on users by role for admin panel
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ==============================================================================
-- 11. PERMISSIONS CHECK (Ensure App User Has Write Access)
-- ==============================================================================

-- Verify the app database user has INSERT/UPDATE permissions
-- Replace 'your_app_user' with actual SQL_USER from .env

-- GRANT INSERT, UPDATE, SELECT ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- ==============================================================================
-- 12. DATA INTEGRITY CONSTRAINTS (Already in Schema)
-- ==============================================================================

-- These should already exist from Drizzle schema, but verify:

-- Check foreign key constraints
SELECT
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('coupons', 'announcements', 'audit_logs', 'orders', 'tickets')
ORDER BY tc.table_name;

-- ==============================================================================
-- 13. BACKUP REMINDER
-- ==============================================================================

-- IMPORTANT: Before running any schema changes in production:
-- 1. Create a database backup
-- 2. Test changes in staging environment
-- 3. Verify data integrity after migration

-- Supabase backup command (via CLI):
-- supabase db dump --file backup_$(date +%Y%m%d_%H%M%S).sql

-- ==============================================================================
-- 14. ROLLBACK COMMANDS (If Needed)
-- ==============================================================================

-- If you need to remove optional bilingual fields:
-- ALTER TABLE announcements DROP COLUMN IF EXISTS title_mr;
-- ALTER TABLE announcements DROP COLUMN IF EXISTS message_mr;

-- If you need to remove test data:
-- DELETE FROM coupons WHERE code = 'WELCOME2026';
-- DELETE FROM announcements WHERE title = 'Welcome to MahaTicket!';

-- ==============================================================================
-- END OF SCHEMA EXTENSIONS
-- ==============================================================================

-- ✅ All Phase 2 ADMIN features work with current schema
-- ✅ These extensions are OPTIONAL for enhanced functionality
-- ✅ No breaking changes
-- ✅ Safe to run incrementally
