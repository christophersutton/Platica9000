import { openai } from "../config";
import { ChatHistoryMessage } from "../types";

export async function streamChatCompletion(
  query: string,
  contextText: string,
  conversationHistory: ChatHistoryMessage[],
  onChunk: (chunk: string) => void
): Promise<string> {
  const stream = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview", // or your intended model
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

  let accumulatedText = "";
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    accumulatedText += content;
    if (content) {
      onChunk(content);
    }
  }
  return accumulatedText;
}

export async function uploadSummary(
  
  contextText: string,
  
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that summarizes documents for embeddings for later retrieval. You will be given a document and you will need to summarize it in a way that is useful for this task. Return a markdown formatted summary with the most important information and nothing else."
      },
      {
        role: "user", 
        content: `Document to summarize:\n\n${contextText}`
      }
    ],
    temperature: 0.3,
  });

  return completion.choices[0]?.message?.content || "";
}
