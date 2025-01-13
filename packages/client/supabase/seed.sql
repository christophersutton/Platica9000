-- Make sure you run the CREATE EXTENSION command if uuid_generate_v4() is needed
-- create extension if not exists "uuid-ossp";

-- ==================================================
-- ORGANIZATIONS
-- ==================================================
insert into organizations (id, name, created_at, settings) values
(uuid_generate_v4(), 'Acme Corporation', now(), '{}'),
(uuid_generate_v4(), 'Global Ventures', now(), '{"industry": "finance"}'),
(uuid_generate_v4(), 'Tech Innovators', now(), '{"focus": "SaaS"}'),
(uuid_generate_v4(), 'Green Earth Nonprofit', now(), '{"mission": "sustainability"}'),
(uuid_generate_v4(), 'Space Explorers Club', now(), '{"tier": "elite"}');

-- ==================================================
-- USERS
-- ==================================================
insert into users (id, email, full_name, avatar_url, created_at, last_seen_at) values
(uuid_generate_v4(), 'alice@example.com', 'Alice Wonderland', 'https://example.com/avatars/alice.png', now(), now()),
(uuid_generate_v4(), 'bob@example.com', 'Bob Stone', 'https://example.com/avatars/bob.png', now(), now()),
(uuid_generate_v4(), 'carol@example.com', 'Carol Danvers', 'https://example.com/avatars/carol.png', now(), now()),
(uuid_generate_v4(), 'david@example.com', 'David Finch', 'https://example.com/avatars/david.png', now(), now()),
(uuid_generate_v4(), 'eve@example.com', 'Eve Summers', 'https://example.com/avatars/eve.png', now(), now()),
(uuid_generate_v4(), 'frank@example.com', 'Frank Li', 'https://example.com/avatars/frank.png', now(), now()),
(uuid_generate_v4(), 'georgia@example.com', 'Georgia Woods', 'https://example.com/avatars/georgia.png', now(), now()),
(uuid_generate_v4(), 'harry@example.com', 'Harry McFly', 'https://example.com/avatars/harry.png', now(), now()),
(uuid_generate_v4(), 'irina@example.com', 'Irina Braun', 'https://example.com/avatars/irina.png', now(), now()),
(uuid_generate_v4(), 'john@example.com', 'John Carter', 'https://example.com/avatars/john.png', now(), now());

-- ==================================================
-- ORGANIZATION MEMBERS
-- Each user belongs to one or more orgs, with random roles
-- ==================================================
insert into organization_members (organization_id, user_id, role, created_at)
select
    o.id,
    u.id,
    (array['admin','moderator','member'])[floor(random()*3+1)],
    now()
from organizations o, users u
where (
    (o.name = 'Acme Corporation' and u.full_name in ('Alice Wonderland', 'Bob Stone', 'Eve Summers')) or
    (o.name = 'Global Ventures' and u.full_name in ('Bob Stone', 'Carol Danvers', 'David Finch')) or
    (o.name = 'Tech Innovators' and u.full_name in ('Alice Wonderland', 'Frank Li', 'Georgia Woods', 'John Carter')) or
    (o.name = 'Green Earth Nonprofit' and u.full_name in ('Irina Braun', 'Carol Danvers')) or
    (o.name = 'Space Explorers Club' and u.full_name in ('Harry McFly', 'Eve Summers', 'Frank Li'))
);

-- ==================================================
-- CHANNELS
-- One or two channels per org
-- ==================================================
insert into channels (id, organization_id, name, description, message_expiration_hours, created_at, settings)
select uuid_generate_v4(), org.id, c.name, c.desc, c.msg_expiration, now(), '{}'
from (
    values
        ('Acme Corporation', 'general', 'General Chat', 168),
        ('Acme Corporation', 'random', 'Random Discussions', 72),
        ('Global Ventures', 'finance-news', 'Finance Updates', 168),
        ('Global Ventures', 'alerts', 'Urgent Alerts', 24),
        ('Tech Innovators', 'engineering', 'Engineering Channel', 168),
        ('Green Earth Nonprofit', 'volunteers', 'Volunteer Coordination', 168),
        ('Space Explorers Club', 'mission-control', 'Mission Control', 168)
) as c(org_name, name, desc, msg_expiration)
join organizations org on org.name = c.org_name;

