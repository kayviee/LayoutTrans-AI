/**
 * LayoutTrans AI — Application Core (v1.7.0 High-DPI Figures, Structured Figure Tables & Persistent Settings)
 * Full-Coverage Academic Translation, Page-Level QA, Session Cache & Source-Aware Typography
 */

// Configure PDF.js worker
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const TRANSLATION_FONT_PRESETS = Object.freeze({
  'times-new-roman': { label: 'Times New Roman', type: 'serif', css: "'Times New Roman', Times, serif", docx: 'Times New Roman' },
  merriweather: { label: 'Merriweather', type: 'serif', css: "'Merriweather', Georgia, 'Times New Roman', serif", docx: 'Merriweather' },
  lora: { label: 'Lora', type: 'serif', css: "'Lora', Georgia, 'Times New Roman', serif", docx: 'Lora' },
  georgia: { label: 'Georgia', type: 'serif', css: "Georgia, 'Times New Roman', serif", docx: 'Georgia' },
  palatino: { label: 'Palatino', type: 'serif', css: "'Palatino Linotype', Palatino, 'Book Antiqua', serif", docx: 'Palatino Linotype' },
  charter: { label: 'Charter', type: 'serif', css: "Charter, 'Bitstream Charter', Georgia, serif", docx: 'Charter' },
  'be-vietnam-pro': { label: 'Be Vietnam Pro', type: 'sans', css: "'Be Vietnam Pro', Arial, sans-serif", docx: 'Be Vietnam Pro' },
  inter: { label: 'Inter', type: 'sans', css: "Inter, Arial, sans-serif", docx: 'Inter' },
  arial: { label: 'Arial', type: 'sans', css: "Arial, Helvetica, sans-serif", docx: 'Arial' }
});

const VALID_GEMINI_MODELS = new Set([
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-pro-latest',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro'
]);

const PROMPT_PRESETS = Object.freeze({
  newbie: `Đối tượng đọc là NGƯỜI MỚI BẮT ĐẦU TẬP ĐỌC NGHIÊN CỨU (100% Newbie, chưa có nền tảng chuyên môn trước đó). Hãy tuân thủ nghiêm ngặt các nguyên tắc sau:
1. DIỄN ĐẠT DỄ HIỂU, TỰ NHIÊN: Dịch đầy đủ 100% câu chữ của bài báo nhưng diễn đạt bằng tiếng Việt mạch lạc, thoát ý, rõ ràng, tránh dịch ghép từ cứng nhắc gây tối nghĩa. Xưng hô nhóm tác giả là "chúng tôi".
2. GIỮ THUẬT NGỮ GỐC TRONG NGOẶC ĐƠN: Mọi thuật ngữ chuyên ngành, khái niệm khoa học, tên phương pháp, kiến trúc mô hình hoặc từ viết tắt đều phải dịch sang tiếng Việt kèm thuật ngữ tiếng Anh gốc trong ngoặc đơn theo mẫu: Tiếng Việt (English Term - Viết tắt nếu có). Ví dụ: học tăng cường (Reinforcement Learning - RL), mô hình ngôn ngữ lớn (Large Language Model - LLM), đối chuẩn cơ sở (baseline), siêu tham số (hyperparameter).
3. GIẢI THÍCH NGẮN GỌN CHO NGƯỜI MỚI: Khi gặp các thuật ngữ học thuật trừu tượng, phép thử nghiệm hoặc chỉ số đo lường mà người mới thường không biết (ví dụ: ablation study, zero-shot, few-shot, inductive bias, overfitting, p-value, perplexity, heuristic, scaling law, bottleneck, v.v.), hãy chèn thêm chú thích cực ngắn trong ngoặc vuông ngay sau thuật ngữ: [hiểu đơn giản: ...] bằng ngôn ngữ đời thường dễ hình dung nhất.
4. TRONG BẢNG DỊCH HÌNH & BIỂU ĐỒ: Ở cột giải nghĩa tiếng Việt, ngoài việc dịch nhãn tiếng Anh, hãy giải thích ngắn gọn thành phần/trục đó thể hiện điều gì để người mới nhìn vào hiểu ngay thông điệp của biểu đồ.`,
  academic: `Dịch theo văn phong khoa học - học thuật chuẩn mực, mạch lạc, chính xác. Mọi thuật ngữ chuyên ngành, tên mô hình, phương pháp và từ viết tắt giữ nguyên tiếng Anh gốc trong ngoặc đơn ngay sau cụm từ tiếng Việt: Tiếng Việt (English Term). Xưng hô nhóm tác giả là "chúng tôi".`
});

const DEFAULT_TYPOGRAPHY_CONFIG = Object.freeze({
  typographyMode: 'split',
  headingFont: 'inter',
  bodyFont: 'georgia',
  captionFont: 'georgia',
  captionItalic: true,
  h1Size: 26,
  h2Size: 20,
  h3Size: 17,
  bodySize: 16,
  captionSize: 14
});

class LayoutTransApp {
  constructor() {
    this.apiKey = localStorage.getItem('layouttrans_gemini_key') || '';
    this.selectedModel = localStorage.getItem('layouttrans_model') || 'gemini-flash-latest';
    const modelMigratedV2 = localStorage.getItem('layouttrans_model_migrated_v2');
    // Migrate retired/legacy 2.5 models to gemini-flash-latest so new API keys never hit HTTP 404
    if (!modelMigratedV2 || !VALID_GEMINI_MODELS.has(this.selectedModel) || this.selectedModel.startsWith('gemini-2.5-') || this.selectedModel.startsWith('gemini-1.5-') || this.selectedModel.startsWith('gemini-2.0-')) {
      this.selectedModel = 'gemini-flash-latest';
      localStorage.setItem('layouttrans_model', this.selectedModel);
      localStorage.setItem('layouttrans_model_migrated_v2', '1');
    }

    const savedChunkSize = parseInt(localStorage.getItem('layouttrans_chunk_size') || '2', 10);
    const batchSettingsVersion = localStorage.getItem('layouttrans_batch_settings_version');
    this.chunkSize = batchSettingsVersion === '3'
      ? Math.max(1, Math.min(6, Number.isFinite(savedChunkSize) ? savedChunkSize : 2))
      : 2;
    localStorage.setItem('layouttrans_chunk_size', String(this.chunkSize));
    localStorage.setItem('layouttrans_batch_settings_version', '3');

    const existingPrompt = localStorage.getItem('layouttrans_custom_prompt');
    const newbiePromptInitialized = localStorage.getItem('layouttrans_newbie_prompt_v1');
    if (!existingPrompt && !newbiePromptInitialized) {
      this.customPrompt = PROMPT_PRESETS.newbie;
      localStorage.setItem('layouttrans_custom_prompt', this.customPrompt);
      localStorage.setItem('layouttrans_newbie_prompt_v1', '1');
    } else {
      this.customPrompt = existingPrompt || '';
    }

    // Initialize role-based typography & custom sizes (Default: Heading Inter + Body Georgia + Caption Georgia Italic)
    const typoV2Init = localStorage.getItem('layouttrans_typography_v2_init');
    if (!typoV2Init) {
      this.typographyMode = DEFAULT_TYPOGRAPHY_CONFIG.typographyMode;
      this.headingFont = DEFAULT_TYPOGRAPHY_CONFIG.headingFont;
      this.bodyFont = DEFAULT_TYPOGRAPHY_CONFIG.bodyFont;
      this.captionFont = DEFAULT_TYPOGRAPHY_CONFIG.captionFont;
      this.captionItalic = DEFAULT_TYPOGRAPHY_CONFIG.captionItalic;
      this.h1Size = DEFAULT_TYPOGRAPHY_CONFIG.h1Size;
      this.h2Size = DEFAULT_TYPOGRAPHY_CONFIG.h2Size;
      this.h3Size = DEFAULT_TYPOGRAPHY_CONFIG.h3Size;
      this.fontSize = DEFAULT_TYPOGRAPHY_CONFIG.bodySize;
      this.captionSize = DEFAULT_TYPOGRAPHY_CONFIG.captionSize;
      this.persistTypographySettings();
      localStorage.setItem('layouttrans_typography_v2_init', '1');
    } else {
      const savedMode = localStorage.getItem('layouttrans_typography_mode');
      this.typographyMode = savedMode === 'unified' ? 'unified' : 'split';
      const savedHeadingFont = localStorage.getItem('layouttrans_heading_font') || DEFAULT_TYPOGRAPHY_CONFIG.headingFont;
      this.headingFont = TRANSLATION_FONT_PRESETS[savedHeadingFont] ? savedHeadingFont : DEFAULT_TYPOGRAPHY_CONFIG.headingFont;
      const savedBodyFont = localStorage.getItem('layouttrans_body_font') || DEFAULT_TYPOGRAPHY_CONFIG.bodyFont;
      this.bodyFont = TRANSLATION_FONT_PRESETS[savedBodyFont] ? savedBodyFont : DEFAULT_TYPOGRAPHY_CONFIG.bodyFont;
      const savedCaptionFont = localStorage.getItem('layouttrans_caption_font') || DEFAULT_TYPOGRAPHY_CONFIG.captionFont;
      this.captionFont = TRANSLATION_FONT_PRESETS[savedCaptionFont] ? savedCaptionFont : DEFAULT_TYPOGRAPHY_CONFIG.captionFont;
      this.captionItalic = localStorage.getItem('layouttrans_caption_italic') !== 'false';

      const clampInt = (raw, min, max, fallback) => {
        const parsed = parseInt(raw, 10);
        return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
      };
      this.h1Size = clampInt(localStorage.getItem('layouttrans_h1_size'), 18, 40, DEFAULT_TYPOGRAPHY_CONFIG.h1Size);
      this.h2Size = clampInt(localStorage.getItem('layouttrans_h2_size'), 15, 32, DEFAULT_TYPOGRAPHY_CONFIG.h2Size);
      this.h3Size = clampInt(localStorage.getItem('layouttrans_h3_size'), 13, 26, DEFAULT_TYPOGRAPHY_CONFIG.h3Size);
      this.fontSize = clampInt(localStorage.getItem('layouttrans_font_size'), 12, 28, DEFAULT_TYPOGRAPHY_CONFIG.bodySize);
      this.captionSize = clampInt(localStorage.getItem('layouttrans_caption_size'), 11, 22, DEFAULT_TYPOGRAPHY_CONFIG.captionSize);
    }

    this.fontPreference = localStorage.getItem('layouttrans_font_preference') || 'georgia';
    if (this.fontPreference !== 'auto' && this.fontPreference !== 'custom' && !TRANSLATION_FONT_PRESETS[this.fontPreference]) {
      this.fontPreference = 'georgia';
    }
    this.pendingFontPreference = this.fontPreference;
    this.customFontFamily = localStorage.getItem('layouttrans_custom_font_family') || '';
    
    this.currentFile = null;
    this.pdfDoc = null;
    this.pdfLibMasterDoc = null;
    this.highResPageCanvasCache = new Map();
    this.currentAbortController = null;
    this.totalPages = 0;
    this.currentPdfPage = 1;
    this.chunks = [];
    this.sourcePageProfiles = [];
    this.sourceTypography = null;
    this.sourceTypographySummary = '';
    this.documentTypography = 'serif';
    this.documentFontFamily = TRANSLATION_FONT_PRESETS['georgia'].css;
    this.requestTimeoutMs = 300000;
    this.maxAutomaticAttempts = 5;
    this.highDemandFallbackModels = [
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-pro-latest'
    ];
    this.availableModelNames = null;
    this.translationRunId = 0;
    
    this.isTranslating = false;
    this.isPaused = false;
    this.currentChunkIndex = 0;

    // Load persisted reader & viewer settings
    this.syncScroll = localStorage.getItem('layouttrans_sync_scroll') !== 'false';
    const savedZoom = parseFloat(localStorage.getItem('layouttrans_zoom_scale') || '1.0');
    this.zoomScale = Number.isFinite(savedZoom) ? Math.max(0.6, Math.min(2.2, savedZoom)) : 1.0;
    const savedViewMode = localStorage.getItem('layouttrans_view_mode') || 'split';
    this.viewMode = ['split', 'translation-only', 'original-only'].includes(savedViewMode) ? savedViewMode : 'split';
    const savedSplitPct = parseFloat(localStorage.getItem('layouttrans_pane_split_pct') || '50');
    this.paneSplitPct = Number.isFinite(savedSplitPct) ? Math.max(20, Math.min(80, savedSplitPct)) : 50;

    this.initElements();
    this.bindEvents();
    this.updateApiKeyStatus();
    this.loadSavedTheme();
    this.restorePersistedUiState();
    this.applyTranslationTypography();
  }

  persistTypographySettings() {
    localStorage.setItem('layouttrans_typography_mode', this.typographyMode);
    localStorage.setItem('layouttrans_heading_font', this.headingFont);
    localStorage.setItem('layouttrans_body_font', this.bodyFont);
    localStorage.setItem('layouttrans_caption_font', this.captionFont);
    localStorage.setItem('layouttrans_caption_italic', String(this.captionItalic));
    localStorage.setItem('layouttrans_h1_size', String(this.h1Size));
    localStorage.setItem('layouttrans_h2_size', String(this.h2Size));
    localStorage.setItem('layouttrans_h3_size', String(this.h3Size));
    localStorage.setItem('layouttrans_font_size', String(this.fontSize));
    localStorage.setItem('layouttrans_caption_size', String(this.captionSize));
  }

  initElements() {
    // Header & Views
    this.viewSplitBtn = document.getElementById('viewSplitBtn');
    this.viewTransBtn = document.getElementById('viewTransBtn');
    this.viewOrigBtn = document.getElementById('viewOrigBtn');
    this.syncScrollBtn = document.getElementById('syncScrollBtn');
    this.modelSelector = document.getElementById('modelSelector');
    this.themeToggleBtn = document.getElementById('themeToggleBtn');
    this.themeIconDark = document.getElementById('themeIconDark');
    this.themeIconLight = document.getElementById('themeIconLight');

    // Export Dropdown
    this.exportMenuBtn = document.getElementById('exportMenuBtn');
    this.exportDropdown = document.getElementById('exportDropdown');
    this.exportSourceDocxBtn = document.getElementById('exportSourceDocxBtn');
    this.exportSourceMarkdownBtn = document.getElementById('exportSourceMarkdownBtn');
    this.exportSourceHtmlBtn = document.getElementById('exportSourceHtmlBtn');
    this.exportHtmlBtn = document.getElementById('exportHtmlBtn');
    this.exportDocxBtn = document.getElementById('exportDocxBtn');
    this.exportPdfBtn = document.getElementById('exportPdfBtn');

    // Settings Modal
    this.openSettingsBtn = document.getElementById('openSettingsBtn');
    this.settingsModal = document.getElementById('settingsModal');
    this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
    this.cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
    this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
    this.testApiKeyBtn = document.getElementById('testApiKeyBtn');
    this.apiKeyInput = document.getElementById('apiKeyInput');
    this.toggleApiKeyVis = document.getElementById('toggleApiKeyVis');
    this.apiKeyStatusDot = document.getElementById('apiKeyStatusDot');
    this.apiKeyStatusText = document.getElementById('apiKeyStatusText');
    this.apiKeyTestResult = document.getElementById('apiKeyTestResult');
    this.chunkSizeInput = document.getElementById('chunkSizeInput');
    this.chunkSizeDisplay = document.getElementById('chunkSizeDisplay');
    this.typographyModeSelect = document.getElementById('typographyModeSelect');
    this.splitTypographyBox = document.getElementById('splitTypographyBox');
    this.unifiedTypographyBox = document.getElementById('unifiedTypographyBox');
    this.headingFontInput = document.getElementById('headingFontInput');
    this.bodyFontInput = document.getElementById('bodyFontInput');
    this.captionFontInput = document.getElementById('captionFontInput');
    this.captionItalicInput = document.getElementById('captionItalicInput');
    this.resetTypographyBtn = document.getElementById('resetTypographyBtn');
    this.h1SizeInput = document.getElementById('h1SizeInput');
    this.h2SizeInput = document.getElementById('h2SizeInput');
    this.h3SizeInput = document.getElementById('h3SizeInput');
    this.bodySizeInput = document.getElementById('bodySizeInput');
    this.captionSizeInput = document.getElementById('captionSizeInput');
    this.fontPreferenceInput = document.getElementById('fontPreferenceInput');
    this.quickFontSelector = document.getElementById('quickFontSelector');
    this.customFontFamilyRow = document.getElementById('customFontFamilyRow');
    this.customFontFamilyInput = document.getElementById('customFontFamilyInput');
    this.fontDetectionStatus = document.getElementById('fontDetectionStatus');
    this.customPromptInput = document.getElementById('customPromptInput');

    // Ribbon & Actions
    this.currentFileName = document.getElementById('currentFileName');
    this.pageCountBadge = document.getElementById('pageCountBadge');
    this.progressSection = document.getElementById('progressSection');
    this.progressBarFill = document.getElementById('progressBarFill');
    this.progressText = document.getElementById('progressText');
    this.startTranslateBtn = document.getElementById('startTranslateBtn');
    this.startBtnLabel = document.getElementById('startBtnLabel');
    this.pauseTranslateBtn = document.getElementById('pauseTranslateBtn');
    this.resetDocBtn = document.getElementById('resetDocBtn');

    // Workspace & Panes
    this.dropzoneContainer = document.getElementById('dropzoneContainer');
    this.dropzoneCard = document.getElementById('dropzoneCard');
    this.pdfFileInput = document.getElementById('pdfFileInput');
    this.selectFileBtn = document.getElementById('selectFileBtn');
    this.dualPaneContainer = document.getElementById('dualPaneContainer');
    this.paneOriginal = document.getElementById('paneOriginal');
    this.paneTranslated = document.getElementById('paneTranslated');
    this.paneResizer = document.getElementById('paneResizer');

    // PDF Controls
    this.pdfViewerScrollContainer = document.getElementById('pdfViewerScrollContainer');
    this.pdfPagesRenderContainer = document.getElementById('pdfPagesRenderContainer');
    this.pdfPageIndicator = document.getElementById('pdfPageIndicator');
    this.pdfPrevPage = document.getElementById('pdfPrevPage');
    this.pdfNextPage = document.getElementById('pdfNextPage');
    this.pdfZoomIn = document.getElementById('pdfZoomIn');
    this.pdfZoomOut = document.getElementById('pdfZoomOut');
    this.pdfZoomLevel = document.getElementById('pdfZoomLevel');

    // Translated Pane
    this.translatedScrollContainer = document.getElementById('translatedScrollContainer');
    this.translatedContent = document.getElementById('translatedContent');
    this.copyTranslatedBtn = document.getElementById('copyTranslatedBtn');
    this.clearCacheBtn = document.getElementById('clearCacheBtn');
    this.fontIncreaseBtn = document.getElementById('fontIncreaseBtn');
    this.fontDecreaseBtn = document.getElementById('fontDecreaseBtn');
    this.fontSizeDisplay = document.getElementById('fontSizeDisplay');

    // Figure Lightbox Modal
    this.figureLightboxModal = document.getElementById('figureLightboxModal');
    this.closeFigureLightboxBtn = document.getElementById('closeFigureLightboxBtn');
    this.lightboxRotateLeftBtn = document.getElementById('lightboxRotateLeftBtn');
    this.lightboxRotateRightBtn = document.getElementById('lightboxRotateRightBtn');
    this.figureLightboxTitle = document.getElementById('figureLightboxTitle');
    this.figureLightboxImg = document.getElementById('figureLightboxImg');
    this.figureLightboxDetails = document.getElementById('figureLightboxDetails');
    this.activeLightboxFigure = null;
    this.activeLightboxPageNum = null;

    // Toast
    this.toastContainer = document.getElementById('toastContainer');
  }

  syncTypographyInputsFromState() {
    if (this.typographyModeSelect) this.typographyModeSelect.value = this.typographyMode;
    if (this.splitTypographyBox) this.splitTypographyBox.style.display = this.typographyMode === 'split' ? 'block' : 'none';
    if (this.unifiedTypographyBox) this.unifiedTypographyBox.style.display = this.typographyMode === 'unified' ? 'block' : 'none';
    if (this.headingFontInput) this.headingFontInput.value = this.headingFont;
    if (this.bodyFontInput) this.bodyFontInput.value = this.bodyFont;
    if (this.captionFontInput) this.captionFontInput.value = this.captionFont;
    if (this.captionItalicInput) this.captionItalicInput.checked = Boolean(this.captionItalic);
    if (this.h1SizeInput) this.h1SizeInput.value = String(this.h1Size);
    if (this.h2SizeInput) this.h2SizeInput.value = String(this.h2Size);
    if (this.h3SizeInput) this.h3SizeInput.value = String(this.h3Size);
    if (this.bodySizeInput) this.bodySizeInput.value = String(this.fontSize);
    if (this.captionSizeInput) this.captionSizeInput.value = String(this.captionSize);
    if (this.fontSizeDisplay) this.fontSizeDisplay.textContent = `${this.fontSize}px`;
    if (this.fontPreferenceInput) this.fontPreferenceInput.value = this.fontPreference;
    if (this.customFontFamilyInput) this.customFontFamilyInput.value = this.customFontFamily;
    if (this.quickFontSelector) {
      const splitOpt = this.quickFontSelector.querySelector('option[value="split-custom"]');
      if (splitOpt) {
        const hLabel = TRANSLATION_FONT_PRESETS[this.headingFont]?.label || 'Inter';
        const bLabel = TRANSLATION_FONT_PRESETS[this.bodyFont]?.label || 'Georgia';
        splitOpt.textContent = `✨ Phối riêng: Heading ${hLabel} + Body ${bLabel}`;
      }
      this.quickFontSelector.value = this.typographyMode === 'split' ? 'split-custom' : this.fontPreference;
    }
    this.updateCustomFontFamilyVisibility();
  }

  restorePersistedUiState() {
    if (this.pdfZoomLevel) this.pdfZoomLevel.textContent = `${Math.round(this.zoomScale * 100)}%`;
    if (this.syncScrollBtn) this.syncScrollBtn.classList.toggle('active', this.syncScroll);
    if (this.chunkSizeInput) this.chunkSizeInput.value = String(this.chunkSize);
    if (this.chunkSizeDisplay) this.chunkSizeDisplay.textContent = `${this.chunkSize} trang`;
    if (this.customPromptInput) this.customPromptInput.value = this.customPrompt;
    this.syncTypographyInputsFromState();
    this.setViewMode(this.viewMode, false);
    if (this.paneOriginal && this.paneTranslated && this.paneSplitPct !== 50) {
      this.paneOriginal.style.flex = `0 0 ${this.paneSplitPct}%`;
      this.paneTranslated.style.flex = `0 0 ${100 - this.paneSplitPct}%`;
    }
  }

  bindEvents() {
    // File Selection & Drag-Drop
    this.selectFileBtn.addEventListener('click', () => this.pdfFileInput.click());
    this.pdfFileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    
    ['dragenter', 'dragover'].forEach(eventName => {
      this.dropzoneCard.addEventListener(eventName, (e) => {
        e.preventDefault();
        this.dropzoneCard.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.dropzoneCard.addEventListener(eventName, (e) => {
        e.preventDefault();
        this.dropzoneCard.classList.remove('drag-over');
      });
    });

    this.dropzoneCard.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type === 'application/pdf') {
        this.loadPdfFile(files[0]);
      } else {
        this.showToast('Vui lòng chọn file tài liệu định dạng PDF!', 'error');
      }
    });

    // Translation controls
    this.startTranslateBtn.addEventListener('click', () => this.startTranslationProcess());
    this.pauseTranslateBtn.addEventListener('click', () => this.togglePauseTranslation());
    this.resetDocBtn.addEventListener('click', () => this.resetWorkspace());

    // Settings Modal
    this.openSettingsBtn.addEventListener('click', () => this.openSettings());
    this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
    this.cancelSettingsBtn.addEventListener('click', () => this.closeSettings());
    this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
    if (this.testApiKeyBtn) {
      this.testApiKeyBtn.addEventListener('click', () => this.testApiKeyConnection());
    }
    this.toggleApiKeyVis.addEventListener('click', () => {
      this.apiKeyInput.type = this.apiKeyInput.type === 'password' ? 'text' : 'password';
    });
    this.chunkSizeInput.addEventListener('input', (e) => {
      this.chunkSizeDisplay.textContent = `${e.target.value} trang`;
    });

    // Role-based Typography & Custom Size Live Controls
    if (this.typographyModeSelect) {
      this.typographyModeSelect.addEventListener('change', (e) => {
        this.typographyMode = e.target.value === 'unified' ? 'unified' : 'split';
        this.persistTypographySettings();
        this.syncTypographyInputsFromState();
        this.applyTranslationTypography();
      });
    }
    if (this.headingFontInput) {
      this.headingFontInput.addEventListener('change', (e) => {
        this.headingFont = e.target.value;
        this.typographyMode = 'split';
        this.persistTypographySettings();
        this.syncTypographyInputsFromState();
        this.applyTranslationTypography();
      });
    }
    if (this.bodyFontInput) {
      this.bodyFontInput.addEventListener('change', (e) => {
        this.bodyFont = e.target.value;
        this.typographyMode = 'split';
        this.persistTypographySettings();
        this.syncTypographyInputsFromState();
        this.applyTranslationTypography();
      });
    }
    if (this.captionFontInput) {
      this.captionFontInput.addEventListener('change', (e) => {
        this.captionFont = e.target.value;
        this.persistTypographySettings();
        this.syncTypographyInputsFromState();
        this.applyTranslationTypography();
      });
    }
    if (this.captionItalicInput) {
      this.captionItalicInput.addEventListener('change', (e) => {
        this.captionItalic = Boolean(e.target.checked);
        this.persistTypographySettings();
        this.applyTranslationTypography();
      });
    }

    const bindSizeInput = (inputEl, propName, minVal, maxVal) => {
      if (!inputEl) return;
      const onSizeChange = () => {
        const parsed = parseInt(inputEl.value, 10);
        if (!Number.isFinite(parsed)) return;
        const clamped = Math.max(minVal, Math.min(maxVal, parsed));
        this[propName] = clamped;
        this.persistTypographySettings();
        if (propName === 'fontSize' && this.fontSizeDisplay) {
          this.fontSizeDisplay.textContent = `${this.fontSize}px`;
        }
        this.applyTranslationTypography();
      };
      inputEl.addEventListener('input', onSizeChange);
      inputEl.addEventListener('change', () => {
        onSizeChange();
        inputEl.value = String(this[propName]);
      });
    };
    bindSizeInput(this.h1SizeInput, 'h1Size', 18, 40);
    bindSizeInput(this.h2SizeInput, 'h2Size', 15, 32);
    bindSizeInput(this.h3SizeInput, 'h3Size', 13, 26);
    bindSizeInput(this.bodySizeInput, 'fontSize', 12, 28);
    bindSizeInput(this.captionSizeInput, 'captionSize', 11, 22);

    if (this.resetTypographyBtn) {
      this.resetTypographyBtn.addEventListener('click', () => {
        this.resetTypographyToDefaults();
      });
    }

    this.fontPreferenceInput.value = this.fontPreference;
    this.customFontFamilyInput.value = this.customFontFamily;
    this.fontPreferenceInput.addEventListener('change', (event) => {
      const val = event.target.value;
      this.pendingFontPreference = val;
      this.fontPreference = val;
      this.typographyMode = 'unified';
      localStorage.setItem('layouttrans_font_preference', val);
      this.persistTypographySettings();
      this.syncTypographyInputsFromState();
      this.applyTranslationTypography(val);
    });
    this.customFontFamilyInput.addEventListener('input', () => {
      const customVal = this.customFontFamilyInput.value.trim();
      if (this.isValidCustomFontFamily(customVal)) {
        this.customFontFamily = customVal;
        localStorage.setItem('layouttrans_custom_font_family', customVal);
      }
      this.applyTranslationTypography(this.pendingFontPreference);
    });

