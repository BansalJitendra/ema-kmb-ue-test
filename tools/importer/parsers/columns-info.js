/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-info. Base: columns.
 * Source: Kotak Bank (ema-kmb-ue-test). Generated for xwalk import.
 *
 * Columns block convention: row 1 = block name; row 2 = one cell per column.
 * NOTE: Columns blocks must NOT include field-hint comments (per hinting rules);
 *   cells contain only default content.
 * Source: a `.row` with column children `.info-col` (`.col-md-6`), each holding
 *   a heading and/or paragraphs.
 */
export default function parse(element, { document }) {
  // Locate the row that holds the columns.
  const row = element.querySelector('.row') || element;

  // Direct column children only (avoid nested grid duplication).
  let columns = Array.from(row.children).filter((c) => /\bcol(-|\b)/.test(c.className || '') || c.classList.contains('info-col'));
  if (!columns.length) {
    columns = Array.from(element.querySelectorAll('.info-col'));
  }

  if (!columns.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Each column becomes one cell in a single content row.
  const cellRow = columns.map((col) => {
    const content = [];
    Array.from(col.childNodes).forEach((n) => content.push(n.cloneNode(true)));
    return content;
  });

  const cells = [cellRow];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-info', cells });
  element.replaceWith(block);
}
