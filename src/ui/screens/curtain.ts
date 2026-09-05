/**
 * Nothing ever renders a black canvas (QA.md C2). A paper receipt with one readable line and a retry,
 * for context loss, WebGL refusal and uncaught errors.
 */
export function showCurtain(
  app: HTMLElement,
  line: string,
  detail: string | null,
  retry: (() => void) | null,
): () => void {
  const host = document.createElement('div');
  host.className = 'curtain';
  host.setAttribute('role', 'alert');
  const card = document.createElement('div');
  card.className = 'receipt';
  const h = document.createElement('div');
  h.className = 'receipt-head';
  h.textContent = line;
  card.append(h);
  if (detail !== null) {
    const d = document.createElement('div');
    d.className = 'receipt-line';
    d.textContent = detail;
    card.append(d);
  }
  if (retry !== null) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn--primary btn--wide';
    b.textContent = 'RETRY';
    b.addEventListener('click', retry);
    card.append(b);
  }
  host.append(card);
  app.append(host);
  return () => {
    host.remove();
  };
}
