export function autoResizeTextarea(textarea) {
  const scrollTop = textarea.scrollTop;
  textarea.style.height = 'auto';
  textarea.style.height = Math.max(100, textarea.scrollHeight) + 'px';
  textarea.scrollTop = scrollTop;
}