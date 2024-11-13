export class HistoryManager {
  constructor(onChange) {
    this.undoStack = [];
    this.redoStack = [];
    this.onChange = onChange;
    this.isUndoRedo = false;
  }

  push(state) {
    if (this.isUndoRedo) {
      this.isUndoRedo = false;
      return;
    }

    this.undoStack.push(JSON.stringify(state));
    this.redoStack = [];
    this.notifyChange();
  }

  undo(currentState) {
    if (this.undoStack.length === 0) return null;
    
    this.isUndoRedo = true;
    this.redoStack.push(JSON.stringify(currentState));
    const previousState = JSON.parse(this.undoStack.pop());
    this.notifyChange();
    return previousState;
  }

  redo(currentState) {
    if (this.redoStack.length === 0) return null;
    
    this.isUndoRedo = true;
    this.undoStack.push(JSON.stringify(currentState));
    const nextState = JSON.parse(this.redoStack.pop());
    this.notifyChange();
    return nextState;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.notifyChange();
  }

  notifyChange() {
    if (this.onChange) {
      this.onChange({
        canUndo: this.undoStack.length > 0,
        canRedo: this.redoStack.length > 0
      });
    }
  }
}