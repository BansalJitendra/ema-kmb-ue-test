/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-contact. Base: cards.
 * Source: Kotak Bank (ema-kmb-ue-test). Generated for xwalk import.
 *
 * Container block (per library convention): each card = one row with 2 cells.
 *   Cell 1: image -> field:image (alt collapses into media_imageAlt).
 *   Cell 2: text (heading + description + optional CTA) -> field:text.
 * Source: each `.offer` has `.icon-box img` and an `.ohidden` text block
 *   (h4 + p), optionally followed by a `.link-box` CTA.
 */
export default function parse(element, { document }) {
  const cells = [];

  let cards = Array.from(element.querySelectorAll('.offer'));
  if (!cards.length) {
    cards = Array.from(element.querySelectorAll('.col-md-4, .card'));
  }

  cards.forEach((card) => {
    const img = card.querySelector('.icon-box img, img');

    // Cell 1 - image (mandatory cell; may be empty).
    const imageCell = document.createDocumentFragment();
    if (img) {
      imageCell.appendChild(document.createComment(' field:image '));
      imageCell.appendChild(img.cloneNode(true));
    }

    // Cell 2 - text: heading + details + optional CTA link.
    const textCell = document.createDocumentFragment();
    const textParts = [];
    const textHost = card.querySelector('.ohidden') || card;
    Array.from(textHost.children).forEach((child) => {
      if (child.classList && child.classList.contains('icon-box')) return;
      textParts.push(child.cloneNode(true));
    });
    const link = card.querySelector('.link-box');
    if (link && !textHost.contains(link)) textParts.push(link.cloneNode(true));
    if (textParts.length) {
      textCell.appendChild(document.createComment(' field:text '));
      textParts.forEach((n) => textCell.appendChild(n));
    }

    cells.push([imageCell, textCell]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-contact', cells });
  element.replaceWith(block);
}
