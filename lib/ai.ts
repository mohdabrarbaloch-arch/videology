export interface VideoAnalysis {
  summary: string;
  keyPoints: string[];
  topics: string[];
  chapters: { time: string; title: string }[];
  importantMoments: string[];
  learningInsights: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ThumbnailConcept {
  title: string;
  subtitle: string;
  emoji: string;
  description: string;
}

const THUMB_CONCEPTS = [
  { emoji: "🎯", title: "Master It Fast", subtitle: "The simple system", description: "Show the single most concrete outcome the video promises, framed as a bold claim." },
  { emoji: "🚀", title: "Level Up Now", subtitle: "Skip the struggle", description: "Focus on transformation — where the viewer starts vs where they end up." },
  { emoji: "💡", title: "The Big Idea", subtitle: "In 5 minutes", description: "One strong central idea from the content, kept clean and uncluttered." },
  { emoji: "🤯", title: "You Won't Expect This", subtitle: "Surprising truth", description: "A counterintuitive or surprising angle that creates curiosity." },
  { emoji: "📈", title: "Proven Results", subtitle: "Step by step", description: "Emphasize a method, framework, or exact steps the video teaches." },
  { emoji: "🏆", title: "The Shortcut", subtitle: "Do it right", description: "Position the content as the faster, smarter way to achieve the goal." },
] as const;

function isOpenRouterKey(key: string): boolean {
  return key.startsWith("sk-or-v1-");
}

function getBaseUrl(): string {
  return isOpenRouterKey(process.env.OPENAI_API_KEY || "")
    ? "https://openrouter.ai/api/v1"
    : "https://api.openai.com/v1";
}

function getModel(): string {
  return isOpenRouterKey(process.env.OPENAI_API_KEY || "")
    ? "openai/gpt-4o-mini"
    : "gpt-4o-mini";
}

async function callOpenAI(messages: { role: string; content: string }[], maxTokens = 2000): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetch(`${getBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: getModel(),
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI API error: ${err}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackAnalysis(transcript: string): VideoAnalysis {
  const sentences = transcript.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  const summary = sentences.slice(0, 3).join(". ").trim() + ".";

  const keyPoints = sentences.slice(0, 5).map((s) => s.trim());

  const words = transcript.toLowerCase().split(/\s+/);
  const wordFreq: Record<string, number> = {};
  words.forEach((w) => {
    if (w.length > 4) wordFreq[w] = (wordFreq[w] || 0) + 1;
  });
  const topics = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

  return {
    summary: summary || "No summary available. Set OPENAI_API_KEY for AI-powered analysis.",
    keyPoints: keyPoints.length ? keyPoints : ["Set OPENAI_API_KEY for AI-powered key points extraction."],
    topics: topics.length ? topics : ["General"],
    chapters: [{ time: "00:00", title: "Full Video" }],
    importantMoments: ["Enable AI analysis for important moments detection."],
    learningInsights: ["Add OPENAI_API_KEY to .env for learning insights."],
  };
}

export async function analyzeVideo(transcript: string, title: string): Promise<VideoAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackAnalysis(transcript);
  }

  try {
    const response = await callOpenAI([
      {
        role: "system",
        content: `You are an expert video analyst. Analyze the video transcript and return a JSON object with the following structure:
{
  "summary": "A concise 2-3 sentence summary of the video",
  "keyPoints": ["key point 1", "key point 2", ...],
  "topics": ["topic 1", "topic 2", ...],
  "chapters": [{"time": "MM:SS", "title": "Chapter Title"}, ...],
  "importantMoments": ["moment 1", "moment 2", ...],
  "learningInsights": ["insight 1", "insight 2", ...]
}
Return ONLY the JSON object, no other text.`,
      },
      {
        role: "user",
        content: `Video Title: "${title}"\n\nTranscript:\n${transcript.slice(0, 12000)}`,
      },
    ], 2000);

    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("AI analysis failed, using fallback:", error);
    return fallbackAnalysis(transcript);
  }
}

function fallbackThumbnailConcepts(title: string): ThumbnailConcept[] {
  const base = title.replace(/\s+/g, " ").trim() || "Your Video";
  return THUMB_CONCEPTS.slice(0, 4).map((c, i) => ({
    ...c,
    title: c.title,
    subtitle: c.subtitle,
    description:
      i === 0
        ? `Use "${base}" as the anchor so viewers instantly know what the video is about.`
        : c.description,
  }));
}

export async function generateThumbnailConcepts(
  transcript: string,
  title: string
): Promise<ThumbnailConcept[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackThumbnailConcepts(title);
  }

  try {
    const response = await callOpenAI([
      {
        role: "system",
        content: `You are a viral YouTube thumbnail designer. Based on the video, create 4 distinct thumbnail concepts as a JSON array. Each object:
{
  "title": "Short punchy on-thumbnail text (max 5 words)",
  "subtitle": "One short supporting line (max 4 words)",
  "emoji": "A single relevant emoji",
  "description": "1 sentence explaining the visual design, colors and layout"
}
Return ONLY the JSON array.`,
      },
      {
        role: "user",
        content: `Video Title: "${title}"\n\nTranscript:\n${transcript.slice(0, 8000)}`,
      },
    ], 1000);

    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return fallbackThumbnailConcepts(title);
    return parsed.slice(0, 4).map((c: Partial<ThumbnailConcept>) => ({
      title: String(c.title ?? "").slice(0, 40),
      subtitle: String(c.subtitle ?? "").slice(0, 30),
      emoji: String(c.emoji ?? "🎬").slice(0, 4),
      description: String(c.description ?? "").slice(0, 160),
    }));
  } catch (error) {
    console.error("Thumbnail concept generation failed, using fallback:", error);
    return fallbackThumbnailConcepts(title);
  }
}

export async function chatWithVideo(
  transcript: string,
  title: string,
  message: string,
  history: { role: string; content: string }[] = []
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return "AI chat requires an OpenAI API key. Please add OPENAI_API_KEY to your .env file.";
  }

  const messages = [
    {
      role: "system",
      content: `You are a helpful AI assistant that answers questions about a video. Use the transcript below to answer the user's questions accurately. Be concise and helpful.\n\nVideo Title: "${title}"\n\nTranscript:\n${transcript.slice(0, 12000)}`,
    },
    ...history.slice(-10),
    { role: "user", content: message },
  ];

  return callOpenAI(messages, 1000);
}

export async function generateQuiz(transcript: string, title: string): Promise<{ title: string; questions: QuizQuestion[] }> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      title: `Quiz: ${title}`,
      questions: [
        {
          question: "AI-powered quizzes require an OpenAI API key. Add OPENAI_API_KEY to your .env file.",
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctIndex: 0,
          explanation: "This is a placeholder question.",
        },
      ],
    };
  }

  try {
    const response = await callOpenAI([
      {
        role: "system",
        content: `You are an expert quiz creator. Based on the video transcript, create a quiz with exactly 10 multiple choice questions. Return a JSON object:
{
  "title": "Quiz: ${title}",
  "questions": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Short 1-line explanation"
    }
  ]
}
Keep explanations to one short sentence. Return ONLY the JSON object.`,
      },
      {
        role: "user",
        content: `Video Title: "${title}"\n\nTranscript:\n${transcript.slice(0, 12000)}`,
      },
    ], 2000);

    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Quiz generation failed:", error);
    return {
      title: `Quiz: ${title}`,
      questions: [
        {
          question: "Failed to generate quiz. Please try again.",
          options: ["Retry", "Check API key", "Contact support", "Skip"],
          correctIndex: 0,
          explanation: "An error occurred during quiz generation.",
        },
      ],
    };
  }
}
