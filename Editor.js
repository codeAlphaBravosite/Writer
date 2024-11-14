export class Editor {
  constructor(noteManager, history) {
    this.noteManager = noteManager;
    this.history = history;
    this.currentNote = null;
    this.autoSaveTimeout = null;
    this.lastCaretPosition = null;
    this.editorContent = document.querySelector('.editor-content');
    this.togglesContainer = document.getElementById('toggles-container');
    this.noteTitle = document.getElementById('note-title');
  }

  saveCaretPosition(element) {
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      this.lastCaretPosition = {
        elementId: element.dataset.toggleId || 'title',
        start: element.selectionStart,
        end: element.selectionEnd,
        scrollTop: this.editorContent.scrollTop
      };
    }
  }

  restoreCaretPosition() {
    if (!this.lastCaretPosition) return;

    requestAnimationFrame(() => {
      let element;
      if (this.lastCaretPosition.elementId === 'title') {
        element = this.noteTitle;
      } else {
        element = document.querySelector(`[data-toggle-id="${this.lastCaretPosition.elementId}"]`);
      }

      if (element) {
        element.focus();
        element.selectionStart = this.lastCaretPosition.start;
        element.selectionEnd = this.lastCaretPosition.end;
        this.editorContent.scrollTop = this.lastCaretPosition.scrollTop;
      }
    });
  }

  handleChange(element, value) {
    if (!this.currentNote) return;

    this.saveCaretPosition(element);

    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    const previousState = JSON.parse(JSON.stringify(this.currentNote));

    if (element === this.noteTitle) {
      this.currentNote.title = value;
    } else if (element.dataset.toggleId) {
      const toggle = this.currentNote.toggles.find(t => t.id === parseInt(element.dataset.toggleId));
      if (toggle) {
        if (element.classList.contains('toggle-title')) {
          toggle.title = value;
        } else {
          toggle.content = value;
        }
      }
    }

    this.autoSaveTimeout = setTimeout(() => {
      this.history.push(previousState);
      this.noteManager.updateNote(this.currentNote);
    }, 300);
  }

  render(isUndoRedo = false) {
    if (!this.currentNote) return;

    const scrollPosition = this.editorContent.scrollTop;
    this.noteTitle.value = this.currentNote.title;
    
    this.togglesContainer.innerHTML = this.currentNote.toggles.map(toggle => `
      <div class="toggle-section">
        <div class="toggle-header" data-toggle-id="${toggle.id}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
               class="toggle-icon ${toggle.isOpen ? 'open' : ''}">
            <path d="M9 18l6-6-6-6" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <input type="text" class="toggle-title" value="${toggle.title}"
                 data-toggle-id="${toggle.id}" />
        </div>
        <div class="toggle-content ${toggle.isOpen ? 'open' : ''}">
          <textarea
            data-toggle-id="${toggle.id}"
            placeholder="Start writing..."
          >${toggle.content}</textarea>
        </div>
      </div>
    `).join('');

    if (isUndoRedo) {
      this.restoreCaretPosition();
    } else {
      this.editorContent.scrollTop = scrollPosition;
    }

    this.attachEventListeners();
  }

  attachEventListeners() {
    this.noteTitle.addEventListener('input', (e) => this.handleChange(e.target, e.target.value));

    document.querySelectorAll('.toggle-header').forEach(header => {
      header.addEventListener('click', (e) => {
        if (!e.target.classList.contains('toggle-title')) {
          const toggleId = parseInt(header.dataset.toggleId);
          const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
          if (toggle) {
            toggle.isOpen = !toggle.isOpen;
            this.render();
          }
        }
      });
    });

    document.querySelectorAll('.toggle-title, textarea').forEach(element => {
      element.addEventListener('input', (e) => this.handleChange(e.target, e.target.value));
      element.addEventListener('beforeinput', () => this.saveCaretPosition(element));
    });

    this.autoResizeTextareas();
  }

  autoResizeTextareas() {
    document.querySelectorAll('textarea').forEach(textarea => {
      const resize = () => {
        const currentScrollTop = this.editorContent.scrollTop;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
        this.editorContent.scrollTop = currentScrollTop;
      };

      resize();
      textarea.addEventListener('input', () => {
        requestAnimationFrame(resize);
      });
    });
  }

  setNote(note) {
    this.currentNote = note;
    this.render();
  }
}