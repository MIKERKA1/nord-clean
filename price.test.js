// node price.test.js
const assert = require('assert');
const SITE = require('./data.js');
const calculate = require('./price.js');

// 50 м² × 55 + 1 доп. комната × 250 = 3000 < минимума 3200 → минимум
let r = calculate(SITE, { serviceId: 'support', qty: 50, rooms: 2 });
assert.strictEqual(r.total, 3200);
assert.match(r.lines[0].label, /минимальный/);

// 60 × 130 + 2 × 450 = 8700; + холодильник 800 + 4 створки × 420 = 1680 → 11180
r = calculate(SITE, { serviceId: 'general', qty: 60, rooms: 3, extras: { fridge: 1, windows: 4 } });
assert.strictEqual(r.total, 11180);
assert.strictEqual(r.low, 10100);
assert.strictEqual(r.high, 12300);

// офис не учитывает комнаты; нулевые и неизвестные допы игнорируются
r = calculate(SITE, { serviceId: 'office', qty: 100, rooms: 9, extras: { oven: 0, nope: 3 } });
assert.strictEqual(r.total, 8000);
assert.strictEqual(r.lines.length, 1);

assert.throws(() => calculate(SITE, { serviceId: 'x', qty: 1 }));
console.log('price ok');