-- ==================================================
-- CHANNEL MEMBERS
-- Anyone in the corresponding org might be in the channel, random role
-- ==================================================
insert into channel_members (channel_id, user_id, role, created_at)
select
    ch.id,
    om.user_id,
    (array['moderator','member'])[floor(random()*2+1)],
    now()
from channels ch
join organization_members om on om.organization_id = ch.organization_id;

-- ==================================================
-- ROOMS
-- Some ephemeral rooms for each org
-- ==================================================
insert into rooms (id, organization_id, name, description, created_at, ended_at, created_by, settings)
select uuid_generate_v4(), org.id, r.name, r.description, now(),
       null, (select id from users order by random() limit 1), '{}'
from (
    values
        ('Acme Corporation', 'Q1 Strategy Session', 'Discuss Q1 plans'),
        ('Global Ventures', 'Board Meeting', 'CEO + CFO + Board members'),
        ('Tech Innovators', 'Hackathon Kickoff', 'Team coding session'),
        ('Green Earth Nonprofit', 'Fundraising Brainstorm', 'Ideas for campaigns'),
        ('Space Explorers Club', 'Mars Mission Briefing', 'Latest news on Mars mission')
) as r(org_name, name, description)
join organizations org on org.name = r.org_name;

-- ==================================================
-- ROOM MEMBERS
-- Randomly assign some members
-- ==================================================
insert into room_members (room_id, user_id, created_at)
select
    rm.id,
    u.id,
    now()
from rooms rm
join organization_members om on om.organization_id = rm.organization_id
join users u on u.id = om.user_id
where random() > 0.4;  -- 60% chance each org member is in the room

-- ==================================================
-- CHATS
-- 1-on-1 direct messages
-- ==================================================
insert into chats (id, organization_id, created_at, last_message_at)
select uuid_generate_v4(), o.organization_id, now(), null
from (
    select distinct organization_id
    from organization_members
) o
limit 5;  -- Just create 5 random direct chat "slots"

-- ==================================================
-- CHAT MEMBERS
-- Always 2 people per chat, chosen randomly from the org
-- ==================================================
with chat_orgs as (
    select c.id as chat_id, o.id as org_id
    from chats c
    join organizations o on c.organization_id = o.id
)
insert into chat_members (chat_id, user_id, created_at)
select
    co.chat_id,
    m.user_id,
    now()
from chat_orgs co
join (
    select organization_id, user_id
    from organization_members
    order by random()
) m on m.organization_id = co.org_id
group by co.chat_id, m.user_id
having count(*) <= 2  -- tricky grouping to ensure we only take 2 distinct users
order by co.chat_id, random();

-- If the above approach doesn't guarantee exactly 2 members per chat, 
-- you might need a more refined logic or a temp table. 
-- For large data sets, consider a better approach. 
-- For demonstration, it's just a quick attempt.

-- ==================================================
-- MESSAGES
-- Insert a large number of messages with random relationships to channels, rooms, or chats
-- ==================================================
-- We’ll generate ~50 messages, distributing them among existing channels, rooms, and chats.
-- Also, let's add some threaded replies (parent_id) to simulate conversation threads.

-- Let's first grab IDs from channels, rooms, chats:
with t_targets as (
    select id as target_id, 'channel' as ttype from channels
    union all
    select id as target_id, 'room' as ttype from rooms
    union all
    select id as target_id, 'chat' as ttype from chats
),
t_random as (
    select
        target_id,
        ttype
    from t_targets
    order by random()
    limit 50
),
users_random as (
    select id as user_id
    from users
    order by random()
),
message_list as (
    select
        row_number() over () as rn,
        'Message number ' || row_number() over () || ' with some random text...' as content
    from generate_series(1, 50)
) 
insert into messages (id, content, user_id, created_at, updated_at, channel_id, room_id, chat_id, parent_id, attachments)
select
    uuid_generate_v4(),
    ml.content,
    (select user_id from users_random order by random() limit 1),
    now(),
    now(),
    case when tr.ttype = 'channel' then tr.target_id end,
    case when tr.ttype = 'room' then tr.target_id end,
    case when tr.ttype = 'chat' then tr.target_id end,
    case 
        -- 20% chance to be a reply to a previous message
        when random() < 0.2
        then (
            select id
            from messages
            order by random()
            limit 1
        )
        else null
    end,
    '[]'::jsonb
