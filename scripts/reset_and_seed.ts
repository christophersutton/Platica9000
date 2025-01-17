import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

interface User {
  id: string
  email: string
  full_name: string
}

interface Organization {
  id: string
  name: string
  settings: Record<string, any>
}

interface Channel {
  id: string
  organization_id: string
  name: string
  description: string
  message_expiration_hours: number
}

interface Message {
  id?: string
  content: string
  user_id: string
  channel_id?: string
  chat_id?: string
  parent_message_id?: string
}

interface Reaction {
  message_id: string
  user_id: string
  emoji: string
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Map of display names to User objects for easy reference
const userMap: Record<string, User> = {}

async function resetAndSeed() {
  try {
    console.log('Starting database reset and seed...')

    // Clean up existing data in reverse order of dependencies
    console.log('Cleaning up existing data...')
    
    // Delete reactions first since they depend on messages
    const { error: reactionsError } = await supabase
      .from('reactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows
    if (reactionsError) console.error('Error deleting reactions:', reactionsError)
    
    // Delete messages before channels since they reference channels
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (messagesError) console.error('Error deleting messages:', messagesError)
    
    // Delete channel members before channels
    const { error: channelMembersError } = await supabase
      .from('channel_members')
      .delete()
      .neq('channel_id', '00000000-0000-0000-0000-000000000000')
    if (channelMembersError) console.error('Error deleting channel members:', channelMembersError)
    
    // Delete channels
    const { error: deleteChannelsError } = await supabase
      .from('channels')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (deleteChannelsError) console.error('Error deleting channels:', deleteChannelsError)
    
    // Delete organization members before organization
    const { error: orgMembersError } = await supabase
      .from('organization_members')
      .delete()
      .neq('organization_id', '00000000-0000-0000-0000-000000000000')
    if (orgMembersError) console.error('Error deleting organization members:', orgMembersError)
    
    // Delete organizations
    const { error: orgsError } = await supabase
      .from('organizations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (orgsError) console.error('Error deleting organizations:', orgsError)

    // Create our seed users
    const seedUsers = [
      { email: 'alex.kim@platica.com', full_name: 'Alex Kim', avatar_url: 'https://api.dicebear.com/9.x/dylan/svg?seed=Alex' },
      { email: 'maya.patel@platica.com', full_name: 'Maya Patel', avatar_url: 'https://api.dicebear.com/9.x/dylan/svg?seed=Maya' },
      { email: 'james.wilson@platica.com', full_name: 'James Wilson', avatar_url: 'https://api.dicebear.com/9.x/dylan/svg?seed=James' },
      { email: 'riley.chen@platica.com', full_name: 'Riley Chen', avatar_url: 'https://api.dicebear.com/9.x/dylan/svg?seed=Riley' },
      { email: 'olivia.brooks@platica.com', full_name: 'Olivia Brooks', avatar_url: 'https://api.dicebear.com/9.x/dylan/svg?seed=Olivia' },
      { email: 'daniel.reed@platica.com', full_name: 'Daniel Reed', avatar_url: 'https://api.dicebear.com/9.x/dylan/svg?seed=Daniel' },
      { email: 'ava.collins@platica.com', full_name: 'Ava Collins', avatar_url: 'https://api.dicebear.com/9.x/dylan/svg?seed=Ava' },
      { email: 'liam.harris@platica.com', full_name: 'Liam Harris', avatar_url: 'https://api.dicebear.com/9.x/dylan/svg?seed=Liam' },
      { email: 'sophia.turner@platica.com', full_name: 'Sophia Turner', avatar_url: 'https://api.dicebear.com/9.x/dylan/svg?seed=Sophia' }
    ]

    console.log('Creating seed users...')
    
    // Create users if they don't exist
    for (const user of seedUsers) {
      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single()

      if (selectError && selectError.code !== 'PGRST116') {
        console.error(`Error checking for existing user ${user.email}:`, selectError)
        continue
      }

      if (!existingUser) {
        const { error: insertError } = await supabase.from('users').insert(user)
        if (insertError) {
          console.error(`Error creating user ${user.email}:`, insertError)
          continue
        }
        console.log(`Created user: ${user.email}`)
      } else {
        console.log(`User exists: ${user.email}`)
      }
    }

    // Get existing users to reference in our seed data
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name')
    
    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`)
    }
    
    if (!users || users.length === 0) {
      throw new Error('No existing users found')
    }

    console.log(`Found ${users.length} existing users`)

    // Map users to their display names for easy reference
    users.forEach(user => {
      if (!user.id || !user.full_name) {
        throw new Error(`User is missing required fields: ${JSON.stringify(user)}`);
      }
      userMap[user.full_name] = {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      };
    })

    // Helper function to safely get user ID with better error handling
    const getUserIdWithFallback = (name: string, fallbackIndex: number): string => {
      const user = userMap[name];
      if (user?.id) return user.id;
      
      // If user not found in map, try fallback but check bounds
      if (fallbackIndex < users.length) {
        return users[fallbackIndex].id;
      }
      
      throw new Error(`Could not find user ${name} and fallback index ${fallbackIndex} is out of bounds`);
    };

    // Create a test organization
    const { data: org } = await supabase
      .from('organizations')
      .insert({
        name: 'Platica Corp',
        settings: { description: 'Where ideas go to die' }
      })
      .select()
      .single()

    if (!org) throw new Error('Failed to create organization')

    // Add all users to the organization with random roles
    const roles = ['admin', 'member'] as const
    await supabase
      .from('organization_members')
      .insert(
        users.map(user => ({
          organization_id: org.id,
          user_id: user.id,
          role: roles[Math.floor(Math.random() * roles.length)]
        }))
      )

    // Create the default channels
    console.log('Creating channels...')
    const defaultChannels = [
      {
        organization_id: org.id,
        name: 'Engineering',
        description: 'Technical discussions and updates',
        message_expiration_hours: 168 // 1 week
      },
      {
        organization_id: org.id,
        name: 'Marketing',
        description: 'Marketing campaigns and brand discussions',
        message_expiration_hours: 168
      },
      {
        organization_id: org.id,
        name: 'Random',
        description: 'Water cooler chat and fun stuff',
        message_expiration_hours: 168
      }
    ]

    const { data: createdChannels, error: createChannelsError } = await supabase
      .from('channels')
      .insert(defaultChannels)
      .select()

    if (createChannelsError) {
      throw new Error(`Failed to create channels: ${createChannelsError.message}`)
    }

    if (!createdChannels || createdChannels.length === 0) {
      throw new Error('No channels were created')
    }

    // Add all users to all channels
    const channelMembers = createdChannels.flatMap(channel =>
      users.map(user => ({
        channel_id: channel.id,
        user_id: user.id,
        role: 'member'
      }))
    )

    await supabase.from('channel_members').insert(channelMembers)

    // Get channel IDs by name for easy reference
    const channelMap = createdChannels.reduce((acc, channel) => {
      acc[channel.name] = channel.id
      return acc
    }, {} as Record<string, string>)

    // Seed engineering channel messages
    const engineeringMessages: Message[] = [
      {
        content: "Starting the logging system refactor today to handle our new microservices. Will need eyes on the error formatting changes.",
        user_id: getUserIdWithFallback('Alex Kim', 0),
        channel_id: channelMap['Engineering']
      },
      {
        content: "Found some inconsistencies in error handling across services. @James @Riley - can you check if this affects your components?",
        user_id: getUserIdWithFallback('Alex Kim', 0),
        channel_id: channelMap['Engineering']
      },
      {
        content: "Heads up team - identified a potential memory leak in the admin dashboard during batch operations. Looking into the event-stream-processor package as the culprit.",
        user_id: getUserIdWithFallback('Maya Patel', 1),
        channel_id: channelMap['Engineering']
      },
      {
        content: "@Maya I'm seeing similar timeouts in the reporting module. Could be related to the memory leak?",
        user_id: getUserIdWithFallback('Riley Chen', 2),
        channel_id: channelMap['Engineering']
      },
      {
        content: "Just pushed the permission migration script. Running final validation tests now. Found and fixed a caching issue during testing.",
        user_id: getUserIdWithFallback('James Wilson', 3),
        channel_id: channelMap['Engineering']
      },
      {
        content: "Performance test results from last night: Memory usage improved by 30% after optimizations! 🎉",
        user_id: getUserIdWithFallback('Maya Patel', 1),
        channel_id: channelMap['Engineering']
      },
      {
        content: "Automated report generation prototype is showing 95% accuracy with last month's data. Adding support for custom date ranges next.",
        user_id: getUserIdWithFallback('Riley Chen', 2),
        channel_id: channelMap['Engineering']
      },
      {
        content: "Security team reviewed the permission system concerns. Created a detailed runbook for the ops team with their feedback.",
        user_id: getUserIdWithFallback('James Wilson', 3),
        channel_id: channelMap['Engineering']
      },
      {
        content: "Error code standardization is merged to main! 🎉 All microservices now use the unified logging structure.",
        user_id: getUserIdWithFallback('Alex Kim', 0),
        channel_id: channelMap['Engineering']
      },
      {
        content: "Quick update: The front-end library upgrade discussion is scheduled for next week. Please review the RFC I shared in Notion.",
        user_id: getUserIdWithFallback('Maya Patel', 1),
        channel_id: channelMap['Engineering']
      }
    ]

    const { data: engMsgs } = await supabase
      .from('messages')
      .insert(engineeringMessages)
      .select()

    // Add threads about memory leak
    if (engMsgs) {
      const memoryLeakMsg = engMsgs.find(msg => msg.content.includes('memory leak'))
      if (memoryLeakMsg) {
        await supabase.from('messages').insert([
          {
            content: "Which version of event-stream-processor are we using? We should check if there's a patch available.",
            user_id: getUserIdWithFallback('Alex Kim', 0),
            channel_id: channelMap['Engineering'],
            parent_message_id: memoryLeakMsg.id
          },
          {
            content: "We're on 2.4.1. I'll open an issue with them and start working on a temporary fix in our code.",
            user_id: getUserIdWithFallback('Maya Patel', 1),
            channel_id: channelMap['Engineering'],
            parent_message_id: memoryLeakMsg.id
          },
          {
            content: "I can help profile the memory usage if you need another set of eyes. The reporting service has similar patterns.",
            user_id: getUserIdWithFallback('Riley Chen', 2),
            channel_id: channelMap['Engineering'],
            parent_message_id: memoryLeakMsg.id
          },
          {
            content: "Good idea to audit other services while we're at it. I'll set up memory monitoring across all instances.",
            user_id: getUserIdWithFallback('James Wilson', 3),
            channel_id: channelMap['Engineering'],
            parent_message_id: memoryLeakMsg.id
          }
        ])
      }

      // Add thread about permission migration
      const permissionMsg = engMsgs.find(msg => msg.content.includes('permission migration script'))
      if (permissionMsg) {
        await supabase.from('messages').insert([
          {
            content: "Great work! When are we planning to run this in prod?",
            user_id: getUserIdWithFallback('Alex Kim', 0),
            channel_id: channelMap['Engineering'],
            parent_message_id: permissionMsg.id
          },
          {
            content: "Tentatively next Wednesday. Working with ops team on the rollout plan.",
            user_id: getUserIdWithFallback('James Wilson', 3),
            channel_id: channelMap['Engineering'],
            parent_message_id: permissionMsg.id
          },
          {
            content: "Make sure we have the rollback procedure documented. Security team might want to review that too.",
            user_id: getUserIdWithFallback('Maya Patel', 1),
            channel_id: channelMap['Engineering'],
            parent_message_id: permissionMsg.id
          }
        ])
      }

      // Add thread about logging system refactor
      const loggingMsg = engMsgs.find(msg => msg.content.includes('logging system refactor'))
      if (loggingMsg) {
        await supabase.from('messages').insert([
          {
            content: "I can review this today. Are you planning to update the error codes in all microservices at once?",
            user_id: getUserIdWithFallback('Riley Chen', 2),
            channel_id: channelMap['Engineering'],
            parent_message_id: loggingMsg.id
          },
          {
            content: "Let's do it in phases. Starting with the core services first, then rolling out to others.",
            user_id: getUserIdWithFallback('Alex Kim', 0),
            channel_id: channelMap['Engineering'],
            parent_message_id: loggingMsg.id
          },
          {
            content: "Good approach. We should document the new error code standards in the wiki.",
            user_id: getUserIdWithFallback('James Wilson', 3),
            channel_id: channelMap['Engineering'],
            parent_message_id: loggingMsg.id
          },
          {
            content: "I'll help with the documentation. Already have some examples from the admin dashboard.",
            user_id: getUserIdWithFallback('Maya Patel', 1),
            channel_id: channelMap['Engineering'],
            parent_message_id: loggingMsg.id
          }
        ])
      }

      // Add thread about automated reporting
      const reportingMsg = engMsgs.find(msg => msg.content.includes('report generation prototype'))
      if (reportingMsg) {
        await supabase.from('messages').insert([
          {
            content: "That's impressive accuracy! What's causing the 5% discrepancy?",
            user_id: getUserIdWithFallback('Maya Patel', 1),
            channel_id: channelMap['Engineering'],
            parent_message_id: reportingMsg.id
          },
          {
            content: "Mostly edge cases with timezone handling in historical data. Working on a fix.",
            user_id: getUserIdWithFallback('Riley Chen', 2),
            channel_id: channelMap['Engineering'],
            parent_message_id: reportingMsg.id
          },
          {
            content: "Let me know if you need help with the timezone logic. Had similar issues in the logging system.",
            user_id: getUserIdWithFallback('Alex Kim', 0),
            channel_id: channelMap['Engineering'],
            parent_message_id: reportingMsg.id
          }
        ])
      }

      // Add thread about front-end library upgrade
      const frontendMsg = engMsgs.find(msg => msg.content.includes('front-end library upgrade'))
      if (frontendMsg) {
        await supabase.from('messages').insert([
          {
            content: "Just reviewed the RFC. Are we planning to handle the breaking changes in one PR or split them up?",
            user_id: getUserIdWithFallback('Riley Chen', 2),
            channel_id: channelMap['Engineering'],
            parent_message_id: frontendMsg.id
          },
          {
            content: "I'd recommend splitting it up by feature area. Less risky that way.",
            user_id: getUserIdWithFallback('James Wilson', 3),
            channel_id: channelMap['Engineering'],
            parent_message_id: frontendMsg.id
          },
          {
            content: "Agreed. I'll create a migration plan with smaller PRs. We can discuss the order in the meeting.",
            user_id: getUserIdWithFallback('Maya Patel', 1),
            channel_id: channelMap['Engineering'],
            parent_message_id: frontendMsg.id
          }
        ])
      }
    }

    // Seed marketing channel messages
    const marketingMessages: Message[] = [
      {
        content: "The new brand colors are getting great feedback from focus groups!",
        user_id: getUserIdWithFallback('Daniel Reed', 0),
        channel_id: channelMap['Marketing']
      },
      {
        content: "First round of TikTok content is performing above industry average. Good call on this strategy @Ava!",
        user_id: getUserIdWithFallback('Olivia Brooks', 1),
        channel_id: channelMap['Marketing']
      },
      {
        content: "Just finished the competitor analysis for Q1. Some interesting trends to discuss.",
        user_id: getUserIdWithFallback('Liam Harris', 2),
        channel_id: channelMap['Marketing']
      },
      {
        content: "Website traffic up 25% since implementing the new SEO strategy",
        user_id: getUserIdWithFallback('Sophia Turner', 3),
        channel_id: channelMap['Marketing']
      },
      {
        content: "Typography update: Switching to Inter for better readability on mobile",
        user_id: getUserIdWithFallback('Daniel Reed', 0),
        channel_id: channelMap['Marketing']
      },
      {
        content: "Second influencer's video just dropped - already at 50k views!",
        user_id: getUserIdWithFallback('Ava Collins', 4),
        channel_id: channelMap['Marketing']
      },
      {
        content: "Updated brand guidelines are in Figma - added dark mode variants",
        user_id: getUserIdWithFallback('Daniel Reed', 0),
        channel_id: channelMap['Marketing']
      },
      {
        content: "LinkedIn campaign metrics for last month: 3.2% CTR, 12k impressions",
        user_id: getUserIdWithFallback('Sophia Turner', 3),
        channel_id: channelMap['Marketing']
      },
      {
        content: "Content calendar for Q2 is ready for review",
        user_id: getUserIdWithFallback('Liam Harris', 2),
        channel_id: channelMap['Marketing']
      },
      {
        content: "Just got confirmation from our keynote speaker for the webinar!",
        user_id: getUserIdWithFallback('Sophia Turner', 3),
        channel_id: channelMap['Marketing']
      },
      {
        content: "New landing page mockups are in. Big focus on conversion optimization.",
        user_id: getUserIdWithFallback('Daniel Reed', 0),
        channel_id: channelMap['Marketing']
      },
      {
        content: "Social engagement up 40% with the new brand voice guidelines",
        user_id: getUserIdWithFallback('Ava Collins', 4),
        channel_id: channelMap['Marketing']
      },
      {
        content: "Email newsletter redesign is live. A/B testing two different layouts.",
        user_id: getUserIdWithFallback('Liam Harris', 2),
        channel_id: channelMap['Marketing']
      },
      {
        content: "PR opportunity: Tech magazine wants to feature our rebrand story",
        user_id: getUserIdWithFallback('Olivia Brooks', 1),
        channel_id: channelMap['Marketing']
      },
      {
        content: "Just wrapped video shoot for the product launch. Footage looks amazing!",
        user_id: getUserIdWithFallback('Ava Collins', 4),
        channel_id: channelMap['Marketing']
      }
    ]

    const { data: mktMsgs } = await supabase
      .from('messages')
      .insert(marketingMessages)
      .select()

    // Add some threads to interesting discussions
    if (engMsgs) {
      // Thread about memory leak
      const memoryLeakMsg = engMsgs.find(msg => msg.content.includes('memory leak'))
      if (memoryLeakMsg) {
        await supabase.from('messages').insert([
          {
            content: "Can you share which library? We might be using it elsewhere.",
            user_id: getUserIdWithFallback('Alex Kim', 0),
            channel_id: channelMap['engineering'],
            parent_message_id: memoryLeakMsg.id
          },
          {
            content: "It's the event-stream-processor package. Opening an issue with them now.",
            user_id: getUserIdWithFallback('Maya Patel', 2),
            channel_id: channelMap['engineering'],
            parent_message_id: memoryLeakMsg.id
          },
          {
            content: "Good catch. Let's audit other packages while we're at it.",
            user_id: getUserIdWithFallback('James Wilson', 3),
            channel_id: channelMap['engineering'],
            parent_message_id: memoryLeakMsg.id
          }
        ])
      }
    }

    if (mktMsgs) {
      // Thread about TikTok performance
      const tiktokMsg = mktMsgs.find(msg => msg.content.includes('TikTok'))
      if (tiktokMsg) {
        await supabase.from('messages').insert([
          {
            content: "What's driving the high engagement? Specific hashtags or content type?",
            user_id: getUserIdWithFallback('Olivia Brooks', 1),
            channel_id: channelMap['Marketing'],
            parent_message_id: tiktokMsg.id
          },
          {
            content: "Tutorial-style content is performing best. Average watch time 45 seconds.",
            user_id: getUserIdWithFallback('Ava Collins', 4),
            channel_id: channelMap['Marketing'],
            parent_message_id: tiktokMsg.id
          },
          {
            content: "Should we do a deep-dive on this in next week's meeting?",
            user_id: getUserIdWithFallback('Liam Harris', 2),
            channel_id: channelMap['Marketing'],
            parent_message_id: tiktokMsg.id
          }
        ])
      }
    }

    // Seed random channel messages
    const randomMessages: Message[] = [
      {
        content: "🎉 Big congratulations to Maya on 5 years with the company! Cake in the break room at 3pm!",
        user_id: getUserIdWithFallback('Olivia Brooks', 1),
        channel_id: channelMap['random']
      },
      {
        content: "Quick heads up: Starting next month, engineering standup will be 30 minutes later at 9:30 AM",
        user_id: getUserIdWithFallback('Alex Kim', 0),
        channel_id: channelMap['random']
      }
    ]

    await supabase.from('messages').insert(randomMessages)

    // Add reactions to messages
    const validReactions = ["👍", "❤️", "💡", "🔥", "🎉", "🏆", "❓", "👀"] as const;
    
    // Helper function to safely get user ID
    const getUserId = (name: string): string => {
      const user = userMap[name];
      if (!user?.id) throw new Error(`User ${name} not found in userMap`);
      return user.id;
    };
    
    // Add multiple reactions to the brand colors message
    if (mktMsgs && mktMsgs[0]) {
      const brandColorReactions: Reaction[] = [
        // Multiple people agreeing
        {
          message_id: mktMsgs[0].id,
          user_id: getUserId('Ava Collins'),
          emoji: "👍" // Agree/Support
        },
        {
          message_id: mktMsgs[0].id,
          user_id: getUserId('Liam Harris'),
          emoji: "👍" // Agree/Support
        },
        {
          message_id: mktMsgs[0].id,
          user_id: getUserId('Maya Patel'),
          emoji: "👍" // Agree/Support
        },
        // Celebration reactions
        {
          message_id: mktMsgs[0].id,
          user_id: getUserId('Sophia Turner'),
          emoji: "🎉" // Celebration
        },
        {
          message_id: mktMsgs[0].id,
          user_id: getUserId('Daniel Reed'),
          emoji: "🏆" // Big win
        }
      ]
      await supabase.from('reactions').insert(brandColorReactions)
    }

    // Add reactions to the memory leak fix message
    if (engMsgs) {
      const memoryLeakMsg = engMsgs.find(msg => msg.content.includes('memory leak'))
      if (memoryLeakMsg) {
        const memoryLeakReactions: Reaction[] = [
          // Multiple celebrations for fixing the bug
          {
            message_id: memoryLeakMsg.id,
            user_id: getUserId('Alex Kim'),
            emoji: "🎉" // Celebration
          },
          {
            message_id: memoryLeakMsg.id,
            user_id: getUserId('Riley Chen'),
            emoji: "🎉" // Celebration
          },
          // Recognition of good work
          {
            message_id: memoryLeakMsg.id,
            user_id: getUserId('James Wilson'),
            emoji: "🏆" // Big win
          },
          // Interest in the finding
          {
            message_id: memoryLeakMsg.id,
            user_id: getUserId('Olivia Brooks'),
            emoji: "👀" // Interesting
          }
        ]
        await supabase.from('reactions').insert(memoryLeakReactions)
      }
    }

    // Add reactions to the Maya's anniversary message in random channel
    if (randomMessages[0]?.id) {
      const anniversaryReactions: Reaction[] = [
        // Lots of celebration reactions
        {
          message_id: randomMessages[0].id,
          user_id: getUserIdWithFallback('Alex Kim', 0),
          emoji: "🎉" // Celebration
        },
        {
          message_id: randomMessages[0].id,
          user_id: getUserIdWithFallback('James Wilson', 3),
          emoji: "🎉" // Celebration
        },
        {
          message_id: randomMessages[0].id,
          user_id: getUserIdWithFallback('Riley Chen', 1),
          emoji: "🎉" // Celebration
        },
        // Love reactions
        {
          message_id: randomMessages[0].id,
          user_id: getUserIdWithFallback('Ava Collins', 4),
          emoji: "❤️" // Love it
        },
        {
          message_id: randomMessages[0].id,
          user_id: getUserIdWithFallback('Sophia Turner', 5),
          emoji: "❤️" // Love it
        },
        // Trophy for the achievement
        {
          message_id: randomMessages[0].id,
          user_id: getUserIdWithFallback('Daniel Reed', 6),
          emoji: "🏆" // Big win
        }
      ]
      await supabase.from('reactions').insert(anniversaryReactions)
    }

    // Add some reactions to the standup time change message
    if (randomMessages[1]?.id) {
      const standupReactions: Reaction[] = [
        // Questions about the change
        {
          message_id: randomMessages[1].id,
          user_id: getUserIdWithFallback('Maya Patel', 2),
          emoji: "❓" // Needs clarification
        },
        {
          message_id: randomMessages[1].id,
          user_id: getUserIdWithFallback('Riley Chen', 1),
          emoji: "❓" // Needs clarification
        },
        // Acknowledgments
        {
          message_id: randomMessages[1].id,
          user_id: getUserIdWithFallback('James Wilson', 3),
          emoji: "👍" // Agree/Support
        },
        {
          message_id: randomMessages[1].id,
          user_id: getUserIdWithFallback('Olivia Brooks', 7),
          emoji: "👍" // Agree/Support
        }
      ]
      await supabase.from('reactions').insert(standupReactions)
    }

    // Create some 1-on-1 chats between random pairs of users
    const chatPairs = users.slice(0, -1).map((user, index) => [user, users[index + 1]])

    for (const [user1, user2] of chatPairs) {
      const { data: chat } = await supabase
        .from('chats')
        .insert({ organization_id: org.id })
        .select()
        .single()

      if (!chat) continue

      await supabase.from('chat_members').insert([
        { chat_id: chat.id, user_id: user1.id },
        { chat_id: chat.id, user_id: user2.id }
      ])

      // Add some test messages to each chat
      await supabase.from('messages').insert([
        {
          content: 'Hey there!',
          user_id: user1.id,
          chat_id: chat.id
        },
        {
          content: 'Hi! How are you?',
          user_id: user2.id,
          chat_id: chat.id
        }
      ])
    }

    console.log('Database reset and seed completed successfully!')
  } catch (error) {
    console.error('Error during reset and seed:', error)
    process.exit(1)
  }
}

resetAndSeed() 