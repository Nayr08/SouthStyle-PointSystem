-- ============================================
-- SouthStyle Points System - Test Data
-- Run this AFTER schema.sql in Supabase SQL Editor.
-- This is only for development/testing.
-- ============================================

DO $$
DECLARE
  v_staff_id uuid;
  v_customer_1 uuid;
  v_customer_2 uuid;
  v_customer_3 uuid;
  v_tarpaulin uuid;
  v_sublimation uuid;
  v_sticker uuid;
  v_order_1 uuid;
  v_order_2 uuid;
  v_order_3 uuid;
BEGIN
  -- Demo staff/admin login:
  -- phone: 09170000000
  -- PIN:   1234
  INSERT INTO staff (full_name, phone, pin_hash, role, is_active)
  VALUES ('SouthStyle Owner', '09170000000', extensions.crypt('1234', extensions.gen_salt('bf')), 'owner', true)
  RETURNING id INTO v_staff_id;

  INSERT INTO customers (full_name, phone, pin_hash, points_balance, created_by)
  VALUES
    ('Pristia Candra', '09175550148', extensions.crypt('1234', extensions.gen_salt('bf')), 12429.00, v_staff_id),
    ('Juan Dela Cruz', '09175550149', extensions.crypt('2468', extensions.gen_salt('bf')), 86.50, v_staff_id),
    ('Maria Santos', '09175550150', extensions.crypt('1357', extensions.gen_salt('bf')), 250.00, v_staff_id)
  RETURNING id INTO v_customer_1;

  SELECT id INTO v_customer_1 FROM customers WHERE phone = '09175550148';
  SELECT id INTO v_customer_2 FROM customers WHERE phone = '09175550149';
  SELECT id INTO v_customer_3 FROM customers WHERE phone = '09175550150';

  INSERT INTO cards (customer_id, rfid_uid, qr_token, is_active)
  VALUES
    (v_customer_1, 'SS-RFID-000123', 'qr-pristia-demo-000123', true),
    (v_customer_2, 'SS-RFID-000124', 'qr-juan-demo-000124', true),
    (v_customer_3, 'SS-RFID-000125', 'qr-maria-demo-000125', true);

  SELECT id INTO v_tarpaulin FROM services WHERE name = 'Tarpaulin Print (per sqft)' LIMIT 1;
  SELECT id INTO v_sublimation FROM services WHERE name = 'Sublimation Shirt' LIMIT 1;
  SELECT id INTO v_sticker FROM services WHERE name = 'Sticker Print' LIMIT 1;

  INSERT INTO orders (customer_id, total_amount, points_earned, payment_status, order_status, notes, created_by)
  VALUES (v_customer_1, 563.00, 5.63, 'paid', 'in_progress', '24 pcs sublimation shirt, front and back print', v_staff_id)
  RETURNING id INTO v_order_1;

  INSERT INTO order_items (order_id, service_id, description, quantity, unit_price, line_total)
  VALUES (v_order_1, v_sublimation, 'Sublimation Shirt - 24 pcs', 1, 563.00, 563.00);

  INSERT INTO points_transactions (customer_id, order_id, type, amount, balance_after, staff_id, notes)
  VALUES (v_customer_1, v_order_1, 'earn', 5.63, 12429.00, v_staff_id, 'Points earned from paid sublimation order');

  INSERT INTO orders (customer_id, total_amount, points_earned, payment_status, order_status, notes, created_by)
  VALUES (v_customer_1, 850.00, 8.50, 'paid', 'ready', '3x6 tarpaulin with birthday layout', v_staff_id)
  RETURNING id INTO v_order_2;

  INSERT INTO order_items (order_id, service_id, description, quantity, unit_price, line_total)
  VALUES (v_order_2, v_tarpaulin, 'Tarpaulin 3x6 ft', 1, 850.00, 850.00);

  INSERT INTO points_transactions (customer_id, order_id, type, amount, balance_after, staff_id, notes)
  VALUES (v_customer_1, v_order_2, 'earn', 8.50, 12423.37, v_staff_id, 'Points earned from paid tarpaulin order');

  INSERT INTO points_transactions (customer_id, type, amount, balance_after, staff_id, notes)
  VALUES (v_customer_1, 'redeem', 120.00, 12414.87, v_staff_id, 'Redeemed as payment discount');

  INSERT INTO orders (customer_id, total_amount, points_earned, payment_status, order_status, notes, created_by)
  VALUES (v_customer_2, 1250.00, 12.50, 'paid', 'pending', 'Waterproof die-cut stickers', v_staff_id)
  RETURNING id INTO v_order_3;

  INSERT INTO order_items (order_id, service_id, description, quantity, unit_price, line_total)
  VALUES (v_order_3, v_sticker, 'Die-cut stickers - 500 pcs', 1, 1250.00, 1250.00);

  INSERT INTO points_transactions (customer_id, order_id, type, amount, balance_after, staff_id, notes)
  VALUES (v_customer_2, v_order_3, 'earn', 12.50, 86.50, v_staff_id, 'Points earned from paid sticker order');
END $$;

-- Quick checks after running:
SELECT full_name, phone, points_balance FROM customers ORDER BY created_at;
SELECT full_name, phone, role FROM staff ORDER BY created_at;
SELECT rfid_uid, qr_token, is_active FROM cards ORDER BY created_at;
SELECT order_status, payment_status, total_amount, points_earned FROM orders ORDER BY created_at;
SELECT type, amount, balance_after, notes FROM points_transactions ORDER BY created_at;
