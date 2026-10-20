/**
 * LayoutTrans AI — Application Core (v1.1 Robust Edition)
 * Client-Side PDF Chunking, Gemini Multimodal Translation, Layout Preservation & Dual-Pane Viewer
 */

// Configure PDF.js worker
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

class LayoutTransApp {
  constructor() {
    this.apiKey = localStorage.getItem('layouttrans_gemini_key') || '';
    this.selectedModel = localStorage.getItem('layouttrans_model') || 'gemini-flash-latest';
    // Migration: fix invalid model name if stored previously
    if (this.selectedModel === 'gemini-2.5-flash' || this.selectedModel === 'gemini-1.5-flash') {
      this.selectedModel = 'gemini-flash-latest';
      localStorage.setItem('layouttrans_model', this.selectedModel);
    }

    let savedChunkSize = localStorage.getItem('layouttrans_chunk_size');
    if (!savedChunkSize || savedChunkSize === '4') {
      this.chunkSize = 2;
      localStorage.setItem('layouttrans_chunk_size', '2');
    } else {
      this.chunkSize = parseInt(savedChunkSize, 10);
    }
    this.customPrompt = localStorage.getItem('layouttrans_custom_prompt') || '';
    
    this.currentFile = null;
    this.pdfDoc = null;
    this.pdfLibMasterDoc = null;
    this.currentAbortController = null;
    this.totalPages = 0;
    this.chunks = [];
    
    this.isTranslating = false;
    this.isPaused = false;
    this.currentChunkIndex = 0;
    this.syncScroll = true;
    this.zoomScale = 1.0;
    this.fontSize = 16;
    this.viewMode = 'split'; // 'split', 'translation-only', 'original-only'

    this.initElements();
    this.bindEvents();
    this.updateApiKeyStatus();
    this.loadSavedTheme();
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
    this.fontIncreaseBtn = document.getElementById('fontIncreaseBtn');
    this.fontDecreaseBtn = document.getElementById('fontDecreaseBtn');

    // Toast
    this.toastContainer = document.getElementById('toastContainer');
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

    // Model Selector
    this.modelSelector.value = this.selectedModel;
    this.modelSelector.addEventListener('change', (e) => {
      this.selectedModel = e.target.value;
      localStorage.setItem('layouttrans_model', this.selectedModel);
      this.showToast(`Đã chuyển sang model: ${this.selectedModel}`, 'info');
    });

    // View Modes
    this.viewSplitBtn.addEventListener('click', () => this.setViewMode('split'));
    this.viewTransBtn.addEventListener('click', () => this.setViewMode('translation-only'));
    this.viewOrigBtn.addEventListener('click', () => this.setViewMode('original-only'));

    // Sync Scroll Button
    this.syncScrollBtn.addEventListener('click', () => {
      this.syncScroll = !this.syncScroll;
      this.syncScrollBtn.classList.toggle('active', this.syncScroll);
      this.showToast(this.syncScroll ? 'Đã bật cuộn đồng bộ' : 'Đã tắt cuộn đồng bộ', 'info');
    });

    // Synced Scrolling Implementation
    let isSyncingLeft = false;
    let isSyncingRight = false;
    this.pdfViewerScrollContainer.addEventListener('scroll', () => {
      if (!this.syncScroll || isSyncingLeft) return;
      isSyncingRight = true;
      const pct = this.pdfViewerScrollContainer.scrollTop / (this.pdfViewerScrollContainer.scrollHeight - this.pdfViewerScrollContainer.clientHeight || 1);
      this.translatedScrollContainer.scrollTop = pct * (this.translatedScrollContainer.scrollHeight - this.translatedScrollContainer.clientHeight);
      setTimeout(() => { isSyncingRight = false; }, 50);
    });

    this.translatedScrollContainer.addEventListener('scroll', () => {
      if (!this.syncScroll || isSyncingRight) return;
      isSyncingLeft = true;
      const pct = this.translatedScrollContainer.scrollTop / (this.translatedScrollContainer.scrollHeight - this.translatedScrollContainer.clientHeight || 1);
      this.pdfViewerScrollContainer.scrollTop = pct * (this.pdfViewerScrollContainer.scrollHeight - this.pdfViewerScrollContainer.clientHeight);
      setTimeout(() => { isSyncingLeft = false; }, 50);
    });

    // Zoom Controls
    this.pdfZoomIn.addEventListener('click', () => this.changeZoom(0.15));
    this.pdfZoomOut.addEventListener('click', () => this.changeZoom(-0.15));

    // Font Controls
    this.fontIncreaseBtn.addEventListener('click', () => this.changeFontSize(1));
    this.fontDecreaseBtn.addEventListener('click', () => this.changeFontSize(-1));

    // Copy Translated Text
    this.copyTranslatedBtn.addEventListener('click', () => this.copyTranslatedText());

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
    this.exportHtmlBtn.addEventListener('click', (e) => { e.preventDefault(); this.exportHtml(); });
    this.exportDocxBtn.addEventListener('click', (e) => { e.preventDefault(); this.exportDocx(); });
    this.exportPdfBtn.addEventListener('click', (e) => { e.preventDefault(); window.print(); });

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
      this.currentFile = file;
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

      this.pageCountBadge.textContent = `${this.totalPages} trang`;
      this.pdfPageIndicator.textContent = `1 / ${this.totalPages}`;

      // Build chunks
      this.buildChunks();

      // Switch to Dual Pane View
      this.dropzoneContainer.style.display = 'none';
      this.dualPaneContainer.style.display = 'flex';
      this.resetDocBtn.style.display = 'inline-flex';
      this.startTranslateBtn.disabled = false;

      // Render PDF pages on left pane
      await this.renderPdfPages();

      this.showToast(`Đã nạp ${this.totalPages} trang sách thành công!`, 'success');
    } catch (err) {
      console.error('Lỗi khi nạp PDF:', err);
      this.showToast(`Lỗi nạp file PDF: ${err.message}`, 'error');
    }
  }

  buildChunks() {
    this.chunks = [];
    const size = this.chunkSize;
    let chunkId = 1;
    for (let page = 1; page <= this.totalPages; page += size) {
      const start = page;
      const end = Math.min(page + size - 1, this.totalPages);
      this.chunks.push({
        id: chunkId++,
        startPage: start,
        endPage: end,
        status: 'pending',
        translatedHtml: '',
        error: null
      });
    }
    this.updateProgressUI();
  }

  async renderPdfPages() {
    this.pdfPagesRenderContainer.innerHTML = '';
    for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
      const page = await this.pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.2 * this.zoomScale });

      const pageWrapper = document.createElement('div');
      pageWrapper.className = 'pdf-page-wrapper';
      pageWrapper.id = `pdf-page-${pageNum}`;
      pageWrapper.dataset.pageNum = pageNum;

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
  }

  async changeZoom(delta) {
    const newZoom = Math.max(0.6, Math.min(2.0, this.zoomScale + delta));
    if (newZoom !== this.zoomScale) {
      this.zoomScale = newZoom;
      this.pdfZoomLevel.textContent = `${Math.round(this.zoomScale * 100)}%`;
      if (this.pdfDoc) {
        await this.renderPdfPages();
      }
    }
  }

  changeFontSize(delta) {
    this.fontSize = Math.max(12, Math.min(26, this.fontSize + delta));
    document.documentElement.style.setProperty('--reader-font-size', `${this.fontSize}px`);
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

    this.isTranslating = true;
    this.isPaused = false;
    this.startTranslateBtn.style.display = 'none';
    this.pauseTranslateBtn.style.display = 'inline-flex';
    this.progressSection.style.display = 'flex';

    // Clear empty state in right pane if first time
    const emptyPlaceholder = this.translatedContent.querySelector('.empty-state-placeholder');
    if (emptyPlaceholder) {
      emptyPlaceholder.remove();
    }

    // Process chunks sequentially
    for (let i = 0; i < this.chunks.length; i++) {
      if (!this.isTranslating) break;
      if (this.isPaused) {
        this.progressText.textContent = `Đang tạm dừng tại phần ${i + 1}/${this.chunks.length}`;
        break;
      }

      const chunk = this.chunks[i];
      if (chunk.status === 'completed') continue;

      chunk.status = 'processing';
      this.currentChunkIndex = i;
      this.updateProgressUI();

      try {
        await this.processChunkWithGemini(chunk);
        chunk.status = 'completed';
        this.updateProgressUI();
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('Quá trình dịch đã được tạm dừng bởi người dùng.');
          break;
        }
        console.error(`Lỗi dịch chunk ${chunk.id}:`, err);
        chunk.status = 'error';
        chunk.error = err.message;
        this.showToast(`Lỗi phần ${chunk.id} (Trang ${chunk.startPage}-${chunk.endPage}): ${err.message}`, 'error');
        
        // If rate limit / quota
        if (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('Quota')) {
          this.togglePauseTranslation();
          this.showToast('Đã chạm hạn mức API Quota của Google. Hãy thử đổi sang model Flash hoặc đổi API key khác!', 'warning');
          break;
        } else {
          // Pause on unexpected error so user sees the message
          this.togglePauseTranslation();
          break;
        }
      }
    }

    if (this.chunks.every(c => c.status === 'completed')) {
      this.isTranslating = false;
      this.startTranslateBtn.style.display = 'inline-flex';
      this.startBtnLabel.textContent = 'Hoàn tất dịch';
      this.pauseTranslateBtn.style.display = 'none';
      this.showToast('🎉 Đã hoàn tất dịch toàn bộ cuốn sách!', 'success');
    }
  }

  togglePauseTranslation() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
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

  async processChunkWithGemini(chunk) {
    const startTime = Date.now();
    let chunkTimerInterval = null;

    // 1. Prepare chunk container immediately for live real-time streaming
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
        <span>Đang dịch trang ${chunk.startPage} – ${chunk.endPage}</span>
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
      this.progressText.textContent = `Đang trích xuất trang ${chunk.startPage} - ${chunk.endPage}...`;

      // 1. Fast sub-PDF extraction from cached master document (< 0.1s)
      const subPdfBase64 = await this.extractPdfChunkBase64(chunk.startPage, chunk.endPage);

      this.progressText.textContent = `Google AI đang bắt đầu dịch trang ${chunk.startPage} - ${chunk.endPage}...`;

      // 2. Build Specialized Layout-Preserving Translation System Instruction
      const systemInstruction = `Bạn là chuyên gia dịch thuật và chế bản tài liệu/sách học thuật chuyên nghiệp.
Nhiệm vụ của bạn là đọc các trang PDF gốc đính kèm và:
1. DỊCH TOÀN BỘ NỘI DUNG SANG TIẾNG VIỆT tự nhiên, chuẩn mực văn phong học thuật cao cấp.
2. BẢO TOÀN CHÍNH XÁC 100% CẤU TRÚC VÀ BỐ CỤC DÀN TRANG GỐC:
   - TIÊU ĐỀ: Giữ đúng cấp bậc H1 (Tên chương/phần lớn), H2 (Đề mục mục lớn), H3 (Tiểu mục con).
   - CHIA 2 CỘT: Nếu trang gốc có đoạn chia 2 cột, hãy dùng thẻ:
     <div class="layout-2col">
       <div>[Nội dung cột 1 tiếng Việt]</div>
       <div>[Nội dung cột 2 tiếng Việt]</div>
     </div>
   - KHUNG GHI CHÚ / CALLOUT: Giữ nguyên các khung ghi chú, hộp định nghĩa, mẹo, cảnh báo:
     <div class="callout callout-note">
       <div class="callout-title">Ghi chú / Định nghĩa / Lưu ý</div>
       <p>[Nội dung dịch]</p>
     </div>
   - BẢNG BIỂU: Dùng thẻ <table>...</table> với header <th> và các dòng <td> được dịch đầy đủ.
   - CÔNG THỨC TOÁN HỌC: BẢO TOÀN NGUYÊN VẸN các công thức toán/lý hóa bằng chuẩn LaTeX:
     * Công thức trong dòng: dùng $kí_hiệu$
     * Công thức riêng một dòng: dùng $$công_thức$$
   - HÌNH ẢNH & CHÚ THÍCH: Đặt trong <div class="figure-wrapper"><div class="figure-caption">Hình X: [Chú thích dịch]</div></div>
   - ĐOẠN VĂN: Căn đều, ngắt đoạn tự nhiên, giữ các liên kết hoặc ghi chú chân trang nếu có.
${this.customPrompt ? `\nYÊU CẦU BỔ SUNG CỦA NGƯỜI DÙNG: ${this.customPrompt}` : ''}

Chỉ trả về trực tiếp mã HTML sạch sẽ của phần nội dung dịch (không bọc trong thẻ \`\`\`html hay giải thích thừa).`;

      // 3. Make Streaming Request to Google Gemini API (SSE)
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.selectedModel}:streamGenerateContent?alt=sse&key=${encodeURIComponent(this.apiKey)}`;

      const requestBody = {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: subPdfBase64
                }
              },
              {
                text: `Hãy dịch toàn bộ nội dung từ trang ${chunk.startPage} đến trang ${chunk.endPage} này sang tiếng Việt, bảo toàn trọn vẹn bố cục dàn trang như đã hướng dẫn.`
              }
            ]
          }
        ],
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          temperature: 0.1
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
      };

      this.currentAbortController = new AbortController();

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: this.currentAbortController.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error?.message || `HTTP ${response.status} ${response.statusText}`;
        throw new Error(`Google API (HTTP ${response.status}): ${msg}`);
      }

      // 4. Stream response body tokens live
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedText = '';
      let hasReceivedFirstToken = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep unfinished fragment

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
              const data = JSON.parse(jsonStr);
              const partText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (partText) {
                if (!hasReceivedFirstToken) {
                  hasReceivedFirstToken = true;
                }
                accumulatedText += partText;

                // Live clean markdown code fence while streaming
                let liveHtml = accumulatedText.replace(/^```(?:html|markdown|xml)?\s*/i, '');
                contentEl.innerHTML = liveHtml;

                const elapsed = Math.round((Date.now() - startTime) / 1000);
                const wordCount = Math.round(accumulatedText.length / 5);
                this.progressText.textContent = `Đang nhận dữ liệu trang ${chunk.startPage}-${chunk.endPage} [${elapsed}s] • ~${wordCount} từ`;
              }

              const blockReason = data?.promptFeedback?.blockReason;
              if (blockReason) {
                throw new Error(`Bị Google AI chặn (Lý do: ${blockReason})`);
              }
            } catch (jsonErr) {
              // Ignore partial JSON parsing glitches in stream
            }
          }
        }
      }

      // Process any remaining bytes in buffer
      if (buffer.trim().startsWith('data: ')) {
        const jsonStr = buffer.trim().slice(6).trim();
        if (jsonStr && jsonStr !== '[DONE]') {
          try {
            const data = JSON.parse(jsonStr);
            const partText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (partText) accumulatedText += partText;
          } catch (e) {}
        }
      }

      clearInterval(chunkTimerInterval);
      const totalElapsed = Math.round((Date.now() - startTime) / 1000);

      if (!accumulatedText.trim()) {
        throw new Error('Google AI không phản hồi nội dung văn bản nào cho trang này.');
      }

      // Final clean
      let finalText = accumulatedText.replace(/^```(?:html|markdown|xml)?\s*/i, '').replace(/\s*```$/i, '').trim();
      chunk.translatedHtml = finalText;

      // Final styling & math typesetting
      chunkBlock.className = 'book-chunk-block';
      contentEl.classList.remove('streaming-cursor');
      contentEl.innerHTML = finalText;

      pillEl.className = 'chunk-header-pill';
      pillEl.innerHTML = `
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        <span>Trang ${chunk.startPage} – ${chunk.endPage}</span>
        <span class="chunk-timer-badge" style="color:var(--success)">${totalElapsed}s</span>
      `;

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

    } catch (err) {
      if (chunkTimerInterval) clearInterval(chunkTimerInterval);
      if (contentEl) contentEl.classList.remove('streaming-cursor');
      if (chunkBlock) chunkBlock.classList.remove('active-streaming');
      throw err;
    }
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
      </div>
      <div class="chunk-inner-content">
        ${chunk.translatedHtml}
      </div>
    `;

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
  }

  updateProgressUI() {
    const total = this.chunks.length;
    if (total === 0) return;

    const completed = this.chunks.filter(c => c.status === 'completed').length;
    const pct = Math.round((completed / total) * 100);

    this.progressBarFill.style.width = `${pct}%`;
    this.progressText.textContent = `Đã dịch ${completed}/${total} phần (${pct}%)`;
  }

  // ==================== Export Capabilities ====================

  exportHtml() {
    if (!this.chunks.some(c => c.status === 'completed')) {
      this.showToast('Chưa có nội dung dịch nào để xuất!', 'warning');
      return;
    }

    const title = this.currentFile ? this.currentFile.name.replace(/\.[^/.]+$/, "") : "Bản_dịch_sách";
    
    // Assemble all chunks
    let allContent = '';
    this.chunks.forEach(c => {
      if (c.status === 'completed') {
        allContent += `
        <section class="book-section" id="page-section-${c.startPage}">
          <div class="page-meta-tag">Trang ${c.startPage} – ${c.endPage}</div>
          ${c.translatedHtml}
        </section>`;
      }
    });

    const fullHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${title} — Bản dịch tiếng Việt</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body);"></script>
  <style>
    body {
      font-family: 'Be Vietnam Pro', -apple-system, sans-serif;
      max-width: 860px;
      margin: 0 auto;
      padding: 3rem 1.5rem;
      background: #fafafa;
      color: #1e293b;
      line-height: 1.8;
      font-size: 16px;
    }
    h1 { font-size: 2rem; color: #0f172a; margin: 2rem 0 1rem; }
    h2 { font-size: 1.5rem; color: #0f172a; margin: 1.5rem 0 0.8rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.4rem; }
    h3 { font-size: 1.25rem; color: #0f172a; margin: 1.2rem 0 0.6rem; }
    p { margin-bottom: 1.2rem; text-align: justify; }
    .layout-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin: 1.5rem 0; }
    @media (max-width: 768px) { .layout-2col { grid-template-columns: 1fr; } }
    .callout { background: #f8fafc; border-left: 4px solid #6366f1; padding: 1.2rem; border-radius: 8px; margin: 1.5rem 0; }
    .callout-title { font-weight: 700; margin-bottom: 0.5rem; color: #4338ca; }
    table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; background: #fff; }
    th { background: #f1f5f9; padding: 10px; text-align: left; border: 1px solid #cbd5e1; }
    td { padding: 9px; border: 1px solid #e2e8f0; }
    .page-meta-tag { font-size: 0.75rem; color: #94a3b8; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; margin-bottom: 1.5rem; }
  </style>
</head>
<body>
  ${allContent}
</body>
</html>`;

    this.downloadFile(fullHtml, `${title}_tieng_viet.html`, 'text/html');
    this.showToast('Đã xuất file Web HTML thành công!', 'success');
  }

  async exportDocx() {
    if (!this.chunks.some(c => c.status === 'completed')) {
      this.showToast('Chưa có nội dung dịch nào để xuất Word!', 'warning');
      return;
    }

    try {
      this.showToast('Đang tạo file Word (.docx)...', 'info');
      const title = this.currentFile ? this.currentFile.name.replace(/\.[^/.]+$/, "") : "Bản_dịch_sách";
      
      const { Document, Packer, Paragraph, HeadingLevel } = docx;

      const docChildren = [
        new Paragraph({
          text: `${title} — Bản Dịch Tiếng Việt`,
          heading: HeadingLevel.TITLE
        }),
        new Paragraph({ text: "" })
      ];

      this.chunks.forEach(c => {
        if (c.status === 'completed') {
          docChildren.push(
            new Paragraph({
              text: `--- Trang ${c.startPage} – ${c.endPage} ---`,
              heading: HeadingLevel.HEADING_3
            })
          );

          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = c.translatedHtml;

          const elements = tempDiv.querySelectorAll('h1, h2, h3, p, li');
          elements.forEach(el => {
            let heading = undefined;
            if (el.tagName === 'H1') heading = HeadingLevel.HEADING_1;
            if (el.tagName === 'H2') heading = HeadingLevel.HEADING_2;
            if (el.tagName === 'H3') heading = HeadingLevel.HEADING_3;

            docChildren.push(
              new Paragraph({
                text: el.textContent.trim(),
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
      a.download = `${title}_tieng_viet.docx`;
      a.click();
      URL.revokeObjectURL(url);

      this.showToast('Đã xuất file Word (.docx) thành công!', 'success');
    } catch (err) {
      console.error('Lỗi xuất DOCX:', err);
      this.showToast(`Lỗi tạo file Word: ${err.message}`, 'error');
    }
  }

  downloadFile(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
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

  setViewMode(mode) {
    this.viewMode = mode;
    this.dualPaneContainer.className = 'dual-pane-container';
    this.viewSplitBtn.classList.toggle('active', mode === 'split');
    this.viewTransBtn.classList.toggle('active', mode === 'translation-only');
    this.viewOrigBtn.classList.toggle('active', mode === 'original-only');

    if (mode === 'translation-only') {
      this.dualPaneContainer.classList.add('view-translation-only');
    } else if (mode === 'original-only') {
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
      const leftPct = Math.max(20, Math.min(80, (offset / totalWidth) * 100));
      
      this.paneOriginal.style.flex = `0 0 ${leftPct}%`;
      this.paneTranslated.style.flex = `0 0 ${100 - leftPct}%`;
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        this.paneResizer.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  // ==================== Settings & UI State ====================

  openSettings() {
    this.apiKeyInput.value = this.apiKey;
    this.chunkSizeInput.value = this.chunkSize;
    this.chunkSizeDisplay.textContent = `${this.chunkSize} trang`;
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
    this.settingsModal.style.display = 'none';
  }

  saveSettings() {
    const key = this.apiKeyInput.value.trim();
    this.apiKey = key;
    localStorage.setItem('layouttrans_gemini_key', key);

    this.chunkSize = parseInt(this.chunkSizeInput.value, 10);
    localStorage.setItem('layouttrans_chunk_size', this.chunkSize);

    this.customPrompt = this.customPromptInput.value.trim();
    localStorage.setItem('layouttrans_custom_prompt', this.customPrompt);

    this.updateApiKeyStatus();
    this.closeSettings();
    this.showToast('Đã lưu cấu hình thành công!', 'success');
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
    if (confirm('Bạn có chắc muốn đóng tài liệu hiện tại và chọn tài liệu khác không?')) {
      if (this.currentAbortController) {
        try { this.currentAbortController.abort(); } catch(e) {}
      }
      this.currentFile = null;
      this.pdfDoc = null;
      this.pdfLibMasterDoc = null;
      this.chunks = [];
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
          <p>Bấm nút <strong>"Bắt đầu dịch"</strong> trên thanh điều khiển để hệ thống bắt đầu dịch từng trang và tái tạo bố cục.</p>
        </div>
      `;

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
