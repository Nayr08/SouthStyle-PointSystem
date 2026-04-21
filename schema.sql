-- ============================================
-- SouthStyle Points System - Supabase Schema
-- Paste in: Supabase > SQL Editor > New Query
-- ============================================

-- Required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CLEAN RE-RUN SUPPORT
-- ============================================
DROP TRIGGER IF EXISTS orders_updated_at ON orders;
DROP FUNCTION IF EXISTS update_updated_at();
DROP FUNCTION IF EXISTS is_active_staff();
DROP FUNCTION IF EXISTS is_owner();
DROP FUNCTION IF EXISTS calculate_points(numeric);
DROP FUNCTION IF EXISTS add_paid_order(uuid, jsonb, text, uuid);
DROP FUNCTION IF EXISTS redeem_points(uuid, numeric, text, uuid);

DROP TABLE IF EXISTS points_transactions;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS cards;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS staff;

-- ============================================
-- USERS / STAFF
-- ============================================
CREATE TABLE staff (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id     uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  role        text NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'staff')),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- CUSTOMERS
-- ============================================
CREATE TABLE customers (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       text NOT NULL,
  phone           text NOT NULL UNIQUE,
  pin_hash        text,
  points_balance  numeric(12,2) NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid REFERENCES staff(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- CARDS (RFID + QR)
-- ============================================
CREATE TABLE cards (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id  uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  rfid_uid     text UNIQUE,
  qr_token     text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (rfid_uid IS NOT NULL OR qr_token IS NOT NULL)
);

-- ============================================
-- SERVICES CATALOG
-- ============================================
CREATE TABLE services (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           text NOT NULL,
  category       text,
  default_price  numeric(10,2) NOT NULL DEFAULT 0 CHECK (default_price >= 0),
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE orders (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id      uuid NOT NULL REFERENCES customers(id),
  total_amount     numeric(10,2) NOT NULL CHECK (total_amount >= 0),
  points_earned    numeric(12,2) NOT NULL DEFAULT 0 CHECK (points_earned >= 0),
  payment_status   text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'voided')),
  order_status     text NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'in_progress', 'ready', 'claimed', 'voided')),
  notes            text,
  created_by       uuid REFERENCES staff(id),
  voided_by        uuid REFERENCES staff(id),
  void_reason      text,
  voided_at        timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- ORDER ITEMS