    // Custom Prompt live auto-save & preset buttons
    if (this.customPromptInput) {
      this.customPromptInput.value = this.customPrompt;
      this.customPromptInput.addEventListener('input', () => {
        this.customPrompt = this.customPromptInput.value.trim();
        localStorage.setItem('layouttrans_custom_prompt', this.customPrompt);
      });
    }
    document.querySelectorAll('.prompt-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const presetKey = btn.dataset.preset;
        if (presetKey === 'clear') {
          this.customPrompt = '';
        } else if (PROMPT_PRESETS[presetKey]) {
          this.customPrompt = PROMPT_PRESETS[presetKey];
        }
        if (this.customPromptInput) {
          this.customPromptInput.value = this.customPrompt;
        }
        localStorage.setItem('layouttrans_custom_prompt', this.customPrompt);
        localStorage.setItem('layouttrans_newbie_prompt_v1', '1');
        const label = presetKey === 'newbie'
          ? '🌱 Chế độ Người mới tập đọc nghiên cứu'
          : (presetKey === 'academic' ? '🎓 Chế độ Học thuật chuẩn' : 'Đã xóa trống chỉ thị bổ sung');
        this.showToast(`Đã áp dụng & tự động lưu: ${label}`, 'success');
      });
    });

    // Quick Font Selector on Right Pane Header
    if (this.quickFontSelector) {
      this.quickFontSelector.addEventListener('change', (e) => {
        const chosen = e.target.value;
        if (chosen === 'split-custom') {
          this.typographyMode = 'split';
          this.persistTypographySettings();
          this.syncTypographyInputsFromState();
          this.applyTranslationTypography();
          const hLabel = TRANSLATION_FONT_PRESETS[this.headingFont]?.label || 'Inter';
          const bLabel = TRANSLATION_FONT_PRESETS[this.bodyFont]?.label || 'Georgia';
          this.showToast(`Đã bật phối riêng: Heading ${hLabel} + Body ${bLabel}`, 'info');
          return;
        }
        if (chosen === 'custom' && !this.isValidCustomFontFamily(this.customFontFamily)) {
          this.typographyMode = 'unified';
          this.pendingFontPreference = 'custom';
          this.openSettings();
          this.fontPreferenceInput.value = 'custom';
          this.syncTypographyInputsFromState();
          this.customFontFamilyInput?.focus();
          return;
        }
        this.typographyMode = 'unified';
        this.fontPreference = chosen;
        this.pendingFontPreference = chosen;
        localStorage.setItem('layouttrans_font_preference', chosen);
        this.persistTypographySettings();
        this.syncTypographyInputsFromState();
        this.applyTranslationTypography(chosen);
        const resolved = this.resolveTranslationFont(chosen);
        this.showToast(`Đã lưu 1 font đồng bộ toàn bài: ${resolved.label}`, 'info');
      });
    }

    // Model Selector
    this.modelSelector.value = this.selectedModel;
    this.modelSelector.addEventListener('change', (e) => {
      this.selectedModel = e.target.value;
      localStorage.setItem('layouttrans_model', this.selectedModel);
      this.showToast(`Đã lưu model: ${this.getModelDisplayName(this.selectedModel)}`, 'info');
    });

    // View Modes
    this.viewSplitBtn.addEventListener('click', () => this.setViewMode('split'));
    this.viewTransBtn.addEventListener('click', () => this.setViewMode('translation-only'));
    this.viewOrigBtn.addEventListener('click', () => this.setViewMode('original-only'));

    // Sync Scroll Button
    this.syncScrollBtn.addEventListener('click', () => {
      this.syncScroll = !this.syncScroll;
      localStorage.setItem('layouttrans_sync_scroll', String(this.syncScroll));
      this.syncScrollBtn.classList.toggle('active', this.syncScroll);
      this.showToast(this.syncScroll ? 'Đã bật cuộn đồng bộ (Đã lưu)' : 'Đã tắt cuộn đồng bộ (Đã lưu)', 'info');
    });

    // Synced Scrolling Implementation (Direction-aware to prevent scroll locks)
    let isUserScrollingLeft = false;
    let isUserScrollingRight = false;
    let syncTimeout = null;

    this.pdfViewerScrollContainer.addEventListener('wheel', () => {
      isUserScrollingLeft = true;
      isUserScrollingRight = false;
    }, { passive: true });

    this.pdfViewerScrollContainer.addEventListener('touchstart', () => {
      isUserScrollingLeft = true;
      isUserScrollingRight = false;
    }, { passive: true });

    this.translatedScrollContainer.addEventListener('wheel', () => {
      isUserScrollingRight = true;
      isUserScrollingLeft = false;
    }, { passive: true });

    this.translatedScrollContainer.addEventListener('touchstart', () => {
      isUserScrollingRight = true;
      isUserScrollingLeft = false;
    }, { passive: true });

    this.pdfViewerScrollContainer.addEventListener('scroll', () => {
      this.updateActivePdfPageIndicator();
      if (!this.syncScroll || isUserScrollingRight) return;
      const maxLeft = this.pdfViewerScrollContainer.scrollHeight - this.pdfViewerScrollContainer.clientHeight;
      if (maxLeft <= 0) return;
      const pct = this.pdfViewerScrollContainer.scrollTop / maxLeft;
      const maxRight = this.translatedScrollContainer.scrollHeight - this.translatedScrollContainer.clientHeight;
      if (maxRight > 0) {
        this.translatedScrollContainer.scrollTop = pct * maxRight;
      }
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => { isUserScrollingLeft = false; }, 120);
    }, { passive: true });

    this.translatedScrollContainer.addEventListener('scroll', () => {
      if (!this.syncScroll || isUserScrollingLeft) return;
      const maxRight = this.translatedScrollContainer.scrollHeight - this.translatedScrollContainer.clientHeight;
      if (maxRight <= 0) return;
      const pct = this.translatedScrollContainer.scrollTop / maxRight;
      const maxLeft = this.pdfViewerScrollContainer.scrollHeight - this.pdfViewerScrollContainer.clientHeight;
      if (maxLeft > 0) {
        this.pdfViewerScrollContainer.scrollTop = pct * maxLeft;
      }
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => { isUserScrollingRight = false; }, 120);
    }, { passive: true });

    // PDF Prev / Next Page Navigation
    if (this.pdfPrevPage) {
      this.pdfPrevPage.addEventListener('click', () => this.jumpToPdfPage(Math.max(1, (this.currentPdfPage || 1) - 1)));
    }
    if (this.pdfNextPage) {
      this.pdfNextPage.addEventListener('click', () => this.jumpToPdfPage(Math.min(this.totalPages || 1, (this.currentPdfPage || 1) + 1)));
    }

    // Zoom Controls
    this.pdfZoomIn.addEventListener('click', () => this.changeZoom(0.15));
    this.pdfZoomOut.addEventListener('click', () => this.changeZoom(-0.15));

    // Font Controls
    this.fontIncreaseBtn.addEventListener('click', () => this.changeFontSize(1));
    this.fontDecreaseBtn.addEventListener('click', () => this.changeFontSize(-1));

    // Copy Translated Text & Clear Cache
    this.copyTranslatedBtn.addEventListener('click', () => this.copyTranslatedText());
    if (this.clearCacheBtn) {
      this.clearCacheBtn.addEventListener('click', () => this.clearCurrentDocumentCache());
    }

    // Figure Lightbox Modal Events
    if (this.closeFigureLightboxBtn) {
      this.closeFigureLightboxBtn.addEventListener('click', () => this.closeFigureLightbox());
    }
    if (this.lightboxRotateLeftBtn) {
      this.lightboxRotateLeftBtn.addEventListener('click', () => {
        if (this.activeLightboxFigure) {
          this.rotateFigureBy(this.activeLightboxFigure, this.activeLightboxPageNum, -90);
        }
      });
    }
    if (this.lightboxRotateRightBtn) {
      this.lightboxRotateRightBtn.addEventListener('click', () => {
        if (this.activeLightboxFigure) {
          this.rotateFigureBy(this.activeLightboxFigure, this.activeLightboxPageNum, 90);
        }
      });
    }
    if (this.figureLightboxModal) {
      this.figureLightboxModal.addEventListener('click', (e) => {
        if (e.target === this.figureLightboxModal) this.closeFigureLightbox();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.figureLightboxModal?.style.display === 'flex') this.closeFigureLightbox();
        else if (this.settingsModal?.style.display === 'flex') this.closeSettings();
      }
    });

    // Theme Toggle
    this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

    // Export Dropdown
    this.exportMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.exportMenuBtn.parentElement.classList.toggle('open');
    });
    document.addEventListener('click', () => {
      document.querySelectorAll('.dropdown.open').forEach(el => el.classList.remove('open'));
    });
    if (this.exportSourceDocxBtn) {
      this.exportSourceDocxBtn.addEventListener('click', (e) => { e.preventDefault(); this.exportSourceText('docx'); });
    }
    this.exportSourceMarkdownBtn.addEventListener('click', (e) => { e.preventDefault(); this.exportSourceText('markdown'); });
    this.exportSourceHtmlBtn.addEventListener('click', (e) => { e.preventDefault(); this.exportSourceText('html'); });
    this.exportHtmlBtn.addEventListener('click', (e) => { e.preventDefault(); this.exportHtml(); });
    this.exportDocxBtn.addEventListener('click', (e) => { e.preventDefault(); this.exportDocx(); });
    this.exportPdfBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!this.ensureExportReady('PDF')) return;
      const origTitle = document.title;
      document.title = this.getExportBaseName();
      this.showToast('Trong hộp in: tắt “Headers and footers” để bỏ ngày, URL và số trang của Chrome.', 'info');
      setTimeout(() => {
        window.print();
        setTimeout(() => { document.title = origTitle; }, 1200);
      }, 120);
    });

    // Resizer divider between panes
    this.initPaneResizer();
  }

  // ==================== PDF Handling & Chunking ====================

  handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
      this.loadPdfFile(e.target.files[0]);
    }
  }

  async loadPdfFile(file) {
    try {
      this.translationRunId += 1;
      this.isTranslating = false;
      this.isPaused = false;
      if (this.currentAbortController) {
        try { this.currentAbortController.abort(); } catch (error) {}
      }
      this.currentFile = file;
      this.highResPageCanvasCache.clear();
      this.sourcePageProfiles = [];
      this.sourceTypography = null;
      this.sourceTypographySummary = '';
      this.applyTranslationTypography();
      this.currentFileName.textContent = file.name;
      this.currentFileName.title = file.name;

      this.showToast('Đang nạp tài liệu...', 'info');

      // CRITICAL FIX: Pass a cloned slice of ArrayBuffer to PDF.js
      // because PDF.js transfers (detaches) the buffer to its Web Worker!
      const rawBuffer = await file.arrayBuffer();
      const pdfJsBuffer = rawBuffer.slice(0);

      // Pre-load PDFLib master document once so extracting pages later is instantaneous (< 0.1s)
      const pdfLibInstance = window.PDFLib || (typeof PDFLib !== 'undefined' ? PDFLib : null);
      if (pdfLibInstance) {
        try {
          this.pdfLibMasterDoc = await pdfLibInstance.PDFDocument.load(rawBuffer.slice(0));
        } catch (e) {
          console.warn('PDFLib preload error, will reload on demand:', e);
          this.pdfLibMasterDoc = null;
        }
      } else {
        this.pdfLibMasterDoc = null;
      }

      // Load with PDF.js for visual rendering
      const loadingTask = pdfjsLib.getDocument({ data: pdfJsBuffer });
      this.pdfDoc = await loadingTask.promise;
      this.totalPages = this.pdfDoc.numPages;
      this.currentPdfPage = 1;

      this.pageCountBadge.textContent = `${this.totalPages} trang`;
      this.pdfPageIndicator.textContent = `1 / ${this.totalPages}`;

      this.buildChunks();

      // Switch to Dual Pane View
      this.dropzoneContainer.style.display = 'none';
      this.dualPaneContainer.style.display = 'flex';
      this.resetDocBtn.style.display = 'inline-flex';
      this.startTranslateBtn.disabled = true;

      // Render PDF pages on left pane
      await this.renderPdfPages();
      this.startTranslateBtn.disabled = false;

      // Restore cached translated pages if available for this PDF
      const restoredCount = this.restoreCachedTranslationsForCurrentDoc();
      if (restoredCount > 0) {
        this.showToast(`⚡ Đã tự động khôi phục ${restoredCount}/${this.totalPages} trang đã dịch từ bộ nhớ đệm!`, 'success');
      } else {
        this.showToast(`Đã nạp ${this.totalPages} trang thành ${this.chunks.length} batch (${this.chunkSize} trang/request).`, 'success');
      }
    } catch (err) {
      console.error('Lỗi khi nạp PDF:', err);
      this.showToast(`Lỗi nạp file PDF: ${err.message}`, 'error');
    }
  }

  getDocCacheKey() {
    if (!this.currentFile) return null;
    const safeName = String(this.currentFile.name || 'doc').replace(/[^a-zA-Z0-9._-]/g, '_');
    return `layouttrans_cache_v2_${safeName}_${this.currentFile.size || 0}_${this.totalPages || 0}`;
  }

  loadCachedPageResultsMap() {
    const key = this.getDocCacheKey();
    if (!key) return new Map();
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return new Map();
      const parsed = JSON.parse(raw);
      const map = new Map();
      if (parsed && typeof parsed === 'object') {
        Object.entries(parsed).forEach(([pageStr, pageResult]) => {
          const pageNum = parseInt(pageStr, 10);
          if (Number.isInteger(pageNum) && pageResult?.html && pageResult?.qa?.passed) {
            map.set(pageNum, pageResult);
          }
        });
      }
      return map;
    } catch (e) {
      return new Map();
    }
  }

  saveCachedPageResult(pageResult) {
    const key = this.getDocCacheKey();
    if (!key || !pageResult?.pageNum || !pageResult?.qa?.passed) return;
    try {
      const existing = {};
      const raw = localStorage.getItem(key);
      if (raw) Object.assign(existing, JSON.parse(raw));
      existing[pageResult.pageNum] = {
        pageNum: pageResult.pageNum,
        html: pageResult.html,
        qa: pageResult.qa,
        savedAt: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(existing));
      if (this.clearCacheBtn) this.clearCacheBtn.style.display = 'inline-flex';
    } catch (e) {
      console.warn('Không thể lưu cache trang (có thể đầy bộ nhớ localStorage):', e);
    }
  }

  restoreCachedTranslationsForCurrentDoc() {
    const cachedMap = this.loadCachedPageResultsMap();
    if (cachedMap.size === 0) {
      if (this.clearCacheBtn) this.clearCacheBtn.style.display = 'none';
      return 0;
    }

    const emptyPlaceholder = this.translatedContent.querySelector('.empty-state-placeholder');
    if (emptyPlaceholder) emptyPlaceholder.remove();
    this.translatedContent.innerHTML = '';

    let restoredPages = 0;
    this.chunks.forEach(chunk => {
      const pageNums = this.getChunkPageNumbers(chunk);
      const chunkResults = [];
      pageNums.forEach(pageNum => {
        const cached = cachedMap.get(pageNum);
        if (cached) {
          chunkResults.push(cached);
          restoredPages += 1;
        }
      });
      chunk.pageResults = chunkResults;
      if (chunkResults.length === pageNums.length) {
        chunk.status = 'completed';
        chunk.translatedHtml = this.renderBatchPageSections(chunkResults);
        chunk.qa = { passed: true, code: 'PASS', pageCount: chunkResults.length };
        this.renderChunkOutput(chunk);
      } else if (chunkResults.length > 0) {
        chunk.translatedHtml = this.renderBatchPageSections(chunkResults);
        this.renderChunkOutput(chunk);
      }
    });

    if (restoredPages > 0) {
      this.progressSection.style.display = 'flex';
      if (this.clearCacheBtn) this.clearCacheBtn.style.display = 'inline-flex';
      this.updateProgressUI();
      const incomplete = this.getIncompletePageNumbers();
      if (incomplete.length === 0) {
        this.startBtnLabel.textContent = 'Đã dịch & kiểm tra';
      } else {
        this.startBtnLabel.textContent = `Dịch tiếp ${incomplete.length} trang còn lại`;
      }
    }
    return restoredPages;
  }

  clearCurrentDocumentCache() {
    const key = this.getDocCacheKey();
    if (!key) return;
    if (!confirm('Xóa bộ nhớ đệm bản dịch của tài liệu này để dịch mới lại từ đầu?')) return;
    localStorage.removeItem(key);
    if (this.clearCacheBtn) this.clearCacheBtn.style.display = 'none';
    this.translatedContent.innerHTML = `
      <div class="empty-state-placeholder">
        <div class="empty-illustration">📖</div>
        <h3>Đã xóa bộ nhớ đệm</h3>
        <p>Bấm <strong>"Bắt đầu dịch"</strong> để dịch mới lại toàn bộ tài liệu.</p>
      </div>
    `;
    this.buildChunks();
    this.startBtnLabel.textContent = 'Bắt đầu dịch';
    this.showToast('Đã xóa cache bản dịch của tài liệu hiện tại.', 'info');
  }

  buildChunks(preserveExistingResults = false) {
    const existingPageMap = new Map();
    if (preserveExistingResults && Array.isArray(this.chunks)) {
      this.chunks.forEach(c => {
        (c.pageResults || []).forEach(pr => {
          if (pr?.qa?.passed) existingPageMap.set(pr.pageNum, pr);
        });
      });
    }

    this.chunks = [];
    const size = this.chunkSize;
    let chunkId = 1;
    for (let page = 1; page <= this.totalPages; page += size) {
      const start = page;
      const end = Math.min(page + size - 1, this.totalPages);
      const pageResults = [];
      for (let p = start; p <= end; p++) {
        if (existingPageMap.has(p)) pageResults.push(existingPageMap.get(p));
      }
      const allPassed = pageResults.length === (end - start + 1);
      this.chunks.push({
        id: chunkId++,
        startPage: start,
        endPage: end,
        status: allPassed ? 'completed' : 'pending',
        translatedHtml: allPassed ? this.renderBatchPageSections(pageResults) : '',
        error: null,
        qa: allPassed ? { passed: true, code: 'PASS', pageCount: pageResults.length } : null,
        pageResults
      });
    }
    this.updateProgressUI();
  }

  jumpToPdfPage(pageNum) {
    if (!this.pdfDoc || pageNum < 1 || pageNum > this.totalPages) return;
    this.currentPdfPage = pageNum;
    if (this.pdfPageIndicator) this.pdfPageIndicator.textContent = `${pageNum} / ${this.totalPages}`;
    const pageWrapper = document.getElementById(`pdf-page-${pageNum}`);
    if (pageWrapper) {
      pageWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
      pageWrapper.classList.add('highlight-pulse');
      setTimeout(() => pageWrapper.classList.remove('highlight-pulse'), 1400);
    }
  }

  updateActivePdfPageIndicator() {
    if (!this.pdfDoc || !this.pdfViewerScrollContainer) return;
    const containerRect = this.pdfViewerScrollContainer.getBoundingClientRect();
    const targetY = containerRect.top + containerRect.height * 0.35;
    const wrappers = this.pdfPagesRenderContainer.querySelectorAll('.pdf-page-wrapper');
    let bestPage = this.currentPdfPage || 1;
    let bestDist = Infinity;
    wrappers.forEach(w => {
      const rect = w.getBoundingClientRect();
      const center = (rect.top + rect.bottom) / 2;
      const dist = Math.abs(center - targetY);
      if (dist < bestDist) {
        bestDist = dist;
        bestPage = parseInt(w.dataset.pageNum || '1', 10);
      }
    });
    if (bestPage !== this.currentPdfPage) {
      this.currentPdfPage = bestPage;
      if (this.pdfPageIndicator) this.pdfPageIndicator.textContent = `${bestPage} / ${this.totalPages}`;
    }
  }

  async renderPdfPages() {
    this.pdfPagesRenderContainer.innerHTML = '';
    const shouldExtractProfiles = this.sourcePageProfiles.length !== this.totalPages;
    if (shouldExtractProfiles) this.sourcePageProfiles = [];
    for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
      const page = await this.pdfDoc.getPage(pageNum);
      if (shouldExtractProfiles) {
        const textContent = await page.getTextContent();
        const analysisViewport = page.getViewport({ scale: 1 });
        const text = textContent.items
          .map(item => typeof item.str === 'string' ? item.str : '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        const sourceStyle = this.analyzeSourcePage(textContent, analysisViewport.width);
        this.sourcePageProfiles.push({
          pageNum,
          text,
          characterCount: text.length,
          wordCount: text ? text.split(/\s+/).length : 0,
          textItems: this.extractSourceTextItems(textContent, analysisViewport),
          ...sourceStyle
        });
      }
      const viewport = page.getViewport({ scale: 1.2 * this.zoomScale });

      const pageWrapper = document.createElement('div');
      pageWrapper.className = 'pdf-page-wrapper';
      pageWrapper.id = `pdf-page-${pageNum}`;
      pageWrapper.dataset.pageNum = pageNum;
      const pageProfile = this.getSourcePageProfile(pageNum);
      pageWrapper.dataset.columnCount = String(pageProfile?.columnCount || 1);
      pageWrapper.dataset.splitLineRatio = String(pageProfile?.splitLineRatio || 0);

      const badge = document.createElement('span');
      badge.className = 'pdf-page-badge';
      badge.textContent = `Trang ${pageNum}`;
      pageWrapper.appendChild(badge);

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      pageWrapper.appendChild(canvas);

      this.pdfPagesRenderContainer.appendChild(pageWrapper);

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
    }

    if (shouldExtractProfiles) this.applySourceDocumentProfile();
  }

  analyzeSourcePage(textContent, pageWidth) {
    const styles = textContent.styles || {};
    let serifCharacters = 0;
    let sansCharacters = 0;

    textContent.items.forEach(item => {
      const length = String(item.str || '').replace(/\s+/g, '').length;
      if (!length) return;
      const family = String(styles[item.fontName]?.fontFamily || item.fontName || '').toLowerCase();
      if (/sans|helvetica|arial|biolinum|roboto|segoe/.test(family)) sansCharacters += length;
      else if (/serif|times|charter|pagella|palatino|georgia|roman|book/.test(family)) serifCharacters += length;
    });

    const lineGroups = new Map();
    textContent.items.forEach(item => {
      const text = String(item.str || '').trim();
      const x = Number(item.transform?.[4]);
      const y = Number(item.transform?.[5]);
      const width = Number(item.width);
      if (!text || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || width <= 0) return;
      const lineKey = Math.round(y / 2) * 2;
      if (!lineGroups.has(lineKey)) lineGroups.set(lineKey, []);
      lineGroups.get(lineKey).push({ x, end: x + width, characters: text.length });
    });

    let substantialLines = 0;
    let splitLines = 0;
    const mergeGap = pageWidth * 0.025;
    lineGroups.forEach(items => {
      const sorted = items.sort((a, b) => a.x - b.x);
      const merged = [];
      sorted.forEach(item => {
        const previous = merged[merged.length - 1];
        if (previous && item.x - previous.end <= mergeGap) {
          previous.end = Math.max(previous.end, item.end);
          previous.characters += item.characters;
        } else {
          merged.push({ ...item });
        }
      });

      const totalCharacters = merged.reduce((sum, segment) => sum + segment.characters, 0);
      if (totalCharacters < 20) return;
      substantialLines += 1;
      const leftSegment = merged.find(segment => segment.x < pageWidth * 0.18 && segment.characters >= 10);
      const rightSegment = merged.find(segment => segment.x > pageWidth * 0.46 && segment.characters >= 10);
      if (leftSegment && rightSegment && leftSegment.end < rightSegment.x) splitLines += 1;
    });

    // Require repeated, side-by-side text lines across a real center gutter.
    // Author/affiliation rows can have balanced text on both halves of the page,
    // but they are metadata and must not make a one-column abstract look two-column.
    const isTwoColumn = substantialLines >= 8
      && splitLines >= 4
      && splitLines / substantialLines >= 0.16;

    return {
      serifCharacters,
      sansCharacters,
      columnCount: isTwoColumn ? 2 : 1,
      splitLineRatio: substantialLines ? splitLines / substantialLines : 0
    };
  }

  extractSourceTextItems(textContent, viewport) {
    const pageWidth = Number(viewport?.width) || 1;
    const pageHeight = Number(viewport?.height) || 1;
    return textContent.items
      .map(item => {
        const text = String(item.str || '').replace(/\s+/g, ' ').trim();
        const transform = item.transform || [];
        const a = Number(transform[0]) || 0;
        const b = Number(transform[1]) || 0;
        const x = Number(transform[4]);
        const baselineY = Number(transform[5]);
        const width = Number(item.width);
        const height = Number(item.height) || Math.hypot(Number(transform[2]) || 0, Number(transform[3]) || 0);
        if (!text || !Number.isFinite(x) || !Number.isFinite(baselineY) || !Number.isFinite(width) || width <= 0) return null;
        const safeHeight = Number.isFinite(height) && height > 0 ? height : 8;

        // Detect vertical / sideways text in PDF (e.g. rotated 90° CCW or 90° CW tables/figures)
        const isVertical = Math.abs(b) > Math.abs(a) * 1.35;
        let ymin;
        let xmin;
        let ymax;
        let xmax;
        let rotation = 0;

        if (isVertical && b > 0) {
          // Rotated 90° CCW on page (reads bottom-to-top) -> needs +90° CW rotation to be upright
          rotation = 90;
          ymin = Math.max(0, Math.min(1000, ((pageHeight - (baselineY + width)) / pageHeight) * 1000));
          ymax = Math.max(0, Math.min(1000, ((pageHeight - baselineY) / pageHeight) * 1000));
          xmin = Math.max(0, Math.min(1000, ((x - safeHeight) / pageWidth) * 1000));
          xmax = Math.max(0, Math.min(1000, ((x + safeHeight * 0.4) / pageWidth) * 1000));
        } else if (isVertical && b < 0) {
          // Rotated 90° CW on page (reads top-to-bottom) -> needs 270° CW (-90°) rotation to be upright
          rotation = 270;
          ymin = Math.max(0, Math.min(1000, ((pageHeight - baselineY) / pageHeight) * 1000));
          ymax = Math.max(0, Math.min(1000, ((pageHeight - (baselineY - width)) / pageHeight) * 1000));
          xmin = Math.max(0, Math.min(1000, ((x - safeHeight * 0.4) / pageWidth) * 1000));
          xmax = Math.max(0, Math.min(1000, ((x + safeHeight) / pageWidth) * 1000));
        } else {
          ymin = Math.max(0, Math.min(1000, ((pageHeight - baselineY - safeHeight) / pageHeight) * 1000));
          xmin = Math.max(0, Math.min(1000, (x / pageWidth) * 1000));
          ymax = Math.max(0, Math.min(1000, ((pageHeight - baselineY) / pageHeight) * 1000));
          xmax = Math.max(0, Math.min(1000, ((x + width) / pageWidth) * 1000));
        }

        return {
          text,
          bbox: [Math.min(ymin, ymax), Math.min(xmin, xmax), Math.max(ymin, ymax), Math.max(xmin, xmax)],
          rotation,
          hasEOL: Boolean(item.hasEOL)
        };
      })
      .filter(Boolean);
  }

  resolveFigureCropAndRotation(pageNum, rawBbox, explicitRotate = 0) {
    if (!Array.isArray(rawBbox) || rawBbox.length !== 4) {
      return { bbox: rawBbox, rotation: explicitRotate || 0, autoRotated: false };
    }
    const profile = this.getSourcePageProfile(pageNum);
    const items = Array.isArray(profile?.textItems) ? profile.textItems : [];
    if (items.length === 0) {
      return { bbox: rawBbox, rotation: explicitRotate || 0, autoRotated: false };
    }

    const [rawYMin, rawXMin, rawYMax, rawXMax] = rawBbox;
    const overlapsBbox = item => {
      const [iy0, ix0, iy1, ix1] = item.bbox;
      const cy = (iy0 + iy1) / 2;
      const cx = (ix0 + ix1) / 2;
      return cy >= rawYMin - 45 && cy <= rawYMax + 45 && cx >= rawXMin - 45 && cx <= rawXMax + 45;
    };

    const inBoxItems = items.filter(overlapsBbox);
    let rotatedCluster = inBoxItems.filter(item => item.rotation === 90 || item.rotation === 270);
    let rotatedChars = rotatedCluster.reduce((sum, item) => sum + item.text.length, 0);

    // CRITICAL FIX: Always expand rotatedCluster across the full vertical span of the same X-band on this page!
    // Even if rawBbox only covered half of a sideways table (e.g. y=410..890 instead of y=60..890),
    // expanding to all rotated items in the same X-band guarantees the upper/right columns are never cut off.
    const allPageRotated = items.filter(item => item.rotation === 90 || item.rotation === 270);
    const allPageRotatedChars = allPageRotated.reduce((sum, item) => sum + item.text.length, 0);
    if (allPageRotatedChars >= 40 && (rotatedChars >= 10 || explicitRotate === 90 || explicitRotate === 270)) {
      const seedItems = rotatedCluster.length > 0 ? rotatedCluster : allPageRotated;
      const seedXMin = Math.min(...seedItems.map(i => i.bbox[1]));
      const seedXMax = Math.max(...seedItems.map(i => i.bbox[3]));
      const bandRotated = allPageRotated.filter(i => (
        i.bbox[3] >= seedXMin - 180 && i.bbox[1] <= seedXMax + 180
      ));
      if (bandRotated.length >= rotatedCluster.length) {
        rotatedCluster = bandRotated;
        rotatedChars = rotatedCluster.reduce((sum, item) => sum + item.text.length, 0);
      }
    }

    if (rotatedCluster.length >= 3 && rotatedChars >= 25) {
      const rotYMin = Math.min(...rotatedCluster.map(i => i.bbox[0]));
      const rotXMin = Math.min(...rotatedCluster.map(i => i.bbox[1]));
      const rotYMax = Math.max(...rotatedCluster.map(i => i.bbox[2]));
      const rotXMax = Math.max(...rotatedCluster.map(i => i.bbox[3]));

      // Exclude normal horizontal body-text columns to the left or right of the sideways figure/table
      const horizontalProse = items.filter(i => i.rotation === 0 && i.text.length >= 16);
      const rightColumnProse = horizontalProse.filter(i => (
        i.bbox[1] >= rotXMax - 6
        && i.bbox[2] >= rotYMin - 20
        && i.bbox[0] <= rotYMax + 20
      ));
      const leftColumnProse = horizontalProse.filter(i => (
        i.bbox[3] <= rotXMin + 6
        && i.bbox[2] >= rotYMin - 20
        && i.bbox[0] <= rotYMax + 20
      ));
      // Only consider horizontal prose above/below if it is clearly outside [rotYMin, rotYMax]
      const topProse = horizontalProse.filter(i => (
        i.bbox[2] <= rotYMin - 2
        && i.bbox[3] >= rotXMin
        && i.bbox[1] <= rotXMax
        && !/^(table|figure|bảng|hình)\b/i.test(i.text)
      ));
      const bottomProse = horizontalProse.filter(i => (
        i.bbox[0] >= rotYMax + 2
        && i.bbox[3] >= rotXMin
        && i.bbox[1] <= rotXMax
        && !/^(table|figure|bảng|hình|note|this table)\b/i.test(i.text)
      ));

      let refinedXMin = Math.max(0, rotXMin - 24);
      let refinedXMax = Math.min(1000, rotXMax + 24);
      let refinedYMin = Math.max(0, rotYMin - 22);
      let refinedYMax = Math.min(1000, rotYMax + 22);

      if (rightColumnProse.length > 0) {
        const minRightX = Math.min(...rightColumnProse.map(i => i.bbox[1]));
        refinedXMax = Math.min(refinedXMax, Math.max(rotXMax + 10, minRightX - 10));
      }
      if (leftColumnProse.length > 0) {
        const maxLeftX = Math.max(...leftColumnProse.map(i => i.bbox[3]));
        refinedXMin = Math.max(refinedXMin, Math.min(rotXMin - 10, maxLeftX + 10));
      }
      if (topProse.length > 0) {
        const maxTopY = Math.max(...topProse.map(i => i.bbox[2]));
        refinedYMin = Math.max(refinedYMin, Math.min(rotYMin - 10, maxTopY + 6));
      }
      if (bottomProse.length > 0) {
        const minBottomY = Math.min(...bottomProse.map(i => i.bbox[0]));
        refinedYMax = Math.min(refinedYMax, Math.max(rotYMax + 10, minBottomY - 6));
      }

      // Never allow refinedYMin/refinedYMax/refinedXMin/refinedXMax to clip inside rotCluster bounds
      refinedYMin = Math.min(refinedYMin, Math.max(0, rotYMin - 10));
      refinedYMax = Math.max(refinedYMax, Math.min(1000, rotYMax + 10));
      refinedXMin = Math.min(refinedXMin, Math.max(0, rotXMin - 10));
      refinedXMax = Math.max(refinedXMax, Math.min(1000, rotXMax + 10));

      const chars90 = rotatedCluster
        .filter(i => i.rotation === 90)
        .reduce((sum, i) => sum + i.text.length, 0);
      const chars270 = rotatedCluster
        .filter(i => i.rotation === 270)
        .reduce((sum, i) => sum + i.text.length, 0);
      const autoRotation = chars90 >= chars270 ? 90 : 270;

      return {
        bbox: [
          Math.round(refinedYMin),
          Math.round(refinedXMin),
          Math.round(refinedYMax),
          Math.round(refinedXMax)
        ],
        rotation: explicitRotate || autoRotation,
        autoRotated: true
      };
    }

    return { bbox: rawBbox, rotation: explicitRotate || 0, autoRotated: false };
  }

  applySourceDocumentProfile() {
    const serifCharacters = this.sourcePageProfiles.reduce((sum, profile) => sum + (profile.serifCharacters || 0), 0);
    const sansCharacters = this.sourcePageProfiles.reduce((sum, profile) => sum + (profile.sansCharacters || 0), 0);
    const textHeavyPages = this.sourcePageProfiles.filter(profile => profile.characterCount >= 500);
    const twoColumnPages = textHeavyPages.filter(profile => profile.columnCount === 2).length;
    const sourceSample = this.sourcePageProfiles.map(profile => profile.text).join(' ');
    const academicSignals = [
      /\babstract\b/i,
      /\breferences\b/i,
      /\bdoi\s*:/i,
      /\bfigure\s+\d+/i,
      /\bet\s+al\.?\b/i
    ].filter(pattern => pattern.test(sourceSample)).length;
    const looksAcademic = (textHeavyPages.length > 0 && twoColumnPages / textHeavyPages.length >= 0.3)
      || academicSignals >= 2;
    const fontMetadataCharacters = serifCharacters + sansCharacters;
    this.sourceTypography = fontMetadataCharacters > 0
      ? serifCharacters >= sansCharacters ? 'serif' : 'sans'
      : looksAcademic ? 'serif' : 'sans';

    if (fontMetadataCharacters > 0) {
      const serifPercent = Math.round((serifCharacters / fontMetadataCharacters) * 100);
      const sansPercent = 100 - serifPercent;
      this.sourceTypographySummary = Math.abs(serifPercent - sansPercent) < 18
        ? `PDF dùng font hỗn hợp: có chân ${serifPercent}%, không chân ${sansPercent}%. Tự nhận diện theo nhóm chiếm ưu thế.`
        : `Bản gốc được nhận diện là ${this.getTypographyLabel(this.sourceTypography)} (có chân ${serifPercent}%, không chân ${sansPercent}%).`;
    } else {
      this.sourceTypographySummary = `PDF không cung cấp tên font để đọc; nhận diện ${this.getTypographyLabel(this.sourceTypography)} dựa trên đặc điểm tài liệu.`;
    }

    this.applyTranslationTypography();
  }

  getTypographyLabel(type) {
    return type === 'serif' ? 'có chân (serif)' : 'không chân (sans-serif)';
  }

  isValidCustomFontFamily(fontFamily) {
    return /^[\p{L}\p{N} _-]{1,64}$/u.test(String(fontFamily || '').trim());
  }

  resolveTranslationFont(preference = this.fontPreference) {
    if (preference === 'custom') {
      const fontFamily = String(this.customFontFamilyInput?.value ?? this.customFontFamily).trim();
      if (this.isValidCustomFontFamily(fontFamily)) {
        const type = this.sourceTypography || 'serif';
        const fallback = type === 'serif' ? 'serif' : 'sans-serif';
        return {
          label: fontFamily,
          type,
          css: `${JSON.stringify(fontFamily)}, ${fallback}`,
          docx: fontFamily
        };
      }
      preference = 'auto';
    }

    if (preference === 'auto') {
      const type = this.sourceTypography || 'serif';
      return TRANSLATION_FONT_PRESETS[type === 'serif' ? 'georgia' : 'inter'];
    }

    return TRANSLATION_FONT_PRESETS[preference] || TRANSLATION_FONT_PRESETS['georgia'];
  }

  resolveActiveTypographyRoles(unifiedPref = this.fontPreference) {
    if (this.typographyMode === 'split') {
      const heading = TRANSLATION_FONT_PRESETS[this.headingFont] || TRANSLATION_FONT_PRESETS.inter;
      const body = TRANSLATION_FONT_PRESETS[this.bodyFont] || TRANSLATION_FONT_PRESETS.georgia;
      const caption = TRANSLATION_FONT_PRESETS[this.captionFont] || TRANSLATION_FONT_PRESETS.georgia;
      return {
        mode: 'split',
        heading,
        body,
        caption,
        captionItalic: Boolean(this.captionItalic),
        summaryLabel: `Heading ${heading.label} + Body ${body.label}`
      };
    }
    const unified = this.resolveTranslationFont(unifiedPref);
    return {
      mode: 'unified',
      heading: unified,
      body: unified,
      caption: unified,
      captionItalic: Boolean(this.captionItalic),
      summaryLabel: `${unified.label} (Toàn bộ tài liệu)`
    };
  }

  resetTypographyToDefaults() {
    this.typographyMode = DEFAULT_TYPOGRAPHY_CONFIG.typographyMode;
    this.headingFont = DEFAULT_TYPOGRAPHY_CONFIG.headingFont;
    this.bodyFont = DEFAULT_TYPOGRAPHY_CONFIG.bodyFont;
    this.captionFont = DEFAULT_TYPOGRAPHY_CONFIG.captionFont;
    this.captionItalic = DEFAULT_TYPOGRAPHY_CONFIG.captionItalic;
    this.h1Size = DEFAULT_TYPOGRAPHY_CONFIG.h1Size;
    this.h2Size = DEFAULT_TYPOGRAPHY_CONFIG.h2Size;
    this.h3Size = DEFAULT_TYPOGRAPHY_CONFIG.h3Size;
    this.fontSize = DEFAULT_TYPOGRAPHY_CONFIG.bodySize;
    this.captionSize = DEFAULT_TYPOGRAPHY_CONFIG.captionSize;
    this.persistTypographySettings();
    this.syncTypographyInputsFromState();
    this.applyTranslationTypography();
    this.showToast('✨ Đã khôi phục bộ font khuyên dùng (Heading Inter + Body Georgia + Mô tả hình chữ nghiêng)!', 'success');
  }

  applyTranslationTypography(preference = this.fontPreference) {
    const roles = this.resolveActiveTypographyRoles(preference);
    this.documentTypography = roles.body.type;
    this.documentFontFamily = roles.body.css;

    const captionStyle = roles.captionItalic ? 'italic' : 'normal';
    const printH1Pt = +(14 * (this.h1Size / 26)).toFixed(2);
    const printH2Pt = +(11 * (this.h2Size / 20)).toFixed(2);
    const printH3Pt = +(9.8 * (this.h3Size / 17)).toFixed(2);
    const printBodyPt = +(9.2 * (this.fontSize / 16)).toFixed(2);
    const printCaptionPt = +(8.5 * (this.captionSize / 14)).toFixed(2);

    const targets = [document.documentElement, this.translatedContent].filter(Boolean);
    targets.forEach(el => {
      el.style.setProperty('--translation-font-family', roles.body.css);
      el.style.setProperty('--heading-font-family', roles.heading.css);
      el.style.setProperty('--body-font-family', roles.body.css);
      el.style.setProperty('--caption-font-family', roles.caption.css);
      el.style.setProperty('--caption-font-style', captionStyle);
      el.style.setProperty('--h1-font-size', `${this.h1Size}px`);
      el.style.setProperty('--h2-font-size', `${this.h2Size}px`);
      el.style.setProperty('--h3-font-size', `${this.h3Size}px`);
      el.style.setProperty('--reader-font-size', `${this.fontSize}px`);
      el.style.setProperty('--caption-font-size', `${this.captionSize}px`);
      el.style.setProperty('--print-h1-size', `${printH1Pt}pt`);
      el.style.setProperty('--print-h2-size', `${printH2Pt}pt`);
      el.style.setProperty('--print-h3-size', `${printH3Pt}pt`);
      el.style.setProperty('--print-body-size', `${printBodyPt}pt`);
      el.style.setProperty('--print-caption-size', `${printCaptionPt}pt`);
    });

    if (this.translatedContent) {
      this.translatedContent.classList.toggle('source-type-serif', roles.body.type === 'serif');
      this.translatedContent.classList.toggle('source-type-sans', roles.body.type === 'sans');
      this.translatedContent.dataset.sourceTypography = this.sourceTypography || 'pending';
      this.translatedContent.dataset.translationFont = roles.summaryLabel;
    }

    this.syncTypographyInputsFromState();

    if (this.fontDetectionStatus) {
      const sourceStatus = this.sourceTypographySummary
        || (this.currentFile ? 'Đang phân tích font trong PDF...' : 'Tải PDF lên để tự nhận diện kiểu chữ của bản gốc.');
      const selectionStatus = `Đang áp dụng: ${roles.summaryLabel}.`;
      this.fontDetectionStatus.textContent = `${sourceStatus} ${selectionStatus}`;
    }
  }

  updateCustomFontFamilyVisibility() {
    if (this.customFontFamilyRow) {
      this.customFontFamilyRow.style.display = this.pendingFontPreference === 'custom' ? 'flex' : 'none';
    }
  }

  async changeZoom(delta) {
    const newZoom = Math.round(Math.max(0.6, Math.min(2.2, this.zoomScale + delta)) * 100) / 100;
    if (newZoom !== this.zoomScale) {
      this.zoomScale = newZoom;
      localStorage.setItem('layouttrans_zoom_scale', String(this.zoomScale));
      this.pdfZoomLevel.textContent = `${Math.round(this.zoomScale * 100)}%`;
      if (this.pdfDoc) {
        await this.renderPdfPages();
      }
    }
  }

  changeFontSize(delta) {
    this.fontSize = Math.max(12, Math.min(28, this.fontSize + delta));
    localStorage.setItem('layouttrans_font_size', String(this.fontSize));
    if (this.bodySizeInput) this.bodySizeInput.value = String(this.fontSize);
    if (this.fontSizeDisplay) this.fontSizeDisplay.textContent = `${this.fontSize}px`;
    this.applyTranslationTypography();
    this.showToast(`Đã lưu cỡ chữ nội dung (Body): ${this.fontSize}px`, 'info');
  }

  // ==================== Gemini Translation Engine ====================

  async startTranslationProcess() {
    if (!this.apiKey) {
      this.openSettings();
      this.showToast('Vui lòng nhập Gemini API Key để tiếp tục!', 'warning');
      return;
    }

    if (!this.currentFile) {
      this.showToast('Vui lòng tải lên tài liệu PDF trước!', 'warning');
      return;
    }

    const runId = ++this.translationRunId;
    this.isTranslating = true;
    this.isPaused = false;
    this.startTranslateBtn.style.display = 'none';
    this.pauseTranslateBtn.style.display = 'inline-flex';
    this.pauseTranslateBtn.innerHTML = '<span>Tạm dừng</span>';
    this.pauseTranslateBtn.className = 'btn btn-warning';
    this.progressSection.style.display = 'flex';

    // Clear empty state in right pane if first time
    const emptyPlaceholder = this.translatedContent.querySelector('.empty-state-placeholder');
    if (emptyPlaceholder) {
      emptyPlaceholder.remove();
    }

    let queueStopReason = '';

    // Process chunks sequentially. Page-local QA failures are recorded and the queue continues.
    for (let i = 0; i < this.chunks.length; i++) {
      if (!this.isTranslationRunActive(runId)) return;
      if (this.isPaused) {
        this.progressText.textContent = `Đang tạm dừng tại phần ${i + 1}/${this.chunks.length}`;
        break;
      }

      const chunk = this.chunks[i];
      if (chunk.status === 'completed') continue;

      chunk.status = 'processing';
      chunk.translatedHtml = '';
      chunk.qa = null;
      chunk.error = null;
      chunk.failureKind = null;
      this.currentChunkIndex = i;
      this.updateProgressUI();

      try {
        await this.processChunkWithAutoRetry(chunk, runId);
        if (!this.isTranslationRunActive(runId)) return;
        chunk.status = 'completed';
        chunk.failureKind = null;
        this.updateProgressUI();
      } catch (err) {
        if (!this.isTranslationRunCurrent(runId)) return;
        if (err.name === 'AbortError' && (this.isPaused || !this.isTranslating)) {
          console.log('Quá trình dịch đã được tạm dừng bởi người dùng.');
          break;
        }
        console.error(`Lỗi dịch chunk ${chunk.id}:`, err);
        chunk.status = 'error';
        chunk.error = err.message;
        chunk.failureKind = err.code === 'BATCH_QA_FAILED'
          ? 'qa'
          : this.isTransientApiError(err)
            ? 'service'
            : 'config';
        this.updateProgressUI();
        if (this.isHighDemandError(err)) {
          this.showToast(`Google vẫn quá tải sau ${this.maxAutomaticAttempts} lần tự thử/đổi model. Các trang đã đạt vẫn được giữ nguyên.`, 'warning');
        } else {
          this.showToast(`Lỗi phần ${chunk.id} (Trang ${chunk.startPage}-${chunk.endPage}): ${err.message}`, 'error');
        }

        if (this.isHardQuotaError(err) || this.isQuotaError(err)) {
          queueStopReason = 'quota';
          this.showToast('Quota chưa thể hồi tự động. Tool giữ nguyên phần đã đạt và dừng để không phí request.', 'warning');
          break;
        }

        if (this.isFatalApiError(err)) {
          queueStopReason = 'config';
          this.showToast('API key, model hoặc quyền truy cập đang lỗi. Tool dừng hàng đợi để tránh gọi hỏng tiếp.', 'warning');
          break;
        }

        if (this.isTransientApiError(err)) {
          queueStopReason = 'connection';
          this.showToast('Mạng hoặc dịch vụ vẫn lỗi sau các lần tự thử. Tool dừng để tránh đốt thêm request.', 'warning');
          break;
        }
      }
    }

    if (!this.isTranslationRunCurrent(runId)) return;
    if (this.isPaused) return;

    this.isTranslating = false;
    this.currentAbortController = null;
    this.startTranslateBtn.style.display = 'inline-flex';
    this.pauseTranslateBtn.style.display = 'none';

    const incompletePages = this.getIncompletePageNumbers();
    if (incompletePages.length === 0) {
      this.startBtnLabel.textContent = 'Đã dịch & kiểm tra';
      this.showToast(`Đã dịch và xác minh đủ ${this.totalPages}/${this.totalPages} trang.`, 'success');
      return;
    }

    const incompleteCount = incompletePages.length;
    this.startBtnLabel.textContent = queueStopReason === 'quota'
      ? `Thử lại ${incompleteCount} trang khi quota hồi`
      : queueStopReason
        ? `Thử lại ${incompleteCount} trang chưa xong`
        : `Thử lại ${incompleteCount} trang lỗi`;
    this.progressText.textContent = queueStopReason === 'quota'
      ? `Quota chưa hồi • giữ nguyên ${this.totalPages - incompleteCount}/${this.totalPages} trang đã đạt QA`
      : queueStopReason
        ? `Hàng đợi đã dừng an toàn • còn ${incompleteCount} trang chưa xong`
        : `Đã chạy hết hàng đợi • còn ${incompleteCount} trang chưa đạt QA`;
    if (!queueStopReason) {
      this.showToast(`Đã chạy xuyên suốt. Còn ${incompleteCount} trang lỗi; nút thử lại chỉ chạy các phần chưa đạt.`, 'warning');
    }
  }

  isTranslationRunCurrent(runId) {
    return runId === this.translationRunId;
  }

  isTranslationRunActive(runId) {
    return this.isTranslationRunCurrent(runId) && this.isTranslating && !this.isPaused;
  }

  async processChunkWithAutoRetry(chunk, runId) {
    return this.processChunkWithGemini(chunk, runId);
  }

  async requestGeminiTranslationWithAutoRetry(chunk, mode, sourceText, onText, pageNumbers, runId, qaFeedback = []) {
    let lastError = null;
    let requestModel = this.selectedModel;
    const attemptedModels = new Set();

    for (let attempt = 1; attempt <= this.maxAutomaticAttempts; attempt++) {
      try {
        chunk.attempt = attempt;
        chunk.activeModel = requestModel;
        attemptedModels.add(requestModel);
        const result = await this.requestGeminiTranslation(chunk, mode, sourceText, onText, pageNumbers, requestModel, qaFeedback);
        result.model = requestModel;
        return result;
      } catch (error) {
        lastError = error;
        error.requestModel = error.requestModel || requestModel;
        if (!this.isTranslationRunActive(runId)) {
          const abortError = new Error('Hàng đợi dịch cũ đã được thay thế.');
          abortError.name = 'AbortError';
          throw abortError;
        }
        if (error.name === 'AbortError') throw error;

        // Automatic recovery when a model is deprecated/unavailable (HTTP 404 or "no longer available to new users")
        if (this.isModelNotFoundError(error)) {
          const replacementModel = await this.resolveReplacementModelForNotFound(error, requestModel, attemptedModels);
          if (replacementModel && replacementModel !== requestModel) {
            const oldLabel = this.getModelDisplayName(requestModel);
            const newLabel = this.getModelDisplayName(replacementModel);
            this.applyActiveModelSelection(replacementModel);
            requestModel = replacementModel;
            this.showToast(`Model ${oldLabel} đã ngừng hỗ trợ cho Key này — Đã tự động chuyển sang ${newLabel} và tiếp tục dịch!`, 'info');
            attempt = Math.max(0, attempt - 1);
            continue;
          }
        }

        const canRetry = attempt < this.maxAutomaticAttempts
          && !this.isHardQuotaError(error)
          && this.isTransientApiError(error);
        if (!canRetry) throw error;

        const fallbackModel = this.isHighDemandError(error)
          ? this.getHighDemandFallbackModel(requestModel, attemptedModels)
          : null;
        const nextModel = fallbackModel || requestModel;
        const retryDelayMs = this.getAutomaticRetryDelayMs(error, attempt, Boolean(fallbackModel));
        await this.waitForAutomaticRetry(retryDelayMs, chunk, attempt + 1, runId, error, nextModel);
        requestModel = nextModel;
      }
    }

    throw lastError || new Error('Không thể hoàn tất batch sau các lần tự thử.');
  }

  isModelNotFoundError(error) {
    if (error?.httpStatus === 404) return true;
    return /no longer available|model .*not found|not supported for generatecontent|update your code to use models\//i.test(
      `${error?.code || ''} ${error?.message || ''}`
    );
  }

  applyActiveModelSelection(modelName) {
    if (!modelName) return;
    this.selectedModel = modelName;
    localStorage.setItem('layouttrans_model', modelName);
    localStorage.setItem('layouttrans_selected_model', modelName);
    if (this.modelSelector) {
      const exists = Array.from(this.modelSelector.options).some(opt => opt.value === modelName);
      if (!exists) {
        const opt = document.createElement('option');
        opt.value = modelName;
        opt.textContent = `🚀 ${this.getModelDisplayName(modelName)}`;
        this.modelSelector.prepend(opt);
      }
      this.modelSelector.value = modelName;
    }
  }

  async resolveReplacementModelForNotFound(error, currentModel, attemptedModels = new Set()) {
    const msg = String(error?.message || '');
    // 1. Check if Google API error explicitly tells us which model to use (e.g. "Please update your code to use models/gemini-3.8-flash")
    const suggestedMatch = msg.match(/models\/([a-zA-Z0-9._-]+)/);
    if (suggestedMatch && suggestedMatch[1]) {
      const suggested = suggestedMatch[1].trim();
      if (suggested && suggested !== currentModel && !attemptedModels.has(suggested)) {
        return suggested;
      }
    }

    // 2. Query /v1beta/models to discover exact models supported by this API key
    if (!this.availableModelNames && this.apiKey) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(this.apiKey)}`);
        if (res.ok) {
          const data = await res.json();
          const supported = (data.models || [])
            .filter(m => !Array.isArray(m.supportedGenerationMethods) || m.supportedGenerationMethods.includes('generateContent'))
            .map(m => String(m.name || '').replace(/^models\//, ''))
            .filter(Boolean);
          if (supported.length > 0) {
            this.availableModelNames = new Set(supported);
          }
        }
      } catch (e) {
        console.warn('Không thể tải danh sách model dự phòng:', e);
      }
    }

    const candidateOrder = [
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-pro-latest',
      'gemini-3.1-flash-lite',
      ...(this.availableModelNames ? [...this.availableModelNames].filter(m => /gemini.*flash/i.test(m)) : []),
      ...(this.availableModelNames ? [...this.availableModelNames].filter(m => /gemini.*pro/i.test(m)) : [])
    ];

    for (const candidate of candidateOrder) {
      if (
        candidate !== currentModel
        && !attemptedModels.has(candidate)
        && (!this.availableModelNames || this.availableModelNames.has(candidate))
      ) {
        return candidate;
      }
    }
    return null;
  }

  isQuotaError(error) {
    return error?.httpStatus === 429
      || error?.code === 'RESOURCE_EXHAUSTED'
      || /\b429\b|resource_exhausted|quota|rate limit|too many requests/i.test(error?.message || '');
  }

  isHardQuotaError(error) {
    if (!this.isQuotaError(error)) return false;
    return /per[_ -]?day|daily|mỗi ngày|hàng ngày|billing|payment|required plan|limit(?: is)? 0/i.test(error?.message || '');
  }

  isFatalApiError(error) {
    if ([400, 401, 402, 403, 404].includes(error?.httpStatus)) return true;
    return /invalid_argument|unauthenticated|payment_required|permission_denied|not_found|api key not valid|model .*not found/i.test(`${error?.code || ''} ${error?.message || ''}`);
  }

  isHighDemandError(error) {
    return error?.httpStatus === 503
      || error?.code === 'UNAVAILABLE'
      || /high demand|service unavailable|temporarily overloaded|currently at capacity/i.test(error?.message || '');
  }

  getHighDemandFallbackModel(currentModel, attemptedModels = new Set()) {
    return this.highDemandFallbackModels.find(model => (
      model !== currentModel
      && !attemptedModels.has(model)
      && (!this.availableModelNames || this.availableModelNames.has(model))
    )) || null;
  }

  getModelDisplayName(model) {
    const names = {
      'gemini-flash-latest': 'Gemini Flash Latest',
      'gemini-3.8-flash': 'Gemini 3.8 Flash',
      'gemini-pro-latest': 'Gemini Pro Latest',
      'gemini-3.1-flash-lite': 'Gemini 3.1 Flash-Lite',
      'gemini-2.5-flash': 'Gemini 2.5 Flash',
      'gemini-2.5-pro': 'Gemini 2.5 Pro',
      'gemini-2.5-flash-lite': 'Gemini 2.5 Flash-Lite'
    };
    return names[model] || model;
  }

  isTransientApiError(error) {
    if (!error || error.code === 'BATCH_QA_FAILED') return false;
    if (this.isFatalApiError(error) || this.isHardQuotaError(error)) return false;
    if (this.isQuotaError(error)) return true;
    if ([408, 409, 425, 500, 502, 503, 504].includes(error.httpStatus)) return true;
    if (error.code === 'REQUEST_TIMEOUT') return true;
    if (error.name === 'TypeError' && /failed to fetch|networkerror|network request failed|load failed/i.test(error.message || '')) return true;
    return /network|fetch|timeout|timed out|temporar|overload|unavailable|connection reset|internal error/i.test(error.message || '');
  }

  getAutomaticRetryDelayMs(error, failedAttempt, switchingModel = false) {
    if (Number.isFinite(error?.retryAfterMs) && error.retryAfterMs > 0) {
      return Math.max(3000, error.retryAfterMs);
    }

    const jitterMs = Math.floor(Math.random() * 3000);
    if (this.isHighDemandError(error)) {
      if (switchingModel) return 3000 + jitterMs;
      const delays = [8000, 20000, 45000, 90000];
      return delays[Math.min(failedAttempt - 1, delays.length - 1)] + jitterMs;
    }

    if (this.isQuotaError(error)) {
      const delays = [15000, 45000, 90000, 120000];
      return delays[Math.min(failedAttempt - 1, delays.length - 1)] + jitterMs;
    }

    const delays = [5000, 15000, 30000, 60000];
    return delays[Math.min(failedAttempt - 1, delays.length - 1)] + jitterMs;
  }

  async waitForAutomaticRetry(delayMs, chunk, nextAttempt, runId, error, nextModel) {
    const deadline = Date.now() + delayMs;
    while (Date.now() < deadline) {
      if (!this.isTranslationRunActive(runId)) {
        const abortError = new Error('Đã dừng trong thời gian chờ retry.');
        abortError.name = 'AbortError';
        throw abortError;
      }

      const remainingSeconds = Math.max(1, Math.ceil((deadline - Date.now()) / 1000));
      const modelLabel = this.getModelDisplayName(nextModel);
      const reason = this.isHighDemandError(error)
        ? `Google đang quá tải • tự chuyển/thử ${modelLabel}`
        : `Kết nối tạm lỗi • tự thử lại bằng ${modelLabel}`;
      this.progressText.textContent = `Trang ${chunk.startPage}–${chunk.endPage}: ${reason} sau ${remainingSeconds}s (lần ${nextAttempt}/${this.maxAutomaticAttempts})`;
      await new Promise(resolve => setTimeout(resolve, Math.min(1000, Math.max(0, deadline - Date.now()))));
    }
  }

  getIncompletePageNumbers() {
    return this.chunks.flatMap(chunk => {
      const resultMap = new Map((chunk.pageResults || []).map(pageResult => [pageResult.pageNum, pageResult]));
      return this.getChunkPageNumbers(chunk).filter(pageNum => !resultMap.get(pageNum)?.qa?.passed);
    });
  }

  togglePauseTranslation() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.translationRunId += 1;
      if (this.currentAbortController) {
        try { this.currentAbortController.abort(); } catch (e) {}
      }
      this.pauseTranslateBtn.innerHTML = '<span>Tiếp tục</span>';
      this.pauseTranslateBtn.className = 'btn btn-primary';
      this.showToast('Đã tạm dừng quá trình dịch', 'info');
    } else {
      this.pauseTranslateBtn.innerHTML = '<span>Tạm dừng</span>';
      this.pauseTranslateBtn.className = 'btn btn-warning';
      this.showToast('Đang tiếp tục dịch...', 'info');
      this.startTranslationProcess();
    }
  }

  async processChunkWithGemini(chunk, runId) {
    const startTime = Date.now();
    let chunkTimerInterval = null;
    const allPageNumbers = this.getChunkPageNumbers(chunk);
    const pageResultMap = new Map((chunk.pageResults || [])
      .filter(pageResult => pageResult?.qa?.passed)
      .map(pageResult => [pageResult.pageNum, pageResult]));
    const pageNumbers = allPageNumbers.filter(pageNum => !pageResultMap.has(pageNum));
    if (pageNumbers.length === 0) {
      chunk.pageResults = allPageNumbers.map(pageNum => pageResultMap.get(pageNum));
      chunk.translatedHtml = this.renderBatchPageSections(chunk.pageResults);
      chunk.qa = { passed: true, code: 'PASS', pageCount: chunk.pageResults.length };
      this.renderChunkOutput(chunk);
      return;
    }
    const pageLabel = pageNumbers.length === 1
      ? `trang ${pageNumbers[0]}`
      : `trang ${pageNumbers.join(', ')}`;
    let chunkBlock = document.getElementById(`chunk-block-${chunk.id}`);
    if (!chunkBlock) {
      chunkBlock = document.createElement('article');
      chunkBlock.className = 'book-chunk-block active-streaming';
      chunkBlock.id = `chunk-block-${chunk.id}`;
      this.translatedContent.appendChild(chunkBlock);
    } else {
      chunkBlock.className = 'book-chunk-block active-streaming';
    }

    chunkBlock.innerHTML = `
      <div class="chunk-header-pill streaming" id="chunk-pill-${chunk.id}">
        <svg class="spin-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
        <span>Đang dịch ${pageLabel}</span>
        <span class="chunk-timer-badge" id="chunk-timer-${chunk.id}">0s</span>
      </div>
      <div class="chunk-inner-content streaming-cursor" id="chunk-content-${chunk.id}">
        <div class="streaming-placeholder">
          <svg class="spin-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
          Đang nạp trang & kết nối với Google AI Studio...
        </div>
      </div>
    `;
    chunkBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const timerEl = document.getElementById(`chunk-timer-${chunk.id}`);
    const contentEl = document.getElementById(`chunk-content-${chunk.id}`);
    const pillEl = document.getElementById(`chunk-pill-${chunk.id}`);

    chunkTimerInterval = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      if (timerEl) timerEl.textContent = `${elapsed}s`;
    }, 1000);

    try {
      this.progressText.textContent = `Đang dịch và tách QA ${pageLabel}...`;
      const sourceText = this.getPagesSourceText(pageNumbers);
      const renderLiveHtml = accumulatedText => {
        if (!this.isTranslationRunActive(runId)) return;
        const cleaned = this.cleanModelHtml(accumulatedText);
        contentEl.innerHTML = this.sanitizeGeneratedHtml(cleaned, chunk.startPage);
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        this.progressText.textContent = `Đang nhận ${pageLabel} [${elapsed}s] • ~${Math.round(accumulatedText.length / 5)} từ`;
      };

      const hasPreviousPasses = pageResultMap.size > 0;
      const requestMode = hasPreviousPasses ? 'text' : 'pdf';
      const requestChunk = hasPreviousPasses
        ? { startPage: Math.min(...pageNumbers), endPage: Math.max(...pageNumbers) }
        : chunk;
      let result = await this.requestGeminiTranslationWithAutoRetry(
        requestChunk,
        requestMode,
        sourceText,
        renderLiveHtml,
        pageNumbers,
        runId
      );
      if (!this.isTranslationRunActive(runId)) {
        const abortError = new Error('Hàng đợi dịch cũ đã được thay thế.');
        abortError.name = 'AbortError';
        throw abortError;
      }
      let evaluation = this.evaluateBatchTranslation(pageNumbers, result.text, result.finishReason);
      evaluation.pageResults.forEach(pageResult => pageResultMap.set(pageResult.pageNum, pageResult));
      let failedResults = pageNumbers
        .map(pageNum => pageResultMap.get(pageNum))
        .filter(pageResult => !pageResult?.qa?.passed);

      if (failedResults.length > 0) {
        // A provider refusal is not a repairable layout/content defect. Repeating
        // the same refused page spends another request without creating a translation.
        const retryableResults = failedResults.filter(pageResult => pageResult.qa.code !== 'REFUSAL_OR_SUMMARY');
        if (retryableResults.length > 0) {
          const retryPages = retryableResults.map(pageResult => pageResult.pageNum);
          const retryLabel = retryPages.join(', ');
          this.progressText.textContent = `Các trang ${retryLabel} chưa đạt QA. Đang retry chung bằng text layer...`;
          contentEl.innerHTML = `<div class="streaming-placeholder">Đang sửa riêng ${retryPages.length} trang lỗi trong một request...</div>`;
          const qaFeedback = retryableResults.map(pageResult => ({
            pageNum: pageResult.pageNum,
            code: pageResult.qa.code,
            message: pageResult.qa.message
          }));
          result = await this.requestGeminiTranslationWithAutoRetry(
            { startPage: Math.min(...retryPages), endPage: Math.max(...retryPages) },
            'text',
            this.getPagesSourceText(retryPages),
            renderLiveHtml,
            retryPages,
            runId,
            qaFeedback
          );
          if (!this.isTranslationRunActive(runId)) {
            const abortError = new Error('Hàng đợi dịch cũ đã được thay thế.');
            abortError.name = 'AbortError';
            throw abortError;
          }
          evaluation = this.evaluateBatchTranslation(retryPages, result.text, result.finishReason);
          evaluation.pageResults.forEach(pageResult => pageResultMap.set(pageResult.pageNum, pageResult));
          failedResults = pageNumbers
            .map(pageNum => pageResultMap.get(pageNum))
            .filter(pageResult => !pageResult?.qa?.passed);
        }
      }

      chunk.pageResults = allPageNumbers
        .map(pageNum => pageResultMap.get(pageNum))
        .filter(Boolean);
      chunk.pageResults.forEach(pageResult => {
        if (pageResult?.qa?.passed) this.saveCachedPageResult(pageResult);
      });
      if (failedResults.length > 0) {
        const details = failedResults
          .map(pageResult => pageResult.qa.message)
          .join('; ');
        const failedPageLabel = `Trang ${failedResults.map(pageResult => pageResult.pageNum).join(', ')}`;
        const refusalNote = failedResults.some(pageResult => pageResult.qa.code === 'REFUSAL_OR_SUMMARY')
          ? ' Không gửi lại tự động để tránh tốn request.'
          : '';
        const validationError = new Error(`${failedPageLabel} chưa đạt QA: ${details}.${refusalNote}`);
        validationError.code = 'BATCH_QA_FAILED';
        throw validationError;
      }

      const finalText = this.renderBatchPageSections(allPageNumbers.map(pageNum => pageResultMap.get(pageNum)));
      chunk.translatedHtml = finalText;
      chunk.qa = {
        passed: true,
        code: 'PASS',
        pageCount: chunk.pageResults.length,
        averageLengthRatio: chunk.pageResults.reduce((sum, pageResult) => sum + pageResult.qa.lengthRatio, 0) / chunk.pageResults.length
      };
      chunk.error = null;
      chunk.failureKind = null;
      clearInterval(chunkTimerInterval);
      const totalElapsed = Math.round((Date.now() - startTime) / 1000);
      chunkBlock.className = 'book-chunk-block';
      chunkBlock.dataset.sourcePage = String(chunk.startPage);
      contentEl.classList.remove('streaming-cursor');
      contentEl.innerHTML = finalText;

      pillEl.className = 'chunk-header-pill';
      pillEl.innerHTML = `
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        <span>${pageLabel.charAt(0).toUpperCase() + pageLabel.slice(1)}</span>
        <span class="chunk-qa-badge">QA đạt ${chunk.pageResults.length}/${chunk.pageResults.length} trang</span>
        <span class="chunk-timer-badge" style="color:var(--success)">${totalElapsed}s</span>
      `;

      this.bindChunkInteractiveActions(chunkBlock, chunk);

      if (window.renderMathInElement) {
        renderMathInElement(chunkBlock, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
      }

      this.attachOriginalFigures(chunkBlock);
    } catch (err) {
      if (chunkTimerInterval) clearInterval(chunkTimerInterval);
      if (!this.isTranslationRunCurrent(runId)) throw err;
      if (contentEl) contentEl.classList.remove('streaming-cursor');
      if (chunkBlock) {
        chunkBlock.classList.remove('active-streaming');
        chunkBlock.classList.add('chunk-error');
      }
      if (pillEl) {
        pillEl.className = 'chunk-header-pill error';
        const failedPageNumbers = (chunk.pageResults || [])
          .filter(pageResult => pageResult?.qa && !pageResult.qa.passed)
          .map(pageResult => pageResult.pageNum);
        const failedPageLabel = failedPageNumbers.length > 0
          ? `trang ${failedPageNumbers.join(', ')}`
          : pageLabel;
        const failureLabel = err.code === 'BATCH_QA_FAILED'
          ? `${failedPageLabel.charAt(0).toUpperCase() + failedPageLabel.slice(1)} chưa đạt QA nội dung`
          : this.isTransientApiError(err)
            ? `${pageLabel.charAt(0).toUpperCase() + pageLabel.slice(1)} chưa dịch xong — dịch vụ tạm lỗi`
            : `${pageLabel.charAt(0).toUpperCase() + pageLabel.slice(1)} chưa dịch xong`;
        pillEl.innerHTML = `<span>${failureLabel}</span>`;
      }
      if (contentEl) {
        const isQaFailure = err.code === 'BATCH_QA_FAILED';
        const heading = isQaFailure
          ? 'Kết quả dịch chưa vượt qua QA nên chưa được lưu.'
          : this.isHighDemandError(err)
            ? 'Google đang quá tải; chưa có bản dịch để kiểm định QA.'
            : 'Yêu cầu chưa tạo được bản dịch hoàn chỉnh.';
        contentEl.innerHTML = `
          <div class="chunk-error-message">
            <strong></strong>
            <span></span>
            <div style="margin-top:8px;">
              <button type="button" class="btn btn-xs btn-primary chunk-retry-btn">🔄 Dịch lại phần này (Trang ${chunk.startPage}–${chunk.endPage})</button>
            </div>
          </div>
        `;
        const headingEl = contentEl.querySelector('.chunk-error-message strong');
        if (headingEl) headingEl.textContent = heading;
        const detail = contentEl.querySelector('.chunk-error-message span');
        if (detail) detail.textContent = err.message;
        const retryBtn = contentEl.querySelector('.chunk-retry-btn');
        if (retryBtn) {
          retryBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.retrySingleChunk(chunk);
          });
        }
      }
      throw err;
    }
  }

  bindChunkInteractiveActions(chunkBlock, chunk) {
    if (!chunkBlock) return;
    if (!chunkBlock.dataset.jumpBound) {
      chunkBlock.dataset.jumpBound = 'true';
      chunkBlock.addEventListener('click', (e) => {
        if (window.getSelection()?.toString().length > 0) return;
        if (e.target.closest('button, a, input, select, .figure-image-slot')) return;
        const sectionEl = e.target.closest('section.source-page[data-source-page]');
        const pageNum = parseInt(sectionEl?.dataset.sourcePage || String(chunk.startPage), 10);
        this.jumpToPdfPage(pageNum);
      });
    }

    chunkBlock.querySelectorAll('.page-jump-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pageNum = parseInt(btn.dataset.page || String(chunk.startPage), 10);
        this.jumpToPdfPage(pageNum);
      });
    });

    chunkBlock.querySelectorAll('.page-retranslate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pageNum = parseInt(btn.dataset.page || '', 10);
        if (Number.isInteger(pageNum)) {
          this.retranslateSinglePage(pageNum);
        }
      });
    });
  }

  async retrySingleChunk(chunk) {
    if (!this.apiKey) {
      this.openSettings();
      this.showToast('Vui lòng nhập Gemini API Key để dịch!', 'warning');
      return;
    }
    if (this.isTranslating) {
      this.showToast('Đang có tiến trình dịch chạy, vui lòng đợi hoặc bấm Tạm dừng trước.', 'warning');
      return;
    }
    const runId = ++this.translationRunId;
    this.isTranslating = true;
    this.isPaused = false;
    this.progressSection.style.display = 'flex';
    try {
      await this.processChunkWithGemini(chunk, runId);
      chunk.status = 'completed';
      chunk.failureKind = null;
      this.updateProgressUI();
      this.showToast(`✅ Đã dịch xong Trang ${chunk.startPage}–${chunk.endPage}!`, 'success');
    } catch (err) {
      chunk.status = 'error';
      chunk.error = err.message;
      this.updateProgressUI();
      this.showToast(`Lỗi dịch lại Trang ${chunk.startPage}–${chunk.endPage}: ${err.message}`, 'error');
    } finally {
      this.isTranslating = false;
    }
  }

  async retranslateSinglePage(pageNum) {
    if (!this.apiKey) {
      this.openSettings();
      this.showToast('Vui lòng nhập Gemini API Key để dịch lại trang!', 'warning');
      return;
    }
    if (this.isTranslating) {
      this.showToast('Đang có tiến trình dịch chạy. Vui lòng tạm dừng hoặc đợi hoàn tất trước khi dịch lại từng trang.', 'warning');
      return;
    }
    const targetChunk = this.chunks.find(c => pageNum >= c.startPage && pageNum <= c.endPage);
    if (!targetChunk) return;

    this.showToast(`🔄 Đang dịch lại Trang ${pageNum}...`, 'info');
    targetChunk.pageResults = (targetChunk.pageResults || []).filter(pr => pr.pageNum !== pageNum);
    targetChunk.status = 'processing';
    await this.retrySingleChunk(targetChunk);
  }

  getChunkPageNumbers(chunk) {
    const pages = [];
    for (let pageNum = chunk.startPage; pageNum <= chunk.endPage; pageNum++) pages.push(pageNum);
    return pages;
  }

  getPageSourceText(pageNum) {
    return this.sourcePageProfiles.find(profile => profile.pageNum === pageNum)?.text || '';
  }

  getSourcePageProfile(pageNum) {
    return this.sourcePageProfiles.find(profile => profile.pageNum === pageNum) || null;
  }

  getPagesSourceText(pageNumbers) {
    return pageNumbers
      .map(pageNum => `[[SOURCE_PAGE_${pageNum}]]\n${this.getPageSourceText(pageNum)}`)
      .join('\n\n')
      .trim();
  }

  getChunkSourceText(chunk) {
    return this.getChunkPageNumbers(chunk)
      .map(pageNum => this.getPageSourceText(pageNum))
      .join('\n\n')
      .trim();
  }

  extractBatchPageSections(html, pageNumbers) {
    const expectedPages = new Set(pageNumbers);
    const template = document.createElement('template');
    template.innerHTML = html;
    const sections = new Map();
    const duplicatePages = new Set();

    template.content.querySelectorAll('section.source-page[data-source-page]').forEach(section => {
      const pageNum = parseInt(section.getAttribute('data-source-page') || '', 10);
      if (!expectedPages.has(pageNum)) return;
      if (sections.has(pageNum)) duplicatePages.add(pageNum);
      else sections.set(pageNum, section.innerHTML.trim());
    });

    if (sections.size === 0 && pageNumbers.length === 1) {
      sections.set(pageNumbers[0], html.trim());
    }

    template.content.querySelectorAll('section.source-page').forEach(section => section.remove());
    const outsideText = (template.content.textContent || '').replace(/\s+/g, ' ').trim();
    return { sections, duplicatePages, outsideText };
  }

  evaluateBatchTranslation(pageNumbers, rawHtml, finishReason) {
    const sanitizedHtml = this.sanitizeGeneratedHtml(this.cleanModelHtml(rawHtml), pageNumbers[0]);
    const { sections, duplicatePages, outsideText } = this.extractBatchPageSections(sanitizedHtml, pageNumbers);
    const pageResults = pageNumbers.map(pageNum => {
      const pageHtml = sections.get(pageNum) || '';
      let qa;
      if (outsideText.length > 20 && pageNumbers.length > 1) {
        qa = { passed: false, code: 'EXTRA_BATCH_CONTENT', message: 'có lời dẫn hoặc nội dung nằm ngoài khối trang', lengthRatio: 0 };
      } else if (duplicatePages.has(pageNum)) {
        qa = { passed: false, code: 'DUPLICATE_PAGE_SECTION', message: 'model trả lặp khối trang', lengthRatio: 0 };
      } else if (!pageHtml) {
        qa = { passed: false, code: 'MISSING_PAGE_SECTION', message: 'thiếu khối HTML của trang', lengthRatio: 0 };
      } else {
        qa = this.validateTranslationResult({ startPage: pageNum, endPage: pageNum }, pageHtml, finishReason);
      }
      return { pageNum, html: pageHtml, qa };
    });

    return { sanitizedHtml, pageResults };
  }

  renderBatchPageSections(pageResults) {
    return pageResults
      .map(pageResult => {
        const profile = this.getSourcePageProfile(pageResult.pageNum);
        const layoutClass = profile?.columnCount === 2
          ? 'source-layout-two-column'
          : 'source-layout-single-column';
        const pageHtml = this.formatReferencesForSafeColumns(pageResult.html);
        const toolbarHtml = `<div class="source-page-toolbar" contenteditable="false"><span class="source-page-badge">📄 Trang nguồn ${pageResult.pageNum}</span><div class="source-page-actions"><button type="button" class="page-action-btn page-jump-btn" data-page="${pageResult.pageNum}" title="Cuộn PDF gốc tới Trang ${pageResult.pageNum}">👁 Đối chiếu PDF</button><button type="button" class="page-action-btn page-retranslate-btn" data-page="${pageResult.pageNum}" title="Dịch lại riêng Trang ${pageResult.pageNum} này">🔄 Dịch lại trang ${pageResult.pageNum}</button></div></div>`;
        return `<section class="source-page ${layoutClass}" data-source-page="${pageResult.pageNum}">${toolbarHtml}${pageHtml}</section>`;
      })
      .join('\n');
  }

  formatReferencesForSafeColumns(html) {
    const template = document.createElement('template');
    template.innerHTML = html;

    const hasVisibleContent = element => (
      (element.textContent || '').replace(/\s+/g, ' ').trim().length > 0
      || Boolean(element.querySelector('figure, table, img, .figure-image-slot'))
    );

    const rebuildReferenceSection = sections => {
      const rebuilt = document.createElement('div');
      rebuilt.className = 'references-section references-normalized';
      const firstHeading = sections
        .map(section => section.querySelector('h2, h3'))
        .find(Boolean);
      if (firstHeading) rebuilt.appendChild(firstHeading.cloneNode(true));

      const entries = [];
      let nextValue = 1;
      sections.forEach(section => {
        section.querySelectorAll('ol.references-list, ol.references, ol.references-column').forEach(list => {
          const parsedStart = parseInt(list.getAttribute('start') || '', 10);
          let listValue = Number.isFinite(parsedStart) ? parsedStart : nextValue;
          [...list.children].filter(item => item.tagName === 'LI').forEach(item => {
            const explicitValue = parseInt(item.getAttribute('value') || '', 10);
            const value = Number.isFinite(explicitValue) ? explicitValue : listValue;
            entries.push({ value, item: item.cloneNode(true) });
            listValue = value + 1;
            nextValue = Math.max(nextValue, listValue);
          });
        });
      });

      if (entries.length > 0) {
        const entryContainer = document.createElement('div');
        entryContainer.className = 'reference-entries';
        entries.forEach(({ value, item }) => {
          const entry = document.createElement('div');
          entry.className = 'reference-entry';
          const number = document.createElement('span');
          number.className = 'reference-number';
          number.textContent = `[${value}]`;
          const text = document.createElement('span');
          text.className = 'reference-text';
          [...item.childNodes].forEach(node => text.appendChild(node.cloneNode(true)));
          entry.append(number, text);
          entryContainer.appendChild(entry);
        });
        rebuilt.appendChild(entryContainer);
      } else {
        sections.forEach(section => {
          [...section.childNodes].forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE && /^(H2|H3)$/.test(node.tagName)) return;
            rebuilt.appendChild(node.cloneNode(true));
          });
        });
      }

      return rebuilt;
    };

    const buildColumnSegment = columnGroups => {
      const populatedGroups = columnGroups
        .map((nodes, columnIndex) => ({
          columnIndex,
          nodes: nodes.filter(node => (
            node.nodeType === Node.TEXT_NODE
              ? Boolean((node.textContent || '').trim())
              : hasVisibleContent(node)
          ))
        }))
        .filter(group => group.nodes.length > 0);

      if (populatedGroups.length === 0) return [];
      if (populatedGroups.length === 1) return populatedGroups[0].nodes;

      const segment = document.createElement('div');
      segment.className = 'layout-2col';
      populatedGroups.forEach(group => {
        const column = document.createElement('div');
        group.nodes.forEach(node => column.appendChild(node));
        segment.appendChild(column);
      });
      return [segment];
    };

    [...template.content.querySelectorAll('.layout-2col')].forEach(layout => {
      const referenceSections = [...layout.querySelectorAll('.references-section')];
      if (referenceSections.length === 0) return;

      const columns = [...layout.children];
      const beforeColumns = columns.map(() => []);
      const afterColumns = columns.map(() => []);
      const orderedReferenceSections = [];
      let seenReferences = false;

      columns.forEach((column, columnIndex) => {
        [...column.childNodes].forEach(node => {
          const isElement = node.nodeType === Node.ELEMENT_NODE;
          const nodeReferenceSections = isElement
            ? (node.matches('.references-section')
              ? [node]
              : [...node.querySelectorAll('.references-section')])
            : [];

          if (nodeReferenceSections.length > 0) {
            seenReferences = true;
            orderedReferenceSections.push(...nodeReferenceSections);
            if (!node.matches('.references-section')) {
              const remainder = node.cloneNode(true);
              remainder.querySelectorAll('.references-section').forEach(section => section.remove());
              if (hasVisibleContent(remainder)) afterColumns[columnIndex].push(remainder);
            }
            return;
          }

          const targetColumns = seenReferences ? afterColumns : beforeColumns;
          targetColumns[columnIndex].push(node);
        });
      });

      const rebuilt = rebuildReferenceSection(orderedReferenceSections);
      const replacementNodes = [
        ...buildColumnSegment(beforeColumns),
        rebuilt,
        ...buildColumnSegment(afterColumns)
      ];
      layout.replaceWith(...replacementNodes);
    });

    [...template.content.querySelectorAll('.references-section:not(.references-normalized)')].forEach(section => {
      if (!section.querySelector('ol.references-list, ol.references, ol.references-column')) return;
      section.replaceWith(rebuildReferenceSection([section]));
    });

    return template.innerHTML.trim();
  }

  buildTranslationSystemInstruction(pageNumbers, qaFeedback = []) {
    const normalizedPages = Array.isArray(pageNumbers) ? pageNumbers : [pageNumbers];
    const pageList = normalizedPages.join(', ');
    const qaCorrectionNotes = this.buildQaCorrectionNotes(qaFeedback);
    const layoutGuide = normalizedPages
      .map(pageNum => {
        const profile = this.getSourcePageProfile(pageNum);
        return `- Trang ${pageNum}: ${profile?.columnCount === 2 ? 'bố cục hai cột' : 'bố cục một cột/toàn chiều rộng'} (~${profile?.wordCount || 0} từ nguồn)`;
      })
      .join('\n');
    return `Bạn là chuyên gia biên dịch tài liệu khoa học và học thuật cao cấp sang tiếng Việt. Các trang nguồn do người dùng trực tiếp cung cấp để dịch toàn văn.

