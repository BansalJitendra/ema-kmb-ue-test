/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-feature. Base: cards.
 * Source: Kotak Bank (ema-kmb-ue-test). Generated for xwalk import.
 *
 * Container block (cards convention): each card = one row with 2 cells.
 *   Cell 1: image -> field:image (alt -> media_imageAlt).
 *   Cell 2: text (sub-title + heading + description + CTA) -> field:text.
 * Source: feature cards are `.main-white-box` (within `.col-md-4`) with an
 *   `img` and a `.details-box` (`.info-title`, `.hp-card-box` h4+desc, CTA).
 */
export default function parse(element, { document }) {
  const cells = [];

  let cards = Array.from(element.querySelectorAll('.main-white-box'));
  if (!cards.length) {
    cards = Array.from(element.querySelectorAll('.feature-card, .col-md-4 .card, .card'));
  }

  cards.forEach((card) => {
    const img = card.querySelector('img');

    // Cell 1 - image.
    const imageCell = document.createDocumentFragment();
    if (img) {
      imageCell.appendChild(document.createComment(' field:image '));
      imageCell.appendChild(img.cloneNode(true));
    }

    // Cell 2 - text content from the details box.
    const textCell = document.createDocumentFragment();
    const parts = [];
    const details = card.querySelector('.details-box') || card;
    const subTitle = details.querySelector('.info-title');
    const headBox = details.querySelector('.hp-card-box');
    const cta = details.querySelector('.link-box a, a.em-cta');
    if (subTitle) parts.push(subTitle.cloneNode(true));
    if (headBox) {
      Array.from(headBox.children).forEach((c) => parts.push(c.cloneNode(true)));
    } else {
      const h = details.querySelector('h2, h3, h4, h5');
      const desc = details.querySelector('.info-box');
      if (h) parts.push(h.cloneNode(true));
      if (desc) parts.push(desc.cloneNode(true));
    }
    if (cta) parts.push(cta.cloneNode(true));
    if (parts.length) {
      textCell.appendChild(document.createComment(' field:text '));
      parts.forEach((n) => textCell.appendChild(n));
    }

    cells.push([imageCell, textCell]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
  element.replaceWith(block);
}
