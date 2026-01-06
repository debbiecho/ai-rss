import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getOpenAIClient } from "@/lib/openai";
import { htmlToText } from "@/lib/text";

type SummarizeRequest = {
  title?: string;
  date?: string;
  content?: string;
};

const MAX_CONTENT_LENGTH = 25000;
const REQUEST_TIMEOUT_MS = 20000;

export async function POST(request: Request) {
  let body: SummarizeRequest;

  try {
    body = (await request.json()) as SummarizeRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const title = body.title?.trim();
  const date = body.date?.trim();
  const content = body.content?.trim();

  if (!title || !date || !content) {
    return NextResponse.json(
      { error: "Missing title, date, or content." },
      { status: 400 }
    );
  }

  const text = htmlToText(content);
  if (!text) {
    return NextResponse.json(
      { error: "Content is empty after stripping HTML." },
      { status: 400 }
    );
  }

  const capped = text.slice(0, MAX_CONTENT_LENGTH);
  const client = getOpenAIClient();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await client.responses.create(
      {
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You are an AI assistant that summarizes daily AI news issues for technical readers. Respond in Chinese. Format: 3-6 bullet points of key info, followed by one short line starting with '一句话结论：'. Keep it concise.",
          },
          {
            role: "user",
            content: `标题：${title}\n日期：${date}\n内容：\n${capped}`,
          },
        ],
      },
      { signal: controller.signal }
    );

    const summary = response.output_text?.trim();
    if (!summary) {
      return NextResponse.json(
        { error: "Empty summary returned." },
        { status: 500 }
      );
    }

    return NextResponse.json({ summary });
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `OpenAI error: ${error.message}` },
        { status: error.status ?? 500 }
      );
    }
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "OpenAI request timed out. Please try again." },
        { status: 504 }
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate summary.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}
