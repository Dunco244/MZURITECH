// backend/scripts/downloadImages.js
// Run standalone : node scripts/downloadImages.js
// Called by seed : automatically runs after seeding via module.exports

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

// ─── Output folder — your frontend public directory ───────────────────────────
const OUTPUT_DIR = path.join(__dirname, '../../app/public');

// ─── All product images ───────────────────────────────────────────────────────
// ⚡ ADD new product images here — seed.js will auto-download them on next run
const images = [

  // ── Laptops ──────────────────────────────────────────────────────────────────
  { file: 'product-dell-xps15.png',          url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=80&fit=crop' },
  { file: 'product-macbook-air.png',         url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80&fit=crop' },
  { file: 'hero-laptop.png',                 url: 'https://images.unsplash.com/photo-1593642634315-48f5414c3ad9?w=800&q=80&fit=crop' },
  { file: 'product-hp-pavilion.png',         url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&q=80&fit=crop' },
  { file: 'product-thinkpad-x1.png',         url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&q=80&fit=crop' },
  { file: 'product-acer-aspire5.png',        url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80&fit=crop' },
  { file: 'product-gaming-laptop.png',       url: 'https://images.unsplash.com/photo-1603481588273-2f908a9a7a1b?w=600&q=80&fit=crop' },
  { file: 'product-ideapad-slim3i.png',      url: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600&q=80&fit=crop' },
  { file: 'product-elitebook-840-g10.png',   url: 'https://images.unsplash.com/photo-1484788984921-03950022c9ef?w=600&q=80&fit=crop' },
  { file: 'product-macbook-air-m2.png',      url: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=600&q=80&fit=crop' },

  // ── Phones ───────────────────────────────────────────────────────────────────
  { file: 'product-iphone15.png',            url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&q=80&fit=crop' },
  { file: 'product-samsung-s24.png',         url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&q=80&fit=crop' },
  { file: 'product-samsung-a54.png',         url: 'https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=600&q=80&fit=crop' },
  { file: 'product-tecno-camon.png',         url: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=600&q=80&fit=crop' },
  { file: 'product-infinix-note30.png',      url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&q=80&fit=crop' },
  { file: 'product-pixel8.png',              url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80&fit=crop' },
  { file: 'product-galaxy-z-flip6.png',      url: 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=600&q=80&fit=crop' },
  { file: 'product-xiaomi-14t-pro.png',      url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&q=80&fit=crop' },
  { file: 'product-tecno-spark30.png',       url: 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=600&q=80&fit=crop' },
  { file: 'product-itel-p55.png',            url: 'https://images.unsplash.com/photo-1567581935884-3349723552ca?w=600&q=80&fit=crop' },

  // ── Tablets ──────────────────────────────────────────────────────────────────
  { file: 'product-ipad-pro.png',            url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80&fit=crop' },
  { file: 'product-galaxy-tab-s9.png',       url: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=600&q=80&fit=crop' },
  { file: 'product-lenovo-tab-p12.png',      url: 'https://images.unsplash.com/photo-1589739900266-43b2843f4c12?w=600&q=80&fit=crop' },
  { file: 'product-galaxy-tab-s9-fe.png',    url: 'https://images.unsplash.com/photo-1632516643720-e7f5d7d6ecc9?w=600&q=80&fit=crop' },
  { file: 'product-ipad-10th.png',           url: 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=600&q=80&fit=crop' },
  { file: 'product-tecno-megapad.png',       url: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=600&q=80&fit=crop' },

  // ── Audio ────────────────────────────────────────────────────────────────────
  { file: 'product-headphones.png',          url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80&fit=crop' },
  { file: 'product-jbl-charge5.png',         url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80&fit=crop' },
  { file: 'product-airpods-pro2.png',        url: 'https://images.unsplash.com/photo-1603351154351-5e2d0600bb77?w=600&q=80&fit=crop' },
  { file: 'product-bose-qc45.png',           url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&q=80&fit=crop' },
  { file: 'product-jbl-tune770nc.png',       url: 'https://images.unsplash.com/photo-1545127398-14699f92334b?w=600&q=80&fit=crop' },
  { file: 'product-galaxy-buds3-pro.png',    url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80&fit=crop' },

  // ── Gaming ───────────────────────────────────────────────────────────────────
  { file: 'product-ps5.png',                 url: 'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=600&q=80&fit=crop' },
  { file: 'product-xbox-series-x.png',       url: 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=600&q=80&fit=crop' },
  { file: 'product-razer-mouse.png',         url: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=600&q=80&fit=crop' },
  { file: 'product-switch-oled.png',         url: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=600&q=80&fit=crop' },
  { file: 'product-gpro-superlight2.png',    url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&q=80&fit=crop' },
  { file: 'product-hyperx-cloud-alpha.png',  url: 'https://images.unsplash.com/photo-1599669454699-248893623440?w=600&q=80&fit=crop' },

  // ── Accessories ──────────────────────────────────────────────────────────────
  { file: 'product-anker-charger.png',       url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&q=80&fit=crop' },
  { file: 'product-samsung-t7.png',          url: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=600&q=80&fit=crop' },
  { file: 'product-mx-master3s.png',         url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&q=80&fit=crop' },
  { file: 'product-baseus-powerbank.png',    url: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&q=80&fit=crop' },
  { file: 'product-logitech-k380.png',       url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80&fit=crop' },

  // ── Cameras ──────────────────────────────────────────────────────────────────
  { file: 'product-canon-r50.png',           url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80&fit=crop' },
  { file: 'product-gopro-hero12.png',        url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&q=80&fit=crop' },
  { file: 'product-sony-zv-e10-ii.png',      url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=600&q=80&fit=crop' },
  { file: 'product-dji-osmo-pocket3.png',    url: 'https://images.unsplash.com/photo-1565514158740-064f34bd6cfd?w=600&q=80&fit=crop' },

  // ── Wearables ────────────────────────────────────────────────────────────────
  { file: 'product-apple-watch-s9.png',      url: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=600&q=80&fit=crop' },
  { file: 'product-galaxy-watch6.png',       url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80&fit=crop' },
  { file: 'product-fitbit-charge6.png',      url: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600&q=80&fit=crop' },
  { file: 'product-galaxy-watch7.png',       url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&q=80&fit=crop' },

  // ── Computers ────────────────────────────────────────────────────────────────
  { file: 'product-mac-mini-m4.png',            url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&q=80&fit=crop' },
  { file: 'product-thinkcentre-m70q.png',       url: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=600&q=80&fit=crop' },
  { file: 'product-elitedesk-800-g9.png',       url: 'https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=600&q=80&fit=crop' },
  { file: 'product-optiplex-7010.png',          url: 'https://images.unsplash.com/photo-1593640408182-31c228939b1d?w=600&q=80&fit=crop' },
  { file: 'product-proart-station-pd500te.png', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80&fit=crop' },
  { file: 'product-ideacentre-aio-27.png',      url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80&fit=crop' },
  { file: 'product-pavilion-desktop-tp01.png',  url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80&fit=crop' },
  { file: 'product-inspiron-3030-desktop.png',  url: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=600&q=80&fit=crop' },
  { file: 'product-msi-infinite-s3.png',        url: 'https://images.unsplash.com/photo-1603481588273-2f908a9a7a1b?w=600&q=80&fit=crop' },
  { file: 'product-nuc-14-pro.png',             url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80&fit=crop' },

  // ── Monitors ─────────────────────────────────────────────────────────────────
  { file: 'product-lg-27gp850.png',          url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80&fit=crop' },
  { file: 'product-samsung-s36c.png',        url: 'https://images.unsplash.com/photo-1593642634315-48f5414c3ad9?w=600&q=80&fit=crop' },
  { file: 'product-dell-u3223qe.png',        url: 'https://images.unsplash.com/photo-1607706189992-eae578626c86?w=600&q=80&fit=crop' },
  { file: 'product-proart-pa278cgv.png',     url: 'https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=600&q=80&fit=crop' },
  { file: 'product-lg-34wp65c.png',          url: 'https://images.unsplash.com/photo-1555421689-d68471e189f2?w=600&q=80&fit=crop' },
  { file: 'product-hp-24mh.png',             url: 'https://images.unsplash.com/photo-1547119957-637f8679db1e?w=600&q=80&fit=crop' },
  { file: 'product-benq-ew2880u.png',        url: 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=600&q=80&fit=crop' },
  { file: 'product-msi-mag-274qrf.png',      url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80&fit=crop' },
  { file: 'product-philips-271v8l.png',      url: 'https://images.unsplash.com/photo-1547119957-637f8679db1e?w=600&q=80&fit=crop' },
  { file: 'product-samsung-s32c552.png',     url: 'https://images.unsplash.com/photo-1612832021455-245704c6755a?w=600&q=80&fit=crop' },

];

// ─── Download helper (with retry + broken file detection) ─────────────────────
function download(url, destPath, retries = 3) {
  return new Promise((resolve, reject) => {
    // Check if file already exists and is valid (> 5KB means it's a real image)
    if (fs.existsSync(destPath)) {
      const size = fs.statSync(destPath).size;
      if (size > 5000) { resolve('exists'); return; }
      fs.unlinkSync(destPath); // too small = broken partial, re-download
    }

    const file   = fs.createWriteStream(destPath);
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        download(res.headers.location, destPath, retries).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        if (retries > 0) {
          setTimeout(() => download(url, destPath, retries - 1).then(resolve).catch(reject), 1500);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve('downloaded'); });
    });

    req.on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      if (retries > 0) {
        setTimeout(() => download(url, destPath, retries - 1).then(resolve).catch(reject), 1500);
      } else {
        reject(err);
      }
    });

    req.setTimeout(25000, () => {
      req.destroy();
      if (retries > 0) {
        setTimeout(() => download(url, destPath, retries - 1).then(resolve).catch(reject), 1500);
      } else {
        reject(new Error('Timeout'));
      }
    });
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    console.error(`\n❌ Output directory not found:\n   ${OUTPUT_DIR}`);
    console.error('\n   Update OUTPUT_DIR to point to your frontend /public folder.');
    process.exit(1);
  }

  console.log(`\n📁 Saving to: ${OUTPUT_DIR}`);
  console.log(`📦 Checking ${images.length} images...\n`);

  let downloaded = 0, skipped = 0, failed = 0;
  const failedList = [];

  for (const { file, url } of images) {
    const dest = path.join(OUTPUT_DIR, file);
    try {
      const result = await download(url, dest);
      if (result === 'exists') {
        console.log(`   ⏭️  Exists:     ${file}`);
        skipped++;
      } else {
        console.log(`   ✅ Downloaded: ${file}`);
        downloaded++;
      }
    } catch (err) {
      console.log(`   ❌ Failed:     ${file} — ${err.message}`);
      failedList.push(file);
      failed++;
    }
  }

  console.log('\n══════════════════════════════════════════════');
  console.log('🎉 Done!');
  console.log(`   Downloaded : ${downloaded}`);
  console.log(`   Skipped    : ${skipped}`);
  console.log(`   Failed     : ${failed}`);
  if (failedList.length > 0) {
    console.log('\n   ⚠️  Failed files (check their URLs in downloadImages.js):');
    failedList.forEach(f => console.log(`      - ${f}`));
  }
  console.log('══════════════════════════════════════════════\n');
}

// ─── Export + standalone support ─────────────────────────────────────────────
// Run directly:        node scripts/downloadImages.js
// Called from seed:    const downloadImages = require('./downloadImages'); await downloadImages();
if (require.main === module) main();
module.exports = main;