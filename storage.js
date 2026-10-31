// All persistent journal operations live here. Screens never write localStorage directly.
export const KEY = 'chillingPlace.v2';
export const LEGACY_KEY = 'chillingThoughts';
export const FIELDS = ['situation','thought','emotion','facts','against','alternative','nextStep'];
export const uid = () => globalThis.crypto?.randomUUID?.() || `cp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const fail = message => { throw new Error(message); };
const score = v => v === null || v === undefined || v === '' ? null : (Number.isFinite(Number(v)) && Number(v)>=0 && Number(v)<=10 ? Number(v) : fail('Оценка должна быть от 0 до 10.'));
export function normalizeEntry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Неверный формат записи.');
  const entry = { id: String(value.id ?? uid()), createdAt: typeof value.createdAt==='string' ? value.createdAt : '', date: typeof value.date==='string' ? value.date : '', updatedAt: typeof value.updatedAt==='string' ? value.updatedAt : '', anxiety:score(value.anxiety), anxietyAfter:score(value.anxietyAfter) };
  if (entry.id.length>200) fail('Слишком длинный идентификатор записи.');
  for (const field of FIELDS) {
    if (value[field] !== undefined && typeof value[field] !== 'string') fail('Неверный формат текста записи.');
    entry[field] = value[field] || '';
  }
  return entry;
}
export function createStore(storage) {
  const get = key => { try { return storage.getItem(key); } catch { fail('Хранилище недоступно. Текст остаётся на экране; сохрани его отдельно перед закрытием.'); } };
  const parse = raw => { try { return JSON.parse(raw); } catch { fail('Не удалось прочитать сохранённые данные. Они не удалены. Открой настройки и скачай исходную копию.'); } };
  function read() {
    const raw = get(KEY);
    if (raw !== null) {
      const state = parse(raw);
      if (state?.version !== 2 || !Array.isArray(state.entries)) fail('Неизвестный формат данных. Скачай исходную копию в настройках.');
      return { version:2, entries:state.entries.map(normalizeEntry), draft:state.draft ? normalizeEntry(state.draft) : null };
    }
    const old = get(LEGACY_KEY);
    const entries = old === null ? [] : parse(old);
    if (!Array.isArray(entries)) fail('Старые записи имеют неизвестный формат. Исходные данные сохранены.');
    // Migration is non-destructive: the old key remains untouched until explicit deletion.
    return {version:2, entries:entries.map(normalizeEntry), draft:null};
  }
  function write(state) {
    try { storage.setItem(KEY, JSON.stringify(state)); }
    catch { fail('Не удалось сохранить: хранилище недоступно или заполнено. Не закрывай страницу — текст ещё здесь.'); }
  }
  return {
    read,
    draft(entry) { const state=read(); state.draft=entry ? normalizeEntry(entry) : null; write(state); },
    save(value) {
      const entry=normalizeEntry(value);
      if (!entry.situation.trim() && !entry.thought.trim()) fail('Опиши ситуацию или мысль — достаточно одного поля.');
      if (FIELDS.some(f=>entry[f].length>4000)) fail('В одном поле можно сохранить до 4 000 символов. Сократи текст или раздели запись.');
      const state=read(); const index=state.entries.findIndex(e=>e.id===entry.id);
      entry.updatedAt=new Date().toISOString();
      if (!entry.createdAt && !entry.date) entry.createdAt=entry.updatedAt;
      if(index<0) state.entries.push(entry); else state.entries[index]=entry;
      state.draft=null; write(state); return entry;
    },
    remove(id) { const state=read(); state.entries=state.entries.filter(e=>e.id!==id); if(state.draft?.id===id)state.draft=null; write(state); },
    export() { return JSON.stringify({...read(), app:'CHILLING PLACE', exportedAt:new Date().toISOString()},null,2); },
    raw() { return JSON.stringify({current:get(KEY), legacy:get(LEGACY_KEY)},null,2); },
    import(text) {
      const data=parse(text);
      const incoming=Array.isArray(data) ? data : (data?.version===2 && Array.isArray(data.entries) ? data.entries : fail('Нужен JSON-экспорт CHILLING PLACE.'));
      if(incoming.length>5000)fail('Импортируй не более 5 000 записей за один раз.');
      const entries=incoming.map(normalizeEntry);
      const importedDraft=!Array.isArray(data) && data.draft ? normalizeEntry(data.draft) : null;
      if(entries.some(e=>FIELDS.some(f=>e[f].length>4000)))fail('В файле есть поле длиннее 4 000 символов. Импорт отменён, существующие записи не изменены.');
      if(importedDraft && FIELDS.some(f=>importedDraft[f].length>4000))fail('В черновике слишком длинное поле. Импорт отменён.');
      const state=read(); let added=0;
      const fingerprint=e=>JSON.stringify([...FIELDS.map(f=>e[f]),e.anxiety,e.anxietyAfter,e.createdAt,e.date]);
      const known=new Set(state.entries.map(fingerprint));
      for(const entry of entries) {
        if(known.has(fingerprint(entry)))continue;
        if(state.entries.some(e=>e.id===entry.id))entry.id=uid();
        state.entries.push(entry);known.add(fingerprint(entry));added++;
      }
      if(!state.draft && importedDraft)state.draft=importedDraft;
      write(state);return added;
    },
    clear() {
      // Delete the legacy copy first; preserve v2 if this operation fails.
      try { storage.removeItem(LEGACY_KEY); storage.removeItem(KEY); }
      catch { fail('Не удалось удалить все данные. Попробуй ещё раз или очисти данные сайта в браузере.'); }
    }
  };
}
