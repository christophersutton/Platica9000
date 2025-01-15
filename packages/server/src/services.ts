import { ChatHistoryMessage, SearchResult, SourceDocument } from './types';
import { 
  INDEX_HOST, 
  RELEVANCE_THRESHOLD_CLIENT, 
  RELEVANCE_THRESHOLD_GPT,
  openai, 
  pinecone, 
  supabase 
} from './config';

export function processContent(content: string | null): string {
  if (!content) return '';
  return content
    .replace(/\\n/g, '\n')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

export async function searchPinecone(query: string): Promise<SearchResult[]> {
  const searchResponse = await fetch(`https://${INDEX_HOST}/records/namespaces/minutes/search`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Api-Key': process.env.PINECONE_API_KEY!,
      'X-Pinecone-API-Version': '2025-01'
    },
    body: JSON.stringify({
      query: {
        inputs: { text: query },
        top_k: 5
      },
    })
  });

  if (!searchResponse.ok) {
    const errorText = await searchResponse.text();
    throw new Error(`Pinecone search failed: ${errorText}`);
  }

  const searchResults = await searchResponse.json();
  return searchResults.result.hits.map(hit => ({
    id: hit._id,
    score: hit._score,
    metadata: hit.fields || {},
    content: ''  // Will be populated with Supabase data
  }));
}

export async function fetchMinutesContent(docIds: string[]): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('minutes')
    .select('*')
    .in('id', docIds);

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  return Object.fromEntries(
    (data || []).map(record => [record.id.toString(), processContent(record.content)])
  );
}

export function prepareSourceDocs(results: SearchResult[]): SourceDocument[] {
  return results
    .filter(result => result.score >= RELEVANCE_THRESHOLD_CLIENT && result.content)
    .map(result => {
      const metadata = result.metadata as { time_period_start?: string };
      const date = metadata?.time_period_start 
        ? new Date(metadata.time_period_start).toISOString().split('T')[0]
        : null;

      return {
        id: result.id,
        date,
        content: result.content,
        score: result.score
      };
    })
    .sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
}

export async function streamChatCompletion(
  query: string,
  contextText: string,
  conversationHistory: ChatHistoryMessage[],
  onChunk: (chunk: string) => void
) {
  const stream = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",  // Updated to correct model name
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that answers questions based on meeting minutes context. Keep responses concise and relevant. Use shorthand for names and dates. Do not include long lists. Maintain conversation context from previous messages."
      },
      ...conversationHistory,
      {
        role: "user",
        content: `Context from relevant meeting minutes:\n\n${contextText}\n\nQuestion: ${query}`
      }
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 500
  });

  let accumulatedText = '';
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    accumulatedText += content;
    if (content) {
      onChunk(content);
    }
  }
  return accumulatedText;
} 