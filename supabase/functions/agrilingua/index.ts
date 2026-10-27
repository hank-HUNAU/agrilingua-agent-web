import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const COZE_API_BASE = Deno.env.get("COZE_API_BASE") || "https://api.coze.cn";
const COZE_API_TOKEN_DIRECT = Deno.env.get("COZE_API_TOKEN") || "";
const COZE_API_TOKEN_ALIAS = Deno.env.get("agrilingua-web") || "";
const COZE_API_TOKEN = COZE_API_TOKEN_ALIAS || COZE_API_TOKEN_DIRECT;
const COZE_BOT_ID = Deno.env.get("COZE_BOT_ID") || "";
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";
const RATE_LIMIT_ENABLED = (Deno.env.get("RATE_LIMIT_ENABLED") || "false") === "true";
const RATE_LIMIT_PER_DAY = Number(Deno.env.get("RATE_LIMIT_PER_DAY") || "60");
const COZE_TIMEOUT_MS = Number(Deno.env.get("COZE_TIMEOUT_MS") || "140000");

const MAX_TEXT_LENGTH = 3000;
const MAX_IMAGES = 2;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type CozeMessage = {
  role?: string;
  type?: string;
  content?: string;
  content_type?: string;
};

type CozeChat = {
  id?: string;
  conversation_id?: string;
  status?: string;
  last_error?: { code?: number; msg?: string } | null;
};

function corsHeaders(req: Request): HeadersInit {
  const requestOrigin = req.headers.get("origin") || "";
  const allowedOrigin =
    ALLOWED_ORIGIN === "*" || requestOrigin === ALLOWED_ORIGIN
      ? (ALLOWED_ORIGIN === "*" ? "*" : requestOrigin)
      : ALLOWED_ORIGIN;

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin"
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(req)
  });
}

function failure(req: Request, status: number, message: string): Response {
  return json(req, { error: message }, status);
}

function requireConfiguration(): void {
  if (!COZE_API_TOKEN || !COZE_BOT_ID) {
    throw new Error("服务端尚未配置扣子访问令牌或智能体 ID。");
  }
}

function languageInstruction(language: string): string {
  if (language === "en") return "Reply in English.";
  if (language === "ja") return "日本語で回答してください。";
  return "请用中文回答。";
}

function defaultQuestion(language: string): string {
  if (language === "en") {
    return "Analyze these grape photos and give today's actions and a seven-day plan.";
  }
  if (language === "ja") {
    return "このブドウの写真を分析し、今日の対応と7日間の計画を示してください。";
  }
  return "请分析这些葡萄照片，并给出今天和未来7天的处理建议。";
}

function buildUserText(
  text: string,
  language: string,
  country: string,
  stage: string,
  weather: string
): string {
  const parts = [
    text || defaultQuestion(language),
    languageInstruction(language)
  ];

  const context: string[] = [];
  if (country) context.push(`Country: ${country}`);
  if (stage) context.push(`Grape stage: ${stage}`);
  if (weather) context.push(`Recent weather: ${weather}`);
  if (context.length) parts.push(`Field context:\n${context.join("\n")}`);

  return parts.join("\n\n");
}

