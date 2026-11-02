import test from 'node:test';
import assert from 'node:assert/strict';
import {freshPageUrl,availableRelease} from '../updates.js';
test('refresh keeps the origin, entry point, Telegram parameters and current screen',()=>{
  const href='https://conditerili.github.io/chilling-place/listen.html?v=5&tgWebAppPlatform=android#journal';
  const next=new URL(freshPageUrl(href,123));
  assert.equal(next.origin,'https://conditerili.github.io');assert.equal(next.pathname,'/chilling-place/listen.html');assert.equal(next.searchParams.get('v'),'5');assert.equal(next.searchParams.get('tgWebAppPlatform'),'android');assert.equal(next.searchParams.get('cp_refresh'),'123');assert.equal(next.hash,'#journal');
  assert.equal(new URL(freshPageUrl(next.href,456)).searchParams.getAll('cp_refresh').length,1);
});
test('release check bypasses caching and does not send Telegram launch parameters',async()=>{
  let requested;
  const fetcher=async(url,options)=>{requested={url:new URL(url),options};return {ok:true,json:async()=>({version:'7.0.3'})};};
  assert.equal(await availableRelease(fetcher,'https://conditerili.github.io/chilling-place/listen.html?tgWebAppData=private#journal','7.0.2'),'7.0.3');
  assert.equal(requested.url.pathname,'/chilling-place/version.json');assert.equal(requested.url.searchParams.has('tgWebAppData'),false);assert.equal(requested.url.hash,'');assert.equal(requested.options.cache,'no-store');assert.equal(requested.options.credentials,'omit');
});
test('current, missing and malformed releases do not produce a false update',async()=>{
  assert.equal(await availableRelease(async()=>({ok:true,json:async()=>({version:'7.0.2'})}),'https://example.com/app/','7.0.2'),null);
  assert.equal(await availableRelease(async()=>({ok:false}),'https://example.com/app/'),null);
  assert.equal(await availableRelease(async()=>({ok:true,json:async()=>({version:'<script>'})}),'https://example.com/app/'),null);
});
