-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Organizations
create table organizations (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    created_at timestamptz default now(),
    settings jsonb default '{}'::jsonb
);

-- Users
create table users (
    id uuid default uuid_generate_v4() primary key,
    email text unique not null,
    full_name text not null,
    avatar_url text,
    created_at timestamptz default now(),
    last_seen_at timestamptz
);

-- Organization Members (connects users to organizations with roles)
create table organization_members (
    organization_id uuid references organizations(id) on delete cascade,
    user_id uuid references users(id) on delete cascade,
    role text not null check (role in ('admin', 'moderator', 'member')),
    created_at timestamptz default now(),
    primary key (organization_id, user_id)
);

-- Channels
create table channels (
    id uuid default uuid_generate_v4() primary key,
    organization_id uuid references organizations(id) on delete cascade,
    name text not null,
    description text,
    message_expiration_hours int not null default 168, -- 1 week default
    created_at timestamptz default now(),
    settings jsonb default '{}'::jsonb,
    unique(organization_id, name)
);

-- Channel Members
create table channel_members (
    channel_id uuid references channels(id) on delete cascade,
    user_id uuid references users(id) on delete cascade,
    role text not null check (role in ('moderator', 'member')),
    created_at timestamptz default now(),
    primary key (channel_id, user_id)
);

-- Rooms
create table rooms (
    id uuid default uuid_generate_v4() primary key,
    organization_id uuid references organizations(id) on delete cascade,
    name text not null,
    description text,
    created_at timestamptz default now(),
    ended_at timestamptz,
    created_by uuid references users(id),
    settings jsonb default '{}'::jsonb
);

-- Room Members
create table room_members (
    room_id uuid references rooms(id) on delete cascade,
    user_id uuid references users(id) on delete cascade,
    created_at timestamptz default now(),
    primary key (room_id, user_id)
);

-- Chats (Direct Messages)
create table chats (
    id uuid default uuid_generate_v4() primary key,
    organization_id uuid references organizations(id) on delete cascade,
    created_at timestamptz default now(),
    last_message_at timestamptz
);

-- Chat Members (always 2 people)
create table chat_members (
    chat_id uuid references chats(id) on delete cascade,
    user_id uuid references users(id) on delete cascade,
    created_at timestamptz default now(),
    primary key (chat_id, user_id)
);

-- Messages (unified table for channels, rooms, and chats)
create table messages (
    id uuid default uuid_generate_v4() primary key,
    content text not null,
    user_id uuid references users(id) on delete set null,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    -- One of these will be set, others null
    channel_id uuid references channels(id) on delete cascade,
    room_id uuid references rooms(id) on delete cascade,
    chat_id uuid references chats(id) on delete cascade,
    -- For threading
    parent_id uuid references messages(id) on delete cascade,
    -- For files/attachments
    attachments jsonb default '[]'::jsonb,
    check (
        (channel_id is not null)::integer +
        (room_id is not null)::integer +
        (chat_id is not null)::integer = 1
    )
);

-- Reactions
create table reactions (
    id uuid default uuid_generate_v4() primary key,
    message_id uuid references messages(id) on delete cascade,
    user_id uuid references users(id) on delete cascade,
    emoji text not null,
    created_at timestamptz default now(),
    unique(message_id, user_id, emoji)
);

-- Minutes (AI-generated summaries)
create table minutes (
    id uuid default uuid_generate_v4() primary key,
    channel_id uuid references channels(id) on delete cascade,
    content text not null,
    created_at timestamptz default now(),
    time_period_start timestamptz not null,
    time_period_end timestamptz not null
);

-- Memos
create table memos (
    id uuid default uuid_generate_v4() primary key,
    organization_id uuid references organizations(id) on delete cascade,
    title text not null,
    content text not null,
    created_by uuid references users(id) on delete set null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Bulletins
create table bulletins (
    id uuid default uuid_generate_v4() primary key,
    channel_id uuid references channels(id) on delete cascade,
    title text not null,
    content text not null,
    created_by uuid references users(id) on delete set null,
    created_at timestamptz default now()
);

-- Secretaries (AI assistants)
create table secretaries (
    id uuid default uuid_generate_v4() primary key,
    organization_id uuid references organizations(id) on delete cascade,
    name text not null,
    avatar_url text,
    capabilities jsonb default '[]'::jsonb,
    settings jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);

-- Secretary Assignments
create table secretary_assignments (
    secretary_id uuid references secretaries(id) on delete cascade,
    channel_id uuid references channels(id) on delete cascade,
    room_id uuid references rooms(id) on delete cascade,
    created_at timestamptz default now(),
    check (
        (channel_id is not null)::integer +
        (room_id is not null)::integer = 1
    ),
    primary key (secretary_id, coalesce(channel_id, room_id))
);

-- Row Level Security Policies
alter table organizations enable row level security;
alter table users enable row level security;
alter table organization_members enable row level security;
alter table channels enable row level security;
alter table channel_members enable row level security;
alter table rooms enable row level security;
alter table room_members enable row level security;
alter table chats enable row level security;
alter table chat_members enable row level security;
alter table messages enable row level security;
alter table reactions enable row level security;
alter table minutes enable row level security;
alter table memos enable row level security;
alter table bulletins enable row level security;
alter table secretaries enable row level security;
alter table secretary_assignments enable row level security;

-- Basic RLS policies (you'll need to customize these based on your exact requirements)
create policy "Users can see their own organizations"
    on organizations for select
    using (id in (
        select organization_id from organization_members
        where user_id = auth.uid()
    ));

-- Add more policies as needed...