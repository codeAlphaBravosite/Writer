export class TogglesManager {
  constructor(container, noteManager, history) {
    this.container = container;
    this.noteManager = noteManager;
    this.history = history;
    this.currentNote = null;

    if (!this.container) {
      throw new Error('Toggles container element not found');
    }
    
    this.attachEventListeners();
  }

  attachEventListeners() {
    this.container.addEventListener('click', (e) => {
      const toggleSection = e.target.closest('.toggle-section');
      if (!toggleSection) return;

      const toggleId = parseInt(toggleSection.dataset.toggleId);
      
      if (e.target.classList.contains('toggle-expand')) {
        this.toggleExpand(toggleId);
      }
    });

    this.container.addEventListener('input', (e) => {
      const toggleSection = e.target.closest('.toggle-section');
      if (!toggleSection) return;

      const toggleId = parseInt(toggleSection.dataset.toggleId);
      
      if (e.target.classList.contains('toggle-title')) {
        this.updateToggle(toggleId, { title: e.target.value });
      } else if (e.target.tagName === 'TEXTAREA') {
        this.updateToggle(toggleId, { content: e.target.value });
      }
    });
  }

  addToggle() {
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
    this.noteManager.updateNote(this.currentNote)
      .catch(error => console.error('Failed to add toggle:', error));
    this.render();
  }

  toggleExpand(toggleId) {
    if (!this.currentNote) return;
    
    const previousState = JSON.parse(JSON.stringify(this.currentNote));
    const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
    
    if (toggle) {
      toggle.isOpen = !toggle.isOpen;
      this.history.push(previousState);
      this.noteManager.updateNote(this.currentNote)
        .catch(error => console.error('Failed to toggle section:', error));
      this.render();
    }
  }

  updateToggle(toggleId, changes) {
    if (!this.currentNote) return;
    
    const previousState = JSON.parse(JSON.stringify(this.currentNote));
    const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
    
    if (toggle) {
      Object.assign(toggle, changes);
      this.history.push(previousState);
      this.noteManager.updateNote(this.currentNote)
        .catch(error => console.error('Failed to update toggle:', error));
    }
  }

  render() {
    if (!this.currentNote) return;
    
    this.container.querySelectorAll('.toggle-section').forEach(section => {
      const toggleId = parseInt(section.dataset.toggleId);
      const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
      
      if (toggle) {
        const expandButton = section.querySelector('.toggle-expand');
        const content = section.querySelector('.toggle-content');
        
        expandButton?.classList.toggle('open', toggle.isOpen);
        content?.classList.toggle('open', toggle.isOpen);
      }
    });
  }
}