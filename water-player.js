export const tracks = [
  [
    "RMCO · Meditation Music № 1",
    "https://soundcloud.com/rmcorelaxingmusic/track-1-963hz"
  ],
  [
    "RMCO · Meditation Music № 2",
    "https://soundcloud.com/rmcorelaxingmusic/track-2-963hz"
  ],
  [
    "RMCO · Meditation Music № 3",
    "https://soundcloud.com/rmcorelaxingmusic/track-3-963hz"
  ],
  [
    "RMCO · Meditation Music № 4",
    "https://soundcloud.com/rmcorelaxingmusic/track-4-963hz"
  ],
  [
    "RMCO · Meditation Music № 5",
    "https://soundcloud.com/rmcorelaxingmusic/track-5-963hz"
  ],
  [
    "Gaia Meditation · Медитация",
    "https://soundcloud.com/gaiameditation/963-hz-meditation"
  ],
  [
    "Flynn Lucas · 963 Hz",
    "https://soundcloud.com/flynnlucas/963-hz"
  ],
  [
    "Meditative Mind · 963 и 285 Гц",
    "https://soundcloud.com/meditative-mind/963-hz-frequency-of-gods-pineal-gland-activator-deep-healing-285-hz-solfeggio-frequency-music"
  ],
  [
    "Gaia Meditation · Soul Healing Frequency",
    "https://soundcloud.com/gaiameditation/963-hz-soul-healing-frequency"
  ],
  [
    "Meditative Mind · Чистый тон",
    "https://soundcloud.com/meditative-mind/963hz-pineal-gland-activator-ultimate-pure-tone-frequency-music"
  ],
  [
    "Healing Vibes · Solfeggio",
    "https://soundcloud.com/healing-vibes-750138827/963-hz-powerful-pure-tone-solfeggio-frequency-activate-pineal-gland-balance-crown-chakra"
  ],
  [
    "Cice Rivera · 963 Hz",
    "https://soundcloud.com/cice-rivera/963-hz-nature-third-eye-activation"
  ],
  [
    "Ana Lola Roman · World’s Not Ending",
    "https://soundcloud.com/analolaroman/963-hz-worlds-not-ending"
  ],
  [
    "Meditative Mind · Бинауральная запись",
    "https://soundcloud.com/meditative-mind/963hz-32hz-brain-waves-gods-own-frequency-binaural-beats-ft-963hz"
  ],
  [
    "Эмбиент · Три частоты",
    "https://www.youtube.com/watch?v=pSOSxUDElek"
  ],
  [
    "Мантра Ом и океан",
    "https://www.youtube.com/watch?v=16ufjpKsjUE"
  ],
  [
    "Лунный лес",
    "https://www.youtube.com/watch?v=-W-HkC1c-kE"
  ],
  [
    "Inner Peace",
    "https://www.youtube.com/watch?v=Vkb5Cg4ArOY"
  ],
  [
    "Хрустальные чаши",
    "https://www.youtube.com/watch?v=B33xdsmJTdE"
  ],
  [
    "Return to Oneness",
    "https://www.youtube.com/watch?v=Pr-7S5ZuNGQ"
  ],
  [
    "Медитация перед сном",
    "https://www.youtube.com/watch?v=HDQfqwhkliY"
  ],
  [
    "Час хэндпана",
    "https://www.youtube.com/watch?v=_TzTpbT4XiQ"
  ],
  [
    "Мандала",
    "https://www.youtube.com/watch?v=7WVE9M_sgv8"
  ],
  [
    "Девять часов звучания",
    "https://www.youtube.com/watch?v=KYDeJ48aQDA"
  ],
  [
    "Pure Miracle Tones · S4T9",
    "https://www.youtube.com/watch?v=uBcKoNCHRh8"
  ],
  [
    "Тибетская чаша",
    "https://www.youtube.com/watch?v=xSBl2vQze7k"
  ],
  [
    "Тибетские звуки",
    "https://www.youtube.com/watch?v=CXbS6zAmQh0"
  ],
  [
    "Тибетская медитация",
    "https://www.youtube.com/watch?v=x8YCS2_RCOo"
  ],
  [
    "Malte Marten · A Prayer to God",
    "https://www.youtube.com/watch?v=aZvt7FqKi2o"
  ],
  [
    "Мелодия дождя",
    "https://www.youtube.com/watch?v=3xHL3n43E10"
  ]
];

export function playerURL(link){
  const source=new URL(link);
  if(source.hostname==='www.youtube.com'){
    return 'https://www.youtube-nocookie.com/embed/'+source.searchParams.get('v')+'?playsinline=1';
  }
  const params=new URLSearchParams({url:link,color:'#d979a0',auto_play:'false',show_artwork:'false',show_user:'true',single_active:'true'});
  return 'https://w.soundcloud.com/player/?'+params;
}

export function attachWaterPlayer(trigger,panel){
  const select=panel.querySelector('select');
  const slot=panel.querySelector('.water-media');
  const source=panel.querySelector('a');
  tracks.forEach(([name],i)=>select.add(new Option((i+1)+' · '+name,i)));
  function showTrack(){
    const [name,link]=tracks[select.selectedIndex];
    const frame=document.createElement('iframe');
    frame.title=name;frame.allow='encrypted-media; autoplay';frame.referrerPolicy='strict-origin-when-cross-origin';
    frame.height=link.includes('youtube.com')?'210':'166';frame.src=playerURL(link);
    slot.replaceChildren(frame);source.href=link;
    source.textContent='Открыть в '+(link.includes('youtube.com')?'YouTube':'SoundCloud')+' ↗';
  }
  function close(){
    slot.replaceChildren();panel.hidden=true;trigger.setAttribute('aria-expanded','false');
    trigger.classList.remove('water-touch');trigger.focus({preventScroll:true});
  }
  trigger.onclick=()=>{
    if(!panel.hidden){close();return;}
    trigger.classList.remove('water-touch');void trigger.offsetWidth;trigger.classList.add('water-touch');
    panel.hidden=false;trigger.setAttribute('aria-expanded','true');showTrack();
  };
  select.onchange=showTrack;
  panel.querySelector('.water-close').onclick=close;
}
