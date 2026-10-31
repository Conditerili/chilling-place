// Optional Telegram webhook. No tokens are stored in GitHub or sent to the Mini App.
import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export function responseFor(text, appUrl) {
  const command=(text||'').trim().split(/\s/)[0].split('@')[0].toLowerCase();
  const messages={
    '/start':'Привет! Это CHILLING PLACE 🌿\nТвоё место, чтобы выдохнуть. Здесь можно записать мысль, сделать короткую практику или выбрать маленький шаг для себя.\n\nЗаписи хранятся на устройстве. Открой приложение кнопкой ниже.',
    '/help':'В приложении есть три раздела: «Сейчас», «Дневник» и «Практики». История, редактирование и резервные копии — в дневнике и настройках.\n\nЭто самоподдержка, не замена профессиональной помощи. Этот чат не предназначен для экстренных обращений.',
    '/privacy':'Дневник хранится локально в браузере или окне Telegram. В текущей версии записи не отправляются нашему серверу или ИИ. Очистка данных может удалить историю: делай экспорт в настройках.\n\nСообщения этому боту проходят через Telegram и обрабатываются для ответа, но наш обработчик не сохраняет их. Не присылай сюда личные записи.',
    '/settings':'Тему, анимацию, экспорт и удаление записей можно настроить в приложении. Напоминания и синхронизация пока не подключены.'
  };
  return {text:messages[command]||'Я пока помогаю открыть CHILLING PLACE и объясняю, как им пользоваться. Для личных записей открой дневник — этот чат не является ИИ-консультантом.',reply_markup:{inline_keyboard:[[{text:'Открыть CHILLING PLACE 🌿',web_app:{url:appUrl}}]]}};
}
export function createBotServer({token, secret, appUrl, send=async body=>{
  const result=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
  if(!result.ok || !(await result.json()).ok)throw Error('Telegram delivery failed');
}}) {
  if(!token||!secret||secret.length<24)throw Error('Set BOT_TOKEN and WEBHOOK_SECRET (at least 24 characters).');
  if(!appUrl || new URL(appUrl).protocol!=='https:')throw Error('APP_URL must be HTTPS.');
  const delivered=new Map(), pending=new Map();
  return http.createServer(async(req,res)=>{
    const reply=(status,text)=>{res.writeHead(status,{'content-type':'text/plain'});res.end(text);};
    if(req.url==='/health'&&req.method==='GET'){reply(200,'ok');return;}
    if(req.url!=='/telegram/webhook'||req.method!=='POST'){reply(404,'not found');return;}
    const provided=Buffer.from(String(req.headers['x-telegram-bot-api-secret-token']||''));const expected=Buffer.from(secret);
    if(provided.length!==expected.length||!timingSafeEqual(provided,expected)){reply(403,'forbidden');return;}
    let raw='';try{
      for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>65536){reply(413,'too large');return;}}
      let update;try{update=JSON.parse(raw);}catch{reply(400,'invalid json');return;}
      if(!Number.isSafeInteger(update.update_id)){reply(400,'invalid update');return;}
      const message=update.message;
      if(!message || message.chat?.type!=='private' || !Number.isSafeInteger(message.chat?.id)){reply(200,'ignored');return;}
      for(const [id,time] of delivered)if(Date.now()-time>24*60*60*1000)delivered.delete(id);
      if(!delivered.has(update.update_id)){
        if(!pending.has(update.update_id))pending.set(update.update_id,(async()=>{await send({chat_id:message.chat.id,...responseFor(message.text,appUrl)});delivered.set(update.update_id,Date.now());if(delivered.size>10000)delivered.delete(delivered.keys().next().value);})().finally(()=>pending.delete(update.update_id)));
        await pending.get(update.update_id);
      }
      reply(200,'ok');
    }catch{reply(502,'delivery failed');}
  });
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const server=createBotServer({token:process.env.BOT_TOKEN,secret:process.env.WEBHOOK_SECRET,appUrl:process.env.APP_URL||'https://conditerili.github.io/chilling-place/'});
  server.listen(Number(process.env.PORT)||3000,()=>console.log('CHILLING PLACE webhook ready'));
}
