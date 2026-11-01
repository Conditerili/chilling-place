const epictetus='https://classics.mit.edu/Epictetus/epicench.html';
const aristotle='https://classics.mit.edu/Aristotle/nicomachaen.2.ii.html';
const nhs='https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/reframing-unhelpful-thoughts/';
const va='https://www.mirecc.va.gov/MIRECC/visn5/EBT/CBT-SUD/Urge-Surfing.asp';
const shelves={
  'Стоики':[
    ['Одни вещи зависят от нас, другие — нет.','Эпиктет · Энхиридион, § 1',epictetus],
    ['Людей тревожат не сами вещи, а их суждения о вещах.','Эпиктет · Энхиридион, § 5',epictetus]
  ],
  'Духовные традиции':[
    ['Всему своё время.','Екклесиаст 3:1 · иудейская и христианская традиции','https://www.biblegateway.com/passage/?search=Ecclesiastes%203%3A1&version=KJV'],
    ['Когда просят, делись, даже если у тебя самого немного.','Дхаммапада, стих 224 · буддийская традиция','https://accesstoinsight.org/tipitaka/kn/dhp/dhp.17.budd.html']
  ],
  'Философия':[
    ['Тому, что нужно уметь делать, мы учимся, делая это.','Аристотель · Никомахова этика, II, 1',aristotle],
    ['Играя на кифаре, люди становятся кифаристами.','Аристотель · Никомахова этика, II, 1',aristotle]
  ],
  'Психология в быту':[
    ['Друг долго не отвечает. Что мне известно о его дне, а что я сейчас додумываю?','Проверка мысли · по материалам NHS',nhs],
    ['Если бы близкий человек сказал это о себе, какими словами я бы ему ответил?','Смена точки зрения · по материалам NHS',nhs]
  ],
  'Привычки и тяга':[
    ['Когда тянет повторить привычное действие, можно на секунду заметить, где именно в теле ощущается этот позыв.','Наблюдение за позывом · по материалам VA',va],
    ['Позыв можно представить волной. Если хочется, понаблюдай, как меняется одно ощущение: например, напряжение в ладонях.','Образ волны · по материалам VA',va]
  ]
};
export function showLibrary(main){
  main.innerHTML='<p class="eyebrow">ПОЛКА У ОЗЕРА</p><h1>Литература</h1><p>Выбери тему и прочитай одну короткую карточку.</p><div class="moods" role="group" aria-label="Темы"></div><article class="panel reading-card" aria-live="polite"></article><button class="secondary">Следующая карточка →</button>';
  const topics=main.querySelector('.moods'),card=main.querySelector('article');
  let topic=Object.keys(shelves)[0],index=0;
  function paint(){
    const [body,source,url]=shelves[topic][index];
    const quote=Object.keys(shelves).indexOf(topic)<3;
    card.innerHTML='<p class="eyebrow"></p><p class="reading-text"></p><p class="small muted"></p><a target="_blank" rel="noopener noreferrer">Открыть источник ↗</a>';
    card.children[0].textContent=(quote?'Цитата · перевод для подборки':'Практическая заметка')+' · '+(index+1)+' / '+shelves[topic].length;
    card.children[1].textContent=quote?'«'+body+'»':body;
    card.children[2].textContent=source;card.lastElementChild.href=url;
    for(const button of topics.children)button.setAttribute('aria-pressed',String(button.textContent===topic));
  }
  for(const name of Object.keys(shelves)){
    const button=document.createElement('button');button.className='mood';button.textContent=name;
    button.onclick=()=>{topic=name;index=0;paint();};topics.append(button);
  }
  main.querySelector('.secondary').onclick=()=>{index=(index+1)%shelves[topic].length;paint();};paint();
}
function flower(){
  const petals=[0,72,144,216,288].map(angle=>'<path transform="rotate('+angle+')" d="M0 4C-4 0-17-7-12-16Q-9-22-3-19L0-16 3-19Q11-20 12-14C14-5 4 1 0 4Z"/>').join('');
  return '<svg viewBox="-25 -25 50 50" aria-hidden="true"><g fill="#ed9db7" stroke="#ffd7e3" stroke-width=".8">'+petals+'</g><circle r="3.4" fill="#ffdd91"/></svg>';
}
export function showGardenGame(main,leave){
  main.innerHTML='<p class="eyebrow">МИНИ-ИГРЫ</p><h1>Сад на воде</h1><p>Коснись воды, чтобы оставить на ней цветок сакуры. Можно собрать маленький сад или просто посмотреть на озеро.</p><button type="button" class="petal-pond" aria-label="Положить цветок на воду"><span class="pond-moon" aria-hidden="true"></span></button><p class="small muted" role="status">На озере тихо.</p><button class="secondary finish-pond">Завершить прогулку</button>';
  const pond=main.querySelector('.petal-pond'),status=main.querySelector('[role=status]');
  const spots=[[28,69],[61,48],[72,74],[36,38],[48,61]];
  let turns=0;
  pond.onclick=event=>{
    const rect=pond.getBoundingClientRect();
    const [x,y]=event.detail?[100*(event.clientX-rect.left)/rect.width,100*(event.clientY-rect.top)/rect.height]:spots[turns%spots.length];
    const bloom=document.createElement('span');bloom.className='pond-bloom';bloom.setAttribute('aria-hidden','true');
    bloom.style.left=Math.max(9,Math.min(91,x))+'%';bloom.style.top=Math.max(11,Math.min(89,y))+'%';bloom.innerHTML=flower();
    if(pond.children.length>=13)pond.children[1].remove();
    pond.append(bloom);turns++;
    status.textContent=['Цветок лёг на воду.','Рядом появился ещё один цветок.','Можно задержаться на берегу.'][Math.min(turns-1,2)];
  };
  main.querySelector('.finish-pond').onclick=leave;
}
