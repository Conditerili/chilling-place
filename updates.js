// Refresh the current same-origin entry point; never clear local data or music caches.
export const APP_VERSION='7.0.2';
export function freshPageUrl(href,stamp=Date.now()){
  const url=new URL(href);
  url.searchParams.set('cp_refresh',String(stamp));
  return url.href;
}
export async function availableRelease(fetcher,href,current=APP_VERSION){
  const url=new URL('./version.json',href);
  url.searchParams.set('check',String(Date.now()));
  const response=await fetcher(url.href,{cache:'no-store',credentials:'omit'});
  if(!response.ok)return null;
  const release=await response.json();
  if(!release||typeof release.version!=='string'||!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i.test(release.version))return null;
  return release.version!==current?release.version:null;
}
export function attachUpdates(){
  const note=document.getElementById('update-notice');
  document.addEventListener('click',event=>{
    const control=event.target.closest?.('[data-refresh-app]');if(!control)return;
    event.preventDefault();
    window.location.replace(freshPageUrl(window.location.href));
  });
  let checking=false,lastCheck=0;
  async function check(){
    if(checking||Date.now()-lastCheck<30000||document.hidden||!window.location?.href)return;
    checking=true;lastCheck=Date.now();
    try{
      const version=await availableRelease(window.fetch.bind(window),window.location.href);
      if(!version||!note)return;
      note.replaceChildren();
      const text=document.createElement('p');text.textContent='Доступна новая версия приложения. Твои записи сохранятся.';
      const button=document.createElement('button');button.type='button';button.className='secondary';button.dataset.refreshApp='';button.textContent='Обновить приложение';
      note.append(text,button);note.hidden=false;
    }catch{/* Offline or unsupported fetch must never interrupt the diary. */}
    finally{checking=false;}
  }
  window.addEventListener('pageshow',check);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
  check();
}
