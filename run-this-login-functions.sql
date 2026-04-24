-- ============================================
-- SouthStyle App Functions Only
-- Run this AFTER myschema.sql in Supabase SQL Editor.
-- Safe: does not drop tables and assumes the base tables already exist.
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.coupons (
  id               uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name             text NOT NULL,
  description      text,
  reward_type      text NOT NULL DEFAULT 'discount' CHECK (reward_type IN ('discount', 'free_service')),
  points_cost      numeric(12,2) NOT NULL CHECK (points_cost > 0),
  discount_amount  numeric(10,2) CHECK (discount_amount IS NULL OR discount_amount >= 0),
  monthly_limit    integer NOT NULL DEFAULT 2 CHECK (monthly_limit > 0),
  minimum_tier     text NOT NULL DEFAULT 'Bronze' CHECK (minimum_tier IN ('Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Titanium')),
  is_active        boolean NOT NULL DEFAULT true,
  created_by       uuid REFERENCES public.staff(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons
ADD COLUMN IF NOT EXISTS minimum_tier text NOT NULL DEFAULT 'Bronze';

ALTER TABLE public.coupons
DROP CONSTRAINT IF EXISTS coupons_minimum_tier_check;

ALTER TABLE public.coupons
ADD CONSTRAINT coupons_minimum_tier_check CHECK (minimum_tier IN ('Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Titanium'));

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id             uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  coupon_id      uuid NOT NULL REFERENCES public.coupons(id),
  customer_id    uuid NOT NULL REFERENCES public.customers(id),
  order_id       uuid REFERENCES public.orders(id),
  claim_code     text UNIQUE,
  points_spent   numeric(12,2) NOT NULL CHECK (points_spent > 0),
  status         text NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed', 'used', 'expired', 'cancelled')),
  staff_id       uuid REFERENCES public.staff(id),
  claimed_at     timestamptz NOT NULL DEFAULT now(),
  used_at        timestamptz
);

ALTER TABLE public.coupon_redemptions
ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id);

ALTER TABLE public.coupon_redemptions
ADD COLUMN IF NOT EXISTS claim_code text;

