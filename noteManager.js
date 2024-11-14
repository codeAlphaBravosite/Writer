import { StorageManager } from './storage.js';

export class NoteManager {
  constructor() {
    this.notes = StorageManager.load('notes', []);
  }

  createNote() {
    const initialToggles = Array.from({ length: 3 }, (_, i) => ({
      id: Date.now() + i,
      title: `Section ${i + 1}`,
      content: '',
      isOpen: i === 0
    }));

    const note = {
      id: Date.now(),
      title: '',
      toggles: initialToggles,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    
    this.notes.unshift(note);
    this.saveNotes();
    return note;
  }

  updateNote(note) {
    note.updated = new Date().toISOString();
    const index = this.notes.findIndex(n => n.id === note.id);
    if (index !== -1) {
      this.notes[index] = JSON.parse(JSON.stringify(note));
      this.saveNotes();
    }
  }

  deleteNote(noteId) {
    this.notes = this.notes.filter(note => note.id !== noteId);
    this.saveNotes();
  }

  getNotes(searchTerm = '') {
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
    StorageManager.save('notes', this.notes);
  }
}