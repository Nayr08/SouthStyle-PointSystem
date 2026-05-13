-- Recalculate historical earned points after changing rates.
--
-- New rates:
--   sublimation: PHP 300 = 1 point
--   acrylic_signs: PHP 300 = 1 point
--   tarpaulin_other_services: PHP 200 = 1 point
--
-- Run the PREVIEW queries first. Only run the APPLY transaction after the owner
-- approves the changes. This script updates paid, non-voided orders only.

-- ============================================================
-- PREVIEW: per-order changes
-- ============================================================
WITH recalculated_orders AS (
  SELECT
    o.id AS order_id,
    o.customer_id,
    c.full_name,
    c.phone,
    COALESCE(NULLIF(o.order_category, ''), 'tarpaulin_other_services') AS order_category,
    COALESCE(o.paid_amount, o.total_amount) AS paid_basis,
    COALESCE(o.points_earned, 0) AS old_points,
    round(
      (
        COALESCE(o.paid_amount, o.total_amount)
        / CASE
            WHEN COALESCE(NULLIF(o.order_category, ''), 'tarpaulin_other_services') IN ('sublimation', 'acrylic_signs') THEN 300
            ELSE 200
          END
      )::numeric,
      2
    ) AS new_points
  FROM public.orders o
  JOIN public.customers c ON c.id = o.customer_id
  WHERE o.payment_status = 'paid'
    AND o.order_status <> 'voided'
)
SELECT
  order_id,
  full_name,
  phone,
  order_category,
  paid_basis,
  old_points,
  new_points,
  new_points - old_points AS points_delta
FROM recalculated_orders
WHERE new_points <> old_points
ORDER BY full_name, order_id;

-- ============================================================
-- PREVIEW: per-customer balance impact
-- ============================================================
WITH recalculated_orders AS (
  SELECT
    o.customer_id,
    COALESCE(o.points_earned, 0) AS old_points,
    round(
      (
        COALESCE(o.paid_amount, o.total_amount)
        / CASE
            WHEN COALESCE(NULLIF(o.order_category, ''), 'tarpaulin_other_services') IN ('sublimation', 'acrylic_signs') THEN 300
            ELSE 200
          END
      )::numeric,
      2
    ) AS new_points
  FROM public.orders o
  WHERE o.payment_status = 'paid'
    AND o.order_status <> 'voided'
),
customer_deltas AS (
  SELECT
    customer_id,
    SUM(new_points - old_points) AS points_delta
  FROM recalculated_orders
  WHERE new_points <> old_points
  GROUP BY customer_id
)
SELECT
  c.id AS customer_id,
  c.full_name,
  c.phone,
  c.points_balance AS current_balance,
  d.points_delta,
  c.points_balance + d.points_delta AS projected_balance
FROM customer_deltas d
JOIN public.customers c ON c.id = d.customer_id
ORDER BY d.points_delta, c.full_name;

-- If any projected_balance below is negative, decide with the owner first.
-- A negative projected balance means the customer already used more points than
-- the recalculated system would have allowed.
WITH recalculated_orders AS (
  SELECT
    o.customer_id,
    COALESCE(o.points_earned, 0) AS old_points,
    round(
      (
        COALESCE(o.paid_amount, o.total_amount)
        / CASE
            WHEN COALESCE(NULLIF(o.order_category, ''), 'tarpaulin_other_services') IN ('sublimation', 'acrylic_signs') THEN 300
            ELSE 200
          END
      )::numeric,
      2
    ) AS new_points
  FROM public.orders o
  WHERE o.payment_status = 'paid'
    AND o.order_status <> 'voided'
),
customer_deltas AS (
  SELECT
    customer_id,
    SUM(new_points - old_points) AS points_delta
  FROM recalculated_orders
  WHERE new_points <> old_points
  GROUP BY customer_id
)
SELECT
  c.id AS customer_id,
  c.full_name,
  c.phone,
  c.points_balance AS current_balance,
  d.points_delta,
  c.points_balance + d.points_delta AS projected_balance
FROM customer_deltas d
JOIN public.customers c ON c.id = d.customer_id
WHERE c.points_balance + d.points_delta < 0
ORDER BY projected_balance;

-- ============================================================
-- APPLY: strict migration
-- ============================================================
-- This transaction aborts if any customer would become negative.
-- Uncomment COMMIT only after reviewing the preview output.

BEGIN;

CREATE TEMP TABLE tmp_recalculated_order_points ON COMMIT DROP AS
SELECT
  o.id AS order_id,
  o.customer_id,
  COALESCE(o.points_earned, 0) AS old_points,
  round(
    (
      COALESCE(o.paid_amount, o.total_amount)
      / CASE
          WHEN COALESCE(NULLIF(o.order_category, ''), 'tarpaulin_other_services') IN ('sublimation', 'acrylic_signs') THEN 300
          ELSE 200
        END
    )::numeric,
    2
  ) AS new_points
FROM public.orders o
WHERE o.payment_status = 'paid'
  AND o.order_status <> 'voided';

DO $$
BEGIN
  IF EXISTS (
    WITH customer_deltas AS (
      SELECT
        customer_id,
        SUM(new_points - old_points) AS points_delta
      FROM tmp_recalculated_order_points
      WHERE new_points <> old_points
      GROUP BY customer_id
    )
    SELECT 1
    FROM customer_deltas d
    JOIN public.customers c ON c.id = d.customer_id
    WHERE c.points_balance + d.points_delta < 0
  ) THEN
    RAISE EXCEPTION 'Migration stopped: at least one customer would have a negative points balance. Review the negative-balance preview first.';
  END IF;
END;
$$;

UPDATE public.orders o
SET points_earned = r.new_points
FROM tmp_recalculated_order_points r
WHERE o.id = r.order_id
  AND r.new_points <> r.old_points;

UPDATE public.points_transactions pt
SET
  amount = r.new_points,
  notes = COALESCE(NULLIF(pt.notes, ''), 'Points earned from fully paid order') || ' (recalculated for category rate)'
FROM tmp_recalculated_order_points r
WHERE pt.order_id = r.order_id
  AND pt.type = 'earn'
  AND r.new_points <> r.old_points;

WITH customer_deltas AS (
  SELECT
    customer_id,
    SUM(new_points - old_points) AS points_delta
  FROM tmp_recalculated_order_points
  WHERE new_points <> old_points
  GROUP BY customer_id
)
UPDATE public.customers c
SET points_balance = c.points_balance + d.points_delta
FROM customer_deltas d
WHERE c.id = d.customer_id;

-- Review affected customers before committing.
WITH customer_deltas AS (
  SELECT
    customer_id,
    SUM(new_points - old_points) AS points_delta
  FROM tmp_recalculated_order_points
  WHERE new_points <> old_points
  GROUP BY customer_id
)
SELECT
  c.full_name,
  c.phone,
  d.points_delta,
  c.points_balance AS updated_balance
FROM customer_deltas d
JOIN public.customers c ON c.id = d.customer_id
ORDER BY d.points_delta, c.full_name;

COMMIT;
-- ROLLBACK;
