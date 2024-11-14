/**
 * Get precise caret coordinates
 * @param {HTMLTextAreaElement} textarea - The textarea element
 * @returns {{x: number, y: number}} Caret coordinates
 */
export function getCaretCoordinates(textarea) {
  const position = textarea.selectionEnd;
  const { offsetLeft, offsetTop, value } = textarea;
  
  // Create mirror div for measurement
  const mirror = document.createElement('div');
  mirror.style.cssText = getComputedStyle(textarea).cssText;
  mirror.style.height = 'auto';
  mirror.style.width = textarea.offsetWidth + 'px';
  mirror.style.position = 'absolute';
  mirror.style.left = '-9999px';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';
  mirror.style.visibility = 'hidden';
  
  // Split content at cursor position
  const textBeforeCaret = value.substring(0, position);
  const textAfterCaret = value.substring(position);
  
  mirror.textContent = textBeforeCaret;
  const marker = document.createElement('span');
  marker.textContent = '|';
  mirror.appendChild(marker);
  mirror.appendChild(document.createTextNode(textAfterCaret));
  
  document.body.appendChild(mirror);
  const coordinates = {
    x: marker.offsetLeft + offsetLeft,
    y: marker.offsetTop + offsetTop
  };
  document.body.removeChild(mirror);
  
  return coordinates;
}