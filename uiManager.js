import { HistoryManager } from './history.js';
import { getCaretCoordinates } from './textareaUtils.js';

export class UIManager {
  constructor(noteManager) {
    this.noteManager = noteManager;
    this.currentNote = null;
    this.autoSaveTimeout = null;
    this.lastKnownScrollPosition = 0;
    this.lastActiveToggleId = null;
    this.lastCaretPosition = null;
    
    this.history = new HistoryManager(({ canUndo, canRedo }) => {
      if (this.undoButton) {
        this.undoButton.disabled = !canUndo;
        this.redoButton.disabled = !canRedo;
      }
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

    // Validate required elements
    if (!this.notesList || !this.editor || !this.searchInput || 
        !this.noteTitle || !this.togglesContainer || 
        !this.undoButton || !this.redoButton) {
      throw new Error('Required DOM elements not found');
    }
  }

  attachEventListeners() {
    const newNoteBtn = document.getElementById('new-note');
    const backBtn = document.getElementById('back-button');
    const deleteBtn = document.getElementById('delete-button');
    const addToggleBtn = document.getElementById('add-toggle');

    if (!newNoteBtn || !backBtn || !deleteBtn || !addToggleBtn) {
      throw new Error('Required button elements not found');
    }

    newNoteBtn.addEventListener('click', () => this.createNewNote());
    backBtn.addEventListener('click', () => this.closeEditor());
    deleteBtn.addEventListener('click', () => this.deleteCurrentNote());
    addToggleBtn.addEventListener('click', () => this.addNewToggle());
    this.undoButton.addEventListener('click', () => this.handleUndo());
    this.redoButton.addEventListener('click', () => this.handleRedo());
    this.searchInput.addEventListener('input', () => this.filterNotes());
    this.noteTitle.addEventListener('input', (e) => this.handleNoteChange(e));

    // Add keyboard shortcuts for undo/redo
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

    window.addEventListener('storage', (e) => {
      if (e.key === 'notes') {
        this.renderNotesList();
      }
    });
  }

  autoResizeTextarea(textarea) {
    if (!textarea) return;
    
    const editorContent = document.querySelector('.editor-content');
    if (!editorContent) return;
    
    const scrollTop = editorContent.scrollTop;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    
    // Get caret position before resize
    const caretPosition = getCaretCoordinates(textarea);
    
    // Perform resize
    textarea.style.height = 'auto';
    const newHeight = textarea.scrollHeight;
    textarea.style.height = newHeight + 'px';
    
    // Restore selection
    textarea.selectionStart = selectionStart;
    textarea.selectionEnd = selectionEnd;
    
    // Handle scrolling
    const viewportHeight = window.innerHeight;
    const buffer = 150;
    
    if (caretPosition.y > viewportHeight - buffer) {
      editorContent.scrollTo({
        top: caretPosition.y - viewportHeight + buffer,
        behavior: 'smooth'
      });
    } else {
      editorContent.scrollTop = scrollTop;
    }
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
    this.saveEditorState();
    
    const previousState = this.history.undo(this.currentNote);
    if (previousState) {
      this.currentNote = previousState;
      this.noteManager.updateNote(this.currentNote);
      this.renderEditor(true);
    }
  }

  handleRedo() {
    this.saveEditorState();
    
    const nextState = this.history.redo(this.currentNote);
    if (nextState) {
      this.currentNote = nextState;
      this.noteManager.updateNote(this.currentNote);
      this.renderEditor(true);
    }
  }

  saveEditorState() {
    const editorContent = document.querySelector('.editor-content');
    if (editorContent) {
      this.lastKnownScrollPosition = editorContent.scrollTop;
    }
    
    const activeElement = document.activeElement;
    if (activeElement && activeElement.tagName === 'TEXTAREA') {
      this.lastCaretPosition = {
        start: activeElement.selectionStart,
        end: activeElement.selectionEnd
      };
      
      const toggleSection = activeElement.closest('.toggle-section');
      if (toggleSection) {
        const toggleHeader = toggleSection.querySelector('.toggle-header');
        this.lastActiveToggleId = toggleHeader?.dataset.toggleId;
      }
    }
  }

  restoreEditorState() {
    const editorContent = document.querySelector('.editor-content');
    if (editorContent) {
      editorContent.scrollTop = this.lastKnownScrollPosition;
    }

    if (this.lastActiveToggleId) {
      const toggleElement = document.querySelector(`[data-toggle-id="${this.lastActiveToggleId}"]`);
      const textarea = toggleElement?.closest('.toggle-section')?.querySelector('textarea');
      if (textarea) {
        textarea.focus();
        
        if (this.lastCaretPosition) {
          textarea.setSelectionRange(
            this.lastCaretPosition.start,
            this.lastCaretPosition.end
          );
        } else {
          const length = textarea.value.length;
          textarea.setSelectionRange(length, length);
        }
      }
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

  renderEditor(isUndoRedo = false) {
    if (!this.currentNote) return;

    if (!isUndoRedo) {
      this.saveEditorState();
    }

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

    if (isUndoRedo) {
      requestAnimationFrame(() => {
        this.restoreEditorState();
      });
    }
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
      let resizeTimeout;
      textarea.addEventListener('input', (e) => {
        this.updateToggleContent(parseInt(e.target.dataset.toggleId), e.target.value);
        
        if (resizeTimeout) {
          cancelAnimationFrame(resizeTimeout);
        }
        
        resizeTimeout = requestAnimationFrame(() => {
          this.autoResizeTextarea(textarea);
        });
      });

      this.autoResizeTextarea(textarea);
    });
  }
}
