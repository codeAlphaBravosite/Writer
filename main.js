import { Editor } from './Editor.js';
import { NotesList } from './NotesList.js';
import { Note } from './Note.js';
import { StorageService } from './StorageService.js';
import { HistoryManager } from './HistoryManager.js';

class App {
  constructor() {
    this.notes = StorageService.load('notes', []).map(data => new Note(data));
    this.history = new HistoryManager(this.updateUndoRedoButtons.bind(this));
    this.editor = new Editor(this, this.history);
    this.notesList = new NotesList(this);
    
    this.initializeUI();
  }

  initializeUI() {
    document.getElementById('new-note').addEventListener('click', () => this.createNote());
    document.getElementById('undo-button').addEventListener('click', () => this.undo());
    document.getElementById('redo-button').addEventListener('click', () => this.redo());
    
    this.notesList.render(note => this.editor.open(note));
  }

  createNote() {
    const note = new Note();
    this.notes.unshift(note);
    this.saveNotes();
    this.editor.open(note);
  }

  updateNote(note) {
    note.updated = new Date().toISOString();
    const index = this.notes.findIndex(n => n.id === note.id);
    if (index !== -1) {
      this.notes[index] = new Note(note);
      this.saveNotes();
    }
  }

  deleteNote(noteId) {
    this.notes = this.notes.filter(note => note.id !== noteId);
    this.saveNotes();
  }

  getNotes(searchTerm = '') {
    searchTerm = searchTerm.toLowerCase();
    return this.notes.filter(note => {
      const titleMatch = note.title.toLowerCase().includes(searchTerm);
      const contentMatch = note.toggles.some(toggle => 
        toggle.title.toLowerCase().includes(searchTerm) ||
        toggle.content.toLowerCase().includes(searchTerm)
      );
      return titleMatch || contentMatch;
    });
  }

  saveNotes() {
    StorageService.save('notes', this.notes.map(note => note.toJSON()));
    this.notesList.render(note => this.editor.open(note));
  }

  updateUndoRedoButtons({ canUndo, canRedo }) {
    document.getElementById('undo-button').disabled = !canUndo;
    document.getElementById('redo-button').disabled = !canRedo;
  }

  undo() {
    const previousState = this.history.undo(this.editor.currentNote);
    if (previousState) {
      this.editor.currentNote = previousState;
      this.updateNote(previousState);
      this.editor.render();
    }
  }

  redo() {
    const nextState = this.history.redo(this.editor.currentNote);
    if (nextState) {
      this.editor.currentNote = nextState;
      this.updateNote(nextState);
      this.editor.render();
    }
  }
}

// Initialize the application
new App();
