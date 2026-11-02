import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore,KEY,LEGACY_KEY} from '../storage.js';
import {dayKey,weekSummary,patternSummary,recommendations,roomProgress,templates,entryLabels} from '../wellbeing.js';
import {practices} from '../content.js';
function setup(seed={}){const values=new Map(Object.entries(seed));const backend={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};return {store:createStore(backend),backend,values};}
const stamp=day=>new Date(2026,10,day,12).toISOString();
const checkin=(id='m',day=2)=>({id,createdAt:stamp(day),mood:'anxious',emotion:'Беспокойство',contexts:['Работа'],note:'Мой текст'});
const session=(id='s')=>({id,createdAt:stamp(2),practice:'pause',minutes:1,feedback:null});

test('v6 data is read without mutation; adding check-ins retains entries and draft',()=>{
  const original=JSON.stringify({version:2,entries:[{id:'old',thought:'Старая запись'}],draft:{id:'draft',alternative:'Незаконченная мысль'}});
  const {store,values}=setup({[KEY]:original});
  assert.deepEqual(store.read().checkins,[]);assert.equal(values.get(KEY),original);
  store.checkin(checkin());assert.equal(store.read().entries[0].thought,'Старая запись');assert.equal(store.read().draft.alternative,'Незаконченная мысль');
  store.save({id:'new',thought:'Ещё запись',template:'vent'});assert.equal(store.read().checkins.length,1);
});
test('all new history round-trips and repeated restore does not duplicate it',()=>{
  const source=setup().store;source.checkin(checkin());source.session({...session(),feedback:'better'});source.care({id:'q',createdAt:stamp(2),kind:'quest',text:'Вода'});source.draft({id:'draft',nextStep:'Завтра',template:'morning'});
  const target=setup().store;target.import(source.export());target.import(source.export());
  assert.deepEqual(target.read(),source.read());
});
test('check-in/session retries update a single object instead of adding duplicates',()=>{
  const {store}=setup();store.checkin(checkin());store.checkin({...checkin(),note:'Уточнение'});store.session(session());store.session({...session(),feedback:'better'});store.session({...session(),feedback:'same'});
  assert.equal(store.read().checkins.length,1);assert.equal(store.read().checkins[0].note,'Уточнение');assert.equal(store.read().sessions.length,1);assert.equal(store.read().sessions[0].feedback,'same');
});
test('malformed imported history is rejected atomically, including forged enum keys',()=>{
  const {store,backend}=setup();store.checkin(checkin());const before=backend.getItem(KEY);
  const invalid=[{...checkin(),mood:'__proto__'},{...checkin(),emotion:'Радость'},{...checkin(),contexts:['неизвестный тег']},{...checkin(),createdAt:'вчера'},{...checkin(),note:42}];
  for(const value of invalid)assert.throws(()=>store.import(JSON.stringify({version:2,entries:[{thought:'не добавлять'}],checkins:[value]})));
  assert.throws(()=>store.import(JSON.stringify({version:2,entries:[],sessions:[{...session(),feedback:'unknown'}]})));
  assert.equal(backend.getItem(KEY),before);
});
test('quota failure preserves previous mood, practice feedback and journal',()=>{
  const {store,backend}=setup();store.save({thought:'Важно'});store.checkin(checkin());store.session(session());const before=backend.getItem(KEY);
  backend.setItem=()=>{throw Error('quota');};assert.throws(()=>store.session({...session(),feedback:'better'}));assert.throws(()=>store.checkin({...checkin(),note:'new'}));assert.equal(backend.getItem(KEY),before);
});
test('history ID conflicts preserve both versions, repeated import remains idempotent',()=>{
  const {store}=setup();store.checkin(checkin());const incoming=JSON.stringify({version:2,entries:[],checkins:[{...checkin(),note:'Другая версия'}]});store.import(incoming);store.import(incoming);assert.equal(store.read().checkins.length,2);assert.equal(new Set(store.read().checkins.map(x=>x.id)).size,2);
});
test('clearing all history also removes legacy entries; individual removal keeps journal',()=>{
  const {store,values}=setup({[LEGACY_KEY]:JSON.stringify([{thought:'old'}])});store.checkin(checkin());store.session(session());store.removeCheckin('m');store.removeSession('s');assert.equal(store.read().entries.length,1);assert.equal(store.read().checkins.length,0);store.clear();assert.equal(values.size,0);
});
test('all journal templates preserve a last-question-only answer through export',()=>{
  for(const [id,t] of Object.entries(templates)){const source=setup().store,field=t.steps.at(-1)[1];source.save({id:'x',template:id,[field]:'Последний ответ'});const target=setup().store;target.import(source.export());assert.equal(target.read().entries[0][field],'Последний ответ');assert.equal(target.read().entries[0].template,id);assert.equal(entryLabels(id)[field],t.steps.at(-1)[2]);}
});
test('weekly summary starts Monday and excludes the next week and future entries',()=>{
  const {store}=setup();for(const day of [1,2,8,9])store.checkin(checkin('m'+day,day));store.session({...session(),feedback:'better'});
  const week=weekSummary(store.read(),new Date(2026,10,4));assert.equal(dayKey(week.start),'2026-11-02');assert.equal(dayKey(week.end),'2026-11-09');assert.deepEqual(week.checkins.map(x=>x.id),['m2','m8']);assert.equal(week.helpful.pause,1);
  const newYear=weekSummary(store.read(),new Date(2027,0,1));assert.equal(dayKey(newYear.start),'2026-12-28');assert.equal(dayKey(newYear.end),'2027-01-04');
});
test('context observations use distinct days, not repeated taps, and require three days',()=>{
  const values=[checkin('a',2),{...checkin('b',2),createdAt:new Date(2026,10,2,20).toISOString(),mood:'calm',emotion:'Спокойствие'},checkin('c',3)];
  assert.deepEqual(patternSummary(values),[]);values.push({...checkin('d',4),mood:'bright',emotion:'Радость'});
  assert.deepEqual(patternSummary(values),[{context:'Работа',days:3,calm:2}]);
});
test('all suggested practices exist and requested duration is respected',()=>{
  for(const mood of ['calm','anxious','sad','tired','bright','unsure'])for(const duration of [0,1,3,5])for(const id of recommendations(mood,duration)){assert.ok(practices[id]);assert.ok(practices[id].steps.length);if(duration)assert.equal(({pause:1,around:3,grounding:5,breathing:3,rest:1})[id],duration);}
});
test('room rewards care without decay and caps the illustration as history grows',()=>{
  const {store}=setup();assert.equal(roomProgress(store.read()).lit,false);store.session(session());store.save({id:'old',createdAt:'2020-01-01T12:00:00Z',thought:'Старая забота'});assert.equal(roomProgress(store.read()).lit,true);assert.equal(roomProgress(store.read()).leaves,3);for(let i=0;i<25;i++)store.save({id:'x'+i,thought:'запись '+i});assert.equal(roomProgress(store.read()).leaves,8);
});