CREATE UNIQUE INDEX IF NOT EXISTS coupon_redemptions_claim_code_key ON public.coupon_redemptions(claim_code) WHERE claim_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.order_tracking_steps (
  id          uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  step_key    text NOT NULL,
  step_name   text NOT NULL,
  sort_order  integer NOT NULL,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'current', 'done')),
  updated_by  uuid REFERENCES public.staff(id),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, step_key),
  UNIQUE (order_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_order_tracking_steps_order_id ON public.order_tracking_steps(order_id);

CREATE OR REPLACE FUNCTION public.ensure_order_tracking(p_order_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.order_tracking_steps (order_id, step_key, step_name, sort_order, status)
  VALUES
    (p_order_id, 'designing', 'Designing', 1, 'current'),
    (p_order_id, 'printing', 'Printing', 2, 'pending'),
    (p_order_id, 'cutting', 'Cutting', 3, 'pending'),
    (p_order_id, 'ready', 'Ready to pick up', 4, 'pending'),
    (p_order_id, 'claimed', 'Claimed', 5, 'pending')
  ON CONFLICT (order_id, step_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Checks if the number belongs to an active customer.
CREATE OR REPLACE FUNCTION public.customer_phone_exists(p_phone text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.customers
    WHERE phone = p_phone
      AND is_active = true
      AND pin_hash IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Checks if the number belongs to active staff/admin.
CREATE OR REPLACE FUNCTION public.staff_phone_exists(p_phone text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.staff
    WHERE phone = p_phone
      AND is_active = true
      AND pin_hash IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Customer phone + MPIN login.
CREATE OR REPLACE FUNCTION public.customer_login(
  p_phone text,
  p_pin text
)
RETURNS TABLE (
  id uuid,
  full_name text,
  phone text,
  points_balance numeric,
  tier text,
  rfid_uid text,
  qr_token text,
  member_since text
) AS $$
BEGIN
  RETURN QUERY
  WITH point_totals AS (
    SELECT
      c.id AS customer_id,
      COALESCE(SUM(pt.amount) FILTER (WHERE pt.type = 'earn'), 0) AS lifetime_earned
    FROM public.customers c
    LEFT JOIN public.points_transactions pt ON pt.customer_id = c.id
    GROUP BY c.id
  )
  SELECT
    c.id,
    c.full_name,
    c.phone,
    c.points_balance,
    CASE
      WHEN ptot.lifetime_earned >= 5000 THEN 'Titanium'
      WHEN ptot.lifetime_earned >= 3000 THEN 'Diamond'
      WHEN ptot.lifetime_earned >= 1000 THEN 'Platinum'
      WHEN ptot.lifetime_earned >= 500 THEN 'Gold'
      WHEN ptot.lifetime_earned >= 300 THEN 'Silver'
      ELSE 'Bronze'
    END AS tier,
    ca.rfid_uid,
    ca.qr_token,
    'Member since ' || to_char(c.created_at, 'Mon YYYY') AS member_since
  FROM public.customers c
  JOIN point_totals ptot ON ptot.customer_id = c.id
  LEFT JOIN LATERAL (
    SELECT cards.rfid_uid, cards.qr_token
    FROM public.cards
    WHERE cards.customer_id = c.id
      AND cards.is_active = true
    ORDER BY cards.created_at DESC
    LIMIT 1
  ) ca ON true
  WHERE c.phone = p_phone
    AND c.pin_hash = extensions.crypt(p_pin, c.pin_hash)
    AND c.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Staff/admin phone + PIN login.
CREATE OR REPLACE FUNCTION public.staff_login(
  p_phone text,
  p_pin text
)
RETURNS TABLE (
  id uuid,
  full_name text,
  phone text,
  role text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.full_name,
    s.phone,
    s.role
  FROM public.staff s
  WHERE s.phone = p_phone
    AND s.pin_hash = extensions.crypt(p_pin, s.pin_hash)
    AND s.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Let the browser anon key call these RPC functions.
GRANT EXECUTE ON FUNCTION public.customer_phone_exists(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_phone_exists(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_login(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_login(text, text) TO anon, authenticated;

-- Register a new customer and create their backup QR/card record.
CREATE OR REPLACE FUNCTION public.register_suki_customer(
  p_staff_id uuid,
  p_full_name text,
  p_phone text,
  p_pin text,
  p_rfid_uid text DEFAULT NULL
)
RETURNS TABLE (
  customer_id uuid,
  full_name text,
  phone text,
  rfid_uid text,
  qr_token text
) AS $$
DECLARE
  v_customer_id uuid;
  v_qr_token text;
  v_rfid_uid text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.staff
    WHERE id = p_staff_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only active staff can register Suki members.';
  END IF;

  IF length(regexp_replace(p_phone, '\D', '', 'g')) <> 11 THEN
    RAISE EXCEPTION 'Mobile number must be 11 digits.';
  END IF;

  IF length(p_pin) <> 4 THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits.';
  END IF;

  v_rfid_uid := NULLIF(trim(COALESCE(p_rfid_uid, '')), '');

  INSERT INTO public.customers (
    full_name,
    phone,
    pin_hash,
    points_balance,
    is_active,
    created_by
  )
  VALUES (
    trim(p_full_name),
    regexp_replace(p_phone, '\D', '', 'g'),
    extensions.crypt(p_pin, extensions.gen_salt('bf')),
    0,
    true,
    p_staff_id
  )
  RETURNING id INTO v_customer_id;

  INSERT INTO public.cards (
    customer_id,
    rfid_uid,
    is_active
  )
  VALUES (
    v_customer_id,
    v_rfid_uid,
    true
  )
  RETURNING public.cards.qr_token INTO v_qr_token;

  RETURN QUERY
  SELECT
    v_customer_id,
    trim(p_full_name),
    regexp_replace(p_phone, '\D', '', 'g'),
    v_rfid_uid,
    v_qr_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.register_suki_customer(uuid, text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_customers()
RETURNS TABLE (
  customer_id uuid,
  full_name text,
  phone text,
  points_balance numeric,
  lifetime_earned numeric,
  tier text,
  rfid_uid text,
  qr_token text,
  member_since text
) AS $$
BEGIN
  RETURN QUERY
  WITH point_totals AS (
    SELECT
      c.id AS customer_id,
      COALESCE(SUM(pt.amount) FILTER (WHERE pt.type = 'earn'), 0) AS lifetime_earned
    FROM public.customers c
    LEFT JOIN public.points_transactions pt ON pt.customer_id = c.id
    GROUP BY c.id
  )
  SELECT
    c.id,
    c.full_name,
    c.phone,
    c.points_balance,
    ptot.lifetime_earned,
    CASE
      WHEN ptot.lifetime_earned >= 5000 THEN 'Titanium'
      WHEN ptot.lifetime_earned >= 3000 THEN 'Diamond'
      WHEN ptot.lifetime_earned >= 1000 THEN 'Platinum'
      WHEN ptot.lifetime_earned >= 500 THEN 'Gold'
      WHEN ptot.lifetime_earned >= 300 THEN 'Silver'
      ELSE 'Bronze'
    END AS tier,
    ca.rfid_uid,
    ca.qr_token,
    'Member since ' || to_char(c.created_at, 'Mon YYYY') AS member_since
  FROM public.customers c
  JOIN point_totals ptot ON ptot.customer_id = c.id
  LEFT JOIN LATERAL (
    SELECT cards.rfid_uid, cards.qr_token
    FROM public.cards
    WHERE cards.customer_id = c.id
      AND cards.is_active = true
    ORDER BY cards.created_at DESC
    LIMIT 1
  ) ca ON true
  WHERE c.is_active = true
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.admin_list_customers() TO anon, authenticated;

-- Lookup customer by phone, RFID UID, or QR token.
DROP FUNCTION IF EXISTS public.admin_lookup_customer(text);

CREATE OR REPLACE FUNCTION public.admin_lookup_customer(p_lookup text)
RETURNS TABLE (
  customer_id uuid,
  full_name text,
  phone text,
  points_balance numeric,
  tier text,
  rfid_uid text,
  qr_token text
) AS $$
BEGIN
  RETURN QUERY
  WITH point_totals AS (
    SELECT
      pt.customer_id AS lookup_customer_id,
      COALESCE(SUM(pt.amount) FILTER (WHERE pt.type = 'earn'), 0) AS lifetime_earned
    FROM public.points_transactions pt
    GROUP BY pt.customer_id
  )
  SELECT
    c.id,
    c.full_name,
    c.phone,
    c.points_balance,
    CASE
      WHEN COALESCE(ptot.lifetime_earned, 0) >= 5000 THEN 'Titanium'
      WHEN COALESCE(ptot.lifetime_earned, 0) >= 3000 THEN 'Diamond'
      WHEN COALESCE(ptot.lifetime_earned, 0) >= 1000 THEN 'Platinum'
      WHEN COALESCE(ptot.lifetime_earned, 0) >= 500 THEN 'Gold'
      WHEN COALESCE(ptot.lifetime_earned, 0) >= 300 THEN 'Silver'
      ELSE 'Bronze'
    END AS tier,
    ca.rfid_uid,
    ca.qr_token
  FROM public.customers c
  LEFT JOIN point_totals ptot ON ptot.lookup_customer_id = c.id
  LEFT JOIN LATERAL (
    SELECT cards.rfid_uid, cards.qr_token
    FROM public.cards
    WHERE cards.customer_id = c.id
      AND cards.is_active = true
    ORDER BY cards.created_at DESC
    LIMIT 1
  ) ca ON true
  WHERE c.is_active = true
    AND (
      c.phone = p_lookup
      OR ca.rfid_uid = p_lookup
      OR ca.qr_token = p_lookup
    )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.admin_lookup_customer(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_check_coupon_code(
  p_coupon_code text,
  p_purchase_amount numeric DEFAULT NULL
)
RETURNS TABLE (
  is_valid boolean,
  status text,
  coupon_name text,
  claim_code text,
  reward_type text,
  discount_amount numeric,
  coupon_discount numeric,
  message text
) AS $$
DECLARE
  v_coupon record;
  v_trimmed_code text := upper(trim(COALESCE(p_coupon_code, '')));
BEGIN
  IF v_trimmed_code = '' THEN
    RETURN QUERY
    SELECT false, 'empty'::text, NULL::text, NULL::text, NULL::text, 0::numeric, 0::numeric, 'Enter a coupon code.'::text;
    RETURN;
  END IF;

  SELECT
    cr.claim_code,
    cr.status,
    c.name,
    c.reward_type,
    COALESCE(c.discount_amount, 0) AS discount_amount
  INTO v_coupon
  FROM public.coupon_redemptions cr
  JOIN public.coupons c ON c.id = cr.coupon_id
  WHERE upper(cr.claim_code) = v_trimmed_code
  LIMIT 1;

  IF v_coupon.claim_code IS NULL THEN
    RETURN QUERY
    SELECT false, 'invalid'::text, NULL::text, v_trimmed_code, NULL::text, 0::numeric, 0::numeric, 'Coupon code not found.'::text;
    RETURN;
  END IF;

  IF v_coupon.status <> 'claimed' THEN
    RETURN QUERY
    SELECT
      false,
      v_coupon.status::text,
      v_coupon.name::text,
      v_coupon.claim_code::text,
      v_coupon.reward_type::text,
      v_coupon.discount_amount::numeric,
      0::numeric,
      CASE v_coupon.status
        WHEN 'used' THEN 'Coupon code already used.'
        WHEN 'expired' THEN 'Coupon code expired.'
        WHEN 'cancelled' THEN 'Coupon code cancelled.'
        ELSE 'Coupon code is not available.'
      END::text;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    true,
    'available'::text,
    v_coupon.name::text,
    v_coupon.claim_code::text,
    v_coupon.reward_type::text,
    v_coupon.discount_amount::numeric,
    CASE
      WHEN v_coupon.reward_type = 'discount'
        THEN LEAST(v_coupon.discount_amount::numeric, GREATEST(COALESCE(p_purchase_amount, v_coupon.discount_amount::numeric), 0))
      ELSE 0::numeric
    END,
    CASE
      WHEN v_coupon.reward_type = 'discount' THEN 'Coupon available.'
      ELSE 'Coupon available for free service.'
    END::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.admin_check_coupon_code(text, numeric) TO anon, authenticated;

-- Add points from a paid purchase. PHP 100 = 1 point.
CREATE OR REPLACE FUNCTION public.admin_add_purchase_points(
  p_staff_id uuid,
  p_lookup text,
  p_purchase_amount numeric,
  p_coupon_code text DEFAULT NULL,
  p_points_to_use numeric DEFAULT 0,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  customer_id uuid,
  full_name text,
  purchase_amount numeric,
  amount_due numeric,
  coupon_discount numeric,
  points_used numeric,
  coupon_name text,
  coupon_code text,
  points_added numeric,
  balance_after numeric
) AS $$
DECLARE
  v_customer_id uuid;
  v_full_name text;
  v_points numeric(12,2);
  v_balance numeric(12,2);
  v_balance_after_redeem numeric(12,2);
  v_order_id uuid;
  v_coupon record;
  v_amount_due numeric(10,2);
  v_coupon_discount numeric(10,2) := 0;
  v_points_to_use numeric(12,2) := COALESCE(p_points_to_use, 0);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE id = p_staff_id AND is_active = true) THEN
    RAISE EXCEPTION 'Only active staff can add points.';
  END IF;

  IF p_purchase_amount <= 0 THEN
    RAISE EXCEPTION 'Purchase amount must be greater than zero.';
  END IF;

  IF v_points_to_use < 0 THEN
    RAISE EXCEPTION 'Points to use cannot be negative.';
  END IF;

  SELECT x.customer_id, x.full_name
  INTO v_customer_id, v_full_name
  FROM public.admin_lookup_customer(p_lookup) x
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer not found.';
  END IF;

  SELECT points_balance
  INTO v_balance
  FROM public.customers
  WHERE id = v_customer_id
    AND is_active = true
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Customer not found.';
  END IF;

  IF NULLIF(trim(COALESCE(p_coupon_code, '')), '') IS NOT NULL THEN
    SELECT
      cr.id,
      cr.claim_code,
      c.name,
      c.reward_type,
      c.discount_amount
    INTO v_coupon
    FROM public.coupon_redemptions cr
    JOIN public.coupons c ON c.id = cr.coupon_id
    WHERE upper(cr.claim_code) = upper(trim(p_coupon_code))
      AND cr.status = 'claimed';

    IF v_coupon.id IS NULL THEN
      RAISE EXCEPTION 'Coupon code is invalid or already used.';
    END IF;

    IF v_coupon.reward_type = 'discount' THEN
      v_coupon_discount := LEAST(COALESCE(v_coupon.discount_amount, 0), p_purchase_amount);
    END IF;
  END IF;

  v_points := round((p_purchase_amount / 100.0)::numeric, 2);
  v_amount_due := GREATEST(p_purchase_amount - v_coupon_discount, 0);

  IF v_points_to_use > v_balance THEN
    RAISE EXCEPTION 'Customer does not have enough points.';
  END IF;

  IF v_points_to_use > v_amount_due THEN
    RAISE EXCEPTION 'Points used cannot be greater than the remaining amount due.';
  END IF;

  v_amount_due := GREATEST(v_amount_due - v_points_to_use, 0);

  INSERT INTO public.orders (customer_id, total_amount, points_earned, payment_status, order_status, notes, created_by)
  VALUES (v_customer_id, p_purchase_amount, v_points, 'paid', 'pending', p_notes, p_staff_id)
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, service_id, description, quantity, unit_price, line_total)
  VALUES (v_order_id, NULL, COALESCE(p_notes, 'Paid printing purchase'), 1, p_purchase_amount, p_purchase_amount);

  PERFORM public.ensure_order_tracking(v_order_id);

  IF v_points_to_use > 0 THEN
    UPDATE public.customers
    SET points_balance = points_balance - v_points_to_use
    WHERE id = v_customer_id
    RETURNING points_balance INTO v_balance_after_redeem;

    INSERT INTO public.points_transactions (customer_id, order_id, type, amount, balance_after, staff_id, notes)
    VALUES (
      v_customer_id,
      v_order_id,
      'redeem',
      v_points_to_use,
      v_balance_after_redeem,
      p_staff_id,
      COALESCE(p_notes, 'Points used on paid order')
    );
  ELSE
    v_balance_after_redeem := v_balance;
  END IF;

  UPDATE public.customers
  SET points_balance = points_balance + v_points
  WHERE id = v_customer_id
  RETURNING points_balance INTO v_balance;

  INSERT INTO public.points_transactions (customer_id, order_id, type, amount, balance_after, staff_id, notes)
  VALUES (v_customer_id, v_order_id, 'earn', v_points, v_balance, p_staff_id, COALESCE(p_notes, 'Points earned from paid purchase'));

  IF v_coupon.id IS NOT NULL THEN
    UPDATE public.coupon_redemptions
    SET
      status = 'used',
      staff_id = p_staff_id,
      used_at = now(),
      order_id = v_order_id
    WHERE id = v_coupon.id;
  END IF;

  RETURN QUERY
  SELECT
    v_customer_id,
    v_full_name,
    p_purchase_amount,
    v_amount_due,
    v_coupon_discount,
    v_points_to_use,
    v_coupon.name,
    v_coupon.claim_code,
    v_points,
    v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.admin_add_purchase_points(uuid, text, numeric, text, numeric, text) TO anon, authenticated;

-- Deduct points as payment discount or redemption.
CREATE OR REPLACE FUNCTION public.admin_deduct_points(
  p_staff_id uuid,
  p_lookup text,
  p_amount numeric,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  customer_id uuid,
  full_name text,
  points_deducted numeric,
  balance_after numeric
) AS $$
DECLARE
  v_customer_id uuid;
  v_full_name text;
  v_balance numeric(12,2);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE id = p_staff_id AND is_active = true) THEN
    RAISE EXCEPTION 'Only active staff can deduct points.';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Deduct amount must be greater than zero.';
  END IF;

  SELECT x.customer_id, x.full_name
  INTO v_customer_id, v_full_name
  FROM public.admin_lookup_customer(p_lookup) x
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer not found.';
  END IF;

  SELECT points_balance
  INTO v_balance
  FROM public.customers
  WHERE id = v_customer_id
  FOR UPDATE;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient points balance.';
  END IF;

  UPDATE public.customers
  SET points_balance = points_balance - p_amount
  WHERE id = v_customer_id
  RETURNING points_balance INTO v_balance;

  INSERT INTO public.points_transactions (customer_id, type, amount, balance_after, staff_id, notes)
  VALUES (v_customer_id, 'redeem', p_amount, v_balance, p_staff_id, COALESCE(p_notes, 'Staff points deduction'));

  RETURN QUERY SELECT v_customer_id, v_full_name, p_amount, v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.admin_deduct_points(uuid, text, numeric, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_coupons()
RETURNS SETOF public.coupons AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.coupons ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.admin_list_coupons() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_coupon_redemptions()
RETURNS TABLE (
  id uuid,
  coupon_name text,
  customer_id uuid,
  customer_name text,
  customer_phone text,
  claim_code text,
  points_spent numeric,
  status text,
  claimed_at_label text,
  used_at_label text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.id,
    c.name,
    cu.id,
    cu.full_name,
    cu.phone,
    cr.claim_code,
    cr.points_spent,
    cr.status,
    to_char(cr.claimed_at, 'Mon DD, YYYY HH12:MI AM') AS claimed_at_label,
    CASE
      WHEN cr.used_at IS NULL THEN NULL
      ELSE to_char(cr.used_at, 'Mon DD, YYYY HH12:MI AM')
    END AS used_at_label
  FROM public.coupon_redemptions cr
  JOIN public.coupons c ON c.id = cr.coupon_id
  JOIN public.customers cu ON cu.id = cr.customer_id
  ORDER BY COALESCE(cr.used_at, cr.claimed_at) DESC, cr.claimed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.admin_coupon_redemptions() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.customer_available_coupons(p_customer_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  reward_type text,
  points_cost numeric,
  discount_amount numeric,
  monthly_limit integer,
  claimed_this_month integer,
  remaining_this_month integer,
  minimum_tier text
) AS $$
BEGIN
  RETURN QUERY
  WITH customer_tier AS (
    SELECT
      CASE
        WHEN COALESCE(SUM(pt.amount) FILTER (WHERE pt.type = 'earn'), 0) >= 5000 THEN 'Titanium'
        WHEN COALESCE(SUM(pt.amount) FILTER (WHERE pt.type = 'earn'), 0) >= 3000 THEN 'Diamond'
        WHEN COALESCE(SUM(pt.amount) FILTER (WHERE pt.type = 'earn'), 0) >= 1000 THEN 'Platinum'
        WHEN COALESCE(SUM(pt.amount) FILTER (WHERE pt.type = 'earn'), 0) >= 500 THEN 'Gold'
        WHEN COALESCE(SUM(pt.amount) FILTER (WHERE pt.type = 'earn'), 0) >= 300 THEN 'Silver'
        ELSE 'Bronze'
      END AS tier
    FROM public.customers c
    LEFT JOIN public.points_transactions pt ON pt.customer_id = c.id
    WHERE c.id = p_customer_id
    GROUP BY c.id
  )
  SELECT
    c.id,
    c.name,
    c.description,
    c.reward_type,
    c.points_cost,
    c.discount_amount,
    c.monthly_limit,
    COALESCE(cr.claimed_this_month, 0)::integer,
    GREATEST(c.monthly_limit - COALESCE(cr.claimed_this_month, 0), 0)::integer,
    c.minimum_tier
  FROM public.coupons c
  CROSS JOIN customer_tier ct
  LEFT JOIN (
    SELECT
      coupon_id,
      COUNT(*) AS claimed_this_month
    FROM public.coupon_redemptions
    WHERE customer_id = p_customer_id
      AND status IN ('claimed', 'used')
      AND date_trunc('month', claimed_at) = date_trunc('month', now())
    GROUP BY coupon_id
  ) cr ON cr.coupon_id = c.id
  WHERE c.is_active = true
    AND CASE ct.tier
      WHEN 'Bronze' THEN 1
      WHEN 'Silver' THEN 2
      WHEN 'Gold' THEN 3
      WHEN 'Platinum' THEN 4
      WHEN 'Diamond' THEN 5
      WHEN 'Titanium' THEN 6
      ELSE 0
    END >= CASE c.minimum_tier
      WHEN 'Bronze' THEN 1
      WHEN 'Silver' THEN 2
      WHEN 'Gold' THEN 3
      WHEN 'Platinum' THEN 4
      WHEN 'Diamond' THEN 5
      WHEN 'Titanium' THEN 6
      ELSE 0
    END
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.customer_available_coupons(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.customer_claim_coupon(
  p_customer_id uuid,
  p_coupon_id uuid
)
RETURNS TABLE (
  redemption_id uuid,
  coupon_name text,
  points_spent numeric,
  balance_after numeric,
  remaining_this_month integer
) AS $$
DECLARE
  v_coupon record;
  v_balance numeric(12,2);
  v_claimed_this_month integer;
  v_redemption_id uuid;
  v_customer_tier text;
  v_claim_code text;
BEGIN
  SELECT *
  INTO v_coupon
  FROM public.coupons
  WHERE id = p_coupon_id
    AND is_active = true;

  IF v_coupon.id IS NULL THEN
    RAISE EXCEPTION 'Coupon not found.';
  END IF;

  SELECT points_balance
  INTO v_balance
  FROM public.customers
  WHERE id = p_customer_id
    AND is_active = true
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Customer not found.';
  END IF;

  SELECT
    CASE
      WHEN COALESCE(SUM(pt.amount) FILTER (WHERE pt.type = 'earn'), 0) >= 5000 THEN 'Titanium'
      WHEN COALESCE(SUM(pt.amount) FILTER (WHERE pt.type = 'earn'), 0) >= 3000 THEN 'Diamond'
      WHEN COALESCE(SUM(pt.amount) FILTER (WHERE pt.type = 'earn'), 0) >= 1000 THEN 'Platinum'
      WHEN COALESCE(SUM(pt.amount) FILTER (WHERE pt.type = 'earn'), 0) >= 500 THEN 'Gold'
      WHEN COALESCE(SUM(pt.amount) FILTER (WHERE pt.type = 'earn'), 0) >= 300 THEN 'Silver'
      ELSE 'Bronze'
    END
  INTO v_customer_tier
  FROM public.customers c
  LEFT JOIN public.points_transactions pt ON pt.customer_id = c.id
  WHERE c.id = p_customer_id
  GROUP BY c.id;

  IF (
    CASE v_customer_tier
      WHEN 'Bronze' THEN 1
      WHEN 'Silver' THEN 2
      WHEN 'Gold' THEN 3
      WHEN 'Platinum' THEN 4
      WHEN 'Diamond' THEN 5
      WHEN 'Titanium' THEN 6
      ELSE 0
    END
  ) < (
    CASE v_coupon.minimum_tier
      WHEN 'Bronze' THEN 1
      WHEN 'Silver' THEN 2
      WHEN 'Gold' THEN 3
      WHEN 'Platinum' THEN 4
      WHEN 'Diamond' THEN 5
      WHEN 'Titanium' THEN 6
      ELSE 0
    END
  ) THEN
    RAISE EXCEPTION 'This coupon requires % tier or higher.', v_coupon.minimum_tier;
  END IF;

  IF v_balance < v_coupon.points_cost THEN
    RAISE EXCEPTION 'Not enough points for this coupon.';
  END IF;

  SELECT COUNT(*)
  INTO v_claimed_this_month
  FROM public.coupon_redemptions
  WHERE customer_id = p_customer_id
    AND coupon_id = p_coupon_id
    AND status IN ('claimed', 'used')
    AND date_trunc('month', claimed_at) = date_trunc('month', now());

  IF v_claimed_this_month >= v_coupon.monthly_limit THEN
    RAISE EXCEPTION 'Monthly coupon limit reached.';
  END IF;

  UPDATE public.customers
  SET points_balance = points_balance - v_coupon.points_cost
  WHERE id = p_customer_id
  RETURNING points_balance INTO v_balance;

  LOOP
    v_claim_code := upper(substring(encode(extensions.gen_random_bytes(5), 'hex') from 1 for 10));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.coupon_redemptions
      WHERE claim_code = v_claim_code
    );
  END LOOP;

  INSERT INTO public.coupon_redemptions (
    coupon_id,
    customer_id,
    claim_code,
    points_spent,
    status
  )
  VALUES (
    p_coupon_id,
    p_customer_id,
    v_claim_code,
    v_coupon.points_cost,
    'claimed'
  )
  RETURNING id INTO v_redemption_id;

  INSERT INTO public.points_transactions (
    customer_id,
    type,
    amount,
    balance_after,
    notes
  )
  VALUES (
    p_customer_id,
    'redeem',
    v_coupon.points_cost,
    v_balance,
    'Coupon redeemed: ' || v_coupon.name
  );

  RETURN QUERY
  SELECT
    v_redemption_id,
    v_coupon.name,
    v_coupon.points_cost,
    v_balance,
    GREATEST(v_coupon.monthly_limit - (v_claimed_this_month + 1), 0)::integer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.customer_claim_coupon(uuid, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.customer_coupon_history(p_customer_id uuid)
RETURNS TABLE (
  id uuid,
  coupon_name text,
  discount_amount numeric,
  claim_code text,
  points_spent numeric,
  status text,
  claimed_date text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.id,
    c.name,
    c.discount_amount,
    cr.claim_code,
    cr.points_spent,
    cr.status,
    to_char(cr.claimed_at, 'Mon DD, YYYY')
  FROM public.coupon_redemptions cr
  JOIN public.coupons c ON c.id = cr.coupon_id
  WHERE cr.customer_id = p_customer_id
  ORDER BY cr.claimed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.customer_coupon_history(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_create_coupon(
  p_staff_id uuid,
  p_name text,
  p_description text,
  p_reward_type text,
  p_points_cost numeric,
  p_discount_amount numeric,
  p_monthly_limit integer,
  p_minimum_tier text DEFAULT 'Bronze'
)
RETURNS uuid AS $$
DECLARE
  v_coupon_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE id = p_staff_id AND is_active = true) THEN
    RAISE EXCEPTION 'Only active staff can create coupons.';
  END IF;

  IF trim(p_name) = '' THEN
    RAISE EXCEPTION 'Coupon name is required.';
  END IF;

  IF p_minimum_tier NOT IN ('Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Titanium') THEN
    RAISE EXCEPTION 'Invalid minimum tier.';
  END IF;

  INSERT INTO public.coupons (name, description, reward_type, points_cost, discount_amount, monthly_limit, minimum_tier, created_by)
  VALUES (trim(p_name), p_description, p_reward_type, p_points_cost, p_discount_amount, p_monthly_limit, p_minimum_tier, p_staff_id)
  RETURNING id INTO v_coupon_id;

  RETURN v_coupon_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.admin_create_coupon(uuid, text, text, text, numeric, numeric, integer, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_create_staff(
  p_owner_staff_id uuid,
  p_full_name text,
  p_phone text,
  p_pin text,
  p_role text
)
RETURNS uuid AS $$
DECLARE
  v_staff_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff
    WHERE id = p_owner_staff_id
      AND role IN ('owner', 'admin')
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only admin or owner accounts can add staff.';
  END IF;

  IF length(regexp_replace(p_phone, '\D', '', 'g')) <> 11 THEN
    RAISE EXCEPTION 'Mobile number must be 11 digits.';
  END IF;

  IF length(p_pin) <> 4 THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits.';
  END IF;

  INSERT INTO public.staff (full_name, phone, pin_hash, role, is_active)
  VALUES (trim(p_full_name), regexp_replace(p_phone, '\D', '', 'g'), extensions.crypt(p_pin, extensions.gen_salt('bf')), p_role, true)
  ON CONFLICT (phone)
  DO UPDATE SET
    full_name = EXCLUDED.full_name,
    pin_hash = EXCLUDED.pin_hash,
    role = EXCLUDED.role,
    is_active = true
  RETURNING id INTO v_staff_id;

  RETURN v_staff_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.admin_create_staff(uuid, text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_staff()
RETURNS TABLE (
  id uuid,
  full_name text,
  phone text,
  role text,
  is_active boolean,
  created_at_label text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.full_name,
    s.phone,
    s.role,
    s.is_active,
    to_char(s.created_at, 'Mon DD, YYYY') AS created_at_label
  FROM public.staff s
  ORDER BY s.created_at DESC, s.full_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.admin_list_staff() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_deactivate_staff(
  p_actor_staff_id uuid,
  p_target_staff_id uuid
)
RETURNS void AS $$
DECLARE
  v_target_role text;
  v_active_admin_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.staff
    WHERE id = p_actor_staff_id
      AND role IN ('owner', 'admin')
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only admin or owner accounts can remove staff.';
  END IF;

  IF p_actor_staff_id = p_target_staff_id THEN
    RAISE EXCEPTION 'You cannot remove your own account.';
  END IF;

  SELECT role
  INTO v_target_role
  FROM public.staff
  WHERE id = p_target_staff_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Staff account not found.';
  END IF;

  IF v_target_role IN ('owner', 'admin') THEN
    SELECT COUNT(*)
    INTO v_active_admin_count
    FROM public.staff
    WHERE role IN ('owner', 'admin')
      AND is_active = true;

    IF v_active_admin_count <= 1 THEN
      RAISE EXCEPTION 'At least one active admin account must remain.';
    END IF;
  END IF;

  UPDATE public.staff
  SET is_active = false
  WHERE id = p_target_staff_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.admin_deactivate_staff(uuid, uuid) TO anon, authenticated;

-- Customer app profile with lifetime totals for Transactions page.
CREATE OR REPLACE FUNCTION public.customer_app_profile(p_customer_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  phone text,
  points_balance numeric,
  lifetime_earned numeric,
  total_redeemed numeric,
  tier text,
  rfid_uid text,
  qr_token text,
  member_since text
) AS $$
BEGIN
  RETURN QUERY
  WITH point_totals AS (
    SELECT
      c.id AS customer_id,
      COALESCE(SUM(pt.amount) FILTER (WHERE pt.type = 'earn'), 0) AS lifetime_earned,
      COALESCE(SUM(pt.amount) FILTER (WHERE pt.type IN ('redeem', 'adjust')), 0) AS total_redeemed
    FROM public.customers c
    LEFT JOIN public.points_transactions pt ON pt.customer_id = c.id
    WHERE c.id = p_customer_id
    GROUP BY c.id
  )
  SELECT
    c.id,
    c.full_name,
    c.phone,
    c.points_balance,
    ptot.lifetime_earned,
    ptot.total_redeemed,
    CASE
      WHEN ptot.lifetime_earned >= 5000 THEN 'Titanium'
      WHEN ptot.lifetime_earned >= 3000 THEN 'Diamond'
      WHEN ptot.lifetime_earned >= 1000 THEN 'Platinum'
      WHEN ptot.lifetime_earned >= 500 THEN 'Gold'
      WHEN ptot.lifetime_earned >= 300 THEN 'Silver'
      ELSE 'Bronze'
    END AS tier,
    ca.rfid_uid,
    ca.qr_token,
    'Member since ' || to_char(c.created_at, 'Mon YYYY') AS member_since
  FROM public.customers c
  JOIN point_totals ptot ON ptot.customer_id = c.id
  LEFT JOIN LATERAL (
    SELECT cards.rfid_uid, cards.qr_token
    FROM public.cards
    WHERE cards.customer_id = c.id
      AND cards.is_active = true
    ORDER BY cards.created_at DESC
    LIMIT 1
  ) ca ON true
  WHERE c.id = p_customer_id
    AND c.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.customer_app_profile(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.customer_recent_orders(p_customer_id uuid)
RETURNS TABLE (
  id uuid,
  order_number text,
  date_label text,
  order_status text,
  items text,
  total_amount numeric,
  points_earned numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    substring(o.id::text, 1, 8) AS order_number,
    to_char(o.created_at, 'Mon DD, HH12:MI AM') AS date_label,
    o.order_status,
    COALESCE(string_agg(oi.description, ' - ' ORDER BY oi.id), COALESCE(o.notes, 'Printing order')) AS items,
    o.total_amount,
    o.points_earned
  FROM public.orders o
  LEFT JOIN public.order_items oi ON oi.order_id = o.id
  WHERE o.customer_id = p_customer_id
  GROUP BY o.id
  ORDER BY o.created_at DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.customer_recent_orders(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.customer_transactions(p_customer_id uuid)
RETURNS TABLE (
  id uuid,
  type text,
  amount numeric,
  description text,
  date_label text,
  time_label text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pt.id,
    CASE WHEN pt.type = 'earn' THEN 'earn' ELSE 'redeem' END AS type,
    pt.amount,
    COALESCE(pt.notes, CASE WHEN pt.type = 'earn' THEN 'Points earned' ELSE 'Points redeemed' END) AS description,
    to_char(pt.created_at, 'Mon DD, YYYY') AS date_label,
    to_char(pt.created_at, 'HH12:MI AM') AS time_label
  FROM public.points_transactions pt
  WHERE pt.customer_id = p_customer_id
  ORDER BY pt.created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.customer_transactions(uuid) TO anon, authenticated;

-- Add default tracking rows for existing orders that do not have tracking yet.
-- DO $$
-- DECLARE
--   v_order record;
-- BEGIN
--   FOR v_order IN SELECT id FROM public.orders
--   LOOP
--     PERFORM public.ensure_order_tracking(v_order.id);

--     UPDATE public.order_tracking_steps
--     SET
--       step_name = CASE step_key
--         WHEN 'designing' THEN 'Designing'
--         WHEN 'printing' THEN 'Printing'
--         WHEN 'cutting' THEN 'Cutting'
--         WHEN 'ready' THEN 'Ready to pick up'
--         WHEN 'claimed' THEN 'Claimed'
--         ELSE step_name
--       END,
--       sort_order = CASE step_key
--         WHEN 'designing' THEN 1
--         WHEN 'printing' THEN 2
--         WHEN 'cutting' THEN 3
--         WHEN 'ready' THEN 4
--         WHEN 'claimed' THEN 5
--         ELSE sort_order
--       END
--     WHERE order_id = v_order.id;
--   END LOOP;
-- END;
-- $$;

CREATE OR REPLACE FUNCTION public.customer_order_tracking(
  p_customer_id uuid,
  p_order_id uuid
)
RETURNS TABLE (
  id uuid,
  step_key text,
  step_name text,
  sort_order integer,
  status text,
  updated_at timestamptz
) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = p_order_id
      AND o.customer_id = p_customer_id
  ) THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  PERFORM public.ensure_order_tracking(p_order_id);

  RETURN QUERY
  SELECT
    ots.id,
    ots.step_key,
    ots.step_name,
    ots.sort_order,
    ots.status,
    ots.updated_at
  FROM public.order_tracking_steps ots
  WHERE ots.order_id = p_order_id
  ORDER BY ots.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.customer_order_tracking(uuid, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_orders()
RETURNS TABLE (
  id uuid,
  order_number text,
  customer_id uuid,
  customer_name text,
  customer_phone text,
  date_label text,
  order_status text,
  items text,
  total_amount numeric,
  points_earned numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    substring(o.id::text, 1, 8) AS order_number,
    c.id AS customer_id,
    c.full_name AS customer_name,
    c.phone AS customer_phone,
    to_char(o.created_at, 'Mon DD, HH12:MI AM') AS date_label,
    o.order_status,
    COALESCE(string_agg(oi.description, ' - ' ORDER BY oi.id), COALESCE(o.notes, 'Printing order')) AS items,
    o.total_amount,
    o.points_earned
  FROM public.orders o
  JOIN public.customers c ON c.id = o.customer_id
  LEFT JOIN public.order_items oi ON oi.order_id = o.id
  GROUP BY o.id, c.id, c.full_name, c.phone
  ORDER BY o.created_at DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.admin_list_orders() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_order_tracking(p_order_id uuid)
RETURNS TABLE (
  id uuid,
  step_key text,
  step_name text,
  sort_order integer,
  status text,
  updated_at timestamptz
) AS $$
BEGIN
  PERFORM public.ensure_order_tracking(p_order_id);

  RETURN QUERY
  SELECT
    ots.id,
    ots.step_key,
    ots.step_name,
    ots.sort_order,
    ots.status,
    ots.updated_at
  FROM public.order_tracking_steps ots
  WHERE ots.order_id = p_order_id
  ORDER BY ots.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.admin_order_tracking(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_tracking_step(
  p_staff_id uuid,
  p_step_id uuid,
  p_status text
)
RETURNS void AS $$
DECLARE
  v_order_id uuid;
  v_sort_order integer;
  v_done_sort integer;
  v_next_step_id uuid;
  v_max_active_sort integer;
  v_active_key text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE id = p_staff_id AND is_active = true) THEN
    RAISE EXCEPTION 'Only active staff can update order tracking.';
  END IF;

  IF p_status NOT IN ('pending', 'current', 'done') THEN
    RAISE EXCEPTION 'Invalid tracking status.';
  END IF;

  SELECT order_id, sort_order
  INTO v_order_id, v_sort_order
  FROM public.order_tracking_steps
  WHERE id = p_step_id;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'Tracking step not found.';
  END IF;

  IF p_status = 'current' THEN
    UPDATE public.order_tracking_steps
    SET
      status = CASE
        WHEN sort_order < v_sort_order THEN 'done'
        WHEN sort_order = v_sort_order THEN 'current'
        ELSE 'pending'
      END,
      updated_by = p_staff_id,
      updated_at = now()
    WHERE order_id = v_order_id;
  ELSIF p_status = 'done' THEN
    UPDATE public.order_tracking_steps
    SET status = 'done',
        updated_by = p_staff_id,
        updated_at = now()
    WHERE order_id = v_order_id
      AND sort_order <= v_sort_order;

    UPDATE public.order_tracking_steps
    SET status = 'current',
        updated_by = p_staff_id,
        updated_at = now()
    WHERE order_id = v_order_id
      AND sort_order = v_sort_order + 1
      AND status <> 'done';
  ELSE
    UPDATE public.order_tracking_steps
    SET status = 'pending',
        updated_by = p_staff_id,
        updated_at = now()
    WHERE order_id = v_order_id
      AND sort_order >= v_sort_order;
  END IF;

  SELECT COALESCE(MAX(sort_order), 0)
  INTO v_done_sort
  FROM public.order_tracking_steps
  WHERE order_id = v_order_id
    AND status = 'done';

  UPDATE public.order_tracking_steps
  SET status = 'pending',
      updated_by = p_staff_id,
      updated_at = now()
  WHERE order_id = v_order_id
    AND sort_order > v_done_sort;

  SELECT id
  INTO v_next_step_id
  FROM public.order_tracking_steps
  WHERE order_id = v_order_id
    AND sort_order = v_done_sort + 1
  LIMIT 1;

  IF v_next_step_id IS NOT NULL THEN
    UPDATE public.order_tracking_steps
    SET status = 'current',
        updated_by = p_staff_id,
        updated_at = now()
    WHERE id = v_next_step_id;
  END IF;

  SELECT sort_order, step_key
  INTO v_max_active_sort, v_active_key
  FROM public.order_tracking_steps
  WHERE order_id = v_order_id
    AND status IN ('current', 'done')
  ORDER BY sort_order DESC
  LIMIT 1;

  UPDATE public.orders
  SET order_status = CASE
    WHEN v_active_key = 'claimed' AND EXISTS (
      SELECT 1 FROM public.order_tracking_steps
      WHERE order_id = v_order_id AND step_key = 'claimed' AND status = 'done'
    ) THEN 'claimed'
    WHEN v_active_key IN ('ready', 'claimed') THEN 'ready'
    WHEN COALESCE(v_max_active_sort, 1) >= 2 THEN 'in_progress'
    ELSE 'pending'
  END
  WHERE id = v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.admin_set_tracking_step(uuid, uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_rename_tracking_step(
  p_staff_id uuid,
  p_step_id uuid,
  p_step_name text
)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE id = p_staff_id AND is_active = true) THEN
    RAISE EXCEPTION 'Only active staff can rename tracking steps.';
  END IF;

  IF trim(COALESCE(p_step_name, '')) = '' THEN
    RAISE EXCEPTION 'Step name is required.';
  END IF;

  UPDATE public.order_tracking_steps
  SET
    step_name = trim(p_step_name),
    updated_by = p_staff_id,
    updated_at = now()
  WHERE id = p_step_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.admin_rename_tracking_step(uuid, uuid, text) TO anon, authenticated;

-- Refresh Supabase/PostgREST schema cache so RPCs appear immediately.
NOTIFY pgrst, 'reload schema';

-- Optional: reset your admin PIN to 0720.
-- Remove/comment this if you do not want to change the PIN.
UPDATE public.staff
SET pin_hash = extensions.crypt('0720', extensions.gen_salt('bf'))
WHERE phone = '09703556786';

-- Manual checks. These should return true/rows.
SELECT public.staff_phone_exists('09703556786') AS admin_number_exists;
SELECT * FROM public.staff_login('09703556786', '0720');
