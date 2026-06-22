// Renders a grid of product cards (e.g. the debit-cards "Types of Debit cards"
// catalog). Each block row is one card: an image cell + a body cell holding the
// title, benefit bullets, optional "(Discontinued…)" note and the Know More /
// T&C links. Built client-side by the buildAutoBlocks hook in scripts.js.
export default function decorate(block) {
  [...block.children].forEach((row) => {
    row.classList.add('card-catalog-card');
    const cells = [...row.children];
    if (cells[0]) cells[0].classList.add('card-catalog-card-image');
    if (cells[1]) cells[1].classList.add('card-catalog-card-body');
  });
}
