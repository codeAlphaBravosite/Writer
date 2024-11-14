import { Editor } from './components/Editor.js';
import { TogglesManager } from './components/TogglesManager.js';
import { NotesList } from './components/NotesList.js';
import { AutoSaveService } from './services/AutoSaveService.js';

export class UIManager {
  constructor(noteManager) {
    this.noteManager = noteManager;
    this.history = new HistoryManager(this.updateUndoRedoButtons.bind(this));
    this.autoSave = new AutoSaveService(noteManager, this.history);
    
    this.editor = new Editor(noteManager, this.history);
    this.togglesManager = new TogglesManager(
      document.getElementById('toggles-container'),
      noteManager,
      this.history
    );
    this.notesList = new NotesList(noteManager);
    
    this.initializeElements();
    this.attachEventListeners();
    
    // Subscribe to note changes
    this.noteManager.subscribe(this.handleNoteChange.bind(this));
  }

  initializeElements() {
    this.undoButton = document.getElementById('undo-button');
    this.redoButton = document.getElementById('redo-button');
    this.newNoteButton = document.getElementById('new-note-button');
    
    if (!this.undoButton || !this.redoButton || !this.newNoteButton) {
      throw new Error('Required UI elements not found');
    }
  }

  attachEventListeners() {
    this.undoButton.addEventListener('click', () => this.history.undo());
    this.redoButton.addEventListener('click', () => this.history.redo());
    this.newNoteButton.addEventListener('click', () => this.createNewNote());
  }

  updateUndoRedoButtons({ canUndo, canRedo }) {
    this.undoButton.disabled = !canUndo;
    this.redoButton.disabled = !canRedo;
  }

  createNewNote() {
    const note = this.noteManager.createNote()
      .catch(error => console.error('Failed to create note:', error));
    if (note) {
      this.handleNoteChange(note);
    }
  }

  handleNoteChange(note) {
    this.editor.render(note);
    this.togglesManager.currentNote = note;
    this.togglesManager.render();
    this.notesList.render();
  }
}