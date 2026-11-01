import {createStore, uid, FIELDS} from './storage.js?v=6.0.0';
import {practices, quests, riddles} from './content.js?v=6.0.0';

const $=id=>document.getElementById(id);
const main=$('content');
let backing;
try { backing=window.localStorage; } catch { backing={getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}}; }
const store=createStore(backing);
let settings={theme:'system',reducedMotion:false};
try { settings={...settings,...JSON.parse(backing.getItem('chillingSettings')||'{}')}; } catch {}
let route='now', draft=null, step=0, mood='', practice=null, practiceStep=0, questIndex=0, riddleIndex=0, search='', toastTimer;
try { draft=store.read().draft; } catch(e) { report(e); }
const tg=window.Telegram?.WebApp;
const media=matchMedia('(prefers-color-scheme: dark)');
function applyTheme(){
  const dark=settings.theme==='dark'||(settings.theme==='system'&&(tg?.colorScheme ? tg.colorScheme==='dark' : media.matches));
  document.documentElement.dataset.theme=dark?'dark':'light';
  document.documentElement.dataset.motion=settings.reducedMotion?'reduced':'auto';
  document.querySelector('meta[name=theme-color]').content='#100b13';
}
applyTheme();media.addEventListener?.('change',applyTheme);
try {tg?.ready();tg?.expand();tg?.onEvent('themeChanged',applyTheme);tg?.BackButton?.onClick(()=>go(route==='editor'?'journal':'now'));}catch{}
function report(e){$('notice').textContent=e.message||String(e);$('notice').hidden=false;}
function clearNotice(){$('notice').hidden=true;}
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
function action(id,fn){$(id)?.addEventListener('click',fn);}
function attempt(fn){try{return fn();}catch(e){report(e);return null;}}
function heading(kicker,title,description=''){const wrap=document.createElement('div');const k=document.createElement('p');k.className='eyebrow';k.textContent=kicker;const h=document.createElement('h1');h.textContent=title;wrap.append(k,h);if(description){const p=document.createElement('p');p.className='intro';p.textContent=description;wrap.append(p);}return wrap;}
function confirmAction(title,text){return new Promise(resolve=>{
  const dialog=$('confirm-dialog');$('confirm-title').textContent=title;$('confirm-text').textContent=text;
  const finish=value=>{dialog.close();resolve(value);};
  $('confirm-ok').onclick=()=>finish(true);$('confirm-cancel').onclick=()=>finish(false);
  dialog.oncancel=e=>{e.preventDefault();finish(false);};dialog.showModal();
});}
function render(){
  main.replaceChildren();main.classList.remove('fade');void main.offsetWidth;main.classList.add('fade');
  const active=route==='editor'?'journal':(['practice','quest','riddle'].includes(route)?'practices':route);
  document.querySelectorAll('[data-page]').forEach(b=>{if(b.dataset.page===active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  try{route==='now'?tg?.BackButton?.hide():tg?.BackButton?.show();}catch{}
  ({now:renderNow,journal:renderJournal,editor:renderEditor,practices:renderPractices,practice:renderPractice,quest:renderQuest,riddle:renderRiddle,settings:renderSettings}[route]||renderNow)();
}
function go(page){route=page;history.replaceState(null,'',`#${page}`);render();window.scrollTo({top:0,behavior:'instant'});main.focus({preventScroll:true});}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>go(b.dataset.page));
action('settings-button',()=>go('settings'));action('about-button',()=>go('settings'));
window.addEventListener('hashchange',()=>{route=location.hash.slice(1);if(!['now','journal','practices','settings'].includes(route))route='now';render();});
window.addEventListener('storage',e=>{if(e.key==='chillingPlace.v2'){if(route==='editor')toast('Данные изменены в другой вкладке. Проверь запись перед сохранением.');else render();}});

function renderNow(){
  const destinations = [
    ['write','✿','Дневник мыслей','Разобраться в мыслях'],
    ['small-step','☷','Задачи','Один маленький шаг'],
    ['distract','☾','Отвлечься','Сменить фокус и выдохнуть'],
    ['records','▤','Мои записи','История и заметки']
  ];
  main.innerHTML = `<section class="garden-home"><p class="eyebrow">YOUR PERSONAL SAFE SPACE</p>
    <h1>CHILLING PLACE</h1><p class="welcome">Можно просто побыть здесь.</p>
    <div class="garden-menu">${destinations.map(([id,icon,title,detail]) =>
      `<button class="garden-link" id="${id}"><span aria-hidden="true">${icon}</span><span><strong>${title}</strong><small>${detail}</small></span><i aria-hidden="true">›</i></button>`).join('')}</div></section>
    <section class="panel check-in"><h2>Как ты сейчас?</h2><div class="moods" id="moods"></div>
    <p class="small muted" id="mood-note">Можно просто заметить своё состояние.</p>
    <button class="quiet" id="support">Мне тревожно</button></section>`;
  action('distract',()=>go('riddle'));action('records',()=>go('journal'));
  for(const name of ['Спокойно','Тревожно','Усталость','Грустно','Не знаю']){const b=document.createElement('button');b.className='mood';b.textContent=name;b.setAttribute('aria-pressed',String(mood===name));b.onclick=()=>{mood=name;renderNowOnlyMoods();};$('moods').append(b);}
  function renderNowOnlyMoods(){document.querySelectorAll('.mood').forEach(b=>b.setAttribute('aria-pressed',String(b.textContent===mood)));$('mood-note').textContent='Спасибо, что заметил. Можно выбрать поддержку или записать мысль. Эта отметка не сохраняется.';}
  action('support',()=>startPractice('pause'));action('write',()=>openEditor());action('small-step',()=>go('quest'));
}
function newDraft(){return {id:uid(),createdAt:new Date().toISOString(),anxiety:null,anxietyAfter:null,...Object.fromEntries(FIELDS.map(f=>[f,'']))};}
function openEditor(entry){
  if(entry && draft && draft.id!==entry.id){confirmAction('Открыть другую запись?','Текущий черновик будет заменён. Сначала сохрани его, если он нужен.').then(ok=>{if(ok){draft={...entry};step=0;attempt(()=>store.draft(draft));go('editor');}});return;}
  if(entry)draft={...entry};else if(!draft)draft=newDraft();
  step=0;go('editor');
}
const fieldLabels={situation:'Что произошло?',thought:'Какая мысль тебя тревожит?',emotion:'Какое чувство ты замечаешь?',facts:'Какие факты поддерживают эту мысль?',against:'Какие факты с ней не совпадают?',alternative:'Как ещё можно посмотреть на ситуацию?',nextStep:'Какой небольшой шаг тебе сейчас по силам?'};
const steps = [
  ['Мысль', 'thought', 'Что именно тебя беспокоит?', ['situation','emotion']],
  ['Факты', 'facts', 'Что ты знаешь наверняка, а что предполагаешь?', ['against']],
  ['Другой взгляд', 'alternative', 'Какой ещё исход возможен?', ['nextStep']]
];
function renderEditor(){
  if(!draft)draft=newDraft();
  main.append(heading('ЛИЧНЫЙ ДНЕВНИК','Разберём одну мысль','Можно ответить только на один вопрос. Остальное — по желанию.'));
  const panel=document.createElement('section');panel.className='panel';
  panel.innerHTML=`<div class="step-label"><span id="step-name"></span><span>${step+1} / ${steps.length}</span></div><progress max="${steps.length}" value="${step+1}" aria-label="Шаг дневника"></progress><form id="entry-form"><div id="fields"></div><p class="small muted" id="draft-status" role="status">Текст сохраняется как черновик при вводе.</p><div class="actions"><button type="button" class="secondary" id="previous">Назад</button><button type="button" class="quiet" id="next">Дальше →</button></div><button class="primary" type="submit" style="width:100%;margin-top:12px">Сохранить запись</button></form>`;
  main.append(panel);$('step-name').textContent=steps[step][0];
  const [,primary,question,extra]=steps[step];
  const details=document.createElement('details');
  const summary=document.createElement('summary');summary.textContent='Дополнить запись';details.append(summary);
  for(const field of [primary,...extra]){const label=document.createElement('label');label.htmlFor=field;label.textContent=field===primary?question:fieldLabels[field];const input=document.createElement('textarea');input.id=field;input.name=field;input.maxLength=4000;input.value=draft[field];input.placeholder=field==='thought'?'Например: «Боюсь, что не справлюсь…»':'Можно коротко. Можно пока не знать.';input.addEventListener('input',()=>{draft[field]=input.value;persistDraft();});(field===primary?$('fields'):details).append(label,input);}
  $('fields').append(details);
  if(step===0||step===2){const field=step===0?'anxiety':'anxietyAfter';const label=document.createElement('label');label.htmlFor=field;label.textContent=step===0?'Насколько сильна тревога сейчас?':'Тревога после записи — если хочется отметить';const input=document.createElement('input');input.type='range';input.id=field;input.min=0;input.max=10;input.value=draft[field]??5;const value=document.createElement('p');value.id='score-value';value.className='muted small';const update=()=>{value.textContent=draft[field]===null?'Не отмечено · шкала от 0 до 10':`${draft[field]} из 10`;input.setAttribute('aria-valuetext',draft[field]===null?'Не отмечено':`${draft[field]} из 10`);};input.oninput=()=>{draft[field]=Number(input.value);update();persistDraft();};const skip=document.createElement('button');skip.type='button';skip.className='text-button';skip.textContent='Не отмечать';skip.onclick=()=>{draft[field]=null;update();persistDraft();};details.append(label,input,value,skip);update();}
  $('previous').textContent=step===0?'К дневнику':'← Назад';$('next').hidden=step===steps.length-1;
  action('previous',()=>{if(step===0)go('journal');else{step--;renderEditorOnly();}});action('next',()=>{step++;renderEditorOnly();});
  $('entry-form').onsubmit=e=>{e.preventDefault();try{store.save(draft);const saved={...draft};draft=null;clearNotice();go('journal');main.replaceChildren(heading('ЛИЧНЫЙ ДНЕВНИК','Твоя запись','Сохранена на этом устройстве.'),entryCard(saved));main.querySelector('details').open=true;const historyButton=document.createElement('button');historyButton.className='primary';historyButton.textContent='Мои записи';historyButton.onclick=()=>go('journal');main.append(historyButton);toast('Запись сохранена. Можно выдохнуть.');}catch(err){report(err);$('notice').scrollIntoView({block:'start'});}};
}
function renderEditorOnly(){main.replaceChildren();renderEditor();main.focus();window.scrollTo(0,0);}
function persistDraft(){try{store.draft(draft);$('draft-status').textContent='Черновик сохранён на этом устройстве.';}catch(e){$('draft-status').textContent='Черновик не сохранён. Не закрывай страницу.';report(e);}}
function dateText(entry){if(entry.createdAt){const d=new Date(entry.createdAt);if(!Number.isNaN(d.getTime()))return d.toLocaleString('ru-RU',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}return entry.date||'Дата не указана';}
function renderJournal(){
  main.append(heading('ТВОЁ ЛИЧНОЕ ПРОСТРАНСТВО','Дневник мыслей','Здесь можно оставить то, что занимает голову. И вернуться, когда захочется.'));
  const bar=document.createElement('div');bar.className='actions';bar.innerHTML='<button class="primary" id="new-entry">+ Записать мысль</button><button class="secondary" id="data-settings">Мои данные</button>';main.append(bar);
  action('new-entry',()=>openEditor());action('data-settings',()=>go('settings'));
  if(draft){const box=document.createElement('div');box.className='panel';box.innerHTML='<h3>У тебя есть черновик</h3><p class="muted small">Можно продолжить с того места, где остановился.</p><div class="actions"><button class="quiet" id="resume">Продолжить</button><button class="secondary" id="discard">Удалить черновик</button></div>';main.append(box);action('resume',()=>openEditor());action('discard',async()=>{if(await confirmAction('Удалить черновик?','Сохранённые записи останутся.'))attempt(()=>{store.draft(null);draft=null;render();});});}
  const state=attempt(()=>store.read());if(!state)return;
  if(!state.entries.length){const empty=document.createElement('div');empty.className='empty';empty.innerHTML='<div class="empty-icon" aria-hidden="true">▤</div><h2>Чистый лист — тоже начало</h2><p class="muted">Первая запись может быть всего из одной фразы.</p>';main.append(empty);return;}
  const label=document.createElement('label');label.htmlFor='search';label.textContent='Найти в записях';const input=document.createElement('input');input.id='search';input.type='search';input.placeholder='Слово или фраза';input.value=search;const list=document.createElement('div');list.id='entries';main.append(label,input,list);
  const paint=()=>{list.replaceChildren();const found=state.entries.slice().reverse().filter(e=>FIELDS.some(f=>e[f].toLocaleLowerCase().includes(search.toLocaleLowerCase())));const count=document.createElement('p');count.className='small muted';count.textContent=`Записей: ${found.length}`;list.append(count);for(const entry of found)list.append(entryCard(entry));};input.oninput=()=>{search=input.value;paint();};paint();
}
function entryCard(entry){
  const card=document.createElement('article');card.className='entry';const top=document.createElement('div');top.className='entry-head';const date=document.createElement('span');date.textContent=dateText(entry);top.append(date);if(entry.anxiety!==null){const badge=document.createElement('span');badge.className='badge';badge.textContent=`Тревога ${entry.anxiety}/10`;top.append(badge);}const preview=document.createElement('p');preview.className='entry-preview';preview.textContent=(entry.thought||entry.situation||'Запись без текста').slice(0,180);
  const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Открыть запись ↓';const body=document.createElement('dl');for(const field of FIELDS){if(!entry[field])continue;const term=document.createElement('dt');term.textContent=fieldLabels[field];const value=document.createElement('dd');value.textContent=entry[field];body.append(term,value);}if(entry.anxietyAfter!==null){const p=document.createElement('p');p.textContent=`Тревога после: ${entry.anxietyAfter}/10`;body.append(p);}details.append(summary,body);
  const actions=document.createElement('div');actions.className='actions';const edit=document.createElement('button');edit.className='secondary';edit.textContent='Изменить';edit.onclick=()=>openEditor(entry);const remove=document.createElement('button');remove.className='text-button';remove.textContent='Удалить';remove.onclick=async()=>{if(await confirmAction('Удалить запись?','Это действие нельзя отменить. Другие записи останутся.'))attempt(()=>{store.remove(entry.id);if(draft?.id===entry.id)draft=null;render();toast('Запись удалена.');});};actions.append(edit,remove);details.append(actions);card.append(top,preview,details);return card;
}
function renderPractices(){
  main.append(heading('НЕБОЛЬШАЯ ПАУЗА','В своём темпе','Выбери то, что подходит сейчас. Любую практику можно пропустить или остановить.'));
  const grid=document.createElement('div');grid.className='grid';main.append(grid);
  for(const [id,p] of Object.entries(practices)){const tile=document.createElement('button');tile.className='tile';const icon=document.createElement('span');icon.className='tile-icon';icon.textContent=p.symbol;icon.setAttribute('aria-hidden','true');const title=document.createElement('h3');title.textContent=p.title;const desc=document.createElement('p');desc.textContent=p.description;const meta=document.createElement('span');meta.className='meta';meta.textContent=p.time+' ↗';tile.append(icon,title,desc,meta);tile.onclick=()=>startPractice(id);grid.append(tile);}
  const quest=document.createElement('button');quest.className='tile green';quest.innerHTML='<span class="tile-icon" aria-hidden="true">↗</span><h3>Маленький шаг</h3><p>Забота о себе без списка обязательств.</p><span class="meta">12 ИДЕЙ · 2 МИН</span>';quest.onclick=()=>go('quest');grid.append(quest);
  const riddle=document.createElement('button');riddle.className='tile rose';riddle.innerHTML='<span class="tile-icon" aria-hidden="true">?</span><h3>Небольшая загадка</h3><p>Просто переключить внимание.</p><span class="meta">МИНУТА ЛЮБОПЫТСТВА</span>';riddle.onclick=()=>go('riddle');grid.append(riddle);
}
function startPractice(id){practice=id;practiceStep=0;go('practice');}
function renderPractice(){
  const p=practices[practice];if(!p){route='practices';renderPractices();return;}
  main.append(heading('ПАУЗА ДЛЯ СЕБЯ',p.title));
  const panel=document.createElement('section');panel.className='panel';main.append(panel);
  if(practiceStep>=p.steps.length){panel.innerHTML='<div class="practice-symbol" aria-hidden="true">✧</div><h2>Спасибо, что уделил себе время</h2><p class="muted">Как тебе сейчас? Любой ответ — нормальный.</p><div id="feedback" class="moods"></div><div id="feedback-result" role="status"></div><div class="actions"><button class="primary" id="finish-practice">Закончить</button><button class="secondary" id="practice-write">Записать мысль</button></div>';for(const text of ['Стало легче','Без изменений','Стало тяжелее','Не хочу оценивать']){const b=document.createElement('button');b.className='mood';b.textContent=text;b.onclick=()=>{$('feedback-result').replaceChildren();const note=document.createElement('p');note.className='note';note.textContent=text==='Стало тяжелее'?'Давай на этом остановимся. Можно обратиться к человеку, которому доверяешь. Если состояние долго мешает жизни, стоит обсудить его со специалистом.':'Не нужно добиваться определённого результата. Можно просто отдохнуть. Эта оценка не сохраняется.';$('feedback-result').append(note);};$('feedback').append(b);}action('finish-practice',()=>go('now'));action('practice-write',()=>openEditor());return;}
  panel.innerHTML=`<div class="step-label"><span>Можно пропустить любой шаг</span><span>${practiceStep+1} / ${p.steps.length}</span></div><progress max="${p.steps.length}" value="${practiceStep+1}" aria-label="Шаг упражнения"></progress><div class="practice-symbol" aria-hidden="true"></div><h2 class="practice-text"></h2><p class="practice-hint"></p><div class="actions"><button class="secondary" id="practice-prev">Назад</button><button class="primary" id="practice-next">Дальше →</button></div><div class="actions"><button class="text-button" id="practice-skip">Пропустить шаг</button><button class="text-button" id="practice-stop">Остановиться</button></div>`;
  panel.querySelector('.practice-symbol').textContent=p.symbol;panel.querySelector('.practice-text').textContent=p.steps[practiceStep][0];panel.querySelector('.practice-hint').textContent=p.steps[practiceStep][1];$('practice-prev').disabled=practiceStep===0;const next=()=>{practiceStep++;render();main.focus();};action('practice-next',next);action('practice-skip',next);action('practice-prev',()=>{practiceStep--;render();});action('practice-stop',()=>{go('now');toast('Можно остановиться. Ты ничего не должен.');});
}
function renderQuest(){main.append(heading('БЕЗ ДАВЛЕНИЯ','Один маленький шаг'));const box=document.createElement('section');box.className='panel';box.innerHTML='<div class="practice-symbol" aria-hidden="true">✳</div><p class="practice-text" id="quest-text"></p><p class="practice-hint">Это предложение, а не обязанность.</p><div class="actions"><button class="primary" id="quest-done">Сделал</button><button class="secondary" id="quest-next">Другой вариант</button></div><button class="text-button" id="quest-skip">Сегодня пропущу</button>';main.append(box);$('quest-text').textContent=quests[questIndex];action('quest-next',()=>{questIndex=(questIndex+1)%quests.length;render();});action('quest-done',()=>{go('now');toast('Маленький шаг — уже забота о себе.');});action('quest-skip',()=>go('now'));}
function renderRiddle(){main.append(heading('НЕМНОГО ЛЮБОПЫТСТВА','Просто загадка'));const box=document.createElement('section');box.className='panel';box.innerHTML='<div class="practice-symbol" aria-hidden="true">?</div><p id="riddle-question" class="practice-text"></p><p id="riddle-answer" class="practice-hint" role="status"></p><div class="actions"><button class="primary" id="reveal">Показать ответ</button><button class="secondary" id="another-riddle">Ещё загадка</button></div>';main.append(box);$('riddle-question').textContent=riddles[riddleIndex][0];action('reveal',()=>{$('riddle-answer').textContent=riddles[riddleIndex][1];});action('another-riddle',()=>{riddleIndex=(riddleIndex+1)%riddles.length;render();});}
function download(text,name){const blob=new Blob([text],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);toast('Файл подготовлен. Проверь загрузки браузера.');}
function renderSettings(){
  main.append(heading('ПО-ТВОЕМУ','Настройки и данные'));
  const panel=document.createElement('section');panel.className='panel';panel.innerHTML=`<h2>Как тебе удобнее</h2><label for="theme">Оформление</label><select id="theme"><option value="system">Как в системе / Telegram</option><option value="light">Светлое</option><option value="dark">Тёмное</option></select><label class="check-label"><input type="checkbox" id="motion">Уменьшить анимацию</label>`;main.append(panel);$('theme').value=settings.theme;$('motion').checked=settings.reducedMotion;
  const updateSettings=()=>{settings={theme:$('theme').value,reducedMotion:$('motion').checked};applyTheme();try{backing.setItem('chillingSettings',JSON.stringify(settings));}catch{report(new Error('Настройки применены на эту сессию, но сохранить их не удалось.'));}};$('theme').onchange=updateSettings;$('motion').onchange=updateSettings;
  const data=document.createElement('section');data.className='panel';data.innerHTML=`<h2>Твои записи — под твоим контролем</h2><p class="muted">Дневник хранится только в этом браузере или окне Telegram на этом устройстве. Он не синхронизируется между ними. Очистка данных браузера может удалить записи.</p><p class="small muted">Тексты не отправляются в ИИ или на наш сервер. Это не зашифрованное хранилище: человек с доступом к устройству может прочитать записи.</p><p class="small muted">Экспорт содержит личные тексты и черновик. Сохрани его в надёжном месте. Импорт добавит записи, не удаляя существующие.</p><div class="actions"><button class="secondary" id="export">Скачать записи</button><button class="secondary" id="import">Восстановить из файла</button></div><input type="file" id="import-file" accept="application/json,.json" hidden><p id="import-status" class="small" role="status"></p><details><summary>Если скачивание не работает</summary><p class="small muted">Покажи копию, выдели весь текст и сохрани в личный файл .json. Не отправляй её в публичные чаты.</p><button class="text-button" id="show-export">Показать текст копии</button><textarea id="export-text" aria-label="Текст резервной копии" readonly hidden></textarea></details><details><summary>Восстановление после ошибки</summary><p class="small muted">Исходная копия нужна для ручного восстановления повреждённых данных. Это не обычный файл импорта.</p><button class="text-button" id="raw-export">Скачать исходную копию</button></details><div class="actions"><button class="danger" id="delete-all">Удалить все записи и черновик</button></div>`;main.append(data);
  action('export',()=>attempt(()=>download(store.export(),'chilling-place-backup.json')));action('show-export',()=>attempt(()=>{$('export-text').value=store.export();$('export-text').hidden=false;$('export-text').focus();$('export-text').select();}));action('raw-export',()=>attempt(()=>download(store.raw(),'chilling-place-recovery.json')));action('import',()=>$('import-file').click());
  $('import-file').onchange=async()=>{const file=$('import-file').files[0];if(!file)return;try{if(file.size>10*1024*1024)throw Error('Выбери файл размером до 10 МБ.');const text=await file.text();if(await confirmAction('Добавить записи из файла?','Текущие записи сохранятся. Совпадающие записи не будут добавлены повторно.')){const count=store.import(text);if(!draft)draft=store.read().draft;$('import-status').textContent=`Добавлено записей: ${count}. Черновик восстановлен, если своего не было.`;clearNotice();}}catch(e){report(e);}finally{$('import-file').value='';}};
  action('delete-all',async()=>{if(await confirmAction('Удалить весь дневник?','Будут удалены все записи, черновик и старая локальная копия. Сначала скачай экспорт, если хочешь их сохранить.'))attempt(()=>{store.clear();draft=null;search='';clearNotice();toast('Все записи на этом устройстве удалены.');});});
  const about=document.createElement('section');about.className='panel';about.innerHTML='<h2>Поддержка, а не терапия</h2><p class="muted">CHILLING PLACE — пространство для самоподдержки взрослых. Здесь нет диагностики, лечения, ИИ-чата или наблюдения специалиста. Если переживания долго мешают повседневной жизни, стоит обратиться за профессиональной помощью.</p><p class="muted">Если тебе или кому-то рядом прямо сейчас угрожает опасность, обратись в местную экстренную службу или к человеку, который может быть рядом. Это приложение не получает экстренные обращения.</p><p class="small muted">Напоминания и облачная синхронизация пока не подключены.</p><p class="eyebrow">CHILLING PLACE · 6.1 · Ночная сакура</p>';main.append(about);
}
route=['now','journal','practices','settings'].includes(location.hash.slice(1))?location.hash.slice(1):'now';render();
