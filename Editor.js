export class Editor {
  constructor(noteManager, history) {
    this.noteManager = noteManager;
    this.history = history;
    this.currentNote = null;
    this.autoSaveTimeout = null;
    this.resizeObserver = null;
    
    this.initializeElements();
    this.attachEventListeners();
    this.setupResizeObserver();
  }

  initializeElements() {
    this.editor = document.getElementById('editor');
    this.noteTitle = document.getElementById('note-title');
    this.togglesContainer = document.getElementById('toggles-container');
    
    if (!this.editor || !this.noteTitle || !this.togglesContainer) {
      throw new Error('Required editor elements not found');
    }
  }

  setupResizeObserver() {
    // Observe textarea size changes to handle smooth scrolling
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const textarea = entry.target;
        const container = textarea.closest('.editor-content');
        if (container) {
          this.smoothScrollToCaretPosition(textarea, container);
        }
      }
    });
  }

  attachEventListeners() {
    this.noteTitle.addEventListener('input', (e) => this.handleTitleChange(e));
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.history.redo();
        } else {
          this.history.undo();
        }
      }
    });

    // Handle textarea events
    this.togglesContainer.addEventListener('input', (e) => {
      if (e.target.tagName === 'TEXTAREA') {
        this.handleTextAreaInput(e.target);
      }
    });

    // Handle focus to maintain scroll position
    this.togglesContainer.addEventListener('focus', (e) => {
      if (e.target.tagName === 'TEXTAREA') {
        this.handleTextAreaFocus(e.target);
      }
    }, true);
  }

  handleTextAreaInput(textarea) {
    // Store current scroll and caret position
    const container = textarea.closest('.editor-content');
    const scrollTop = container?.scrollTop || 0;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    // Adjust height smoothly
    this.adjustTextAreaHeight(textarea, container, {
      scrollTop,
      selectionStart,
      selectionEnd
    });
  }

  handleTextAreaFocus(textarea) {
    // Ensure the textarea is properly sized when focused
    const container = textarea.closest('.editor-content');
    this.adjustTextAreaHeight(textarea, container);
  }

  adjustTextAreaHeight(textarea, container, positions = null) {
    // Remove height restriction temporarily
    textarea.style.height = 'auto';
    
    // Calculate new height (with a max-height limit for very long content)
    const maxHeight = window.innerHeight * 0.8; // 80% of viewport height
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    
    // Apply new height with smooth transition
    textarea.style.height = `${newHeight}px`;

    // Restore positions if provided
    if (positions) {
      textarea.selectionStart = positions.selectionStart;
      textarea.selectionEnd = positions.selectionEnd;
      
      // Observe textarea for size changes
      this.resizeObserver.observe(textarea);
    }
  }

  smoothScrollToCaretPosition(textarea, container) {
    // Get caret position
    const caretPosition = this.getCaretPosition(textarea);
    if (!caretPosition) return;

    const { top: caretTop } = caretPosition;
    const containerRect = container.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();

    // Calculate relative position of caret within container
    const relativeCaretTop = caretTop - containerRect.top;

    // Define scroll margins (buffer zones)
    const topMargin = 80; // px from top
    const bottomMargin = 120; // px from bottom

    // Calculate ideal scroll position
    let newScrollTop = container.scrollTop;

    // If caret is too close to bottom
    if (relativeCaretTop > containerRect.height - bottomMargin) {
      newScrollTop += relativeCaretTop - (containerRect.height - bottomMargin);
    }
    // If caret is too close to top
    else if (relativeCaretTop < topMargin) {
      newScrollTop -= (topMargin - relativeCaretTop);
    }

    // Apply smooth scroll if needed
    if (newScrollTop !== container.scrollTop) {
      container.scrollTo({
        top: newScrollTop,
        behavior: 'smooth'
      });
    }

    // Stop observing after adjustment
    this.resizeObserver.unobserve(textarea);
  }

  getCaretPosition(textarea) {
    const { selectionStart, value } = textarea;
    if (typeof selectionStart !== 'number') return null;

    // Create a mirror div to calculate caret position
    const mirror = document.createElement('div');
    mirror.style.cssText = getComputedStyle(textarea).cssText;
    mirror.style.height = 'auto';
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    
    // Split text at caret position
    const textBeforeCaret = value.substring(0, selectionStart);
    const textAfterCaret = value.substring(selectionStart);
    
    // Create span for caret position
    mirror.innerHTML = textBeforeCaret + '<span id="caret">|</span>' + textAfterCaret;
    document.body.appendChild(mirror);
    
    // Get caret position
    const caret = mirror.querySelector('#caret');
    const position = caret.getBoundingClientRect();
    
    // Cleanup
    document.body.removeChild(mirror);
    
    return position;
  }

  handleTitleChange(e) {
    if (!this.currentNote) return;
    
    clearTimeout(this.autoSaveTimeout);
    const previousState = this.getStateSnapshot();
    
    this.currentNote.title = e.target.value;
    this.autoSave(previousState);
  }

  getStateSnapshot() {
    return JSON.parse(JSON.stringify(this.currentNote));
  }

  autoSave(previousState) {
    this.autoSaveTimeout = setTimeout(() => {
      if (JSON.stringify(previousState) !== JSON.stringify(this.currentNote)) {
        this.history.push(previousState);
        this.noteManager.updateNote(this.currentNote)
          .catch(error => console.error('Failed to save note:', error));
      }
    }, 500);
  }

  render(note) {
    this.currentNote = note;
    this.noteTitle.value = note.title || '';
    this.renderToggles();
  }

  renderToggles() {
    if (!this.currentNote) return;
    
    this.togglesContainer.innerHTML = this.currentNote.toggles.map(toggle => `
      <div class="toggle-section" data-toggle-id="${toggle.id}">
        <div class="toggle-header">
          <input type="text" class="toggle-title" value="${toggle.title}" />
          <button class="toggle-expand ${toggle.isOpen ? 'open' : ''}">▼</button>
        </div>
        <div class="toggle-content ${toggle.isOpen ? 'open' : ''}">
          <textarea
            class="content-textarea"
            placeholder="Start writing..."
            style="height: ${toggle.isOpen ? 'auto' : '0'}"
          >${toggle.content}</textarea>
        </div>
      </div>
    `).join('');

    // Initialize textareas after rendering
    this.togglesContainer.querySelectorAll('textarea').forEach(textarea => {
      this.adjustTextAreaHeight(textarea, textarea.closest('.editor-content'));
    });
  }
}