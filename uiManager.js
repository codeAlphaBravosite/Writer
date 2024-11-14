import { HistoryManager } from './history.js';

export class UIManager {
  constructor(noteManager) {
    this.noteManager = noteManager;
    this.currentNote = null;
    this.autoSaveTimeout = null;
    this.activeTextarea = null;
    this.resizeObserver = null;
    this.lastKnownScrollPosition = 0;
    this.lastActiveToggleId = null;
    this.lastCaretPosition = null;
    
    this.history = new HistoryManager(({ canUndo, canRedo }) => {
      this.undoButton.disabled = !canUndo;
      this.redoButton.disabled = !canRedo;
    });

    this.initializeElements();
    this.attachEventListeners();
    this.setupResizeObserver();
  }

  initializeElements() {
    this.notesList = document.getElementById('notes-list');
    this.editor = document.getElementById('editor');
    this.searchInput = document.getElementById('search');
    this.noteTitle = document.getElementById('note-title');
    this.togglesContainer = document.getElementById('toggles-container');
    this.undoButton = document.getElementById('undo-button');
    this.redoButton = document.getElementById('redo-button');
  }

  setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const textarea = entry.target;
        if (textarea === this.activeTextarea) {
          this.maintainCaretVisibility(textarea);
        }
      }
    });
  }

  attachEventListeners() {
    document.getElementById('new-note').addEventListener('click', () => this.createNewNote());
    document.getElementById('back-button').addEventListener('click', () => this.closeEditor());
    document.getElementById('delete-button').addEventListener('click', () => this.deleteCurrentNote());
    document.getElementById('add-toggle').addEventListener('click', () => this.addNewToggle());
    this.undoButton.addEventListener('click', () => this.handleUndo());
    this.redoButton.addEventListener('click', () => this.handleRedo());
    this.searchInput.addEventListener('input', () => this.filterNotes());
    this.noteTitle.addEventListener('input', (e) => this.handleNoteChange(e));

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.handleRedo();
        } else {
          this.handleUndo();
        }
      }
    });

    window.addEventListener('resize', this.handleWindowResize.bind(this));

    window.addEventListener('storage', (e) => {
      if (e.key === 'notes') {
        this.renderNotesList();
      }
    });
  }

  handleWindowResize() {
    if (this.activeTextarea) {
      this.updateTextareaSize(this.activeTextarea);
    }
  }

  updateTextareaSize(textarea) {
    if (!textarea) return;

    const editorContent = textarea.closest('.editor-content');
    const scrollTop = editorContent.scrollTop;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    textarea.style.height = 'auto';
    const newHeight = Math.max(
      textarea.scrollHeight,
      parseInt(window.getComputedStyle(textarea).minHeight)
    );
    textarea.style.height = `${newHeight}px`;

    editorContent.scrollTop = scrollTop;
    textarea.setSelectionRange(selectionStart, selectionEnd);
  }

  maintainCaretVisibility(textarea) {
    if (!textarea) return;

    const editorContent = textarea.closest('.editor-content');
    if (!editorContent) return;

    const textareaRect = textarea.getBoundingClientRect();
    const caretPosition = this.getCaretCoordinates(textarea);
    if (!caretPosition) return;

    const editorRect = editorContent.getBoundingClientRect();
    const caretTop = textareaRect.top + caretPosition.top - editorRect.top;
    const caretBottom = caretTop + caretPosition.height;

    const visibleTop = 100;
    const visibleBottom = editorRect.height - 150;

    let scrollAdjustment = 0;
    if (caretTop < visibleTop) {
      scrollAdjustment = caretTop - visibleTop;
    } else if (caretBottom > visibleBottom) {
      scrollAdjustment = caretBottom - visibleBottom;
    }

    if (scrollAdjustment !== 0) {
      editorContent.scrollTop += scrollAdjustment;
    }
  }

  getCaretCoordinates(textarea) {
    const position = textarea.selectionEnd;
    
    const div = document.createElement('div');
    div.style.cssText = window.getComputedStyle(textarea).cssText;
    div.style.height = 'auto';
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    
    const textBeforeCaret = textarea.value.substring(0, position);
    const textAfterCaret = textarea.value.substring(position);
    
    div.textContent = textBeforeCaret;
    const span = document.createElement('span');
    span.textContent = textAfterCaret || '.';
    div.appendChild(span);
    
    document.body.appendChild(div);
    const coordinates = {
      top: span.offsetTop,
      height: parseInt(window.getComputedStyle(textarea).lineHeight)
    };
    document.body.removeChild(div);
    
    return coordinates;
  }

  initialize() {
    this.renderNotesList();
  }

  createNewNote() {
    const note = this.noteManager.createNote();
    this.openEditor(note);
  }

  openEditor(note) {
    this.currentNote = JSON.parse(JSON.stringify(note));
    this.editor.classList.remove('hidden');
    document.getElementById('notes-list-view').classList.add('hidden');
    this.history.clear();
    this.renderEditor();
  }

  closeEditor() {
    this.editor.classList.add('hidden');
    document.getElementById('notes-list-view').classList.remove('hidden');
    this.currentNote = null;
    this.history.clear();
    this.renderNotesList();
  }

  deleteCurrentNote() {
    if (!this.currentNote) return;
    
    if (confirm('Are you sure you want to delete this note?')) {
      this.noteManager.deleteNote(this.currentNote.id);
      this.closeEditor();
    }
  }

  handleNoteChange(e) {
    if (!this.currentNote) return;
    
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    
    const previousState = JSON.parse(JSON.stringify(this.currentNote));
    
    if (e.target === this.noteTitle) {
      this.currentNote.title = e.target.value;
    }
    
    this.autoSaveTimeout = setTimeout(() => {
      if (JSON.stringify(previousState) !== JSON.stringify(this.currentNote)) {
        this.history.push(previousState);
        this.noteManager.updateNote(this.currentNote);
      }
    }, 500);
  }

  handleUndo() {
    const previousState = this.history.undo(this.currentNote);
    if (previousState) {
      this.currentNote = previousState;
      this.noteManager.updateNote(this.currentNote);
      this.renderEditor(true);
    }
  }

  handleRedo() {
    const nextState = this.history.redo(this.currentNote);
    if (nextState) {
      this.currentNote = nextState;
      this.noteManager.updateNote(this.currentNote);
      this.renderEditor(true);
    }
  }

  addNewToggle() {
    if (!this.currentNote) return;
    
    const previousState = JSON.parse(JSON.stringify(this.currentNote));
    
    const newToggle = {
      id: Date.now(),
      title: `Section ${this.currentNote.toggles.length + 1}`,
      content: '',
      isOpen: true
    };
    
    this.currentNote.toggles.push(newToggle);
    this.history.push(previousState);
    this.noteManager.updateNote(this.currentNote);
    this.renderEditor();
  }

  updateToggleTitle(toggleId, newTitle) {
    if (!this.currentNote) return;
    
    const previousState = JSON.parse(JSON.stringify(this.currentNote));
    const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
    if (toggle) {
      toggle.title = newTitle;
      this.history.push(previousState);
      this.noteManager.updateNote(this.currentNote);
    }
  }

  updateToggleContent(toggleId, newContent) {
    if (!this.currentNote) return;
    
    const previousState = JSON.parse(JSON.stringify(this.currentNote));
    const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
    if (toggle) {
      toggle.content = newContent;
      this.history.push(previousState);
      this.noteManager.updateNote(this.currentNote);
    }
  }

  toggleSection(toggleId) {
    if (!this.currentNote) return;
    
    const previousState = JSON.parse(JSON.stringify(this.currentNote));
    const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
    if (toggle) {
      toggle.isOpen = !toggle.isOpen;
      this.history.push(previousState);
      this.noteManager.updateNote(this.currentNote);
      this.renderEditor();
    }
  }

  filterNotes() {
    const searchTerm = this.searchInput.value.toLowerCase();
    this.renderNotesList(searchTerm);
  }

  renderNotesList(searchTerm = '') {
    const filteredNotes = this.noteManager.getNotes(searchTerm);
    
    this.notesList.innerHTML = filteredNotes.length ? filteredNotes.map(note => `
      <div class="note-card" data-note-id="${note.id}">
        <h2>${note.title || 'Untitled Note'}</h2>
        <p>${note.toggles.map(t => t.content).join(' ').slice(0, 150) || 'No content'}</p>
        <div class="note-meta">
          Last updated: ${new Date(note.updated).toLocaleDateString()}
        </div>
      </div>
    `).join('') : '<p class="empty-state">No notes found</p>';

    document.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', () => {
        const noteId = parseInt(card.dataset.noteId);
        const note = this.noteManager.notes.find(n => n.id === noteId);
        if (note) this.openEditor(note);
      });
    });
  }

  attachToggleEventListeners() {
    document.querySelectorAll('.toggle-header').forEach(header => {
      header.addEventListener('click', (e) => {
        if (!e.target.classList.contains('toggle-title')) {
          this.toggleSection(parseInt(header.dataset.toggleId));
        }
      });
    });

    document.querySelectorAll('.toggle-title').forEach(input => {
      input.addEventListener('input', (e) => {
        this.updateToggleTitle(parseInt(e.target.dataset.toggleId), e.target.value);
      });
      input.addEventListener('click', (e) => e.stopPropagation());
    });

    document.querySelectorAll('textarea').forEach(textarea => {
      this.resizeObserver?.unobserve(textarea);
      this.resizeObserver?.observe(textarea);

      textarea.addEventListener('focus', () => {
        this.activeTextarea = textarea;
      });

      textarea.addEventListener('blur', () => {
        if (this.activeTextarea === textarea) {
          this.activeTextarea = null;
        }
      });

      textarea.addEventListener('input', (e) => {
        this.updateToggleContent(parseInt(e.target.dataset.toggleId), e.target.value);
        this.updateTextareaSize(textarea);
      });

      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          requestAnimationFrame(() => {
            this.updateTextareaSize(textarea);
            this.maintainCaretVisibility(textarea);
          });
        }
      });

      this.updateTextareaSize(textarea);
    });
  }

  renderEditor(isUndoRedo = false) {
    if (!this.currentNote) return;

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

    this.attachToggleEventListeners();

    if (isUndoRedo && this.lastActiveToggleId) {
      requestAnimationFrame(() => {
        const textarea = document.querySelector(
          `.toggle-content textarea[data-toggle-id="${this.lastActiveToggleId}"]`
        );
        if (textarea) {
          textarea.focus();
          if (this.lastCaretPosition) {
            textarea.setSelectionRange(
              this.lastCaretPosition.start,
              this.lastCaretPosition.end
            );
            this.maintainCaretVisibility(textarea);
          }
        }
      });
    }
  }
      }
