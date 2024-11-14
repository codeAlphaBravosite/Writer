import { HistoryManager } from './history.js';

export class UIManager {
  constructor(noteManager) {
    this.noteManager = noteManager;
    this.currentNote = null;
    this.autoSaveTimeout = null;
    
    this.history = new HistoryManager(({ canUndo, canRedo }) => {
      this.undoButton.disabled = !canUndo;
      this.redoButton.disabled = !canRedo;
    });

    this.initializeElements();
    this.attachEventListeners();
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

  attachEventListeners() {
    document.getElementById('new-note').addEventListener('click', () => this.createNewNote());
    document.getElementById('back-button').addEventListener('click', () => this.closeEditor());
    document.getElementById('delete-button').addEventListener('click', () => this.deleteCurrentNote());
    document.getElementById('add-toggle').addEventListener('click', () => this.addNewToggle());
    this.undoButton.addEventListener('click', () => this.handleUndo());
    this.redoButton.addEventListener('click', () => this.handleRedo());
    this.searchInput.addEventListener('input', () => this.filterNotes());
    this.noteTitle.addEventListener('input', (e) => this.handleNoteChange(e));

    window.addEventListener('storage', (e) => {
      if (e.key === 'notes') {
        this.renderNotesList();
      }
    });
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
    
    if (e.target === this.noteTitle) {
      this.currentNote.title = e.target.value;
    }
    
    this.autoSaveTimeout = setTimeout(() => {
      this.history.push(this.currentNote);
      this.noteManager.updateNote(this.currentNote);
    }, 500);
  }

  handleUndo() {
    const previousState = this.history.undo(this.currentNote);
    if (previousState) {
      this.currentNote = previousState;
      this.noteManager.updateNote(this.currentNote);
      this.renderEditor();
    }
  }

  handleRedo() {
    const nextState = this.history.redo(this.currentNote);
    if (nextState) {
      this.currentNote = nextState;
      this.noteManager.updateNote(this.currentNote);
      this.renderEditor();
    }
  }

  addNewToggle() {
    if (!this.currentNote) return;
    
    const newToggle = {
      id: Date.now(),
      title: `Section ${this.currentNote.toggles.length + 1}`,
      content: '',
      isOpen: true
    };
    
    this.history.push(this.currentNote);
    this.currentNote.toggles.push(newToggle);
    this.noteManager.updateNote(this.currentNote);
    this.renderEditor();
  }

  updateToggleTitle(toggleId, newTitle) {
    if (!this.currentNote) return;
    
    const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
    if (toggle) {
      toggle.title = newTitle;
      this.handleNoteChange({ target: toggle });
    }
  }

  updateToggleContent(toggleId, newContent) {
    if (!this.currentNote) return;
    
    const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
    if (toggle) {
      toggle.content = newContent;
      this.handleNoteChange({ target: toggle });
    }
  }

  toggleSection(toggleId) {
    if (!this.currentNote) return;
    
    const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
    if (toggle) {
      toggle.isOpen = !toggle.isOpen;
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

  renderEditor() {
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
      // Add input event listener with debouncing
      let resizeTimeout;
      textarea.addEventListener('input', (e) => {
        this.updateToggleContent(parseInt(e.target.dataset.toggleId), e.target.value);
        
        // Clear any pending resize
        if (resizeTimeout) {
          cancelAnimationFrame(resizeTimeout);
        }
        
        // Schedule resize for next frame
        resizeTimeout = requestAnimationFrame(() => {
          this.autoResizeTextarea(textarea);
        });
      });

      // Initial resize
      this.autoResizeTextarea(textarea);
    });
  }

  autoResizeTextarea(textarea) {
    // Store the current cursor position and scroll position
    const editorContent = document.querySelector('.editor-content');
    const scrollTop = editorContent.scrollTop;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    
    // Get the current caret position relative to the viewport
    const caretPosition = textarea.getBoundingClientRect();
    const currentCaretY = caretPosition.top + (textarea.scrollHeight * (textarea.selectionEnd / textarea.value.length));

    // Resize the textarea
    textarea.style.height = 'auto';
    const newHeight = textarea.scrollHeight;
    textarea.style.height = newHeight + 'px';

    // Restore cursor position
    textarea.selectionStart = selectionStart;
    textarea.selectionEnd = selectionEnd;

    // Calculate if cursor would be below viewport
    const viewportHeight = window.innerHeight;
    const buffer = 150; // Buffer space from bottom of viewport
    const targetScrollPosition = currentCaretY - viewportHeight + buffer;

    if (currentCaretY > viewportHeight - buffer) {
      // Smooth scroll to keep cursor visible
      editorContent.scrollTo({
        top: targetScrollPosition,
        behavior: 'smooth'
      });
    } else {
      // Restore original scroll position if cursor is visible
      editorContent.scrollTop = scrollTop;
    }
  }
}