from t_random tr
join message_list ml on ml.rn = (select floor(random()*50 + 1)::int)
-- note that each message uses a random row from message_list, so some may duplicate text
-- but that’s okay for seeding

-- Force the creation of a bunch more messages specifically in channels for example
-- to ensure "lots" of messages. We’ll do ~30 more specifically in channels.
;
with extra_msg_list as (
    select
        row_number() over () as rn,
        'Channel message ' || row_number() over () || ' more text...' as content
    from generate_series(1, 30)
),
some_channels as (
    select id as channel_id
    from channels
    order by random()
    limit 2  -- only 2 channels to stuff them full of messages
),
extra_insert as (
    select
        uuid_generate_v4() as msg_id,
        eml.content,
        (select id from users order by random() limit 1) as user_id,
        now() as created_at,
        now() as updated_at,
        sc.channel_id,
        null as room_id,
        null as chat_id,
        null as parent_id,
        '[]'::jsonb as attachments
    from extra_msg_list eml
    cross join some_channels sc
)
insert into messages (id, content, user_id, created_at, updated_at, channel_id, room_id, chat_id, parent_id, attachments)
select 
    msg_id, content, user_id, created_at, updated_at, channel_id, room_id, chat_id, parent_id, attachments
from extra_insert
order by random();

-- ==================================================
-- REACTIONS
-- Add some random reactions (emojis) to existing messages
-- ==================================================
insert into reactions (id, message_id, user_id, emoji, created_at)
select
    uuid_generate_v4(),
    m.id as message_id,
    (select id from users order by random() limit 1) as user_id,
    (array['👍','❤️','😂','🎉','😮'])[floor(random()*5+1)],
    now()
from messages m
order by random()
limit 20;  -- 20 random reactions

-- ==================================================
-- MINUTES
-- AI-generated summaries for channels
-- ==================================================
insert into minutes (id, channel_id, content, created_at, time_period_start, time_period_end)
select
    uuid_generate_v4(),
    ch.id,
    'Summary of last few messages and events in channel ' || ch.name,
    now(),
    now() - interval '1 day',
    now()
from channels ch
order by random()
limit 3;

-- ==================================================
-- MEMOS
-- Some organization-level notes or memos
-- ==================================================
insert into memos (id, organization_id, title, content, created_by, created_at, updated_at)
select
    uuid_generate_v4(),
    org.id,
    'Memo for ' || org.name,
    'Some internal memo text for ' || org.name,
    (select id from users order by random() limit 1),
    now(),
    now()
from organizations org
order by random()
limit 5;

-- ==================================================
-- BULLETINS
-- Bulletin messages pinned in a channel
-- ==================================================
insert into bulletins (id, channel_id, title, content, created_by, created_at)
select
    uuid_generate_v4(),
    ch.id,
    'Important Bulletin in ' || ch.name,
    'Some pinned or highlighted info for ' || ch.name,
    (select id from users order by random() limit 1),
    now()
from channels ch
order by random()
limit 5;

-- ==================================================
-- SECRETARIES (AI assistants)
-- ==================================================
insert into secretaries (id, organization_id, name, avatar_url, capabilities, settings, created_at)
select
    uuid_generate_v4(),
    org.id,
    'Assistant for ' || org.name,
    'https://example.com/avatars/ai.png',
    '["summaries","reminders"]'::jsonb,
    '{}',
    now()
from organizations org
order by random()
limit 3;

-- ==================================================
-- SECRETARY ASSIGNMENTS
-- Assign each secretary to a channel or a room
-- ==================================================
with s as (
    select id as sec_id, organization_id from secretaries
),
c as (
    select ch.id as channel_id, ch.organization_id from channels ch
),
r as (
    select ro.id as room_id, ro.organization_id from rooms ro
)
-- We’ll do a few channel assignments and a few room assignments
insert into secretary_assignments (secretary_id, channel_id, room_id, created_at)
select
    s.sec_id,
    c.channel_id,
    null,
    now()
from s
join c on c.organization_id = s.organization_id
order by random()
limit 2;

insert into secretary_assignments (secretary_id, channel_id, room_id, created_at)
select
    s.sec_id,
    null,
    r.room_id,
    now()
from s
join r on r.organization_id = s.organization_id
order by random()
limit 2;

-- That’s it for a large seed. 
-- Adjust as needed to match your data volume and usage patterns.