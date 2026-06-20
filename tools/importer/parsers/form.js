/* eslint-disable */
/* global WebImporter */
/**
 * Parser for form. Base: form (custom block).
 * Source: Kotak Bank (ema-kmb-ue-test). Generated for xwalk import.
 *
 * UE model (form): reference (aem-content, link to the form definition) and
 *   action (text, submit URL). The EDS form block renders by fetching a form
 *   definition referenced in the first cell.
 *   Row 2 (single cell): form definition reference -> field:reference.
 *   Row 3 (single cell, optional): submit action URL -> field:action.
 *
 * Source forms are server-rendered `<form>` elements; we capture the form's
 * action as the reference/submit URL so the block can be wired up in UE.
 */
export default function parse(element, { document }) {
  const form = element.matches && element.matches('form')
    ? element
    : element.querySelector('form');

  // Determine a reference/action URL from the source form when available.
  let actionUrl = '';
  if (form) {
    actionUrl = form.getAttribute('action') || form.getAttribute('data-action') || '';
  }
  if (!actionUrl) {
    // Fall back to a nearby submit/CTA link if the form has no action attribute.
    const cta = element.querySelector('a[href]');
    if (cta) actionUrl = cta.getAttribute('href') || '';
  }

  const cells = [];

  // Row 2 - form definition reference.
  const refCell = document.createDocumentFragment();
  refCell.appendChild(document.createComment(' field:reference '));
  if (actionUrl) {
    const a = document.createElement('a');
    a.setAttribute('href', actionUrl);
    a.textContent = actionUrl;
    refCell.appendChild(a);
  }
  cells.push([refCell]);

  // Row 3 - submit action URL (only when known).
  if (actionUrl) {
    const actionCell = document.createDocumentFragment();
    actionCell.appendChild(document.createComment(' field:action '));
    actionCell.appendChild(document.createTextNode(actionUrl));
    cells.push([actionCell]);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'form', cells });
  element.replaceWith(block);
}
