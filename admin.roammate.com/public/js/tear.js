/**
 * Tear-sheet panel controller.
 *
 * Any element carrying data-tear="<type>" opens the side panel with the fragment
 * from /tear/<type>. Extra params ride along as data-tear-* attributes, so
 * adding a new linkable field is a markup change, not a code change.
 *
 * The fragment is parsed with DOMParser and adopted, never assigned through
 * innerHTML: DOMParser does not execute scripts, so a stray tag in data that
 * reached a tear sheet cannot become code.
 */
(function () {
  'use strict';

  var panel = document.getElementById('tearsheet');
  var scrim = document.getElementById('tearscrim');
  if (!panel || !scrim) return;
  var lastFocus = null;

  function setContent(markup) {
    var parsed = new DOMParser().parseFromString('<body>' + markup + '</body>', 'text/html');
    panel.replaceChildren.apply(panel, Array.prototype.slice.call(parsed.body.childNodes));
  }

  function open() {
    panel.classList.add('open');
    scrim.classList.add('open');
    document.body.classList.add('tear-open');
  }

  function close() {
    panel.classList.remove('open');
    scrim.classList.remove('open');
    document.body.classList.remove('tear-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function load(trigger) {
    var type = trigger.getAttribute('data-tear');
    if (!type) return;
    var params = new URLSearchParams();
    for (var i = 0; i < trigger.attributes.length; i++) {
      var a = trigger.attributes[i];
      if (a.name.indexOf('data-tear-') === 0 && a.name !== 'data-tear-close') {
        params.set(a.name.slice('data-tear-'.length), a.value);
      }
    }
    lastFocus = trigger;
    setContent('<div class="ts-inner"><div class="ts-body"><div class="empty">Loading…</div></div></div>');
    open();

    fetch('/tear/' + encodeURIComponent(type) + '?' + params.toString(), {
      headers: { 'X-Requested-With': 'tearsheet' },
      credentials: 'same-origin',
    })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (html) {
        setContent(html);
        var closer = panel.querySelector('[data-tear-close]');
        if (closer) closer.focus();
      })
      .catch(function (err) {
        setContent('<div class="ts-inner"><div class="ts-head"><h3>Could not load</h3>' +
          '<button type="button" class="ts-close" data-tear-close aria-label="Close">&times;</button></div>' +
          '<div class="ts-body"><div class="err"></div></div></div>');
        var box = panel.querySelector('.err');
        if (box) box.textContent = String(err && err.message ? err.message : err);
      });
  }

  document.addEventListener('click', function (ev) {
    var closer = ev.target.closest('[data-tear-close]');
    if (closer) { ev.preventDefault(); close(); return; }
    var trigger = ev.target.closest('[data-tear]');
    if (trigger) { ev.preventDefault(); load(trigger); }
  });

  scrim.addEventListener('click', close);
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && panel.classList.contains('open')) close();
  });
})();
