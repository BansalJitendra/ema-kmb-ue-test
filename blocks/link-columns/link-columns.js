// The list icons were tokenized during migration into `<span class="icon
// icon-NAME">` (and EDS resolves those to a local /icons/NAME.svg that doesn't
// exist, so they 404). Map each token back to its original Kotak SVG URL and
// render a real <img>, matching the live icon-link list.
const ICONS = {
  apply: 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/apply.svg',
  'functionality-instant-pin-generation': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/functionality-instant-pin-generation.svg',
  'flexible-repayment-options': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/Flexible_repayment_options.svg',
  personalloan: 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/PersonalLoan.svg',
  'credit-card1': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/credit-card1.svg',
};

// Renders side-by-side link-list columns (e.g. the credit-cards "Credit Card
// Services" / "Credit Cards Guide" / "What's New?" trio). Each row of the block
// is one column: a heading cell + a cell holding the icon-link list and an
// optional trailing "view all" link.
export default function decorate(block) {
  [...block.children].forEach((row) => {
    row.classList.add('link-columns-col');
    const cells = [...row.children];
    if (cells[0]) cells[0].classList.add('link-columns-head');
    if (cells[1]) cells[1].classList.add('link-columns-body');
  });

  // Restore tokenized icons to their original external SVGs.
  block.querySelectorAll('span.icon, img').forEach((el) => {
    let token = null;
    if (el.tagName === 'SPAN') {
      const cls = [...el.classList].find((c) => c.startsWith('icon-'));
      token = cls ? cls.slice(5) : null;
    } else {
      // an <img> EDS already built pointing at the missing /icons/NAME.svg
      const m = (el.getAttribute('src') || '').match(/\/icons\/([^/.]+)\.svg/);
      token = m ? m[1] : null;
    }
    const url = token && ICONS[token];
    if (!url) return;
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.loading = 'lazy';
    img.className = 'link-columns-icon';
    (el.tagName === 'SPAN' ? el : el).replaceWith(img);
  });
}
