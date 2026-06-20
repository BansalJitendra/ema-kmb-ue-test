/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-icon-tile. Base: cards.
 * Source: Kotak Bank (ema-kmb-ue-test). Generated for xwalk import.
 *
 * Container block (cards convention): each tile = one row with 2 cells.
 *   Cell 1: icon image -> field:image (alt -> media_imageAlt).
 *   Cell 2: label text -> field:text.
 * Source: a list (`ul.list-inline > li`); each li wraps an `<a>` with an
 *   `.icon img` and a `.txt` label.
 */
export default function parse(element, { document }) {
  const cells = [];

  let tiles = Array.from(element.querySelectorAll('ul.list-inline > li'));
  if (!tiles.length) tiles = Array.from(element.querySelectorAll('li'));
  if (!tiles.length) tiles = Array.from(element.querySelectorAll('.tile, .icon-tile'));

  tiles.forEach((tile) => {
    const img = tile.querySelector('.icon img, img');
    const txt = tile.querySelector('.txt');
    const anchor = tile.querySelector('a');
    if (!img && !txt) return;

    // Cell 1 - icon image.
    const imageCell = document.createDocumentFragment();
    if (img) {
      imageCell.appendChild(document.createComment(' field:image '));
      imageCell.appendChild(img.cloneNode(true));
    }

    // Cell 2 - label, wrapped as a link when the tile is clickable.
    const textCell = document.createDocumentFragment();
    const label = txt ? txt.textContent.replace(/\s+/g, ' ').trim() : '';
    if (label) {
      textCell.appendChild(document.createComment(' field:text '));
      const href = anchor ? anchor.getAttribute('href') : null;
      if (href && href !== 'javascript:void(0);' && href !== 'javascript:void(0)') {
        const a = document.createElement('a');
        a.setAttribute('href', href);
        a.textContent = label;
        textCell.appendChild(a);
      } else {
        textCell.appendChild(document.createTextNode(label));
      }
    }

    cells.push([imageCell, textCell]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-icon-tile', cells });
  element.replaceWith(block);
}
