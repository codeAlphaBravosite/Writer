import { autoResizeTextarea } from 'textareaUtils.js';

export class Editor {
  constructor(noteManager, history) {
    this.noteManager = noteManager;
    this.history = history;
    this.currentNote = null;
    this.autoSaveTimeout = null;
    this.initElements();
    this.attachListeners();
  }

  initElements() {
    this.container = document.getElementById('editor');
    this.title = document.getElementById('note-title');
    this.togglesContainer = document.getElementById('toggles-container');
    this.backButton = document.getElementById('back-button');
    this.deleteButton = document.getElementById('delete-button');
    this.addToggleButton = document.getElementById('add-toggle');
  }

  attachListeners() {
    this.backButton.addEventListener('click', () => this.close());
    this.deleteButton.addEventListener('click', () => this.deleteNote());
    this.addToggleButton.addEventListener('click', () => this.addToggle());
    this.title.addEventListener('input', (e) => this.handleChange(e));
  }

  open(note) {
    this.currentNote = JSON.parse(JSON.stringify(note));
    this.container.classList.remove('hidden');
    document.getElementById('notes-list-view').classList.add('hidden');
    this.history.clear();
    this.render();
  }

  close() {
    this.container.classList.add('hidden');
    document.getElementById('notes-list-view').classList.remove('hidden');
    this.currentNote = null;
    this.history.clear();
  }

  deleteNote() {
    if (!this.currentNote || !confirm('Delete this note?')) return;
    this.noteManager.deleteNote(this.currentNote.id);
    this.close();
  }

  handleChange(e) {
    if (!this.currentNote) return;
    
    clearTimeout(this.autoSaveTimeout);
    
    if (e.target === this.title) {
      this.currentNote.title = e.target.value;
    }
    
    this.autoSaveTimeout = setTimeout(() => {
      this.history.push(this.currentNote);
      this.noteManager.updateNote(this.currentNote);
    }, 300);
  }

  addToggle() {
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
    this.render();
  }

  updateToggleTitle(toggleId, newTitle) {
    if (!this.currentNote) return;
    
    const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
    if (toggle) {
      toggle.title = newTitle;
      this.handleChange({ target: toggle });
    }
  }

  updateToggleContent(toggleId, newContent) {
    if (!this.currentNote) return;
    
    const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
    if (toggle) {
      toggle.content = newContent;
      this.handleChange({ target: toggle });
    }
  }

  toggleSection(toggleId) {
    if (!this.currentNote) return;
    
    const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
    if (toggle) {
      toggle.isOpen = !toggle.isOpen;
      this.noteManager.updateNote(this.currentNote);
      this.render();
    }
  }

  render() {
    if (!this.currentNote) return;

    this.title.value = this.currentNote.title;
    
    this.togglesContainer.innerHTML = this.currentNote.toggles.map(toggle => `
      <div class="toggle-section">
        <div class="toggle-header" data-toggle-id="${toggle.id}">
          <svg class="toggle-icon ${toggle.isOpen ? 'open' : ''}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 18l6-6-6-6" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <input type="text" class="toggle-title" value="${toggle.title}" data-toggle-id="${toggle.id}" />
        </div>
        <div class="toggle-content ${toggle.isOpen ? 'open' : ''}">
          <textarea data-toggle-id="${toggle.id}" placeholder="Start writing...">${toggle.content}</textarea>
        </div>
      </div>
    `).join('');

    this.attachToggleListeners();
  }

  attachToggleListeners() {
    this.togglesContainer.querySelectorAll('.toggle-header').forEach(header => {
      const toggleId = parseInt(header.dataset.toggleId);
      
      header.addEventListener('click', (e) => {
        if (!e.target.classList.contains('toggle-title')) {
          this.toggleSection(toggleId);
          if (!this.currentNote.toggles.find(t => t.id === toggleId).isOpen) {
            header.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    });

    this.togglesContainer.querySelectorAll('.toggle-title').forEach(input => {
      input.addEventListener('input', (e) => {
        this.updateToggleTitle(parseInt(e.target.dataset.toggleId), e.target.value);
      });
      input.addEventListener('click', (e) => e.stopPropagation());
    });

    this.togglesContainer.querySelectorAll('textarea').forEach(textarea => {
      const toggleId = parseInt(textarea.dataset.toggleId);
      
      if (textarea.dataset.scrollTop) {
        textarea.scrollTop = parseInt(textarea.dataset.scrollTop);
      }

      autoResizeTextarea(textarea);
      
      textarea.addEventListener('input', (e) => {
        const scrollTop = textarea.scrollTop;
        this.updateToggleContent(toggleId, e.target.value);
        autoResizeTextarea(textarea);
        textarea.scrollTop = scrollTop;
      });

      textarea.addEventListener('scroll', () => {
        textarea.dataset.scrollTop = textarea.scrollTop;
      });

      textarea.addEventListener('focus', () => {
        const section = textarea.closest('.toggle-section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }
}