async function cozeFetch(
  path: string,
  init: RequestInit,
  timeoutMs = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(`${COZE_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${COZE_API_TOKEN}`,
        ...(init.headers || {})
      },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

async function uploadImage(image: File): Promise<string> {
  if (!image.type.startsWith("image/")) {
    throw new Error("只能上传图片文件。");
  }
  if (image.size > MAX_IMAGE_BYTES) {
    throw new Error("单张图片不能超过 8 MB。");
  }

  const form = new FormData();
  form.append("file", image, image.name || "grape-photo.jpg");

  const response = await cozeFetch("/v1/files/upload", {
    method: "POST",
    body: form
  });
  const payload = await response.json();

  if (!response.ok || payload.code !== 0 || !payload.data?.id) {
    throw new Error(payload.msg || "图片上传到扣子失败。");
  }

  return String(payload.data.id);
}

async function createChat(
  userId: string,
  text: string,
  imageIds: string[],
  conversationId: string
): Promise<CozeChat> {
  const query = conversationId
    ? `?conversation_id=${encodeURIComponent(conversationId)}`
    : "";

  const contentParts: Array<Record<string, string>> = [
    { type: "text", text }
  ];
  for (const fileId of imageIds) {
    contentParts.push({ type: "image", file_id: fileId });
  }

  const payload = {
    bot_id: COZE_BOT_ID,
    user_id: userId,
    stream: false,
    auto_save_history: true,
    additional_messages: [
      {
        role: "user",
        content:
          imageIds.length > 0
            ? JSON.stringify(contentParts)
            : text,
        content_type: imageIds.length > 0 ? "object_string" : "text"
      }
    ]
  };

  const response = await cozeFetch(`/v3/chat${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json();

  if (!response.ok || result.code !== 0 || !result.data?.id) {
    throw new Error(result.msg || "启动扣子对话失败。");
  }

  return result.data as CozeChat;
}

function isFinished(chat: CozeChat): boolean {
  return ["completed", "compleated", "failed", "canceled"].includes(
    String(chat.status || "").toLowerCase()
  );
}

async function waitForChat(chat: CozeChat): Promise<CozeChat> {
  const startedAt = Date.now();
  let current = chat;

  while (!isFinished(current)) {
    if (Date.now() - startedAt > COZE_TIMEOUT_MS) {
      throw new Error("智能体处理超时，请稍后重试。");
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
    const query = new URLSearchParams({
      conversation_id: String(current.conversation_id || ""),
      chat_id: String(current.id || "")
    });
    const response = await cozeFetch(
      `/v3/chat/retrieve?${query.toString()}`,
      { method: "GET" }
    );
    const result = await response.json();

    if (!response.ok || result.code !== 0 || !result.data) {
      throw new Error(result.msg || "查询智能体状态失败。");
    }
    current = result.data as CozeChat;
  }

  if (!["completed", "compleated"].includes(String(current.status || "").toLowerCase())) {
    throw new Error(current.last_error?.msg || "智能体对话未正常完成。");
  }

  return current;
}

async function listMessages(chat: CozeChat): Promise<CozeMessage[]> {
  const query = new URLSearchParams({
    conversation_id: String(chat.conversation_id || ""),
    chat_id: String(chat.id || "")
  });
  const response = await cozeFetch(
    `/v3/chat/message/list?${query.toString()}`,
    { method: "GET" }
  );
  const result = await response.json();

  if (!response.ok || result.code !== 0 || !Array.isArray(result.data)) {
    throw new Error(result.msg || "读取智能体回答失败。");
  }

  return result.data as CozeMessage[];
}

function extractReply(messages: CozeMessage[]): string {
  return messages
    .filter(
      (message) =>
        message.role === "assistant" &&
        message.type === "answer" &&
        typeof message.content === "string"
    )
    .map((message) => String(message.content || "").trim())
    .filter(Boolean)
    .join("\n\n");
}

async function enforceRateLimit(req: Request, userId: string): Promise<void> {
  if (!RATE_LIMIT_ENABLED) return;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) {
    throw new Error("限流服务未配置。");
  }

  const forwarded = req.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0].trim() || "unknown";
  const bucket = ip;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data, error } = await supabase.rpc("consume_chat_rate_limit", {
    p_bucket: bucket,
    p_limit: RATE_LIMIT_PER_DAY,
    p_window_seconds: 86400
  });

  if (error) {
    throw new Error("访问次数校验失败。");
  }
  if (data !== true) {
    throw new Error("今天的免费使用次数已用完，请明天再试。");
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return failure(req, 405, "仅支持 POST 请求。");
  }

  try {
    requireConfiguration();

    const form = await req.formData();
    const text = String(form.get("text") || "").trim();
    const language = String(form.get("language") || "en").toLowerCase();
    const country = String(form.get("country") || "").trim();
    const stage = String(form.get("stage") || "").trim();
    const weather = String(form.get("weather") || "").trim();
    const conversationId = String(form.get("conversation_id") || "").trim();
    const rawClientId = String(req.headers.get("x-client-id") || "").trim();
    const userId = /^[a-zA-Z0-9_-]{8,64}$/.test(rawClientId)
      ? rawClientId
      : `web_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;

    if (!["zh", "en", "ja"].includes(language)) {
      return failure(req, 400, "不支持的语言。");
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return failure(req, 400, "问题太长，请控制在 3000 个字符以内。");
    }

    const images = form
      .getAll("images")
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (images.length > MAX_IMAGES) {
      return failure(req, 400, "最多上传两张照片。");
    }
    if (!text && images.length === 0) {
      return failure(req, 400, "请输入问题或上传至少一张图片。");
    }

    await enforceRateLimit(req, userId);

    const imageIds = await Promise.all(images.map(uploadImage));
    const userText = buildUserText(text, language, country, stage, weather);
    const created = await createChat(userId, userText, imageIds, conversationId);
    const completed = await waitForChat(created);
    const messages = await listMessages(completed);
    const reply = extractReply(messages);

    if (!reply) {
      throw new Error("智能体没有返回可显示的回答。");
    }

    return json(req, {
      reply,
      conversationId: completed.conversation_id || "",
      chatId: completed.id || "",
      language
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "服务暂时不可用。";
    console.error("agrilingua_error", message);
    return failure(req, 500, message);
  }
});

