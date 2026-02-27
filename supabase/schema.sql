-- ═══════════════════════════════════════════════════════════
--  نقاء المتحدة - نظام إدارة الصيانة
--  Supabase Schema - قاعدة البيانات الكاملة
-- ═══════════════════════════════════════════════════════════

-- ─── تفعيل UUID ───
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════
--  1) جدول المستخدمين
-- ═══════════════════════
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('owner','general_manager','branch_manager','customer_service','technician')),
  city        TEXT NOT NULL DEFAULT 'all',
  permissions TEXT[] NOT NULL DEFAULT '{}',
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════
--  2) جدول العملاء
-- ═══════════════════════
CREATE TABLE IF NOT EXISTS clients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL UNIQUE,
  city        TEXT NOT NULL,
  district    TEXT,
  address     TEXT,
  devices     TEXT[] DEFAULT '{}',
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════
--  3) جدول المنتجات
-- ═══════════════════════
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku         TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  old_price   NUMERIC(10,2),
  image       TEXT DEFAULT '',
  description TEXT DEFAULT '',
  features    TEXT DEFAULT '',
  min_stock   INTEGER NOT NULL DEFAULT 5,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════
--  4) جدول المواعيد
-- ═══════════════════════
CREATE TABLE IF NOT EXISTS appointments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  tech_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  city         TEXT NOT NULL,
  service_type TEXT NOT NULL,
  priority     TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','urgent','vip')),
  status       TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','confirmed','delivering','installing','completed','cancelled','postponed')),
  date         DATE NOT NULL,
  time         TIME NOT NULL DEFAULT '09:00',
  products     JSONB DEFAULT '[]',
  notes        TEXT DEFAULT '',
  amount       NUMERIC(10,2) DEFAULT 0,
  pay_method   TEXT DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════
--  5) رسائل المواعيد
-- ═══════════════════════
CREATE TABLE IF NOT EXISTS appointment_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appt_id     UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════
--  6) جدول المخزون
-- ═══════════════════════
CREATE TABLE IF NOT EXISTS inventory (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  city        TEXT NOT NULL,
  qty         INTEGER NOT NULL DEFAULT 0,
  min_qty     INTEGER NOT NULL DEFAULT 5,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, city)
);

-- ═══════════════════════
--  7) جدول العهد
-- ═══════════════════════
CREATE TABLE IF NOT EXISTS custody (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tech_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty         INTEGER NOT NULL DEFAULT 1,
  city        TEXT NOT NULL,
  given_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  given_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  returned_at TIMESTAMPTZ,
  notes       TEXT DEFAULT ''
);

-- ═══════════════════════
--  8) طلبات العهد
-- ═══════════════════════
CREATE TABLE IF NOT EXISTS custody_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty         INTEGER NOT NULL DEFAULT 1,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  note        TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ═══════════════════════
--  9) جدول العقود
-- ═══════════════════════
CREATE TABLE IF NOT EXISTS contracts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  type         TEXT NOT NULL DEFAULT 'سنوي',
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_visits INTEGER NOT NULL DEFAULT 2,
  done_visits  INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  notes        TEXT DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════
--  10) جدول المهام
-- ═══════════════════════
CREATE TABLE IF NOT EXISTS tasks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  description  TEXT DEFAULT '',
  assigned_to  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  priority     TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','urgent','vip')),
  status       TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','completed','cancelled')),
  due_date     DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════
--  11) تعليقات المهام
-- ═══════════════════════
CREATE TABLE IF NOT EXISTS task_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════
--  12) سجل التعديلات
-- ═══════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action      TEXT NOT NULL,
  target      TEXT,
  details     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
--  Indexes للأداء
-- ═══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_appointments_client    ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tech      ON appointments(tech_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date      ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_status    ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_city      ON appointments(city);
CREATE INDEX IF NOT EXISTS idx_inventory_city         ON inventory(city);
CREATE INDEX IF NOT EXISTS idx_custody_tech           ON custody(tech_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned         ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_audit_log_user         ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created      ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appt_messages_appt     ON appointment_messages(appt_id);

-- ═══════════════════════════════════════════════════════════
--  Row Level Security (RLS)
-- ═══════════════════════════════════════════════════════════
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients             ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory           ENABLE ROW LEVEL SECURITY;
ALTER TABLE custody             ENABLE ROW LEVEL SECURITY;
ALTER TABLE custody_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;

-- سياسة: قراءة وكتابة كاملة عبر service_role (للباك إند)
CREATE POLICY "service_role_all" ON users               FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON clients             FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON products            FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON appointments        FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON appointment_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON inventory           FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON custody             FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON custody_requests    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON contracts           FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON tasks               FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON task_comments       FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON audit_log           FOR ALL TO service_role USING (true) WITH CHECK (true);

-- سياسة: المستخدمين المسجلين يقرؤون البيانات
CREATE POLICY "anon_read_products"  ON products  FOR SELECT TO anon USING (active = true);

-- ═══════════════════════════════════════════════════════════
--  Triggers - تحديث updated_at تلقائياً
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated        BEFORE UPDATE ON users        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clients_updated      BEFORE UPDATE ON clients      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON appointments  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contracts_updated    BEFORE UPDATE ON contracts     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tasks_updated        BEFORE UPDATE ON tasks         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_inventory_updated    BEFORE UPDATE ON inventory     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
