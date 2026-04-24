create table public.cards (
  id uuid not null default extensions.uuid_generate_v4 (),
  customer_id uuid not null,
  rfid_uid text null,
  qr_token text not null default encode(extensions.gen_random_bytes (16), 'hex'::text),
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint cards_pkey primary key (id),
  constraint cards_qr_token_key unique (qr_token),
  constraint cards_rfid_uid_key unique (rfid_uid),
  constraint cards_customer_id_fkey foreign KEY (customer_id) references customers (id) on delete CASCADE,
  constraint cards_check check (
    (
      (rfid_uid is not null)
      or (qr_token is not null)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_cards_customer_id on public.cards using btree (customer_id) TABLESPACE pg_default;

create index IF not exists idx_cards_rfid_uid on public.cards using btree (rfid_uid) TABLESPACE pg_default;

create index IF not exists idx_cards_qr_token on public.cards using btree (qr_token) TABLESPACE pg_default;


create table public.coupon_redemptions (
  id uuid not null default extensions.uuid_generate_v4 (),
  coupon_id uuid not null,
  customer_id uuid not null,
  order_id uuid null,
  claim_code text null,
  points_spent numeric(12, 2) not null,
  status text not null default 'claimed'::text,
  staff_id uuid null,
  claimed_at timestamp with time zone not null default now(),
  used_at timestamp with time zone null,
  constraint coupon_redemptions_pkey primary key (id),
  constraint coupon_redemptions_coupon_id_fkey foreign KEY (coupon_id) references coupons (id),
  constraint coupon_redemptions_customer_id_fkey foreign KEY (customer_id) references customers (id),
  constraint coupon_redemptions_order_id_fkey foreign KEY (order_id) references orders (id),
  constraint coupon_redemptions_staff_id_fkey foreign KEY (staff_id) references staff (id),
  constraint coupon_redemptions_claim_code_key unique (claim_code),
  constraint coupon_redemptions_points_spent_check check ((points_spent > (0)::numeric)),
  constraint coupon_redemptions_status_check check (
    (
      status = any (
        array[
          'claimed'::text,
          'used'::text,
          'expired'::text,
          'cancelled'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;


create table public.coupons (
  id uuid not null default extensions.uuid_generate_v4 (),
  name text not null,
  description text null,
  reward_type text not null default 'discount'::text,
  points_cost numeric(12, 2) not null,
  discount_amount numeric(10, 2) null,
  monthly_limit integer not null default 2,
  is_active boolean not null default true,
  created_by uuid null,
  created_at timestamp with time zone not null default now(),
  minimum_tier text not null default 'Bronze'::text,
  constraint coupons_pkey primary key (id),
  constraint coupons_created_by_fkey foreign KEY (created_by) references staff (id),
  constraint coupons_minimum_tier_check check (
    (
      minimum_tier = any (
        array[
          'Bronze'::text,
          'Silver'::text,
          'Gold'::text,
          'Platinum'::text,
          'Diamond'::text,
          'Titanium'::text
        ]
      )
    )
  ),
  constraint coupons_points_cost_check check ((points_cost > (0)::numeric)),
  constraint coupons_reward_type_check check (
    (
      reward_type = any (array['discount'::text, 'free_service'::text])
    )
  ),
  constraint coupons_monthly_limit_check check ((monthly_limit > 0)),
  constraint coupons_discount_amount_check check (
    (
      (discount_amount is null)
      or (discount_amount >= (0)::numeric)
    )
  )
) TABLESPACE pg_default;


create table public.customers (
  id uuid not null default extensions.uuid_generate_v4 (),
  full_name text not null,
  phone text not null,
  pin_hash text null,
  points_balance numeric(12, 2) not null default 0,
  is_active boolean not null default true,
  created_by uuid null,
  created_at timestamp with time zone not null default now(),
  constraint customers_pkey primary key (id),
  constraint customers_phone_key unique (phone),
  constraint customers_created_by_fkey foreign KEY (created_by) references staff (id),
  constraint customers_points_balance_check check ((points_balance >= (0)::numeric))
) TABLESPACE pg_default;

create index IF not exists idx_customers_phone on public.customers using btree (phone) TABLESPACE pg_default;


create table public.order_items (
  id uuid not null default extensions.uuid_generate_v4 (),
  order_id uuid not null,
  service_id uuid null,
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit_price numeric(10, 2) not null,
  line_total numeric(10, 2) not null,
  constraint order_items_pkey primary key (id),
  constraint order_items_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint order_items_service_id_fkey foreign KEY (service_id) references services (id),
  constraint order_items_line_total_check check ((line_total >= (0)::numeric)),
  constraint order_items_quantity_check check ((quantity > (0)::numeric)),
  constraint order_items_unit_price_check check ((unit_price >= (0)::numeric))
) TABLESPACE pg_default;


create table public.order_tracking_steps (
  id uuid not null default extensions.gen_random_uuid (),
  order_id uuid not null,
  step_key text not null,
  step_name text not null,
  sort_order integer not null,
  status text not null default 'pending'::text,
  updated_by uuid null,
  updated_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  constraint order_tracking_steps_pkey primary key (id),
  constraint order_tracking_steps_order_id_sort_order_key unique (order_id, sort_order),
  constraint order_tracking_steps_order_id_step_key_key unique (order_id, step_key),
  constraint order_tracking_steps_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint order_tracking_steps_updated_by_fkey foreign KEY (updated_by) references staff (id),
  constraint order_tracking_steps_status_check check (
    (
      status = any (
        array['pending'::text, 'current'::text, 'done'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_order_tracking_steps_order_id on public.order_tracking_steps using btree (order_id) TABLESPACE pg_default;



create table public.orders (
  id uuid not null default extensions.uuid_generate_v4 (),
  customer_id uuid not null,
  total_amount numeric(10, 2) not null,
  points_earned numeric(12, 2) not null default 0,
  payment_status text not null default 'unpaid'::text,
  order_status text not null default 'pending'::text,
  notes text null,
  created_by uuid null,
  voided_by uuid null,
  void_reason text null,
  voided_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint orders_pkey primary key (id),
  constraint orders_customer_id_fkey foreign KEY (customer_id) references customers (id),
  constraint orders_voided_by_fkey foreign KEY (voided_by) references staff (id),
  constraint orders_created_by_fkey foreign KEY (created_by) references staff (id),
  constraint orders_order_status_check check (
    (
      order_status = any (
        array[
          'pending'::text,
          'in_progress'::text,
          'ready'::text,
          'claimed'::text,
          'voided'::text
        ]
      )
    )
  ),
  constraint orders_points_earned_check check ((points_earned >= (0)::numeric)),
  constraint orders_total_amount_check check ((total_amount >= (0)::numeric)),
  constraint orders_payment_status_check check (
    (
      payment_status = any (
        array['unpaid'::text, 'paid'::text, 'voided'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_orders_customer_id on public.orders using btree (customer_id) TABLESPACE pg_default;

create index IF not exists idx_orders_status on public.orders using btree (order_status) TABLESPACE pg_default;

create trigger orders_updated_at BEFORE
update on orders for EACH row
execute FUNCTION update_updated_at ();


create table public.points_transactions (
  id uuid not null default extensions.uuid_generate_v4 (),
  customer_id uuid not null,
  order_id uuid null,
  type text not null,
  amount numeric(12, 2) not null,
  balance_after numeric(12, 2) not null,
  staff_id uuid null,
  notes text null,
  created_at timestamp with time zone not null default now(),
  constraint points_transactions_pkey primary key (id),
  constraint points_transactions_customer_id_fkey foreign KEY (customer_id) references customers (id),
  constraint points_transactions_order_id_fkey foreign KEY (order_id) references orders (id),
  constraint points_transactions_staff_id_fkey foreign KEY (staff_id) references staff (id),
  constraint points_transactions_balance_after_check check ((balance_after >= (0)::numeric)),
  constraint points_transactions_type_check check (
    (
      type = any (
        array[
          'earn'::text,
          'redeem'::text,
          'adjust'::text,
          'void_reversal'::text
        ]
      )
    )
  ),
  constraint points_transactions_amount_check check ((amount > (0)::numeric))
) TABLESPACE pg_default;

create unique INDEX IF not exists one_earn_transaction_per_order on public.points_transactions using btree (order_id) TABLESPACE pg_default
where
  (
    (type = 'earn'::text)
    and (order_id is not null)
  );

create index IF not exists idx_points_transactions_customer_id on public.points_transactions using btree (customer_id) TABLESPACE pg_default;


create table public.services (
  id uuid not null default extensions.uuid_generate_v4 (),
  name text not null,
  category text null,
  default_price numeric(10, 2) not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint services_pkey primary key (id),
  constraint services_default_price_check check ((default_price >= (0)::numeric))
) TABLESPACE pg_default;

create table public.staff (
  id uuid not null default extensions.uuid_generate_v4 (),
  auth_id uuid null,
  full_name text not null,
  role text not null default 'staff'::text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  phone text null,
  pin_hash text null,
  constraint staff_pkey primary key (id),
  constraint staff_auth_id_key unique (auth_id),
  constraint staff_phone_key unique (phone),
  constraint staff_auth_id_fkey foreign KEY (auth_id) references auth.users (id) on delete CASCADE,
  constraint staff_role_check check (
    (role = any (array['owner'::text, 'staff'::text]))
  )
) TABLESPACE pg_default;

create index IF not exists idx_staff_auth_id on public.staff using btree (auth_id) TABLESPACE pg_default;

create index IF not exists idx_staff_phone on public.staff using btree (phone) TABLESPACE pg_default;



