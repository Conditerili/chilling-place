// All persistent personal data operations live here. One atomic state, no server.
import {moods,contexts,feedbacks,templates} from './wellbeing.js?v=7.0.0';
export const KEY='chillingPlace.v2';
export const LEGACY_KEY='chillingThoughts';
export const FIELDS=['situation','thought','emotion','facts','against','alternative','nextStep'];
export const uid=()=>globalThis.crypto?.randomUUID?.()||`cp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const fail=message=>{throw new Error(message);};
const score=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=10?Number(v):fail('Оценка должна быть от 0 до 10.'));
const text=(value,max=4000)=>value===undefined?'':typeof value==='string'&&value.length<=max?value:fail('Неверный формат или слишком длинный текст.');
const object=value=>{if(!value||typeof value!=='object'||Array.isArray(value))fail('Неверный формат записи.');return value;};
function identity(value){
  object(value);const id=String(value.id??uid()),createdAt=value.createdAt??new Date().toISOString();
  if(!id||id.length>200||typeof createdAt!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(createdAt)||!Number.isFinite(Date.parse(createdAt)))fail('Неверная дата или идентификатор.');
  return {id,createdAt:new Date(createdAt).toISOString()};
}
export function normalizeEntry(value){
  object(value);
  const entry={id:String(value.id??uid()),createdAt:typeof value.createdAt==='string'?value.createdAt:'',date:typeof value.date==='string'?value.date:'',updatedAt:typeof value.updatedAt==='string'?value.updatedAt:'',anxiety:score(value.anxiety),anxietyAfter:score(value.anxietyAfter),template:value.template??'thought'};
  if(!entry.id||entry.id.length>200)fail('Слишком длинный идентификатор записи.');
  if(!Object.hasOwn(templates,entry.template))fail('Неизвестный шаблон дневника.');
  for(const field of FIELDS){if(value[field]!==undefined&&typeof value[field]!=='string')fail('Неверный формат текста записи.');entry[field]=value[field]||'';}
  return entry;
}
export function normalizeCheckin(value){
  const base=identity(value);
  if(!Object.hasOwn(moods,value.mood))fail('Выбери состояние из списка.');
  const emotion=text(value.emotion,100),selected=value.contexts??[];
  if(emotion&&!moods[value.mood].emotions.includes(emotion))fail('Чувство не соответствует выбранному состоянию.');
  if(!Array.isArray(selected)||selected.length>contexts.length||selected.some(c=>!contexts.includes(c)))fail('Неизвестный контекст состояния.');
  return {...base,mood:value.mood,emotion,contexts:[...new Set(selected)],note:text(value.note)};
}
export function normalizeSession(value){
  const base=identity(value),practice=text(value.practice,50),feedback=value.feedback??null;
  if(!['pause','grounding','around','breathing','rest'].includes(practice)||![1,3,5].includes(value.minutes))fail('Неверная практика или длительность.');
  if(feedback!==null&&!Object.hasOwn(feedbacks,feedback))fail('Неверная оценка практики.');
  return {...base,practice,minutes:value.minutes,feedback};
}
function normalizeCare(value){const base=identity(value);if(value.kind!=='quest')fail('Неизвестный маленький шаг.');return {...base,kind:'quest',text:text(value.text,500)};}
function list(value,normalizer){if(value===undefined)return [];if(!Array.isArray(value)||value.length>10000)fail('Неверный список данных или более 10 000 элементов.');return value.map(normalizer);}
function additions(state){return {checkins:list(state.checkins,normalizeCheckin),sessions:list(state.sessions,normalizeSession),care:list(state.care,normalizeCare)};}
export function createStore(storage){
  const get=key=>{try{return storage.getItem(key);}catch{fail('Хранилище недоступно. Текст остаётся на экране; сохрани его отдельно перед закрытием.');}};
  const parse=raw=>{try{return JSON.parse(raw);}catch{fail('Не удалось прочитать сохранённые данные. Они не удалены. Открой настройки и скачай исходную копию.');}};
  function read(){
    const raw=get(KEY);
    if(raw!==null){const state=parse(raw);if(state?.version!==2||!Array.isArray(state.entries))fail('Неизвестный формат данных. Скачай исходную копию в настройках.');return {version:2,entries:state.entries.map(normalizeEntry),draft:state.draft?normalizeEntry(state.draft):null,...additions(state)};}
    const old=get(LEGACY_KEY),entries=old===null?[]:parse(old);
    if(!Array.isArray(entries))fail('Старые записи имеют неизвестный формат. Исходные данные сохранены.');
    return {version:2,entries:entries.map(normalizeEntry),draft:null,checkins:[],sessions:[],care:[]};
  }
  function write(state){try{storage.setItem(KEY,JSON.stringify(state));}catch{fail('Не удалось сохранить: хранилище недоступно или заполнено. Не закрывай страницу — текст ещё здесь.');}}
  function upsert(key,value,normalizer){const item=normalizer(value),state=read(),index=state[key].findIndex(x=>x.id===item.id);if(index<0){if(state[key].length>=10000)fail('Достигнут предел 10 000 элементов. Сначала сохрани экспорт.');state[key].push(item);}else state[key][index]=item;write(state);return item;}
  return {
    read,
    draft(entry){const state=read();state.draft=entry?normalizeEntry(entry):null;write(state);},
    save(value){
      const entry=normalizeEntry(value);
      if(!FIELDS.some(field=>entry[field].trim()))fail('Ответь хотя бы на один вопрос.');
      if(FIELDS.some(f=>entry[f].length>4000))fail('В одном поле можно сохранить до 4 000 символов. Сократи текст или раздели запись.');
      const state=read(),index=state.entries.findIndex(e=>e.id===entry.id);
      entry.updatedAt=new Date().toISOString();if(!entry.createdAt&&!entry.date)entry.createdAt=entry.updatedAt;
      if(index<0)state.entries.push(entry);else state.entries[index]=entry;
      state.draft=null;write(state);return entry;
    },
    checkin:value=>upsert('checkins',value,normalizeCheckin),
    session:value=>upsert('sessions',value,normalizeSession),
    care:value=>upsert('care',value,normalizeCare),
    removeCheckin(id){const state=read();state.checkins=state.checkins.filter(x=>x.id!==id);write(state);},
    removeSession(id){const state=read();state.sessions=state.sessions.filter(x=>x.id!==id);write(state);},
    remove(id){const state=read();state.entries=state.entries.filter(e=>e.id!==id);if(state.draft?.id===id)state.draft=null;write(state);},
    export(){return JSON.stringify({...read(),app:'CHILLING PLACE',exportedAt:new Date().toISOString()},null,2);},
    raw(){return JSON.stringify({current:get(KEY),legacy:get(LEGACY_KEY)},null,2);},
    import(raw){
      const data=parse(raw),incoming=Array.isArray(data)?data:(data?.version===2&&Array.isArray(data.entries)?data.entries:fail('Нужен JSON-экспорт CHILLING PLACE.'));
      if(incoming.length>5000)fail('Импортируй не более 5 000 записей за один раз.');
      const entries=incoming.map(normalizeEntry),importedDraft=!Array.isArray(data)&&data.draft?normalizeEntry(data.draft):null;
      if(entries.some(e=>FIELDS.some(f=>e[f].length>4000))||importedDraft&&FIELDS.some(f=>importedDraft[f].length>4000))fail('В файле слишком длинное поле. Импорт отменён, существующие записи не изменены.');
      const extra=additions(Array.isArray(data)?{}:data),state=read();let added=0;
      const fingerprint=e=>JSON.stringify([...FIELDS.map(f=>e[f]),e.anxiety,e.anxietyAfter,e.createdAt,e.date,e.template]);
      const known=new Set(state.entries.map(fingerprint));
      for(const entry of entries){if(known.has(fingerprint(entry)))continue;if(state.entries.some(e=>e.id===entry.id))entry.id=uid();state.entries.push(entry);known.add(fingerprint(entry));added++;}
      for(const key of ['checkins','sessions','care']){
        const fingerprint=x=>JSON.stringify(Object.fromEntries(Object.entries(x).filter(([k])=>k!=='id'))),known=new Set(state[key].map(fingerprint));
        for(const item of extra[key]){if(known.has(fingerprint(item)))continue;if(state[key].some(x=>x.id===item.id))item.id=uid();state[key].push(item);known.add(fingerprint(item));}
        if(state[key].length>10000)fail('В объединённой копии более 10 000 элементов. Данные не изменены.');
      }
      if(!state.draft&&importedDraft)state.draft=importedDraft;
      write(state);return added;
    },
    clear(){try{storage.removeItem(LEGACY_KEY);storage.removeItem(KEY);}catch{fail('Не удалось удалить все данные. Попробуй ещё раз или очисти данные сайта в браузере.');}}
  };
}
