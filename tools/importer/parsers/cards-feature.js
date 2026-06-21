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

  // Product-card grid (`.cards-list`): each card is `.mf-sm-cards` wrapping an
  // `<a>` with a `.card-img` image and a `.card-title` label. Map to one row
  // per card: image + (title link).
  if (!cards.length) {
    const productCards = Array.from(element.querySelectorAll('.mf-sm-cards'));
    if (productCards.length) {
      productCards.forEach((card) => {
        const img = card.querySelector('img');
        const link = card.querySelector('a');
        const title = card.querySelector('.card-title');
        const href = link ? link.getAttribute('href') || '' : '';

        const imageCell = document.createDocumentFragment();
        if (img) {
          imageCell.appendChild(document.createComment(' field:image '));
          imageCell.appendChild(img.cloneNode(true));
        }

        const textCell = document.createDocumentFragment();
        textCell.appendChild(document.createComment(' field:text '));
        const label = title ? title.textContent.replace(/\s+/g, ' ').trim() : (link ? link.textContent.replace(/\s+/g, ' ').trim() : '');
        if (href && label) {
          const a = document.createElement('a');
          a.setAttribute('href', href);
          a.textContent = label;
          textCell.appendChild(a);
        } else if (label) {
          const p = document.createElement('p');
          p.textContent = label;
          textCell.appendChild(p);
        }

        cells.push([imageCell, textCell]);
      });
    }
  }

  // Offer cards (`.offer-container`): no image; carry a category label
  // (`.title-box`), an `h4` title, a description (`.info-box`), a validity
  // (`.valid-box`) and a CTA. Map to a text-only card row.
  if (!cards.length) {
    const offers = Array.from(element.querySelectorAll('.offer-container'));
    if (offers.length) {
      offers.forEach((offer) => {
        const imageCell = document.createDocumentFragment();
        const textCell = document.createDocumentFragment();
        textCell.appendChild(document.createComment(' field:text '));
        const parts = [];
        const cat = offer.querySelector('.title-box');
        const heading = offer.querySelector('h2, h3, h4, h5');
        const desc = offer.querySelector('.info-box');
        const valid = offer.querySelector('.valid-box');
        if (cat) { const p = document.createElement('p'); p.textContent = cat.textContent.replace(/\s+/g, ' ').trim(); parts.push(p); }
        if (heading) parts.push(heading.cloneNode(true));
        if (desc) { const p = document.createElement('p'); p.textContent = desc.textContent.replace(/\s+/g, ' ').trim(); parts.push(p); }
        if (valid) { const p = document.createElement('p'); p.textContent = valid.textContent.replace(/\s+/g, ' ').trim(); parts.push(p); }
        parts.forEach((n) => textCell.appendChild(n));
        if (parts.length) cells.push([imageCell, textCell]);
      });
    }
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
