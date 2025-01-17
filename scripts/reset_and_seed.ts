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

    // Get existing channels
    const { data: channels } = await supabase
      .from('channels')
      .select('*')
      .in('name', ['Engineering', 'Marketing', 'Random'])

    if (!channels || channels.length === 0) throw new Error('Required channels not found')

    // Add all users to all channels
    const channelMembers = channels.flatMap(channel =>
      users.map(user => ({
        channel_id: channel.id,
        user_id: user.id,
        role: 'member'
      }))
    )

    await supabase.from('channel_members').insert(channelMembers)

    // Get channel IDs by name for easy reference
    const channelMap = channels.reduce((acc, channel) => {
      acc[channel.name] = channel.id
      return acc
    }, {} as Record<string, string>)

    // Seed engineering channel messages
    const engineeringMessages: Message[] = [
      {
        content: "Just pushed the logging system refactor. Anyone available for code review?",
        user_id: getUserIdWithFallback('Alex Kim', 0),
        channel_id: channelMap['Engineering']
      },
      {
        content: "I'll take a look. Is this the one with the new error formatting?",
        user_id: getUserIdWithFallback('Riley Chen', 1),
        channel_id: channelMap['Engineering']
      },
      {
        content: "The batch operations are timing out on large datasets. Looking into potential memory leaks.",
        user_id: getUserIdWithFallback('Maya Patel', 2),
        channel_id: channelMap['Engineering']
      },
      {
        content: "@Maya I'm seeing similar timeouts in the reporting module. Could be related?",
        user_id: getUserIdWithFallback('Riley Chen', 1),
        channel_id: channelMap['Engineering']
      },
      {
        content: "Security audit findings: we need to standardize permission checks across services",
        user_id: getUserIdWithFallback('James Wilson', 3),
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
            content: "Can you share which library? We might be using it elsewhere.",
            user_id: getUserIdWithFallback('Alex Kim', 0),
            channel_id: channelMap['Engineering'],
            parent_message_id: memoryLeakMsg.id
          },
          {
            content: "It's the event-stream-processor package. Opening an issue with them now.",
            user_id: getUserIdWithFallback('Maya Patel', 2),
            channel_id: channelMap['Engineering'],
            parent_message_id: memoryLeakMsg.id
          },
          {
            content: "Good catch. Let's audit other packages while we're at it.",
            user_id: getUserIdWithFallback('James Wilson', 3),
            channel_id: channelMap['Engineering'],
            parent_message_id: memoryLeakMsg.id
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