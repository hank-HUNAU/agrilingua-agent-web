(function () {
  "use strict";

  const config = window.AGRI_CONFIG || {};
  const maxImages = 2;
  const maxImageSide = 1600;
  const maxUploadBytes = 8 * 1024 * 1024;

  const chatLog = document.getElementById("chat-log");
  const welcomePanel = document.getElementById("welcome-panel");
  const questionInput = document.getElementById("question-input");
  const sendButton = document.getElementById("send-button");
  const imageInput = document.getElementById("image-input");
  const micButton = document.getElementById("mic-button");
  const imagePreview = document.getElementById("image-preview");
  const languageInput = document.getElementById("language-input");
  const countryInput = document.getElementById("country-input");
  const stageInput = document.getElementById("stage-input");
  const weatherInput = document.getElementById("weather-input");
  const status = document.getElementById("status");
  const newChatButton = document.getElementById("new-chat-button");
  const quickPrompts = document.getElementById("quick-prompts");
  const messageTemplate = document.getElementById("message-template");

  const state = {
    images: [],
    conversationId: "",
    busy: false,
    recognition: null
  };

  const prompts = {
    zh: [
      "我的葡萄叶片有黄色斑点，应该怎么处理？",
      "葡萄修剪一般什么时候进行？",
      "如何在下雨前预防白粉病？"
    ],
    en: [
      "What should I do about yellow spots on my grape leaves?",
      "When should I prune my grapevines?",
      "How can I prevent powdery mildew before rain?"
    ],
    ja: [
      "ブドウの葉に黄色い斑点があります。どうすればいいですか？",
      "ブドウの剪定はいつ行うべきですか？",
      "雨の前にうどん粉病を防ぐにはどうすればよいですか？"
    ]
  };

  const uiText = {
    zh: {
      placeholder: "输入葡萄种植或病害问题，也可以上传照片……",
      send: "发送",
      sending: "分析中…",
      you: "你",
      assistant: "神农语智",
      emptyInput: "请输入问题或上传至少一张图片。",
      tooManyImages: "最多上传两张照片。",
      invalidImage: "请只选择 JPG、PNG 或 WebP 图片。",
      imageTooLarge: "单张照片不能超过 8 MB。",
      networkError: "暂时无法连接智能体，请稍后再试。",
      configError: "网页尚未配置 Supabase 地址。请编辑 public/config.js。",
      audio: "语音说明",
      audioOpen: "打开语音链接"
    },
    en: {
      placeholder: "Ask about grape growing or upload a leaf photo…",
      send: "Send",
      sending: "Analyzing…",
      you: "You",
      assistant: "AgriLingua",
      emptyInput: "Enter a question or upload at least one image.",
      tooManyImages: "You can upload at most two photos.",
      invalidImage: "Please select JPG, PNG, or WebP images only.",
      imageTooLarge: "Each image must be smaller than 8 MB.",
      networkError: "The assistant is unavailable. Please try again.",
      configError: "Supabase is not configured. Edit public/config.js.",
      audio: "Voice answer",
      audioOpen: "Open audio"
    },
    ja: {
      placeholder: "ブドウ栽培や病害について質問するか、葉の写真を送ってください…",
      send: "送信",
      sending: "分析中…",
      you: "あなた",
      assistant: "AgriLingua",
      emptyInput: "質問を入力するか、画像を1枚以上添付してください。",
      tooManyImages: "写真は最大2枚までです。",
      invalidImage: "JPG、PNG、WebP画像を選択してください。",
      imageTooLarge: "1枚の画像は8 MB以下にしてください。",
      networkError: "現在接続できません。後でもう一度お試しください。",
      configError: "Supabaseが設定されていません。public/config.jsを編集してください。",
      audio: "音声による説明",
      audioOpen: "音声を開く"
    }
  };

  function currentText() {
    return uiText[languageInput.value] || uiText.zh;
  }

  function setStatus(message, isError) {
    status.textContent = message || "";
    status.classList.toggle("error", Boolean(isError));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeHref(raw) {
    const value = raw.trim();
    return /^https?:\/\//i.test(value) ? value : "#";
  }

  function renderInline(value) {
    let text = escapeHtml(value);

    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      (_, label, url) => {
        const href = safeHref(url);
        return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      }
    );
    return text;
  }

  function renderMarkdown(markdown) {
    const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let listType = "";

    function closeList() {
      if (listType) {
        html.push(`</${listType}>`);
        listType = "";
      }
    }

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        closeList();
        continue;
      }

      const heading = line.match(/^(#{1,4})\s+(.+)$/);
      if (heading) {
        closeList();
        const level = heading[1].length;
        html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
        continue;
      }

      const unordered = line.match(/^[-*]\s+(.+)$/);
      if (unordered) {
        if (listType !== "ul") {
          closeList();
          html.push("<ul>");
          listType = "ul";
        }
        html.push(`<li>${renderInline(unordered[1])}</li>`);
        continue;
      }

      const ordered = line.match(/^\d+[.)]\s+(.+)$/);
      if (ordered) {
        if (listType !== "ol") {
          closeList();
          html.push("<ol>");
          listType = "ol";
        }
        html.push(`<li>${renderInline(ordered[1])}</li>`);
        continue;
      }

      closeList();
      html.push(`<p>${renderInline(line)}</p>`);
    }

    closeList();
    return html.join("");
  }

  function extractAudioUrl(text) {
    const pattern = /\((https?:\/\/[^)\s]+)\)/g;
    for (const match of String(text || "").matchAll(pattern)) {
      if (/\.mp3(?:\?|$)|audio|speech/i.test(match[1])) {
        return match[1].replaceAll("&amp;", "&");
      }
    }

    const raw = String(text || "").match(/https?:\/\/[^\s)]+\.mp3[^\s)]*/i);
    return raw ? raw[0] : "";
  }

  function createMessage(role, text, images, isError) {
    const node = messageTemplate.content.firstElementChild.cloneNode(true);
    node.classList.add(role);
    if (isError) node.classList.add("error");

    node.querySelector(".message-role").textContent =
      role === "user" ? currentText().you : currentText().assistant;

    const imageBox = node.querySelector(".message-images");
    for (const image of images || []) {
      const img = document.createElement("img");
      img.alt = "用户上传的葡萄照片";
      img.src = image;
      imageBox.appendChild(img);
    }

    node.querySelector(".message-body").innerHTML = renderMarkdown(text);

    const audio = extractAudioUrl(text);
    if (audio && role === "assistant") {
      const audioWrap = node.querySelector(".audio-wrap");
      audioWrap.hidden = false;
      audioWrap.querySelector(".audio-label").textContent = currentText().audio;
      audioWrap.querySelector("audio").src = audio;
      const link = audioWrap.querySelector(".audio-download");
      link.href = audio;
      link.textContent = currentText().audioOpen;
    }

    chatLog.appendChild(node);
    node.scrollIntoView({ behavior: "smooth", block: "start" });
    return node;
  }

  function createTypingMessage() {
    const node = createMessage("assistant", "正在分析…", [], false);
    node.querySelector(".message-body").innerHTML =
      '<div class="typing" aria-label="正在分析"><span></span><span></span><span></span></div>';
    return node;
  }

  function renderQuickPrompts() {
    quickPrompts.replaceChildren();
    const language = languageInput.value;
    for (const prompt of prompts[language] || prompts.zh) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quick-prompt";
      button.textContent = prompt;
      button.addEventListener("click", () => {
        questionInput.value = prompt;
        questionInput.focus();
        resizeTextarea();
      });
      quickPrompts.appendChild(button);
    }
    questionInput.placeholder = currentText().placeholder;
    sendButton.textContent = currentText().send;
  }

  function renderImagePreview() {
    imagePreview.replaceChildren();
    imagePreview.hidden = state.images.length === 0;

    state.images.forEach((entry, index) => {
      const item = document.createElement("div");
      item.className = "preview-item";
      const img = document.createElement("img");
      img.src = entry.previewUrl;
      img.alt = `待上传照片 ${index + 1}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `移除第 ${index + 1} 张图片`);
      remove.addEventListener("click", () => {
        URL.revokeObjectURL(entry.previewUrl);
        state.images.splice(index, 1);
        renderImagePreview();
      });
      item.append(img, remove);
      imagePreview.appendChild(item);
    });
  }

  async function compressImage(file) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new Error(currentText().invalidImage);
    }
    if (file.size > maxUploadBytes) {
      throw new Error(currentText().imageTooLarge);
    }

    if (file.size < 900000) {
      return file;
    }

    if (typeof createImageBitmap !== "function") {
      return file;
    }

    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxImageSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.78)
    );
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg"
    });
  }

  async function addFiles(files) {
    const incoming = Array.from(files || []);
    if (state.images.length + incoming.length > maxImages) {
      setStatus(currentText().tooManyImages, true);
      return;
    }

    for (const file of incoming) {
      try {
        const compressed = await compressImage(file);
        state.images.push({
          file: compressed,
          previewUrl: URL.createObjectURL(compressed)
        });
      } catch (error) {
        setStatus(error.message || currentText().invalidImage, true);
      }
    }
    imageInput.value = "";
    renderImagePreview();
  }

  function resizeTextarea() {
    questionInput.style.height = "auto";
    questionInput.style.height = `${Math.min(questionInput.scrollHeight, 132)}px`;
  }

  function setupSpeechInput() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      micButton.hidden = true;
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.addEventListener("start", () => {
      micButton.classList.add("recording");
      micButton.setAttribute("aria-pressed", "true");
      setStatus("正在听…");
    });

    recognition.addEventListener("result", (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      questionInput.value = transcript.trim();
      resizeTextarea();
    });

    recognition.addEventListener("end", () => {
      micButton.classList.remove("recording");
      micButton.setAttribute("aria-pressed", "false");
      setStatus("");
    });

    recognition.addEventListener("error", (event) => {
      const message =
        event.error === "not-allowed"
          ? "没有麦克风权限，请在浏览器设置中允许麦克风。"
          : "语音输入失败，请改用文字输入。";
      setStatus(message, true);
    });

    state.recognition = recognition;
    micButton.addEventListener("click", () => {
      recognition.lang =
        languageInput.value === "en"
          ? "en-US"
          : languageInput.value === "ja"
            ? "ja-JP"
            : "zh-CN";
      try {
        recognition.start();
      } catch {
        recognition.stop();
      }
    });
  }

  function clearConversation() {
    state.conversationId = "";
    state.images.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    state.images = [];
    chatLog.replaceChildren();
    imagePreview.replaceChildren();
    imagePreview.hidden = true;
    questionInput.value = "";
    setStatus("");
    resizeTextarea();
    welcomePanel.hidden = false;
    questionInput.focus();
  }

  async function sendMessage() {
    if (state.busy) return;

    const question = questionInput.value.trim();
    if (!question && state.images.length === 0) {
      setStatus(currentText().emptyInput, true);
      return;
    }

    if (!config.supabaseUrl || config.supabaseUrl.includes("YOUR_PROJECT_REF")) {
      setStatus(currentText().configError, true);
      return;
    }

    state.busy = true;
    sendButton.disabled = true;
    sendButton.textContent = currentText().sending;
    setStatus("");
    welcomePanel.hidden = true;

    const previews = state.images.map((item) => item.previewUrl);
    createMessage("user", question || "请分析这些葡萄照片并给出处理建议。", previews, false);

    const typing = createTypingMessage();
    const form = new FormData();
    form.append("text", question);
    form.append("language", languageInput.value);
    form.append("country", countryInput.value.trim());
    form.append("stage", stageInput.value);
    form.append("weather", weatherInput.value.trim());
    form.append("conversation_id", state.conversationId || "");

    for (const item of state.images) {
      form.append("images", item.file, item.file.name);
    }

    const clientId =
      localStorage.getItem("agrilingua_client_id") ||
      crypto.randomUUID().replaceAll("-", "");
    localStorage.setItem("agrilingua_client_id", clientId);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      const response = await fetch(
        `${config.supabaseUrl}/functions/v1/${config.functionName || "agrilingua"}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.supabaseAnonKey}`,
            apikey: config.supabaseAnonKey,
            "x-client-id": clientId
          },
          body: form,
          signal: controller.signal
        }
      );
      clearTimeout(timeout);

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || currentText().networkError);
      }

      state.conversationId = payload.conversationId || "";
      typing.remove();
      createMessage("assistant", payload.reply || currentText().networkError, [], false);
      state.images.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      state.images = [];
      renderImagePreview();
      questionInput.value = "";
      resizeTextarea();
    } catch (error) {
      typing.remove();
      const message =
        error && error.name === "AbortError"
          ? "请求超时。工作流可能仍在处理，请稍后重试。"
          : error.message || currentText().networkError;
      createMessage("assistant", message, [], true);
      setStatus(message, true);
    } finally {
      state.busy = false;
      sendButton.disabled = false;
      sendButton.textContent = currentText().send;
    }
  }

  imageInput.addEventListener("change", () => addFiles(imageInput.files));
  sendButton.addEventListener("click", sendMessage);
  newChatButton.addEventListener("click", clearConversation);
  languageInput.addEventListener("change", renderQuickPrompts);
  questionInput.addEventListener("input", resizeTextarea);
  questionInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  renderQuickPrompts();
  renderImagePreview();
  resizeTextarea();
  setupSpeechInput();
})();

