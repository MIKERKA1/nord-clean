(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // anime.js — сцена с ковром; Motion — анимации интерфейса. Каждая библиотека управляет своими элементами.
  const A = window.anime, M = window.Motion;
  const motionOK = !!M && !reduce;
  // Служебные переходы — пружина без отскока (bounce 0): плавно, без «игривости»
  const springy = { type: 'spring', bounce: 0, visualDuration: 0.3 };
  const money = (n) => new Intl.NumberFormat('ru-RU').format(n) + ' ' + SITE.currency;
  const svc = (id) => SITE.services.find((s) => s.id === id);
  document.documentElement.classList.add('js');

  // Контакты из конфигурации
  $$('[data-site]').forEach((el) => {
    const k = el.dataset.site;
    el.textContent = SITE[k];
    if (k === 'phone') el.href = 'tel:' + SITE.phone.replace(/[^\d+]/g, '');
    if (k === 'email') el.href = 'mailto:' + SITE.email;
  });
  $('#year').textContent = new Date().getFullYear();

  // Тема: системная по умолчанию; кнопка фиксирует выбор в localStorage (ранний скрипт в <head> применяет его до отрисовки)
  const root = document.documentElement, themeBtn = $('.theme-btn'), darkMq = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => (root.dataset.theme || (darkMq.matches ? 'dark' : 'light')) === 'dark';
  const syncTheme = () => {
    const d = isDark();
    themeBtn.setAttribute('aria-pressed', d);
    themeBtn.setAttribute('aria-label', d ? 'Включить светлую тему' : 'Включить тёмную тему');
    $('meta[name="theme-color"]').content = d ? '#0E1714' : '#F2EEE6';
  };
  themeBtn.addEventListener('click', () => {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch {}
    syncTheme();
  });
  darkMq.addEventListener('change', syncTheme);
  syncTheme();

  // Шапка и мобильное меню
  const hdr = $('.hdr'), burger = $('.burger'), nav = $('#nav');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    nav.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => e.target.closest('a') && setMenu(false));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); burger.focus(); }
  });
  matchMedia('(min-width: 961px)').addEventListener('change', (e) => e.matches && setMenu(false));
  const onScroll = () => hdr.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Перетаскивание только после нажатия. Наведение ничего не двигает.
  // Pointer capture держит жест до отпускания, даже если указатель ушёл за край, — значение просто упирается в 0/1.
  function drag(grip, measure, set, { jump = false } = {}) {
    let id = null;
    const at = (e) => {
      const r = measure();
      set(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
    };
    grip.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      id = e.pointerId;
      grip.setPointerCapture(id);
      grip.classList.add('is-dragging');
      if (e.pointerType === 'mouse') e.preventDefault(); // без выделения текста
      if (jump && e.pointerType === 'mouse') at(e);
    });
    grip.addEventListener('pointermove', (e) => { if (e.pointerId === id) at(e); });
    const end = (e) => { if (e.pointerId === id) { id = null; grip.classList.remove('is-dragging'); } };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => grip.addEventListener(t, end));
  }

  // Ковёр на первом экране: акт 1 — раскатываем грязный ковёр (u), акт 2 — насадка чистит (p)
  const stage = $('.stage'), box = $('.rug-box'), range = $('#clean-range'), out = $('#clean-out'), allBtn = $('[data-clean-all]');
  const steps = $$('.story li');
  const rug = { u: reduce || !A ? 1 : 0.06, p: reduce ? 0.5 : 0 };
  const wrap = $('.rug-wrap'), dirty = $('.rug-dirty'), roll = $('.roll'), wand = $('.wand');
  let playing = null, W = box.clientWidth, H = box.clientHeight;

  // Пыль из-под насадки: пул частиц, каждую ведёт anime.js. Только при движении насадки и без reduced motion.
  const dust = [];
  if (A && !reduce) for (let i = 0; i < 16; i++) { const d = document.createElement('i'); d.className = 'dust'; box.append(d); dust.push(d); }
  const rnd = (a, b) => a + Math.random() * (b - a);
  let dustI = 0, lastP = rug.p, lastPuff = 0;
  const puff = () => {
    const now = performance.now();
    if (!dust.length || rug.u < 0.98 || Math.abs(rug.p - lastP) < 0.003 || now - lastPuff < 40) return;
    lastPuff = now;
    const d = dust[dustI++ % dust.length], x = rug.p * W + rnd(4, 12), y = rnd(0.08, 0.92) * H;
    A.animate(d, { translateX: [x, x + rnd(12, 40)], translateY: [y, y + rnd(-22, 22)], scale: [1, 0.3], opacity: [0.85, 0], duration: rnd(500, 800), ease: 'outQuad' });
  };

  const render = () => {
    // Стили пишем прямо в элементы (без CSS-переменных на родителе); рулон и насадка двигаются только transform
    wrap.style.clipPath = `inset(0 ${((1 - rug.u) * 100).toFixed(2)}% 0 0)`;
    dirty.style.clipPath = `inset(0 0 0 ${(rug.p * 100).toFixed(2)}%)`;
    roll.style.transform = `translateX(${rug.u * W}px) translateX(-50%) scaleX(${(14 + (1 - rug.u) * 64) / 78})`;
    roll.style.opacity = Math.min(1, (1 - rug.u) * 30);
    wand.style.transform = `translateX(${rug.p * W}px) translateX(-50%)`;
    wand.style.opacity = Math.max(0, Math.min(1, (rug.u - 0.97) * 34));
    puff();
    lastP = rug.p;
    range.value = Math.round(rug.p * 100);
    out.textContent = range.value + '%';
    allBtn.textContent = rug.p >= 1 ? 'Вернуть как было' : 'Почистить целиком';
    const step = rug.u < 0.55 ? 0 : rug.p < 0.03 ? 1 : rug.p < 0.98 ? 2 : 3;
    steps.forEach((li, i) => (i === step ? li.setAttribute('aria-current', 'step') : li.removeAttribute('aria-current')));
  };
  new ResizeObserver(() => { W = box.clientWidth; H = box.clientHeight; render(); }).observe(box);
  const stop = () => { if (playing) { playing.pause(); playing = null; } };
  const byUser = (p) => { stop(); rug.u = 1; rug.p = p; render(); };

  range.addEventListener('input', () => byUser(range.value / 100));
  drag(stage, () => box.getBoundingClientRect(), byUser, { jump: true });
  allBtn.addEventListener('click', () => {
    stop();
    const to = rug.p >= 1 ? 0 : 1;
    if (!A || reduce) { rug.u = 1; rug.p = to; return render(); }
    playing = A.animate(rug, { u: 1, p: to, duration: 1200, ease: 'inOutCubic', onUpdate: render });
  });
  render();
  if (A && !reduce) {
    // Вступление: рулон раскатывается, пауза — видно грязь, затем насадка проходит больше половины ковра
    playing = A.createTimeline({ delay: 400, onUpdate: render, onComplete: () => (playing = null) })
      .add(rug, { u: 1, duration: 1500, ease: 'inOutQuad' })
      .add(rug, { p: 0.58, duration: 1700, ease: 'inOutSine' }, '+=450');
  }

  // До / после: тянется только ручка; клавиатура — через скрытый range (стрелки, Home, End)
  $$('.cmp').forEach((fig) => {
    const view = $('.cmp-view', fig), r = $('.cmp-range', fig), grip = $('.cmp-handle', fig);
    let hint = null;
    const set = (p) => { fig.style.setProperty('--p', p * 100 + '%'); r.value = Math.round(p * 100); };
    const user = (p) => { if (hint) { hint.stop(); hint = null; } set(p); };
    r.addEventListener('input', () => user(r.value / 100));
    drag(grip, () => view.getBoundingClientRect(), user);
    // Подсказка при первом появлении: ручка слегка «качается», показывая, что её можно двигать
    if (motionOK) {
      M.inView(view, () => {
        hint = M.animate(50, 50, { keyframes: [50, 36, 58, 50], duration: 1.4, ease: 'easeInOut', onUpdate: (v) => set(v / 100), onComplete: () => (hint = null) });
      }, { amount: 0.6 });
    }
  });

  // Услуги: список + панель (на узком экране панель раскрывается под выбранной услугой)
  const list = $('#svc-list'), panel = $('#svc-panel'), narrow = matchMedia('(max-width: 860px)');
  list.innerHTML = SITE.services.map((s, i) => `
    <li><button class="svc-tab" type="button" aria-expanded="false" aria-controls="svc-panel" data-id="${s.id}">
      <span class="n">${String(i + 1).padStart(2, '0')}</span><span>${s.name}</span><span class="from">от ${money(s.min)}</span>
    </button></li>`).join('');

  let current = null;
  function showSvc(id) {
    const s = svc(id);
    current = id;
    $$('.svc-tab').forEach((t) => t.setAttribute('aria-expanded', t.dataset.id === id));
    panel.innerHTML = `
      <span class="svc-kicker">${s.tag}</span>
      <h3>${s.name}</h3>
      <p class="svc-short">${s.short}</p>
      <p class="svc-price">от ${money(s.min)}<small>${money(s.rate)} за ${s.unit.short} · демо-цены</small></p>
      <div class="svc-cols">
        <div><h4>Что входит</h4><ul>${s.includes.map((x) => `<li>${x}</li>`).join('')}</ul></div>
        <div><h4>Кому подходит</h4><p>${s.forWho}</p><h4>Можно добавить</h4><p>${s.options.join(' · ')}</p></div>
      </div>
      <div class="actions">
        <button class="btn btn-lime" type="button" data-calc="${s.id}">Рассчитать стоимость</button>
        <button class="btn btn-line" type="button" data-order="${s.id}">Сразу оставить заявку</button>
      </div>`;
    placePanel();
    if (motionOK) M.animate(panel, { opacity: [0.35, 1], y: [10, 0] }, springy);
  }
  function placePanel() {
    const host = narrow.matches ? $(`.svc-tab[data-id="${current}"]`).parentElement : $('#svc');
    if (panel.parentElement !== host) host.append(panel);
  }
  narrow.addEventListener('change', placePanel);
  list.addEventListener('click', (e) => {
    const t = e.target.closest('.svc-tab');
    if (!t) return;
    showSvc(t.dataset.id);
    if (narrow.matches) t.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  });
  showSvc(SITE.services[0].id);

  // Калькулятор
  const cS = $('#c-service'), cQ = $('#c-qty'), cR = $('#c-rooms'), cX = $('#c-extras');
  const oS = $('#o-service'), toOrder = $('#toOrder');
  const options = SITE.services.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
  cS.innerHTML = options;
  oS.innerHTML = options + '<option value="other">Другое или пока не знаю</option>';
  let estimate = null;

  const setErr = (input, id, msg) => {
    input.setAttribute('aria-invalid', !!msg);
    $('#' + id).textContent = msg;
  };

  function syncService() {
    const s = svc(cS.value);
    $('#c-qty-label').textContent = s.unit.label;
    cQ.min = s.unit.min; cQ.max = s.unit.max;
    const q = +cQ.value;
    if (!cQ.value || q < s.unit.min || q > s.unit.max || cQ.dataset.unit !== s.unit.short) cQ.value = s.unit.def;
    cQ.dataset.unit = s.unit.short;
    $('#c-qty-hint').textContent = `от ${s.unit.min} до ${s.unit.max}`;
    $('#c-rooms-f').hidden = !s.rooms;
    const checked = new Set($$('input[type=checkbox]:checked', cX).map((c) => c.value));
    cX.innerHTML = SITE.extras.filter((e) => !(e.skipFor || []).includes(s.id)).map((e) => `
      <div class="extra">
        <label><input type="checkbox" value="${e.id}"${checked.has(e.id) ? ' checked' : ''}> ${e.name}</label>
        <span class="extra-price">${money(e.price)}${e.unit ? ' / ' + e.unit : ''}</span>
        ${e.unit ? `<input class="extra-qty" type="number" min="1" max="99" value="1" inputmode="numeric" aria-label="${e.name}: количество, ${e.unit}" hidden>` : ''}
      </div>`).join('');
    toOrder.dataset.order = s.id;
    recalc();
  }

  // Сумма — барабан цифр (идея NumberTicker из Magic UI): каждая цифра это колонка 0–9,
  // Motion прокручивает её к нужному значению. Скринридер читает скрытый текст #sum-text.
  const sumText = $('#sum-text'), sumVis = $('#sum .sum-vis');
  const DIGITS = '0123456789'.split('').map((n) => `<span>${n}</span>`).join('');
  function showSum(total) {
    const text = total == null ? '—' : money(total), chars = [...text];
    sumText.textContent = text;
    if ((sumVis.dataset.text || '').length !== text.length) {
      sumVis.innerHTML = chars.map((c) => (/\d/.test(c) ? `<span class="dg"><span class="dg-col">${DIGITS}</span></span>` : `<span class="dg-sep">${c}</span>`)).join('');
    }
    sumVis.dataset.text = text;
    [...sumVis.children].forEach((el, i) => {
      if (!el.classList.contains('dg')) return;
      const to = `translateY(${-Number(chars[i]) * 10}%)`;
      if (motionOK) M.animate(el.firstChild, { transform: to }, { duration: 0.3, ease: [0.23, 1, 0.32, 1] });
      else el.firstChild.style.transform = to;
    });
  }

  function recalc() {
    const s = svc(cS.value), q = Number(cQ.value), rooms = Number(cR.value);
    const badQ = Number.isInteger(q) && q >= s.unit.min && q <= s.unit.max ? '' : `Введите целое число от ${s.unit.min} до ${s.unit.max}`;
    const badR = !s.rooms || (Number.isInteger(rooms) && rooms >= 1 && rooms <= 10) ? '' : 'Введите число комнат от 1 до 10';
    setErr(cQ, 'c-qty-err', badQ);
    setErr(cR, 'c-rooms-err', badR);

    const extras = {};
    $$('.extra', cX).forEach((row) => {
      const cb = $('input[type=checkbox]', row), qi = $('.extra-qty', row);
      if (qi) {
        const appearing = qi.hidden && cb.checked;
        qi.hidden = !cb.checked;
        if (appearing && motionOK) M.animate(qi, { opacity: [0, 1], y: [-4, 0] }, { duration: 0.18, ease: [0.23, 1, 0.32, 1] });
      }
      if (cb.checked) extras[cb.value] = qi ? Math.min(99, Math.max(1, Math.round(+qi.value) || 1)) : 1;
    });

    if (badQ || badR) {
      estimate = null;
      showSum(null);
      $('#sum-range').textContent = 'Исправьте значения в форме';
      $('#breakdown').innerHTML = '';
    } else {
      const r = calculate(SITE, { serviceId: s.id, qty: q, rooms, extras });
      estimate = { ...r, id: s.id, name: s.name };
      showSum(r.total);
      $('#sum-range').textContent = `обычно от ${money(r.low)} до ${money(r.high)}`;
      $('#breakdown').innerHTML = r.lines.map((l) => `<li><span>${l.label}</span><span>${money(l.sum)}</span></li>`).join('');
    }
    syncSummary();
  }

  cS.addEventListener('change', syncService);
  $('#calcForm').addEventListener('input', (e) => e.target !== cS && recalc());
  $('#calcForm').addEventListener('submit', (e) => e.preventDefault());

  // Переходы «к калькулятору» / «к заявке» с выбранной услугой
  const go = (sel, focusEl) => {
    $(sel).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(() => focusEl.focus({ preventScroll: true }), reduce ? 0 : 600);
  };
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-calc]'), o = e.target.closest('[data-order]');
    if (c) { cS.value = c.dataset.calc; syncService(); go('#calc', cQ); }
    if (o) { oS.value = o.dataset.order; syncSummary(); go('#order', $('#o-name')); }
  });

  // Заявка
  const form = $('#orderForm'), done = $('#orderDone'), status = $('#o-status');
  function syncSummary() {
    const show = estimate && estimate.id === oS.value, el = $('#o-summary'), was = el.textContent;
    el.textContent = show ? `К заявке приложим расчёт: ${estimate.name}, ориентировочно ${money(estimate.total)}.` : '';
    if (!was && el.textContent && motionOK) M.animate(el, { opacity: [0, 1] }, { duration: 0.2 });
  }
  oS.addEventListener('change', syncSummary);

  const rules = {
    'o-name': (el) => (el.value.trim().length >= 2 ? '' : 'Напишите, как к вам обращаться: хотя бы 2 буквы'),
    'o-contact': (el) => {
      const v = el.value.trim(), digits = v.replace(/\D/g, '').length;
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^@\w{4,32}$/.test(v) || (/^[+\d\s()-]+$/.test(v) && digits >= 10 && digits <= 15);
      return ok ? '' : 'Укажите телефон (от 10 цифр), e-mail или @ник в Telegram';
    },
    'o-consent': (el) => (el.checked ? '' : 'Без согласия мы не сможем ответить на заявку'),
  };
  const check = (id) => {
    const el = $('#' + id), msg = rules[id](el);
    setErr(el, id + '-err', msg);
    return !msg;
  };
  Object.keys(rules).forEach((id) => {
    const el = $('#' + id);
    el.addEventListener('change', () => check(id));
    el.addEventListener('input', () => el.getAttribute('aria-invalid') === 'true' && check(id));
  });

  let sending = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    const bad = Object.keys(rules).filter((id) => !check(id));
    if (bad.length) { $('#' + bad[0]).focus(); return; }

    sending = true;
    const btn = $('button[type=submit]', form);
    btn.disabled = true;
    btn.textContent = 'Отправляем…';
    status.textContent = '';
    const data = Object.fromEntries(new FormData(form));
    if (estimate && estimate.id === data.service) data.estimate = estimate.total;

    try {
      if (SITE.formEndpoint) {
        const res = await fetch(SITE.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        showDone(data.name.trim(), false);
      } else {
        await new Promise((r) => setTimeout(r, 600));
        showDone(data.name.trim(), true);
      }
    } catch {
      status.textContent = 'Не получилось отправить заявку. Проверьте подключение и попробуйте ещё раз. Введённые данные сохранились.';
    } finally {
      sending = false;
      btn.disabled = false;
      btn.textContent = 'Отправить заявку';
    }
  });

  function showDone(name, demo) {
    $('#done-title').textContent = demo ? 'Заявка собрана, но не отправлена' : 'Заявка отправлена';
    $('#done-text').textContent = demo
      ? `${name}, это демонстрационный сайт: данные не покинули ваш браузер и нигде не сохранены. На настоящем сайте заявка ушла бы менеджеру, и он связался бы с вами.`
      : `Спасибо, ${name}! Мы свяжемся с вами в рабочее время: ${SITE.hours.toLowerCase()}.`;
    form.hidden = true;
    done.hidden = false;
    done.focus();
    if (motionOK) M.animate(done, { opacity: [0, 1], y: [12, 0] }, springy);
  }
  $('#done-edit').addEventListener('click', () => { done.hidden = true; form.hidden = false; $('#o-name').focus(); });

  syncService();

  // Появление только у визуального блока «До / После» (opacity + y + blur, лёгкий stagger).
  // Тексты и заголовки не анимируем — их нужно читать сразу. Без Motion или при reduced motion всё видно.
  if (motionOK) {
    document.documentElement.classList.add('motion');
    M.inView('.cmp-grid', (grid) => {
      M.animate(grid.querySelectorAll('.cmp'), { opacity: [0, 1], y: [16, 0], filter: ['blur(6px)', 'blur(0px)'] },
        { duration: 0.6, delay: M.stagger(0.08), ease: [0.23, 1, 0.32, 1] });
    }, { amount: 0.2 });
  }
})();
