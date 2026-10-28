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
  const cameraInput = document.getElementById("camera-input");
  const micButton = document.getElementById("mic-button");
  const homeVoiceButton = document.getElementById("home-voice-button");
  const imagePreview = document.getElementById("image-preview");
  const languageInput = document.getElementById("language-input");
  const languageButton = document.getElementById("language-button");
  const languageButtonLabel = document.getElementById("language-button-label");
  const languageButtonCode = document.getElementById("language-button-code");
  const languageMenu = document.getElementById("language-menu");
  const languageOptions = Array.from(document.querySelectorAll(".language-option"));
  const countryInput = document.getElementById("country-input");
  const stageInput = document.getElementById("stage-input");
  const weatherInput = document.getElementById("weather-input");
  const status = document.getElementById("status");
  const newChatButton = document.getElementById("new-chat-button");
  const quickPrompts = document.getElementById("quick-prompts");
  const messageTemplate = document.getElementById("message-template");
  const contextButton = document.getElementById("context-button");
  const contextDialog = document.getElementById("context-dialog");
  const contextClose = document.getElementById("context-close");
  const contextSave = document.getElementById("context-save");
  const contextSummary = document.getElementById("context-summary");
  const installButton = document.getElementById("install-button");
  const composer = document.getElementById("composer");

  const state = {
    images: [],
    conversationId: "",
    busy: false,
    recognition: null,
    progressTimer: 0,
    installPrompt: null,
    controller: null,
    requestId: 0
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

  const languageMeta = {
    en: { name: "English", code: "EN", htmlLang: "en" },
    zh: { name: "中文", code: "ZH", htmlLang: "zh-CN" },
    ja: { name: "日本語", code: "JA", htmlLang: "ja" }
  };

  const uiText = {
    en: {
      title: "AgriLingua | Grape Field Assistant",
      metaDescription: "AgriLingua is a multilingual grape field assistant for photo diagnosis, practical next steps, and voice answers.",
      appSubtitle: "Grape field assistant",
      install: "Install",
      installAria: "Install AgriLingua",
      language: "Language",
      languageAria: "Language",
      languageButtonAria: (name) => `Language: ${name}`,
      newChat: "New chat",
      newChatAria: "Start a new chat",
      cancelAnalysisAria: "Cancel analysis and start a new chat",
      actionsAria: "Start a diagnosis",
      takePhoto: "Take photo",
      rearCamera: "Use the rear camera",
      gallery: "Gallery",
      upToTwo: "Up to two photos",
      voice: "Voice",
      speakQuestion: "Speak your question",
      tryAsking: "Try asking",
      privateDefault: "Private by default",
      composerAria: "Message composer",
      photo: "Photo",
      addPhoto: "Add a photo",
      fieldDetails: "Field details",
      optional: "OPTIONAL",
      closeFieldDetails: "Close field details",
      fieldDetailsCopy: "Add local context to make the guidance more relevant.",
      country: "Country",
      grapeStage: "Grape stage",
      notSpecified: "Not specified",
      stageBudbreak: "Budbreak",
      stageFlowering: "Flowering",
      stageFruitSet: "Fruit set",
      stageVeraison: "Veraison",
      stageHarvest: "Harvest",
      stagePostharvest: "Postharvest",
      stageDormant: "Dormant",
      weather: "Recent weather",
      weatherPlaceholder: "Example: three days of warm, wet weather",
      useDetails: "Use these details",
      voiceInput: "Voice input",
      voiceInputAria: "Start voice input",
      placeholder: "Ask about grape growing or upload a leaf photo…",
      send: "Send",
      sending: "Analyzing…",
      listening: "Listening…",
      micDenied: "Microphone access was denied. Allow it in your browser settings.",
      voiceFailed: "Voice input did not work. Please type your question instead.",
      you: "You",
      assistant: "AgriLingua",
      audio: "Voice answer",
      audioHint: "Listen to the field guidance",
      audioOpen: "Open audio",
      defaultPhotoPrompt: "Analyze these grape photos and give me the next steps.",
      languageChanged: (name) => `Language changed. The app and replies will use ${name}.`,
      emptyInput: "Enter a question or add at least one photo.",
      tooManyImages: "You can add at most two photos.",
      invalidImage: "Please choose JPG, PNG, WebP, HEIC, HEIF, or AVIF images only.",
      heicUnavailable: "This browser cannot convert that HEIC/HEIF photo. Choose a JPG or PNG, or export the photo as JPG first.",
      imageTooLarge: "Each photo must be smaller than 8 MB.",
      networkError: "The assistant is unavailable. Please try again.",
      configError: "Supabase is not configured. Edit public/config.js.",
      timeout: "The request timed out. The diagnosis may still be processing. Please retry in a moment.",
      rateLimit: "Today's free usage limit has been reached. Please try again tomorrow.",
      questionTooLong: "Your question is too long. Please shorten it and try again.",
      genericRequestError: "The assistant could not complete this request. Please try again.",
      installed: "AgriLingua was installed successfully.",
      iosInstall: "In Safari, tap Share, then choose Add to Home Screen.",
      browserInstall: "Open your browser menu and choose Install app or Add to Home screen.",
      countryNotSet: "Country not set",
      stageNotSet: "Stage not set",
      removePhoto: (index) => `Remove photo ${index}`,
      photoReady: (index) => `Photo ${index} ready to upload`,
      progressUpload: "Uploading and preparing your photos…",
      progressLeaf: "Checking leaf color, texture, and visible lesions…",
      progressGuidance: "Reviewing grape field guidance…",
      progressActions: "Preparing today's actions and the 7-day follow-up…",
      progressAudio: "Finishing the recommendation and voice answer…",
      progressQuestion: "Reviewing your question…",
      progressPractical: "Checking practical grape-growing guidance…",
      progressAnswer: "Preparing a concise field answer…",
      progressFinish: "Finishing the answer and voice response…"
    },
    zh: {
      title: "AgriLingua｜葡萄田间助手",
      metaDescription: "AgriLingua 是支持照片诊断、实用行动建议和语音回答的多语言葡萄田间助手。",
      appSubtitle: "葡萄田间助手",
      install: "安装",
      installAria: "安装 AgriLingua",
      language: "语言",
      languageAria: "应用语言",
      languageButtonAria: (name) => `当前语言：${name}`,
      newChat: "新对话",
      newChatAria: "开始新对话",
      cancelAnalysisAria: "取消分析并开始新对话",
      actionsAria: "开始诊断",
      takePhoto: "拍照",
      rearCamera: "使用后置摄像头",
      gallery: "相册",
      upToTwo: "最多两张照片",
      voice: "语音",
      speakQuestion: "说出你的问题",
      tryAsking: "试着问",
      privateDefault: "默认保护隐私",
      composerAria: "消息输入区",
      photo: "照片",
      addPhoto: "添加照片",
      fieldDetails: "田间信息",
      optional: "可选",
      closeFieldDetails: "关闭田间信息",
      fieldDetailsCopy: "添加当地信息，让建议更准确。",
      country: "国家",
      grapeStage: "葡萄生育期",
      notSpecified: "未填写",
      stageBudbreak: "萌芽",
      stageFlowering: "开花",
      stageFruitSet: "坐果",
      stageVeraison: "转色",
      stageHarvest: "采收",
      stagePostharvest: "采后",
      stageDormant: "休眠",
      weather: "近期天气",
      weatherPlaceholder: "例如：连续三天温暖潮湿",
      useDetails: "使用这些信息",
      voiceInput: "语音输入",
      voiceInputAria: "开始语音输入",
      placeholder: "询问葡萄种植问题，或上传叶片照片……",
      send: "发送",
      sending: "分析中…",
      listening: "正在聆听…",
      micDenied: "麦克风权限被拒绝，请在浏览器设置中允许。",
      voiceFailed: "语音输入失败，请改用文字输入。",
      you: "你",
      assistant: "AgriLingua",
      audio: "语音回答",
      audioHint: "收听田间建议",
      audioOpen: "打开语音",
      defaultPhotoPrompt: "请分析这些葡萄照片，并告诉我下一步该怎么做。",
      languageChanged: (name) => `语言已切换。界面和回答将使用${name}。`,
      emptyInput: "请输入问题或至少添加一张照片。",
      tooManyImages: "最多只能添加两张照片。",
      invalidImage: "请选择 JPG、PNG、WebP、HEIC、HEIF 或 AVIF 图片。",
      heicUnavailable: "当前浏览器无法转换该 HEIC/HEIF 照片。请选择 JPG/PNG，或先将照片导出为 JPG。",
      imageTooLarge: "每张照片必须小于 8 MB。",
      networkError: "智能体暂时不可用，请稍后重试。",
      configError: "Supabase 尚未配置，请编辑 public/config.js。",
      timeout: "请求超时，诊断可能仍在处理中，请稍后重试。",
      rateLimit: "今天的免费使用次数已用完，请明天再试。",
      questionTooLong: "问题太长，请缩短后重试。",
      genericRequestError: "智能体暂时无法完成此请求，请重试。",
      installed: "AgriLingua 安装成功。",
      iosInstall: "在 Safari 中点击分享，然后选择“添加到主屏幕”。",
      browserInstall: "打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。",
      countryNotSet: "国家未填写",
      stageNotSet: "生育期未填写",
      removePhoto: (index) => `移除第 ${index} 张照片`,
      photoReady: (index) => `第 ${index} 张照片待上传`,
      progressUpload: "正在上传并准备照片…",
      progressLeaf: "正在检查叶色、纹理和可见病斑…",
      progressGuidance: "正在查阅葡萄田间管理建议…",
      progressActions: "正在整理今日行动和未来 7 天计划…",
      progressAudio: "正在完成建议和语音回答…",
      progressQuestion: "正在分析你的问题…",
      progressPractical: "正在查询实用的葡萄种植建议…",
      progressAnswer: "正在整理简洁的田间回答…",
      progressFinish: "正在完成回答和语音…"
    },
    ja: {
      title: "AgriLingua｜ブドウ圃場アシスタント",
      metaDescription: "AgriLingua は写真診断、実用的な対応策、音声回答を提供する多言語ブドウ圃場アシスタントです。",
      appSubtitle: "ブドウ圃場アシスタント",
      install: "インストール",
      installAria: "AgriLingua をインストール",
      language: "言語",
      languageAria: "アプリの言語",
      languageButtonAria: (name) => `現在の言語：${name}`,
      newChat: "新しい会話",
      newChatAria: "新しい会話を開始",
      cancelAnalysisAria: "分析を中止して新しい会話を開始",
      actionsAria: "診断を開始",
      takePhoto: "写真を撮る",
      rearCamera: "背面カメラを使用",
      gallery: "ギャラリー",
      upToTwo: "最大2枚",
      voice: "音声",
      speakQuestion: "質問を話す",
      tryAsking: "質問例",
      privateDefault: "プライバシー保護",
      composerAria: "メッセージ入力欄",
      photo: "写真",
      addPhoto: "写真を追加",
      fieldDetails: "圃場情報",
      optional: "任意",
      closeFieldDetails: "圃場情報を閉じる",
      fieldDetailsCopy: "地域情報を追加すると、より適切な提案になります。",
      country: "国",
      grapeStage: "ブドウの生育ステージ",
      notSpecified: "未設定",
      stageBudbreak: "芽吹き",
      stageFlowering: "開花",
      stageFruitSet: "結実",
      stageVeraison: "着色",
      stageHarvest: "収穫",
      stagePostharvest: "収穫後",
      stageDormant: "休眠",
      weather: "最近の天気",
      weatherPlaceholder: "例：暖かく湿った日が3日続いた",
      useDetails: "この情報を使用",
      voiceInput: "音声入力",
      voiceInputAria: "音声入力を開始",
      placeholder: "ブドウ栽培について質問するか、葉の写真をアップロード…",
      send: "送信",
      sending: "分析中…",
      listening: "聞き取り中…",
      micDenied: "マイクへのアクセスが拒否されました。ブラウザ設定で許可してください。",
      voiceFailed: "音声入力に失敗しました。文字で質問してください。",
      you: "あなた",
      assistant: "AgriLingua",
      audio: "音声回答",
      audioHint: "圃場でのアドバイスを聞く",
      audioOpen: "音声を開く",
      defaultPhotoPrompt: "このブドウの写真を分析し、次の対応を教えてください。",
      languageChanged: (name) => `言語を変更しました。アプリと回答は${name}で表示されます。`,
      emptyInput: "質問を入力するか、写真を1枚以上追加してください。",
      tooManyImages: "写真は最大2枚までです。",
      invalidImage: "JPG、PNG、WebP、HEIC、HEIF、AVIF画像を選択してください。",
      heicUnavailable: "このブラウザでは HEIC/HEIF 写真を変換できません。JPG/PNG を選ぶか、写真を JPG で書き出してください。",
      imageTooLarge: "各写真は8 MB未満にしてください。",
      networkError: "アシスタントを利用できません。後でもう一度お試しください。",
      configError: "Supabase が設定されていません。public/config.js を編集してください。",
      timeout: "リクエストがタイムアウトしました。診断が継続中の可能性があります。しばらくしてから再試行してください。",
      rateLimit: "本日の無料利用回数に達しました。明日もう一度お試しください。",
      questionTooLong: "質問が長すぎます。短くして再試行してください。",
      genericRequestError: "アシスタントがこのリクエストを完了できませんでした。再試行してください。",
      installed: "AgriLingua をインストールしました。",
      iosInstall: "Safari で共有をタップし、「ホーム画面に追加」を選んでください。",
      browserInstall: "ブラウザメニューから「アプリをインストール」または「ホーム画面に追加」を選んでください。",
      countryNotSet: "国が未設定",
      stageNotSet: "生育ステージが未設定",
      removePhoto: (index) => `写真 ${index} を削除`,
      photoReady: (index) => `写真 ${index} のアップロード準備完了`,
      progressUpload: "写真をアップロードして準備しています…",
      progressLeaf: "葉の色、質感、見える病斑を確認しています…",
      progressGuidance: "ブドウ圃場の管理情報を確認しています…",
      progressActions: "今日の対応と7日間の計画を整理しています…",
      progressAudio: "提案と音声回答を完成させています…",
      progressQuestion: "質問を確認しています…",
      progressPractical: "実用的なブドウ栽培情報を確認しています…",
      progressAnswer: "簡潔な圃場向け回答を作成しています…",
      progressFinish: "回答と音声を完成させています…"
    }
  };

  function currentText() {
    return uiText[languageInput.value] || uiText.en;
  }

  function updateLanguagePicker() {
    const meta = languageMeta[languageInput.value] || languageMeta.en;
    languageButtonLabel.textContent = meta.name;
    languageButtonCode.textContent = meta.code;
    languageButton.setAttribute(
      "aria-label",
      currentText().languageButtonAria(meta.name)
    );

    for (const option of languageOptions) {
      option.setAttribute(
        "aria-selected",
        String(option.dataset.language === languageInput.value)
      );
    }
  }

  function applyLocale(language) {
    languageInput.value = languageMeta[language] ? language : "en";
    const text = currentText();

    document.documentElement.lang = languageMeta[languageInput.value].htmlLang;
    document.title = text.title;
    document.getElementById("meta-description")?.setAttribute(
      "content",
      text.metaDescription
    );

    for (const element of document.querySelectorAll("[data-i18n]")) {
      const key = element.dataset.i18n;
      if (text[key]) element.textContent = text[key];
    }
    for (const element of document.querySelectorAll("[data-i18n-aria]")) {
      const key = element.dataset.i18nAria;
      if (text[key]) element.setAttribute("aria-label", text[key]);
    }
    for (const element of document.querySelectorAll("[data-i18n-title]")) {
      const key = element.dataset.i18nTitle;
      if (text[key]) element.setAttribute("title", text[key]);
    }
    for (const element of document.querySelectorAll("[data-i18n-placeholder]")) {
      const key = element.dataset.i18nPlaceholder;
      if (text[key]) element.setAttribute("placeholder", text[key]);
    }

    updateLanguagePicker();
    updateContextSummary();
    renderImagePreview();
    renderQuickPrompts();
    refreshRenderedMessages();
  }

  function openLanguageMenu() {
    languageMenu.hidden = false;
    languageButton.setAttribute("aria-expanded", "true");
  }

  function closeLanguageMenu(focusButton = false) {
    languageMenu.hidden = true;
    languageButton.setAttribute("aria-expanded", "false");
    if (focusButton) languageButton.focus();
  }

  function toggleLanguageMenu() {
    if (languageMenu.hidden) openLanguageMenu();
    else closeLanguageMenu();
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
      img.alt = currentText().photo;
      img.src = image;
      imageBox.appendChild(img);
    }

    node.querySelector(".message-body").innerHTML = renderMarkdown(text);

    const audio = extractAudioUrl(text);
    if (audio && role === "assistant") {
      const audioWrap = node.querySelector(".audio-wrap");
      audioWrap.hidden = false;
      audioWrap.querySelector(".audio-label").textContent = currentText().audio;
      audioWrap.querySelector(".audio-hint").textContent = currentText().audioHint;
      audioWrap.querySelector("audio").src = audio;
      const link = audioWrap.querySelector(".audio-download");
      link.href = audio;
      link.textContent = currentText().audioOpen;
    }

    chatLog.appendChild(node);
    node.scrollIntoView({ behavior: "smooth", block: "start" });
    return node;
  }

  function refreshRenderedMessages() {
    for (const message of chatLog.querySelectorAll(".message")) {
      const isUser = message.classList.contains("user");
      const role = message.querySelector(".message-role");
      if (role) {
        role.textContent = isUser
          ? currentText().you
          : currentText().assistant;
      }

      const audioWrap = message.querySelector(".audio-wrap");
      if (audioWrap && !audioWrap.hidden) {
        audioWrap.querySelector(".audio-label").textContent = currentText().audio;
        audioWrap.querySelector(".audio-hint").textContent = currentText().audioHint;
        audioWrap.querySelector(".audio-download").textContent =
          currentText().audioOpen;
      }
    }
  }

  function createTypingMessage() {
    const node = createMessage("assistant", currentText().analyzing, [], false);
    node.querySelector(".message-body").innerHTML =
      `<div class="typing-wrap"><div class="typing" aria-hidden="true"><span></span><span></span><span></span></div><span class="typing-stage">${currentText().progressQuestion}</span></div>`;
    return node;
  }

  function setTypingStage(node, message) {
    const stage = node.querySelector(".typing-stage");
    if (stage) stage.textContent = message;
    setStatus(message, false);
  }

  function startProgress(node, hasImages) {
    const stages = hasImages
      ? [
          [0, currentText().progressUpload],
          [3500, currentText().progressLeaf],
          [14000, currentText().progressGuidance],
          [32000, currentText().progressActions],
          [72000, currentText().progressAudio]
        ]
      : [
          [0, currentText().progressQuestion],
          [3500, currentText().progressPractical],
          [14000, currentText().progressAnswer],
          [32000, currentText().progressFinish]
        ];
    const startedAt = Date.now();
    let currentStage = 0;

    clearInterval(state.progressTimer);
    setTypingStage(node, stages[0][1]);
    state.progressTimer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      while (
        currentStage + 1 < stages.length &&
        elapsed >= stages[currentStage + 1][0]
      ) {
        currentStage += 1;
        setTypingStage(node, stages[currentStage][1]);
      }
    }, 1000);

    return () => {
      clearInterval(state.progressTimer);
      state.progressTimer = 0;
    };
  }

  function renderQuickPrompts() {
    quickPrompts.replaceChildren();
    const language = languageInput.value;
    for (const prompt of prompts[language] || prompts.en) {
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
    sendButton.setAttribute("aria-label", currentText().send);
  }

  function renderImagePreview() {
    imagePreview.replaceChildren();
    imagePreview.hidden = state.images.length === 0;

    state.images.forEach((entry, index) => {
      const item = document.createElement("div");
      item.className = "preview-item";
      const img = document.createElement("img");
      img.src = entry.previewUrl;
      img.alt = currentText().photoReady(index + 1);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", currentText().removePhoto(index + 1));
      remove.addEventListener("click", () => {
        URL.revokeObjectURL(entry.previewUrl);
        state.images.splice(index, 1);
        renderImagePreview();
      });
      item.append(img, remove);
      imagePreview.appendChild(item);
    });
  }

  function imageKind(file) {
    const type = String(file.type || "").toLowerCase().split(";")[0];
    const extension = String(file.name || "").split(".").pop().toLowerCase();
    const supported = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "image/avif"
    ];
    const supportedExtensions = [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "heic",
      "heif",
      "avif"
    ];

    if (!supported.includes(type) && !supportedExtensions.includes(extension)) {
      throw new Error(currentText().invalidImage);
    }

    const needsTranscode = [
      "image/heic",
      "image/heif",
      "image/avif",
      "heic",
      "heif",
      "avif"
    ].includes(type) || ["heic", "heif", "avif"].includes(extension);

    return { needsTranscode };
  }

  async function decodeImage(file) {
    if (typeof createImageBitmap === "function") {
      try {
        return await createImageBitmap(file);
      } catch {
        // Safari may not expose HEIC to createImageBitmap but can decode it in an image element.
      }
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = url;
      });
      return image;
    } finally {
      if (image.complete) URL.revokeObjectURL(url);
      else image.addEventListener("loadend", () => URL.revokeObjectURL(url), { once: true });
    }
  }

  async function compressImage(file) {
    if (file.size > maxUploadBytes) {
      throw new Error(currentText().imageTooLarge);
    }

    const { needsTranscode } = imageKind(file);
    if (!needsTranscode && file.size < 900000) {
      return file;
    }

    let image;
    try {
      image = await decodeImage(file);
    } catch {
      throw new Error(needsTranscode ? currentText().heicUnavailable : currentText().invalidImage);
    }

    const sourceWidth = image.width || image.naturalWidth;
    const sourceHeight = image.height || image.naturalHeight;
    if (!sourceWidth || !sourceHeight) {
      if (typeof image.close === "function") image.close();
      throw new Error(currentText().invalidImage);
    }

    const scale = Math.min(1, maxImageSide / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    context.drawImage(image, 0, 0, width, height);
    if (typeof image.close === "function") image.close();

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.78)
    );
    if (!blob) throw new Error(currentText().invalidImage);
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg"
    });
  }

  async function addFiles(files) {
    const incoming = Array.from(files || []);
    imageInput.value = "";
    cameraInput.value = "";

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
      homeVoiceButton.hidden = true;
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.addEventListener("start", () => {
      micButton.classList.add("recording");
      micButton.setAttribute("aria-pressed", "true");
      setStatus(currentText().listening);
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
          ? currentText().micDenied
          : currentText().voiceFailed;
      setStatus(message, true);
    });

    state.recognition = recognition;
    function startRecognition() {
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
    }

    micButton.addEventListener("click", startRecognition);
    homeVoiceButton.addEventListener("click", () => {
      welcomePanel.scrollIntoView({ behavior: "smooth", block: "start" });
      startRecognition();
    });
  }

  function clearConversation() {
    state.requestId += 1;
    state.controller?.abort();
    state.controller = null;
    state.busy = false;
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
    composer.classList.add("home-mode");
    sendButton.disabled = false;
    sendButton.setAttribute("aria-label", currentText().send);
    newChatButton.setAttribute("aria-label", currentText().newChatAria);
    questionInput.focus();
  }

  const stageLabelKeys = {
    "": "stageNotSet",
    budbreak: "stageBudbreak",
    flowering: "stageFlowering",
    fruit_set: "stageFruitSet",
    veraison: "stageVeraison",
    harvest: "stageHarvest",
    postharvest: "stagePostharvest",
    dormant: "stageDormant"
  };

  function updateContextSummary() {
    const country = countryInput.value.trim();
    const stage = currentText()[stageLabelKeys[stageInput.value] || "stageNotSet"];
    const parts = [country || currentText().countryNotSet, stage];
    contextSummary.textContent = parts.join(" · ");
  }

  function interfaceError(message) {
    const value = String(message || "").trim();
    if (!value) return currentText().networkError;
    if (/超时/.test(value)) {
      return currentText().timeout;
    }
    if (/免费使用次数已用完/.test(value)) {
      return currentText().rateLimit;
    }
    if (/最多上传两张/.test(value)) {
      return currentText().tooManyImages;
    }
    if (/问题太长/.test(value)) {
      return currentText().questionTooLong;
    }
    return /[\u3400-\u9fff]/.test(value) || languageInput.value !== "en"
      ? currentText().genericRequestError
      : value;
  }

  function openContextDialog() {
    updateContextSummary();
    if (typeof contextDialog.showModal === "function") {
      contextDialog.showModal();
    } else {
      contextDialog.setAttribute("open", "");
    }
  }

  function closeContextDialog() {
    if (typeof contextDialog.close === "function") {
      contextDialog.close();
    } else {
      contextDialog.removeAttribute("open");
    }
  }

  function setupInstallPrompt() {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (standalone) {
      installButton.hidden = true;
      return;
    }

    if (isIos) installButton.hidden = false;

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      state.installPrompt = event;
      installButton.hidden = false;
    });

    window.addEventListener("appinstalled", () => {
      installButton.hidden = true;
      state.installPrompt = null;
      setStatus(currentText().installed);
    });

    installButton.addEventListener("click", async () => {
      if (state.installPrompt) {
        state.installPrompt.prompt();
        const choice = await state.installPrompt.userChoice;
        if (choice.outcome === "accepted") installButton.hidden = true;
        state.installPrompt = null;
        return;
      }

      setStatus(
        isIos
          ? currentText().iosInstall
          : currentText().browserInstall
      );
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (!["https:", "http:"].includes(location.protocol)) return;

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // The app remains usable online when service-worker registration fails.
      });
    });
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

    const requestId = ++state.requestId;
    state.busy = true;
    sendButton.disabled = true;
    sendButton.setAttribute("aria-label", currentText().sending);
    newChatButton.setAttribute("aria-label", currentText().cancelAnalysisAria);
    setStatus("");
    welcomePanel.hidden = true;
    composer.classList.remove("home-mode");

    const previews = state.images.map((item) => item.previewUrl);
    createMessage("user", question || currentText().defaultPhotoPrompt, previews, false);

    const typing = createTypingMessage();
    const stopProgress = startProgress(typing, state.images.length > 0);
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

    const controller = new AbortController();
    state.controller = controller;
    let timeoutId = 0;

    try {
      timeoutId = setTimeout(() => controller.abort(), 150000);
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

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || currentText().networkError);
      }
      if (requestId !== state.requestId) return;

      state.conversationId = payload.conversationId || "";
      typing.remove();
      setStatus("");
      createMessage("assistant", payload.reply || currentText().networkError, [], false);
      state.images.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      state.images = [];
      renderImagePreview();
      questionInput.value = "";
      resizeTextarea();
    } catch (error) {
      if (requestId !== state.requestId) return;
      typing.remove();
      const message =
        error && error.name === "AbortError"
          ? currentText().timeout
          : interfaceError(error.message);
      createMessage("assistant", message, [], true);
      setStatus(message, true);
    } finally {
      stopProgress();
      if (timeoutId) clearTimeout(timeoutId);
      if (state.controller === controller) state.controller = null;
      if (requestId === state.requestId) {
        state.busy = false;
        sendButton.disabled = false;
        sendButton.setAttribute("aria-label", currentText().send);
        newChatButton.setAttribute("aria-label", currentText().newChatAria);
      }
    }
  }

  imageInput.addEventListener("change", () => addFiles(imageInput.files));
  cameraInput.addEventListener("change", () => addFiles(cameraInput.files));
  sendButton.addEventListener("click", sendMessage);
  newChatButton.addEventListener("click", clearConversation);
  languageInput.addEventListener("change", () => {
    localStorage.setItem("agrilingua_language", languageInput.value);
    applyLocale(languageInput.value);
    setStatus(currentText().languageChanged(languageMeta[languageInput.value].name));
  });
  languageButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleLanguageMenu();
  });
  languageButton.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openLanguageMenu();
      const selected =
        languageOptions.find(
          (option) => option.dataset.language === languageInput.value
        ) || languageOptions[0];
      selected.focus();
    }
  });
  languageMenu.addEventListener("click", (event) => event.stopPropagation());
  languageOptions.forEach((option) => {
    option.addEventListener("click", () => {
      languageInput.value = option.dataset.language;
      languageInput.dispatchEvent(new Event("change", { bubbles: true }));
      closeLanguageMenu(true);
    });
  });
  languageMenu.addEventListener("keydown", (event) => {
    const currentIndex = languageOptions.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      closeLanguageMenu(true);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;

    event.preventDefault();
    let nextIndex = currentIndex;
    if (event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % languageOptions.length;
    } else if (event.key === "ArrowUp") {
      nextIndex =
        (currentIndex - 1 + languageOptions.length) % languageOptions.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = languageOptions.length - 1;
    }
    languageOptions[nextIndex].focus();
  });
  document.addEventListener("click", (event) => {
    if (
      !languageMenu.hidden &&
      !event.target.closest(".language-control")
    ) {
      closeLanguageMenu();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !languageMenu.hidden) {
      closeLanguageMenu(true);
    }
  });
  contextButton.addEventListener("click", openContextDialog);
  contextClose.addEventListener("click", closeContextDialog);
  contextSave.addEventListener("click", closeContextDialog);
  contextDialog.addEventListener("click", (event) => {
    if (event.target === contextDialog) closeContextDialog();
  });
  [countryInput, stageInput, weatherInput].forEach((input) => {
    input.addEventListener("input", updateContextSummary);
    input.addEventListener("change", updateContextSummary);
  });
  questionInput.addEventListener("input", resizeTextarea);
  questionInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  const savedLanguage = localStorage.getItem("agrilingua_language");
  languageInput.value = languageMeta[savedLanguage] ? savedLanguage : "en";
  applyLocale(languageInput.value);
  renderImagePreview();
  resizeTextarea();
  setupSpeechInput();
  setupInstallPrompt();
  registerServiceWorker();
  updateContextSummary();
})();

