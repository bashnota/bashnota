create extension if not exists pgcrypto with schema extensions;

create type public.vote_type as enum ('like', 'dislike');

create table public.identity_map (
  firebase_uid text primary key,
  supabase_user_id uuid not null unique references auth.users(id) on delete restrict,
  provider_links jsonb not null default '{}'::jsonb,
  migrated_at timestamptz not null default now(),
  source_hash text not null,
  constraint identity_map_pair_unique unique (firebase_uid, supabase_user_id),
  constraint identity_map_firebase_uid_nonempty check (firebase_uid <> ''),
  constraint identity_map_provider_links_object check (jsonb_typeof(provider_links) = 'object')
);

create table public.private_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  firebase_uid text not null unique,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_created_at_raw text,
  source_updated_at_raw text,
  constraint private_profiles_identity_fk foreign key (firebase_uid, user_id)
    references public.identity_map(firebase_uid, supabase_user_id) on update restrict on delete restrict
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  user_tag text collate "C" not null unique,
  photo_url text not null default '',
  updated_at timestamptz not null default now(),
  constraint profiles_tag_user_unique unique (user_tag, user_id),
  constraint profiles_user_tag_format check (user_tag ~ '^[a-zA-Z0-9_]{3,30}$')
);

create table public.user_tags (
  user_tag text collate "C" primary key,
  user_id uuid not null unique references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_tags_format check (user_tag ~ '^[a-zA-Z0-9_]{3,30}$'),
  constraint user_tags_matches_profile unique (user_tag, user_id),
  constraint user_tags_profile_fk foreign key (user_tag, user_id)
    references public.profiles(user_tag, user_id) on update restrict on delete cascade
);

create view public.public_profiles
with (security_invoker = true)
as select user_id, user_tag, photo_url, updated_at from public.profiles;

create table public.published_notas (
  id text primary key,
  author_id uuid not null references auth.users(id) on delete restrict,
  legacy_author_uid text not null,
  title text not null,
  content jsonb,
  content_quarantine_text text,
  author_name text not null default '',
  is_public boolean not null default true,
  is_sub_page boolean not null default false,
  parent_id text references public.published_notas(id) deferrable initially deferred,
  published_sub_pages text[] not null default '{}',
  citations jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  published_at timestamptz not null,
  updated_at timestamptz not null,
  source_published_at_raw text,
  source_updated_at_raw text,
  view_count bigint not null default 0,
  unique_viewers bigint not null default 0,
  like_count bigint not null default 0,
  dislike_count bigint not null default 0,
  clone_count bigint not null default 0,
  comment_count bigint not null default 0,
  last_viewed_at timestamptz,
  constraint published_notas_id_nonempty check (id <> ''),
  constraint published_notas_content_one_representation check (
    content is null or content_quarantine_text is null
  ),
  constraint published_notas_citations_array check (jsonb_typeof(citations) = 'array'),
  constraint published_notas_counts_nonnegative check (
    view_count >= 0 and unique_viewers >= 0 and like_count >= 0 and
    dislike_count >= 0 and clone_count >= 0 and comment_count >= 0
  ),
  constraint published_notas_identity_fk foreign key (legacy_author_uid, author_id)
    references public.identity_map(firebase_uid, supabase_user_id) on update restrict on delete restrict
);

create table public.nota_votes (
  nota_id text not null references public.published_notas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote public.vote_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (nota_id, user_id)
);

create table public.comments (
  id text primary key,
  nota_id text not null references public.published_notas(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  legacy_author_uid text not null,
  author_name text not null,
  author_tag text,
  content jsonb not null,
  parent_id text references public.comments(id) deferrable initially deferred,
  like_count bigint not null default 0,
  dislike_count bigint not null default 0,
  reply_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_created_at_raw text,
  source_updated_at_raw text,
  constraint comments_id_nonempty check (id <> ''),
  constraint comments_counts_nonnegative check (
    like_count >= 0 and dislike_count >= 0 and reply_count >= 0
  ),
  constraint comments_not_self_parent check (parent_id is null or parent_id <> id),
  constraint comments_identity_fk foreign key (legacy_author_uid, author_id)
    references public.identity_map(firebase_uid, supabase_user_id) on update restrict on delete restrict
);

create table public.comment_votes (
  comment_id text not null references public.comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote public.vote_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table public.nota_viewers (
  nota_id text not null references public.published_notas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  first_viewed_at timestamptz not null default now(),
  primary key (nota_id, user_id)
);

create table public.nota_view_events (
  id uuid primary key default extensions.gen_random_uuid(),
  nota_id text not null references public.published_notas(id) on delete cascade,
  viewer_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  referrer_key text,
  constraint nota_view_events_referrer_format check (
    referrer_key is null or referrer_key ~ '^[a-zA-Z0-9.-]{1,50}$'
  )
);

create table public.nota_view_aggregates (
  nota_id text not null references public.published_notas(id) on delete cascade,
  bucket_kind text not null,
  bucket_key text not null,
  view_count bigint not null default 0,
  primary key (nota_id, bucket_kind, bucket_key),
  constraint nota_view_aggregates_kind check (bucket_kind in ('daily', 'weekly', 'monthly', 'referrer')),
  constraint nota_view_aggregates_count_nonnegative check (view_count >= 0)
);

create table public.newsletter_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  firebase_uid text not null unique,
  email text not null,
  display_name text,
  subscribed_at timestamptz not null default now(),
  source_subscribed_at_raw text,
  constraint newsletter_identity_fk foreign key (firebase_uid, user_id)
    references public.identity_map(firebase_uid, supabase_user_id) on update restrict on delete restrict
);

create index published_notas_public_published_idx
  on public.published_notas (published_at desc) where is_public and not is_sub_page;
create index published_notas_public_views_idx
  on public.published_notas (view_count desc) where is_public and not is_sub_page;
create index published_notas_public_likes_idx
  on public.published_notas (like_count desc) where is_public and not is_sub_page;
create index published_notas_author_idx on public.published_notas (author_id, updated_at desc);
create index comments_nota_parent_created_idx on public.comments (nota_id, parent_id, created_at desc);
create index nota_view_events_nota_occurred_idx on public.nota_view_events (nota_id, occurred_at desc);
create index nota_view_events_viewer_idx on public.nota_view_events (viewer_id) where viewer_id is not null;

comment on table public.identity_map is 'Restricted immutable Firebase-to-Supabase identity translation.';
comment on view public.public_profiles is 'Allowlisted anonymous profile projection; never add private profile columns.';
comment on table public.nota_view_events is 'Append-only events created only by record_nota_view().';