QUY TẮC SỐ 1 — DỊCH TRỌN VẸN 100%, TUYỆT ĐỐI KHÔNG DỊCH NỬA VỜI:
- Dịch ĐẦY ĐỦ 100% nội dung từng trang ${pageList} sang tiếng Việt học thuật chuẩn xác, mạch lạc.
- TUYỆT ĐỐI KHÔNG được dịch một nửa rồi để nguyên tiếng Anh ở nửa sau của trang, nửa sau của đoạn văn, hoặc bỏ sót cột phải / cuối trang / chú thích chân trang (footnotes).
- Không tóm tắt, không lược bỏ đoạn văn, không thêm lời bình hay lời dẫn ngoài tài liệu.
- Giữ nguyên tên riêng tác giả, tên tổ chức, số liệu, năm, trích dẫn [1], DOI, URL và công thức toán học LaTeX ($...$, $$...$$). Bỏ số trang đơn lẻ và running header/footer lặp lại ở mép trang.

QUY TẮC SỐ 2 — CẤU TRÚC KHỐI TRANG & BỐ CỤC CỘT:
- Với MỖI trang, trả về đúng một khối <section class="source-page" data-source-page="N">...</section> (trong đó N là số trang vật lý tương ứng). Phải có đủ và đúng thứ tự các trang: ${pageList}. Không viết bất kỳ nội dung nào bên ngoài các thẻ section này.
- Chỉ dùng HTML ngữ nghĩa: section, h1, h2, h3, p, strong, em, ul, ol, li, table, thead, tbody, tr, th, td, div, span, figure, figcaption, sup, sub, blockquote, br.
- Ứng dụng đã đo bố cục nguồn như sau:
${layoutGuide}
- Với trang hai cột: đặt tiêu đề lớn / tóm tắt (abstract) / hình hoặc bảng rộng ở toàn chiều rộng; bọc phần thân bài hai cột bằng đúng <div class="layout-2col"><div>[toàn bộ nội dung cột trái đã dịch sang tiếng Việt]</div><div>[toàn bộ nội dung cột phải đã dịch sang tiếng Việt]</div></div>. Phải dịch hết cả cột trái lẫn cột phải!
- Với trang bìa / danh sách tác giả: bọc danh sách tác giả trong <div class="authors-block"><div class="author-row"><span class="author-name">Tên tác giả</span><span class="author-affil">Đơn vị công tác</span></div>...</div> và phần Tóm tắt trong <div class="abstract-box"><div class="abstract-title">Tóm tắt</div><p>...</p></div>.

