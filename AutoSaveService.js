export class AutoSaveService {
  constructor(noteManager, history) {
    this.noteManager = noteManager;
    this.history = history;
    this.timeout = null;
    this.delay = 500;
  }

  scheduleAutoSave(note, previousState) {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(() => {
      if (JSON.stringify(previousState) !== JSON.stringify(note)) {
        this.history.push(previousState);
        this.noteManager.updateNote(note);
      }
    }, this.delay);
  }
}