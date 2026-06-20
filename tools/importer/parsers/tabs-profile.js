/* eslint-disable */
/* global WebImporter */
/**
 * Parser for tabs-profile. Base: tabs.
 * Source: Kotak Bank (ema-kmb-ue-test). Generated for xwalk import.
 *
 * Tabs convention: 2 columns, multiple rows. First row = block name.
 * Each subsequent row = one tab: [label, content].
 * UE model (tabs-profile-item): title (label), content_heading, content_image,
 *   content_richtext (grouped under content_*). content_headingType ends with
 *   `Type` so it is collapsed (no hint).
 *   Cell 1: tab label -> field:title.
 *   Cell 2: heading + image + richtext -> field:content_heading,
 *           field:content_image, field:content_richtext.
 * Source: tab panels (`.tab-content > div[id]`) each hold a `figure img`,
 *   an `h4` (name/heading) and one or more `p`. The tab label is taken from
 *   each panel's own heading (the nav carousel duplicates items as owl clones,
 *   so index alignment against the nav is unreliable).
 */
export default function parse(element, { document }) {
  const cells = [];

  // Tab content panels.
  let panels = Array.from(element.querySelectorAll('.tab-content > div[id]'));
  if (!panels.length) panels = Array.from(element.querySelectorAll('.tab-pane, [class*="tab"] > div[id]'));

  panels.forEach((panel, idx) => {
    const img = panel.querySelector('figure img, img');
    const heading = panel.querySelector('h2, h3, h4, h5');
    const paras = Array.from(panel.querySelectorAll('p'));

    // Label from the panel's own heading (reliable, avoids owl-clone offset).
    const label = heading
      ? heading.textContent.replace(/\s+/g, ' ').trim()
      : `Tab ${idx + 1}`;

    // Cell 1 - tab label/title.
    const labelCell = document.createDocumentFragment();
    labelCell.appendChild(document.createComment(' field:title '));
    labelCell.appendChild(document.createTextNode(label));

    // Cell 2 - tab content (heading, image, richtext) grouped under content_*.
    const contentCell = document.createDocumentFragment();
    if (heading) {
      contentCell.appendChild(document.createComment(' field:content_heading '));
      contentCell.appendChild(heading.cloneNode(true));
    }
    if (img) {
      contentCell.appendChild(document.createComment(' field:content_image '));
      contentCell.appendChild(img.cloneNode(true));
    }
    if (paras.length) {
      contentCell.appendChild(document.createComment(' field:content_richtext '));
      paras.forEach((p) => contentCell.appendChild(p.cloneNode(true)));
    }

    cells.push([labelCell, contentCell]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'tabs-profile', cells });
  element.replaceWith(block);
}