QUY TẮC SỐ 3 — HÌNH MINH HỌA, BIỂU ĐỒ (CHARTS) VÀ SƠ ĐỒ (FIGURES):
- KHÔNG chèn chữ đè lên ảnh để tránh làm mờ/sạn hình và chữ chồng chéo chi chít.
- Với MỌI Hình minh họa, Biểu đồ (Chart/Plot/Graph) hoặc Sơ đồ (Diagram/Flowchart) ở trang N:
  1. Tạo thẻ <figure class="paper-figure" data-page="N" data-bbox="[ymin,xmin,ymax,xmax]"> trong đó data-bbox là tọa độ [ymin,xmin,ymax,xmax] theo thang 0–1000 ôm sát ĐÚNG vùng hình/biểu đồ gốc (tuyệt đối không lấy toàn trang, và nếu hình chỉ nằm ở 1 cột thì tuyệt đối không kéo tràn sang cột văn bản bên cạnh). Nếu hình hoặc bảng gốc trong PDF bị in xoay dọc 90° (sideways/landscape), hãy thêm thuộc tính data-rotate="90" (nếu chữ đọc từ dưới lên trên) hoặc data-rotate="270" (nếu chữ đọc từ trên xuống dưới).
  2. Bên trong <figure>, đặt <div class="figure-image-slot"></div> ở đầu tiên (ứng dụng sẽ tự cắt hình gốc độ phân giải cao 3x cực nét gắn vào đây).
  3. NGAY PHÍA DƯỚI <div class="figure-image-slot"></div>, BẮT BUỘC tạo một bảng dịch chi tiết toàn bộ các thành phần chữ có trong hình/biểu đồ/sơ đồ đó theo đúng cấu trúc sau:
     <div class="figure-translation-box">
       <div class="figure-translation-header">📊 Bảng dịch chi tiết các thành phần trong Hình / Biểu đồ</div>
       <div class="table-scroll">
         <table class="figure-translation-table">
           <thead>
             <tr>
               <th>Khu vực / Thành phần</th>
               <th>Nội dung gốc trong hình</th>
               <th>Bản dịch & Giải nghĩa Tiếng Việt</th>
             </tr>
           </thead>
           <tbody>
             <tr>
               <td class="fig-comp-cell">Tiêu đề / Trục / Nhánh / Chú giải...</td>
               <td class="fig-src-cell">Cụm từ tiếng Anh gốc trong hình</td>
               <td class="fig-vi-cell">Bản dịch tiếng Việt đầy đủ, rõ ràng, chính xác</td>
             </tr>
           </tbody>
         </table>
       </div>
     </div>
  4. Bảng <table class="figure-translation-table"> PHẢI liệt kê và dịch ĐẦY ĐỦ 100% mọi tiêu đề biểu đồ, nhãn trục (X/Y), chú giải (legend), các ô/bước trong sơ đồ khối, mũi tên luồng, và các ghi chú (annotations/callouts) nằm bên trong hình sang tiếng Việt (sắp xếp khoa học từ trên xuống dưới, từ trái sang phải). TUYỆT ĐỐI KHÔNG được viết tắt bằng dấu "..." ở bất kỳ ô nào và KHÔNG được bỏ sót bất kỳ cột hay hàng nào của bảng/hình xoay dọc!
  5. Cuối cùng là <figcaption><strong>Hình ...:</strong> [Dịch đầy đủ 100% phần chú thích hình sang tiếng Việt]</figcaption>.

