import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

// Brand images for the credit-cards "Credit Card offers you don't want to miss!"
// strip. The source offer images are lazy-loaded from a backend feed, so the
// migrated content has no image for these cards. Match each offer card by its
// title and inject its image client-side so the cards render like the live
// carousel (image on top). Keyed by the card heading text.
const OFFER_IMAGES = {
  'Eco Mobility': 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/travel-offer/eco-mobility-t.jpg',
  Amazon: 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/amazon-offer-t.jpg',
  Canon: 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/electronics/canon-t.jpg',
  Yatra: 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/travel-offer/yatra-t.jpg',
  'Paytm Flights': 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/travel-offer/paytm-flights-t.jpg',
  Ixigo: 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/travel-offer/Ixigo-t.jpg',
  Ather: 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/others/atheroffer-t.jpg',
  'River Cash': 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/others/river-cash-t.jpg',
  Godrej: 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/electronics/godrej-t.jpg',
  'Hero Motorbikes': 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/others/memi-two-wheeler-t.jpg',
  KTM: 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/others/ktmoffer-t.jpg',
  Liebherr: 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/electronics/liebherr-web-product-t.jpg',
};

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  // External image URLs come through as a link to an image file (EDS only
  // builds <picture> for ingested same-origin media). Convert such links into
  // a <picture><img> so the card image renders.
  block.querySelectorAll('a[href]').forEach((link) => {
    if (/\.(jpe?g|png|webp|gif|svg)(\?|$|\.)/i.test(link.getAttribute('href'))) {
      const img = document.createElement('img');
      img.src = link.getAttribute('href');
      img.alt = link.textContent.trim();
      img.loading = 'lazy';
      const picture = document.createElement('picture');
      picture.append(img);
      link.replaceWith(picture);
    }
  });
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);

    // Offer cards: the image cell is empty but the body names a known offer.
    // Inject the brand image into the empty cell so it renders like a normal
    // image card (and like the live offer carousel).
    const heading = li.querySelector('h2, h3, h4, h5');
    const offerSrc = heading && OFFER_IMAGES[heading.textContent.trim()];
    if (offerSrc) {
      const emptyCell = [...li.children]
        .find((div) => div.textContent.trim() === '' && !div.querySelector('picture, img'));
      if (emptyCell) {
        const picture = document.createElement('picture');
        const img = document.createElement('img');
        img.src = offerSrc;
        img.alt = heading.textContent.trim();
        img.loading = 'lazy';
        picture.append(img);
        emptyCell.append(picture);
      }
    }

    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'cards-feature-card-image';
      } else if (div.textContent.trim() === '' && !div.querySelector('picture, img')) {
        // Empty cell (e.g. the absent image slot on offer cards) — drop it so it
        // doesn't render as a blank gap at the top of the card.
        div.remove();
      } else {
        div.className = 'cards-feature-card-body';
      }
    });
    ul.append(li);
  });

  // Offer-style blocks (e.g. the credit-cards "Credit Card offers" strip) have
  // no card images at all. Flag the block so the CSS can render compact text
  // tiles instead of reserving space for a missing image.
  if (!ul.querySelector('.cards-feature-card-image')) {
    block.classList.add('cards-feature-offers');
  }
  ul.querySelectorAll('picture > img').forEach((img) => {
    // Only optimize same-origin (ingested) images; external URLs are served as-is.
    if (img.src.startsWith(window.location.origin) || img.src.startsWith('/')) {
      const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
      moveInstrumentation(img, optimizedPic.querySelector('img'));
      img.closest('picture').replaceWith(optimizedPic);
    }
  });
  block.textContent = '';
  block.append(ul);
}
