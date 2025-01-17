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

export async function textDocumentSummary(
  
  contextText: string,
  
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: "Create a concise summary (max 300 words) of the document that captures its key points, main decisions, and essential context. Focus on unique, identifying information that would help retrieve this document when relevant. Format in plain text without markdown. Exclude generic phrases, greetings, or meta-commentary. The summary should be detailed enough to distinguish this document from similar ones, but brief enough to fit in a single embedding."
      },
      {
        role: "user", 
        content: `Document to summarize:\n\n${contextText}`
      }
    ],
    temperature: 0.2,
  });

  return completion.choices[0]?.message?.content || "";
}