QUY TẮC SỐ 4 — BẢNG DỮ LIỆU (TABLES) VÀ TÀI LIỆU THAM KHẢO (REFERENCES):
- Với bảng dữ liệu (Table): dịch đầy đủ 100% mọi tiêu đề cột, tiêu đề hàng và ô dữ liệu sang tiếng Việt (tuyệt đối không rút gọn bằng "...") trong <div class="table-scroll"><table><thead>...</thead><tbody>...</tbody></table></div>. Có thể kèm thêm <figure class="paper-figure source-table-image" data-page="N" data-bbox="[ymin,xmin,ymax,xmax]"><div class="figure-image-slot"></div><figcaption>...</figcaption></figure> nếu bảng phức tạp hoặc in dọc cần đối chiếu.
- Với phần Tài liệu tham khảo (References): giữ nguyên số thứ tự nguồn bằng <div class="references-section"><h2>Tài liệu tham khảo</h2><ol class="references-list" start="1"><li value="1">...</li></ol></div> (thay số start/value đúng với số thứ tự thật trên trang, giữ nguyên tên bài báo/tác giả gốc chuẩn trích dẫn quốc tế).
${this.customPrompt ? `\nYÊU CẦU VĂN PHONG & THUẬT NGỮ BỔ SUNG TỪ NGƯỜI DÙNG:\n${this.customPrompt}` : ''}
${qaCorrectionNotes ? `\nLẦN SỬA QA BẮT BUỘC — Kết quả trước bị hệ thống QA từ chối vì các lỗi sau. Hãy sửa triệt để:\n${qaCorrectionNotes}\n` : ''}
Trả về mã HTML trực tiếp, không bọc trong Markdown code fence (\`\`\`html).`;
  }

  buildQaCorrectionNotes(qaFeedback = []) {
    if (!Array.isArray(qaFeedback) || qaFeedback.length === 0) return '';
    const guidanceByCode = {
      NOT_VIETNAMESE: 'Bản trước còn nguyên tiếng Anh hoặc thiếu dấu tiếng Việt. PHẢI dịch 100% toàn bộ các câu, đoạn văn, tiêu đề và chú thích sang tiếng Việt.',
      PARTIAL_UNTRANSLATED_ENGLISH: 'Bản trước chỉ dịch một phần và để nguyên nhiều đoạn văn tiếng Anh chưa dịch. PHẢI dịch 100% mọi đoạn văn (cả cột trái lẫn cột phải, đầu trang đến cuối trang) sang tiếng Việt, tuyệt đối không để sót đoạn tiếng Anh nào.',
      TWO_COLUMN_STRUCTURE_MISSING: 'Trang nguồn được nhận diện là hai cột. Bọc phần thân bài bằng đúng một div.layout-2col có đúng hai div con, mỗi cột chứa phần nội dung đã dịch tương ứng.',
      LOW_COVERAGE: 'Bản trước bị thiếu hoặc cắt bớt nội dung. Dịch đầy đủ mọi đoạn theo đúng thứ tự từ đầu đến cuối trang, không tóm tắt và không bỏ phần.',
      TOKEN_LOSS: 'Bản trước làm mất số liệu hoặc trích dẫn. Giữ lại đầy đủ các năm, con số, DOI, URL, ký hiệu và số tham chiếu nguồn.',
      FIGURE_BBOX_MISSING: 'Hình thiếu vùng định vị. Giữ hình gốc bằng paper-figure và cung cấp data-bbox="[ymin,xmin,ymax,xmax]" hợp lệ theo thang 0–1000.',
      FIGURE_LABELS_MISSING: 'Hình/Biểu đồ có chữ tiếng Anh bên trong nhưng thiếu bảng dịch thành phần. Ngay dưới <div class="figure-image-slot"></div> bên trong <figure>, BẮT BUỘC tạo <div class="figure-translation-box"><div class="figure-translation-header">📊 Bảng dịch chi tiết các thành phần trong Hình / Biểu đồ</div><div class="table-scroll"><table class="figure-translation-table">...</table></div></div> dịch toàn bộ các thành phần chữ trong hình sang tiếng Việt.',
      FIGURE_LOSS: 'Bản trước làm mất Hình minh họa. Giữ đúng số thứ tự Hình (Hình 1, Hình 2...) kèm vùng cắt data-bbox và bảng dịch thành phần hình.',
      REFUSAL_OR_SUMMARY: 'Bản trước từ chối hoặc tóm tắt. Hãy dịch trực tiếp toàn bộ phần người dùng cung cấp, không thay bằng tóm tắt.',
      FINISH_MAX_TOKENS: 'Bản trước bị cắt giữa chừng. Hoàn tất toàn bộ trang; không bỏ nội dung ở cuối trang.'
    };
    return qaFeedback.map(issue => {
      const page = Number(issue.pageNum);
      const pageLabel = Number.isInteger(page) ? `Trang ${page}` : 'Trang';
      const guidance = guidanceByCode[issue.code] || `Sửa lỗi QA: ${String(issue.message || issue.code || 'kết quả chưa đạt').slice(0, 180)}.`;
      return `- ${pageLabel}: ${guidance}`;
    }).join('\n');
  }

  async requestGeminiTranslation(chunk, mode, sourceText, onText, pageNumbers = this.getChunkPageNumbers(chunk), model = this.selectedModel, qaFeedback = []) {
    const parts = [];
    const pageList = pageNumbers.join(', ');
    if (mode === 'pdf') {
      const subPdfBase64 = await this.extractPdfChunkBase64(chunk.startPage, chunk.endPage);
      parts.push({ inlineData: { mimeType: 'application/pdf', data: subPdfBase64 } });
      parts.push({
        text: `Dịch đầy đủ 100% các trang nguồn ${pageList} sang tiếng Việt theo đúng cấu trúc <section class="source-page" data-source-page="N">.
Dưới đây là toàn bộ lớp văn bản trích xuất của từng trang để bạn đối chiếu không bỏ sót bất kỳ đoạn văn, cột văn bản hay chú thích nào, đồng thời hãy nhìn trực tiếp trang PDF đính kèm để lấy tọa độ data-bbox cho các Hình/Biểu đồ và lập bảng dịch chi tiết <table class="figure-translation-table"> ngay bên dưới mỗi hình:\n\n--- VĂN BẢN NGUỒN ĐỐI CHIẾU ĐỘ PHỦ ---\n${sourceText}`
      });
    } else {
      parts.push({
        text: `Dịch đầy đủ 100% lớp văn bản đã trích xuất của các trang ${pageList} sang tiếng Việt. Các marker [[SOURCE_PAGE_N]] là ranh giới bắt buộc; không tóm tắt, không để sót câu tiếng Anh nào và không trộn trang.\n\n--- NGUỒN ---\n${sourceText}`
      });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(this.apiKey)}`;
    const maxOutputTokens = 65536;
    const requestBody = {
      contents: [{ parts }],
      systemInstruction: { parts: [{ text: this.buildTranslationSystemInstruction(pageNumbers, qaFeedback) }] },
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    };

    const requestController = new AbortController();
    this.currentAbortController = requestController;
    let timeoutTriggered = false;
    const timeoutId = setTimeout(() => {
      timeoutTriggered = true;
      requestController.abort();
    }, this.requestTimeoutMs);

    try {
      let response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: requestController.signal
      });

      // Fallback if a model caps maxOutputTokens at 8192 or 16384
      if (response.status === 400) {
        const errCheck = await response.clone().json().catch(() => ({}));
        const errMsg = errCheck.error?.message || '';
        if (/max_output_tokens|maxOutputTokens|output token/i.test(errMsg)) {
          requestBody.generationConfig.maxOutputTokens = 8192;
          response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: requestController.signal
          });
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error?.message || `HTTP ${response.status} ${response.statusText}`;
        const apiError = new Error(`Google API (HTTP ${response.status}): ${message}`);
        apiError.httpStatus = response.status;
        apiError.code = errorData.error?.status || `HTTP_${response.status}`;
        apiError.retryAfterMs = this.extractRetryDelayMs(response, errorData, message);
        throw apiError;
      }

      return await this.consumeGeminiStream(response, onText);
    } catch (error) {
      if (error.name === 'AbortError' && timeoutTriggered && !this.isPaused) {
        const timeoutError = new Error(`Google AI không phản hồi sau ${Math.round(this.requestTimeoutMs / 1000)} giây.`);
        timeoutError.code = 'REQUEST_TIMEOUT';
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (this.currentAbortController === requestController) this.currentAbortController = null;
    }
  }

  extractRetryDelayMs(response, errorData, message) {
    const retryHeader = response.headers.get('retry-after');
    if (retryHeader) {
      const seconds = Number(retryHeader);
      if (Number.isFinite(seconds)) return seconds * 1000;
      const retryDate = Date.parse(retryHeader);
      if (Number.isFinite(retryDate)) return Math.max(0, retryDate - Date.now());
    }

    const retryInfo = (errorData.error?.details || []).find(detail => /RetryInfo/i.test(detail['@type'] || ''));
    const retryDelay = retryInfo?.retryDelay;
    if (typeof retryDelay === 'string') {
      const durationMatch = retryDelay.match(/^([\d.]+)s$/i);
      if (durationMatch) return Number(durationMatch[1]) * 1000;
    }

    const messageMatch = String(message || '').match(/retry\s+(?:in|after)\s+([\d.]+)\s*s/i);
    return messageMatch ? Number(messageMatch[1]) * 1000 : null;
  }

  async consumeGeminiStream(response, onText) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulatedText = '';
    let finishReason = '';

    const consumeLine = line => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) return;
      const jsonText = trimmed.slice(5).trim();
      if (!jsonText || jsonText === '[DONE]') return;

      let data;
      try {
        data = JSON.parse(jsonText);
      } catch (error) {
        return;
      }

      const blockReason = data?.promptFeedback?.blockReason;
      if (blockReason) {
        const blockedError = new Error(`Google AI đã chặn yêu cầu (${blockReason}).`);
        blockedError.code = `PROVIDER_${blockReason}`;
        throw blockedError;
      }

      const candidate = data?.candidates?.[0];
      if (candidate?.finishReason) finishReason = candidate.finishReason;
      const partText = (candidate?.content?.parts || [])
        .map(part => typeof part.text === 'string' ? part.text : '')
        .join('');

      if (partText) {
        accumulatedText += partText;
        onText(accumulatedText);
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      lines.forEach(consumeLine);
    }

    buffer += decoder.decode();
    if (buffer.trim()) consumeLine(buffer);

    if (!accumulatedText.trim()) {
      if (finishReason && finishReason !== 'STOP') {
        const finishError = new Error(`Google AI kết thúc chưa hoàn chỉnh (${finishReason}) và không trả nội dung.`);
        finishError.code = `FINISH_${finishReason}`;
        throw finishError;
      }
      throw new Error('Google AI không phản hồi nội dung văn bản nào cho trang này.');
    }

    return {
      text: accumulatedText,
      finishReason: finishReason || 'UNKNOWN'
    };
  }

  cleanModelHtml(rawHtml) {
    return String(rawHtml || '')
      .replace(/^\s*```(?:html|markdown|xml)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();
  }

  sanitizeGeneratedHtml(rawHtml, sourcePage) {
    const template = document.createElement('template');
    template.innerHTML = rawHtml;
    const allowedTags = new Set([
      'SECTION', 'H1', 'H2', 'H3', 'H4', 'P', 'STRONG', 'EM', 'UL', 'OL', 'LI', 'TABLE',
      'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'DIV', 'SPAN', 'FIGURE',
      'FIGCAPTION', 'SUP', 'SUB', 'BLOCKQUOTE', 'BR', 'A'
    ]);
    const allowedAttributes = new Set(['class', 'data-page', 'data-source-page', 'data-bbox', 'data-rotate', 'data-fignum', 'data-source-label', 'colspan', 'rowspan', 'href', 'start', 'value']);
    const allowedClasses = new Set([
      'source-page', 'layout-2col', 'book-columns-2', 'authors-block', 'author-row', 'author-name',
      'author-affil', 'abstract-box', 'abstract-title', 'callout', 'callout-note', 'callout-tip', 'callout-warning', 'callout-definition',
      'callout-title', 'note-box', 'paper-cover', 'paper-cover-institution',
      'paper-cover-meta', 'paper-figure', 'figure-wrapper', 'figure-image-slot', 'source-table-image',
      'figure-caption', 'figure-label-overlays', 'figure-label-overlay',
      'figure-translation-box', 'figure-translation-header', 'figure-translation-table',
      'fig-comp-cell', 'fig-src-cell', 'fig-vi-cell',
      'translated-diagram', 'diagram-section', 'diagram-title', 'diagram-flow', 'diagram-box', 'diagram-arrow',
      'table-scroll', 'references-section', 'references-list', 'reference-item'
    ]);

    [...template.content.querySelectorAll('*')].forEach(element => {
      if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE' || element.tagName === 'IFRAME') {
        element.remove();
        return;
      }

      if (!allowedTags.has(element.tagName)) {
        element.replaceWith(...element.childNodes);
        return;
      }

      [...element.attributes].forEach(attribute => {
        if (!allowedAttributes.has(attribute.name)) element.removeAttribute(attribute.name);
      });

      if (element.hasAttribute('class')) {
        const safeClasses = element.getAttribute('class')
          .split(/\s+/)
          .filter(className => allowedClasses.has(className));
        if (safeClasses.length) element.setAttribute('class', safeClasses.join(' '));
        else element.removeAttribute('class');
      }

      ['start', 'value', 'colspan', 'rowspan'].forEach(attributeName => {
        if (!element.hasAttribute(attributeName)) return;
        const value = Number(element.getAttribute(attributeName));
        const maximum = attributeName === 'colspan' || attributeName === 'rowspan' ? 50 : 100000;
        if (!Number.isInteger(value) || value < 1 || value > maximum) {
          element.removeAttribute(attributeName);
        }
      });

      if (element.tagName === 'A') {
        const href = element.getAttribute('href') || '';
        if (!/^(https?:|mailto:)/i.test(href)) element.removeAttribute('href');
        element.setAttribute('rel', 'noopener noreferrer');
        element.setAttribute('target', '_blank');
      }

      if (element.tagName === 'SECTION') {
        const pageNum = parseInt(element.getAttribute('data-source-page') || '', 10);
        if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > this.totalPages) {
          element.removeAttribute('data-source-page');
        }
      }

      if (element.tagName === 'FIGURE') {
        const parentPage = parseInt(element.closest('section.source-page')?.getAttribute('data-source-page') || '', 10);
        const resolvedPage = Number.isInteger(parentPage) ? parentPage : sourcePage;
        element.setAttribute('data-page', String(resolvedPage));
        const bbox = element.getAttribute('data-bbox');
        if (bbox) {
          try {
            let parsed = JSON.parse(bbox);
            const explicitRotate = parseInt(element.getAttribute('data-rotate') || '0', 10) || 0;
            if (Array.isArray(parsed) && parsed.length === 4) {
              const refined = this.resolveFigureCropAndRotation(resolvedPage, parsed, explicitRotate);
              parsed = refined.bbox;
              element.setAttribute('data-bbox', JSON.stringify(parsed));
              if (refined.rotation) {
                element.setAttribute('data-rotate', String(refined.rotation));
              }
            }
            const cropWidth = Array.isArray(parsed) ? parsed[3] - parsed[1] : 0;
            const cropHeight = Array.isArray(parsed) ? parsed[2] - parsed[0] : 0;
            const coversNearlyWholePage = Array.isArray(parsed)
              && parsed[0] < 20 && parsed[1] < 20 && parsed[2] > 980 && parsed[3] > 980;
            const valid = Array.isArray(parsed)
              && parsed.length === 4
              && parsed.every(value => Number.isFinite(value) && value >= 0 && value <= 1000)
              && parsed[2] > parsed[0] + 25
              && parsed[3] > parsed[1] + 25
              && cropWidth * cropHeight <= 880000
              && !coversNearlyWholePage;
            if (!valid) element.removeAttribute('data-bbox');
          } catch (error) {
            element.removeAttribute('data-bbox');
          }
        }
      }
    });

    // Convert any legacy figure-label-overlays into a clean structured figure-translation-table below the image
    [...template.content.querySelectorAll('figure.paper-figure, figure.figure-wrapper')].forEach(fig => {
      this.upgradeFigureOverlaysToTable(fig);
    });

    [...template.content.querySelectorAll('table')].forEach(table => {
      if (table.closest('.table-scroll')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'table-scroll';
      table.replaceWith(wrapper);
      wrapper.appendChild(table);
    });

    return template.innerHTML.trim();
  }

  upgradeFigureOverlaysToTable(fig) {
    if (!fig) return;
    if (!fig.querySelector('.figure-image-slot') && !fig.querySelector('.figure-image-container')) {
      const slot = document.createElement('div');
      slot.className = 'figure-image-slot';
      fig.insertBefore(slot, fig.firstChild);
    }

    const overlaySpans = [...fig.querySelectorAll('.figure-label-overlay')];
    const existingTable = fig.querySelector('.figure-translation-table');

    if (overlaySpans.length > 0 && !existingTable) {
      const items = overlaySpans
        .map(span => {
          const translatedText = (span.textContent || '').replace(/\s+/g, ' ').trim();
          const sourceLabel = (span.getAttribute('data-source-label') || '').replace(/\s+/g, ' ').trim();
          let bbox = null;
          try {
            const parsed = JSON.parse(span.getAttribute('data-bbox') || 'null');
            if (Array.isArray(parsed) && parsed.length === 4) bbox = parsed;
          } catch (e) {}
          return { sourceLabel, translatedText, bbox };
        })
        .filter(item => item.translatedText);

      // Sort top-to-bottom, left-to-right
      items.sort((a, b) => {
        const aY = Array.isArray(a.bbox) ? (a.bbox[0] + a.bbox[2]) / 2 : Number.POSITIVE_INFINITY;
        const bY = Array.isArray(b.bbox) ? (b.bbox[0] + b.bbox[2]) / 2 : Number.POSITIVE_INFINITY;
        if (Math.abs(aY - bY) > 12) return aY - bY;
        const aX = Array.isArray(a.bbox) ? (a.bbox[1] + a.bbox[3]) / 2 : Number.POSITIVE_INFINITY;
        const bX = Array.isArray(b.bbox) ? (b.bbox[1] + b.bbox[3]) / 2 : Number.POSITIVE_INFINITY;
        return aX - bX;
      });

      if (items.length > 0) {
        const box = document.createElement('div');
        box.className = 'figure-translation-box';
        const header = document.createElement('div');
        header.className = 'figure-translation-header';
        header.textContent = '📊 Bảng dịch chi tiết các thành phần trong Hình / Biểu đồ';
        const scrollWrap = document.createElement('div');
        scrollWrap.className = 'table-scroll';
        const table = document.createElement('table');
        table.className = 'figure-translation-table';
        table.innerHTML = `
          <thead>
            <tr>
              <th>TT</th>
              <th>Nội dung gốc trong hình</th>
              <th>Bản dịch & Giải nghĩa Tiếng Việt</th>
            </tr>
          </thead>
          <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');
        items.forEach((item, idx) => {
          const tr = document.createElement('tr');
          const tdIdx = document.createElement('td');
          tdIdx.className = 'fig-comp-cell';
          tdIdx.textContent = `#${idx + 1}`;
          const tdSrc = document.createElement('td');
          tdSrc.className = 'fig-src-cell';
          tdSrc.textContent = item.sourceLabel || '—';
          const tdVi = document.createElement('td');
          tdVi.className = 'fig-vi-cell';
          tdVi.textContent = item.translatedText;
          tr.append(tdIdx, tdSrc, tdVi);
          tbody.appendChild(tr);
        });
        scrollWrap.appendChild(table);
        box.append(header, scrollWrap);

        const caption = fig.querySelector('figcaption');
        if (caption) fig.insertBefore(box, caption);
        else fig.appendChild(box);
      }
    }

    // Always remove overlay containers so nothing is ever drawn over the image
    fig.querySelectorAll('.figure-label-overlays, .figure-label-overlay-layer, .figure-label-overlay').forEach(el => el.remove());

    // Ensure any figure-translation-table is wrapped in figure-translation-box
    const rawFigTable = fig.querySelector('table.figure-translation-table');
    if (rawFigTable && !rawFigTable.closest('.figure-translation-box')) {
      const box = document.createElement('div');
      box.className = 'figure-translation-box';
      const header = document.createElement('div');
      header.className = 'figure-translation-header';
      header.textContent = '📊 Bảng dịch chi tiết các thành phần trong Hình / Biểu đồ';
      const targetNode = rawFigTable.closest('.table-scroll') || rawFigTable;
      targetNode.replaceWith(box);
      box.append(header, targetNode);
    }
  }

  htmlToPlainText(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    template.content.querySelectorAll('br, p, h1, h2, h3, li, tr, td, th, div, section, figure, figcaption, blockquote')
      .forEach(element => element.appendChild(document.createTextNode(' ')));
    return (template.content.textContent || '').replace(/\s+/g, ' ').trim();
  }

  extractIntegrityTokens(text) {
    const matches = String(text || '').match(/\b(?:19|20)\d{2}\b|\b\d+(?:\.\d+){1,3}\b|10\.\d{4,9}\/[-._;()/:A-Z0-9]+|\[\d+(?:\s*[-,]\s*\d+)*\]/gi) || [];
    return [...new Set(matches.map(token => token.toLowerCase()))];
  }

  extractListNumberTokens(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    const tokens = [];

    template.content.querySelectorAll('ol.references-list, ol.references').forEach(list => {
      const parsedStart = parseInt(list.getAttribute('start') || '1', 10);
      let nextValue = Number.isFinite(parsedStart) ? parsedStart : 1;
      list.querySelectorAll(':scope > li').forEach(item => {
        const explicitValue = parseInt(item.getAttribute('value') || '', 10);
        const value = Number.isFinite(explicitValue) ? explicitValue : nextValue;
        tokens.push(`[${value}]`);
        nextValue = value + 1;
      });
    });

    return tokens;
  }

  validateTranslationResult(chunk, html, finishReason) {
    const sourceText = this.getChunkSourceText(chunk);
    const targetText = this.htmlToPlainText(html);
    const sourceLength = sourceText.length;
    const targetLength = targetText.length;
    const lengthRatio = sourceLength > 0 ? targetLength / sourceLength : 1;
    // Match assistant refusal language, not ordinary paper prose such as "AI cannot...".
    // The old unbounded `i ... cannot` alternative matched the final "I" in "AI".
    const refusalPattern = /tôi\s+(?:không|ko)\s+thể\s+(?:cung cấp|dịch|tiếp tục|giúp|hỗ trợ|thực hiện|đáp ứng)|không thể cung cấp (?:bản )?(?:dịch|toàn văn|nguyên văn)|thay vào đó.{0,80}tóm tắt|tóm tắt tổng quan nội dung|\b(?:i|we)\s+(?:cannot|can't|am unable to)\s+(?:provide|translate|reproduce|continue|help|assist|comply|fulfill)\b|unable to provide (?:a )?(?:full|complete|verbatim|literal) (?:translation|text|copy)|summary of (?:the|this) (?:document|article|paper|text|pages)/is;
    const metaResponsePattern = /bạn có muốn (?:tôi|mình)|would you like me|^\s*#{1,6}\s|\*\*[^*]+\*\*/im;

    if (finishReason && finishReason !== 'STOP') {
      return { passed: false, code: `FINISH_${finishReason}`, message: `phản hồi kết thúc bằng ${finishReason}`, lengthRatio };
    }

    if (!targetText) {
      return { passed: false, code: 'EMPTY', message: 'không có nội dung', lengthRatio };
    }

    if (refusalPattern.test(targetText)) {
      return { passed: false, code: 'REFUSAL_OR_SUMMARY', message: 'phát hiện lời từ chối hoặc tóm tắt', lengthRatio };
    }

    if (metaResponsePattern.test(targetText) || metaResponsePattern.test(html)) {
      return { passed: false, code: 'META_RESPONSE', message: 'phát hiện lời thoại hoặc Markdown ngoài bản dịch', lengthRatio };
    }

    const structureTemplate = document.createElement('template');
    structureTemplate.innerHTML = html;
    const figures = [...structureTemplate.content.querySelectorAll('figure.paper-figure, figure.figure-wrapper')];
    if (figures.some(figure => !figure.hasAttribute('data-bbox'))) {
      return { passed: false, code: 'FIGURE_BBOX_MISSING', message: 'hình chưa có vùng cắt hợp lệ', lengthRatio };
    }

    const pageProfile = this.getSourcePageProfile(chunk.startPage);
    const figureMissingTranslatedLabels = figures.some(figure => {
      if (figure.classList.contains('source-table-image')) return false;
      let figureBbox = null;
      try {
        const parsed = JSON.parse(figure.getAttribute('data-bbox') || 'null');
        if (Array.isArray(parsed) && parsed.length === 4) figureBbox = parsed;
      } catch (error) {}
      if (!figureBbox) return false;
      const [ymin, xmin, ymax, xmax] = figureBbox;
      const sourceLabels = (pageProfile?.textItems || []).filter(item => {
        const [itemYMin, itemXMin, itemYMax, itemXMax] = item.bbox || [];
        const centerX = (itemXMin + itemXMax) / 2;
        const centerY = (itemYMin + itemYMax) / 2;
        return /[A-Za-z]{3}/.test(item.text || '')
          && centerX >= xmin && centerX <= xmax
          && centerY >= ymin && centerY <= ymax;
      });
      const hasTranslationTable = Boolean(
        figure.querySelector('.figure-translation-table tbody tr')
        || figure.querySelector('.translated-diagram')
        || figure.querySelector('.figure-labels-list li')
      );
      return sourceLabels.length >= 2 && !hasTranslationTable;
    });
    if (figureMissingTranslatedLabels) {
      return { passed: false, code: 'FIGURE_LABELS_MISSING', message: 'hình/biểu đồ có chữ nhưng chưa có bảng dịch thành phần tiếng Việt bên dưới', lengthRatio };
    }

    const isReferencePage = /\breferences\b/i.test(sourceText) || Boolean(structureTemplate.content.querySelector('.references-section'));
    if (pageProfile?.columnCount === 2 && sourceLength >= 700 && !isReferencePage) {
      const columnGrid = structureTemplate.content.querySelector('.layout-2col');
      const directColumns = columnGrid
        ? [...columnGrid.children].filter(element => element.tagName === 'DIV')
        : [];
      if (directColumns.length !== 2 || directColumns.some(column => (column.textContent || '').trim().length < 80)) {
        return { passed: false, code: 'TWO_COLUMN_STRUCTURE_MISSING', message: 'chưa giữ đúng hai cột nội dung', lengthRatio };
      }
    }

    // Measure prose coverage excluding generated figure translation tables so a long figure table cannot mask missing body text
    const bodyProbeTemplate = document.createElement('template');
    bodyProbeTemplate.innerHTML = html;
    bodyProbeTemplate.content.querySelectorAll('.source-page-toolbar, .fig-src-cell').forEach(el => el.remove());
    const proseTargetText = this.htmlToPlainText(bodyProbeTemplate.innerHTML);
    const proseRatio = sourceLength > 0 ? proseTargetText.length / sourceLength : 1;

    const minimumRatio = sourceLength >= 1200 ? 0.52 : sourceLength >= 400 ? 0.42 : 0.25;
    if (sourceLength >= 160 && proseRatio < minimumRatio) {
      return { passed: false, code: 'LOW_COVERAGE', message: `độ phủ văn bản chỉ đạt ${Math.round(proseRatio * 100)}% (thiếu nội dung)`, lengthRatio: proseRatio };
    }

    if (sourceLength >= 400 && lengthRatio > 3.2) {
      return { passed: false, code: 'EXCESSIVE_OUTPUT', message: `độ dài bất thường ${Math.round(lengthRatio * 100)}%`, lengthRatio };
    }

    // Strict Vietnamese translation check on non-reference prose (fixes the old sourceTokens.length >= 25 bypass bug!)
    const nonRefTemplate = document.createElement('template');
    nonRefTemplate.innerHTML = html;
    nonRefTemplate.content.querySelectorAll('.references-section, .source-page-toolbar, .authors-block, .fig-src-cell').forEach(el => el.remove());
    const nonRefProseText = this.htmlToPlainText(nonRefTemplate.innerHTML);
    const vnDiacriticsRegex = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/gi;
    const nonRefVnMarks = (nonRefProseText.match(vnDiacriticsRegex) || []).length;

    if (nonRefProseText.length >= 300 && nonRefVnMarks < Math.max(12, Math.floor(nonRefProseText.length * 0.025))) {
      return { passed: false, code: 'NOT_VIETNAMESE', message: 'nội dung văn bản chưa được dịch sang tiếng Việt', lengthRatio };
    }

    // Paragraph-by-paragraph check to catch "dịch 1 nửa, còn lại giữ nguyên tiếng Anh"
    const englishStopwordsRegex = /\b(the|and|that|with|from|this|which|their|have|been|were|would|could|should|between|through|however|therefore|because|while|where|when|into|under|over|after|before|during|within|without|furthermore|moreover|specifically|respectively|experiments|performance)\b/gi;
    const proseBlocks = [...nonRefTemplate.content.querySelectorAll('p, li, figcaption')];
    const untranslatedBlocks = proseBlocks.filter(block => {
      // Strip URLs, DOIs, and inline LaTeX before checking language
      const cleanBlockText = (block.textContent || '')
        .replace(/https?:\/\/\S+/g, ' ')
        .replace(/\$\$[\s\S]*?\$\$|\$[^$]+\$/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleanBlockText.length < 110) return false;
      const vnCount = (cleanBlockText.match(vnDiacriticsRegex) || []).length;
      const enStopwordCount = (cleanBlockText.match(englishStopwordsRegex) || []).length;
      const vnDensity = vnCount / cleanBlockText.length;
      return vnDensity < 0.012 && enStopwordCount >= 6;
    });

    if (untranslatedBlocks.length > 0) {
      const sample = (untranslatedBlocks[0].textContent || '').replace(/\s+/g, ' ').trim().slice(0, 65);
      return {
        passed: false,
        code: 'PARTIAL_UNTRANSLATED_ENGLISH',
        message: `còn ${untranslatedBlocks.length} đoạn văn chưa dịch sang tiếng Việt ("${sample}...")`,
        lengthRatio
      };
    }

    const sourceTokens = this.extractIntegrityTokens(sourceText);
    const targetTokens = new Set([
      ...this.extractIntegrityTokens(targetText),
      ...this.extractListNumberTokens(html).map(token => token.toLowerCase())
    ]);
    const retainedTokens = sourceTokens.filter(token => targetTokens.has(token)).length;
    const tokenCoverage = sourceTokens.length ? retainedTokens / sourceTokens.length : 1;
    if (sourceTokens.length >= 6 && tokenCoverage < 0.35) {
      return { passed: false, code: 'TOKEN_LOSS', message: `chỉ giữ ${Math.round(tokenCoverage * 100)}% số liệu/trích dẫn`, lengthRatio, tokenCoverage };
    }

    const sourceFigures = [...sourceText.matchAll(/\bFigure\s+(\d+)/gi)].map(match => match[1]);
    const targetFigures = new Set([...targetText.matchAll(/\b(?:Figure|Hình)\s+(\d+)/gi)].map(match => match[1]));
    const missingFigures = [...new Set(sourceFigures)].filter(figure => !targetFigures.has(figure));
    if (missingFigures.length > 0) {
      return { passed: false, code: 'FIGURE_LOSS', message: `thiếu Hình ${missingFigures.join(', ')}`, lengthRatio, tokenCoverage };
    }

    return {
      passed: true,
      code: 'PASS',
      message: 'đạt kiểm tra',
      sourceLength,
      targetLength,
      lengthRatio,
      tokenCoverage
    };
  }

  async extractPdfChunkBase64(startPage, endPage) {
    const pdfLibInstance = window.PDFLib || (typeof PDFLib !== 'undefined' ? PDFLib : null);
    if (!pdfLibInstance) {
      throw new Error('Thư viện xử lý PDF (PDFLib) chưa nạp xong. Vui lòng tải lại trang (F5).');
    }

    // Use cached master document if available, or load once
    if (!this.pdfLibMasterDoc) {
      const freshArrayBuffer = await this.currentFile.arrayBuffer();
      this.pdfLibMasterDoc = await pdfLibInstance.PDFDocument.load(freshArrayBuffer);
    }

    const subDoc = await pdfLibInstance.PDFDocument.create();
    const pageCount = this.pdfLibMasterDoc.getPageCount();
    const pageIndices = [];
    for (let p = startPage; p <= endPage; p++) {
      if (p <= pageCount) {
        pageIndices.push(p - 1);
      }
    }

    if (pageIndices.length === 0) {
      throw new Error(`Không tìm thấy trang từ ${startPage} đến ${endPage}`);
    }

    const copiedPages = await subDoc.copyPages(this.pdfLibMasterDoc, pageIndices);
    copiedPages.forEach(page => subDoc.addPage(page));

    const subPdfBytes = await subDoc.save();
    return this.bytesToBase64(subPdfBytes);
  }

  bytesToBase64(bytes) {
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, chunk);
    }
    return window.btoa(binary);
  }

  async testApiKeyConnection() {
    const key = this.apiKeyInput.value.trim();
    if (!key) {
      if (this.apiKeyTestResult) {
        this.apiKeyTestResult.style.display = 'flex';
        this.apiKeyTestResult.className = 'api-test-result error';
        this.apiKeyTestResult.innerHTML = '<span>⚠️ Vui lòng dán mã API Key vào ô trên trước khi kiểm tra!</span>';
      }
      this.showToast('Vui lòng nhập API Key để kiểm tra!', 'warning');
      return;
    }

    this.testApiKeyBtn.disabled = true;
    this.testApiKeyBtn.textContent = 'Đang kiểm tra...';
    if (this.apiKeyTestResult) {
      this.apiKeyTestResult.style.display = 'flex';
      this.apiKeyTestResult.className = 'api-test-result loading';
      this.apiKeyTestResult.innerHTML = '<span>⏳ Đang kết nối tới máy chủ Google Gemini... (Vui lòng đợi vài giây)</span>';
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      // Query models list with key - fast 200ms check, 0 tokens consumed
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
      const res = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const rawMsg = errData.error?.message || `HTTP ${res.status}`;
        throw new Error(rawMsg);
      }

      const data = await res.json();
      if (!data.models || data.models.length === 0) {
        throw new Error('Google không trả về danh sách model cho Key này.');
      }
      this.availableModelNames = new Set(data.models
        .map(model => String(model.name || '').replace(/^models\//, ''))
        .filter(Boolean));

      // Auto-save key on success
      this.apiKey = key;
      localStorage.setItem('layouttrans_gemini_key', key);
      this.updateApiKeyStatus();

      if (this.apiKeyTestResult) {
        this.apiKeyTestResult.style.display = 'flex';
        this.apiKeyTestResult.className = 'api-test-result success';
        this.apiKeyTestResult.innerHTML = '<span>✅ <strong>KẾT NỐI THÀNH CÔNG!</strong> API Key hoàn toàn hợp lệ và đã tự động lưu. Bạn có thể đóng bảng này và bắt đầu dịch ngay!</span>';
      }
      this.showToast('✅ Kết nối Google Gemini API thành công!', 'success');
    } catch (err) {
      console.error('Lỗi kiểm tra API Key:', err);
      let friendlyMsg = err.message;
      if (err.name === 'AbortError') {
        friendlyMsg = 'Hết thời gian chờ (Timeout sau 10 giây). Vui lòng kiểm tra lại mạng Internet hoặc VPN!';
      } else if (err.message.includes('API key not valid')) {
        friendlyMsg = 'Mã API Key không hợp lệ! Vui lòng copy lại từ aistudio.google.com/api-keys';
      }

      if (this.apiKeyTestResult) {
        this.apiKeyTestResult.style.display = 'flex';
        this.apiKeyTestResult.className = 'api-test-result error';
        this.apiKeyTestResult.innerHTML = `<span>❌ <strong>LỖI:</strong> ${friendlyMsg}</span>`;
      }
      this.showToast(`Lỗi kết nối: ${friendlyMsg}`, 'error');
    } finally {
      this.testApiKeyBtn.disabled = false;
      this.testApiKeyBtn.textContent = 'Kiểm tra kết nối';
    }
  }

  renderChunkOutput(chunk) {
    let chunkBlock = document.getElementById(`chunk-block-${chunk.id}`);
    if (!chunkBlock) {
      chunkBlock = document.createElement('article');
      chunkBlock.className = 'book-chunk-block';
      chunkBlock.id = `chunk-block-${chunk.id}`;
      this.translatedContent.appendChild(chunkBlock);
    }

    chunkBlock.innerHTML = `
      <div class="chunk-header-pill">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span>Trang ${chunk.startPage} – ${chunk.endPage}</span>
        ${chunk.qa?.passed ? `<span class="chunk-qa-badge">QA đạt ${chunk.pageResults?.length || 0} trang</span>` : ''}
      </div>
      <div class="chunk-inner-content">
        ${chunk.translatedHtml}
      </div>
    `;

    this.bindChunkInteractiveActions(chunkBlock, chunk);

    // Render KaTeX math in the new chunk
    if (window.renderMathInElement) {
      renderMathInElement(chunkBlock, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true }
        ],
        throwOnError: false
      });
    }

    this.attachOriginalFigures(chunkBlock);
  }

  async getHighResPageCanvas(pageNum, scale = 3.0) {
    if (!this.pdfDoc || !Number.isInteger(pageNum) || pageNum < 1 || pageNum > this.totalPages) {
      return null;
    }
    const cacheKey = `${pageNum}@${scale}`;
    if (this.highResPageCanvasCache.has(cacheKey)) {
      return this.highResPageCanvasCache.get(cacheKey);
    }
    try {
      const page = await this.pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = Math.floor(viewport.width);
      offscreenCanvas.height = Math.floor(viewport.height);
      const ctx = offscreenCanvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      // Keep at most 12 pages in high-res cache to save RAM
      if (this.highResPageCanvasCache.size >= 12) {
        const oldestKey = this.highResPageCanvasCache.keys().next().value;
        this.highResPageCanvasCache.delete(oldestKey);
      }
      this.highResPageCanvasCache.set(cacheKey, offscreenCanvas);
      return offscreenCanvas;
    } catch (e) {
      console.warn(`Không thể render canvas 3x cho trang ${pageNum}:`, e);
      return null;
    }
  }

  cropBboxFromCanvas(sourceCanvas, bbox, rotationDeg = 0) {
    const [ymin, xmin, ymax, xmax] = bbox;
    const pad = 4; // subtle breathing room around cropped figure
    const safeXMin = Math.max(0, xmin - pad);
    const safeYMin = Math.max(0, ymin - pad);
    const safeXMax = Math.min(1000, xmax + pad);
    const safeYMax = Math.min(1000, ymax + pad);

    const cropX = Math.max(0, Math.floor((safeXMin / 1000) * sourceCanvas.width));
    const cropY = Math.max(0, Math.floor((safeYMin / 1000) * sourceCanvas.height));
    const cropW = Math.max(1, Math.min(sourceCanvas.width - cropX, Math.ceil(((safeXMax - safeXMin) / 1000) * sourceCanvas.width)));
    const cropH = Math.max(1, Math.min(sourceCanvas.height - cropY, Math.ceil(((safeYMax - safeYMin) / 1000) * sourceCanvas.height)));

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const ctx = cropCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cropW, cropH);
    ctx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // Auto-trim excess blank white margins around the figure while keeping a clean 12px border
    const trimmedCanvas = this.trimCanvasWhitespace(cropCanvas, 12);

    const normalizedRotation = ((Math.round(Number(rotationDeg) / 90) * 90) % 360 + 360) % 360;
    if (normalizedRotation === 0) {
      return trimmedCanvas.toDataURL('image/png');
    }

    const rotatedCanvas = document.createElement('canvas');
    const swapDims = normalizedRotation === 90 || normalizedRotation === 270;
    rotatedCanvas.width = swapDims ? trimmedCanvas.height : trimmedCanvas.width;
    rotatedCanvas.height = swapDims ? trimmedCanvas.width : trimmedCanvas.height;
    const rCtx = rotatedCanvas.getContext('2d');
    rCtx.imageSmoothingEnabled = true;
    rCtx.imageSmoothingQuality = 'high';
    rCtx.fillStyle = '#ffffff';
    rCtx.fillRect(0, 0, rotatedCanvas.width, rotatedCanvas.height);

    rCtx.save();
    if (normalizedRotation === 90) {
      rCtx.translate(rotatedCanvas.width, 0);
      rCtx.rotate(Math.PI / 2);
    } else if (normalizedRotation === 180) {
      rCtx.translate(rotatedCanvas.width, rotatedCanvas.height);
      rCtx.rotate(Math.PI);
    } else if (normalizedRotation === 270) {
      rCtx.translate(0, rotatedCanvas.height);
      rCtx.rotate(-Math.PI / 2);
    }
    rCtx.drawImage(trimmedCanvas, 0, 0);
    rCtx.restore();

    return rotatedCanvas.toDataURL('image/png');
  }

  trimCanvasWhitespace(canvas, marginPx = 12) {
    try {
      const w = canvas.width;
      const h = canvas.height;
      if (w < 40 || h < 40) return canvas;
      const ctx = canvas.getContext('2d');
      const imgData = ctx.getImageData(0, 0, w, h).data;
      let top = 0;
      let bottom = h - 1;
      let left = 0;
      let right = w - 1;

      const isRowBlank = y => {
        for (let x = 0; x < w; x += 2) {
          const idx = (y * w + x) * 4;
          if (imgData[idx] < 245 || imgData[idx + 1] < 245 || imgData[idx + 2] < 245) return false;
        }
        return true;
      };
      const isColBlank = x => {
        for (let y = top; y <= bottom; y += 2) {
          const idx = (y * w + x) * 4;
          if (imgData[idx] < 245 || imgData[idx + 1] < 245 || imgData[idx + 2] < 245) return false;
        }
        return true;
      };

      while (top < bottom - 20 && isRowBlank(top)) top++;
      while (bottom > top + 20 && isRowBlank(bottom)) bottom--;
      while (left < right - 20 && isColBlank(left)) left++;
      while (right > left + 20 && isColBlank(right)) right--;

      const padTop = Math.max(0, top - marginPx);
      const padLeft = Math.max(0, left - marginPx);
      const padBottom = Math.min(h - 1, bottom + marginPx);
      const padRight = Math.min(w - 1, right + marginPx);
      const newW = padRight - padLeft + 1;
      const newH = padBottom - padTop + 1;

      if (newW >= w - 6 && newH >= h - 6) return canvas;

      const out = document.createElement('canvas');
      out.width = newW;
      out.height = newH;
      const outCtx = out.getContext('2d');
      outCtx.fillStyle = '#ffffff';
      outCtx.fillRect(0, 0, newW, newH);
      outCtx.drawImage(canvas, padLeft, padTop, newW, newH, 0, 0, newW, newH);
      return out;
    } catch (e) {
      return canvas;
    }
  }

  rotateFigureBy(fig, pageNum, deltaDeg) {
    if (!fig) return;
    let bbox = null;
    try {
      const parsed = JSON.parse(fig.dataset.bbox || 'null');
      if (Array.isArray(parsed) && parsed.length === 4) bbox = parsed;
    } catch (e) {}
    if (!bbox) return;

    const currentRot = parseInt(fig.dataset.rotate || '0', 10) || 0;
    const nextRot = ((currentRot + deltaDeg) % 360 + 360) % 360;
    fig.dataset.rotate = String(nextRot);

    this.refreshCroppedFigureImage(fig, pageNum, bbox, nextRot);
  }

  expandFigureCrop(fig, pageNum) {
    if (!fig) return;
    let bbox = null;
    try {
      const parsed = JSON.parse(fig.dataset.bbox || 'null');
      if (Array.isArray(parsed) && parsed.length === 4) bbox = parsed;
    } catch (e) {}
    if (!bbox) return;

    const [ymin, xmin, ymax, xmax] = bbox;
    const expanded = [
      Math.max(0, Math.round(ymin - 55)),
      Math.max(0, Math.round(xmin - 40)),
      Math.min(1000, Math.round(ymax + 55)),
      Math.min(1000, Math.round(xmax + 40))
    ];
    fig.dataset.bbox = JSON.stringify(expanded);
    const currentRot = parseInt(fig.dataset.rotate || '0', 10) || 0;
    this.refreshCroppedFigureImage(fig, pageNum, expanded, currentRot);
    this.showToast('📐 Đã mở rộng vùng cắt hình ra các phía!', 'info');
  }

  refreshCroppedFigureImage(fig, pageNum, bbox, rotationDeg) {
    const imgEl = fig.querySelector('img.original-cropped-figure');
    const pageWrapper = document.getElementById(`pdf-page-${pageNum}`);
    const previewCanvas = pageWrapper ? pageWrapper.querySelector('canvas') : null;

    if (previewCanvas && imgEl) {
      const quickUrl = this.cropBboxFromCanvas(previewCanvas, bbox, rotationDeg);
      imgEl.src = quickUrl;
      if (this.activeLightboxFigure === fig && this.figureLightboxImg) {
        this.figureLightboxImg.src = quickUrl;
      }
    }

    this.getHighResPageCanvas(pageNum, 3.0).then(highResCanvas => {
      if (highResCanvas && imgEl && imgEl.isConnected) {
        const hiUrl = this.cropBboxFromCanvas(highResCanvas, bbox, rotationDeg);
        imgEl.src = hiUrl;
        if (this.activeLightboxFigure === fig && this.figureLightboxImg) {
          this.figureLightboxImg.src = hiUrl;
        }
      }
    });
  }

  openFigureLightbox(fig, pageNum) {
    if (!this.figureLightboxModal || !fig) return;
    const imgEl = fig.querySelector('img.original-cropped-figure');
    if (!imgEl || !imgEl.src) return;

    this.activeLightboxFigure = fig;
    this.activeLightboxPageNum = pageNum;
    this.figureLightboxImg.src = imgEl.src;
    const captionEl = fig.querySelector('figcaption');
    const translationBoxEl = fig.querySelector('.figure-translation-box');
    const titleText = captionEl
      ? (captionEl.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90)
      : `Hình minh họa (Trang nguồn ${pageNum})`;
    if (this.figureLightboxTitle) {
      this.figureLightboxTitle.textContent = `🔍 ${titleText}`;
    }

    if (this.figureLightboxDetails) {
      this.figureLightboxDetails.innerHTML = '';
      if (captionEl) {
        const capClone = document.createElement('div');
        capClone.className = 'callout';
        capClone.style.margin = '0';
        capClone.innerHTML = captionEl.innerHTML;
        this.figureLightboxDetails.appendChild(capClone);
      }
      if (translationBoxEl) {
        this.figureLightboxDetails.appendChild(translationBoxEl.cloneNode(true));
      } else {
        const emptyNote = document.createElement('p');
        emptyNote.className = 'help-text';
        emptyNote.textContent = 'Hình này không có bảng tách thành phần chữ riêng.';
        this.figureLightboxDetails.appendChild(emptyNote);
      }
    }

    this.figureLightboxModal.style.display = 'flex';
  }

  closeFigureLightbox() {
    if (this.figureLightboxModal) {
      this.figureLightboxModal.style.display = 'none';
    }
    this.activeLightboxFigure = null;
    this.activeLightboxPageNum = null;
  }

  attachOriginalFigures(container) {
    if (!container) return;
    const figures = container.querySelectorAll('.paper-figure, .book-figure, figure[data-page]');
    figures.forEach(fig => {
      // Always convert any legacy overlay labels into a clean structured table below the image
      this.upgradeFigureOverlaysToTable(fig);

      let pageNum = parseInt(fig.dataset.page, 10);
      if (isNaN(pageNum)) {
        const sectionEl = fig.closest('section.source-page[data-source-page]');
        if (sectionEl) pageNum = parseInt(sectionEl.dataset.sourcePage, 10);
      }
      if (isNaN(pageNum)) {
        const chunkBlock = fig.closest('.book-chunk-block');
        if (chunkBlock && chunkBlock.id) {
          const chunkId = parseInt(chunkBlock.id.replace('chunk-block-', ''), 10);
          const chunkObj = this.chunks.find(c => c.id === chunkId);
          if (chunkObj) pageNum = chunkObj.startPage;
        }
      }

      const diagram = fig.querySelector('.translated-diagram');
      let slot = fig.querySelector('.figure-image-slot') || fig.querySelector('.figure-image-container');

      // If figure has a translated diagram, attach a toggle bar and a companion original image slot
      if (diagram && !slot && !fig.querySelector('.figure-view-bar')) {
        const viewBar = document.createElement('div');
        viewBar.className = 'figure-view-bar';
        viewBar.innerHTML = `
          <div class="figure-tabs">
            <button class="fig-tab-btn active" type="button" data-view="translated">✨ Sơ đồ đã dịch</button>
            <button class="fig-tab-btn" type="button" data-view="original">📷 Hình gốc đối chiếu (Trang ${pageNum})</button>
          </div>
        `;
        fig.insertBefore(viewBar, diagram);

        const imgContainer = document.createElement('div');
        imgContainer.className = 'figure-image-slot';
        imgContainer.style.display = 'none';
        fig.insertBefore(imgContainer, diagram.nextSibling);
        slot = imgContainer;

        const tabBtns = viewBar.querySelectorAll('.fig-tab-btn');
        tabBtns.forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (btn.dataset.view === 'translated') {
              diagram.style.display = 'flex';
              imgContainer.style.display = 'none';
            } else {
              diagram.style.display = 'none';
              imgContainer.style.display = 'flex';
            }
          });
        });
      }

      if (!slot) return;
      if (slot.querySelector('img.original-cropped-figure')) return; // Already attached

      const pageWrapper = document.getElementById(`pdf-page-${pageNum}`);
      const previewCanvas = pageWrapper ? pageWrapper.querySelector('canvas') : null;
      if (!previewCanvas && !this.pdfDoc) {
        slot.innerHTML = `
          <div class="figure-orig-tag">
            <span>📷 Hình gốc nằm tại <strong>Trang ${pageNum}</strong> của bản PDF</span>
          </div>`;
        return;
      }

      try {
        let bbox = null;
        const bboxStr = fig.dataset.bbox;
        if (bboxStr) {
          try {
            const parsed = JSON.parse(bboxStr);
            if (Array.isArray(parsed) && parsed.length === 4) {
              bbox = parsed;
            }
          } catch (e) {}
        }

        if (!bbox) {
          slot.innerHTML = `
            <div class="figure-orig-tag">
              <span>⚠️ Chưa xác định được vùng hình gốc ở <strong>Trang ${pageNum}</strong>; bấm nút Đối chiếu để xem trực tiếp trên PDF.</span>
            </div>`;
          return;
        }

        // Automatically refine crop bbox (strip adjacent horizontal text columns) and detect 90°/270° rotated sideways figures/tables
        const explicitRotate = parseInt(fig.dataset.rotate || '0', 10) || 0;
        const refined = this.resolveFigureCropAndRotation(pageNum, bbox, explicitRotate);
        bbox = refined.bbox;
        const rotationDeg = refined.rotation || 0;
        fig.dataset.bbox = JSON.stringify(bbox);
        fig.dataset.rotate = String(rotationDeg);

        const initialDataUrl = previewCanvas ? this.cropBboxFromCanvas(previewCanvas, bbox, rotationDeg) : '';
        slot.innerHTML = `
          <div class="cropped-figure-wrapper">
            <div class="cropped-figure-stage">
              <img src="${initialDataUrl}" class="original-cropped-figure" alt="Hình gốc nét cao từ trang ${pageNum}" title="Bấm vào hình để phóng to độ phân giải cao (3x)" />
            </div>
            <div class="figure-action-bar">
              ${refined.autoRotated ? '<span class="figure-auto-rotated-badge" title="Đã tự động lấy trọn vẹn toàn bộ cột của bảng/hình dọc và xoay ngang 90°">✨ Đã tự lấy đủ hình & xoay ngang 90°</span>' : ''}
              <button class="figure-rotate-btn figure-rotate-left-btn" type="button" title="Xoay hình ngược chiều kim đồng hồ 90°">
                <span>↺ Xoay trái 90°</span>
              </button>
              <button class="figure-rotate-btn figure-rotate-right-btn" type="button" title="Xoay hình thuận chiều kim đồng hồ 90°">
                <span>↻ Xoay phải 90°</span>
              </button>
              <button class="figure-rotate-btn figure-expand-crop-btn" type="button" title="Mở rộng thêm vùng cắt xung quanh hình nếu hình bị sát lề">
                <span>📐 Mở rộng cắt</span>
              </button>
              <button class="figure-lightbox-btn" type="button" title="Phóng to hình nét cao kèm bảng dịch thành phần">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                <span>Phóng to Hình & Bảng dịch</span>
              </button>
              <button class="figure-zoom-btn" type="button" title="Cuộn sang vị trí hình trên PDF gốc">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <span>Đối chiếu Trang ${pageNum}</span>
              </button>
            </div>
          </div>
        `;

        const imgEl = slot.querySelector('img.original-cropped-figure');
        // Upgrade image to ultra-crisp 3.0x High-DPI offscreen render asynchronously so it is never grainy ("không bị sạn")
        this.getHighResPageCanvas(pageNum, 3.0).then(highResCanvas => {
          if (highResCanvas && imgEl && imgEl.isConnected) {
            const currentRot = parseInt(fig.dataset.rotate || String(rotationDeg), 10) || 0;
            imgEl.src = this.cropBboxFromCanvas(highResCanvas, bbox, currentRot);
          }
        });

        if (imgEl) {
          imgEl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openFigureLightbox(fig, pageNum);
          });
        }

        const rotateLeftBtn = slot.querySelector('.figure-rotate-left-btn');
        if (rotateLeftBtn) {
          rotateLeftBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.rotateFigureBy(fig, pageNum, -90);
          });
        }

        const rotateRightBtn = slot.querySelector('.figure-rotate-right-btn');
        if (rotateRightBtn) {
          rotateRightBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.rotateFigureBy(fig, pageNum, 90);
          });
        }

        const expandCropBtn = slot.querySelector('.figure-expand-crop-btn');
        if (expandCropBtn) {
          expandCropBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.expandFigureCrop(fig, pageNum);
          });
        }

        const lightboxBtn = slot.querySelector('.figure-lightbox-btn');
        if (lightboxBtn) {
          lightboxBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openFigureLightbox(fig, pageNum);
          });
        }

        const zoomBtn = slot.querySelector('.figure-zoom-btn');
        if (zoomBtn) {
          zoomBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.jumpToPdfPage(pageNum);
          });
        }
      } catch (err) {
        console.warn('Lỗi cắt hình từ canvas:', err);
      }
    });
  }

  getExportBaseName() {
    if (!this.currentFile) return 'LTA_Tai_lieu_dich';
    const rawName = this.currentFile.name.replace(/\.[^/.]+$/, "");
    return `LTA_${rawName}`;
  }

  updateProgressUI() {
    const total = this.totalPages;
    if (total === 0) return;

    const completed = this.chunks.reduce((count, chunk) => (
      count + (chunk.pageResults || []).filter(pageResult => pageResult?.qa?.passed).length
    ), 0);
    const countIncompletePages = chunks => chunks.reduce((count, chunk) => {
      if (chunk.status !== 'error') return count;
      const passedPages = new Set((chunk.pageResults || [])
        .filter(pageResult => pageResult?.qa?.passed)
        .map(pageResult => pageResult.pageNum));
      return count + this.getChunkPageNumbers(chunk).filter(pageNum => !passedPages.has(pageNum)).length;
    }, 0);
    const qaFailed = countIncompletePages(this.chunks.filter(chunk => chunk.failureKind === 'qa'));
    const servicePending = countIncompletePages(this.chunks.filter(chunk => chunk.failureKind === 'service'));
    const otherFailed = countIncompletePages(this.chunks.filter(chunk => !['qa', 'service'].includes(chunk.failureKind)));
    const pct = Math.round((completed / total) * 100);
    const statusParts = [];
    if (qaFailed) statusParts.push(`${qaFailed} trang chưa đạt QA`);
    if (servicePending) statusParts.push(`${servicePending} trang chưa dịch xong do dịch vụ`);
    if (otherFailed) statusParts.push(`${otherFailed} trang lỗi cấu hình`);

    this.progressBarFill.style.width = `${pct}%`;
    this.progressText.textContent = `Đã xác minh ${completed}/${total} trang (${pct}%)${statusParts.length ? ` • ${statusParts.join(' • ')}` : ''}`;
  }

  ensureExportReady(formatName) {
    const incompletePages = this.getIncompletePageNumbers();
    if (this.chunks.length === 0 || incompletePages.length > 0) {
      const pages = incompletePages.slice(0, 8).join(', ');
      const more = incompletePages.length > 8 ? '…' : '';
      this.showToast(`Chưa thể xuất ${formatName}: còn ${incompletePages.length || this.totalPages} trang chưa dịch xong hoặc chưa đạt QA${pages ? ` (${pages}${more})` : ''}.`, 'warning');
      const firstIncompletePage = incompletePages[0];
      const firstIncompleteChunk = this.chunks.find(chunk => firstIncompletePage >= chunk.startPage && firstIncompletePage <= chunk.endPage);
      if (firstIncompleteChunk) {
        document.getElementById(`chunk-block-${firstIncompleteChunk.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }
    return true;
  }

  // ==================== Export Capabilities ====================

  dataUrlToUint8Array(dataUrl) {
    try {
      const parts = String(dataUrl || '').split(',');
      if (parts.length < 2) return null;
      const binary = window.atob(parts[1]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch (e) {
      return null;
    }
  }

  getPngDimensions(bytes) {
    if (!bytes || bytes.length < 24) return { width: 600, height: 360 };
    // PNG IHDR chunk stores big-endian width at bytes 16..19 and height at bytes 20..23
    const width = ((bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]) >>> 0;
    const height = ((bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]) >>> 0;
    if (width > 0 && width < 20000 && height > 0 && height < 20000) {
      return { width, height };
    }
    return { width: 600, height: 360 };
  }

  detectVisualFigureBboxesOnCanvas(pageNum, sourceCanvas) {
    if (!sourceCanvas) return [];
    const profile = this.getSourcePageProfile(pageNum);
    const items = Array.isArray(profile?.textItems) ? profile.textItems : [];

    // 1. Check if page has a sideways rotated table/figure
    const rotatedItems = items.filter(i => i.rotation === 90 || i.rotation === 270);
    const rotatedChars = rotatedItems.reduce((sum, i) => sum + (i.text || '').length, 0);
    const results = [];
    if (rotatedItems.length >= 3 && rotatedChars >= 25) {
      const refined = this.resolveFigureCropAndRotation(pageNum, [40, 40, 960, 960], 0);
      if (refined?.autoRotated && Array.isArray(refined.bbox)) {
        const capItem = items.find(i => /^(?:table|figure|fig\.?)\s*\d+/i.test(i.text || ''));
        results.push({
          bbox: refined.bbox,
          rotation: refined.rotation || 90,
          caption: capItem ? capItem.text : `Table / Figure (Page ${pageNum})`
        });
      }
    }

    // 2. Detect non-rotated visual figures/charts/diagrams by erasing normal horizontal prose on a low-res mask
    try {
      const maskW = 200;
      const maskH = 280;
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = maskW;
      maskCanvas.height = maskH;
      const mCtx = maskCanvas.getContext('2d');
      mCtx.fillStyle = '#ffffff';
      mCtx.fillRect(0, 0, maskW, maskH);
      mCtx.drawImage(sourceCanvas, 0, 0, maskW, maskH);

      // Erase page margins (running headers/footers)
      mCtx.fillStyle = '#ffffff';
      mCtx.fillRect(0, 0, maskW, Math.round(maskH * 0.055));
      mCtx.fillRect(0, Math.round(maskH * 0.94), maskW, Math.ceil(maskH * 0.06));
      mCtx.fillRect(0, 0, Math.round(maskW * 0.045), maskH);
      mCtx.fillRect(Math.round(maskW * 0.955), 0, Math.ceil(maskW * 0.05), maskH);

      // Erase horizontal text items AND any already-detected rotated regions so only unrotated graphics/charts remain
      items.forEach(item => {
        const [y0, x0, y1, x1] = item.bbox || [];
        if (!Number.isFinite(y0)) return;
        const padX = 3;
        const padY = 2;
        const rx = Math.max(0, Math.floor((x0 / 1000) * maskW) - padX);
        const ry = Math.max(0, Math.floor((y0 / 1000) * maskH) - padY);
        const rw = Math.min(maskW - rx, Math.ceil(((x1 - x0) / 1000) * maskW) + padX * 2);
        const rh = Math.min(maskH - ry, Math.ceil(((y1 - y0) / 1000) * maskH) + padY * 2);
        mCtx.fillRect(rx, ry, rw, rh);
      });
      results.forEach(r => {
        const [y0, x0, y1, x1] = r.bbox;
        mCtx.fillRect(
          Math.floor((x0 / 1000) * maskW) - 4,
          Math.floor((y0 / 1000) * maskH) - 4,
          Math.ceil(((x1 - x0) / 1000) * maskW) + 8,
          Math.ceil(((y1 - y0) / 1000) * maskH) + 8
        );
      });

      const imgData = mCtx.getImageData(0, 0, maskW, maskH).data;
      const rowInk = new Int32Array(maskH);
      for (let y = 0; y < maskH; y++) {
        let count = 0;
        for (let x = 0; x < maskW; x++) {
          const idx = (y * maskW + x) * 4;
          if (imgData[idx] < 236 || imgData[idx + 1] < 236 || imgData[idx + 2] < 236) {
            count++;
          }
        }
        rowInk[y] = count;
      }

      // Group active graphic rows into vertical bands (allowing small gaps up to 5 rows)
      const bands = [];
      let bandStart = -1;
      let gapCount = 0;
      for (let y = 0; y < maskH; y++) {
        if (rowInk[y] >= 4) {
          if (bandStart === -1) bandStart = y;
          gapCount = 0;
        } else if (bandStart !== -1) {
          gapCount++;
          if (gapCount > 6) {
            bands.push([bandStart, y - gapCount]);
            bandStart = -1;
            gapCount = 0;
          }
        }
      }
      if (bandStart !== -1) bands.push([bandStart, maskH - 1]);

      bands.forEach(([by0, by1]) => {
        const bandH = by1 - by0 + 1;
        if (bandH < Math.round(maskH * 0.08)) return; // must be at least 8% of page height
        let bx0 = maskW;
        let bx1 = 0;
        let inkPixels = 0;
        for (let y = by0; y <= by1; y++) {
          for (let x = 0; x < maskW; x++) {
            const idx = (y * maskW + x) * 4;
            if (imgData[idx] < 236 || imgData[idx + 1] < 236 || imgData[idx + 2] < 236) {
              if (x < bx0) bx0 = x;
              if (x > bx1) bx1 = x;
              inkPixels++;
            }
          }
        }
        const bandW = bx1 - bx0 + 1;
        if (bandW < Math.round(maskW * 0.18)) return;
        const area = bandW * bandH;
        if (inkPixels < 55 || inkPixels / area < 0.015) return;

        // Expand slightly in 0..1000 space to include figure labels/axes
        const ymin = Math.max(35, Math.round((by0 / maskH) * 1000) - 18);
        const xmin = Math.max(35, Math.round((bx0 / maskW) * 1000) - 18);
        const ymax = Math.min(960, Math.round((by1 / maskH) * 1000) + 22);
        const xmax = Math.min(965, Math.round((bx1 / maskW) * 1000) + 18);

        const nearbyCaption = items.find(i => (
          i.rotation === 0
          && /^(?:fig(?:ure)?\.?|table|scheme)\s*\d+/i.test(i.text || '')
          && i.bbox[0] >= ymin - 60
          && i.bbox[2] <= ymax + 85
        ));
        results.push({
          bbox: [ymin, xmin, ymax, xmax],
          rotation: 0,
          caption: nearbyCaption ? nearbyCaption.text : `Figure (Page ${pageNum})`
        });
      });
    } catch (e) {
      console.warn('Auto figure detection fallback:', e);
    }

    return results;
  }

  async extractSourcePageFigures(pageNum) {
    const highResCanvas = await this.getHighResPageCanvas(pageNum, 2.5);
    const pageWrapper = document.getElementById(`pdf-page-${pageNum}`);
    const previewCanvas = pageWrapper ? pageWrapper.querySelector('canvas') : null;
    const sourceCanvas = highResCanvas || previewCanvas;
    if (!sourceCanvas) return [];

    const figureSpecs = [];
    const seenKeys = new Set();
    const addSpec = (bbox, rotation, caption) => {
      if (!Array.isArray(bbox) || bbox.length !== 4) return;
      const refined = this.resolveFigureCropAndRotation(pageNum, bbox, rotation || 0);
      const finalBbox = refined.bbox || bbox;
      const finalRot = refined.rotation || rotation || 0;
      const key = `${Math.round(finalBbox[0] / 25)}_${Math.round(finalBbox[1] / 25)}_${Math.round(finalBbox[2] / 25)}_${Math.round(finalBbox[3] / 25)}_${finalRot}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      figureSpecs.push({ bbox: finalBbox, rotation: finalRot, caption: caption || '' });
    };

    // 1. Check translated/cached <figure> elements for this page
    const domFigures = [
      ...this.translatedContent.querySelectorAll(`figure[data-page="${pageNum}"][data-bbox], section.source-page[data-source-page="${pageNum}"] figure[data-bbox]`)
    ];
    domFigures.forEach(fig => {
      try {
        const parsed = JSON.parse(fig.getAttribute('data-bbox') || 'null');
        const rot = parseInt(fig.getAttribute('data-rotate') || '0', 10) || 0;
        const cap = (fig.querySelector('figcaption')?.textContent || '').replace(/\s+/g, ' ').trim();
        addSpec(parsed, rot, cap);
      } catch (e) {}
    });

    if (figureSpecs.length === 0) {
      this.chunks.forEach(c => {
        (c.pageResults || []).forEach(pr => {
          if (pr.pageNum !== pageNum || !pr.html) return;
          const tpl = document.createElement('template');
          tpl.innerHTML = pr.html;
          tpl.content.querySelectorAll('figure[data-bbox]').forEach(fig => {
            try {
              const parsed = JSON.parse(fig.getAttribute('data-bbox') || 'null');
              const rot = parseInt(fig.getAttribute('data-rotate') || '0', 10) || 0;
              const cap = (fig.querySelector('figcaption')?.textContent || '').replace(/\s+/g, ' ').trim();
              addSpec(parsed, rot, cap);
            } catch (e) {}
          });
        });
      });
    }

    // 2. If no translated figures exist yet for this page, run automatic visual & rotated-table detection on the PDF page
    if (figureSpecs.length === 0) {
      const autoDetected = this.detectVisualFigureBboxesOnCanvas(pageNum, sourceCanvas);
      autoDetected.forEach(spec => addSpec(spec.bbox, spec.rotation, spec.caption));
    }

    const extracted = [];
    for (const spec of figureSpecs) {
      try {
        const dataUrl = this.cropBboxFromCanvas(sourceCanvas, spec.bbox, spec.rotation);
        const uint8Array = this.dataUrlToUint8Array(dataUrl);
        if (!uint8Array) continue;
        const { width, height } = this.getPngDimensions(uint8Array);
        extracted.push({
          ...spec,
          dataUrl,
          uint8Array,
          width,
          height
        });
      } catch (e) {
        console.warn(`Không thể cắt hình trang ${pageNum}:`, e);
      }
    }
    return extracted;
  }

  formatSourcePageStructuredParagraphs(profile, excludeFigures = []) {
    const items = Array.isArray(profile?.textItems) ? profile.textItems : [];
    if (items.length === 0) {
      const raw = String(profile?.text || '').trim();
      return raw ? [{ type: 'paragraph', text: raw }] : [];
    }

    // Filter out rotated vertical text if a rotated figure/table image is already extracted for this page,
    // and filter out text labels strictly inside extracted figure bounding boxes.
    const hasRotatedFigureImage = excludeFigures.some(f => f.rotation === 90 || f.rotation === 270);
    const filteredItems = items.filter(item => {
      const text = String(item.text || '').trim();
      if (!text) return false;
      if (hasRotatedFigureImage && (item.rotation === 90 || item.rotation === 270)) return false;
      const [y0, x0, y1, x1] = item.bbox || [];
      // Skip tiny page number or running header/footer at top/bottom edge
      if ((y1 < 42 || y0 > 948) && text.length < 75) return false;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const insideFigure = excludeFigures.some(fig => {
        const [fy0, fx0, fy1, fx1] = fig.bbox || [];
        return cy >= fy0 + 6 && cy <= fy1 - 6 && cx >= fx0 + 6 && cx <= fx1 - 6;
      });
      return !insideFigure;
    });

    if (filteredItems.length === 0) return [];

    // Group items into reading columns (full-width header -> left column -> right column for 2-column pages)
    const buildColumnLines = colItems => {
      const sorted = [...colItems].sort((a, b) => {
        const ay = (a.bbox[0] + a.bbox[2]) / 2;
        const by = (b.bbox[0] + b.bbox[2]) / 2;
        if (Math.abs(ay - by) > 4.5) return ay - by;
        return a.bbox[1] - b.bbox[1];
      });

      const lines = [];
      let currentParts = [];
      let currentYMin = null;
      let currentYMax = null;
      let currentXMin = null;
      let currentXMax = null;

      const flush = () => {
        const lineText = currentParts.join(' ').replace(/\s+/g, ' ').trim();
        if (lineText) {
          lines.push({
            text: lineText,
            ymin: currentYMin,
            ymax: currentYMax,
            xmin: currentXMin,
            xmax: currentXMax,
            height: Math.max(4, (currentYMax || 0) - (currentYMin || 0))
          });
        }
        currentParts = [];
        currentYMin = null;
        currentYMax = null;
        currentXMin = null;
        currentXMax = null;
      };

      sorted.forEach(item => {
        const [y0, x0, y1, x1] = item.bbox;
        const cy = (y0 + y1) / 2;
        const lineCy = currentYMin !== null && currentYMax !== null ? (currentYMin + currentYMax) / 2 : null;
        if (currentParts.length > 0 && lineCy !== null && Math.abs(cy - lineCy) > 5) {
          flush();
        }
        currentParts.push(String(item.text || '').trim());
        currentYMin = currentYMin === null ? y0 : Math.min(currentYMin, y0);
        currentYMax = currentYMax === null ? y1 : Math.max(currentYMax, y1);
        currentXMin = currentXMin === null ? x0 : Math.min(currentXMin, x0);
        currentXMax = currentXMax === null ? x1 : Math.max(currentXMax, x1);
      });
      flush();
      return lines;
    };

    let orderedLines = [];
    if (profile?.columnCount === 2) {
      const topSpanning = [];
      const leftCol = [];
      const rightCol = [];
      filteredItems.forEach(item => {
        const [, x0, y1, x1] = item.bbox;
        const cx = (x0 + x1) / 2;
        if ((x0 < 380 && x1 > 620) || (y1 < 220 && (x1 - x0) > 480)) {
          topSpanning.push(item);
        } else if (cx < 500) {
          leftCol.push(item);
        } else {
          rightCol.push(item);
        }
      });
      orderedLines = [
        ...buildColumnLines(topSpanning),
        ...buildColumnLines(leftCol),
        ...buildColumnLines(rightCol)
      ];
    } else {
      orderedLines = buildColumnLines(filteredItems);
    }

    // Merge lines into paragraphs and headings
    const blocks = [];
    let paraLines = [];
    let prevLine = null;

    const flushPara = () => {
      if (paraLines.length === 0) return;
      let combined = '';
      paraLines.forEach(line => {
        if (!combined) {
          combined = line;
        } else if (/[A-Za-z]-$/.test(combined) && /^[a-z]/.test(line)) {
          combined = combined.slice(0, -1) + line;
        } else {
          combined += ' ' + line;
        }
      });
      const clean = combined.replace(/\s+/g, ' ').trim();
      if (clean) {
        const isHeading = paraLines.length <= 2
          && clean.length <= 110
          && !/[.;:,]$/.test(clean)
          && (/^(?:abstract|introduction|background|methods?|results?|discussion|conclusions?|references|acknowledg|supplementary|\d+(?:\.\d+)*\s+[A-Z])/i.test(clean)
            || (paraLines.length === 1 && clean.split(/\s+/).length <= 9 && /^[A-Z]/.test(clean)));
        blocks.push({
          type: isHeading ? 'heading' : 'paragraph',
          text: clean
        });
      }
      paraLines = [];
    };

    orderedLines.forEach(line => {
      if (prevLine) {
        const yGap = line.ymin - prevLine.ymax;
        const colJump = Math.abs(line.xmin - prevLine.xmin) > 180;
        const prevEndedSentence = /[.!?:]$/.test(prevLine.text) && (prevLine.xmax - prevLine.xmin) < 280;
        if (yGap > 13 || yGap < -20 || colJump || prevEndedSentence) {
          flushPara();
        }
      }
      paraLines.push(line.text);
      prevLine = line;
    });
    flushPara();

    return blocks;
  }

  formatSourcePageText(profile) {
    const items = Array.isArray(profile?.textItems) ? profile.textItems : [];
    if (items.length === 0) return String(profile?.text || '').trim();

    const lines = [];
    let lineParts = [];
    let lineY = null;
    const flushLine = () => {
      const line = lineParts.join(' ').replace(/\s+/g, ' ').trim();
      if (line) lines.push(line);
      lineParts = [];
      lineY = null;
    };

    items.forEach(item => {
      const text = String(item.text || '').trim();
      if (!text) return;
      const bbox = item.bbox || [];
      const y = Number.isFinite(bbox[0]) && Number.isFinite(bbox[2])
        ? (bbox[0] + bbox[2]) / 2
        : null;
      if (lineParts.length && y !== null && lineY !== null && Math.abs(y - lineY) > 5) flushLine();
      if (lineY === null && y !== null) lineY = y;
      lineParts.push(text);
      if (item.hasEOL) flushLine();
    });
    flushLine();

    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  buildSourceTextMarkdown() {
    const title = this.currentFile?.name || 'PDF nguồn';
    const sections = this.sourcePageProfiles.map(profile => {
      const blocks = this.formatSourcePageStructuredParagraphs(profile, []);
      const body = blocks.length > 0
        ? blocks.map(b => (b.type === 'heading' ? `### ${b.text}` : b.text)).join('\n\n')
        : (this.formatSourcePageText(profile) || '*(Không trích xuất được lớp văn bản ở trang này.)*');
      return `## Trang nguồn ${profile.pageNum}\n\n${body}`;
    });
    return `# ${title} — Văn bản gốc trích xuất\n\n> Trích xuất từ lớp văn bản có sẵn trong PDF bằng PDF.js (định dạng Markdown gọn nhẹ không kèm ảnh; chọn **Xuất Bản gốc Word (.docx)** hoặc **Xuất Bản gốc HTML (.html)** nếu muốn chèn đầy đủ hình minh họa trong bài).\n\n${sections.join('\n\n---\n\n')}\n`;
  }

  async buildSourceTextHtml() {
    const title = this.currentFile?.name || 'PDF nguồn';
    const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character]));

    const sectionHtmlList = [];
    for (const profile of this.sourcePageProfiles) {
      const figures = await this.extractSourcePageFigures(profile.pageNum);
      const blocks = this.formatSourcePageStructuredParagraphs(profile, figures);
      const figuresHtml = figures.map(fig => `
        <figure class="source-figure">
          <img src="${fig.dataUrl}" alt="${escapeHtml(fig.caption || `Figure Page ${profile.pageNum}`)}" />
          ${fig.caption ? `<figcaption>${escapeHtml(fig.caption)}</figcaption>` : ''}
        </figure>
      `).join('\n');

      const paragraphsHtml = blocks.length > 0
        ? blocks.map(b => (b.type === 'heading' ? `<h3>${escapeHtml(b.text)}</h3>` : `<p>${escapeHtml(b.text)}</p>`)).join('\n')
        : `<pre>${escapeHtml(this.formatSourcePageText(profile) || 'Không trích xuất được lớp văn bản ở trang này.')}</pre>`;

      sectionHtmlList.push(`
        <section id="source-page-${profile.pageNum}">
          <h2>Trang nguồn ${profile.pageNum}</h2>
          ${figuresHtml}
          ${paragraphsHtml}
        </section>
      `);
    }

    const roles = this.resolveActiveTypographyRoles();
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — Bản gốc kèm hình minh họa</title>
  <style>
    :root { color-scheme: light; }
    body { max-width: 920px; margin: 0 auto; padding: 32px 24px; color: #1f2937; font-family: ${roles.body.css}; font-size: ${this.fontSize}px; line-height: 1.68; background: #fafafa; }
    h1, h2, h3 { font-family: ${roles.heading.css}; color: #0f172a; }
    h1 { font-size: ${this.h1Size}px; }
    h2 { margin: 0 0 14px; font-size: ${this.h2Size}px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
    h3 { margin: 18px 0 8px; font-size: ${this.h3Size}px; }
    p { margin: 0 0 14px; text-align: justify; }
    section { padding: 24px 0; border-bottom: 1px solid #dbe2ea; }
    .source-figure { margin: 20px 0; padding: 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; }
    .source-figure img { max-width: 100%; height: auto; border-radius: 4px; }
    .source-figure figcaption { margin-top: 8px; font-family: ${roles.caption.css}; font-style: ${roles.captionItalic ? 'italic' : 'normal'}; font-size: ${this.captionSize}px; color: #475569; }
    pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; }
    @media print { body { max-width: none; padding: 0; background: #fff; } section { break-inside: auto; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)} — Bản gốc kèm hình minh họa</h1>
  ${sectionHtmlList.join('\n')}
</body>
</html>`;
  }

  async exportSourceDocx() {
    if (!this.pdfDoc || this.sourcePageProfiles.length === 0) {
      this.showToast('Hãy nạp PDF trước khi xuất bản gốc Word (.docx).', 'warning');
      return;
    }

    try {
      this.showToast('⏳ Đang trích xuất văn bản gốc & cắt hình minh họa vào file Word (.docx)...', 'info');
      const title = this.getExportBaseName();
      const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType } = docx;
      const roles = this.resolveActiveTypographyRoles();
      const makeTextRun = (text, opts = {}) => new TextRun({
        text: String(text || ''),
        font: opts.font || roles.body.docx,
        ...opts
      });

      const docChildren = [
        new Paragraph({
          children: [makeTextRun(`${this.currentFile?.name || title} — Original Document`, { bold: true, font: roles.heading.docx })],
          heading: HeadingLevel.TITLE
        }),
        new Paragraph({ text: '' })
      ];

      let totalEmbeddedFigures = 0;

      for (const profile of this.sourcePageProfiles) {
        docChildren.push(
          new Paragraph({
            children: [makeTextRun(`--- Page ${profile.pageNum} ---`, { bold: true, font: roles.heading.docx })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 }
          })
        );

        const figures = await this.extractSourcePageFigures(profile.pageNum);
        const blocks = this.formatSourcePageStructuredParagraphs(profile, figures);

        // Insert cropped figures/tables for this page
        if (ImageRun && figures.length > 0) {
          figures.forEach(fig => {
            const maxW = 550;
            const maxH = 680;
            const scale = Math.min(1, maxW / Math.max(1, fig.width), maxH / Math.max(1, fig.height));
            const targetW = Math.max(140, Math.round(fig.width * scale));
            const targetH = Math.max(90, Math.round(fig.height * scale));

            docChildren.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: fig.uint8Array,
                    transformation: { width: targetW, height: targetH },
                    type: 'png'
                  })
                ],
                alignment: AlignmentType ? AlignmentType.CENTER : undefined,
                spacing: { before: 160, after: 80 }
              })
            );
            totalEmbeddedFigures += 1;

            if (fig.caption) {
              docChildren.push(
                new Paragraph({
                  children: [
                    makeTextRun(fig.caption, {
                      font: roles.caption.docx,
                      italics: roles.captionItalic
                    })
                  ],
                  alignment: AlignmentType ? AlignmentType.CENTER : undefined,
                  spacing: { after: 180 }
                })
              );
            }
          });
        }

        // Insert structured paragraphs and headings of the original text
        if (blocks.length > 0) {
          blocks.forEach(block => {
            if (block.type === 'heading') {
              docChildren.push(
                new Paragraph({
                  children: [makeTextRun(block.text, { bold: true, font: roles.heading.docx })],
                  heading: HeadingLevel.HEADING_3,
                  spacing: { before: 180, after: 80 }
                })
              );
            } else {
              docChildren.push(
                new Paragraph({
                  children: [makeTextRun(block.text, { font: roles.body.docx })],
                  spacing: { after: 140 }
                })
              );
            }
          });
        } else {
          const fallbackText = this.formatSourcePageText(profile);
          if (fallbackText) {
            fallbackText.split(/\n{2,}/).forEach(para => {
              const clean = para.trim();
              if (clean) {
                docChildren.push(
                  new Paragraph({
                    children: [makeTextRun(clean, { font: roles.body.docx })],
                    spacing: { after: 140 }
                  })
                );
              }
            });
          }
        }
      }

      const doc = new Document({
        sections: [{ children: docChildren }]
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}_ban_goc.docx`;
      a.click();
      URL.revokeObjectURL(url);

      this.showToast(
        `✅ Đã xuất Bản gốc Word: ${title}_ban_goc.docx (${this.totalPages} trang, đính kèm ${totalEmbeddedFigures} hình/bảng)!`,
        'success'
      );
    } catch (err) {
      console.error('Lỗi xuất Bản gốc Word (.docx):', err);
      this.showToast(`Lỗi tạo file Word bản gốc: ${err.message}`, 'error');
    }
  }

  async exportSourceText(format) {
    if (!this.pdfDoc || this.sourcePageProfiles.length === 0) {
      this.showToast('Hãy nạp PDF trước khi xuất bản gốc.', 'warning');
      return;
    }
    const hasText = this.sourcePageProfiles.some(profile => (
      String(profile.text || '').trim() || (profile.textItems || []).length > 0
    ));
    if (!hasText) {
      this.showToast('PDF này không có lớp văn bản để xuất. Có thể cần OCR cho file scan.', 'warning');
      return;
    }

    this.exportDropdown?.parentElement.classList.remove('open');
    const title = this.getExportBaseName();
    if (format === 'docx') {
      await this.exportSourceDocx();
    } else if (format === 'html') {
      this.showToast('⏳ Đang tạo file HTML bản gốc kèm hình...', 'info');
      const htmlContent = await this.buildSourceTextHtml();
      this.downloadFile(htmlContent, `${title}_ban_goc.html`, 'text/html;charset=utf-8');
      this.showToast(`✅ Đã xuất Bản gốc HTML kèm hình: ${title}_ban_goc.html`, 'success');
    } else {
      this.downloadFile(this.buildSourceTextMarkdown(), `${title}_text_goc.md`, 'text/markdown;charset=utf-8');
      this.showToast(`Đã xuất text gốc Markdown: ${title}_text_goc.md`, 'success');
    }
  }

  exportHtml() {
    if (!this.ensureExportReady('HTML')) return;

    const title = this.getExportBaseName();
    const roles = this.resolveActiveTypographyRoles();
    const headingCss = roles.heading.css;
    const bodyCss = roles.body.css;
    const captionCss = roles.caption.css;
    const captionStyle = roles.captionItalic ? 'italic' : 'normal';
    const exportFontSize = this.fontSize || 16;

    // Assemble all chunks with embedded high-DPI cropped author figures
    let allContent = '';
    this.chunks.forEach(c => {
      if (c.status === 'completed') {
        const chunkBlock = document.getElementById(`chunk-block-${c.id}`);
        let htmlToExport = chunkBlock
          ? chunkBlock.querySelector('.chunk-inner-content').innerHTML
          : c.translatedHtml;

        const cleanContainer = document.createElement('div');
        cleanContainer.innerHTML = htmlToExport;
        cleanContainer.querySelectorAll('.source-page-toolbar, .figure-action-bar, .chunk-retry-btn').forEach(el => el.remove());
        htmlToExport = cleanContainer.innerHTML;

        allContent += `
        <section class="book-section" id="page-section-${c.startPage}">
          ${htmlToExport}
        </section>`;
      }
    });

    const fullHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${title} — Bản dịch tiếng Việt</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body);"></script>
  <style>
    body {
      font-family: ${bodyCss};
      max-width: 940px;
      margin: 0 auto;
      padding: 3rem 1.5rem;
      background: #fafafa;
      color: #1e293b;
      line-height: 1.68;
      font-size: ${exportFontSize}px;
    }
    p, li, td, th { font-family: ${bodyCss}; font-size: ${exportFontSize}px; }
    h1, h2, h3, h4, .abstract-title, .callout-title { font-family: ${headingCss}; }
    h1 { font-size: ${this.h1Size}px; color: #0f172a; margin: 2rem 0 1rem; }
    h2 { font-size: ${this.h2Size}px; color: #0f172a; margin: 1.5rem 0 0.8rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.4rem; }
    h3 { font-size: ${this.h3Size}px; color: #0f172a; margin: 1.2rem 0 0.6rem; }
    p { margin-bottom: 1.2rem; text-align: justify; }
    .authors-block { margin: 1.5rem 0 2rem; padding: 0.5rem 0; display: flex; flex-direction: column; gap: 0.45rem; }
    .author-row { display: flex; justify-content: flex-start; align-items: baseline; gap: 2rem; padding: 3px 0; font-size: 0.94rem; }
    .author-name { font-weight: 700; color: #0f172a; min-width: 200px; flex-shrink: 0; }
    .author-affil { color: #64748b; font-size: 0.9rem; }
    .book-section, .source-page { margin: 0; padding: 0; }
    .source-page::before, .source-page-toolbar, .figure-action-bar { display: none !important; }
    .layout-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin: 1rem 0; }
    @media (max-width: 768px) { .layout-2col { grid-template-columns: 1fr; } .reference-entries { column-count: 1; } .author-row { flex-direction: column; gap: 0.2rem; } }
    .callout { background: #f8fafc; border-left: 4px solid #6366f1; padding: 1.2rem; border-radius: 8px; margin: 1.5rem 0; }
    .callout-title { font-weight: 700; margin-bottom: 0.5rem; color: #4338ca; }
    .table-scroll { width: 100%; max-width: 100%; overflow-x: auto; margin: 1.2rem 0; }
    .table-scroll table { width: max-content; min-width: 100%; border-collapse: collapse; margin: 0; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; }
    th { padding: 10px 14px; text-align: left; font-weight: 700; border-bottom: 1.5px solid #0f172a; }
    td { padding: 9px 14px; border-bottom: 1px solid #e2e8f0; vertical-align: top; overflow-wrap: anywhere; }
    .paper-figure, .figure-wrapper { margin: 2rem 0; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .figure-image-slot { width: 100%; display: flex; justify-content: center; margin-bottom: 1rem; }
    .cropped-figure-stage { position: relative; width: 100%; line-height: 0; }
    .original-cropped-figure { display: block; width: 100%; max-width: 100%; height: auto; border-radius: 4px; }
    .paper-figure > .figure-label-overlays, .figure-wrapper > .figure-label-overlays, .figure-label-overlay-layer, .translated-figure-label { display: none !important; }
    figcaption, .figure-caption { font-family: ${captionCss}; font-style: ${captionStyle}; font-size: ${this.captionSize}px; color: #334155; line-height: 1.6; text-align: justify; margin: 0.8rem 0; }
    figcaption strong { font-style: normal; }
    .figure-translation-box { margin-top: 0.9rem; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #ffffff; }
    .figure-translation-header { font-family: ${headingCss}; padding: 8px 14px; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; font-size: 0.85rem; font-weight: 700; color: #1e293b; }
    .figure-translation-table { width: 100%; border-collapse: collapse; font-size: ${Math.max(11, this.captionSize - 1)}px; line-height: 1.5; }
    .figure-translation-table th { background: #f8fafc; color: #334155; font-weight: 700; padding: 8px 12px; border-bottom: 1.5px solid #cbd5e1; font-size: 0.82rem; }
    .figure-translation-table td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .figure-translation-table tbody tr:nth-child(even) { background: #f8fafc; }
    .fig-comp-cell { width: 22%; font-weight: 600; color: #334155; }
    .fig-src-cell { width: 32%; color: #475569; font-family: monospace; font-size: 0.82rem; }
    .fig-vi-cell { width: 46%; color: #0f172a; font-weight: 500; }
    .references-list { font-size: 0.82rem; line-height: 1.35; }
    .reference-entries { column-count: 2; column-gap: 1.25rem; column-rule: 1px solid #e2e8f0; font-size: 0.82rem; line-height: 1.35; }
    .reference-entry { position: relative; padding-left: 2.35rem; margin: 0 0 0.42rem; break-inside: avoid-column; page-break-inside: avoid; overflow-wrap: anywhere; }
    .reference-number { position: absolute; top: 0; left: 0; width: 2rem; font-variant-numeric: tabular-nums; text-align: right; }
    .reference-text { display: inline; }
    @media print {
      @page { size: A4; margin: 1.4cm 1.3cm; }
      body { max-width: none; margin: 0; padding: 0; background: #fff; color: #111; font-size: ${+(9.2 * (this.fontSize / 16)).toFixed(2)}pt; line-height: 1.38; }
      .layout-2col { gap: 1.05rem; }
      .table-scroll { overflow: visible; margin: 0.45rem 0; }
      .table-scroll table { width: 100%; min-width: 0; }
      .paper-figure { break-inside: auto; page-break-inside: auto; margin: 0.55rem 0; padding: 0.4rem 0; }
      .figure-image-slot { break-inside: avoid; page-break-inside: avoid; }
      .original-cropped-figure { width: 100%; max-height: 11.5cm; object-fit: contain; }
      .figure-translation-table { font-size: 7.8pt; line-height: 1.3; }
      .figure-translation-table th, .figure-translation-table td { padding: 4pt 6pt; }
      table { break-inside: auto; }
      tr { break-inside: avoid; }
      .references-section { margin: 0.25rem 0 0; padding-top: 0; border-top: 0; break-inside: auto; page-break-inside: auto; }
      .references-section h2, .references-section h3 { margin: 0.35rem 0 0.3rem; font-size: 10pt; }
      .reference-entries { column-count: 2; column-gap: 1rem; column-rule: 0.35pt solid #cbd5e1; font-size: 7.8pt; line-height: 1.24; }
      .reference-entry { margin-bottom: 2.5pt; padding-left: 2.15rem; break-inside: avoid-column; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${allContent}
</body>
</html>`;

    this.downloadFile(fullHtml, `${title}.html`, 'text/html');
    this.showToast(`Đã xuất file Web HTML: ${title}.html`, 'success');
  }

  async exportDocx() {
    if (!this.ensureExportReady('Word')) return;

    try {
      this.showToast('Đang tạo file Word (.docx) kèm hình minh họa...', 'info');
      const title = this.getExportBaseName();

      const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } = docx;
      const roles = this.resolveActiveTypographyRoles();
      const makeTextRun = (text, opts = {}) => new TextRun({ text: String(text || ''), font: opts.font || roles.body.docx, ...opts });

      const docChildren = [
        new Paragraph({
          children: [makeTextRun(`${title} — Bản Dịch Tiếng Việt`, { bold: true, font: roles.heading.docx })],
          heading: HeadingLevel.TITLE
        }),
        new Paragraph({ text: "" })
      ];

      this.chunks.forEach(c => {
        if (c.status === 'completed') {
          docChildren.push(
            new Paragraph({
              children: [makeTextRun(`--- Trang ${c.startPage}${c.endPage !== c.startPage ? ` – ${c.endPage}` : ''} ---`, { bold: true, font: roles.heading.docx })],
              heading: HeadingLevel.HEADING_3
            })
          );

          const liveBlock = document.getElementById(`chunk-block-${c.id}`);
          const rawHtml = liveBlock
            ? (liveBlock.querySelector('.chunk-inner-content')?.innerHTML || c.translatedHtml)
            : c.translatedHtml;

          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = rawHtml;
          tempDiv.querySelectorAll('.source-page-toolbar, .figure-action-bar').forEach(el => el.remove());

          const elements = tempDiv.querySelectorAll('h1, h2, h3, p, li, img.original-cropped-figure, figcaption, table');
          elements.forEach(el => {
            if (el.tagName !== 'TABLE' && el.closest('table')) return;

            if (el.tagName === 'IMG' && ImageRun) {
              const src = el.getAttribute('src') || '';
              if (src.startsWith('data:image/')) {
                const uint8Array = this.dataUrlToUint8Array(src);
                if (uint8Array) {
                  const { width, height } = this.getPngDimensions(uint8Array);
                  const maxW = 550;
                  const maxH = 680;
                  const scale = Math.min(1, maxW / Math.max(1, width), maxH / Math.max(1, height));
                  const targetW = Math.max(140, Math.round(width * scale));
                  const targetH = Math.max(90, Math.round(height * scale));
                  docChildren.push(
                    new Paragraph({
                      children: [
                        new ImageRun({
                          data: uint8Array,
                          transformation: { width: targetW, height: targetH },
                          type: 'png'
                        })
                      ],
                      alignment: AlignmentType ? AlignmentType.CENTER : undefined,
                      spacing: { before: 140, after: 100 }
                    })
                  );
                }
              }
              return;
            }

            if (el.tagName === 'TABLE' && Table && TableRow && TableCell) {
              const rows = Array.from(el.querySelectorAll('tr')).map((tr, rowIndex) => {
                const cells = Array.from(tr.querySelectorAll('th, td')).map(cell => (
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [makeTextRun(cell.textContent.trim(), {
                          bold: cell.tagName === 'TH' || rowIndex === 0,
                          font: (cell.tagName === 'TH' || rowIndex === 0) ? roles.heading.docx : roles.body.docx
                        })]
                      })
                    ]
                  })
                ));
                return cells.length ? new TableRow({ children: cells }) : null;
              }).filter(Boolean);

              if (rows.length) {
                docChildren.push(
                  new Table({
                    rows,
                    width: WidthType ? { size: 100, type: WidthType.PERCENTAGE } : undefined
                  }),
                  new Paragraph({ text: "" })
                );
              }
              return;
            }

            const text = el.textContent.trim();
            if (!text) return;

            let heading = undefined;
            const isHeading = el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3';
            if (el.tagName === 'H1') heading = HeadingLevel.HEADING_1;
            if (el.tagName === 'H2') heading = HeadingLevel.HEADING_2;
            if (el.tagName === 'H3') heading = HeadingLevel.HEADING_3;

            const roleFont = isHeading
              ? roles.heading.docx
              : el.tagName === 'FIGCAPTION'
                ? roles.caption.docx
                : roles.body.docx;

            docChildren.push(
              new Paragraph({
                children: [makeTextRun(text, {
                  font: roleFont,
                  italics: el.tagName === 'FIGCAPTION' ? roles.captionItalic : false
                })],
                heading: heading
              })
            );
          });

          docChildren.push(new Paragraph({ text: "" }));
        }
      });

      const doc = new Document({
        sections: [{ children: docChildren }]
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.docx`;
      a.click();
      URL.revokeObjectURL(url);

      this.showToast(`Đã xuất file Word kèm hình: ${title}.docx`, 'success');
    } catch (err) {
      console.error('Lỗi xuất DOCX:', err);
      this.showToast(`Lỗi tạo file Word: ${err.message}`, 'error');
    }
  }

  downloadFile(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(file);
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  copyTranslatedText() {
    const text = this.translatedContent.innerText;
    if (!text || text.includes('Sẵn sàng chuyển ngữ')) {
      this.showToast('Chưa có nội dung để sao chép!', 'warning');
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Đã sao chép toàn bộ bản dịch vào bộ nhớ tạm!', 'success');
    });
  }

  // ==================== View Modes & Resizer ====================

  setViewMode(mode, save = true) {
    this.viewMode = ['split', 'translation-only', 'original-only'].includes(mode) ? mode : 'split';
    if (save) {
      localStorage.setItem('layouttrans_view_mode', this.viewMode);
    }
    this.dualPaneContainer.className = 'dual-pane-container';
    this.viewSplitBtn.classList.toggle('active', this.viewMode === 'split');
    this.viewTransBtn.classList.toggle('active', this.viewMode === 'translation-only');
    this.viewOrigBtn.classList.toggle('active', this.viewMode === 'original-only');

    if (this.viewMode === 'translation-only') {
      this.dualPaneContainer.classList.add('view-translation-only');
    } else if (this.viewMode === 'original-only') {
      this.dualPaneContainer.classList.add('view-original-only');
    }
  }

  initPaneResizer() {
    let isDragging = false;
    this.paneResizer.addEventListener('mousedown', () => {
      isDragging = true;
      this.paneResizer.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const containerRect = this.dualPaneContainer.getBoundingClientRect();
      const offset = e.clientX - containerRect.left;
      const totalWidth = containerRect.width;
      const leftPct = Math.max(20, Math.min(80, Math.round((offset / totalWidth) * 100)));

      this.paneSplitPct = leftPct;
      this.paneOriginal.style.flex = `0 0 ${leftPct}%`;
      this.paneTranslated.style.flex = `0 0 ${100 - leftPct}%`;
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        this.paneResizer.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        localStorage.setItem('layouttrans_pane_split_pct', String(this.paneSplitPct));
      }
    });
  }

  // ==================== Settings & UI State ====================

  openSettings() {
    this.apiKeyInput.value = this.apiKey;
    this.chunkSizeInput.value = this.chunkSize;
    this.chunkSizeDisplay.textContent = `${this.chunkSize} trang`;
    this.pendingFontPreference = this.fontPreference;
    this.syncTypographyInputsFromState();
    this.applyTranslationTypography(this.pendingFontPreference);
    this.customPromptInput.value = this.customPrompt;

    if (this.apiKeyTestResult) {
      if (this.apiKey) {
        this.apiKeyTestResult.style.display = 'flex';
        this.apiKeyTestResult.className = 'api-test-result success';
        this.apiKeyTestResult.innerHTML = '<span>🟢 <strong>Đang dùng Key đã lưu.</strong> Bấm nút "Kiểm tra kết nối" để test lại đường truyền nếu muốn.</span>';
      } else {
        this.apiKeyTestResult.style.display = 'none';
      }
    }
    this.settingsModal.style.display = 'flex';
  }

  closeSettings() {
    this.pendingFontPreference = this.fontPreference;
    this.syncTypographyInputsFromState();
    this.applyTranslationTypography(this.fontPreference);
    this.settingsModal.style.display = 'none';
  }

  saveSettings() {
    const nextFontPreference = this.fontPreferenceInput.value;
    const nextCustomFontFamily = this.customFontFamilyInput.value.trim();
    if (this.typographyMode === 'unified' && nextFontPreference === 'custom' && !this.isValidCustomFontFamily(nextCustomFontFamily)) {
      this.showToast('Nhập tên font hợp lệ đã cài trên máy (tối đa 64 ký tự).', 'warning');
      this.customFontFamilyInput.focus();
      return;
    }

    const key = this.apiKeyInput.value.trim();
    this.apiKey = key;
    localStorage.setItem('layouttrans_gemini_key', key);

    if (this.typographyModeSelect) {
      this.typographyMode = this.typographyModeSelect.value === 'unified' ? 'unified' : 'split';
    }
    if (this.headingFontInput) this.headingFont = this.headingFontInput.value;
    if (this.bodyFontInput) this.bodyFont = this.bodyFontInput.value;
    if (this.captionFontInput) this.captionFont = this.captionFontInput.value;
    if (this.captionItalicInput) this.captionItalic = Boolean(this.captionItalicInput.checked);

    const clampSize = (el, min, max, fallback) => {
      const parsed = parseInt(el?.value || '', 10);
      return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
    };
    this.h1Size = clampSize(this.h1SizeInput, 18, 40, this.h1Size);
    this.h2Size = clampSize(this.h2SizeInput, 15, 32, this.h2Size);
    this.h3Size = clampSize(this.h3SizeInput, 13, 26, this.h3Size);
    this.fontSize = clampSize(this.bodySizeInput, 12, 28, this.fontSize);
    this.captionSize = clampSize(this.captionSizeInput, 11, 22, this.captionSize);

    this.fontPreference = nextFontPreference;
    this.pendingFontPreference = nextFontPreference;
    this.customFontFamily = nextCustomFontFamily;
    localStorage.setItem('layouttrans_font_preference', this.fontPreference);
    localStorage.setItem('layouttrans_custom_font_family', this.customFontFamily);
    this.persistTypographySettings();
    this.syncTypographyInputsFromState();
    this.applyTranslationTypography(this.fontPreference);

    const previousChunkSize = this.chunkSize;
    this.chunkSize = Math.max(1, Math.min(6, parseInt(this.chunkSizeInput.value, 10) || 2));
    localStorage.setItem('layouttrans_chunk_size', String(this.chunkSize));
    localStorage.setItem('layouttrans_batch_settings_version', '3');

    if (this.currentFile && previousChunkSize !== this.chunkSize) {
      if (this.isTranslating) {
        this.showToast('Đã lưu số trang/request mới; sẽ áp dụng cho lượt dịch kế tiếp.', 'info');
      } else {
        this.buildChunks(true);
      }
    }

    this.customPrompt = this.customPromptInput.value.trim();
    localStorage.setItem('layouttrans_custom_prompt', this.customPrompt);

    if (this.modelSelector) {
      this.selectedModel = this.modelSelector.value;
      localStorage.setItem('layouttrans_selected_model', this.selectedModel);
    }

    this.updateApiKeyStatus();
    this.closeSettings();
    const roles = this.resolveActiveTypographyRoles();
    this.showToast(`Đã lưu toàn bộ cài đặt (${roles.summaryLabel}, Body ${this.fontSize}px, ${this.chunkSize} trang/lần)!`, 'success');
  }

  updateApiKeyStatus() {
    if (this.apiKey) {
      this.apiKeyStatusDot.classList.add('connected');
      this.apiKeyStatusDot.title = 'Đã kết nối Gemini API';
      if (this.apiKeyStatusText) this.apiKeyStatusText.textContent = 'Đã kết nối Key';
    } else {
      this.apiKeyStatusDot.classList.remove('connected');
      this.apiKeyStatusDot.title = 'Chưa thiết lập API Key';
      if (this.apiKeyStatusText) this.apiKeyStatusText.textContent = 'Chưa có Key';
    }
  }

  resetWorkspace() {
    if (confirm('Bạn có chắc muốn đóng tài liệu hiện tại và chọn tài liệu khác không? (Cài đặt font, cỡ chữ, API Key vẫn được giữ nguyên)')) {
      this.translationRunId += 1;
      if (this.currentAbortController) {
        try { this.currentAbortController.abort(); } catch(e) {}
      }
      this.currentFile = null;
      this.pdfDoc = null;
      this.pdfLibMasterDoc = null;
      this.chunks = [];
      this.sourcePageProfiles = [];
      this.sourceTypography = null;
      this.sourceTypographySummary = '';
      this.documentTypography = 'serif';
      this.highResPageCanvasCache.clear();
      this.isTranslating = false;
      this.isPaused = false;

      this.currentFileName.textContent = 'Chưa tải tài liệu nào';
      this.pageCountBadge.textContent = '0 trang';
      this.progressSection.style.display = 'none';
      this.startTranslateBtn.style.display = 'inline-flex';
      this.startBtnLabel.textContent = 'Bắt đầu dịch';
      this.pauseTranslateBtn.style.display = 'none';
      this.resetDocBtn.style.display = 'none';

      this.pdfPagesRenderContainer.innerHTML = '';
      this.translatedContent.innerHTML = `
        <div class="empty-state-placeholder">
          <div class="empty-illustration">📖</div>
          <h3>Sẵn sàng chuyển ngữ</h3>
          <p>Bấm <strong>"Bắt đầu dịch"</strong> để dịch từng trang, kiểm tra độ phủ 100% và đối chiếu với bản gốc.</p>
        </div>
      `;
      this.applyTranslationTypography(this.fontPreference);

      this.dualPaneContainer.style.display = 'none';
      this.dropzoneContainer.style.display = 'flex';
    }
  }

  loadSavedTheme() {
    const savedTheme = localStorage.getItem('layouttrans_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcons(savedTheme);
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('layouttrans_theme', newTheme);
    this.updateThemeIcons(newTheme);
  }

  updateThemeIcons(theme) {
    if (theme === 'dark') {
      this.themeIconDark.style.display = 'block';
      this.themeIconLight.style.display = 'none';
    } else {
      this.themeIconDark.style.display = 'none';
      this.themeIconLight.style.display = 'block';
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(30px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new LayoutTransApp();
});
