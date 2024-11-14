export class NotesList {
  constructor(noteManager) {
    this.noteManager = noteManager;
    this.container = document.getElementById('notes-list');
    this.searchInput = document.getElementById('search');
    
    if (!this.container || !this.searchInput) {
      throw new Error('Required notes list elements not found');
    }
    
    this.attachEventListeners();
  }

  attachEventListeners() {
    this.searchInput.addEventListener('input', () => this.filterNotes());
    
    this.container.addEventListener('click', (e) => {
      const noteCard = e.target.closest('.note-card');
      if (noteCard) {
        const noteId = parseInt(noteCard.dataset.noteId);
        this.onNoteSelect(noteId);
      }
    });
  }

  onNoteSelect(noteId) {
    const note = this.noteManager.getNote(noteId);
    if (note) {
      this.noteManager.setCurrentNote(note);
    }
  }

  filterNotes() {
    const searchTerm = this.searchInput.value.toLowerCase();
    this.render(searchTerm);
  }

  render(searchTerm = '') {
    const notes = this.noteManager.getNotes(searchTerm);
    
    this.container.innerHTML = notes.length ? notes.map(note => `
      <div class="note-card" data-note-id="${note.id}">
        <h3 class="note-title">${note.title || 'Untitled Note'}</h3>
        <p class="note-preview">${this.getPreview(note)}</p>
        <span class="note-date">${new Date(note.updatedAt).toLocaleDateString()}</span>
      </div>
    `).join('') : '<p class="empty-state">No notes found</p>';
  }

  getPreview(note) {
    const content = note.toggles
      .map(t => t.content)
      .join(' ')
      .trim();
    return content.length > 100 ? content.slice(0, 100) + '...' : content || 'No content';
  }
}