-- ============================================
CREATE TABLE order_items (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  service_id   uuid REFERENCES services(id),
  description  text NOT NULL,
  quantity     numeric(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price   numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  line_total   numeric(10,2) NOT NULL CHECK (line_total >= 0)
);

-- ============================================
-- POINTS TRANSACTIONS
-- ============================================
CREATE TABLE points_transactions (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id   uuid NOT NULL REFERENCES customers(id),
  order_id      uuid REFERENCES orders(id),
  type          text NOT NULL CHECK (type IN ('earn', 'redeem', 'adjust', 'void_reversal')),
  amount        numeric(12,2) NOT NULL CHECK (amount > 0),
  balance_after numeric(12,2) NOT NULL CHECK (balance_after >= 0),
  staff_id      uuid REFERENCES staff(id),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Prevent accidentally awarding points twice for one order.
CREATE UNIQUE INDEX one_earn_transaction_per_order
ON points_transactions(order_id)
WHERE type = 'earn' AND order_id IS NOT NULL;

-- Useful lookup indexes.
CREATE INDEX idx_staff_auth_id ON staff(auth_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_cards_customer_id ON cards(customer_id);
CREATE INDEX idx_cards_rfid_uid ON cards(rfid_uid);
CREATE INDEX idx_cards_qr_token ON cards(qr_token);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_points_transactions_customer_id ON points_transactions(customer_id);

-- ============================================
-- HELPERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION calculate_points(p_total_amount numeric)
RETURNS numeric AS $$
BEGIN
  RETURN round((p_total_amount / 100.0)::numeric, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION is_active_staff()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM staff
    WHERE auth_id = auth.uid()
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_owner()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM staff
    WHERE auth_id = auth.uid()
      AND role = 'owner'
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Creates a paid order, inserts items, awards decimal points, and records ledger history.
-- p_items example:
-- [
--   {"service_id": "uuid-or-null", "description": "Tarpaulin", "quantity": 2, "unit_price": 250}
-- ]
CREATE OR REPLACE FUNCTION add_paid_order(
  p_customer_id uuid,
  p_items jsonb,
  p_notes text DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_order_id uuid;
  v_total numeric(10,2);
  v_points numeric(12,2);
  v_balance numeric(12,2);
  v_item jsonb;
BEGIN
  IF NOT is_active_staff() THEN
    RAISE EXCEPTION 'Only active staff can create paid orders.';
  END IF;

  SELECT COALESCE(SUM(
    ((item->>'quantity')::numeric * (item->>'unit_price')::numeric)
  ), 0)
  INTO v_total
  FROM jsonb_array_elements(p_items) AS item;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Order total must be greater than zero.';
  END IF;

  v_points := calculate_points(v_total);

  INSERT INTO orders (
    customer_id,
    total_amount,
    points_earned,
    payment_status,
    order_status,
    notes,
    created_by
  )
  VALUES (
    p_customer_id,
    v_total,
    v_points,
    'paid',
    'pending',
    p_notes,
    p_staff_id
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (
      order_id,
      service_id,
      description,
      quantity,
      unit_price,
      line_total
    )
    VALUES (
      v_order_id,
      NULLIF(v_item->>'service_id', '')::uuid,
      v_item->>'description',
      (v_item->>'quantity')::numeric,
      (v_item->>'unit_price')::numeric,
      ((v_item->>'quantity')::numeric * (v_item->>'unit_price')::numeric)
    );
  END LOOP;

  UPDATE customers
  SET points_balance = points_balance + v_points
  WHERE id = p_customer_id
  RETURNING points_balance INTO v_balance;

  INSERT INTO points_transactions (
    customer_id,
    order_id,
    type,
    amount,
    balance_after,
    staff_id,
    notes
  )
  VALUES (
    p_customer_id,
    v_order_id,
    'earn',
    v_points,
    v_balance,
    p_staff_id,
    'Points earned from paid order'
  );

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Redeems points as staff-confirmed payment/discount.
CREATE OR REPLACE FUNCTION redeem_points(
  p_customer_id uuid,
  p_amount numeric,
  p_notes text DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL
)
RETURNS numeric AS $$
DECLARE
  v_balance numeric(12,2);
BEGIN
  IF NOT is_active_staff() THEN
    RAISE EXCEPTION 'Only active staff can redeem points.';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Redeem amount must be greater than zero.';
  END IF;

  SELECT points_balance
  INTO v_balance
  FROM customers
  WHERE id = p_customer_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Customer not found.';
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient points balance.';
  END IF;

  UPDATE customers
  SET points_balance = points_balance - p_amount
  WHERE id = p_customer_id
  RETURNING points_balance INTO v_balance;

  INSERT INTO points_transactions (
    customer_id,
    type,
    amount,
    balance_after,
    staff_id,
    notes
  )
  VALUES (
    p_customer_id,
    'redeem',
    p_amount,
    v_balance,
    p_staff_id,
    COALESCE(p_notes, 'Staff-confirmed points redemption')
  );

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE staff               ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards               ENABLE ROW LEVEL SECURITY;
ALTER TABLE services            ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;

-- Staff profiles: users can read themselves; owners can manage staff.
CREATE POLICY staff_read_self_or_owner
ON staff FOR SELECT TO authenticated
USING (auth_id = auth.uid() OR is_owner());

CREATE POLICY owner_manage_staff
ON staff FOR ALL TO authenticated
USING (is_owner())
WITH CHECK (is_owner());

-- Active staff can operate the shop data.
CREATE POLICY active_staff_all_customers
ON customers FOR ALL TO authenticated
USING (is_active_staff())
WITH CHECK (is_active_staff());

CREATE POLICY active_staff_all_cards
ON cards FOR ALL TO authenticated
USING (is_active_staff())
WITH CHECK (is_active_staff());

CREATE POLICY active_staff_all_services
ON services FOR ALL TO authenticated
USING (is_active_staff())
WITH CHECK (is_active_staff());

CREATE POLICY active_staff_all_orders
ON orders FOR ALL TO authenticated
USING (is_active_staff())
WITH CHECK (is_active_staff());

CREATE POLICY active_staff_all_order_items
ON order_items FOR ALL TO authenticated
USING (is_active_staff())
WITH CHECK (is_active_staff());

CREATE POLICY active_staff_all_points_transactions
ON points_transactions FOR ALL TO authenticated
USING (is_active_staff())
WITH CHECK (is_active_staff());

-- Public service catalog read can be useful for customer-facing pages.
CREATE POLICY public_read_active_services
ON services FOR SELECT TO anon, authenticated
USING (is_active = true);

-- ============================================
-- SEED: sample services
-- ============================================
INSERT INTO services (name, category, default_price) VALUES
  ('A4 Black & White Print',     'Printing',    3.00),
  ('A4 Color Print',             'Printing',    8.00),
  ('A3 Black & White Print',     'Printing',    6.00),
  ('A3 Color Print',             'Printing',   15.00),
  ('Tarpaulin Print (per sqft)', 'Tarpaulin',  25.00),
  ('Sublimation Shirt',          'Sublimation', 180.00),
  ('Sticker Print',              'Sticker',    50.00),
  ('ID Picture 2x2',             'Photo',      20.00),
  ('Lamination A4',              'Finishing',  15.00),
  ('Binding (comb)',             'Finishing',  30.00);
