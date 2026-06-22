// Renders a row of icon + label + description features (e.g. current-accounts
// "One Current Account, many robust offerings": Loans, POS/QR/UPI, Payment &
// Collection, Trade Forex). Each block row is one feature: an icon cell + a text
// cell (bold label + description). Built client-side by buildAutoBlocks.
export default function decorate(block) {
  [...block.children].forEach((row) => {
    row.classList.add('feature-row-item');
    const cells = [...row.children];
    if (cells[0]) cells[0].classList.add('feature-row-icon');
    if (cells[1]) cells[1].classList.add('feature-row-text');
  });
}
