// Run in GitHub Actions, where the public Pages site can be checked over HTTPS.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {APP_VERSION} from '../updates.js';
const origin='https://conditerili.github.io/chilling-place/';
const local=await readFile(new URL('../index.html',import.meta.url),'utf8');
const stylesheet=local.match(/href="(styles\.css\?[^\"]+)"/)[1];
const script=local.match(/src="(app\.js\?[^\"]+)"/)[1];
async function get(path){
  const url=new URL(path,origin);url.searchParams.set('verify',`${process.env.GITHUB_SHA||APP_VERSION}-${Date.now()}`);
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200,`${path}: HTTP ${response.status}`);return response.text();
}
let failure;
for(let attempt=1;attempt<=12;attempt++){
  try{
    for(const entry of ['index.html','listen.html']){
      const html=await get(entry);assert.ok(html.includes(`Версия ${APP_VERSION} · Сакура`),`${entry}: old HTML`);assert.ok(html.includes(stylesheet),`${entry}: old CSS URL`);assert.ok(html.includes(script),`${entry}: old JS URL`);
    }
    const css=await get(stylesheet);assert.ok(css.includes('Sakura feature extensions'));assert.ok(css.includes('sakura-night.webp'));assert.ok(!css.includes('Cozy Place v7'));
    const refresh=await get('update.html');assert.ok(refresh.includes('freshPageUrl'));
    const app=await get(script);assert.ok(app.includes('attachUpdates()'));
    console.log(`PASS: public index.html and listen.html serve ${APP_VERSION}; Sakura CSS, app module and refresh page verified.`);
    process.exit(0);
  }catch(error){failure=error;console.log(`Publication check ${attempt}/12: ${error.message}`);}
  if(attempt<12)await new Promise(resolve=>setTimeout(resolve,10000));
}
throw failure;
