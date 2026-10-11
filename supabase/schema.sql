create extension if not exists pgcrypto;

create table user_profiles (
  id uuid primary key default gen_random_uuid(),
  city text,
  shopping_channels text[] not null default '{}',
  activity_areas jsonb not null default '[]'::jsonb,
  household_size integer not null default 1 check (household_size > 0),
  meals_per_week integer not null default 3 check (meals_per_week >= 0),
  budget_per_meal numeric check (budget_per_meal >= 0),
  max_cooking_minutes integer check (max_cooking_minutes >= 0),
  cooking_level text not null check (cooking_level in ('beginner', 'intermediate', 'advanced')),
  dislikes_complex_prep boolean not null default true,
  willing_to_stock boolean not null default false,
  price_sensitivity text not null check (price_sensitivity in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table price_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  food_name text not null,
  normalized_food_name text not null,
  price numeric not null check (price >= 0),
  unit text not null,
  store text,
  city text,
  observed_at timestamptz not null,
  source text not null default 'personal_observation',
  created_at timestamptz not null default now()
);

create index price_observations_food_time_idx
  on price_observations(user_id, normalized_food_name, observed_at desc);

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  food_name text not null,
  normalized_food_name text not null,
  quantity numeric,
  unit text,
  storage_method text,
  purchased_at timestamptz not null,
  expires_at timestamptz,
  status text not null default 'available' check (status in ('available', 'used', 'wasted'))
);

create table purchase_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  observation_id uuid references price_observations(id) on delete set null,
  food_name text not null,
  quantity numeric,
  unit text,
  purchased_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table usage_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  food_name text not null,
  outcome text not null check (outcome in ('used', 'wasted', 'too_hard', 'liked', 'disliked')),
  note text,
  created_at timestamptz not null default now()
);
