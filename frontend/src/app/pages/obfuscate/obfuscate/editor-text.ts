const BLOCK_ELEMENTS = 'p, div, li, h1, h2, h3, h4, h5, h6, blockquote, tr, br';

/** The highlight colour for each part of speech. Nothing else on the page may use these colours. */
export const HIGHLIGHT_COLORS = {
  verb: '#3f51b5',
  adjective: '#b2200a',
  noun: '#ff4081',
  adverb: '#a68051',
  pronoun: '#17a2b8',
  other: '#6d6d6d'
};

// DOMParser builds an inert document, so scripts and images in the HTML never run or load.
function parse(html: string | null): Document {
  return new DOMParser().parseFromString(html || '', 'text/html');
}

/**
 * Returns the words a person sees in the editor, without the markup behind them.
 * The analysis must only ever receive this, because tags would be counted as words.
 */
export function editorHtmlToPlainText(html: string | null): string {
  const page = parse(html);

  // Keep words on either side of a block boundary apart: <p>one</p><p>two</p>
  page.body.querySelectorAll(BLOCK_ELEMENTS).forEach(element =>
    element.parentNode.insertBefore(page.createTextNode('\n'), element.nextSibling)
  );

  return page.body.textContent
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '')
    .join('\n');
}

/**
 * Colours words where they stand, and leaves all other formatting alone.
 * colorFor returns the colour for a word, or null to leave it as it is.
 */
export function highlightWords(html: string | null, colorFor: (word: string) => string | null): string {
  const page = parse(html);
  const walker = page.createTreeWalker(page.body, NodeFilter.SHOW_TEXT);
  const textNodes: Node[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach(node => {
    const pieces = page.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach(piece => {
      const color = colorFor(piece);
      if (color) {
        const span = page.createElement('span');
        span.style.color = color;
        span.textContent = piece;
        pieces.appendChild(span);
      } else {
        pieces.appendChild(page.createTextNode(piece));
      }
    });
    node.parentNode.replaceChild(pieces, node);
  });

  return page.body.innerHTML;
}

/** Undoes highlightWords, including after the editor has rewritten the markup. */
export function removeHighlights(html: string | null): string {
  const page = parse(html);

  // The browser normalises colours, so compare them in the form it reports them.
  const probe = page.createElement('span');
  const highlightColors = new Set(Object.values(HIGHLIGHT_COLORS).map(color => {
    probe.style.color = color;
    return probe.style.color;
  }));

  page.body.querySelectorAll('span').forEach(span => {
    if (highlightColors.has(span.style.color)) {
      span.style.removeProperty('color');
      if (span.style.length === 0) {
        span.replaceWith(...Array.from(span.childNodes));
      }
    }
  });
  page.body.normalize();

  return page.body.innerHTML;
}
