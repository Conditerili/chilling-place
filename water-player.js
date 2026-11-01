const mirror='https://raw.githubusercontent.com/Conditerili/chilling-place/music-library/';
const cacheName='chilling-place-music-v1';

export function attachWaterPlayer(trigger,panel){
  const select=panel.querySelector('select'),slot=panel.querySelector('.water-media');
  const credit=panel.querySelector('a'),license=document.createElement('a');
  license.target='_blank';license.rel='noopener noreferrer';credit.after(' · ',license);
  const audio=document.createElement('audio');audio.controls=true;audio.preload='none';
  audio.style.width='100%';slot.append(audio);
  const save=document.createElement('button');save.type='button';save.className='secondary';save.textContent='Сохранить музыку на устройстве';
  const status=document.createElement('p');status.className='small muted';status.setAttribute('role','status');slot.after(save,status);
  let catalog,tracks=[],selection=0,objectURL='',fallback=false;
  function cacheKey(track){return new URL('music/offline/'+track.sha1,document.baseURI).href;}
  function stop(){
    selection++;audio.pause();audio.removeAttribute('src');audio.load();
    if(objectURL){URL.revokeObjectURL(objectURL);objectURL='';}
  }
  async function selectTrack(){
    stop();
    const token=selection,track=tracks[select.selectedIndex];if(!track)return;
    credit.href=track.source;credit.textContent=track.artist+' · источник';
    license.href=track.license;license.textContent='CC '+track.license.split('/')[4].toUpperCase();
    fallback=false;
    let cached;
    try{cached=await window.caches?.match(cacheKey(track),{cacheName});}catch{}
    if(token!==selection)return;
    if(cached){
      const blob=await cached.blob();if(token!==selection)return;
      objectURL=URL.createObjectURL(blob);audio.src=objectURL;
    }else audio.src=mirror+track.file;
  }
  audio.onerror=()=>{
    const track=tracks[select.selectedIndex];
    if(!track||panel.hidden||!audio.getAttribute('src'))return;
    if(!fallback){fallback=true;audio.src=track.url;audio.play().catch(()=>{status.textContent='Нажми ▶ для запуска оригинала.';});}
    else status.textContent='Запись не загрузилась. Открой источник или выбери другую.';
  };
  save.onclick=async()=>{
    save.disabled=true;
    try{
      if(!window.caches)throw Error();
      const cache=await caches.open(cacheName);
      for(const [i,track] of tracks.entries()){
        status.textContent='Сохранение '+(i+1)+' / '+tracks.length;
        const key=cacheKey(track);if(await cache.match(key))continue;
        let stored=false;
        for(const url of [mirror+track.file,track.url]){
          try{
            const r=await fetch(url);if(!r.ok)continue;
            const bytes=await r.arrayBuffer();if(bytes.byteLength!==track.bytes)continue;
            const digest=await crypto.subtle.digest('SHA-1',bytes);
            if(Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')!==track.sha1)continue;
            await cache.put(key,new Response(bytes,{headers:{'Content-Type':'audio/mpeg'}}));stored=true;break;
          }catch{}
        }
        if(!stored)throw Error();
      }
      status.textContent='Все 30 записей сохранены в памяти этого браузера.';
    }catch{status.textContent='Загрузка прервалась. Проверь сеть и свободное место. Повторное нажатие продолжит загрузку.';}
    finally{save.disabled=false;}
  };
  function close(){stop();panel.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.classList.remove('water-touch');trigger.focus({preventScroll:true});}
  trigger.onclick=async()=>{
    if(!panel.hidden){close();return;}
    trigger.classList.add('water-touch');panel.hidden=false;trigger.setAttribute('aria-expanded','true');
    if(!tracks.length){
      save.disabled=true;
      try{
        catalog??=fetch(new URL('./music/catalog.json?v=1',import.meta.url)).then(r=>{if(!r.ok)throw Error();return r.json();});
        tracks=await catalog;
        if(!select.options.length)tracks.forEach((t,i)=>select.add(new Option((i+1)+' · '+t.artist+' — '+t.title,i)));
        save.disabled=false;
        status.textContent='30 записей · '+Math.ceil(tracks.reduce((sum,t)=>sum+t.bytes,0)/1e6)+' МБ для сохранения всей коллекции';
      }catch{catalog=null;status.textContent='Каталог не загрузился. Закрой и открой плеер ещё раз.';return;}
    }
    if(!panel.hidden)selectTrack();
  };
  select.onchange=selectTrack;panel.querySelector('.water-close').onclick=close;
}
