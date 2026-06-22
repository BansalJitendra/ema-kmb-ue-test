// Renders a responsive grid of icon + label tiles (e.g. the current-accounts
// "Solutions for your Business", "Unlock exciting deals…", account-variant and
// product-need link grids). Each block row is one tile: an icon cell + a label
// cell (a link). Built client-side by the buildAutoBlocks hook in scripts.js.
export default function decorate(block) {
  [...block.children].forEach((row) => {
    row.classList.add('icon-grid-tile');
    const cells = [...row.children];
    if (cells[0]) cells[0].classList.add('icon-grid-icon');
    if (cells[1]) cells[1].classList.add('icon-grid-label');
  });
}
