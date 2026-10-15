// Расчёт ориентировочной стоимости. Чистая функция: данные из SITE, без DOM.
function calculate(site, { serviceId, qty, rooms = 1, extras = {} }) {
  const s = site.services.find((x) => x.id === serviceId);
  if (!s) throw new Error('Unknown service: ' + serviceId);

  const work = qty * s.rate + (s.rooms ? Math.max(0, rooms - 1) * s.roomFee : 0);
  const base = Math.max(s.min, work);
  const label = `${s.name}: ${qty} ${s.unit.short}` + (s.rooms ? `, ${rooms} комн.` : '');
  const lines = [{ label: work < s.min ? label + ' (минимальный заказ)' : label, sum: base }];

  for (const [id, q] of Object.entries(extras)) {
    const e = site.extras.find((x) => x.id === id);
    if (!e || !(q > 0)) continue;
    lines.push({ label: e.unit ? `${e.name}: ${q} ${e.unit}` : e.name, sum: e.price * (e.unit ? q : 1) });
  }

  const total = lines.reduce((a, l) => a + l.sum, 0);
  const r100 = (n) => Math.round(n / 100) * 100;
  return { lines, total, low: r100(total * (1 - site.spread)), high: r100(total * (1 + site.spread)) };
}

if (typeof module === 'object') module.exports = calculate;
