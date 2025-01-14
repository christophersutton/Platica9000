create table "public"."bulletins" (
    "id" uuid not null default uuid_generate_v4(),
    "channel_id" uuid,
    "title" text not null,
    "content" text not null,
    "created_by" uuid,
    "created_at" timestamp with time zone default now()
);


alter table "public"."bulletins" enable row level security;

create table "public"."channel_members" (
    "channel_id" uuid not null,
    "user_id" uuid not null,
    "role" text not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."channel_members" enable row level security;

create table "public"."channels" (
    "id" uuid not null default uuid_generate_v4(),
    "organization_id" uuid,
    "name" text not null,
    "description" text,
    "message_expiration_hours" integer not null default 168,
    "created_at" timestamp with time zone default now(),
    "settings" jsonb default '{}'::jsonb
);


alter table "public"."channels" enable row level security;

create table "public"."chat_members" (
    "chat_id" uuid not null,
    "user_id" uuid not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."chat_members" enable row level security;

create table "public"."chats" (
    "id" uuid not null default uuid_generate_v4(),
    "organization_id" uuid,
    "created_at" timestamp with time zone default now(),
    "last_message_at" timestamp with time zone
);


alter table "public"."chats" enable row level security;

create table "public"."memos" (
    "id" uuid not null default uuid_generate_v4(),
    "organization_id" uuid,
    "title" text not null,
    "content" text not null,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."memos" enable row level security;

create table "public"."messages" (
    "id" uuid not null default uuid_generate_v4(),
    "content" text not null,
    "user_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "channel_id" uuid,
    "room_id" uuid,
    "chat_id" uuid,
    "parent_id" uuid,
    "attachments" jsonb default '[]'::jsonb
);


alter table "public"."messages" enable row level security;

create table "public"."rooms" (
    "id" uuid not null default uuid_generate_v4(),
    "organization_id" uuid,
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone default now(),
    "ended_at" timestamp with time zone,
    "created_by" uuid,
    "settings" jsonb default '{}'::jsonb
);


alter table "public"."rooms" enable row level security;

create table "public"."secretaries" (
    "id" uuid not null default uuid_generate_v4(),
    "organization_id" uuid,
    "name" text not null,
    "avatar_url" text,
    "capabilities" jsonb default '[]'::jsonb,
    "settings" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."secretaries" enable row level security;

create table "public"."minutes" (
    "id" uuid not null default uuid_generate_v4(),
    "channel_id" uuid,
    "room_id" uuid,
    "content" text not null,
    "created_at" timestamp with time zone default now(),
    "time_period_start" timestamp with time zone not null,
    "time_period_end" timestamp with time zone not null,
    "created_by" uuid
);


alter table "public"."minutes" enable row level security;

create table "public"."organization_members" (
    "organization_id" uuid not null,
    "user_id" uuid not null,
    "role" text not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."organization_members" enable row level security;

create table "public"."organizations" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "created_at" timestamp with time zone default now(),
    "settings" jsonb default '{}'::jsonb
);


alter table "public"."organizations" enable row level security;

create table "public"."reactions" (
    "id" uuid not null default uuid_generate_v4(),
    "message_id" uuid,
    "user_id" uuid,
    "emoji" text not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."reactions" enable row level security;

create table "public"."room_members" (
    "room_id" uuid not null,
    "user_id" uuid not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."room_members" enable row level security;

create table "public"."secretary_assignments" (
    "secretary_id" uuid,
    "channel_id" uuid,
    "room_id" uuid,
    "created_at" timestamp with time zone default now()
);


alter table "public"."secretary_assignments" enable row level security;

create table "public"."users" (
    "id" uuid not null default uuid_generate_v4(),
    "email" text not null,
    "full_name" text not null,
    "avatar_url" text,
    "created_at" timestamp with time zone default now(),
    "last_seen_at" timestamp with time zone
);


alter table "public"."users" enable row level security;

CREATE UNIQUE INDEX bulletins_pkey ON public.bulletins USING btree (id);

CREATE UNIQUE INDEX channel_members_pkey ON public.channel_members USING btree (channel_id, user_id);

CREATE UNIQUE INDEX channels_organization_id_name_key ON public.channels USING btree (organization_id, name);

CREATE UNIQUE INDEX channels_pkey ON public.channels USING btree (id);

CREATE UNIQUE INDEX chat_members_pkey ON public.chat_members USING btree (chat_id, user_id);

CREATE UNIQUE INDEX chats_pkey ON public.chats USING btree (id);

CREATE UNIQUE INDEX memos_pkey ON public.memos USING btree (id);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);

CREATE UNIQUE INDEX minutes_pkey ON public.minutes USING btree (id);

CREATE UNIQUE INDEX organization_members_pkey ON public.organization_members USING btree (organization_id, user_id);

CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);

CREATE UNIQUE INDEX reactions_message_id_user_id_emoji_key ON public.reactions USING btree (message_id, user_id, emoji);

CREATE UNIQUE INDEX reactions_pkey ON public.reactions USING btree (id);

CREATE UNIQUE INDEX room_members_pkey ON public.room_members USING btree (room_id, user_id);

CREATE UNIQUE INDEX rooms_pkey ON public.rooms USING btree (id);

CREATE UNIQUE INDEX secretaries_pkey ON public.secretaries USING btree (id);

CREATE UNIQUE INDEX secretary_assignments_secretary_id_channel_id_key ON public.secretary_assignments USING btree (secretary_id, channel_id);

CREATE UNIQUE INDEX secretary_assignments_secretary_id_room_id_key ON public.secretary_assignments USING btree (secretary_id, room_id);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."bulletins" add constraint "bulletins_pkey" PRIMARY KEY using index "bulletins_pkey";

alter table "public"."channel_members" add constraint "channel_members_pkey" PRIMARY KEY using index "channel_members_pkey";

alter table "public"."channels" add constraint "channels_pkey" PRIMARY KEY using index "channels_pkey";

alter table "public"."chat_members" add constraint "chat_members_pkey" PRIMARY KEY using index "chat_members_pkey";

alter table "public"."chats" add constraint "chats_pkey" PRIMARY KEY using index "chats_pkey";

alter table "public"."memos" add constraint "memos_pkey" PRIMARY KEY using index "memos_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."minutes" add constraint "minutes_pkey" PRIMARY KEY using index "minutes_pkey";

alter table "public"."organization_members" add constraint "organization_members_pkey" PRIMARY KEY using index "organization_members_pkey";

alter table "public"."organizations" add constraint "organizations_pkey" PRIMARY KEY using index "organizations_pkey";

alter table "public"."reactions" add constraint "reactions_pkey" PRIMARY KEY using index "reactions_pkey";

alter table "public"."room_members" add constraint "room_members_pkey" PRIMARY KEY using index "room_members_pkey";

alter table "public"."rooms" add constraint "rooms_pkey" PRIMARY KEY using index "rooms_pkey";

alter table "public"."secretaries" add constraint "secretaries_pkey" PRIMARY KEY using index "secretaries_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."bulletins" add constraint "bulletins_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE not valid;

alter table "public"."bulletins" validate constraint "bulletins_channel_id_fkey";

alter table "public"."bulletins" add constraint "bulletins_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."bulletins" validate constraint "bulletins_created_by_fkey";

alter table "public"."channel_members" add constraint "channel_members_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE not valid;

alter table "public"."channel_members" validate constraint "channel_members_channel_id_fkey";

alter table "public"."channel_members" add constraint "channel_members_role_check" CHECK ((role = ANY (ARRAY['moderator'::text, 'member'::text]))) not valid;

alter table "public"."channel_members" validate constraint "channel_members_role_check";

alter table "public"."channel_members" add constraint "channel_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."channel_members" validate constraint "channel_members_user_id_fkey";

alter table "public"."channels" add constraint "channels_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."channels" validate constraint "channels_organization_id_fkey";

alter table "public"."channels" add constraint "channels_organization_id_name_key" UNIQUE using index "channels_organization_id_name_key";

alter table "public"."chat_members" add constraint "chat_members_chat_id_fkey" FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE not valid;

alter table "public"."chat_members" validate constraint "chat_members_chat_id_fkey";

alter table "public"."chat_members" add constraint "chat_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."chat_members" validate constraint "chat_members_user_id_fkey";

alter table "public"."chats" add constraint "chats_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."chats" validate constraint "chats_organization_id_fkey";

alter table "public"."memos" add constraint "memos_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."memos" validate constraint "memos_created_by_fkey";

alter table "public"."memos" add constraint "memos_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."memos" validate constraint "memos_organization_id_fkey";

alter table "public"."messages" add constraint "messages_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_channel_id_fkey";

alter table "public"."messages" add constraint "messages_chat_id_fkey" FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_chat_id_fkey";

alter table "public"."messages" add constraint "messages_check" CHECK ((((((channel_id IS NOT NULL))::integer + ((room_id IS NOT NULL))::integer) + ((chat_id IS NOT NULL))::integer) = 1)) not valid;

alter table "public"."messages" validate constraint "messages_check";

alter table "public"."messages" add constraint "messages_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES messages(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_parent_id_fkey";

alter table "public"."messages" add constraint "messages_room_id_fkey" FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_room_id_fkey";

alter table "public"."messages" add constraint "messages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."messages" validate constraint "messages_user_id_fkey";

alter table "public"."minutes" add constraint "minutes_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE not valid;

alter table "public"."minutes" validate constraint "minutes_channel_id_fkey";

alter table "public"."minutes" add constraint "minutes_room_id_fkey" FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE not valid;

alter table "public"."minutes" validate constraint "minutes_room_id_fkey";

alter table "public"."minutes" add constraint "minutes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES secretaries(id) ON DELETE SET NULL not valid;

alter table "public"."minutes" validate constraint "minutes_created_by_fkey";

alter table "public"."minutes" add constraint "minutes_check" CHECK ((((channel_id IS NOT NULL))::integer + ((room_id IS NOT NULL))::integer) = 1) not valid;

alter table "public"."minutes" validate constraint "minutes_check";

alter table "public"."organization_members" add constraint "organization_members_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_members" validate constraint "organization_members_organization_id_fkey";

alter table "public"."organization_members" add constraint "organization_members_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'moderator'::text, 'member'::text]))) not valid;

alter table "public"."organization_members" validate constraint "organization_members_role_check";

alter table "public"."organization_members" add constraint "organization_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."organization_members" validate constraint "organization_members_user_id_fkey";

alter table "public"."reactions" add constraint "reactions_message_id_fkey" FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE not valid;

alter table "public"."reactions" validate constraint "reactions_message_id_fkey";

alter table "public"."reactions" add constraint "reactions_message_id_user_id_emoji_key" UNIQUE using index "reactions_message_id_user_id_emoji_key";

alter table "public"."reactions" add constraint "reactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."reactions" validate constraint "reactions_user_id_fkey";

alter table "public"."room_members" add constraint "room_members_room_id_fkey" FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE not valid;

alter table "public"."room_members" validate constraint "room_members_room_id_fkey";

alter table "public"."room_members" add constraint "room_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."room_members" validate constraint "room_members_user_id_fkey";

alter table "public"."rooms" add constraint "rooms_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) not valid;

alter table "public"."rooms" validate constraint "rooms_created_by_fkey";

alter table "public"."rooms" add constraint "rooms_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."rooms" validate constraint "rooms_organization_id_fkey";

alter table "public"."secretaries" add constraint "secretaries_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."secretaries" validate constraint "secretaries_organization_id_fkey";

alter table "public"."secretary_assignments" add constraint "secretary_assignments_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE not valid;

alter table "public"."secretary_assignments" validate constraint "secretary_assignments_channel_id_fkey";

alter table "public"."secretary_assignments" add constraint "secretary_assignments_check" CHECK (((((channel_id IS NOT NULL))::integer + ((room_id IS NOT NULL))::integer) = 1)) not valid;

alter table "public"."secretary_assignments" validate constraint "secretary_assignments_check";

alter table "public"."secretary_assignments" add constraint "secretary_assignments_room_id_fkey" FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE not valid;

alter table "public"."secretary_assignments" validate constraint "secretary_assignments_room_id_fkey";

alter table "public"."secretary_assignments" add constraint "secretary_assignments_secretary_id_channel_id_key" UNIQUE using index "secretary_assignments_secretary_id_channel_id_key";

alter table "public"."secretary_assignments" add constraint "secretary_assignments_secretary_id_fkey" FOREIGN KEY (secretary_id) REFERENCES secretaries(id) ON DELETE CASCADE not valid;

alter table "public"."secretary_assignments" validate constraint "secretary_assignments_secretary_id_fkey";

alter table "public"."secretary_assignments" add constraint "secretary_assignments_secretary_id_room_id_key" UNIQUE using index "secretary_assignments_secretary_id_room_id_key";

alter table "public"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

grant delete on table "public"."bulletins" to "anon";

grant insert on table "public"."bulletins" to "anon";

grant references on table "public"."bulletins" to "anon";

grant select on table "public"."bulletins" to "anon";

grant trigger on table "public"."bulletins" to "anon";

grant truncate on table "public"."bulletins" to "anon";

grant update on table "public"."bulletins" to "anon";

grant delete on table "public"."bulletins" to "authenticated";

grant insert on table "public"."bulletins" to "authenticated";

grant references on table "public"."bulletins" to "authenticated";

grant select on table "public"."bulletins" to "authenticated";

grant trigger on table "public"."bulletins" to "authenticated";

grant truncate on table "public"."bulletins" to "authenticated";

grant update on table "public"."bulletins" to "authenticated";

grant delete on table "public"."bulletins" to "service_role";

grant insert on table "public"."bulletins" to "service_role";

grant references on table "public"."bulletins" to "service_role";

grant select on table "public"."bulletins" to "service_role";

grant trigger on table "public"."bulletins" to "service_role";

grant truncate on table "public"."bulletins" to "service_role";

grant update on table "public"."bulletins" to "service_role";

grant delete on table "public"."channel_members" to "anon";

grant insert on table "public"."channel_members" to "anon";

grant references on table "public"."channel_members" to "anon";

grant select on table "public"."channel_members" to "anon";

grant trigger on table "public"."channel_members" to "anon";

grant truncate on table "public"."channel_members" to "anon";

grant update on table "public"."channel_members" to "anon";

grant delete on table "public"."channel_members" to "authenticated";

grant insert on table "public"."channel_members" to "authenticated";

grant references on table "public"."channel_members" to "authenticated";

grant select on table "public"."channel_members" to "authenticated";

grant trigger on table "public"."channel_members" to "authenticated";

grant truncate on table "public"."channel_members" to "authenticated";

grant update on table "public"."channel_members" to "authenticated";

grant delete on table "public"."channel_members" to "service_role";

grant insert on table "public"."channel_members" to "service_role";

grant references on table "public"."channel_members" to "service_role";

grant select on table "public"."channel_members" to "service_role";

grant trigger on table "public"."channel_members" to "service_role";

grant truncate on table "public"."channel_members" to "service_role";

grant update on table "public"."channel_members" to "service_role";

grant delete on table "public"."channels" to "anon";

grant insert on table "public"."channels" to "anon";

grant references on table "public"."channels" to "anon";

grant select on table "public"."channels" to "anon";

grant trigger on table "public"."channels" to "anon";

grant truncate on table "public"."channels" to "anon";

grant update on table "public"."channels" to "anon";

grant delete on table "public"."channels" to "authenticated";

grant insert on table "public"."channels" to "authenticated";

grant references on table "public"."channels" to "authenticated";

grant select on table "public"."channels" to "authenticated";

grant trigger on table "public"."channels" to "authenticated";

grant truncate on table "public"."channels" to "authenticated";

grant update on table "public"."channels" to "authenticated";

grant delete on table "public"."channels" to "service_role";

grant insert on table "public"."channels" to "service_role";

grant references on table "public"."channels" to "service_role";

grant select on table "public"."channels" to "service_role";

grant trigger on table "public"."channels" to "service_role";

grant truncate on table "public"."channels" to "service_role";

grant update on table "public"."channels" to "service_role";

grant delete on table "public"."chat_members" to "anon";

grant insert on table "public"."chat_members" to "anon";

grant references on table "public"."chat_members" to "anon";

grant select on table "public"."chat_members" to "anon";

grant trigger on table "public"."chat_members" to "anon";

grant truncate on table "public"."chat_members" to "anon";

grant update on table "public"."chat_members" to "anon";

grant delete on table "public"."chat_members" to "authenticated";

grant insert on table "public"."chat_members" to "authenticated";

grant references on table "public"."chat_members" to "authenticated";

grant select on table "public"."chat_members" to "authenticated";

grant trigger on table "public"."chat_members" to "authenticated";

grant truncate on table "public"."chat_members" to "authenticated";

grant update on table "public"."chat_members" to "authenticated";

grant delete on table "public"."chat_members" to "service_role";

grant insert on table "public"."chat_members" to "service_role";

grant references on table "public"."chat_members" to "service_role";

grant select on table "public"."chat_members" to "service_role";

grant trigger on table "public"."chat_members" to "service_role";

grant truncate on table "public"."chat_members" to "service_role";

grant update on table "public"."chat_members" to "service_role";

grant delete on table "public"."chats" to "anon";

grant insert on table "public"."chats" to "anon";

grant references on table "public"."chats" to "anon";

grant select on table "public"."chats" to "anon";

grant trigger on table "public"."chats" to "anon";

grant truncate on table "public"."chats" to "anon";

grant update on table "public"."chats" to "anon";

grant delete on table "public"."chats" to "authenticated";

grant insert on table "public"."chats" to "authenticated";

grant references on table "public"."chats" to "authenticated";

grant select on table "public"."chats" to "authenticated";

grant trigger on table "public"."chats" to "authenticated";

grant truncate on table "public"."chats" to "authenticated";

grant update on table "public"."chats" to "authenticated";

grant delete on table "public"."chats" to "service_role";

grant insert on table "public"."chats" to "service_role";

grant references on table "public"."chats" to "service_role";

grant select on table "public"."chats" to "service_role";

grant trigger on table "public"."chats" to "service_role";

grant truncate on table "public"."chats" to "service_role";

grant update on table "public"."chats" to "service_role";

grant delete on table "public"."memos" to "anon";

grant insert on table "public"."memos" to "anon";

grant references on table "public"."memos" to "anon";

grant select on table "public"."memos" to "anon";

grant trigger on table "public"."memos" to "anon";

grant truncate on table "public"."memos" to "anon";

grant update on table "public"."memos" to "anon";

grant delete on table "public"."memos" to "authenticated";

grant insert on table "public"."memos" to "authenticated";

grant references on table "public"."memos" to "authenticated";

grant select on table "public"."memos" to "authenticated";

grant trigger on table "public"."memos" to "authenticated";

grant truncate on table "public"."memos" to "authenticated";

grant update on table "public"."memos" to "authenticated";

grant delete on table "public"."memos" to "service_role";

grant insert on table "public"."memos" to "service_role";

grant references on table "public"."memos" to "service_role";

grant select on table "public"."memos" to "service_role";

grant trigger on table "public"."memos" to "service_role";

grant truncate on table "public"."memos" to "service_role";

grant update on table "public"."memos" to "service_role";

grant delete on table "public"."messages" to "anon";

grant insert on table "public"."messages" to "anon";

grant references on table "public"."messages" to "anon";

grant select on table "public"."messages" to "anon";

grant trigger on table "public"."messages" to "anon";

grant truncate on table "public"."messages" to "anon";

grant update on table "public"."messages" to "anon";

grant delete on table "public"."messages" to "authenticated";

grant insert on table "public"."messages" to "authenticated";

grant references on table "public"."messages" to "authenticated";

grant select on table "public"."messages" to "authenticated";

grant trigger on table "public"."messages" to "authenticated";

grant truncate on table "public"."messages" to "authenticated";

grant update on table "public"."messages" to "authenticated";

grant delete on table "public"."messages" to "service_role";

grant insert on table "public"."messages" to "service_role";

grant references on table "public"."messages" to "service_role";

grant select on table "public"."messages" to "service_role";

grant trigger on table "public"."messages" to "service_role";

grant truncate on table "public"."messages" to "service_role";

grant update on table "public"."messages" to "service_role";

grant delete on table "public"."minutes" to "anon";

grant insert on table "public"."minutes" to "anon";

grant references on table "public"."minutes" to "anon";

grant select on table "public"."minutes" to "anon";

grant trigger on table "public"."minutes" to "anon";

grant truncate on table "public"."minutes" to "anon";

grant update on table "public"."minutes" to "anon";

grant delete on table "public"."minutes" to "authenticated";

grant insert on table "public"."minutes" to "authenticated";

grant references on table "public"."minutes" to "authenticated";

grant select on table "public"."minutes" to "authenticated";

grant trigger on table "public"."minutes" to "authenticated";

grant truncate on table "public"."minutes" to "authenticated";

grant update on table "public"."minutes" to "authenticated";

grant delete on table "public"."minutes" to "service_role";

grant insert on table "public"."minutes" to "service_role";

grant references on table "public"."minutes" to "service_role";

grant select on table "public"."minutes" to "service_role";

grant trigger on table "public"."minutes" to "service_role";

grant truncate on table "public"."minutes" to "service_role";

grant update on table "public"."minutes" to "service_role";

grant delete on table "public"."organization_members" to "anon";

grant insert on table "public"."organization_members" to "anon";

grant references on table "public"."organization_members" to "anon";

grant select on table "public"."organization_members" to "anon";

grant trigger on table "public"."organization_members" to "anon";

grant truncate on table "public"."organization_members" to "anon";

grant update on table "public"."organization_members" to "anon";

grant delete on table "public"."organization_members" to "authenticated";

grant insert on table "public"."organization_members" to "authenticated";

grant references on table "public"."organization_members" to "authenticated";

grant select on table "public"."organization_members" to "authenticated";

grant trigger on table "public"."organization_members" to "authenticated";

grant truncate on table "public"."organization_members" to "authenticated";

grant update on table "public"."organization_members" to "authenticated";

grant delete on table "public"."organization_members" to "service_role";

grant insert on table "public"."organization_members" to "service_role";

grant references on table "public"."organization_members" to "service_role";

grant select on table "public"."organization_members" to "service_role";

grant trigger on table "public"."organization_members" to "service_role";

grant truncate on table "public"."organization_members" to "service_role";

grant update on table "public"."organization_members" to "service_role";

grant delete on table "public"."organizations" to "anon";

grant insert on table "public"."organizations" to "anon";

grant references on table "public"."organizations" to "anon";

grant select on table "public"."organizations" to "anon";

grant trigger on table "public"."organizations" to "anon";

grant truncate on table "public"."organizations" to "anon";

grant update on table "public"."organizations" to "anon";

grant delete on table "public"."organizations" to "authenticated";

grant insert on table "public"."organizations" to "authenticated";

grant references on table "public"."organizations" to "authenticated";

grant select on table "public"."organizations" to "authenticated";

grant trigger on table "public"."organizations" to "authenticated";

grant truncate on table "public"."organizations" to "authenticated";

grant update on table "public"."organizations" to "authenticated";

grant delete on table "public"."organizations" to "service_role";

grant insert on table "public"."organizations" to "service_role";

grant references on table "public"."organizations" to "service_role";

grant select on table "public"."organizations" to "service_role";

grant trigger on table "public"."organizations" to "service_role";

grant truncate on table "public"."organizations" to "service_role";

grant update on table "public"."organizations" to "service_role";

grant delete on table "public"."reactions" to "anon";

grant insert on table "public"."reactions" to "anon";

grant references on table "public"."reactions" to "anon";

grant select on table "public"."reactions" to "anon";

grant trigger on table "public"."reactions" to "anon";

grant truncate on table "public"."reactions" to "anon";

grant update on table "public"."reactions" to "anon";

grant delete on table "public"."reactions" to "authenticated";

grant insert on table "public"."reactions" to "authenticated";

grant references on table "public"."reactions" to "authenticated";

grant select on table "public"."reactions" to "authenticated";

grant trigger on table "public"."reactions" to "authenticated";

grant truncate on table "public"."reactions" to "authenticated";

grant update on table "public"."reactions" to "authenticated";

grant delete on table "public"."reactions" to "service_role";

grant insert on table "public"."reactions" to "service_role";

grant references on table "public"."reactions" to "service_role";

grant select on table "public"."reactions" to "service_role";

grant trigger on table "public"."reactions" to "service_role";

grant truncate on table "public"."reactions" to "service_role";

grant update on table "public"."reactions" to "service_role";

grant delete on table "public"."room_members" to "anon";

grant insert on table "public"."room_members" to "anon";

grant references on table "public"."room_members" to "anon";

grant select on table "public"."room_members" to "anon";

grant trigger on table "public"."room_members" to "anon";

grant truncate on table "public"."room_members" to "anon";

grant update on table "public"."room_members" to "anon";

grant delete on table "public"."room_members" to "authenticated";

grant insert on table "public"."room_members" to "authenticated";

grant references on table "public"."room_members" to "authenticated";

grant select on table "public"."room_members" to "authenticated";

grant trigger on table "public"."room_members" to "authenticated";

grant truncate on table "public"."room_members" to "authenticated";

grant update on table "public"."room_members" to "authenticated";

grant delete on table "public"."room_members" to "service_role";

grant insert on table "public"."room_members" to "service_role";

grant references on table "public"."room_members" to "service_role";

grant select on table "public"."room_members" to "service_role";

grant trigger on table "public"."room_members" to "service_role";

grant truncate on table "public"."room_members" to "service_role";

grant update on table "public"."room_members" to "service_role";

grant delete on table "public"."rooms" to "anon";

grant insert on table "public"."rooms" to "anon";

grant references on table "public"."rooms" to "anon";

grant select on table "public"."rooms" to "anon";

grant trigger on table "public"."rooms" to "anon";

grant truncate on table "public"."rooms" to "anon";

grant update on table "public"."rooms" to "anon";

grant delete on table "public"."rooms" to "authenticated";

grant insert on table "public"."rooms" to "authenticated";

grant references on table "public"."rooms" to "authenticated";

grant select on table "public"."rooms" to "authenticated";

grant trigger on table "public"."rooms" to "authenticated";

grant truncate on table "public"."rooms" to "authenticated";

grant update on table "public"."rooms" to "authenticated";

grant delete on table "public"."rooms" to "service_role";

grant insert on table "public"."rooms" to "service_role";

grant references on table "public"."rooms" to "service_role";

grant select on table "public"."rooms" to "service_role";

grant trigger on table "public"."rooms" to "service_role";

grant truncate on table "public"."rooms" to "service_role";

grant update on table "public"."rooms" to "service_role";

grant delete on table "public"."secretaries" to "anon";

grant insert on table "public"."secretaries" to "anon";

grant references on table "public"."secretaries" to "anon";

grant select on table "public"."secretaries" to "anon";

grant trigger on table "public"."secretaries" to "anon";

grant truncate on table "public"."secretaries" to "anon";

grant update on table "public"."secretaries" to "anon";

grant delete on table "public"."secretaries" to "authenticated";

grant insert on table "public"."secretaries" to "authenticated";

grant references on table "public"."secretaries" to "authenticated";

grant select on table "public"."secretaries" to "authenticated";

grant trigger on table "public"."secretaries" to "authenticated";

grant truncate on table "public"."secretaries" to "authenticated";

grant update on table "public"."secretaries" to "authenticated";

grant delete on table "public"."secretaries" to "service_role";

grant insert on table "public"."secretaries" to "service_role";

grant references on table "public"."secretaries" to "service_role";

grant select on table "public"."secretaries" to "service_role";

grant trigger on table "public"."secretaries" to "service_role";

grant truncate on table "public"."secretaries" to "service_role";

grant update on table "public"."secretaries" to "service_role";

grant delete on table "public"."secretary_assignments" to "anon";

grant insert on table "public"."secretary_assignments" to "anon";

grant references on table "public"."secretary_assignments" to "anon";

grant select on table "public"."secretary_assignments" to "anon";

grant trigger on table "public"."secretary_assignments" to "anon";

grant truncate on table "public"."secretary_assignments" to "anon";

grant update on table "public"."secretary_assignments" to "anon";

grant delete on table "public"."secretary_assignments" to "authenticated";

grant insert on table "public"."secretary_assignments" to "authenticated";

grant references on table "public"."secretary_assignments" to "authenticated";

grant select on table "public"."secretary_assignments" to "authenticated";

grant trigger on table "public"."secretary_assignments" to "authenticated";

grant truncate on table "public"."secretary_assignments" to "authenticated";

grant update on table "public"."secretary_assignments" to "authenticated";

grant delete on table "public"."secretary_assignments" to "service_role";

grant insert on table "public"."secretary_assignments" to "service_role";

grant references on table "public"."secretary_assignments" to "service_role";

grant select on table "public"."secretary_assignments" to "service_role";

grant trigger on table "public"."secretary_assignments" to "service_role";

grant truncate on table "public"."secretary_assignments" to "service_role";

grant update on table "public"."secretary_assignments" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

create policy "Enable read access for all users"
on "public"."bulletins"
as permissive
for select
to authenticated
using (true);


create policy "insert"
on "public"."channels"
as permissive
for insert
to public
with check (true);


create policy "read"
on "public"."channels"
as permissive
for select
to public
using (true);


create policy "Enable insert for authenticated users only"
on "public"."messages"
as permissive
for insert
to authenticated
with check (true);


create policy "Enable read access for all users"
on "public"."messages"
as permissive
for select
to public
using (true);


create policy "Users can see their own organizations"
on "public"."organizations"
as permissive
for select
to public
using ((id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));


create policy "Enable delete for users based on user_id"
on "public"."reactions"
as permissive
for delete
to public
using ((( SELECT auth.uid() AS uid) = user_id));


create policy "Enable insert for authenticated users only"
on "public"."reactions"
as permissive
for insert
to authenticated
with check (true);


create policy "Enable read access for all users"
on "public"."reactions"
as permissive
for select
to public
using (true);


create policy "Enable insert for authenticated users only"
on "public"."users"
as permissive
for insert
to authenticated
with check (true);


create policy "auth-read"
on "public"."users"
as permissive
for select
to authenticated
using (true);



