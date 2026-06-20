/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-media. Base: columns.
 * Source: Kotak Bank (ema-kmb-ue-test). Generated for xwalk import.
 *
 * Columns block convention: row 1 = block name; row 2 = one cell per column.
 * NOTE: Columns blocks must NOT include field-hint comments (per hinting rules);
 *   cells contain only default content (text + media).
 * Source: a `.columncontrol .row` with column children (`.col-md-*`), each
 *   holding media (image) and/or rich text.
 */
export default function parse(element, { document }) {
  // The columns live in a `.row` inside `.columncontrol`.
  const row = element.querySelector('.columncontrol .row, .row') || element;

  let columns = Array.from(row.children).filter((c) => /\bcol(-|\b)/.test(c.className || ''));
  if (!columns.length) {
    columns = Array.from(row.children).filter((c) => c.nodeType === 1);
  }

  if (!columns.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cellRow = columns.map((col) => {
    const content = [];
    Array.from(col.childNodes).forEach((n) => content.push(n.cloneNode(true)));
    return content;
  });

  const cells = [cellRow];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-media', cells });
  element.replaceWith(block);
}
