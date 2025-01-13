-- Create storage bucket for attachments
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true);

-- Policy to allow authenticated users to upload files
create policy "Allow authenticated uploads"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'attachments' AND
    auth.role() = 'authenticated'
);

-- Policy to allow authenticated users to update their own files
create policy "Allow authenticated updates"
on storage.objects for update
to authenticated
using (
    bucket_id = 'attachments' AND
    auth.uid() = owner
);

-- Policy to allow public access to read files
create policy "Allow public read access"
on storage.objects for select
to public
using (bucket_id = 'attachments'); 