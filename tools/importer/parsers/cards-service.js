/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-service. Base: cards.
 * Source: Kotak Bank (ema-kmb-ue-test). Generated for xwalk import.
 *
 * Container block (cards convention): each service card = one row with 2 cells.
 *   Cell 1: image -> field:image (alt -> media_imageAlt); often empty here.
 *   Cell 2: text (heading + description + CTA) -> field:text.
 * Source: `.service-card` (within `.row`) with an `h3`, a description `p`,
 *   and a `.know-more` CTA link. No image in this variant.
 */
export default function parse(element, { document }) {
  const cells = [];

  let cards = Array.from(element.querySelectorAll('.service-card'));
  if (!cards.length) cards = Array.from(element.querySelectorAll('.row > [class*="col"]'));

  cards.forEach((card) => {
    const img = card.querySelector('img');
    const heading = card.querySelector('h2, h3, h4');
    const desc = card.querySelector('p');
    const cta = card.querySelector('.know-more, a.button, a');
    if (!heading && !desc && !img) return;

    // Cell 1 - image (mandatory cell; left empty when no image present).
    const imageCell = document.createDocumentFragment();
    if (img) {
      imageCell.appendChild(document.createComment(' field:image '));
      imageCell.appendChild(img.cloneNode(true));
    }

    // Cell 2 - heading + description + CTA.
    const textCell = document.createDocumentFragment();
    const parts = [];
    if (heading) parts.push(heading.cloneNode(true));
    if (desc) parts.push(desc.cloneNode(true));
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

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-service', cells });
  element.replaceWith(block);
}
