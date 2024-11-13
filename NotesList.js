export class NotesList {
  constructor(noteManager) {
    this.noteManager = noteManager;
    this.container = document.getElementById('notes-list');
    this.searchInput = document.getElementById('search');
    this.searchInput.addEventListener('input', () => this.render());
  }

  render(onNoteSelect) {
    const searchTerm = this.searchInput.value.toLowerCase();
    const notes = this.noteManager.getNotes(searchTerm);
    
    this.container.innerHTML = notes.length ? notes.map(note => `
      <div class="note-card" data-note-id="${note.id}">
        <h2>${note.title || 'Untitled Note'}</h2>
        <p>${note.toggles.map(t => t.content).join(' ').slice(0, 150) || 'No content'}</p>
        <div class="note-meta">
          Last updated: ${new Date(note.updated).toLocaleDateString()}
        </div>
      </div>
    `).join('') : '<p class="empty-state">No notes found</p>';

    this.container.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', () => {
        const noteId = parseInt(card.dataset.noteId);
        const note = this.noteManager.notes.find(n => n.id === noteId);
        if (note && onNoteSelect) onNoteSelect(note);
      });
    });
  }
}