import { Editor } from './Editor.js';

export class UIManager {
  constructor(noteManager) {
    this.noteManager = noteManager;
    this.currentNote = null;
    
    this.history = new HistoryManager(({ canUndo, canRedo }) => {
      this.undoButton.disabled = !canUndo;
      this.redoButton.disabled = !canRedo;
    });

    this.editor = new Editor(noteManager, this.history);
    this.initializeElements();
    this.attachEventListeners();
  }

  initializeElements() {
    this.notesList = document.getElementById('notes-list');
    this.editorContainer = document.getElementById('editor');
    this.searchInput = document.getElementById('search');
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

    window.addEventListener('storage', (e) => {
      if (e.key === 'notes') {
        this.renderNotesList();
      }
    });
  }

  createNewNote() {
    const note = this.noteManager.createNote();
    this.openEditor(note);
  }

  openEditor(note) {
    this.currentNote = JSON.parse(JSON.stringify(note));
    this.editorContainer.classList.remove('hidden');
    document.getElementById('notes-list-view').classList.add('hidden');
    this.history.clear();
    this.editor.setNote(this.currentNote);
  }

  closeEditor() {
    this.editorContainer.classList.add('hidden');
    document.getElementById('notes-list-view').classList.remove('hidden');
    this.currentNote = null;
    this.history.clear();
    this.renderNotesList();
  }

  deleteCurrentNote() {
    if (!this.currentNote || !confirm('Are you sure you want to delete this note?')) return;
    this.noteManager.deleteNote(this.currentNote.id);
    this.closeEditor();
  }

  addNewToggle() {
    if (!this.currentNote) return;
    
    const newToggle = {
      id: Date.now(),
      title: `Section ${this.currentNote.toggles.length + 1}`,
      content: '',
      isOpen: true
    };
    
    this.currentNote.toggles.push(newToggle);
    this.editor.setNote(this.currentNote);
  }

  handleUndo() {
    const previousState = this.history.undo();
    if (previousState) {
      this.currentNote = previousState;
      this.editor.setNote(this.currentNote);
    }
  }

  handleRedo() {
    const nextState = this.history.redo();
    if (nextState) {
      this.currentNote = nextState;
      this.editor.setNote(this.currentNote);
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
}
