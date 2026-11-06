import {moods,contexts,feedbacks,templates,dayKey,weekSummary,patternSummary,roomProgress,recommendations} from './wellbeing.js?v=7.0.0';
import {practices,quests} from './content.js?v=7.0.0';
import {uid} from './storage.js?v=7.0.0';

function el(tag,className='',text){const node=document.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;return node;}
function button(text,fn,className='secondary'){const node=el('button',className,text);node.type='button';node.onclick=fn;return node;}
function title(kicker,text,description){const node=el('header','page-heading');node.append(el('p','eyebrow',kicker),el('h1','',text));if(description)node.append(el('p','intro',description));return node;}
function card(titleText,description){const node=el('section','panel');if(titleText)node.append(el('h2','',titleText));if(description)node.append(el('p','muted',description));return node;}
const minuteFor=id=>({pause:1,around:3,grounding:5,breathing:3,rest:1})[id];
const timeText=value=>new Date(value).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});

export function createWellbeingUI({main,store,go,openEditor,startPractice,toast,report,confirmAction}){
  let pending=null,minutes=0,month=new Date(),selectedDay=dayKey(),recording=null,recognitionTimer=null,activeSession=null;
  const read=()=>{try{return store.read();}catch(error){report(error);return null;}};
  const run=fn=>{try{return fn();}catch(error){report(error);return null;}};
  function cleanup(){if(recording){recording.abort();recording=null;}clearTimeout(recognitionTimer);}
  function room(state){
    const {leaves,lit,points}=roomProgress(state),node=card('Твой сад');
    node.classList.add('garden-progress','check-in');node.dataset.lit=String(lit);
    const branch=el('div','garden-sprig',Array.from({length:leaves},()=> '❀').join(' '));
    branch.setAttribute('aria-label',`Цветов в саду: ${leaves}`);
    node.append(branch,el('p','small muted',`${points} маленьких действий для себя. Пропуски дней ничего не меняют.`));
    if(lit)node.append(el('p','garden-light','✧ В саду горит твой огонёк'));
    return node;
  }
  function startMood(id){pending={id:uid(),createdAt:new Date().toISOString(),mood:id,emotion:'',contexts:[],note:''};paintCheckin();}
  function paintCheckin(){
    const host=document.getElementById('checkin-detail');if(!host||!pending)return;
    host.replaceChildren();const info=moods[pending.mood];
    host.append(el('p','emotion-definition',info.definition));
    const group=el('div','moods');group.setAttribute('role','group');group.setAttribute('aria-label','Уточнить чувство');
    for(const name of info.emotions){const b=button(name,()=>{pending.emotion=pending.emotion===name?'':name;paintCheckin();},'mood');b.setAttribute('aria-pressed',String(pending.emotion===name));group.append(b);}host.append(group);
    const label=el('p','field-caption','Что могло повлиять? Необязательно');host.append(label);
    const tags=el('div','moods');tags.setAttribute('role','group');tags.setAttribute('aria-label','Контекст состояния');
    for(const name of contexts){const b=button(name,()=>{pending.contexts=pending.contexts.includes(name)?pending.contexts.filter(x=>x!==name):[...pending.contexts,name];paintCheckin();},'mood');b.setAttribute('aria-pressed',String(pending.contexts.includes(name)));tags.append(b);}host.append(tags);
    const noteLabel=el('label','','Одна фраза, если хочется');noteLabel.htmlFor='checkin-note';const note=el('textarea');note.id='checkin-note';note.maxLength=4000;note.rows=2;note.value=pending.note;note.placeholder='Можно оставить пустым';note.oninput=()=>{pending.note=note.value;};host.append(noteLabel,note);
    const actions=el('div','actions');actions.append(button('Сохранить состояние',()=>{if(run(()=>store.checkin(pending))){pending=null;toast('Состояние сохранено на этом устройстве.');go('now');}},'primary'),button('Пока без записи',()=>{pending=null;renderNow();},'text-button'));host.append(actions);
    document.querySelectorAll('.mood-option').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mood===pending.mood)));
  }
  function practiceButton(id){const p=practices[id];const b=button('',()=>startPractice(id),'recommendation');b.append(el('span','recommendation-icon',p.symbol),el('span','',p.title),el('small','muted',`${minuteFor(id)} мин`),el('span','muted','↗'));return b;}
  function renderNow(){
    main.before(document.getElementById('water-home'));
    main.replaceChildren();const state=read();if(!state)return;
  const destinations = [
    ['write','<svg aria-hidden="true" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M16 23C8 18 11 10 16 4c5 6 8 14 0 19Zm0 0C8 23 4 18 3 10c5 1 8 3 10 6m3 7c8 0 12-5 13-13-5 1-8 3-10 6M3 22q5 5 13 2 8 3 13-2"/></svg>','Терапия','Разобраться в мыслях'],
    ['small-step','<svg aria-hidden="true" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M11 7H7v21h18V7h-5M12 5h7v4h-7zM10 17l3 3 7-7"/></svg>','Задачи','Поддержать баланс'],
    ['distract','<svg aria-hidden="true" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M4 20v-5a12 12 0 0 1 24 0v5M4 17h5v10H6q-2 0-2-2zM28 17h-5v10h3q2 0 2-2z"/></svg>','Отвлечься','Сменить фокус и выдохнуть'],
    ['records','<svg aria-hidden="true" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M16 8Q8 3 2 6v20q7-3 14 1 7-4 14-1V6q-7-3-14 2Zm0 0v19"/></svg>','Мои записи','История и заметки'],
    ['reading','❧','Литература','Короткое чтение у озера'],
    ['games','✾','Мини-игры','Сад на воде']
  ];
    const entrance=el('div');
    entrance.innerHTML=`<section class="garden-home"><h1 class="sr-brand">CHILLING PLACE</h1>
    <p class="garden-tag">YOUR PERSONAL SAFE SPACE</p><div class="divider" aria-hidden="true">✦</div>
    <div class="garden-menu">${destinations.map(([id,icon,title,detail]) =>
      `<button class="garden-link" id="${id}"><span aria-hidden="true">${icon}</span><span><strong>${title}</strong><small>${detail}</small></span><i aria-hidden="true">›</i></button>`).join('')}</div></section>`;
    const destinationsById={write:()=>go('templates'),'small-step':()=>go('quest'),distract:()=>go('riddle'),records:()=>go('journal'),reading:()=>go('reading'),games:()=>go('games')};
    for(const [id,fn] of Object.entries(destinationsById))entrance.querySelector('#'+id).onclick=fn;
    main.append(entrance.firstElementChild);
    const hour=new Date().getHours();
    const check=card('Как ты сейчас?','Выбери то, что ближе. Можно пока не знать.');check.classList.add('check-in');
    const grid=el('div','mood-grid');grid.setAttribute('role','group');grid.setAttribute('aria-label','Твоё состояние');
    for(const [id,info] of Object.entries(moods)){const b=button('',()=>startMood(id),'mood-option');b.dataset.tone=info.tone;b.dataset.mood=id;b.setAttribute('aria-pressed',String(pending?.mood===id));b.append(el('span','mood-face',info.icon),el('span','',info.label));grid.append(b);}check.append(grid);
    const detail=el('div');detail.id='checkin-detail';detail.setAttribute('aria-live','polite');check.append(detail);
    const controls=el('div','home-controls');controls.append(document.getElementById('water-home'),check);main.prepend(controls);if(pending)paintCheckin();
    const recent=state.checkins.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
    if(recent){const line=el('p','small muted');line.textContent=`Последняя отметка: ${moods[recent.mood].label.toLocaleLowerCase()} · ${new Date(recent.createdAt).toLocaleDateString('ru-RU')} ${timeText(recent.createdAt)}`;main.append(line);}
    const suggestions=card('Что подойдёт сейчас',recent?`После отметки «${moods[recent.mood].label}». Выбор можно изменить.`:'Короткое действие без обязательств.');
    const durations=el('div','moods duration-filter');durations.setAttribute('role','group');durations.setAttribute('aria-label','Сколько есть времени');const list=el('div','recommendation-list');
    const paint=()=>{list.replaceChildren();let ids=recommendations(recent?.mood,minutes);if(!ids.length)ids=Object.keys(practices).filter(id=>minuteFor(id)===minutes);for(const id of ids.slice(0,3))list.append(practiceButton(id));durations.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.minutes)===minutes)));};
    for(const [value,label] of [[0,'Любая пауза'],[1,'1 минута'],[3,'3 минуты'],[5,'5 минут']]){const b=button(label,()=>{minutes=value;paint();},'mood');b.dataset.minutes=value;durations.append(b);}suggestions.append(durations,list);paint();main.append(suggestions,room(state));
    const dayEvents=state.care.filter(c=>dayKey(c.createdAt)===dayKey()),quest=card('Маленький шаг на сегодня',quests[new Date().getDate()%quests.length]);
    quest.classList.add('daily-step');quest.append(button(dayEvents.length?'Сегодня ты уже позаботился о себе ✓':'Попробовать маленький шаг',()=>go('quest'),dayEvents.length?'secondary':'primary'));main.append(quest);
    const links=el('div','quick-links');
    for(const [label,fn] of [['✎ Записать мысль',()=>go('templates')],['▦ Моя история',()=>go('insights')],['♡ Попросить поддержки',()=>go('support')],['☾ Завершить день',()=>openEditor(null,hour<12?'morning':'evening')],['❧ Литература',()=>go('reading')],['✾ Сад на воде',()=>go('games')]])links.append(button(label,fn,'quick-link'));main.append(links);
  }
  function renderTemplates(){
    main.append(title('ЛИЧНЫЙ ДНЕВНИК','С чего хочется начать?','Три коротких вопроса. Можно пропустить любой.'));
    const grid=el('div','grid template-grid');for(const [id,t] of Object.entries(templates)){const b=button('',()=>openEditor(null,id),'tile');b.append(el('span','tile-icon',t.icon),el('h2','',t.label),el('p','muted',t.description),el('span','meta','3 ШАГА →'));grid.append(b);}main.append(grid);
  }
  function journalTools(){
    const panel=card('Твоя история','Настроение, практики и записи можно посмотреть вместе.');const actions=el('div','actions');actions.append(button('Календарь и неделя',()=>go('insights'),'secondary'),button('Выбрать шаблон',()=>go('templates'),'quiet'));panel.append(actions);return panel;
  }
  function renderInsights(){
    const state=read();if(!state)return;
    main.append(title('БЕЗ ОЦЕНОК И СРАВНЕНИЙ','Твоя история','Каждая отметка — небольшой момент внимания к себе.'));
    const week=weekSummary(state),summary=card('Эта неделя');
    const stats=el('div','stats');for(const [number,label] of [[week.checkins.length,'отметок'],[week.entries.length,'записей'],[week.sessions.length,'практик']]){const item=el('div');item.append(el('strong','',String(number)),el('span','small muted',label));stats.append(item);}summary.append(stats);
    if(!week.counts.length)summary.append(el('p','muted','Пока нет отметок за эту неделю. Можно начать в любой день.'));
    for(const item of week.counts){const row=el('div','mood-stat');row.dataset.tone=moods[item.id].tone;row.append(el('span','',item.label),el('span','',String(item.count)));summary.append(row);}
    summary.append(button('Оглянуться на неделю',()=>openEditor(null,'weekly'),'secondary'));main.append(summary);
    const calendar=card('Календарь состояний'),head=el('div','calendar-head'),caption=el('h3'),grid=el('div','calendar-grid'),day=el('div','day-detail');
    const paint=()=>{
      caption.textContent=month.toLocaleDateString('ru-RU',{month:'long',year:'numeric'});grid.replaceChildren();
      for(const label of ['пн','вт','ср','чт','пт','сб','вс'])grid.append(el('span','calendar-weekday',label));
      const first=new Date(month.getFullYear(),month.getMonth(),1),offset=(first.getDay()+6)%7,total=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
      for(let n=0;n<offset;n++)grid.append(el('span'));
      for(let n=1;n<=total;n++){
        const key=dayKey(new Date(month.getFullYear(),month.getMonth(),n)),records=state.checkins.filter(c=>dayKey(c.createdAt)===key).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)),last=records.at(-1),entries=state.entries.filter(e=>e.createdAt&&dayKey(e.createdAt)===key);
        const b=button(String(n),()=>{selectedDay=key;paint();},'calendar-day');if(last)b.dataset.tone=moods[last.mood].tone;if(key===dayKey())b.classList.add('today');b.setAttribute('aria-pressed',String(key===selectedDay));b.setAttribute('aria-label',`${n} ${caption.textContent}, ${last?moods[last.mood].label:'нет отметок'}, записей: ${entries.length}`);if(entries.length)b.append(el('span','entry-dot','·'));grid.append(b);
      }
      day.replaceChildren(el('h3','',new Date(selectedDay+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})));
      const records=state.checkins.filter(c=>dayKey(c.createdAt)===selectedDay).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
      const entries=state.entries.filter(e=>e.createdAt&&dayKey(e.createdAt)===selectedDay),sessions=state.sessions.filter(s=>dayKey(s.createdAt)===selectedDay);
      if(!records.length&&!entries.length&&!sessions.length)day.append(el('p','muted','В этот день нет записей. Пробелы — это нормально.'));
      for(const c of records){
        const item=el('article','history-item');item.dataset.tone=moods[c.mood].tone;item.append(el('strong','',`${timeText(c.createdAt)} · ${c.emotion||moods[c.mood].label}`));if(c.contexts.length)item.append(el('p','small muted',c.contexts.join(' · ')));if(c.note)item.append(el('p','preline',c.note));
        item.append(button('Удалить отметку',async()=>{if(await confirmAction('Удалить отметку?','Записи дневника останутся.'))if(run(()=>{store.removeCheckin(c.id);return true;}))go('insights');},'text-button'));day.append(item);
      }
      for(const entry of entries){const b=button('',()=>openEditor(entry),'history-entry');b.append(el('strong','',templates[entry.template||'thought'].label),el('span','',String(entry.thought||entry.situation||entry.alternative||entry.nextStep||entry.emotion||'Открыть запись').slice(0,140)));day.append(b);}
      for(const s of sessions){const item=el('div','history-item');item.append(el('strong','',practices[s.practice].title),el('p','small muted',`${s.minutes} мин · ${feedbacks[s.feedback]||'Без оценки'}`));item.append(button('Удалить из истории',async()=>{if(await confirmAction('Удалить практику из истории?','Другие данные сохранятся.'))if(run(()=>{store.removeSession(s.id);return true;}))go('insights');},'text-button'));day.append(item);}
    };
    head.append(button('←',()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);selectedDay=dayKey(month);paint();},'icon-button'),caption,button('→',()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);selectedDay=dayKey(month);paint();},'icon-button'));
    head.firstChild.setAttribute('aria-label','Предыдущий месяц');head.lastChild.setAttribute('aria-label','Следующий месяц');calendar.append(head,grid,el('p','small muted','Цвет — последняя отметка дня. Точка — есть запись дневника. Нажми день, чтобы открыть историю.'),day);main.append(calendar);paint();
    const patterns=card('Что ты замечаешь');const items=patternSummary(state.checkins);
    if(!items.length)patterns.append(el('p','muted','Когда появятся отметки с одним контекстом хотя бы за три дня, здесь будут наблюдения.'));
    for(const p of items)patterns.append(el('p','pattern',`«${p.context}»: спокойствие или радость отмечены в ${p.calm} из ${p.days} дней с этим контекстом.`));
    patterns.append(el('p','small muted','Это описание твоих отметок, а не объяснение причин. Если в день несколько отметок, для каждого контекста учитывается последняя.'));main.append(patterns);
    const helpful=card('Что ты отмечал полезным'),ids=[...new Set(state.sessions.filter(s=>s.feedback==='better').map(s=>s.practice))];
    if(!ids.length)helpful.append(el('p','muted','После практики можно отметить «Стало легче». Здесь появится быстрый доступ к этим упражнениям.'));
    for(const id of ids)helpful.append(practiceButton(id));main.append(helpful);
  }
  function beginPractice(id){activeSession={id:uid(),createdAt:new Date().toISOString(),practice:id,minutes:minuteFor(id),feedback:null};}
  function practiceDone(panel){
    if(!activeSession)return;
    const saved=run(()=>store.session(activeSession));
    panel.replaceChildren(el('div','practice-symbol','✧'),el('h2','','Спасибо за эту паузу'),el('p','muted','Как тебе сейчас? Можно не оценивать.'));
    const controls=el('div','moods'),status=el('p','small muted');status.setAttribute('role','status');
    const update=()=>controls.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.feedback===activeSession.feedback)));
    for(const [key,label] of Object.entries(feedbacks)){const b=button(label,()=>{const next={...activeSession,feedback:key};if(run(()=>store.session(next))){activeSession=next;update();status.textContent=key==='worse'?'Можно остановиться и обратиться к близкому человеку. Не нужно продолжать через силу.':'Оценка сохранена. Это твой опыт, здесь нет правильного результата.';}},'mood');b.dataset.feedback=key;controls.append(b);}
    status.textContent=saved?'Практика сохранена в истории. Оценка необязательна.':'Историю сохранить не удалось. Можно попробовать ещё раз, выбрав оценку.';update();
    const actions=el('div','actions');actions.append(button('Вернуться в своё место',()=>go('now'),'primary'),button('Записать мысль',()=>go('templates'),'secondary'));panel.append(controls,status,actions);
  }
  function completeQuest(text){
    const state=read();if(!state)return false;
    // The same daily goal can be acknowledged once; switching goals remains possible.
    if(!state.care.some(x=>dayKey(x.createdAt)===dayKey()&&x.text===text)&&!run(()=>store.care({id:uid(),createdAt:new Date().toISOString(),kind:'quest',text})))return false;
    return true;
  }
  async function shareText(text){
    try{if(navigator.share){await navigator.share({title:'Немного поддержки',text});return;}if(navigator.clipboard){await navigator.clipboard.writeText(text);toast('Карточка скопирована. Выбери, кому её отправить.');return;}}catch(error){if(error.name==='AbortError')return;}
    window.prompt('Скопируй и отправь человеку, которому доверяешь',text);
  }
  function renderSupport(){
    main.append(title('МОЖНО БЫТЬ РЯДОМ','Попросить поддержки','Выбери слова, которые тебе подходят. Отправка — только по твоему действию.'));
    const messages=['Мне сейчас непросто. Можешь немного побыть со мной на связи?','Мне не нужен совет, но очень хочется, чтобы меня выслушали. Есть немного времени?','Хочу поделиться маленькой радостью. Можно тебе написать?'];
    for(const text of messages){const panel=card('',text);panel.append(button('Поделиться карточкой',()=>shareText(text),'secondary'));main.append(panel);}
    main.append(el('p','small muted','Дневник и история состояний в карточку не добавляются. В приложении нет чата и автоматической рассылки.'));
  }
  function voiceInput(input,persist){
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    const wrap=el('div','voice-tools'),status=el('p','small muted');status.setAttribute('role','status');
    if(!Recognition){status.textContent='Чтобы говорить вместо печати, можно использовать микрофон клавиатуры телефона. Встроенное распознавание в этом окне недоступно.';wrap.append(status);return wrap;}
    const control=button('◉ Ввести голосом',async()=>{
      if(recording){recording.stop();return;}
      if(!await confirmAction('Включить голосовой ввод?','Браузер может отправлять аудио своему сервису распознавания. Это отдельная функция браузера. Если не хочешь передавать голос, продолжай печатать.'))return;
      if(!input.isConnected)return;
      try{
        const recognition=new Recognition();recording=recognition;recognition.lang='ru-RU';recognition.continuous=false;recognition.interimResults=false;
        recognition.onresult=event=>{if(!input.isConnected)return;const result=event.results[event.resultIndex][0].transcript;input.value=(input.value+(input.value?' ':'')+result).slice(0,4000);persist(input.value);status.textContent='Текст добавлен. Проверь его перед сохранением.';};
        recognition.onerror=()=>{status.textContent='Не удалось распознать речь. Можно напечатать текст или использовать микрофон клавиатуры.';};
        recognition.onend=()=>{if(recording===recognition){recording=null;clearTimeout(recognitionTimer);}control.textContent='◉ Ввести голосом';};
        recognition.start();control.textContent='■ Остановить запись';status.textContent='Слушаю. Можно остановить в любой момент.';recognitionTimer=setTimeout(()=>recognition.stop(),60000);
      }catch{recording=null;status.textContent='Голосовой ввод недоступен. Продолжай с клавиатуры.';}
    },'text-button');wrap.append(control,status);return wrap;
  }
  return {renderNow,renderTemplates,renderInsights,renderSupport,journalTools,voiceInput,beginPractice,practiceDone,completeQuest,cleanup};
}
