import { HIGHLIGHT_COLORS, editorHtmlToPlainText, highlightColor, highlightWords, lettersOnly, removeHighlights } from './editor-text';

const FORMATTED = '<h2>A heading</h2><p>The <strong>quick</strong> fox <i>runs</i> over the dog, '
  + 'and <a href="https://example.com/">the link</a>.</p><ul><li>the first</li></ul>';

const colorThe = (word: string) => (word === 'the' ? HIGHLIGHT_COLORS.verb : null);

describe('editorHtmlToPlainText', () => {
  it('removes highlight markup and keeps the words', () => {
    const html = '<p>It <span style="color:#3f51b5;"><b>is</b></span> a <strong>truth</strong>.</p>';
    expect(editorHtmlToPlainText(html)).toBe('It is a truth.');
  });

  it('keeps words apart across paragraphs and line breaks', () => {
    expect(editorHtmlToPlainText('<p>one</p><p>two</p>')).toBe('one\ntwo');
    expect(editorHtmlToPlainText('<p>one<br>two</p>')).toBe('one\ntwo');
    expect(editorHtmlToPlainText('<ul><li>one</li><li>two</li></ul>')).toBe('one\ntwo');
  });

  it('decodes entities, so text the user typed stays as typed', () => {
    expect(editorHtmlToPlainText('<p>a &lt;b&gt; &amp; c</p>')).toBe('a <b> & c');
  });

  it('treats non-breaking spaces as spaces', () => {
    expect(editorHtmlToPlainText('<p>one&nbsp;two</p>')).toBe('one two');
  });

  it('returns nothing for an empty editor', () => {
    expect(editorHtmlToPlainText('')).toBe('');
    expect(editorHtmlToPlainText(null)).toBe('');
    expect(editorHtmlToPlainText('<p>&nbsp;</p>')).toBe('');
  });

  it('does not run scripts or load images', () => {
    const marker = '__editorTextTestRan';
    const html = `<p>safe</p><img src="x" onerror="window.${marker}=1"><script>window.${marker}=1</script>`;
    expect(editorHtmlToPlainText(html)).toContain('safe');
    expect((window as any)[marker]).toBeUndefined();
  });
});

describe('highlightWords', () => {
  it('colours only the matching words', () => {
    const html = highlightWords('<p>the dog and the cat</p>', colorThe);
    expect(html.match(/<span style="color: [^"]+">the<\/span>/g)!.length).toBe(2);
    expect(html).toContain('dog and');
  });

  it('colours a word next to punctuation, and leaves the punctuation alone', () => {
    const html = highlightWords('<p>"the, dog</p>', colorThe);
    expect(html).toMatch(/"<span[^>]*>the<\/span>, dog/);
  });

  it('hands over the word as written, so the caller decides about case', () => {
    const seen: string[] = [];
    highlightWords('<p>The dog</p>', word => {
      seen.push(word);
      return null;
    });
    expect(seen).toContain('The');
  });

  it('does not colour part of a longer word', () => {
    expect(highlightWords('<p>then other</p>', colorThe)).not.toContain('<span');
  });

  it('keeps all other formatting', () => {
    const html = highlightWords(FORMATTED, colorThe);
    ['<h2>A heading</h2>', '<strong>quick</strong>', '<i>runs</i>', 'href="https://example.com/"', '<ul><li>'].forEach(tag =>
      expect(html).toContain(tag)
    );
  });

  it('does not add bold', () => {
    expect(highlightWords('<p>the dog</p>', colorThe)).not.toMatch(/<b>|<strong>/);
  });

  it('colours a word inside the user\'s own bold, and keeps the bold', () => {
    expect(highlightWords('<p><strong>the</strong></p>', colorThe)).toMatch(/<strong><span[^>]*>the<\/span><\/strong>/);
  });

  it('never changes the words', () => {
    expect(editorHtmlToPlainText(highlightWords(FORMATTED, colorThe))).toBe(editorHtmlToPlainText(FORMATTED));
  });

  it('keeps text that looks like HTML as text', () => {
    const html = highlightWords('<p>the &lt;script&gt;alert(1)&lt;/script&gt;</p>', colorThe);
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script');
  });
});

describe('removeHighlights', () => {
  it('restores the original HTML exactly', () => {
    expect(removeHighlights(highlightWords(FORMATTED, colorThe))).toBe(FORMATTED);
  });

  it('understands the colour format the editor writes', () => {
    expect(removeHighlights('<p><span style="color:rgb(63,81,181);">the</span> dog</p>')).toBe('<p>the dog</p>');
  });

  it('removes every highlight colour', () => {
    Object.values(HIGHLIGHT_COLORS).forEach(color =>
      expect(removeHighlights(`<p><span style="color:${color};">x</span></p>`)).toBe('<p>x</p>')
    );
  });

  it('keeps colours and backgrounds the user chose', () => {
    expect(removeHighlights('<p><span style="color:rgb(1,2,3);">mine</span></p>')).toContain('color');
    const merged = removeHighlights('<p><span style="background-color:rgb(1,2,3);color:#3f51b5;">x</span></p>');
    expect(merged).toContain('background-color');
    expect(merged).not.toContain('color: rgb(63');
  });

  it('keeps edits made after highlighting', () => {
    const edited = highlightWords('<p>the dog</p>', colorThe).replace('dog', 'cat');
    expect(removeHighlights(edited)).toBe('<p>the cat</p>');
  });
});

describe('highlightColor', () => {
  it('maps each part of speech to its colour', () => {
    const cases: [string, string][] = [
      ['VBD', HIGHLIGHT_COLORS.verb], ['JJ', HIGHLIGHT_COLORS.adjective], ['NNS', HIGHLIGHT_COLORS.noun],
      ['RB', HIGHLIGHT_COLORS.adverb], ['PRP', HIGHLIGHT_COLORS.pronoun], ['WP', HIGHLIGHT_COLORS.pronoun],
      ['DT', HIGHLIGHT_COLORS.other],
    ];
    for (const [tag, color] of cases) {
      expect(highlightColor(tag)).toBe(color);
    }
  });
});

describe('lettersOnly', () => {
  it('matches tokens to words as they appear in the text', () => {
    expect(lettersOnly('The')).toBe('the');
    expect(lettersOnly("'s")).toBe('s');
    expect(lettersOnly('étude')).toBe('étude');
  });
});
