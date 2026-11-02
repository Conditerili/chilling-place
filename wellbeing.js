// Shared vocabulary and deterministic suggestions. No network requests or diagnosis.
export const moods = {
  calm: {label:'Спокойно', icon:'◡', tone:'sage', definition:'Есть ощущение опоры; можно немного замедлиться.', emotions:['Спокойствие','Облегчение','Удовлетворение','Благодарность']},
  bright: {label:'Радостно', icon:'☀', tone:'ochre', definition:'Замечаешь удовольствие, интерес или прилив сил.', emotions:['Радость','Интерес','Воодушевление','Надежда']},
  anxious: {label:'Тревожно', icon:'≈', tone:'rose', definition:'Мысли устремлены в возможное будущее; трудно расслабиться.', emotions:['Беспокойство','Напряжение','Страх','Неуверенность']},
  sad: {label:'Грустно', icon:'☂', tone:'blue', definition:'Может хотеться тишины, сочувствия или присутствия близкого.', emotions:['Грусть','Одиночество','Разочарование','Тоска']},
  tired: {label:'Усталость', icon:'☾', tone:'lavender', definition:'Сил стало меньше. Это может быть потребность в отдыхе, даже без грусти.', emotions:['Утомление','Сонливость','Перегрузка','Опустошение']},
  unsure: {label:'Не понимаю', icon:'…', tone:'stone', definition:'Не обязательно сразу находить точное слово. Можно оставить так.', emotions:['Не знаю','Смешанные чувства','Злость','Раздражение']}
};
export const contexts=['Работа','Учёба','Отношения','Сон','Отдых','Прогулка','Без причины'];
export const feedbacks={better:'Стало легче',same:'Без изменений',unsuitable:'Сейчас не подходит',worse:'Стало тяжелее'};
export const templates={
  thought:{label:'Разобрать ситуацию',icon:'↗',description:'Отделить мысль от фактов и найти другой взгляд.',steps:[['Мысль','thought','Что именно тебя беспокоит?',['situation','emotion']],['Факты','facts','Что ты знаешь наверняка, а что предполагаешь?',['against']],['Другой взгляд','alternative','Какой ещё исход возможен?',['nextStep']]]},
  vent:{label:'Выговориться',icon:'✎',description:'Оставить здесь то, что занимает голову.',steps:[['Выдохнуть','thought','Что хочется оставить на этой странице?',[]],['Почувствовать','emotion','Какие чувства стоят за этими словами?',[]],['Поддержать себя','nextStep','Что тебе сейчас нужно?',[]]]},
  good:{label:'Заметить хорошее',icon:'☀',description:'Сохранить один маленький приятный момент.',steps:[['Момент','situation','Что сегодня было хотя бы немного приятным?',[]],['Значение','thought','Почему этот момент важен для тебя?',[]],['С собой','nextStep','Что из этого хочется взять с собой в завтра?',[]]]},
  morning:{label:'Начать день',icon:'↟',description:'Одно намерение, без длинного списка дел.',steps:[['Сейчас','emotion','С каким чувством ты начинаешь день?',[]],['Намерение','thought','Что сегодня хочется сделать для себя?',[]],['Посильный шаг','nextStep','Какой самый маленький шаг поможет начать?',[]]]},
  evening:{label:'Завершить день',icon:'☾',description:'Признать трудное и заметить то, что поддержало.',steps:[['Трудное','situation','Что сегодня было непросто?',[]],['Хорошее','alternative','Что порадовало или поддержало тебя?',[]],['Отпустить','nextStep','Что можно оставить до завтра?',[]]]},
  weekly:{label:'Оглянуться на неделю',icon:'▦',description:'Что было важным, что помогало и чего хочется дальше.',steps:[['Важное','situation','Что было важным на этой неделе?',[]],['Поддержка','alternative','Что тебя поддерживало?',[]],['Дальше','nextStep','Что хочется изменить или сохранить на следующей неделе?',[]]]}
};
export function entryLabels(template='thought') {
  const result={situation:'Что произошло?',thought:'Какая мысль тебя тревожит?',emotion:'Какое чувство ты замечаешь?',facts:'Какие факты поддерживают эту мысль?',against:'Какие факты с ней не совпадают?',alternative:'Как ещё можно посмотреть на ситуацию?',nextStep:'Какой небольшой шаг тебе сейчас по силам?'};
  for(const [,field,question] of (templates[template]||templates.thought).steps)result[field]=question;
  return result;
}
export function dayKey(value=new Date()) {
  const date=value instanceof Date?value:new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function weekBounds(now=new Date()) {
  const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-((start.getDay()+6)%7));
  const end=new Date(start);end.setDate(end.getDate()+7);return {start,end};
}
export function weekSummary(state,now=new Date()) {
  const {start,end}=weekBounds(now);
  const during=x=>{const time=new Date(x.createdAt).getTime();return time>=start.getTime()&&time<end.getTime();};
  const checkins=(state.checkins||[]).filter(during),sessions=(state.sessions||[]).filter(during),entries=state.entries.filter(during);
  const counts=Object.entries(moods).map(([id,value])=>({id,label:value.label,count:checkins.filter(x=>x.mood===id).length})).filter(x=>x.count);
  const helpful={};for(const s of sessions)if(s.feedback==='better')helpful[s.practice]=(helpful[s.practice]||0)+1;
  return {start,end,checkins,sessions,entries,counts,helpful};
}
export function recommendations(mood,minutes=0) {
  const ordered=({anxious:['pause','breathing','grounding'],sad:['pause','around','grounding'],tired:['rest','pause','around'],bright:['around','pause','grounding'],calm:['breathing','around','grounding']})[mood]||['pause','around','rest'];
  const duration={pause:1,around:3,grounding:5,breathing:3,rest:1};
  return ordered.filter(id=>!minutes||duration[id]===Number(minutes));
}
export function patternSummary(checkins) {
  // One last check-in per local day and context prevents frequent logging from dominating.
  const sorted=checkins.slice().sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  const result=[];
  for(const context of contexts){
    const days=new Map();for(const c of sorted)if(c.contexts.includes(context))days.set(dayKey(c.createdAt),c);
    if(days.size<3)continue;
    const calm=[...days.values()].filter(c=>['calm','bright'].includes(c.mood)).length;
    result.push({context,days:days.size,calm});
  }
  return result;
}
export function roomProgress(state) {
  const points=state.entries.length+(state.sessions||[]).length+(state.care||[]).length;
  const leaves=Math.min(8,2+Math.floor(points/2));
  return {points,leaves,lit:(state.sessions||[]).length>0};
}
