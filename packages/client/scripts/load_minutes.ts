import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function loadMinutes() {
  // Get the standup channel
  const { data: channels } = await supabase
    .from('channels')
    .select('id')
    .eq('name', 'standups')
    .limit(1);
  
  if (!channels?.length) {
    console.error('No standup channel found');
    return;
  }

  // Get a secretary
  const { data: secretaries } = await supabase
    .from('secretaries')
    .select('id')
    .limit(1);

  if (!secretaries?.length) {
    console.error('No secretary found');
    return;
  }

  const channelId = channels[0].id;
  const secretaryId = secretaries[0].id;

  // Read all markdown files
  const outputsDir = join(__dirname, '../../../data/outputs');
  const files = readdirSync(outputsDir).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const content = readFileSync(join(outputsDir, file), 'utf-8');
    const dateMatch = file.match(/(\d{8})/);
    if (!dateMatch) continue;

    const date = dateMatch[1];
    const year = date.slice(0, 4);
    const month = date.slice(4, 6);
    const day = date.slice(6, 8);
    
    const meetingDate = new Date(`${year}-${month}-${day}T09:00:00`);
    const endDate = new Date(meetingDate.getTime() + 15 * 60000); // 15 minutes later

    await supabase.from('minutes').insert({
      channel_id: channelId,
      content,
      created_at: meetingDate.toISOString(),
      time_period_start: meetingDate.toISOString(),
      time_period_end: endDate.toISOString(),
      created_by: secretaryId
    });
  }

  
}

loadMinutes().catch(console.error); 