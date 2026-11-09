// ==UserScript==
// @name         LinkedIn Güvenli Toolkit — Reklam, İş Filtreleri & Easy Apply
// @name:tr      LinkedIn Güvenli Toolkit — Reklam, İş Filtreleri & Easy Apply
// @namespace    https://github.com/t4r1k255/linkedin-guvenli-toolkit
// @version      3.0.4
// @description  Reklamları, görüntülenen/başvurulan işleri gizler ve Easy Apply sırasında şirket takibini zorunlu olarak kapalı tutar.
// @author       t4r1k255
// @match        https://www.linkedin.com/*
// @grant        none
// @run-at       document-idle
// @noframes
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  const VERSION = '3.0.4';
  const INSTANCE_KEY = '__linkedinGuvenliToolkitV3__';

  // Aynı script yanlışlıkla iki kez kuruluysa ikinci kopyayı çalıştırma.
  if (window[INSTANCE_KEY]) return;
  Object.defineProperty(window, INSTANCE_KEY, {
    value: { version: VERSION },
    configurable: true,
  });

  const ID = {
    style: 'lgt-style',
    toolbar: 'lgt-toolbar',
  };

  const ATTR = {
    ad: 'data-lgt-ad-hidden',
    job: 'data-lgt-job-hidden',
    follow: 'data-lgt-follow-locked',
  };

  // Eski scriptlerin localStorage tercihlerini korur.
  const STORAGE = {
    ads: 'lia-enabled',
    viewed: 'ljf-hv',
    applied: 'ljf-ha',
    debug: 'ljf-dbg',
  };

  function readBool(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value === '1';
    } catch {
      return fallback;
    }
  }

  function writeBool(key, value) {
    try {
      localStorage.setItem(key, value ? '1' : '0');
    } catch {}
  }

  const state = {
    ads: readBool(STORAGE.ads, true),
    viewed: readBool(STORAGE.viewed, true),
    applied: readBool(STORAGE.applied, true),
    debug: readBool(STORAGE.debug, false),
  };

  function dlog(...args) {
    if (state.debug) console.log('[LGT]', ...args);
  }

  function normalize(text) {
    return String(text || '')
      .replace(/İ/g, 'i')
      .replace(/I/g, 'i')
      .replace(/ı/g, 'i')
      .replace(/Ğ/g, 'g')
      .replace(/ğ/g, 'g')
      .replace(/Ü/g, 'u')
      .replace(/ü/g, 'u')
      .replace(/Ş/g, 's')
      .replace(/ş/g, 's')
      .replace(/Ö/g, 'o')
      .replace(/ö/g, 'o')
      .replace(/Ç/g, 'c')
      .replace(/ç/g, 'c')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function queryAll(selector, root = document) {
    try {
      return Array.from(root.querySelectorAll(selector));
    } catch {
      return [];
    }
  }

  function isJobsPage() {
    return location.pathname === '/jobs' || location.pathname.startsWith('/jobs/');
  }

  function isToolkitNode(node) {
    const element = node?.nodeType === Node.ELEMENT_NODE
      ? node
      : node?.parentElement;
    return Boolean(element?.closest?.(`#${ID.toolbar}, #${ID.style}, [data-lgt-ui]`));
  }

  function setText(element, value) {
    if (element && element.textContent !== value) {
      element.textContent = value;
    }
  }

  function setHiddenAttribute(element, attribute, value = '1') {
    if (element.getAttribute(attribute) !== value) {
      element.setAttribute(attribute, value);
    }
  }

  function clearHiddenAttribute(element, attribute) {
    if (element.hasAttribute(attribute)) {
      element.removeAttribute(attribute);
    }
  }

  function collapseToOutermost(elements) {
    const connected = Array.from(elements).filter(
      element => element?.isConnected && element !== document.body && element !== document.documentElement
    );

    return connected.filter(
      element => !connected.some(
        other => other !== element && other.contains(element)
      )
    );
  }

  // ─── REKLAM FİLTRESİ ────────────────────────────────────────────────────────

  const STATIC_AD_SELECTOR = [
    '.ad-banner-container',
    '[data-ad-banner]',
    '.right-rail-ad',
    '[data-view-name="right-rail-ad"]',
    '[data-view-name*="right_rail_ad"]',
    '.premium-upsell-module',
    '.jobs-premium-upsell',
    '.premium-paywall-profile-prompt',
    '.premium-hero-default-content',
    '[data-view-name="jobs-premium-upsell"]',
    '[data-view-name*="premium-upsell"]',
    '.reusable-search__side-panel-info-premium',
    '.learning-recommendation',
    '[data-view-name="learning-recommendation"]',
    '[data-view-name*="flagship3_ads"]',
    '[data-view-name*="job-detail-ad"]',
  ].join(',');

  const SPONSORED_VIEW_NAMES = [
    'sponsored-update',
    'sponsored-video',
    'sponsored-image',
    'sponsored-carousel',
    'sponsored-document',
    'sponsored-event',
    'sponsored-text',
    'ad-featured-update',
    'ad-single-image',
    'ad-video',
    'ad-carousel',
  ];

  const ACTOR_SELECTOR = [
    '.update-components-actor__sub-description',
    '.update-components-actor__meta',
    '.update-components-header__text-wrapper',
    '.feed-shared-actor__sub-description',
    '.feed-shared-actor__meta',
    '[class*="actor__sub-description"]',
    '[class*="actor__meta"]',
    '[class*="actor-meta"]',
  ].join(',');

  function isPromotedExact(text) {
    const value = normalize(text);
    return value === 'promoted' ||
      value === 'sponsored' ||
      value === 'tanitilan icerik' ||
      value === 'tanitim' ||
      value === 'sponsorlu';
  }

  function isPromotedLabel(text) {
    const value = normalize(text);
    if (!value || value.length > 100) return false;
    return isPromotedExact(value) ||
      value.startsWith('promoted by ') ||
      value.startsWith('sponsored by ') ||
      value.startsWith('tanitilan icerik ');
  }

  function findAdContainer(element) {
    const container = element.closest([
      'li.jobs-search-results__list-item',
      'article.job-search-card',
      'li[data-occludable-job-id]',
      '[role="listitem"]',
      'li.occludable-update',
      'div.feed-shared-update-v2',
      'div[data-urn]',
      'article',
    ].join(','));

    if (!container || container === document.body || container.contains(document.getElementById(ID.toolbar))) {
      return element;
    }

    return container;
  }

  function addAdCandidate(set, element, useContainer = false) {
    if (!element || isToolkitNode(element)) return;
    const candidate = useContainer ? findAdContainer(element) : element;
    if (!candidate || candidate === document.body || candidate === document.documentElement) return;
    if (candidate.contains(document.getElementById(ID.toolbar))) return;
    set.add(candidate);
  }

  function clearAds() {
    queryAll(`[${ATTR.ad}]`).forEach(element => clearHiddenAttribute(element, ATTR.ad));
    updateCount('ads', 0);
  }

  function scanAds() {
    if (!state.ads) {
      clearAds();
      return 0;
    }

    const found = new Set();

    queryAll(STATIC_AD_SELECTOR).forEach(element => addAdCandidate(found, element));

    queryAll('[data-view-name]').forEach(element => {
      const viewName = normalize(element.getAttribute('data-view-name'));
      if (SPONSORED_VIEW_NAMES.some(name => viewName.includes(name))) {
        addAdCandidate(found, element, true);
      }
    });

    queryAll('[aria-label]').forEach(element => {
      if (isPromotedLabel(element.getAttribute('aria-label'))) {
        addAdCandidate(found, element, true);
      }
    });

    queryAll(ACTOR_SELECTOR).forEach(element => {
      if (isPromotedLabel(element.textContent)) {
        addAdCandidate(found, element, true);
      }
    });

    queryAll([
      '[role="listitem"] p',
      '[role="listitem"] span',
      'li.jobs-search-results__list-item span',
      'article.job-search-card span',
      'li[data-occludable-job-id] span',
    ].join(',')).forEach(element => {
      if (isPromotedExact(element.textContent)) {
        addAdCandidate(found, element, true);
      }
    });

    const targets = new Set(collapseToOutermost(found));

    queryAll(`[${ATTR.ad}]`).forEach(element => {
      if (!targets.has(element)) clearHiddenAttribute(element, ATTR.ad);
    });

    targets.forEach(element => setHiddenAttribute(element, ATTR.ad));
    updateCount('ads', targets.size);
    return targets.size;
  }

  // ─── İŞ İLANI FİLTRESİ ──────────────────────────────────────────────────────

  const JOB_CARD_SELECTOR = [
    'li[data-occludable-job-id]',
    'li[data-job-id]',
    '[data-occludable-job-id]',
    '[data-job-id]',
    '.job-card-container',
    '.jobs-collection-item',
    '.scaffold-layout__list-item',
    '.jobs-search-results__list-item',
    '.artdeco-list__item',
    '.discovery-templates-entity-item',
    '[data-view-name="job-card"]',
    '[data-view-name="job-posting-card"]',
    '.job-card-job-posting-card-wrapper',
    '[data-testid*="job-card"]',
    '[componentkey*="job-card" i]',
  ].join(',');

  const JOB_LIST_SELECTOR = [
    '.jobs-search-results-list',
    '.jobs-search-results__list',
    '.scaffold-layout__list',
    '[data-view-name*="job-list"]',
  ].join(',');

  const JOB_DETAIL_SELECTOR = [
    '.jobs-search__job-details',
    '.jobs-details__main-content',
    '.scaffold-layout__detail',
    '[data-view-name="job-details"]',
    '.artdeco-modal',
    'dialog',
    '[role="dialog"]',
    '.msg-overlay-conversation-bubble',
    'header',
    'nav',
    '.global-nav',
  ].join(',');

  const APPLIED_STATUS = new Set([
    'applied',
    'application submitted',
    'basvuruldu',
    'basvurdunuz',
    'basvurulan',
    'basvuru yapildi',
  ]);

  const VIEWED_STATUS = new Set([
    'viewed',
    'seen',
    'goruntulendi',
    'goruntulediniz',
    'goruntulenen',
  ]);

  function getStatusFromShortText(text) {
    const value = normalize(text)
      .replace(/^[·•|\-–—]+|[·•|\-–—]+$/g, '')
      .trim();

    if (!value || value.length > 80) return null;
    if (APPLIED_STATUS.has(value)) return 'applied';
    if (VIEWED_STATUS.has(value)) return 'viewed';

    // LinkedIn bazen durum ile tarihi aynı kısa text node'unda birleştiriyor.
    for (const status of APPLIED_STATUS) {
      if (value.startsWith(`${status} ·`) || value.startsWith(`${status} on `)) {
        return 'applied';
      }
    }

    for (const status of VIEWED_STATUS) {
      if (value.startsWith(`${status} ·`) || value.startsWith(`${status} on `)) {
        return 'viewed';
      }
    }

    return null;
  }

  function getJobState(card) {
    let walker;
    try {
      walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    } catch {
      return null;
    }

    let node;
    let viewed = false;
    let inspected = 0;

    while ((node = walker.nextNode()) && inspected < 500) {
      inspected++;
      const raw = node.nodeValue?.trim();
      if (!raw || raw.length > 100) continue;

      const parent = node.parentElement;
      if (!parent || parent.closest('a, h1, h2, h3, h4')) continue;

      const status = getStatusFromShortText(raw);
      if (status === 'applied') return 'applied';
      if (status === 'viewed') viewed = true;
    }

    return viewed ? 'viewed' : null;
  }

  function extractJobId(value) {
    if (!value) return null;
    const text = String(value);
    const viewMatch = text.match(/\/jobs\/view\/(\d+)/);
    if (viewMatch) return viewMatch[1];
    const currentMatch = text.match(/[?&]currentJobId=(\d+)/);
    if (currentMatch) return currentMatch[1];
    return /^\d{5,}$/.test(text) ? text : null;
  }

  function getJobIds(card) {
    const ids = new Set();
    const ownId = extractJobId(
      card.getAttribute('data-occludable-job-id') || card.getAttribute('data-job-id')
    );
    if (ownId) ids.add(ownId);

    const idNodes = queryAll('[data-occludable-job-id], [data-job-id]', card);
    for (const element of idNodes) {
      const id = extractJobId(
        element.getAttribute('data-occludable-job-id') || element.getAttribute('data-job-id')
      );
      if (id) ids.add(id);
      if (ids.size > 1) return ids;
    }

    const links = queryAll('a[href*="/jobs/view/"], a[href*="currentJobId="]', card);
    for (const link of links) {
      const id = extractJobId(link.getAttribute('href'));
      if (id) ids.add(id);
      if (ids.size > 1) return ids;
    }

    return ids;
  }

  function isSafeJobCard(card, status) {
    if (!card || !card.isConnected || isToolkitNode(card)) return false;
    if (card === document.body || card === document.documentElement) return false;
    if (card.matches('ul, ol') || card.closest(JOB_DETAIL_SELECTOR)) return false;

    const textLength = (card.textContent || '').length;
    if (textLength === 0 || textLength > 5000) return false;

    const ids = getJobIds(card);
    if (ids.size > 1) return false;

    const strongSignal = ids.size === 1 || card.matches([
      '[data-occludable-job-id]',
      '[data-job-id]',
      '.job-card-container',
      '.jobs-search-results__list-item',
      '[data-view-name="job-card"]',
      '[data-view-name="job-posting-card"]',
      '[data-testid*="job-card"]',
      '[componentkey*="job-card" i]',
    ].join(','));

    // Link'siz yeni kartlarda kısa ve net durum etiketi yeterli sinyaldir.
    return strongSignal || Boolean(status && card.matches('li, article, [role="listitem"]'));
  }

  function collectJobCandidates() {
    const candidates = new Set(queryAll(JOB_CARD_SELECTOR));

    // Link'siz kartlar için yalnızca gerçek iş listelerindeki listitem'ları ekle.
    queryAll(JOB_LIST_SELECTOR).forEach(list => {
      queryAll('li, article, [role="listitem"]', list).forEach(element => candidates.add(element));
    });

    return candidates;
  }

  function sameSingleJob(left, right) {
    const leftIds = getJobIds(left);
    const rightIds = getJobIds(right);
    if (leftIds.size > 1 || rightIds.size > 1) return false;
    if (leftIds.size === 0 || rightIds.size === 0) return true;
    return leftIds.values().next().value === rightIds.values().next().value;
  }

  function clearJobs() {
    queryAll(`[${ATTR.job}]`).forEach(element => clearHiddenAttribute(element, ATTR.job));
    updateCount('jobs', 0);
  }

  function scanJobs() {
    if (!isJobsPage()) {
      clearJobs();
      return 0;
    }

    const matches = [];
    for (const card of collectJobCandidates()) {
      const status = getJobState(card);
      if (!status || !isSafeJobCard(card, status)) continue;
      matches.push({ card, status });
    }

    // Aynı kartın iç içe birden çok selector ile bulunması halinde dıştaki güvenli
    // liste elemanını seç; böylece boş kart yüksekliği kalmaz.
    const roots = matches.filter(({ card }) => !matches.some(({ card: other }) =>
      other !== card && other.contains(card) && sameSingleJob(other, card)
    ));

    const targets = new Map();
    roots.forEach(({ card, status }) => {
      const shouldHide =
        (status === 'viewed' && state.viewed) ||
        (status === 'applied' && state.applied);
      if (shouldHide) targets.set(card, status);
    });

    queryAll(`[${ATTR.job}]`).forEach(element => {
      if (!targets.has(element)) clearHiddenAttribute(element, ATTR.job);
    });

    targets.forEach((status, element) => setHiddenAttribute(element, ATTR.job, status));
    updateCount('jobs', targets.size);

    dlog(`İş kartı: ${roots.length}, gizlenen: ${targets.size}`);
    return targets.size;
  }

  // ─── EASY APPLY: ŞİRKETİ TAKİP ET KUTUSU ────────────────────────────────────

  const FOLLOW_CHECKBOX_SELECTOR = [
    'input#follow-company-checkbox[type="checkbox"]',
    'input[type="checkbox"][id*="follow-company"]',
    'input[type="checkbox"][name*="follow-company"]',
  ].join(',');
  const CHECKBOX_SELECTOR = 'input[type="checkbox"], [role="checkbox"], [role="switch"]';
  const MODAL_SELECTOR = [
    'dialog', '[role="dialog"]', '.artdeco-modal',
    '.jobs-easy-apply-modal', '[data-test-modal-id="easy-apply-modal"]',
  ].join(',');

  function isFollowText(text) {
    const value = normalize(text);
    return Boolean(value && (
      value === 'follow company' ||
      value === 'follow this company' ||
      (/\bfollow\b/.test(value) && /company page|stay up to date|updates from/.test(value)) ||
      /\bsirket(?:i|ini)?\s+takip\s+(?:et|edin|etmek)\b/.test(value) ||
      /sayfasindan haber almak icin.+takip edin/.test(value)
    ));
  }

  function isOpenModal(modal) {
    if (!modal?.isConnected || modal.closest('[hidden], [aria-hidden="true"]')) return false;
    if (modal.tagName === 'DIALOG' && !modal.open) return false;
    const css = getComputedStyle(modal);
    return css.display !== 'none' && css.visibility !== 'hidden' && modal.getClientRects().length > 0;
  }

  function getEasyApplyModals() {
    return queryAll(MODAL_SELECTOR).filter(modal => {
      if (!isOpenModal(modal)) return false;
      if (modal.matches('.jobs-easy-apply-modal, [data-test-modal-id="easy-apply-modal"]')) return true;
      if (modal.querySelector(FOLLOW_CHECKBOX_SELECTOR)) return true;
      const text = normalize(modal.textContent);
      // Yeni SDUI penceresi <dialog>: "... için başvuru yap" başlığını da tanı.
      return /easy apply|kolay basvuru|basvuru yap|submit application|basvuruyu gonder|apply to\b/.test(text) ||
        (isFollowText(text) && /contact info|resume|iletisim|ozgecmis/.test(text));
    });
  }

  function getLabelsForCheckbox(checkbox, modal) {
    const labels = new Set(Array.from(checkbox.labels || []));
    queryAll('label[for]', modal).forEach(label => {
      // «re», «r11» vb. kimlikleri CSS selector'a çevirmeden eşleştir.
      if (label.control === checkbox || (checkbox.id && label.htmlFor === checkbox.id)) labels.add(label);
    });
    return Array.from(labels).filter(label => modal.contains(label));
  }

  function linkedText(element) {
    const parts = [element.getAttribute('aria-label'), element.getAttribute('title')];
    for (const attribute of ['aria-labelledby', 'aria-describedby']) {
      for (const id of (element.getAttribute(attribute) || '').split(/\s+/).filter(Boolean)) {
        parts.push(document.getElementById(id)?.textContent);
      }
    }
    return parts.filter(Boolean).join(' ');
  }

  function logicalCheckboxes(root) {
    const controls = queryAll(CHECKBOX_SELECTOR, root);
    if (root.matches?.(CHECKBOX_SELECTOR)) controls.unshift(root);
    // Bir role=checkbox sarmalayıcısının içindeki native input aynı kontroldür.
    return controls.filter(control =>
      control.matches('input[type="checkbox"]') || !control.querySelector(CHECKBOX_SELECTOR)
    );
  }

  function isSafeFollowRow(row, checkbox, modal) {
    if (!row || row === modal || row.matches('form') || row.querySelector('h1, h2, h3')) return false;
    const text = row.textContent?.trim() || '';
    if (text.length > 600 || !isFollowText(text)) return false;
    const controls = logicalCheckboxes(row);
    if (controls.length !== 1 || controls[0] !== checkbox) return false;
    return !queryAll('input:not([type="hidden"]), select, textarea, button, [role="button"], [contenteditable="true"]', row)
      .some(other => other !== checkbox && !other.contains(checkbox));
  }

  function findFollowInteractionRoot(checkbox, modal) {
    let row = checkbox.parentElement;
    for (let depth = 0; row && row !== modal && depth < 12; depth++, row = row.parentElement) {
      if (isSafeFollowRow(row, checkbox, modal)) return row;
      if (row.matches('form') || logicalCheckboxes(row).length > 1) break;
    }
    return null;
  }

  function buildFollowControl(checkbox, modal, root = null) {
    return { checkbox, modal, labels: getLabelsForCheckbox(checkbox, modal),
      root: root || findFollowInteractionRoot(checkbox, modal) };
  }

  function getFollowControl(modal) {
    if (!modal) return null;
    const explicit = modal.querySelector(FOLLOW_CHECKBOX_SELECTOR);
    if (explicit) return buildFollowControl(explicit, modal);

    for (const checkbox of logicalCheckboxes(modal)) {
      const labels = getLabelsForCheckbox(checkbox, modal);
      const text = [linkedText(checkbox), ...labels.map(label => label.textContent),
        checkbox.matches('input') ? '' : checkbox.textContent].join(' ');
      if (isFollowText(text)) return buildFollowControl(checkbox, modal);
    }

    // Kullanıcının yapısı: ortak satır > div > div > boş label[for];
    // aynı satır > başka div > p (takip açıklaması). Class/XPath sabitlenmez.
    for (const anchor of queryAll('p, label, span', modal)) {
      const text = anchor.textContent?.trim() || '';
      if (text.length > 600 || !isFollowText(text)) continue;
      let row = anchor;
      for (let depth = 0; row && row !== modal && depth < 12; depth++, row = row.parentElement) {
        const controls = logicalCheckboxes(row);
        if (controls.length > 1 || row.matches('form')) break;
        if (controls.length === 1 && isSafeFollowRow(row, controls[0], modal)) {
          return buildFollowControl(controls[0], modal, row);
        }
      }
    }
    // "Son adımda tek checkbox" takibe kanıt değildir; KVKK/diğer onaylara dokunma.
    return null;
  }

  function getFollowControls() {
    const modals = getEasyApplyModals();
    // Yeniden kullanılan dialog kapandığında yeni başvuru için bütçeyi yenile.
    // Açık modalda süreye bağlı sıfırlama yapma: render döngüsü sonsuz tıklama üretmesin.
    for (const modal of openFollowModals) {
      if (modals.includes(modal)) continue;
      for (const checkbox of modalAttempts.get(modal)?.controls || []) followAttempts.delete(checkbox);
      modalAttempts.delete(modal);
      openFollowModals.delete(modal);
    }
    modals.forEach(modal => openFollowModals.add(modal));
    const seen = new Set();
    return modals.map(getFollowControl).filter(control => {
      if (!control || seen.has(control.checkbox)) return false;
      seen.add(control.checkbox);
      return true;
    });
  }

  function followChecked(checkbox) {
    if (checkbox.matches('input[type="checkbox"]')) return checkbox.checked;
    const value = checkbox.getAttribute('aria-checked');
    return value === 'true' ? true : value === 'false' ? false : null;
  }

  const followAttempts = new WeakMap();
  const modalAttempts = new WeakMap();
  const openFollowModals = new Set();
  const followOriginal = new WeakMap();
  let internalFollowAction = false;
  let followTimer = null;
  let followTimers = [];
  const FOLLOW_SETTLE_MS = 180;

  function getFollowAttempt(checkbox) {
    let attempt = followAttempts.get(checkbox);
    if (!attempt) {
      attempt = { count: 0, lastAt: -Infinity, offSince: null, verified: false };
      followAttempts.set(checkbox, attempt);
    }
    return attempt;
  }

  function followActivationTargets(control) {
    const { checkbox, labels, modal } = control;
    if (!checkbox.matches('input[type="checkbox"]')) return [checkbox];
    const candidates = [];
    // SDUI'de gizli native input, görünür label ile aynı küçük div içindedir.
    // Bu div'e tıklamak checkbox'ın native ön-toggling davranışını çalıştırmaz;
    // wrapper üzerindeki/delege edilmiş handler normal şekilde olayı alır.
    for (const label of labels) {
      const surface = label.parentElement;
      if (!surface || surface === modal || !surface.contains(checkbox) ||
          surface.matches('form, dialog, body, html') ||
          surface.querySelector('h1, h2, h3, a[href]')) continue;
      const boxes = logicalCheckboxes(surface);
      if (boxes.length !== 1 || boxes[0] !== checkbox) continue;
      if (queryAll('input:not([type="hidden"]), textarea, select, button, [role="button"]', surface)
          .some(element => element !== checkbox && !element.contains(checkbox))) continue;
      candidates.push(surface);
      break;
    }
    // Legacy Easy Apply gerçek input click akışını kullanır; orada sıralamayı koru.
    const ordered = checkbox.matches(FOLLOW_CHECKBOX_SELECTOR)
      ? [checkbox, ...labels.slice(0, 1), ...candidates]
      : [...candidates, ...labels.slice(0, 1), checkbox];
    return Array.from(new Set(ordered));
  }

  function rememberFollowElement(element) {
    if (!followOriginal.has(element)) {
      followOriginal.set(element, {
        disabled: 'disabled' in element ? element.disabled : null,
        tabindex: element.getAttribute('tabindex'),
        ariaHidden: element.getAttribute('aria-hidden'),
      });
    }
  }

  function lockFollowControl(control) {
    const { checkbox, labels, root } = control;
    for (const element of [checkbox, ...labels, root].filter(Boolean)) {
      rememberFollowElement(element);
      setHiddenAttribute(element, ATTR.follow, element === checkbox ? 'input' : element === root ? 'row' : 'label');
      setHiddenAttribute(element, 'aria-hidden', 'true');
    }
    if ('disabled' in checkbox && !checkbox.disabled) checkbox.disabled = true;
    if (checkbox.tabIndex !== -1) checkbox.tabIndex = -1;
  }

  function revealFollowControl(control) {
    for (const element of [control.checkbox, ...control.labels, control.root].filter(Boolean)) {
      const original = followOriginal.get(element);
      if (!original) continue;
      clearHiddenAttribute(element, ATTR.follow);
      for (const [name, value] of [['aria-hidden', original.ariaHidden], ['tabindex', original.tabindex]]) {
        if (value === null) clearHiddenAttribute(element, name);
        else setHiddenAttribute(element, name, value);
      }
      if (original.disabled !== null && element.disabled !== original.disabled) element.disabled = original.disabled;
    }
  }

  function showFollowWarning(modal, pending = false) {
    let notice = modal.querySelector('[data-lgt-ui="follow-warning"]');
    if (!notice) {
      notice = document.createElement('aside');
      notice.dataset.lgtUi = 'follow-warning';
      // Native dialog flex/grid kullanabilir. Yeni çocuk hiçbir koşulda
      // yerleşim akışına katılıp başlığı/formu daraltmamalıdır.
      notice.style.setProperty('position', 'fixed', 'important');
      notice.style.setProperty('flex', 'none', 'important');
      modal.appendChild(notice);
    }
    setHiddenAttribute(notice, 'role', pending ? 'status' : 'alert');
    setText(notice, pending
      ? 'Toolkit: Takip seçimi kontrol ediliyor. Bildirim kaybolunca Devam/Gönder düğmesine tekrar basın.'
      : 'Toolkit: Şirket takibi hâlâ açık. Yanlışlıkla takip etmemek için Devam/Gönder durduruldu.');
    if (!pending && !notice.hasAttribute('data-lgt-warned')) {
      setHiddenAttribute(notice, 'data-lgt-warned');
      console.warn('[LGT] Şirket takibi hâlâ açık. Otomatik tıklama bütçesi sınırlı; başvuru gönderilmedi.');
    }
  }

  function clearFollowWarning(modal) {
    modal.querySelector('[data-lgt-ui="follow-warning"]')?.remove(); // Yalnızca kendi uyarımız.
  }

  function queueFollowCheck(delay = 60) {
    if (followTimer !== null) return;
    followTimer = setTimeout(() => {
      followTimer = null;
      uncheckFollowCheckbox();
    }, delay);
  }

  function uncheckFollowControl(control) {
    const { checkbox, modal } = control;
    if (!checkbox.isConnected) return false;
    const now = Date.now();
    const attempt = getFollowAttempt(checkbox);
    if (followChecked(checkbox) === false) {
      if (attempt.offSince === null) attempt.offSince = now;
      if (!attempt.verified && now - attempt.offSince < FOLLOW_SETTLE_MS) {
        queueFollowCheck(FOLLOW_SETTLE_MS - (now - attempt.offSince));
        return false;
      }
      attempt.verified = true;
      lockFollowControl(control);
      clearFollowWarning(modal);
      return true;
    }

    attempt.offSince = null;
    attempt.verified = false;
    revealFollowControl(control);
    if (followChecked(checkbox) !== true) return false;
    // Uygulamanın kendi disabled durumunu zorla açmayız; hydration bittikten sonra tekrar denenir.
    if (checkbox.matches(':disabled') || checkbox.getAttribute('aria-disabled') === 'true') return false;

    const budget = modalAttempts.get(modal) || { count: 0, controls: new Set() };
    const targets = followActivationTargets(control);
    // Süre geçince sıfırlanan sonsuz retry yok. Yeniden oluşturulan düğümler de modal bütçesine tabidir.
    if (attempt.count >= Math.min(3, targets.length) || budget.count >= 8) {
      if (modal.querySelector('[data-lgt-ui="follow-warning"]')) showFollowWarning(modal);
      return false;
    }
    if (now - attempt.lastAt < 240) {
      queueFollowCheck(250);
      return false;
    }
    const target = targets[attempt.count++];
    attempt.lastAt = now;
    budget.count++;
    budget.controls.add(checkbox);
    followAttempts.set(checkbox, attempt);
    modalAttempts.set(modal, budget);

    internalFollowAction = true;
    try {
      // Yalnızca seçimi kapatacak normal DOM olayını çalıştır. DOM/React'in
      // checked değerini zorla yazma, özel React internallerini çağırma.
      target.click();
    } catch (error) {
      dlog('Takip kontrolü tıklanamadı:', error);
    } finally {
      internalFollowAction = false;
    }
    if (checkbox.isConnected && followChecked(checkbox) === false) attempt.offSince = Date.now();
    queueFollowCheck(250);
    // Aynı event döngüsünde başarı ilan edip disable/display:none uygulama.
    // React/SDUI render'ından sonra kapalı durumu tekrar okunacaktır.
    return false;
  }

  function uncheckFollowCheckbox() {
    const controls = getFollowControls();
    return controls.length > 0 && controls.map(uncheckFollowControl).every(Boolean);
  }

  function isFollowInteractionTarget(target, control) {
    return target === control.checkbox || control.checkbox.contains(target) ||
      control.labels.some(label => label === target || label.contains(target)) ||
      Boolean(control.root?.contains(target));
  }

  function scheduleFollowChecks() {
    followTimers.forEach(clearTimeout);
    followTimers = [0, 100, 350, 900, 1800].map(delay => setTimeout(uncheckFollowCheckbox, delay));
  }

  function isApplyAdvanceButton(button) {
    const text = normalize(`${button.textContent || ''} ${button.getAttribute('aria-label') || ''}`);
    return /\b(next|review|continue|submit application|send application)\b|ileri|sonraki|devam|gozden gecir|incele|basvuruyu (gonder|tamamla)/.test(text) ||
      button.matches('button[type="submit"], input[type="submit"]');
  }

  function ensureFollowOffBeforeAdvance(modal, event) {
    const control = getFollowControl(modal);
    if (!control || uncheckFollowControl(control)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const attempt = getFollowAttempt(control.checkbox);
    const pending = followChecked(control.checkbox) === false ||
      (!control.checkbox.matches(':disabled') && control.checkbox.getAttribute('aria-disabled') !== 'true' &&
       attempt.count < Math.min(3, followActivationTargets(control).length) &&
       (modalAttempts.get(modal)?.count || 0) < 8);
    showFollowWarning(modal, pending);
    scheduleFollowChecks();
  }

  function handleFollowClick(event, control) {
    const { checkbox } = control;
    const nativeClick = event.target === checkbox && checkbox.matches('input[type="checkbox"]');
    // Native input click event'i capture'a gelmeden checked tersine çevrilir.
    // Label/div event'inde ise henüz çevrilmemiştir. Kapatmayı engelleme;
    // yalnızca yeniden açılacak bir etkileşimi iptal et.
    const checked = followChecked(checkbox);
    const enabling = nativeClick ? checked !== false : checked !== true;
    if (enabling) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    queueFollowCheck(FOLLOW_SETTLE_MS);
  }

  document.addEventListener('click', event => {
    if (internalFollowAction) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target || isToolkitNode(target)) return;
    const controls = getFollowControls();
    const control = controls.find(item => isFollowInteractionTarget(target, item));
    if (control) {
      handleFollowClick(event, control);
      return;
    }

    const button = target.closest('button, [role="button"], input[type="submit"]');
    if (button) {
      const modal = getEasyApplyModals().find(item => item.contains(button));
      if (modal) {
        if (isApplyAdvanceButton(button)) ensureFollowOffBeforeAdvance(modal, event);
        scheduleFollowChecks();
      } else if (button.id === 'jobs-apply-button-id' ||
        button.matches('[data-live-test-job-apply-button]') ||
        /easy apply|kolay basvuru/.test(normalize(`${button.textContent} ${button.getAttribute('aria-label') || ''}`))) {
        scheduleFollowChecks();
      }
    }
    const link = target.closest('a[href]');
    if (link?.origin === location.origin) {
      setTimeout(checkRouteAndScan, 80);
      setTimeout(checkRouteAndScan, 500);
    }
  }, true);

  document.addEventListener('submit', event => {
    if (internalFollowAction || !(event.target instanceof Element)) return;
    const modal = getEasyApplyModals().find(item => item.contains(event.target));
    if (modal) ensureFollowOffBeforeAdvance(modal, event);
  }, true);

  document.addEventListener('change', event => {
    if (!internalFollowAction && getFollowControls().some(control => control.checkbox === event.target)) {
      // Framework'ün onChange handler'ını kesme; state'i normal akışta güncellesin.
      queueFollowCheck(0);
    }
  }, true);

  document.addEventListener('keydown', event => {
    if (internalFollowAction || ![' ', 'Enter'].includes(event.key)) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const control = getFollowControls().find(item => isFollowInteractionTarget(target, item));
    if (control) {
      if (followChecked(control.checkbox) !== true) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      queueFollowCheck(FOLLOW_SETTLE_MS);
    }
  }, true);

  // ─── TEK ARAÇ ÇUBUĞU ────────────────────────────────────────────────────────

  const ui = {
    root: null,
    adsCount: null,
    jobsCount: null,
    buttons: new Map(),
  };

  function injectCSS() {
    let style = document.getElementById(ID.style);
    if (!style) {
      style = document.createElement('style');
      style.id = ID.style;
      (document.head || document.documentElement).appendChild(style);
    }

    const css = `
      [${ATTR.ad}],
      [${ATTR.job}],
      [${ATTR.follow}] {
        display: none !important;
      }

      [${ATTR.follow}] {
        pointer-events: none !important;
      }
      [data-lgt-ui="follow-warning"] {
        position: fixed !important;
        inset: auto !important;
        left: 50% !important;
        bottom: 18px !important;
        transform: translateX(-50%) !important;
        display: block !important;
        flex: none !important;
        box-sizing: border-box !important;
        width: min(420px, calc(100vw - 40px)) !important;
        min-width: 0 !important;
        height: auto !important;
        max-height: 110px !important;
        overflow: auto !important;
        z-index: 2147483646;
        padding: 12px;
        margin: 0 !important;
        border: 1px solid #ad5600;
        border-radius: 8px;
        background: #fff4e5;
        color: #653400;
        font: 14px/1.5 system-ui, sans-serif;
      }

      #${ID.toolbar} {
        position: fixed;
        right: 22px;
        top: 50%;
        bottom: auto;
        z-index: 900;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        flex-wrap: nowrap;
        gap: 7px;
        width: 168px;
        max-width: calc(100vw - 24px);
        max-height: calc(100vh - 180px);
        padding: 10px;
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 14px;
        background: rgba(16,22,28,.94);
        box-shadow: 0 7px 24px rgba(0,0,0,.38);
        color: #dce6ed;
        font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
        font-size: 11px;
        line-height: 1.2;
        overflow-x: hidden;
        overflow-y: auto;
        transform: translateY(-50%);
        user-select: none;
      }

      #${ID.toolbar} .lgt-title {
        padding: 1px 3px 3px;
        color: #9eb0bc;
        font-weight: 700;
        text-align: center;
        white-space: nowrap;
      }

      #${ID.toolbar} .lgt-count {
        min-width: 0;
        padding: 4px 6px;
        border-radius: 8px;
        background: rgba(255,255,255,.055);
        color: #e9f1f5;
        font-weight: 700;
        text-align: center;
        white-space: nowrap;
      }

      #${ID.toolbar} .lgt-separator {
        width: 100%;
        height: 1px;
        background: rgba(255,255,255,.13);
      }

      #${ID.toolbar} button {
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 999px;
        width: 100%;
        padding: 6px 9px;
        background: rgba(255,255,255,.06);
        color: #9fb0bb;
        font: 700 10px/1.25 "Segoe UI", system-ui, sans-serif;
        cursor: pointer;
        text-align: center;
        white-space: nowrap;
      }

      #${ID.toolbar} button:hover {
        background: rgba(255,255,255,.13);
        color: #e8f1f6;
      }

      #${ID.toolbar} button.is-on {
        border-color: rgba(10,102,194,.72);
        background: rgba(10,102,194,.3);
        color: #8fd0ff;
      }

      #${ID.toolbar} button[data-setting="ads"].is-on {
        border-color: rgba(220,38,38,.62);
        background: rgba(220,38,38,.23);
        color: #ffaaaa;
      }

      #${ID.toolbar} button[data-setting="debug"].is-on {
        border-color: rgba(206,64,154,.62);
        background: rgba(206,64,154,.22);
        color: #ffb0dd;
      }

      @media (max-width: 760px) {
        #${ID.toolbar} {
          right: 8px;
          top: 76px;
          bottom: auto;
          width: 136px;
          max-width: calc(100vw - 16px);
          max-height: calc(100vh - 92px);
          transform: none;
        }
        #${ID.toolbar} .lgt-title {
          display: none;
        }
      }

      @media (max-height: 720px) {
        #${ID.toolbar} {
          top: 76px;
          max-height: calc(100vh - 92px);
          transform: none;
        }
      }
    `;

    if (style.textContent !== css) {
      style.textContent = css;
    }
  }

  function makeButton(label, setting, title) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.setting = setting;
    button.textContent = label;
    button.title = title;
    button.addEventListener('click', () => toggleSetting(setting));
    ui.buttons.set(setting, button);
    return button;
  }

  function ensureToolbar() {
    const existing = document.getElementById(ID.toolbar);
    if (existing) {
      ui.root = existing;
      return;
    }
    if (!document.body) return;

    const root = document.createElement('div');
    root.id = ID.toolbar;
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', 'LinkedIn Güvenli Toolkit');

    const title = document.createElement('span');
    title.className = 'lgt-title';
    title.textContent = `Toolkit ${VERSION}`;

    ui.adsCount = document.createElement('span');
    ui.adsCount.className = 'lgt-count';
    ui.adsCount.dataset.count = 'ads';
    ui.adsCount.textContent = '0 reklam';

    ui.jobsCount = document.createElement('span');
    ui.jobsCount.className = 'lgt-count';
    ui.jobsCount.dataset.count = 'jobs';
    ui.jobsCount.textContent = '0 iş';

    const separator = document.createElement('span');
    separator.className = 'lgt-separator';

    root.append(
      title,
      ui.adsCount,
      ui.jobsCount,
      separator,
      makeButton('Reklam', 'ads', 'Sponsorlu içerikleri ve reklam kutularını gizle'),
      makeButton('Görüntülenen', 'viewed', 'Görüntülenen iş ilanlarını gizle'),
      makeButton('Başvurulan', 'applied', 'Başvurulan iş ilanlarını gizle'),
      makeButton('🐞', 'debug', 'Konsolda kısa hata ayıklama kayıtlarını aç')
    );

    document.body.appendChild(root);
    ui.root = root;
    refreshButtons();
  }

  function refreshButtons() {
    for (const [setting, button] of ui.buttons) {
      const active = Boolean(state[setting]);
      button.classList.toggle('is-on', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }

  function updateCount(type, count) {
    ensureToolbar();
    const element = type === 'ads' ? ui.adsCount : ui.jobsCount;
    setText(element, type === 'ads' ? `${count} reklam` : `${count} iş`);
  }

  function toggleSetting(setting) {
    if (!(setting in state)) return;
    state[setting] = !state[setting];
    writeBool(STORAGE[setting], state[setting]);
    refreshButtons();

    if (setting === 'ads') scanAds();
    if (setting === 'viewed' || setting === 'applied') scanJobs();
    if (setting === 'debug') dlog(`Debug modu ${state.debug ? 'açıldı' : 'kapandı'}.`);
  }

  // ─── TEK, HIZ SINIRLAMALI DOM GÖZLEMCİSİ ────────────────────────────────────

  const MIN_SCAN_GAP = 800;
  let scanTimer = null;
  let scanRunning = false;
  let scanAgain = false;
  let lastScanAt = 0;
  let lastUrl = location.href;

  function runScan() {
    scanTimer = null;
    if (scanRunning) {
      scanAgain = true;
      return;
    }

    scanRunning = true;
    lastScanAt = Date.now();

    try {
      injectCSS();
      ensureToolbar();
      const adCount = scanAds();
      const jobCount = scanJobs();
      uncheckFollowCheckbox();
      dlog(`Tarama tamamlandı — reklam: ${adCount}, iş: ${jobCount}`);
    } catch (error) {
      console.error('[LGT] Tarama hatası:', error);
    } finally {
      scanRunning = false;
      if (scanAgain) {
        scanAgain = false;
        scheduleScan(200);
      }
    }
  }

  function scheduleScan(delay = 160) {
    if (scanTimer) return;
    const elapsed = Date.now() - lastScanAt;
    const wait = Math.max(delay, MIN_SCAN_GAP - elapsed, 0);
    scanTimer = setTimeout(runScan, wait);
  }

  function checkRouteAndScan() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    scheduleScan(50);
    setTimeout(() => scheduleScan(100), 700);
  }

  const observer = new MutationObserver(mutations => {
    let relevant = false;

    for (const mutation of mutations) {
      // Kendi toolbar değişikliklerimiz yeni bir tarama başlatamaz.
      if (isToolkitNode(mutation.target)) continue;
      relevant = true;
      break;
    }

    checkRouteAndScan();
    if (relevant) {
      scheduleScan();
      queueFollowCheck();
    }
  });

  function init() {
    injectCSS();
    ensureToolbar();
    runScan();

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: [
          'aria-label',
          'aria-labelledby',
          'aria-describedby',
          'aria-checked',
          'checked',
          'disabled',
          'open',
          'role',
          'data-view-name',
          'data-job-id',
          'data-occludable-job-id',
        ],
      });
    }

    window.addEventListener('popstate', () => {
      checkRouteAndScan();
      scheduleScan(50);
    });
    window.addEventListener('pageshow', () => scheduleScan(50));

    scheduleFollowChecks();

    if (document.querySelector('#lia-style, #ljf-style, #lia-badge, #ljf-badge')) {
      console.warn(
        '[LGT] Eski LinkedIn userscriptlerinden en az biri hâlâ çalışıyor. ' +
        'Çakışmayı önlemek için eski üç scripti kapatıp sayfayı yenileyin.'
      );
    }

    console.log(`[LGT] Güvenli Toolkit v${VERSION} aktif.`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
