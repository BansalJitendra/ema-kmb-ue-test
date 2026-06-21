/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-kotak.js
  var import_kotak_exports = {};
  __export(import_kotak_exports, {
    default: () => import_kotak_default
  });

  // tools/importer/parsers/accordion-rates.js
  function parse(element, { document }) {
    const cells = [];
    let items = Array.from(element.querySelectorAll(".rate-card"));
    if (!items.length) {
      items = Array.from(element.querySelectorAll(".accordion-item, .faq-item, .panel"));
    }
    if (!items.length) {
      const headings = Array.from(element.querySelectorAll("h2.target, h3.target"));
      if (headings.length) {
        headings.forEach((titleEl) => {
          let contentEl = titleEl.nextElementSibling;
          while (contentEl && !contentEl.classList.contains("toggle-ctnt")) {
            contentEl = contentEl.nextElementSibling;
          }
          const summaryFrag = document.createDocumentFragment();
          summaryFrag.appendChild(document.createComment(" field:summary "));
          const clone = titleEl.cloneNode(true);
          clone.querySelectorAll("figure, img, i, .icon-more-arow").forEach((n) => n.remove());
          summaryFrag.appendChild(document.createTextNode(clone.textContent.replace(/\s+/g, " ").trim()));
          const contentFrag = document.createDocumentFragment();
          contentFrag.appendChild(document.createComment(" field:text "));
          if (contentEl) {
            const body = contentEl.querySelector(".cmp-text, .block") || contentEl;
            Array.from(body.childNodes).forEach((n) => contentFrag.appendChild(n.cloneNode(true)));
          }
          cells.push([summaryFrag, contentFrag]);
        });
      }
    }
    items.forEach((item) => {
      const titleEl = item.querySelector("h2.target, h2, h3, .accordion-title, .faq-question");
      const contentEl = item.querySelector(".toggle-ctnt, .accordion-content, .faq-answer, .panel-body");
      const summaryFrag = document.createDocumentFragment();
      summaryFrag.appendChild(document.createComment(" field:summary "));
      if (titleEl) {
        const clone = titleEl.cloneNode(true);
        clone.querySelectorAll("figure, img, i, .icon-more-arow").forEach((n) => n.remove());
        const label = clone.textContent.replace(/\s+/g, " ").trim();
        summaryFrag.appendChild(document.createTextNode(label));
      }
      const contentFrag = document.createDocumentFragment();
      contentFrag.appendChild(document.createComment(" field:text "));
      if (contentEl) {
        const body = contentEl.querySelector(".block") || contentEl;
        Array.from(body.childNodes).forEach((n) => contentFrag.appendChild(n.cloneNode(true)));
      }
      cells.push([summaryFrag, contentFrag]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "accordion-rates", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-contact.js
  function parse2(element, { document }) {
    const cells = [];
    let cards = Array.from(element.querySelectorAll(".offer"));
    if (!cards.length) {
      cards = Array.from(element.querySelectorAll(".col-md-4, .card"));
    }
    cards.forEach((card) => {
      const img = card.querySelector(".icon-box img, img");
      const imageCell = document.createDocumentFragment();
      if (img) {
        imageCell.appendChild(document.createComment(" field:image "));
        imageCell.appendChild(img.cloneNode(true));
      }
      const textCell = document.createDocumentFragment();
      const textParts = [];
      const textHost = card.querySelector(".ohidden") || card;
      Array.from(textHost.children).forEach((child) => {
        if (child.classList && child.classList.contains("icon-box")) return;
        textParts.push(child.cloneNode(true));
      });
      const link = card.querySelector(".link-box");
      if (link && !textHost.contains(link)) textParts.push(link.cloneNode(true));
      if (textParts.length) {
        textCell.appendChild(document.createComment(" field:text "));
        textParts.forEach((n) => textCell.appendChild(n));
      }
      cells.push([imageCell, textCell]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-contact", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-feature.js
  function parse3(element, { document }) {
    const cells = [];
    let cards = Array.from(element.querySelectorAll(".main-white-box"));
    if (!cards.length) {
      cards = Array.from(element.querySelectorAll(".feature-card, .col-md-4 .card, .card"));
    }
    if (!cards.length) {
      const productCards = Array.from(element.querySelectorAll(".mf-sm-cards"));
      if (productCards.length) {
        productCards.forEach((card) => {
          const img = card.querySelector("img");
          const link = card.querySelector("a");
          const title = card.querySelector(".card-title");
          const href = link ? link.getAttribute("href") || "" : "";
          const imageCell = document.createDocumentFragment();
          if (img) {
            imageCell.appendChild(document.createComment(" field:image "));
            imageCell.appendChild(img.cloneNode(true));
          }
          const textCell = document.createDocumentFragment();
          textCell.appendChild(document.createComment(" field:text "));
          const label = title ? title.textContent.replace(/\s+/g, " ").trim() : link ? link.textContent.replace(/\s+/g, " ").trim() : "";
          if (href && label) {
            const a = document.createElement("a");
            a.setAttribute("href", href);
            a.textContent = label;
            textCell.appendChild(a);
          } else if (label) {
            const p = document.createElement("p");
            p.textContent = label;
            textCell.appendChild(p);
          }
          cells.push([imageCell, textCell]);
        });
      }
    }
    if (!cards.length) {
      const offers = Array.from(element.querySelectorAll(".offer-container"));
      if (offers.length) {
        offers.forEach((offer) => {
          const imageCell = document.createDocumentFragment();
          const textCell = document.createDocumentFragment();
          textCell.appendChild(document.createComment(" field:text "));
          const parts = [];
          const cat = offer.querySelector(".title-box");
          const heading = offer.querySelector("h2, h3, h4, h5");
          const desc = offer.querySelector(".info-box");
          const valid = offer.querySelector(".valid-box");
          if (cat) {
            const p = document.createElement("p");
            p.textContent = cat.textContent.replace(/\s+/g, " ").trim();
            parts.push(p);
          }
          if (heading) parts.push(heading.cloneNode(true));
          if (desc) {
            const p = document.createElement("p");
            p.textContent = desc.textContent.replace(/\s+/g, " ").trim();
            parts.push(p);
          }
          if (valid) {
            const p = document.createElement("p");
            p.textContent = valid.textContent.replace(/\s+/g, " ").trim();
            parts.push(p);
          }
          parts.forEach((n) => textCell.appendChild(n));
          if (parts.length) cells.push([imageCell, textCell]);
        });
      }
    }
    cards.forEach((card) => {
      const img = card.querySelector("img");
      const imageCell = document.createDocumentFragment();
      if (img) {
        imageCell.appendChild(document.createComment(" field:image "));
        imageCell.appendChild(img.cloneNode(true));
      }
      const textCell = document.createDocumentFragment();
      const parts = [];
      const details = card.querySelector(".details-box") || card;
      const subTitle = details.querySelector(".info-title");
      const headBox = details.querySelector(".hp-card-box");
      const cta = details.querySelector(".link-box a, a.em-cta");
      if (subTitle) parts.push(subTitle.cloneNode(true));
      if (headBox) {
        Array.from(headBox.children).forEach((c) => parts.push(c.cloneNode(true)));
      } else {
        const h = details.querySelector("h2, h3, h4, h5");
        const desc = details.querySelector(".info-box");
        if (h) parts.push(h.cloneNode(true));
        if (desc) parts.push(desc.cloneNode(true));
      }
      if (cta) parts.push(cta.cloneNode(true));
      if (parts.length) {
        textCell.appendChild(document.createComment(" field:text "));
        parts.forEach((n) => textCell.appendChild(n));
      }
      cells.push([imageCell, textCell]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-feature", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-icon-tile.js
  function parse4(element, { document }) {
    const cells = [];
    let tiles = Array.from(element.querySelectorAll("ul.list-inline > li"));
    if (!tiles.length) tiles = Array.from(element.querySelectorAll("li"));
    if (!tiles.length) tiles = Array.from(element.querySelectorAll(".tile, .icon-tile"));
    tiles.forEach((tile) => {
      const img = tile.querySelector(".icon img, img");
      const txt = tile.querySelector(".txt");
      const anchor = tile.querySelector("a");
      if (!img && !txt) return;
      const imageCell = document.createDocumentFragment();
      if (img) {
        imageCell.appendChild(document.createComment(" field:image "));
        imageCell.appendChild(img.cloneNode(true));
      }
      const textCell = document.createDocumentFragment();
      const label = txt ? txt.textContent.replace(/\s+/g, " ").trim() : "";
      if (label) {
        textCell.appendChild(document.createComment(" field:text "));
        const href = anchor ? anchor.getAttribute("href") : null;
        if (href && href !== "javascript:void(0);" && href !== "javascript:void(0)") {
          const a = document.createElement("a");
          a.setAttribute("href", href);
          a.textContent = label;
          textCell.appendChild(a);
        } else {
          textCell.appendChild(document.createTextNode(label));
        }
      }
      cells.push([imageCell, textCell]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-icon-tile", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-milestone.js
  function parse5(element, { document }) {
    const cells = [];
    let items = Array.from(element.querySelectorAll(".milestone-item"));
    if (!items.length) items = Array.from(element.querySelectorAll('.row > [class*="col"]'));
    items.forEach((item) => {
      const img = item.querySelector("figure img, img");
      const year = item.querySelector(".year");
      const desc = item.querySelector("p");
      if (!img && !year && !desc) return;
      const imageCell = document.createDocumentFragment();
      if (img) {
        imageCell.appendChild(document.createComment(" field:image "));
        imageCell.appendChild(img.cloneNode(true));
      }
      const textCell = document.createDocumentFragment();
      const parts = [];
      if (year) {
        const h = document.createElement("h3");
        h.textContent = year.textContent.replace(/\s+/g, " ").trim();
        parts.push(h);
      }
      if (desc) parts.push(desc.cloneNode(true));
      if (parts.length) {
        textCell.appendChild(document.createComment(" field:text "));
        parts.forEach((n) => textCell.appendChild(n));
      }
      cells.push([imageCell, textCell]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-milestone", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-service.js
  function parse6(element, { document }) {
    const cells = [];
    let cards = Array.from(element.querySelectorAll(".service-card"));
    if (!cards.length) cards = Array.from(element.querySelectorAll('.row > [class*="col"]'));
    cards.forEach((card) => {
      const img = card.querySelector("img");
      const heading = card.querySelector("h2, h3, h4");
      const desc = card.querySelector("p");
      const cta = card.querySelector(".know-more, a.button, a");
      if (!heading && !desc && !img) return;
      const imageCell = document.createDocumentFragment();
      if (img) {
        imageCell.appendChild(document.createComment(" field:image "));
        imageCell.appendChild(img.cloneNode(true));
      }
      const textCell = document.createDocumentFragment();
      const parts = [];
      if (heading) parts.push(heading.cloneNode(true));
      if (desc) parts.push(desc.cloneNode(true));
      if (cta) parts.push(cta.cloneNode(true));
      if (parts.length) {
        textCell.appendChild(document.createComment(" field:text "));
        parts.forEach((n) => textCell.appendChild(n));
      }
      cells.push([imageCell, textCell]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-service", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/carousel-banner.js
  function parse7(element, { document }) {
    const cells = [];
    let slides = Array.from(element.querySelectorAll(".hero-carousel-item"));
    if (!slides.length) slides = Array.from(element.querySelectorAll(".owl-item"));
    if (!slides.length) slides = Array.from(element.querySelectorAll('.hero-slider, [class*="slide"]'));
    const seen = /* @__PURE__ */ new Set();
    slides.forEach((slide) => {
      const img = slide.querySelector("picture img, img.hs-image, img");
      const content = slide.querySelector(".hero-container, .hero-banner-content");
      const sig = (img ? img.getAttribute("src") || "" : "") + "|" + (content ? content.textContent.replace(/\s+/g, " ").trim() : "");
      if (seen.has(sig)) return;
      seen.add(sig);
      const imageCell = document.createDocumentFragment();
      if (img) {
        imageCell.appendChild(document.createComment(" field:media_image "));
        imageCell.appendChild(img.cloneNode(true));
      }
      const textCell = document.createDocumentFragment();
      const parts = [];
      if (content) {
        const title = content.querySelector("h1, h2, h3, .hero-banner-title");
        const desc = content.querySelector(".hero-banner-desc");
        const ctas = Array.from(content.querySelectorAll(".btn-box a, a.btn"));
        if (title) parts.push(title.cloneNode(true));
        if (desc) parts.push(desc.cloneNode(true));
        ctas.forEach((a) => parts.push(a.cloneNode(true)));
      }
      if (parts.length) {
        textCell.appendChild(document.createComment(" field:content_text "));
        parts.forEach((n) => textCell.appendChild(n));
      }
      cells.push([imageCell, textCell]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "carousel-banner", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/carousel-gallery.js
  function parse8(element, { document }) {
    const cells = [];
    let slides = Array.from(element.querySelectorAll(".owl-carousel .item"));
    if (!slides.length) slides = Array.from(element.querySelectorAll(".owl-item"));
    if (!slides.length) slides = Array.from(element.querySelectorAll('[class*="slide"], figure'));
    const seen = /* @__PURE__ */ new Set();
    slides.forEach((slide) => {
      const img = slide.querySelector("img");
      if (!img) return;
      const src = img.getAttribute("src") || img.getAttribute("data-src") || "";
      if (seen.has(src)) return;
      seen.add(src);
      const imageCell = document.createDocumentFragment();
      imageCell.appendChild(document.createComment(" field:media_image "));
      imageCell.appendChild(img.cloneNode(true));
      const textCell = document.createDocumentFragment();
      const parts = [];
      slide.querySelectorAll("h2, h3, h4, h5, p, a").forEach((n) => {
        const txt = n.textContent.replace(/\s+/g, " ").trim();
        if (txt) parts.push(n.cloneNode(true));
      });
      if (parts.length) {
        textCell.appendChild(document.createComment(" field:content_text "));
        parts.forEach((n) => textCell.appendChild(n));
      }
      cells.push([imageCell, textCell]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "carousel-gallery", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/carousel-icons.js
  function parse9(element, { document }) {
    const cells = [];
    let slides = Array.from(element.querySelectorAll(".iconsider-large"));
    if (!slides.length) slides = Array.from(element.querySelectorAll(".owl-item"));
    if (!slides.length) slides = Array.from(element.querySelectorAll('[class*="slide"], li'));
    const seen = /* @__PURE__ */ new Set();
    slides.forEach((slide) => {
      const img = slide.querySelector("img");
      const title = slide.querySelector(".iconsider-title, h3, h4, .title");
      const desc = slide.querySelector(".iconsider-dec, p, .desc");
      const link = slide.closest("a") || slide.querySelector("a");
      const sig = (img ? img.getAttribute("src") || "" : "") + "|" + (title ? title.textContent.replace(/\s+/g, " ").trim() : "");
      if (sig === "|") return;
      if (seen.has(sig)) return;
      seen.add(sig);
      const imageCell = document.createDocumentFragment();
      if (img) {
        imageCell.appendChild(document.createComment(" field:media_image "));
        imageCell.appendChild(img.cloneNode(true));
      }
      const textCell = document.createDocumentFragment();
      const parts = [];
      if (link && (title || desc)) {
        const a = document.createElement("a");
        const href = link.getAttribute("href");
        if (href) a.setAttribute("href", href);
        if (title) a.appendChild(title.cloneNode(true));
        if (desc) a.appendChild(desc.cloneNode(true));
        parts.push(a);
      } else {
        if (title) parts.push(title.cloneNode(true));
        if (desc) parts.push(desc.cloneNode(true));
      }
      if (parts.length) {
        textCell.appendChild(document.createComment(" field:content_text "));
        parts.forEach((n) => textCell.appendChild(n));
      }
      cells.push([imageCell, textCell]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "carousel-icons", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/carousel-promo.js
  function parse10(element, { document }) {
    const cells = [];
    let slides = Array.from(element.querySelectorAll(".owlcarousal-slide"));
    if (!slides.length) slides = Array.from(element.querySelectorAll(".owl-item"));
    if (!slides.length) slides = Array.from(element.querySelectorAll('[class*="slide"]'));
    const seen = /* @__PURE__ */ new Set();
    slides.forEach((slide) => {
      const img = slide.querySelector("img");
      if (!img) return;
      const link = slide.querySelector("a");
      const href = link ? link.getAttribute("href") || "" : "";
      const src = img.getAttribute("src") || img.getAttribute("data-src") || "";
      const sig = `${href}|${src}`;
      if (seen.has(sig)) return;
      seen.add(sig);
      const imageCell = document.createDocumentFragment();
      imageCell.appendChild(document.createComment(" field:media_image "));
      imageCell.appendChild(img.cloneNode(true));
      const textCell = document.createDocumentFragment();
      const label = link ? link.textContent.replace(/\s+/g, " ").trim() : "";
      if (link && href && label) {
        const a = document.createElement("a");
        a.setAttribute("href", href);
        a.textContent = label;
        textCell.appendChild(document.createComment(" field:content_text "));
        textCell.appendChild(a);
      }
      cells.push([imageCell, textCell]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "carousel-promo", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-info.js
  function parse11(element, { document }) {
    const row = element.querySelector(".row") || element;
    let columns = Array.from(row.children).filter((c) => /\bcol(-|\b)/.test(c.className || "") || c.classList.contains("info-col"));
    if (!columns.length) {
      columns = Array.from(element.querySelectorAll(".info-col"));
    }
    if (!columns.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cellRow = columns.map((col) => {
      const content = [];
      Array.from(col.childNodes).forEach((n) => content.push(n.cloneNode(true)));
      return content;
    });
    const cells = [cellRow];
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-info", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-media.js
  function parse12(element, { document }) {
    const row = element.querySelector(".columncontrol .row, .row") || element;
    let columns = Array.from(row.children).filter((c) => /\bcol(-|\b)/.test(c.className || ""));
    if (!columns.length) {
      columns = Array.from(row.children).filter((c) => c.nodeType === 1);
    }
    if (!columns.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cellRow = columns.map((col) => {
      const content = [];
      Array.from(col.childNodes).forEach((n) => content.push(n.cloneNode(true)));
      return content;
    });
    const cells = [cellRow];
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-media", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/form.js
  function parse13(element, { document }) {
    const form = element.matches && element.matches("form") ? element : element.querySelector("form");
    let actionUrl = "";
    if (form) {
      actionUrl = form.getAttribute("action") || form.getAttribute("data-action") || "";
    }
    if (!actionUrl) {
      const cta = element.querySelector("a[href]");
      if (cta) actionUrl = cta.getAttribute("href") || "";
    }
    const cells = [];
    const refCell = document.createDocumentFragment();
    refCell.appendChild(document.createComment(" field:reference "));
    if (actionUrl) {
      const a = document.createElement("a");
      a.setAttribute("href", actionUrl);
      a.textContent = actionUrl;
      refCell.appendChild(a);
    }
    cells.push([refCell]);
    if (actionUrl) {
      const actionCell = document.createDocumentFragment();
      actionCell.appendChild(document.createComment(" field:action "));
      actionCell.appendChild(document.createTextNode(actionUrl));
      cells.push([actionCell]);
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "form", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/hero-helpline.js
  function parse14(element, { document }) {
    const scope = element.querySelector(".owlcarousal-slide, .hero-carousel-item") || element;
    const img = scope.querySelector("picture img, img.slider-img, img.hs-image, img");
    const contentHost = element.querySelector(".hero-container, .hero-banner-content, .details-box") || element;
    const heading = contentHost.querySelector("h1, h2, h3, .hero-banner-title");
    const desc = contentHost.querySelector(".hero-banner-desc, p");
    const ctas = Array.from(contentHost.querySelectorAll(".btn-box a, a.btn, a.em-cta, .link-box a"));
    if (!img && !heading && !desc) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    if (img) {
      const imageCell = document.createDocumentFragment();
      imageCell.appendChild(document.createComment(" field:image "));
      imageCell.appendChild(img.cloneNode(true));
      cells.push([imageCell]);
    }
    const textCell = document.createDocumentFragment();
    const parts = [];
    if (heading) parts.push(heading.cloneNode(true));
    if (desc) parts.push(desc.cloneNode(true));
    ctas.forEach((a) => parts.push(a.cloneNode(true)));
    if (parts.length) {
      textCell.appendChild(document.createComment(" field:text "));
      parts.forEach((n) => textCell.appendChild(n));
      cells.push([textCell]);
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "hero-helpline", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/hero-promo.js
  function parse15(element, { document }) {
    const scope = element.querySelector(".hero-carousel-item") || element;
    const img = scope.querySelector("picture img, img.hs-image, img");
    const contentHost = scope.querySelector(".hero-container, .hero-banner-content, .details-box") || scope;
    const heading = contentHost.querySelector("h1, h2, h3, .hero-banner-title, .em-title");
    const desc = contentHost.querySelector(".hero-banner-desc, .info-box, p");
    const ctas = Array.from(contentHost.querySelectorAll(".btn-box a, a.btn, a.em-cta, .link-box a"));
    if (!img && !heading && !desc) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    if (img) {
      const imageCell = document.createDocumentFragment();
      imageCell.appendChild(document.createComment(" field:image "));
      imageCell.appendChild(img.cloneNode(true));
      cells.push([imageCell]);
    }
    const textCell = document.createDocumentFragment();
    const parts = [];
    if (heading) parts.push(heading.cloneNode(true));
    if (desc) parts.push(desc.cloneNode(true));
    ctas.forEach((a) => parts.push(a.cloneNode(true)));
    if (parts.length) {
      textCell.appendChild(document.createComment(" field:text "));
      parts.forEach((n) => textCell.appendChild(n));
      cells.push([textCell]);
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "hero-promo", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/search.js
  function parse16(element, { document }) {
    const indexUrl = "/query-index.json";
    const indexCell = document.createDocumentFragment();
    indexCell.appendChild(document.createComment(" field:index "));
    indexCell.appendChild(document.createTextNode(indexUrl));
    const cells = [[indexCell]];
    const block = WebImporter.Blocks.createBlock(document, { name: "search", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/tabs-profile.js
  function parse17(element, { document }) {
    const cells = [];
    let panels = Array.from(element.querySelectorAll(".tab-content > div[id]"));
    if (!panels.length) panels = Array.from(element.querySelectorAll('.tab-pane, [class*="tab"] > div[id]'));
    panels.forEach((panel, idx) => {
      const img = panel.querySelector("figure img, img");
      const heading = panel.querySelector("h2, h3, h4, h5");
      const paras = Array.from(panel.querySelectorAll("p"));
      const label = heading ? heading.textContent.replace(/\s+/g, " ").trim() : `Tab ${idx + 1}`;
      const labelCell = document.createDocumentFragment();
      labelCell.appendChild(document.createComment(" field:title "));
      labelCell.appendChild(document.createTextNode(label));
      const contentCell = document.createDocumentFragment();
      if (heading) {
        contentCell.appendChild(document.createComment(" field:content_heading "));
        contentCell.appendChild(heading.cloneNode(true));
      }
      if (img) {
        contentCell.appendChild(document.createComment(" field:content_image "));
        contentCell.appendChild(img.cloneNode(true));
      }
      if (paras.length) {
        contentCell.appendChild(document.createComment(" field:content_richtext "));
        paras.forEach((p) => contentCell.appendChild(p.cloneNode(true)));
      }
      cells.push([labelCell, contentCell]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "tabs-profile", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/kotak-cleanup.js
  var TransformHook = {
    beforeTransform: "beforeTransform",
    afterTransform: "afterTransform"
  };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        // Header search overlay popup
        "#search-modal",
        // Notification / promo bar at the very top of the body
        "#notification_widget",
        '[id^="modal-widget-"]',
        // Global desktop header / mega-menu
        "header",
        "header.header-container",
        // Mobile header navigation (two distinct implementations across pages)
        "nav.mobile-header",
        ".mobile-header-container",
        ".mb-header-menuoffcanvas"
      ]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        // Breadcrumb trail
        ".breadcrumb",
        // Full footer (well-formed on standard pages). The two specific
        // chrome containers are also listed as a fallback for the rare
        // malformed-footer case where </footer> is misplaced.
        "footer",
        "footer.footer",
        ".ifooter_support_par",
        ".secondaryfooter",
        ".back-to-top",
        // Hidden page-state inputs (not authorable)
        "input.productCategory",
        "input.productParentPage",
        "#unica-icon",
        // Stray non-content tags
        "link",
        "noscript"
      ]);
    }
  }

  // tools/importer/import-kotak.js
  var parsers = {
    "accordion-rates": parse,
    "cards-contact": parse2,
    "cards-feature": parse3,
    "cards-icon-tile": parse4,
    "cards-milestone": parse5,
    "cards-service": parse6,
    "carousel-banner": parse7,
    "carousel-gallery": parse8,
    "carousel-icons": parse9,
    "carousel-promo": parse10,
    "columns-info": parse11,
    "columns-media": parse12,
    "form": parse13,
    "hero-helpline": parse14,
    "hero-promo": parse15,
    "search": parse16,
    "tabs-profile": parse17
  };
  var transformers = [transform];
  var TEMPLATES = [
    {
      "name": "credit-cards-product",
      "urls": [
        "https://www.kotak.bank.in/en/personal-banking/cards/credit-cards.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/personal-banking/cards/credit-cards.html",
      "coverageGaps": [],
      "description": "Product page: hero carousel, product card grids, offer slider, and FAQ/info accordions",
      "blocks": [
        {
          "name": "carousel-banner",
          "instances": [
            ".heroslider.section"
          ]
        },
        {
          "name": "cards-feature",
          "instances": [
            ".cards-list",
            ".testimonial.section .our-solution-slider",
            ".common-slider"
          ]
        },
        {
          "name": "accordion-rates",
          "instances": [
            ".prod-accordion"
          ]
        }
      ]
    },
    {
      "name": "section-landing-tabbed",
      "urls": [
        "https://www.kotak.bank.in/en/about-us/careers.html",
        "https://www.kotak.bank.in/en/about-us/media.html",
        "https://www.kotak.bank.in/en/business/working-capital.html",
        "https://www.kotak.bank.in/en/corporate/cash-management-services/digital-collections/bbps.html",
        "https://www.kotak.bank.in/en/digital-banking/insta-services/send-money-abroad.html",
        "https://www.kotak.bank.in/en/digital-banking/ways-to-bank/bhim-upi.html",
        "https://www.kotak.bank.in/en/digital-banking/ways-to-bank/mobile-banking.html",
        "https://www.kotak.bank.in/en/open-banking.html",
        "https://www.kotak.bank.in/en/personal-banking/accounts/corporate-salary-account.html",
        "https://www.kotak.bank.in/en/personal-banking/cards/prepaid-card/forex-card.html",
        "https://www.kotak.bank.in/en/safe-banking/safe-banking-articles.html",
        "https://www.kotak.bank.in/en/solitaire.html",
        "https://www.kotak.bank.in/en/solitaire/business.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/about-us/careers.html",
      "coverageGaps": [],
      "description": "Section landing page with carousel banner, tabbed content groups, and multiple stacked content blocks",
      "blocks": [
        {
          "name": "carousel-banner",
          "instances": [
            "main"
          ]
        },
        {
          "name": "columns-media",
          "instances": [
            "main"
          ]
        },
        {
          "name": "carousel-gallery",
          "instances": [
            "main"
          ]
        },
        {
          "name": "cards-milestone",
          "instances": [
            "main"
          ]
        }
      ]
    },
    {
      "name": "profile-carousel-tabs",
      "urls": [
        "https://www.kotak.bank.in/en/about-us.html",
        "https://www.kotak.bank.in/en/about-us/executive-leadership.html",
        "https://www.kotak.bank.in/en/about-us/journeytimelineconf.html",
        "https://www.kotak.bank.in/en/bank-auctions.html",
        "https://www.kotak.bank.in/en/business/accounts/current-accounts.html",
        "https://www.kotak.bank.in/en/business/accounts/retail-institutional-accounts.html",
        "https://www.kotak.bank.in/en/business/loans/commercial-vehicle-loan.html",
        "https://www.kotak.bank.in/en/business/loans/loan-against-property.html",
        "https://www.kotak.bank.in/en/calculators/car-loan-emi-calculator.html",
        "https://www.kotak.bank.in/en/customer-service.html",
        "https://www.kotak.bank.in/en/personal-banking/accounts/bank-demat-trading.html",
        "https://www.kotak.bank.in/en/personal-banking/cards/debit-cards.html",
        "https://www.kotak.bank.in/en/stories-in-focus/cards/credit-cards/what-is-credit-card-over-limit-fee.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/about-us/executive-leadership.html",
      "coverageGaps": [],
      "description": "Carousel banner followed by tabbed content panels",
      "blocks": [
        {
          "name": "hero-promo",
          "instances": [
            ".heroslider section .hero-slider-cont.main-hero-banner"
          ]
        },
        {
          "name": "carousel-gallery",
          "instances": [
            ".journeytimeline section"
          ]
        },
        {
          "name": "tabs-profile",
          "instances": [
            ".white-box.minimize-wrapper-height"
          ]
        }
      ]
    },
    {
      "name": "overview-search-cards",
      "urls": [
        "https://www.kotak.bank.in/en/about-us/our-business.html",
        "https://www.kotak.bank.in/en/stories-in-focus/loans/home-loan/how-to-save-income-tax-on-home-loan.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/about-us/our-business.html",
      "coverageGaps": [],
      "description": "Carousel banner with search field and a grid of cards",
      "blocks": [
        {
          "name": "carousel-promo",
          "instances": [
            "body.chrome.chrome145 > div:nth-child(44)",
            "body.chrome.chrome145 > div:nth-child(45)"
          ]
        },
        {
          "name": "search",
          "instances": [
            "div.container.bank-comt"
          ]
        },
        {
          "name": "cards-feature",
          "instances": [
            "div.row.MT30",
            "div.mf-card"
          ]
        },
        {
          "name": "accordion-rates",
          "instances": [
            "div.faq.section"
          ]
        }
      ]
    },
    {
      "name": "form-page",
      "urls": [
        "https://www.kotak.bank.in/en/apply-now-form.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/apply-now-form.html",
      "coverageGaps": [],
      "description": "Standalone form-centric page",
      "blocks": [
        {
          "name": "form",
          "instances": [
            "body.chrome.chrome145 > div:nth-child(10)"
          ]
        }
      ]
    },
    {
      "name": "category-landing-carousels",
      "urls": [
        "https://www.kotak.bank.in/en/business.html",
        "https://www.kotak.bank.in/en/corporate.html",
        "https://www.kotak.bank.in/en/corporate/trade-services.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/business.html",
      "coverageGaps": [],
      "description": "Category landing page with hero and multiple stacked carousel sections",
      "blocks": [
        {
          "name": "carousel-promo",
          "instances": [
            "body.chrome.chrome145 > div:nth-child(8)",
            "body.chrome.chrome145 > div:nth-child(9) > div:nth-child(4)",
            "body.chrome.chrome145 > div:nth-child(9) > div:nth-child(5)",
            "body.chrome.chrome145 > div:nth-child(9) > div:nth-child(6)",
            "body.chrome.chrome145 > div:nth-child(9) > div:nth-child(7)"
          ]
        },
        {
          "name": "hero-promo",
          "instances": [
            "body.chrome.chrome145 > div:nth-child(9) > div:nth-child(2)"
          ]
        }
      ]
    },
    {
      "name": "product-detail-form-accordion",
      "urls": [
        "https://www.kotak.bank.in/en/business/loans/business-loan.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/business/loans/business-loan.html",
      "coverageGaps": [],
      "description": "Product detail page combining lead form, tabs, carousels, and an accordion FAQ",
      "blocks": [
        {
          "name": "form",
          "instances": [
            "body.chrome.chrome145 > div:nth-child(45)"
          ]
        },
        {
          "name": "tabs-profile",
          "instances": [
            "#tabs-component-tab_copy"
          ]
        },
        {
          "name": "accordion-rates",
          "instances": [
            "div.faq.section"
          ]
        },
        {
          "name": "carousel-promo",
          "instances": [
            "div.featureCard.section",
            "div.wrapper.section"
          ]
        }
      ]
    },
    {
      "name": "calculator-simple",
      "urls": [
        "https://www.kotak.bank.in/en/calculators/emi-calculator.html",
        "https://www.kotak.bank.in/en/customer-service/important-customer-information.html",
        "https://www.kotak.bank.in/en/gsfc.html",
        "https://www.kotak.bank.in/en/rates.html",
        "https://www.kotak.bank.in/en/rates/interest-rates.html",
        "https://www.kotak.bank.in/en/solitaire/imp-links.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/calculators/emi-calculator.html",
      "coverageGaps": [],
      "description": "Calculator/tool page with a single carousel content section",
      "blocks": [
        {
          "name": "carousel-promo",
          "instances": [
            "body.chrome.chrome145 > div:nth-child(45)"
          ]
        },
        {
          "name": "tabs-profile",
          "instances": [
            "#tabs-component-tab_copy"
          ]
        },
        {
          "name": "accordion-rates",
          "instances": [
            "div.card-rate-box.option2"
          ]
        }
      ]
    },
    {
      "name": "calculator-form-carousel",
      "urls": [
        "https://www.kotak.bank.in/en/calculators.html",
        "https://www.kotak.bank.in/en/calculators/goal-planner.html",
        "https://www.kotak.bank.in/en/calculators/personal-loan-emi-calculator.html",
        "https://www.kotak.bank.in/en/customer-service/download-forms.html",
        "https://www.kotak.bank.in/en/disclaimer.html",
        "https://www.kotak.bank.in/en/get-help/wearable-payments-faqs.html",
        "https://www.kotak.bank.in/en/help-center/personal.html",
        "https://www.kotak.bank.in/en/investor-relations/governance.html",
        "https://www.kotak.bank.in/en/kotak-international-business.html",
        "https://www.kotak.bank.in/en/privacy-policy.html",
        "https://www.kotak.bank.in/en/rates/forex-rates.html",
        "https://www.kotak.bank.in/en/rates/mclr-rate.html",
        "https://www.kotak.bank.in/en/safe-banking/safe-banking-types-of-frauds.html",
        "https://www.kotak.bank.in/en/solitaire/eligibility-criteria.html",
        "https://www.kotak.bank.in/en/terms-conditions.html",
        "https://www.kotak.bank.in/en/terms-conditions/co-brand-credit-card.html",
        "https://www.kotak.bank.in/en/transaction-services/cheque-book-request.html",
        "https://www.kotak.bank.in/en/transaction-services/know-your-balance.html",
        "https://www.kotak.bank.in/en/transaction-services/report-lost-card.html",
        "https://www.kotak.bank.in/en/transaction-services/statement.html",
        "https://www.kotak.bank.in/en/transaction-services/track-application.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/calculators/goal-planner.html",
      "coverageGaps": [],
      "description": "Calculator/tool page with a form and a carousel content section",
      "blocks": [
        {
          "name": "carousel-icons",
          "instances": [
            ".image-slider-no-pip.section"
          ]
        },
        {
          "name": "carousel-promo",
          "instances": [
            ".didYouKnow.section"
          ]
        }
      ]
    },
    {
      "name": "solutions-dual-carousel",
      "urls": [
        "https://www.kotak.bank.in/en/corporate/cash-management-services.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/corporate/cash-management-services.html",
      "coverageGaps": [],
      "description": "Solutions page with two stacked carousel sections",
      "blocks": [
        {
          "name": "carousel-promo",
          "instances": [
            "div.image-slider-no-pip.section",
            "div.featureCard.section"
          ]
        }
      ]
    },
    {
      "name": "expertise-dual-carousel",
      "urls": [
        "https://www.kotak.bank.in/en/corporate/sector-expertise.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/corporate/sector-expertise.html",
      "coverageGaps": [],
      "description": "Expertise overview page with two stacked carousel sections",
      "blocks": [
        {
          "name": "carousel-promo",
          "instances": [
            "div.image-slider-no-pip.section",
            "div.featureCard.section"
          ]
        }
      ]
    },
    {
      "name": "solutions-carousel-content",
      "urls": [
        "https://www.kotak.bank.in/en/corporate/solutions.html",
        "https://www.kotak.bank.in/en/corporate/trade-supply-chain-finance.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/corporate/solutions.html",
      "coverageGaps": [],
      "description": "Solutions page with two carousels and a content block",
      "blocks": [
        {
          "name": "carousel-promo",
          "instances": [
            "body.chrome.chrome145 > div:nth-child(42)",
            "body.chrome.chrome145 > div:nth-child(43)"
          ]
        }
      ]
    },
    {
      "name": "text-content-page",
      "urls": [
        "https://www.kotak.bank.in/en/customer-service/contact-us.html",
        "https://www.kotak.bank.in/en/help-center.html",
        "https://www.kotak.bank.in/en/help-center/811-account.html",
        "https://www.kotak.bank.in/en/help-center/bank-account.html",
        "https://www.kotak.bank.in/en/help-center/bill-payment-and-recharge.html",
        "https://www.kotak.bank.in/en/help-center/credit-card.html",
        "https://www.kotak.bank.in/en/help-center/loans--hl--pl--bl--lap--wc-.html",
        "https://www.kotak.bank.in/en/investor-relations/investor-information/disclosures-regulation.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/customer-service/contact-us.html",
      "coverageGaps": [],
      "description": "Text-heavy page using default content only (legal, contact, informational)",
      "blocks": [
        {
          "name": "cards-service",
          "instances": [
            "main"
          ]
        }
      ]
    },
    {
      "name": "service-carousel-form",
      "urls": [
        "https://www.kotak.bank.in/en/customer-service/grievance-redressal.html",
        "https://www.kotak.bank.in/en/reach-us/detail.html",
        "https://www.kotak.bank.in/en/stories-in-focus/loans/business-loan/secure-startup-funding-india-guide.html",
        "https://www.kotak.bank.in/en/stories-in-focus/nri/health-insurance-for-nris-in-india.html",
        "https://www.kotak.bank.in/en/stories-in-focus/nri/how-to-invest-in-gold-as-an-nri.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/customer-service/grievance-redressal.html",
      "coverageGaps": [],
      "description": "Service page with stacked carousels and a request form",
      "blocks": [
        {
          "name": "hero-helpline",
          "instances": [
            ".website-thin-carousal-banner, .hero-banner"
          ]
        },
        {
          "name": "cards-contact",
          "instances": [
            ".white-bg-wrapper"
          ]
        },
        {
          "name": "cards-icon-tile",
          "instances": [
            "h2 + .options-1"
          ]
        },
        {
          "name": "columns-info",
          "instances": [
            ".digisaathi, .website-content-section"
          ]
        },
        {
          "name": "carousel-promo",
          "instances": [
            ".owl-carousel.website-owlcarousal, .owl-carousel.js-carousel-single-item"
          ]
        },
        {
          "name": "form",
          "instances": [
            ".write-to-us, form, .request-form"
          ]
        }
      ]
    },
    {
      "name": "service-request-form",
      "urls": [
        "https://www.kotak.bank.in/en/customer-service/service-request.html",
        "https://www.kotak.bank.in/en/digital-banking/insta-services/money-transfer.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/customer-service/service-request.html",
      "coverageGaps": [],
      "description": "Service request page with a carousel and a form",
      "blocks": [
        {
          "name": "carousel-promo",
          "instances": [
            "body.chrome.chrome145 > div:nth-child(44)",
            "div.heroslider.section"
          ]
        },
        {
          "name": "form",
          "instances": [
            "body.chrome.chrome145 > div:nth-child(47)"
          ]
        },
        {
          "name": "tabs-profile",
          "instances": [
            "#tabs-component-tab_copy"
          ]
        }
      ]
    },
    {
      "name": "hub-landing-tabbed",
      "urls": [
        "https://www.kotak.bank.in/en/digital-banking.html",
        "https://www.kotak.bank.in/en/digital-banking/insta-services.html",
        "https://www.kotak.bank.in/en/digital-banking/ways-to-bank.html",
        "https://www.kotak.bank.in/en/safe-banking.html",
        "https://www.kotak.bank.in/en/safe-banking/safe-banking-tips.html",
        "https://www.kotak.bank.in/en/stories-in-focus.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/digital-banking.html",
      "coverageGaps": [],
      "description": "Hub landing page with carousel banner, tabs, and several content blocks",
      "blocks": [
        {
          "name": "carousel-promo",
          "instances": [
            "div.heroslider.section",
            "body.chrome.chrome145 > div:nth-child(9)"
          ]
        },
        {
          "name": "tabs-profile",
          "instances": [
            "#tabs-component-tab_copy_copy"
          ]
        },
        {
          "name": "form",
          "instances": [
            "div.theiaStickySidebar"
          ]
        },
        {
          "name": "columns-media",
          "instances": [
            "div.sif-header-container"
          ]
        },
        {
          "name": "cards-feature",
          "instances": [
            "div.sif-card-list.row"
          ]
        }
      ]
    },
    {
      "name": "homepage",
      "urls": [
        "https://www.kotak.bank.in/en/home.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/home.html",
      "coverageGaps": [],
      "description": "Homepage with hero banner, lead form, multiple carousels, and feature content sections",
      "blocks": [
        {
          "name": "hero-promo",
          "instances": [
            "div.white-background > div:nth-child(1)"
          ]
        },
        {
          "name": "form",
          "instances": [
            "div.white-background > div:nth-child(1)"
          ]
        },
        {
          "name": "cards-feature",
          "instances": [
            "div.white-background > div:nth-child(2)",
            "div.white-background > div:nth-child(4)",
            "div.white-background > div:nth-child(7)",
            "div.white-background > div:nth-child(8)",
            "div.white-background > div:nth-child(9)"
          ]
        },
        {
          "name": "carousel-promo",
          "instances": [
            "div.thincarousalbanner.section"
          ]
        },
        {
          "name": "columns-media",
          "instances": [
            "div.white-background > div:nth-child(6)"
          ]
        },
        {
          "name": "carousel-icons",
          "instances": [
            "div.iconsider-second.icon-slider-cm"
          ]
        },
        {
          "name": "accordion-rates",
          "instances": [
            "div.white-background > div:nth-child(9)"
          ]
        }
      ]
    },
    {
      "name": "report-carousel-tabs",
      "urls": [
        "https://www.kotak.bank.in/en/investor-relations/financial-results.html",
        "https://www.kotak.bank.in/en/investor-relations/investor-information.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/investor-relations/financial-results.html",
      "coverageGaps": [],
      "description": "Reports/results page with carousel banner and tabbed panels",
      "blocks": [
        {
          "name": "carousel-promo",
          "instances": [
            "body.chrome.chrome145 > div:nth-child(45)",
            "body.chrome.chrome145 > div:nth-child(44)"
          ]
        },
        {
          "name": "tabs-profile",
          "instances": [
            "body.chrome.chrome145 > div:nth-child(46)",
            "div.tab.section"
          ]
        },
        {
          "name": "accordion-rates",
          "instances": [
            "div.faq.section"
          ]
        }
      ]
    },
    {
      "name": "investor-landing-carousels",
      "urls": [
        "https://www.kotak.bank.in/en/investor-relations.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/investor-relations.html",
      "coverageGaps": [],
      "description": "Investor relations landing page with dual carousels and content blocks",
      "blocks": [
        {
          "name": "carousel-promo",
          "instances": [
            "body.chrome.chrome145 > div:nth-child(9)",
            "body.chrome.chrome145 > div:nth-child(11) > div:nth-child(1) > section:nth-child(1) > div:nth-child(1)"
          ]
        }
      ]
    },
    {
      "name": "topic-carousel-tabs",
      "urls": [
        "https://www.kotak.bank.in/en/investor-relations/sustainability.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/investor-relations/sustainability.html",
      "coverageGaps": [],
      "description": "Topic page with carousel, content block, and tabs",
      "blocks": [
        {
          "name": "carousel-promo",
          "instances": [
            "body.chrome.chrome145 > div:nth-child(44)"
          ]
        },
        {
          "name": "tabs-profile",
          "instances": [
            "#tabs-component-tab_copy"
          ]
        }
      ]
    },
    {
      "name": "premium-banking-landing",
      "urls": [
        "https://www.kotak.bank.in/en/kotak-private.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/kotak-private.html",
      "coverageGaps": [],
      "description": "Premium banking landing page with multiple carousels and rich content sections",
      "blocks": [
        {
          "name": "carousel-promo",
          "instances": [
            "div.heroslider.section",
            "body.chrome.chrome145 > div:nth-child(9) > div:nth-child(4)",
            "body.chrome.chrome145 > div:nth-child(11) > div:nth-child(2)"
          ]
        }
      ]
    },
    {
      "name": "account-detail-cards",
      "urls": [
        "https://www.kotak.bank.in/en/personal-banking/accounts/savings-account.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/personal-banking/accounts/savings-account.html",
      "coverageGaps": [],
      "description": "Account/product detail page with carousel banner and a grid of cards",
      "blocks": [
        {
          "name": "carousel-promo",
          "instances": [
            "div.image-slider-no-pip.section"
          ]
        },
        {
          "name": "cards-feature",
          "instances": [
            "div.row.sa-card-container"
          ]
        }
      ]
    },
    {
      "name": "segment-carousel-content",
      "urls": [
        "https://www.kotak.bank.in/en/privy.html",
        "https://www.kotak.bank.in/en/privy/business.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/privy/business.html",
      "coverageGaps": [],
      "description": "Segment page with carousel and a content block",
      "blocks": [
        {
          "name": "carousel-promo",
          "instances": [
            "body.chrome.chrome145 > div:nth-child(44)",
            "body.chrome.chrome145 > div:nth-child(9)"
          ]
        },
        {
          "name": "accordion-rates",
          "instances": [
            "body.chrome.chrome145 > div:nth-child(10)"
          ]
        }
      ]
    },
    {
      "name": "locator-cards-tabs",
      "urls": [
        "https://www.kotak.bank.in/en/reach-us.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/reach-us.html",
      "coverageGaps": [],
      "description": "Locator/contact page with carousel, tabs, and multiple card groups",
      "blocks": [
        {
          "name": "carousel-promo",
          "instances": [
            "body.chrome.chrome145 > div:nth-child(9)"
          ]
        },
        {
          "name": "tabs-profile",
          "instances": [
            "body.chrome.chrome145 > div:nth-child(11)"
          ]
        },
        {
          "name": "cards-feature",
          "instances": [
            "div.col-md-4.col-4-4-4-1 > div:nth-child(1) > div:nth-child(3)",
            "div.col-md-4.col-4-4-4-2 > div:nth-child(1) > div:nth-child(1)",
            "div.col-md-4.col-4-4-4-3 > div:nth-child(1) > div:nth-child(1)"
          ]
        }
      ]
    },
    {
      "name": "getstarted-columns-search",
      "urls": [
        "https://www.kotak.bank.in/en/solitaire/business/get-started.html",
        "https://www.kotak.bank.in/en/solitaire/get-started.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/solitaire/business/get-started.html",
      "coverageGaps": [],
      "description": "Get-started page with a columns layout and search field",
      "blocks": [
        {
          "name": "columns-media",
          "instances": [
            ".columncontrol.section"
          ]
        },
        {
          "name": "form",
          "instances": [
            ".columncontrol.section"
          ]
        }
      ]
    },
    {
      "name": "article-detail",
      "urls": [
        "https://www.kotak.bank.in/en/stories-in-focus/accounts-deposits/current-account/neft-rtgs-payments-for-sme-vendor-transfers.html"
      ],
      "representativeUrl": "https://www.kotak.bank.in/en/stories-in-focus/accounts-deposits/current-account/neft-rtgs-payments-for-sme-vendor-transfers.html",
      "coverageGaps": [],
      "description": "Article/story detail page with carousel banner, hero, accordion, and content block",
      "blocks": [
        {
          "name": "carousel-promo",
          "instances": [
            "body.chrome.chrome145 > div:nth-child(44)"
          ]
        },
        {
          "name": "hero-promo",
          "instances": [
            "div.promoimage.section > div:nth-child(1)"
          ]
        },
        {
          "name": "accordion-rates",
          "instances": [
            "div.faq.section"
          ]
        }
      ]
    }
  ];
  function selectTemplate(url) {
    const u = url.replace(/[#?].*$/).replace(/\.html$/).replace(/\/$/);
    for (const t of TEMPLATES) {
      if ((t.urls || []).some((tu) => tu.replace(/[#?].*$/).replace(/\.html$/).replace(/\/$/) === u)) return t;
    }
    for (const t of TEMPLATES) {
      if (t.representativeUrl && t.representativeUrl.replace(/\.html$/).replace(/\/$/) === u) return t;
    }
    return TEMPLATES.find((t) => t.name === "text-content-page") || TEMPLATES[0];
  }
  function executeTransformers(hookName, element, payload, template) {
    const enhanced = __spreadProps(__spreadValues({}, payload), { template });
    transformers.forEach((fn) => {
      try {
        fn.call(null, hookName, element, enhanced);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document, template) {
    const pageBlocks = [];
    (template.blocks || []).forEach((blockDef) => {
      if (blockDef.name.startsWith("section-")) return;
      blockDef.instances.forEach((selector) => {
        let elements = [];
        try {
          elements = document.querySelectorAll(selector);
        } catch (e) {
          return;
        }
        elements.forEach((element) => {
          pageBlocks.push({ name: blockDef.name, selector, element });
        });
      });
    });
    return pageBlocks;
  }
  var import_kotak_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const originalURL = params && params.originalURL || url;
      const template = selectTemplate(originalURL);
      const main = document.body;
      executeTransformers("beforeTransform", main, payload, template);
      const pageBlocks = findBlocksOnPage(document, template);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (!parser) {
          console.warn(`No parser for block: ${block.name}`);
          return;
        }
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      });
      executeTransformers("afterTransform", main, payload, template);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, originalURL);
      const path = WebImporter.FileUtils.sanitizePath(
        new URL(originalURL).pathname.replace(/\/$/, "").replace(/\.html$/, "")
      );
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: template.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_kotak_exports);
})();
