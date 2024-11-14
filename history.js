export class HistoryManager {
  constructor(onChange, maxSize = 100) {
    this.undoStack = [];
    this.redoStack = [];
    this.onChange = onChange;
    this.maxSize = maxSize;
  }

  validateState(state) {
    try {
      if (!state || typeof state !== 'object') return false;
      if (!Array.isArray(state.toggles)) return false;
      if (typeof state.id !== 'number') return false;
      if (typeof state.title !== 'string') return false;
      return true;
    } catch (error) {
      console.error('State validation failed:', error);
      return false;
    }
  }

  createHistoryItem(state) {
    return {
      state: JSON.stringify(state),
      timestamp: Date.now()
    };
  }

  push(state) {
    if (!this.validateState(state)) {
      console.error('Invalid state pushed to history');
      return;
    }

    if (this.undoStack.length >= this.maxSize) {
      this.undoStack.shift(); // Remove oldest state
    }

    this.undoStack.push(this.createHistoryItem(state));
    this.redoStack = []; // Clear redo stack on new change
    this.updateButtons();
  }

  undo(currentState) {
    if (this.undoStack.length === 0) return null;
    
    try {
      const previousHistoryItem = this.undoStack.pop();
      const previousState = JSON.parse(previousHistoryItem.state);
      
      if (!this.validateState(previousState)) {
        throw new Error('Invalid state in history');
      }

      if (currentState) {
        this.redoStack.push(this.createHistoryItem(currentState));
      }

      this.updateButtons();
      return previousState;
    } catch (error) {
      console.error('Error during undo:', error);
      this.undoStack.pop(); // Remove invalid state
      this.updateButtons();
      return null;
    }
  }

  redo(currentState) {
    if (this.redoStack.length === 0) return null;
    
    try {
      const nextHistoryItem = this.redoStack.pop();
      const nextState = JSON.parse(nextHistoryItem.state);
      
      if (!this.validateState(nextState)) {
        throw new Error('Invalid state in history');
      }

      if (currentState) {
        this.undoStack.push(this.createHistoryItem(currentState));
      }

      this.updateButtons();
      return nextState;
    } catch (error) {
      console.error('Error during redo:', error);
      this.redoStack.pop(); // Remove invalid state
      this.updateButtons();
      return null;
    }
  }

  updateButtons() {
    if (this.onChange) {
      this.onChange({
        canUndo: this.undoStack.length > 0,
        canRedo: this.redoStack.length > 0
      });
    }
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.updateButtons();
  }

  getHistorySize() {
    return {
      undo: this.undoStack.length,
      redo: this.redoStack.length
    };
  }
}
