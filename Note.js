export class Note {
  constructor(data = {}) {
    this.id = data.id || Date.now();
    this.title = data.title || '';
    this.toggles = data.toggles || Array.from({ length: 3 }, (_, i) => ({
      id: this.id + i,
      title: `Section ${i + 1}`,
      content: '',
      isOpen: i === 0
    }));
    this.created = data.created || new Date().toISOString();
    this.updated = data.updated || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      toggles: this.toggles,
      created: this.created,
      updated: this.updated
    };
  }
}