// Local browser regression check. All API traffic is mocked; never contacts hardware.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  const base = process.env.UI_BASE_URL || 'http://127.0.0.1:3107';
  const output = path.resolve(__dirname, '../../artifacts/ui/web-mobile-theme');
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Makassar' });
  const errors = [], unexpected = [], manual = [];
  let mcbOn = false, failRelays = false;
  const relayStates = [false, false, false, false];
  const user = { id: 1, name: 'Petani', email: 'petani@example.invalid', role: 'admin', createdAt: new Date().toISOString() };
  const reading = (deviceId, index = 0) => ({ id: deviceId * 100 + index, deviceId, deviceName: `Panel ${deviceId === 1 ? 'A' : 'B'}`, temperature: 27 + index * .1, humidity: 65 - index, lightLux: 1250 + index * 12, ph: 6.3 + index * .01, tds: 780 + index * 2, conductivity: 1560, flowIn: 2, flowOut: 1.8, source: 'ha', createdAt: new Date(Date.now() - index * 60000).toISOString() });
  const device = id => ({ id, name: `Panel ${id === 1 ? 'A' : 'B'}`, location: 'Greenhouse', ownerId: 1, apiKey: 'fixture-only', relayLabels: ['Larutan A', 'Larutan B', 'pH Up', 'pH Down'], online: true, lastSeenAt: new Date().toISOString(), latestReading: reading(id), haRelays: { relay1: 'switch.a', relay2: 'switch.b', relay3: 'switch.up', relay4: 'switch.down' }, haMcbEntity: 'switch.mcb', haMcbSensors: { power: 'sensor.power', energy: 'sensor.energy' }, createdAt: new Date().toISOString() });
  const relays = () => relayStates.map((on, i) => ({ relay: i + 1, entityId: `switch.relay_${i + 1}`, state: on ? 'on' : 'off', friendlyName: `Relay ${i + 1}`, updatedAt: new Date().toISOString() }));
  const mcb = () => ({ entityId: 'switch.mcb', state: mcbOn ? 'on' : 'off', power: { value: 120, updatedAt: new Date().toISOString() }, energy: { value: 3.2, updatedAt: new Date().toISOString() } });
  await context.addInitScript(() => localStorage.setItem('smartfarm_theme', 'dark'));
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), p = url.pathname, method = request.method();
    if (!p.startsWith('/api/')) {
      if (url.origin !== new URL(base).origin && /^https?:/.test(url.protocol)) return route.abort();
      return route.continue();
    }
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: {'Access-Control-Allow-Origin':'*'} });
    if (method === 'OPTIONS') return route.fulfill({ status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PUT'} });
    if (p === '/api/auth/login') return json({ accessToken: 'fixture-token', user });
    if (p === '/api/auth/me') return json(user);
    if (method === 'POST' && p.includes('app-open')) return json({ok:true});
    if (p === '/api/app-releases/latest') return json({release:null});
    if (p === '/api/devices') return json([device(1),device(2)]);
    if (p === '/api/devices/readings/history') return json([reading(1,1),reading(2,2),reading(1,3)]);
    if (/^\/api\/devices\/\d+$/.test(p)) return json(device(Number(p.split('/').at(-1))));
    if (/^\/api\/devices\/\d+\/readings$/.test(p)) return json(Array.from({length:8},(_,i)=>reading(Number(p.split('/')[3]),7-i)));
    if (p.endsWith('/commands') && method === 'GET') return json([]);
    if (p.endsWith('/nutrients') && method === 'GET') return json({recipe:{waterLiters:1000,aMl:10,bMl:10},pumps:{a:{seconds:5,ml:10},b:{seconds:5,ml:10},phUp:{seconds:3600,ml:150},phDown:{seconds:60,ml:150}},mix:null,phDose:null});
    if (p.endsWith('/relays') && method === 'GET') return failRelays ? json({message:'Status relay tidak tersedia'},503) : json(relays());
    if (p.endsWith('/relays/manual')) { const body = request.postDataJSON(); manual.push(body); relayStates[body.relay-1] = body.action === 'ON'; return json(relays()); }
    if (p.endsWith('/mcb/command')) { mcbOn = request.postDataJSON().action === 'ON'; return json(mcb()); }
    if (p.endsWith('/mcb')) return json(mcb());
    unexpected.push(`${method} ${p}`); return json({message:'Unmocked test endpoint'},404);
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  const screenshot = async name => { await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode().catch(() => {}))); }); await page.screenshot({path:path.join(output,`${name}.png`),fullPage:true}); };
  const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `horizontal overflow at ${page.viewportSize().width}px`);
  try {
    await page.goto(`${base}/login`);
    await page.getByRole('heading',{name:'Selamat datang'}).waitFor();
    assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
    await page.locator('img[src="/mascot/welcome.png"]').evaluate(img => img.decode());
    assert.ok(await page.locator('.brand-logo').evaluate(img => img.complete && img.naturalWidth > 0));
    await screenshot('login-desktop');
    await page.getByLabel('Email',{exact:true}).fill(user.email);
    await page.getByLabel('Password',{exact:true}).fill('fixture-password');
    await page.getByRole('button',{name:'Masuk',exact:true}).click();
    await page.waitForURL('**/dashboard');
    await page.locator('.farm-panel-grid .farm-metric').first().waitFor();
    await page.getByText('120',{exact:false}).first().waitFor();
    await screenshot('dashboard-desktop'); await noOverflow();
    assert.equal(await page.getByText('Rata-rata suhu',{exact:true}).count(),0);
    await page.locator('a[href="/devices/1"]').click();
    await page.getByRole('tab',{name:'Kontrol',exact:true}).click();
    const relay = page.getByRole('switch',{name:'Relay 1 Larutan A',exact:true});
    await relay.waitFor(); await page.waitForFunction(() => !document.querySelector('[role="switch"][aria-label="Relay 1 Larutan A"]').disabled);
    await relay.click(); await page.waitForFunction(() => document.querySelector('[aria-label="Relay 1 Larutan A"]').getAttribute('aria-checked') === 'true');
    await page.waitForTimeout(3200);
    assert.equal(await relay.getAttribute('aria-checked'),'true');
    await screenshot('control-desktop');
    await relay.click(); await page.waitForFunction(() => document.querySelector('[aria-label="Relay 1 Larutan A"]').getAttribute('aria-checked') === 'false');
    assert.deepEqual(manual,[{relay:1,action:'ON'},{relay:1,action:'OFF'}]);
    const mcbSwitch = page.getByRole('switch',{name:'Smart MCB',exact:true});
    await mcbSwitch.click(); await page.waitForFunction(() => document.querySelector('[aria-label="Smart MCB"][role="switch"]').getAttribute('aria-checked') === 'true');
    failRelays = true; await page.getByRole('button',{name:'Perbarui relay',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'Status relay tidak tersedia'}).waitFor();
    assert.equal(await relay.isDisabled(),true); failRelays = false;
    await page.goto(`${base}/history`); await page.locator('.farm-history-card').first().waitFor(); await screenshot('history-desktop');
    await page.getByRole('navigation',{name:'Sidebar utama'}).getByRole('link',{name:'Pengguna',exact:true}).waitFor();
    await page.getByRole('button',{name:'Profil',exact:true}).click(); await page.getByRole('button',{name:'Keluar',exact:true}).waitFor();
    await page.keyboard.press('Escape');
    await page.setViewportSize({width:390,height:844});
    await page.goto(`${base}/dashboard`); await page.locator('.farm-panel-grid .farm-metric').first().waitFor(); await screenshot('dashboard-mobile'); await noOverflow();
    await page.getByRole('button',{name:'Buka menu',exact:true}).click();
    await page.getByRole('dialog',{name:'Menu navigasi'}).getByRole('link',{name:'Tambah Perangkat'}).click();
    await page.getByRole('dialog').waitFor(); await page.getByRole('button',{name:'Tutup',exact:true}).click();
    await page.goto(`${base}/devices/1`); await page.getByRole('tab',{name:'Kontrol',exact:true}).click(); await page.getByRole('switch',{name:'Relay 1 Larutan A',exact:true}).waitFor(); await screenshot('control-mobile'); await noOverflow();
    await page.goto(`${base}/history`); await page.locator('.farm-history-card').first().waitFor(); await screenshot('history-mobile'); await noOverflow();
    await page.getByRole('button',{name:'Buka menu',exact:true}).click(); await page.getByRole('dialog',{name:'Menu navigasi'}).waitFor(); await screenshot('sidebar-mobile'); await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog',{name:'Menu navigasi'}).isVisible(),false);
    await page.setViewportSize({width:320,height:740}); await page.goto(`${base}/dashboard`); await page.locator('.farm-panel-grid .farm-metric').first().waitFor(); await noOverflow();
    await page.getByRole('button',{name:'Profil',exact:true}).click(); await page.getByRole('button',{name:'Keluar',exact:true}).click();
    await page.waitForURL('**/login'); await noOverflow();
    assert.deepEqual(errors,[]); assert.deepEqual(unexpected,[]);
    console.log('PASS: light theme, mascot assets, login/logout, dashboard, manual relay persistence/OFF, MCB switch, failed HA state, global history, admin access, add-device dialog, desktop/390px/320px layouts.');
    console.log(`Screenshots: ${output}`);
  } finally { await browser.close(); }
}
main().catch(e => {console.error(e);process.exitCode=1;});
