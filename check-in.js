// The selections describe the user's own report. They are not a clinical scale.
export const questions = [
  ['mood','Настроение','Как чаще ощущался эмоциональный фон за последние семь дней?',['В основном ровно','Заметно менялся','Чаще было тяжело'],'Можно отметить время дня, когда становилось немного легче.'],
  ['worry','Беспокойство','Насколько беспокойство отвлекало тебя от того, что ты делал?',['Почти не отвлекало','Иногда перехватывало внимание','Часто было трудно переключиться'],'Можно взять одну тревожную мысль и разобрать её в дневнике.'],
  ['sleep','Сон','Хватало ли тебе сна, чтобы чувствовать себя отдохнувшим?',['Обычно хватало','В некоторые дни не хватало','Большую часть недели не хватало'],'Запиши один вечер и следующее утро: когда удалось отдохнуть и что этому помогло.'],
  ['energy','Силы','Сколько сил оставалось на обычные дела?',['Обычно достаточно','На часть дел хватало','Даже на привычное было мало сил'],'Какое дело сегодня можно упростить или передать другому?'],
  ['body','Напряжение','Мешало ли телесное напряжение отдыхать?',['Почти нет','Иногда мешало','Часто мешало'],'Если удобно, найди положение, в котором телу чуть легче.'],
  ['focus','Внимание','Как получалось сосредоточиться на одном занятии?',['В основном получалось','Иногда терялась нить','Почти всё давалось с трудом'],'Выбери одно короткое дело и убери на это время один отвлекающий сигнал.'],
  ['interest','Интерес','Получалось ли почувствовать интерес к тому, что обычно нравится?',['Да, как обычно','Реже обычного','Почти не получалось'],'Можно вспомнить одно занятие, которое раньше нравилось, и решить, хочется ли уделить ему пару минут.'],
  ['routine','Повседневные дела','Насколько переживания мешали твоему обычному дню?',['Почти не мешали','Некоторые дела пришлось менять','Часто мешали самым обычным делам'],'Подумай, с каким конкретным делом сегодня пригодилась бы помощь.'],
  ['thoughts','Повторяющиеся мысли','Было ли трудно остановить мысленное прокручивание одной ситуации?',['Редко или не было','Иногда застревал на мысли','Часто возвращался к ней против желания'],'Попробуй записать один известный факт и один вопрос, на который пока нет ответа.'],
  ['rest','Отдых','Получалось ли сделать паузу, когда она была нужна?',['Обычно да','Иногда','Почти никогда'],'Где сегодня поместится короткая пауза без обязательных дел?'],
  ['contact','Поддержка','Если хотелось поговорить, был ли кто-то доступен?',['Да, было к кому обратиться','Не всегда было удобно обратиться','Мне не хватало такого человека'],'Можно заранее выбрать, кому и каким способом было бы легче написать.'],
  ['next','Твой выбор','Что сейчас было бы для тебя наиболее уместно?',['Побыть в тишине','Записать одну мысль','Поговорить с человеком'],'']
];
const nextSteps=['Выбрана тишина. Можно закрыть экран и дать себе несколько спокойных минут.','Выбрана запись. Вернись к третьему вопросу и запиши то, что сейчас важно.','Выбран разговор. Можно начать так: «У тебя есть немного времени меня выслушать?»'];
export function assess(answers){
  const answered=[],load=[],mixed=[],resources=[];
  for(const [id,topic,,choices,hint] of questions){
    const n=answers[id];
    if(!Number.isInteger(n)||n<0||n>=choices.length)continue;
    const item={topic,answer:choices[n],hint};answered.push(item);
    if(id!=='next')(n===2?load:n===1?mixed:resources).push(item);
  }
  return {answered,load,mixed,resources,next:nextSteps[answers.next]||''};
}
export function startCheckup(main,state,leave){
  function button(label,handler,style='secondary'){
    const b=document.createElement('button');b.type='button';b.className=style;b.textContent=label;b.onclick=handler;return b;
  }
  function node(tag,text){const el=document.createElement(tag);el.textContent=text;return el;}
  function paint(){
    main.replaceChildren();const panel=document.createElement('section');panel.className='panel';main.append(panel);
    const add=(tag,text)=>panel.append(node(tag,text));
    if(state.step===questions.length){
      const result=assess(state.answers);
      add('h1','Твой чекап');add('p','Ответов: '+result.answered.length+' из 12. Это описание твоих отметок за неделю. Клинические выводы по нему сделать нельзя.');
      if(!result.answered.length)add('p','Пока нечего оценивать. Можно вернуться к вопросам или продолжить дневник.');
      for(const [label,items] of [['Что особенно мешало',result.load],['Что было по-разному',result.mixed],['На что можно опереться',result.resources]]){
        if(!items.length)continue;
        add('h2',label);const list=document.createElement('ul');
        for(const item of items)list.append(node('li',item.topic+' — '+item.answer));panel.append(list);
      }
      const first=result.load[0]||result.mixed[0];
      if(first){add('h2','Идея на сегодня');add('p',first.hint);}
      if(result.next)add('p',result.next);
      if(state.answers.routine===2)add('p','Ты отметил, что переживания часто мешают обычным делам. Если это продолжается, можно обсудить происходящее со специалистом.');
      panel.append(button('Пересмотреть ответы',()=>{state.step=0;paint();}),button('К третьему вопросу дневника',leave,'primary'));
    }else{
      const [id,,prompt,choices]=questions[state.step];
      add('p','Чекап · '+(state.step+1)+' / '+questions.length);
      add('h1',prompt);
      add('p','Ориентируйся на последние семь дней. Любой вопрос можно пропустить.');
      const group=document.createElement('div');group.className='checkup-options';
      for(const [n,label] of choices.entries()){
        const choice=button(label,()=>{state.answers[id]=n;for(const [i,b] of [...group.children].entries())b.setAttribute('aria-pressed',String(i===n));});
        choice.setAttribute('aria-pressed',String(state.answers[id]===n));group.append(choice);
      }
      panel.append(group);
      const controls=document.createElement('div');controls.className='actions';
      if(state.step>0)controls.append(button('Назад',()=>{state.step--;paint();}));
      const advance=()=>{state.step++;paint();};
      controls.append(button('Пропустить',()=>{delete state.answers[id];advance();}),button(state.step===11?'Посмотреть итог':'Далее',advance,'primary'));
      panel.append(controls,button('Вернуться в дневник',leave,'text-button'));
    }
    main.focus({preventScroll:true});window.scrollTo(0,0);
  }
  paint();
}
