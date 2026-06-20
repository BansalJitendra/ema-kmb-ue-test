/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: kotak.bank.in site-wide cleanup.
 *
 * Removes non-authorable site chrome so the import contains only page-level
 * authorable content. Every selector below was verified against the captured
 * DOM in migration-work/cleaned.html (and cross-checked against
 * cleaned.homepage.html and cleaned.section-landing-tabbed.html).
 *
 * Verified chrome in captured DOM:
 *   - #notification_widget / [id^="modal-widget-"]  : top notification/promo bar wrapper
 *     (<section id="notification_widget" class="header-info-box ...">, wrapped in
 *      <div id="modal-widget-1772700773481">)
 *   - header.header-container                        : global header / mega-menu
 *     (<header class="header-container search-results-cont ...">)
 *   - nav.mobile-header                              : mobile header navigation
 *   - #search-modal (.search-modal-popup)            : header search overlay popup
 *   - .breadcrumb                                    : breadcrumb list (<ol class="breadcrumb ...">)
 *   - input.productCategory / input.productParentPage / #unica-icon : hidden page-state inputs
 *   - link / noscript                                : stray non-content tags
 *
 * ⚠️ Footer note: the captured DOM has a MALFORMED <footer class="footer"> whose
 * closing tag is misplaced near the very end of <body>, so it wraps trailing
 * AUTHORABLE content (e.g. div.image-slider-no-pip.section carousels, .cmp-text
 * blocks, .sf-popup-div) before the actual footer chrome begins. Removing
 * `footer.footer` wholesale deletes that authorable content. Instead we remove
 * only the genuine footer-chrome containers, both verified to appear AFTER all
 * authorable content inside the footer and to contain all footer chrome:
 *   - .ifooter_support_par : footer support links + .back-to-top (nested inside)
 *   - .secondaryfooter     : footer sitemap + .copyright-box (nested inside)
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Overlays/popups and global chrome removed EARLY so they can't leak into
    // block parsing or trailing content. Selectors verified against the live
    // kotak.bank.in DOM across multiple page types (careers, grievance-redressal,
    // our-business, executive-leadership).
    WebImporter.DOMUtils.remove(element, [
      // Header search overlay popup
      '#search-modal',
      // Notification / promo bar at the very top of the body
      '#notification_widget',
      '[id^="modal-widget-"]',
      // Global desktop header / mega-menu
      'header',
      'header.header-container',
      // Mobile header navigation (two distinct implementations across pages)
      'nav.mobile-header',
      '.mobile-header-container',
      '.mb-header-menuoffcanvas',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Footer + remaining non-authorable chrome.
    WebImporter.DOMUtils.remove(element, [
      // Breadcrumb trail
      '.breadcrumb',
      // Full footer (well-formed on standard pages). The two specific
      // chrome containers are also listed as a fallback for the rare
      // malformed-footer case where </footer> is misplaced.
      'footer',
      'footer.footer',
      '.ifooter_support_par',
      '.secondaryfooter',
      '.back-to-top',
      // Hidden page-state inputs (not authorable)
      'input.productCategory',
      'input.productParentPage',
      '#unica-icon',
      // Stray non-content tags
      'link',
      'noscript',
    ]);
  }
}
