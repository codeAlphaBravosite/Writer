export class HistoryManager {
  constructor(onChange, maxSize = 100) {
    this.undoStack = [];
    this.redoStack = [];
    this.onChange = onChange;
    this.maxSize = maxSize;
  }

  push(state) {
    if (!state) return;
    
    const serializedState = JSON.stringify(state);
    
    if (this.undoStack.length > 0 && serializedState === this.undoStack[this.undoStack.length - 1]) {
      return;
    }

    if (this.undoStack.length >= this.maxSize) {
      this.undoStack.shift();
    }

    this.undoStack.push(serializedState);
    this.redoStack = [];
    this.updateButtons();
  }

  undo() {
    if (this.undoStack.length === 0) return null;
    
    const currentState = this.undoStack.pop();
    if (currentState) {
      this.redoStack.push(currentState);
      const previousState = this.undoStack[this.undoStack.length - 1];
      this.updateButtons();
      return previousState ? JSON.parse(previousState) : null;
    }
    return null;
  }

  redo() {
    if (this.redoStack.length === 0) return null;
    
    const nextState = this.redoStack.pop();
    if (nextState) {
      this.undoStack.push(nextState);
      this.updateButtons();
      return JSON.parse(nextState);
    }
    return null;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.updateButtons();
  }

  updateButtons() {
    if (this.onChange) {
      this.onChange({
        canUndo: this.undoStack.length > 0,
        canRedo: this.redoStack.length > 0
      });
    }
  }
}