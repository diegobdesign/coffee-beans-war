export function chip(text: string, ...classes: string[]): HTMLDivElement {
  const el = document.createElement('div');
  el.className = ['chip', ...classes].join(' ');
  el.textContent = text;
  return el;
}
