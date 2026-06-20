/* eslint-disable */
/* global WebImporter */
/**
 * Parser for search. Base: search.
 * Source: Kotak Bank (ema-kmb-ue-test). Generated for xwalk import.
 *
 * Search convention: 1 column, 2 rows (block name / query index URL).
 * UE model (search): index (text) -> field:index. The `classes` field is the
 *   Options multiselect and is intentionally NOT emitted (per hinting Rule 5).
 *   Row 2 (single cell): query index URL -> field:index.
 *
 * Source is a static search box (input + icon) with no index URL, so the
 * index cell is left for authoring; the default query-index path is provided.
 */
export default function parse(element, { document }) {
  // Source has no query index; default to the site's query-index.json so the
  // block is functional and the index field is authorable in UE.
  const indexUrl = '/query-index.json';

  const indexCell = document.createDocumentFragment();
  indexCell.appendChild(document.createComment(' field:index '));
  indexCell.appendChild(document.createTextNode(indexUrl));

  const cells = [[indexCell]];

  const block = WebImporter.Blocks.createBlock(document, { name: 'search', cells });
  element.replaceWith(block);
}
