(function(){
'use strict';

/* ===== Utilidades ===== */
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var E=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var R=function(s){return E(s).replace(/\*([^*\n]+)\*/g,'<span class="glow">$1</span>').replace(/\n/g,'<br>')};
var lines=function(s){return String(s||'').split('\n').map(function(x){return x.trim()}).filter(Boolean)};
var uid=function(){return Math.random().toString(36).slice(2,9)};
var clone=function(o){return JSON.parse(JSON.stringify(o))};
function h(tag,props){
  var e=document.createElement(tag),k,v,kids=[].slice.call(arguments,2);
  for(k in (props||{})){v=props[k];if(v==null||v===false)continue;
    if(k==='class')e.className=v;
    else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),v);
    else if(k==='value')e.value=v;
    else if(k==='checked')e.checked=!!v;
    else e.setAttribute(k,v===true?'':v);}
  (function add(list){list.forEach(function(c){if(c==null||c===false)return;if(Array.isArray(c))return add(c);e.appendChild(c.nodeType?c:document.createTextNode(c))})})(kids);
  return e;
}

var DEFAULT_LOGO='%%LOGO%%';
var ACCENTS=[['naranja','Naranja','#FF7A1A'],['azul','Azul','#2E8BFF'],['morado','Morado','#A35BFF'],['amarillo','Amarillo','#FFD21F'],['verde','Verde','#2ED47A'],['rosa','Rosa','#FF5FA2']];
var ACC={};ACCENTS.forEach(function(a){ACC[a[0]]=a[2]});
var LS='taber-slides-studio:v1';
var RICH='Pon el texto entre *asteriscos* para resaltarlo con color.';

/* ===== Motor de presentación (se usa en la vista previa, al presentar y dentro del HTML descargado) ===== */
function createRuntime(deck,o){
  o=o||{};
  var win=window,doc=document;
  var stage=deck.querySelector('.stage');
  var slides=[],cur=0,auto=false,aT=0,rT=0,cT=0,iT=0,hT=0,offs=[],ro=null;
  var DUR=(o.autoSeconds||12)*1000;
  var TOUCH=('ontouchstart' in win)||(navigator.maxTouchPoints>0);
  function q(s){return deck.querySelector(s)}
  function qa(s){return [].slice.call(deck.querySelectorAll(s))}
  function pad(n){return (n<10?'0':'')+n}
  function on(t,ev,fn,opt){t.addEventListener(ev,fn,opt);offs.push(function(){t.removeEventListener(ev,fn,opt)})}
  function fit(){
    var w=o.useWindow?win.innerWidth:deck.clientWidth,hh=o.useWindow?win.innerHeight:deck.clientHeight;
    var k=Math.min(w/1920,hh/1080)||1;
    stage.style.left=((w-1920*k)/2)+'px';stage.style.top=((hh-1080*k)/2)+'px';stage.style.transform='scale('+k+')';
  }
  function rotorReset(){qa('.rotor').forEach(function(r){var s=r.children,i;for(i=0;i<s.length;i++)s[i].className='';if(s[0])s[0].className='on'})}
  function rotorTick(){qa('.slide.active .rotor').forEach(function(r){
    var s=[].slice.call(r.children),i=0;if(s.length<2)return;
    s.forEach(function(x,j){if(x.className==='on')i=j});
    var n=(i+1)%s.length;s[i].className='out';
    s.forEach(function(x,j){if(j!==n&&j!==i)x.className=''});s[n].className='on';})}
  function target(c){
    var m=/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(c.getAttribute('data-target')||'');
    return m?new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5]).getTime():NaN;
  }
  function cdTick(){qa('.countdown').forEach(function(c){
    var t=target(c),d=isNaN(t)?0:Math.max(0,t-Date.now());
    var D=c.querySelector('.cd-d'),H=c.querySelector('.cd-h'),M=c.querySelector('.cd-m');
    if(D)D.textContent=Math.floor(d/864e5);if(H)H.textContent=pad(Math.floor(d/36e5)%24);if(M)M.textContent=pad(Math.floor(d/6e4)%60);})}
  function hint(t){var e=q('.hint');if(!e)return;e.textContent=t;e.classList.remove('hide');clearTimeout(hT);hT=setTimeout(function(){e.classList.add('hide')},4500)}
  function restartAuto(){
    clearTimeout(aT);var b=q('.autobar');
    if(b){b.style.transition='none';b.style.transform='scaleX(0)'}
    if(!auto)return;
    if(b){void b.offsetWidth;b.style.transition='transform '+DUR+'ms linear';b.style.transform='scaleX(1)'}
    aT=setTimeout(next,DUR);
  }
  function apply(){
    var s=slides[cur];if(!s)return;
    slides.forEach(function(x,i){if(i===cur)x.classList.add('active');else x.classList.remove('active')});
    deck.setAttribute('data-acc',s.getAttribute('data-acc')||deck.getAttribute('data-base')||'naranja');
    var c=q('.count');if(c)c.textContent=pad(cur+1)+' / '+pad(slides.length);
    var p=q('.progress');if(p)p.style.transform='scaleX('+((cur+1)/slides.length)+')';
    rotorReset();cdTick();
    if(o.hash){try{history.replaceState(null,'','#'+(cur+1))}catch(e){}}
    restartAuto();
  }
  function show(i){if(!slides.length)return;cur=(i+slides.length)%slides.length;apply()}
  function next(){show(cur+1)}
  function prev(){show(cur-1)}
  function btn(a,pressed){var b=q('.hud [data-a="'+a+'"]');if(b)b.setAttribute('aria-pressed',pressed?'true':'false')}
  function toggleBlack(){var v=!deck.classList.contains('black');if(v)deck.classList.add('black');else deck.classList.remove('black');btn('black',v)}
  function setLite(v){if(v)deck.classList.add('lite');else deck.classList.remove('lite');btn('lite',v)}
  function toggleAuto(){auto=!auto;btn('auto',auto);restartAuto()}
  function full(){
    var el=o.fsEl||doc.documentElement,fe=doc.fullscreenElement||doc.webkitFullscreenElement;
    var rq=el.requestFullscreen||el.webkitRequestFullscreen,ex=doc.exitFullscreen||doc.webkitExitFullscreen;
    try{
      if(!fe){if(!rq){hint('Usa la pantalla completa del sistema');return}
        var r=rq.call(el);if(r&&r.catch)r.catch(function(){hint('Este equipo no permite pantalla completa desde aquí')})}
      else if(ex)ex.call(doc);
    }catch(e){}
  }
  function act(a){
    if(a==='prev')prev();else if(a==='next')next();else if(a==='auto')toggleAuto();
    else if(a==='black')toggleBlack();else if(a==='lite')setLite(!deck.classList.contains('lite'));else if(a==='full')full();
  }
  function collect(){slides=qa('.slide')}

  collect();fit();
  setLite(TOUCH||!!o.lite);
  qa('.hud [data-a]').forEach(function(b){on(b,'click',function(e){e.stopPropagation();act(b.getAttribute('data-a'))})});
  if(o.useWindow){on(win,'resize',fit);on(win,'orientationchange',function(){setTimeout(fit,250)});if(win.visualViewport)on(win.visualViewport,'resize',fit)}
  else if(win.ResizeObserver){ro=new win.ResizeObserver(fit);ro.observe(deck)}
  else on(win,'resize',fit);
  if(o.keys)on(win,'keydown',function(e){
    var k=e.key;
    if(e.target&&e.target.closest&&e.target.closest('button')&&(k===' '||k==='Enter'))return;
    if(['ArrowRight','ArrowDown','PageDown',' ','Enter','n','N'].indexOf(k)>=0){e.preventDefault();if(deck.classList.contains('black'))toggleBlack();else next()}
    else if(['ArrowLeft','ArrowUp','PageUp','Backspace','p','P'].indexOf(k)>=0){e.preventDefault();prev()}
    else if(k==='Home')show(0);else if(k==='End')show(slides.length-1);
    else if(k==='f'||k==='F')full();
    else if(k==='b'||k==='B'||k==='.')toggleBlack();
    else if(k==='l'||k==='L')act('lite');
    else if(k==='a'||k==='A')toggleAuto();
    else if(k==='Escape'&&o.onExit)o.onExit();
  });
  if(o.click)on(deck,'click',function(e){
    if(e.target.closest&&e.target.closest('.hud'))return;
    if(deck.classList.contains('black')){toggleBlack();return}
    var r=deck.getBoundingClientRect();if(e.clientX-r.left<r.width*.28)prev();else next();
  });
  if(o.swipe){var tx=null;
    on(deck,'touchstart',function(e){tx=e.touches[0].clientX},{passive:true});
    on(deck,'touchend',function(e){if(tx===null)return;var dx=e.changedTouches[0].clientX-tx;tx=null;if(Math.abs(dx)>50){if(dx<0)next();else prev()}},{passive:true});
  }
  if(o.idle){
    var els=[deck];if(o.idleEl)els.push(o.idleEl);
    var wake=function(){els.forEach(function(x){x.classList.remove('idle')});clearTimeout(iT);iT=setTimeout(function(){els.forEach(function(x){x.classList.add('idle')})},2600)};
    on(win,'mousemove',wake);on(win,'touchstart',wake,{passive:true});wake();
  }
  if(o.wake){try{if(navigator.wakeLock)navigator.wakeLock.request('screen').catch(function(){})}catch(e){}}
  rT=setInterval(rotorTick,2800);cT=setInterval(cdTick,15000);
  show(o.start||0);
  if(TOUCH&&q('.hint'))hint('Toca a la derecha para avanzar y a la izquierda para regresar');
  else if(q('.hint'))hint('→ o espacio para avanzar · A automático · F pantalla completa · B pantalla negra');

  return {
    fit:fit,show:show,next:next,prev:prev,
    refresh:function(){collect();show(Math.min(cur,Math.max(0,slides.length-1)))},
    destroy:function(){clearInterval(rT);clearInterval(cT);clearTimeout(aT);clearTimeout(iT);clearTimeout(hT);if(ro)ro.disconnect();offs.forEach(function(f){f()});offs=[]}
  };
}

/* ===== Tipos de diapositiva (plantillas) ===== */
function bg(src,cls){return src?'<div class="bg '+(cls||'')+'" aria-hidden="true"><img src="'+E(src)+'" alt=""></div>':''}
function nextWeek(){var d=new Date();d.setDate(d.getDate()+7);d.setHours(17,0,0,0);var p=function(n){return (n<10?'0':'')+n};return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T17:00'}
function szv(d,name,map){var v=map[d.size||'l'];return '--'+name+':'+v+'px'}
var MEGA={l:168,m:128,s:96},TITLE={l:104,m:84,s:66},SUB={l:84,m:68,s:54},VS={l:58,m:48,s:40};
var SIZE_F={k:'size',t:'select',label:'Tamaño del texto',options:[['l','Grande'],['m','Mediano'],['s','Pequeño']]};
var FIT_F={k:'fit',t:'select',label:'Cómo se ve la imagen',options:[['cover','Llenar el espacio (puede recortar)'],['contain','Mostrar completa (sin recortar)']]};
var SOCIAL={instagram:'IG',tiktok:'TT',facebook:'FB',youtube:'YT',whatsapp:'WA',spotify:'SP',twitter:'X',x:'X',telegram:'TG'};

var TYPES={
  bienvenida:{name:'Bienvenida con saludos',desc:'Título grande y frases que cambian solas para invitar a saludarse.',eyebrow:'Alabanza de bienvenida',accent:'amarillo',cls:'center',
    def:function(){return {kicker:'Bienvenidos a la casa de Dios',title:'¡Vamos a\n*saludarnos!*',frases:'Saluda a quien tienes a la par\n¡Dale un abrazo a tu hermano!\nBusca a alguien que no conozcas\n¡Dile: «Qué bueno que viniste»!',size:'l',bg:null}},
    fields:[{k:'kicker',t:'text',label:'Texto pequeño de arriba'},{k:'title',t:'area',rows:2,label:'Título',help:RICH},{k:'frases',t:'area',rows:4,label:'Frases que van cambiando',help:'Una frase por línea.'},SIZE_F,{k:'bg',t:'image',label:'Foto de fondo (opcional)'}],
    render:function(d){return bg(d.bg)+(d.kicker?'<div class="t-label in" style="--i:0">'+E(d.kicker)+'</div>':'')+'<h1 class="t-mega in" style="--i:1;margin-top:26px;'+szv(d,'mega',MEGA)+'">'+R(d.title)+'</h1><div class="rotor t-big in" style="--i:2;margin-top:50px">'+lines(d.frases).map(function(l){return '<span>'+E(l)+'</span>'}).join('')+'</div>'}},

  mensaje:{name:'Mensaje grande',desc:'Una frase o título que ocupa toda la pantalla. Sirve para "¿Es tu primera vez?" o "Esta es tu iglesia".',eyebrow:'Bienvenido a casa',accent:'',cls:'center',
    def:function(){return {kicker:'',title:'Esta es\ntu iglesia',sub:'hasta que *Cristo venga*',size:'l',bg:null}},
    fields:[{k:'kicker',t:'text',label:'Texto pequeño de arriba (opcional)'},{k:'title',t:'area',rows:3,label:'Mensaje',help:RICH},{k:'sub',t:'text',label:'Línea de abajo (opcional)'},SIZE_F,{k:'bg',t:'image',label:'Foto de fondo (opcional)'}],
    render:function(d){return bg(d.bg)+(d.kicker?'<div class="t-label in" style="--i:0">'+E(d.kicker)+'</div>':'')+'<h1 class="t-mega in" style="--i:1;margin-top:20px;'+szv(d,'mega',MEGA)+'">'+R(d.title)+'</h1>'+(d.sub?'<p class="t-big t-sub in" style="--i:2;margin-top:40px;'+szv(d,'sub',SUB)+'">'+R(d.sub)+'</p>':'')}},

  evento:{name:'Anuncio con foto',desc:'Un evento con título, datos, hora destacada y una foto o afiche.',eyebrow:'Próximo evento',accent:'',cls:'',
    def:function(){return {label:'Próximo evento',title:'Nombre del\nevento',facts:'Lugar\nFecha',badge:'Hora · 6:00 a.m.',size:'l',img:null,fit:'cover'}},
    fields:[{k:'label',t:'text',label:'Texto pequeño de arriba'},{k:'title',t:'area',rows:2,label:'Título',help:RICH},{k:'facts',t:'area',rows:3,label:'Datos (uno por línea)',help:'Lugar, fecha, quién invita…'},{k:'badge',t:'text',label:'Etiqueta destacada (opcional)',ph:'Hora de salida · 6:00 a.m.'},SIZE_F,{k:'img',t:'image',label:'Foto o afiche (opcional)'},FIT_F],
    render:function(d){
      var facts=lines(d.facts).map(function(f,i){return '<div class="fact in" style="--i:'+(i+3)+'"><div class="dia"></div>'+E(f)+'</div>'}).join('');
      return '<div class="mdf'+(d.img?'':' noimg')+'"><div class="col">'+(d.label?'<div class="t-label in" style="--i:0">'+E(d.label)+'</div>':'')
        +'<h2 class="t-title in" style="--i:1;margin-top:14px;'+szv(d,'title',TITLE)+'">'+R(d.title)+'</h2>'
        +(facts?'<div class="facts">'+facts+'</div>':'')+(d.badge?'<div class="depart in" style="--i:6">'+E(d.badge)+'</div>':'')+'</div>'
        +(d.img?'<div class="shot kb in'+(d.fit==='contain'?' art':'')+'" style="--i:2"><img src="'+E(d.img)+'" alt=""></div>':'')+'</div>'}},

  agenda:{name:'Cultos y horarios',desc:'Tarjetas con día, nombre y hora. Caben de 1 a 12.',eyebrow:'Cultos de la semana',accent:'',cls:'',
    def:function(){return {title:'Nuestros *cultos*',items:[{dia:'Viernes',nombre:'Noche de oración',hora:'6:00 p.m.'},{dia:'Sábado',nombre:'Nombre del culto',hora:'5:00 p.m.'},{dia:'Domingo',nombre:'Devocional',hora:'9:00 a.m.'}]}},
    fields:[{k:'title',t:'text',label:'Título',help:RICH},{k:'items',t:'list',label:'Cultos',itemLabel:'Culto',blank:{dia:'',nombre:'',hora:''},cols:[{k:'dia',label:'Día',ph:'Domingo'},{k:'nombre',label:'Nombre',ph:'Familias en victoria'},{k:'hora',label:'Hora',ph:'4:00 p.m.'}]}],
    render:function(d){
      var items=(d.items||[]).filter(function(x){return x.dia||x.nombre||x.hora}),n=items.length||1;
      var c=n<=3?{cols:n,evs:1,stack:1}:n===4?{cols:2,evs:.9}:n<=6?{cols:3,evs:.78}:n<=9?{cols:3,evs:.6}:{cols:4,evs:.5};
      var cards=items.map(function(it,i){
        var hr=(it.hora||'').trim(),m=/^(\d{1,2}[:.]\d{2})\s*(.*)$/.exec(hr);
        var time=hr?(m?E(m[1])+'<small>'+E(m[2])+'</small>':E(hr)):'';
        return '<article class="glass ev in'+(c.stack?' stack':'')+'" style="--i:'+(i+2)+'"><div class="top"><div class="day"><div class="dia"></div><b>'+E(it.dia)+'</b></div>'+(time?'<div class="time">'+time+'</div>':'')+'</div><h3>'+E(it.nombre)+'</h3></article>'}).join('');
      return '<h2 class="t-title in" style="--i:0">'+R(d.title)+'</h2><div class="week" style="--cols:'+c.cols+';--evs:'+c.evs+'">'+cards+'</div>'}},

  menu:{name:'Tarjetas con listas',desc:'Columnas con un título y varias líneas. Ideal para la cafetería o una lista de materiales.',eyebrow:'Cafetería',accent:'',cls:'',
    def:function(){return {title:'Cafetería',cols:[{titulo:'Miércoles',items:'Papas fritas\nEnchiladas\nPastelitos'},{titulo:'Viernes',items:'Pupusas'},{titulo:'Domingo a.m.',items:'Desayunos\nPan cakes\nPanes\nPupusas'}]}},
    fields:[{k:'title',t:'text',label:'Título',help:RICH},{k:'cols',t:'list',label:'Columnas',itemLabel:'Columna',blank:{titulo:'',items:''},cols:[{k:'titulo',label:'Título de la columna',ph:'Miércoles'},{k:'items',label:'Lista (una por línea)',t:'area',rows:4}]}],
    render:function(d){
      var cols=(d.cols||[]).filter(function(x){return x.titulo||x.items}),n=Math.min(4,cols.length||1),evs=n<=3?1:.78;
      return '<h2 class="t-title in" style="--i:0">'+R(d.title)+'</h2><div class="week cafe" style="--cols:'+n+';--evs:'+evs+'">'
        +cols.slice(0,4).map(function(c,i){return '<article class="glass ev in" style="--i:'+(i+2)+'"><div class="day"><div class="dia"></div><b>'+E(c.titulo)+'</b></div><ul class="menu">'+lines(c.items).map(function(x){return '<li>'+E(x)+'</li>'}).join('')+'</ul></article>'}).join('')+'</div>'}},

  fecha:{name:'Fecha y hora',desc:'Un día especial con el nombre enorme, la hora y un detalle. Con foto de fondo si quieres.',eyebrow:'Día especial',accent:'',cls:'center',
    def:function(){return {label:'Sábado 31 de octubre',title:'Día *obrero*',hora:'3:00 p.m.',detalle:'Limpieza a la comunidad',size:'l',bg:null}},
    fields:[{k:'label',t:'text',label:'Fecha (texto pequeño de arriba)'},{k:'title',t:'area',rows:2,label:'Título',help:RICH},{k:'hora',t:'text',label:'Hora'},{k:'detalle',t:'text',label:'Detalle'},SIZE_F,{k:'bg',t:'image',label:'Foto de fondo (opcional)'}],
    render:function(d){return bg(d.bg)+(d.label?'<div class="t-label in" style="--i:0">'+E(d.label)+'</div>':'')+'<h1 class="t-mega in" style="--i:1;margin-top:20px;'+szv(d,'mega',MEGA)+'">'+R(d.title)+'</h1>'
      +((d.hora||d.detalle)?'<div style="display:flex;gap:30px;align-items:center;margin-top:54px;flex-wrap:wrap">'+(d.hora?'<div class="depart in" style="--i:3;margin:0">'+E(d.hora)+'</div>':'')+(d.detalle?'<div class="glass in" style="--i:4;padding:26px 44px"><span class="t-big">'+E(d.detalle)+'</span></div>':'')+'</div>':'')}},

  cifra:{name:'Cifra grande',desc:'Un número o precio enorme con su título. Para rifas, metas de ofrenda, boletos.',eyebrow:'Gran rifa',accent:'',cls:'',
    def:function(){return {label:'Gran rifa',title:'Vajilla de\n*cerámica*',fact:'Domingo 1 de noviembre',valor:'$1',caption:'el valor de cada número',size:'l'}},
    fields:[{k:'label',t:'text',label:'Texto pequeño de arriba'},{k:'title',t:'area',rows:2,label:'Título',help:RICH},{k:'fact',t:'text',label:'Dato (fecha, lugar…)'},{k:'valor',t:'text',label:'Cifra grande',ph:'$1'},{k:'caption',t:'text',label:'Texto bajo la cifra'},SIZE_F],
    render:function(d){return '<div class="bigfig"><div class="col">'+(d.label?'<div class="t-label in" style="--i:0">'+E(d.label)+'</div>':'')+'<h2 class="t-title in" style="--i:1;margin-top:14px;'+szv(d,'title',TITLE)+'">'+R(d.title)+'</h2>'
      +(d.fact?'<div class="facts"><div class="fact in" style="--i:3"><div class="dia"></div>'+E(d.fact)+'</div></div>':'')+'</div>'
      +'<div class="glass in" style="--i:2;padding:56px 40px 50px;display:flex;flex-direction:column;align-items:center;gap:16px;'+(String(d.valor||'').length>4?'--price:170px':'')+'"><div class="price">'+E(d.valor)+'</div>'+(d.caption?'<div class="t-label" style="text-align:center">'+E(d.caption)+'</div>':'')+'</div></div>'}},

  cuenta:{name:'Cuenta regresiva',desc:'Cuenta los días, horas y minutos que faltan para un evento. Con afiche opcional.',eyebrow:'Grabación en vivo',accent:'',cls:'',
    def:function(){return {label:'Próximamente',title:'Nombre del evento',sub:'Una línea sobre el evento',fecha:'*7 de noviembre* · 5:00 p.m.',target:nextWeek(),img:null,fit:'contain'}},
    fields:[{k:'label',t:'text',label:'Etiqueta con punto de luz'},{k:'title',t:'text',label:'Título',help:RICH},{k:'sub',t:'text',label:'Subtítulo',help:RICH},{k:'fecha',t:'area',rows:2,label:'Fecha y lugar (se muestra tal cual)',help:RICH},{k:'target',t:'datetime',label:'Fecha y hora del evento (para contar)'},{k:'img',t:'image',label:'Afiche o foto (opcional)'},FIT_F],
    render:function(d){return '<div class="rec'+(d.img?'':' noimg')+'">'+(d.img?'<div class="shot'+(d.fit==='contain'?' art':'')+' in" style="--i:1"><img src="'+E(d.img)+'" alt=""></div>':'')
      +'<div class="col"><div class="live in" style="--i:0"><i></i>'+E(d.label)+'</div><h2 class="t-title in" style="--i:1;font-size:112px">'+R(d.title)+'</h2>'
      +(d.sub?'<p class="t-mid in" style="--i:2">'+R(d.sub)+'</p>':'')+(d.fecha?'<p class="t-big in" style="--i:3">'+R(d.fecha)+'</p>':'')
      +'<div class="countdown in" style="--i:4" data-target="'+E(d.target)+'"><div class="glass cd"><b class="cd-d">--</b><span>días</span></div><div class="glass cd"><b class="cd-h">--</b><span>horas</span></div><div class="glass cd"><b class="cd-m">--</b><span>min</span></div></div></div></div>'}},

  versiculo:{name:'Versículo',desc:'Un texto bíblico con su cita, con foto de fondo si quieres.',eyebrow:'Palabra de Dios',accent:'',cls:'center',
    def:function(){return {texto:'«Levantémonos y edifiquemos.\nAsí esforzaron sus manos para bien.»',ref:'Nehemías 2:18',size:'l',bg:null}},
    fields:[{k:'texto',t:'area',rows:4,label:'Texto del versículo'},{k:'ref',t:'text',label:'Cita',ph:'Juan 3:16'},SIZE_F,{k:'bg',t:'image',label:'Foto de fondo (opcional)'}],
    render:function(d){return bg(d.bg)+'<div class="glass verse in" style="--i:1"><p style="'+szv(d,'vs',VS)+'">'+E(d.texto).replace(/\n/g,'<br>')+'</p>'+(d.ref?'<p class="t-label" style="margin-top:24px;color:var(--acc-hi)">'+E(d.ref)+'</p>':'')+'</div>'}},

  redes:{name:'Redes sociales',desc:'Lista de redes con su usuario, y fotos si quieres.',eyebrow:'Redes sociales',accent:'',cls:'',
    def:function(){return {title:'Síguenos',rows:[{red:'Instagram',user:'@tuiglesia'},{red:'YouTube',user:'Nombre del canal'},{red:'WhatsApp',user:'0000-0000'}],img1:null,img2:null}},
    fields:[{k:'title',t:'text',label:'Título'},{k:'rows',t:'list',label:'Redes',itemLabel:'Red',blank:{red:'',user:''},cols:[{k:'red',label:'Red (Instagram, TikTok, Facebook…)',ph:'Instagram'},{k:'user',label:'Usuario o número',ph:'@olocuiltataber'}]},{k:'img1',t:'image',label:'Foto 1 (opcional)'},{k:'img2',t:'image',label:'Foto 2 (opcional)'}],
    render:function(d){
      var rows=(d.rows||[]).filter(function(x){return x.red||x.user}).slice(0,6),pics=[d.img1,d.img2].filter(Boolean);
      var nets=rows.map(function(r,i){var key=String(r.red||'').toLowerCase().replace(/[^a-z]/g,''),ab=SOCIAL[key]||String(r.red||'?').slice(0,2).toUpperCase();
        return '<div class="glass net in" style="--i:'+(i+1)+'"><div class="dia">'+E(ab)+'</div><span>'+E(r.red)+'</span><b'+(String(r.user||'').length>26?' style="font-size:34px"':'')+'>'+E(r.user)+'</b></div>'}).join('');
      return '<div class="netgrid'+(pics.length?' pics':'')+'"><div class="col"><h2 class="t-title in" style="--i:0;--title:92px">'+E(d.title)+'</h2><div class="nets">'+nets+'</div></div>'
        +(pics.length?'<div class="pics-col">'+pics.map(function(p,i){return '<div class="shot kb in" style="--i:'+(i+2)+';height:'+(pics.length>1?'400px':'600px')+'"><img src="'+E(p)+'" alt=""></div>'}).join('')+'</div>':'')+'</div>'}},

  foto:{name:'Foto completa',desc:'Una foto o afiche que ocupa toda la pantalla, con un texto opcional abajo.',eyebrow:'',accent:'',cls:'end',
    def:function(){return {img:null,fit:'cover',caption:''}},
    fields:[{k:'img',t:'image',label:'Foto o afiche'},FIT_F,{k:'caption',t:'text',label:'Texto abajo (opcional)'}],
    render:function(d){return (d.img?'<div class="bg full'+(d.fit==='contain'?' contain':'')+'" aria-hidden="true"><img src="'+E(d.img)+'" alt=""></div>':'<p class="t-big in" style="align-self:center;margin:auto;color:var(--muted)">Agrega una foto en el panel de la derecha</p>')
      +(d.caption?'<div class="glass photo-cap in" style="--i:1"><span class="t-big">'+E(d.caption)+'</span></div>':'')}},

  logo:{name:'Logo sobre foto',desc:'El logo de la iglesia al centro, sobre un panel de vidrio y una foto de fondo. Para abrir o cerrar.',eyebrow:'',accent:'',cls:'',noChrome:true,
    def:function(){return {bg:null}},
    fields:[{k:'bg',t:'image',label:'Foto de fondo'}],
    render:function(d){return bg(d.bg,'soft')+'<div class="pane deco"><img class="logo" src="'+E(P.logo||DEFAULT_LOGO)+'" alt="Logo"></div>'
      +'<i class="deco deco-dia" style="left:270px;top:536px"></i><i class="deco deco-dia" style="left:1634px;top:536px"></i>'
      +'<i class="deco deco-spark" style="left:318px;top:196px"></i><i class="deco deco-spark" style="left:1566px;top:820px;width:30px;height:30px"></i><i class="deco deco-spark" style="left:1480px;top:150px;width:24px;height:24px"></i>'}}
};

/* ===== Proyecto ===== */
var P=null,cur=0,tab='slide';

function newSlide(type,over){
  var T=TYPES[type],s={id:uid(),type:type,eyebrow:T.eyebrow,accent:T.accent||'',logo2:null,hideLogo:false,d:T.def()};
  over=over||{};
  Object.keys(over).forEach(function(k){if(k==='d')s.d=Object.assign(s.d,over.d);else s[k]=over[k]});
  return s;
}
function blank(){return {app:'taber-slides-studio',v:1,name:'Mis diapositivas',theme:'vidrio',accent:'naranja',logo:null,hud:true,autoSeconds:12,slides:[newSlide('mensaje',{d:{title:'Tu mensaje\n*aquí*',sub:'Edita este texto en el panel de la derecha'}})]}}
function example(){
  return {app:'taber-slides-studio',v:1,name:'Anuncios de ejemplo',theme:'vidrio',accent:'naranja',logo:null,hud:true,autoSeconds:12,slides:[
    newSlide('bienvenida'),
    newSlide('mensaje',{eyebrow:'Bienvenido a casa',d:{title:'¿Es tu primera vez\n*acompañándonos?*',sub:'',size:'m'}}),
    newSlide('mensaje'),
    newSlide('agenda',{d:{items:[{dia:'Martes',nombre:'Amaneciendo con Dios',hora:'6:00 a.m.'},{dia:'Miércoles',nombre:'Noche de amigos',hora:'6:00 p.m.'},{dia:'Viernes',nombre:'Noche de oración',hora:'6:00 p.m.'},{dia:'Sábado',nombre:'JEV · Ser como niños',hora:'5:00 p.m.'},{dia:'Domingo',nombre:'Devocional',hora:'9:00 a.m.'},{dia:'Domingo',nombre:'Familias en victoria',hora:'4:00 p.m.'}]}}),
    newSlide('menu'),
    newSlide('evento',{eyebrow:'Ministración de fe',d:{label:'Viernes 30 de octubre',title:'Ministración\nde fe',facts:'Taber Kids extiende su horario ese día',badge:'+15 minutos después del culto',size:'m'}}),
    newSlide('fecha',{eyebrow:'Día obrero'}),
    newSlide('cifra'),
    newSlide('cuenta',{d:{label:'Grabación en vivo',title:'A tu lado',sub:'Segunda producción de *Philly*',fecha:'7 de noviembre\n*5:00 p.m.* · en la iglesia',target:'2026-11-07T17:00'}}),
    newSlide('redes',{d:{rows:[{red:'Instagram',user:'@Olocuiltataber'},{red:'TikTok',user:'@Olocuiltataber'},{red:'Facebook',user:'Tabernáculo Bíblico Bautista · Olocuilta'},{red:'YouTube',user:'Taber Olocuilta'},{red:'WhatsApp',user:'7692-1044'}]}})
  ]};
}
function migrate(p){
  var out=Object.assign(blank(),p);
  out.slides=(p.slides||[]).filter(function(s){return s&&TYPES[s.type]}).map(function(s){
    var T=TYPES[s.type];return Object.assign({id:uid(),eyebrow:T.eyebrow,accent:'',logo2:null,hideLogo:false},s,{d:Object.assign(T.def(),s.d||{})})});
  if(!out.slides.length)out.slides=blank().slides;
  if(!ACC[out.accent])out.accent='naranja';
  return out;
}
function load(){
  try{var t=localStorage.getItem(LS);if(t){var p=JSON.parse(t);if(p&&p.slides&&p.slides.length)return migrate(p)}}catch(e){}
  return example();
}

/* ===== Salida: HTML de las diapositivas ===== */
function chromeHTML(s){
  var main=P.logo||DEFAULT_LOGO;
  return '<div class="chrome">'+(s.eyebrow?'<div class="eyebrow">'+E(s.eyebrow)+'</div>':'<div></div>')
    +'<div class="logos">'+(s.logo2?'<img class="lg-extra" src="'+E(s.logo2)+'" alt=""><i class="lg-sep" aria-hidden="true"></i>':'')+(s.hideLogo?'':'<img class="lg-main" src="'+E(main)+'" alt="Logo">')+'</div></div>';
}
function slideHTML(s,i){
  var T=TYPES[s.type];
  return '<section class="slide'+(T.cls?' '+T.cls:'')+'" id="s'+(i+1)+'" data-title="'+E(s.eyebrow||T.name)+'" data-acc="'+E(s.accent||'')+'" aria-label="'+E(T.name)+'">'+(T.noChrome?'':chromeHTML(s))+T.render(s.d,s)+'</section>';
}
function skyHTML(){return '<div class="sky" aria-hidden="true"><div class="stars"></div><div class="ring"></div><div class="grain"></div></div>'}
function hudHTML(){
  return '<nav class="hud" aria-label="Controles de la presentación"><button class="hbtn" type="button" data-a="prev" aria-label="Anterior">◂</button><button class="hbtn" type="button" data-a="next" aria-label="Siguiente">▸</button>'
    +'<span class="count"></span><div class="steps"></div><button class="hbtn" type="button" data-a="auto" aria-pressed="false">Automático</button><button class="hbtn" type="button" data-a="black" aria-pressed="false">Negro</button>'
    +'<button class="hbtn" type="button" data-a="lite" aria-pressed="false">Ligero</button><button class="hbtn" type="button" data-a="full">Pantalla completa</button></nav>'
    +'<div class="progress" aria-hidden="true"></div><div class="autobar" aria-hidden="true"></div><div class="hint hide"></div><div class="blackout" aria-hidden="true"></div>';
}
function deckHTML(opt){
  return '<div class="deck'+(opt.fixed?' fixed':'')+'" data-base="'+E(P.accent)+'" data-acc="'+E(P.accent)+'">'+skyHTML()+'<div class="viewport"><div class="stage" role="region" aria-roledescription="presentación" aria-label="'+E(P.name)+'">'
    +P.slides.map(slideHTML).join('\n')+'</div></div>'+(opt.hud?hudHTML():'')+'</div>';
}
var RUNTIME_CSS='html,body{margin:0;height:100%;overflow:hidden;background:#000}';
function exportHTML(){
  var css=$('#font-css').textContent+'\n'+$('#theme-css').textContent+'\n'+RUNTIME_CSS;
  var boot='(function(){var d=document.querySelector(".deck");var st=parseInt((location.hash||"").slice(1),10)||1;createRuntime(d,{useWindow:true,keys:true,click:true,swipe:true,idle:true,wake:true,hash:true,autoSeconds:'+(P.autoSeconds||12)+',start:st-1});})();';
  return '<meta charset="utf-8">\n<title>'+E(P.name)+'</title>\n<style>'+css+'</style>\n'+deckHTML({fixed:true,hud:P.hud!==false})
    +'\n<script>'+createRuntime.toString()+'\n'+boot+'<\/script>\n';
}

/* ===== Archivos ===== */
function slug(){return (P.name||'presentacion').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'presentacion'}
var toastT=0;
function toast(msg){var t=$('#toast');t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){t.hidden=true},3800)}
function saveFile(filename,data,mime){
  var fallback=function(){
    var url=URL.createObjectURL(new Blob([data],{type:mime})),a=h('a',{href:url,download:filename});
    document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},4000);toast('Descargando '+filename);
  };
  if(window.claude&&window.claude.use){
    return window.claude.use('downloads').then(function(dl){
      if(!dl){toast('Este visor no permite descargar archivos. Abre la app desde su enlace en una pestaña del navegador.');return}
      return dl.save({filename:filename,data:data}).then(function(){toast('Listo: '+filename)},function(err){
        if(err&&err.code==='declined')return;
        toast('No se pudo guardar el archivo aquí. Intenta de nuevo o abre la app en otra pestaña.');
      });
    },fallback);
  }
  fallback();return Promise.resolve();
}
function readImage(file,logo){
  return new Promise(function(res,rej){
    var url=URL.createObjectURL(file),im=new Image();
    im.onload=function(){
      try{
        var max=logo?700:1600,w=im.naturalWidth||im.width,hh=im.naturalHeight||im.height,k=Math.min(1,max/Math.max(w,hh));
        w=Math.max(1,Math.round(w*k));hh=Math.max(1,Math.round(hh*k));
        var c=document.createElement('canvas');c.width=w;c.height=hh;var x=c.getContext('2d');
        if(!logo){x.fillStyle='#000';x.fillRect(0,0,w,hh)}
        x.drawImage(im,0,0,w,hh);res(logo?c.toDataURL('image/png'):c.toDataURL('image/jpeg',.82));
      }catch(e){rej(e)}finally{URL.revokeObjectURL(url)}
    };
    im.onerror=function(){URL.revokeObjectURL(url);rej(new Error('No se pudo leer la imagen'))};
    im.src=url;
  });
}

/* ===== Guardado automático ===== */
var saveT=0;
function setStatus(t,cls){var s=$('#status');s.textContent=t;s.className='u-status'+(cls?' '+cls:'')}
function saveNow(){
  try{localStorage.setItem(LS,JSON.stringify(P));setStatus('Guardado automáticamente en este navegador','ok')}
  catch(e){setStatus('No cabe en el guardado automático. Usa "Guardar proyecto" para no perder tu trabajo.','warn')}
}
function scheduleSave(){setStatus('Guardando…');clearTimeout(saveT);saveT=setTimeout(saveNow,500)}

/* ===== Vista previa ===== */
var rt=null,pv=null,pvStage=null;
function initPreview(){
  pv=$('#pv');pv.innerHTML=skyHTML()+'<div class="viewport"><div class="stage" role="img" aria-label="Vista previa de la diapositiva"></div></div>';
  pvStage=$('.stage',pv);
  rt=createRuntime(pv,{lite:false});
}
function renderPreview(anim){
  var s=P.slides[cur];if(!s)return;
  pv.setAttribute('data-base',P.accent);
  if(anim)pv.classList.remove('static');else pv.classList.add('static');
  pvStage.innerHTML=slideHTML(s,cur);
  rt.refresh();rt.fit();
  $('#count').textContent=String(cur+1).padStart(2,'0')+' / '+String(P.slides.length).padStart(2,'0');
}

/* ===== Lista de diapositivas ===== */
function label(s){
  var d=s.d,raw=d.title||d.texto||d.label||d.kicker||(d.items&&d.items[0]&&d.items[0].nombre)||'';
  return String(raw).replace(/\*/g,'').split('\n')[0].trim()||TYPES[s.type].name;
}
var dragFrom=-1;
function renderList(){
  var ul=$('#slist');ul.innerHTML='';
  P.slides.forEach(function(s,i){
    var T=TYPES[s.type];
    var b=h('button',{class:'u-item',type:'button','aria-current':i===cur?'true':'false',draggable:'true',onclick:function(){cur=i;renderAll(true)}},
      h('span',{class:'n'},String(i+1).padStart(2,'0')),
      h('span',{class:'t'},h('b',{},label(s)),h('small',{},T.name)),
      h('span',{class:'dot',style:'--c:'+(ACC[s.accent||P.accent]||'#FF7A1A')}));
    b.addEventListener('dragstart',function(e){dragFrom=i;b.classList.add('drag');try{e.dataTransfer.setData('text/plain',String(i));e.dataTransfer.effectAllowed='move'}catch(x){}});
    b.addEventListener('dragend',function(){b.classList.remove('drag');$$('.u-item.over').forEach(function(x){x.classList.remove('over')})});
    b.addEventListener('dragover',function(e){e.preventDefault();b.classList.add('over')});
    b.addEventListener('dragleave',function(){b.classList.remove('over')});
    b.addEventListener('drop',function(e){e.preventDefault();b.classList.remove('over');if(dragFrom>=0&&dragFrom!==i)moveTo(dragFrom,i);dragFrom=-1});
    ul.appendChild(h('li',{},b));
  });
}
function moveTo(from,to){
  var s=P.slides.splice(from,1)[0];P.slides.splice(to,0,s);cur=to;scheduleSave();renderAll(true);
}

/* ===== Panel de edición ===== */
function imageField(f,obj,ctx){
  var id=ctx.idp+'-'+f.k,input=h('input',{type:'file',accept:'image/*',id:id,hidden:true});
  var pvEl=h('div',{class:'pv'+(f.logo?' logo':'')},obj[f.k]?'':'Sin imagen');
  if(obj[f.k])pvEl.style.backgroundImage='url("'+obj[f.k]+'")';
  var msg=h('span',{},obj[f.k]?'Imagen lista':'Toca para elegir una imagen');
  var box=h('div',{class:'u-img',role:'button',tabindex:'0','aria-label':f.label,onclick:function(e){if(e.target.closest('button'))return;input.click()},
    onkeydown:function(e){if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button')){e.preventDefault();input.click()}}},
    pvEl,h('div',{class:'tx'},msg,h('div',{class:'bt'},
      h('button',{class:'u-btn sm',type:'button',onclick:function(){input.click()}},obj[f.k]?'Cambiar':'Elegir'),
      obj[f.k]?h('button',{class:'u-btn sm danger',type:'button',onclick:function(){obj[f.k]=null;ctx.hard()}},'Quitar'):null)),input);
  function take(file){
    if(!file||!/^image\//.test(file.type)){msg.textContent='Ese archivo no es una imagen';return}
    msg.textContent='Preparando imagen…';
    readImage(file,!!f.logo).then(function(url){obj[f.k]=url;ctx.hard()},function(){msg.textContent='No se pudo abrir esa imagen'});
  }
  input.addEventListener('change',function(){take(input.files&&input.files[0]);input.value=''});
  box.addEventListener('dragover',function(e){e.preventDefault();box.classList.add('drop')});
  box.addEventListener('dragleave',function(){box.classList.remove('drop')});
  box.addEventListener('drop',function(e){e.preventDefault();box.classList.remove('drop');take(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0])});
  return h('div',{class:'u-field'},h('span',{class:'u-lab'},f.label),box);
}
function fieldEl(f,obj,ctx){
  var id=ctx.idp+'-'+f.k,val=obj[f.k],help=f.help?h('p',{class:'u-help'},f.help):null;
  if(f.t==='image')return imageField(f,obj,ctx);
  if(f.t==='text')return h('div',{class:'u-field'},h('label',{for:id},f.label),h('input',{class:'u-in',id:id,type:'text',value:val||'',placeholder:f.ph||'',oninput:function(e){obj[f.k]=e.target.value;ctx.soft()}}),help);
  if(f.t==='area')return h('div',{class:'u-field'},h('label',{for:id},f.label),h('textarea',{class:'u-ta',id:id,rows:f.rows||3,placeholder:f.ph||'',oninput:function(e){obj[f.k]=e.target.value;ctx.soft()}},val||''),help);
  if(f.t==='datetime')return h('div',{class:'u-field'},h('label',{for:id},f.label),h('input',{class:'u-in',id:id,type:'datetime-local',value:val||'',oninput:function(e){obj[f.k]=e.target.value;ctx.soft()}}),h('p',{class:'u-help'},'Cuenta los días, horas y minutos hasta ese momento.'));
  if(f.t==='check')return h('label',{class:'u-chk',for:id},h('input',{type:'checkbox',id:id,checked:!!val,onchange:function(e){obj[f.k]=e.target.checked;ctx.soft()}}),f.label);
  if(f.t==='select'){
    var sel=h('select',{class:'u-sel',id:id,onchange:function(e){obj[f.k]=e.target.value;ctx.soft()}},f.options.map(function(o){return h('option',{value:o[0]},o[1])}));
    sel.value=val==null?f.options[0][0]:val;
    return h('div',{class:'u-field'},h('label',{for:id},f.label),sel);
  }
  if(f.t==='list'){
    var arr=obj[f.k],box=h('div',{class:'u-rep'});
    arr.forEach(function(it,i){
      var row=h('div',{class:'u-rrow'},h('div',{class:'hd'},h('b',{},f.itemLabel.toUpperCase()+' '+(i+1)),
        h('button',{class:'u-btn sm',type:'button','aria-label':'Subir',disabled:i===0,onclick:function(){arr.splice(i-1,0,arr.splice(i,1)[0]);ctx.hard()}},'↑'),
        h('button',{class:'u-btn sm',type:'button','aria-label':'Bajar',disabled:i===arr.length-1,onclick:function(){arr.splice(i+1,0,arr.splice(i,1)[0]);ctx.hard()}},'↓'),
        h('button',{class:'u-btn sm danger',type:'button','aria-label':'Quitar '+f.itemLabel.toLowerCase(),onclick:function(){arr.splice(i,1);ctx.hard()}},'✕')));
      f.cols.forEach(function(c){
        var cid=id+'-'+i+'-'+c.k,inp=c.t==='area'
          ?h('textarea',{class:'u-ta',id:cid,rows:c.rows||3,oninput:function(e){it[c.k]=e.target.value;ctx.soft()}},it[c.k]||'')
          :h('input',{class:'u-in',id:cid,type:'text',value:it[c.k]||'',placeholder:c.ph||'',oninput:function(e){it[c.k]=e.target.value;ctx.soft()}});
        row.appendChild(h('div',{class:'u-field'},h('label',{for:cid},c.label),inp));
      });
      box.appendChild(row);
    });
    box.appendChild(h('button',{class:'u-btn sm',type:'button',onclick:function(){arr.push(clone(f.blank));ctx.hard()}},'+ Agregar '+f.itemLabel.toLowerCase()));
    return h('div',{class:'u-field'},h('span',{class:'u-lab'},f.label),box);
  }
  return h('div');
}
function accentPicker(cur_,onPick,allowInherit){
  var wrap=h('div',{class:'u-swatches',role:'group','aria-label':'Color'});
  if(allowInherit)wrap.appendChild(h('button',{class:'u-btn sm',type:'button','aria-pressed':cur_===''?'true':'false',onclick:function(){onPick('')},style:cur_===''?'box-shadow:inset 0 0 0 1px var(--ui-acc)':''},'Igual que el resto'));
  ACCENTS.forEach(function(a){wrap.appendChild(h('button',{class:'u-sw',type:'button',style:'--c:'+a[2],'aria-label':a[1],title:a[1],'aria-pressed':cur_===a[0]?'true':'false',onclick:function(){onPick(a[0])}}))});
  return wrap;
}
function sec(title,nodes){return h('div',{class:'u-sec'},h('h3',{class:'u-h'},title),nodes)}
function renderPanel(){
  var panel=$('#panel'),keep=panel.scrollTop,body=$('#pbody');body.innerHTML='';
  $$('.u-tab',panel).forEach(function(t){t.setAttribute('aria-selected',t.dataset.t===tab?'true':'false')});
  if(tab==='slide'){
    var s=P.slides[cur],T=TYPES[s.type],ctx={idp:'f-'+s.id,soft:softUpdate,hard:function(){scheduleSave();renderAll(false)}};
    body.appendChild(h('p',{class:'u-note'},h('b',{},T.name+'. '),T.desc));
    body.appendChild(sec('Contenido',T.fields.map(function(f){return fieldEl(f,s.d,ctx)})));
    var dctx={idp:'g-'+s.id,soft:softUpdate,hard:function(){scheduleSave();renderAll(false)}};
    var design=[];
    if(!T.noChrome)design.push(fieldEl({k:'eyebrow',t:'text',label:'Etiqueta de arriba a la izquierda'},s,dctx));
    design.push(h('div',{class:'u-field'},h('span',{class:'u-lab'},'Color de esta diapositiva'),accentPicker(s.accent||'',function(a){s.accent=a;scheduleSave();renderAll(false)},true)));
    if(!T.noChrome){
      design.push(fieldEl({k:'logo2',t:'image',logo:true,label:'Logo adicional (opcional)'},s,dctx));
      design.push(fieldEl({k:'hideLogo',t:'check',label:'Ocultar el logo de la iglesia aquí'},s,dctx));
    }
    body.appendChild(sec('Diseño',design));
    body.appendChild(sec('Esta diapositiva',h('div',{class:'u-bar',style:'gap:8px'},
      h('button',{class:'u-btn sm',type:'button',disabled:cur===0,onclick:function(){moveTo(cur,cur-1)}},'↑ Subir'),
      h('button',{class:'u-btn sm',type:'button',disabled:cur===P.slides.length-1,onclick:function(){moveTo(cur,cur+1)}},'↓ Bajar'),
      h('button',{class:'u-btn sm',type:'button',onclick:dupSlide},'Duplicar'),
      h('button',{class:'u-btn sm danger',type:'button',onclick:delSlide},'Eliminar'))));
  }else{
    var gctx={idp:'p',soft:softUpdate,hard:function(){scheduleSave();renderAll(false)}};
    body.appendChild(sec('Estilo',[
      h('div',{class:'u-field'},h('label',{for:'p-theme'},'Lenguaje de diseño'),h('select',{class:'u-sel',id:'p-theme'},h('option',{value:'vidrio'},'Vidrio estelar'),h('option',{value:'',disabled:true},'Más estilos próximamente')),h('p',{class:'u-help'},'Vidrio estelar es el estilo de Arca: vidrio sobre el espacio, esquinas cortadas y destellos.')),
      h('div',{class:'u-field'},h('span',{class:'u-lab'},'Color principal'),accentPicker(P.accent,function(a){P.accent=a;scheduleSave();renderAll(false)},false),h('p',{class:'u-help'},'Cada diapositiva puede cambiarlo en su propio panel.'))]));
    body.appendChild(sec('Logo de la iglesia',[
      h('p',{class:'u-help'},'Aparece arriba a la derecha en todas las diapositivas. Mejor un PNG con fondo transparente y letras claras.'),
      (function(){var o={logo:P.logo};var c={idp:'p-logo',soft:softUpdate,hard:function(){P.logo=o.logo;scheduleSave();renderAll(false)}};return imageField({k:'logo',t:'image',logo:true,label:'Logo'},o,c)})(),
      P.logo?h('button',{class:'u-btn sm',type:'button',onclick:function(){P.logo=null;scheduleSave();renderAll(false)}},'Volver al logo de Taber Olocuilta'):null]));
    body.appendChild(sec('Al presentar',[
      fieldEl({k:'hud',t:'check',label:'Mostrar los botones de control (se esconden solos)'},P,gctx),
      (function(){var sel=h('select',{class:'u-sel',id:'p-auto',onchange:function(e){P.autoSeconds=+e.target.value;scheduleSave()}},[8,12,15,20,30].map(function(n){return h('option',{value:n},n+' segundos')}));sel.value=String(P.autoSeconds||12);return h('div',{class:'u-field'},h('label',{for:'p-auto'},'Avance automático cada'),sel,h('p',{class:'u-help'},'Se activa con la tecla A o con el botón Automático.'))})()]));
    body.appendChild(sec('Proyecto',h('div',{class:'u-bar'},
      h('button',{class:'u-btn sm',type:'button',onclick:openNew},'Nuevo o ejemplo…'),
      h('button',{class:'u-btn sm',type:'button',onclick:saveProject},'Guardar proyecto'),
      h('button',{class:'u-btn sm',type:'button',onclick:openProject},'Abrir proyecto'))));
  }
  panel.scrollTop=keep;
}
function softUpdate(){renderPreview(false);var b=$$('.u-item')[cur];if(b){$('.t b',b).textContent=label(P.slides[cur])}scheduleSave()}

/* ===== Acciones ===== */
function renderAll(anim){renderList();renderPanel();renderPreview(!!anim)}
function dupSlide(){var c=clone(P.slides[cur]);c.id=uid();P.slides.splice(cur+1,0,c);cur++;scheduleSave();renderAll(true);toast('Diapositiva duplicada')}
function delSlide(){
  if(P.slides.length<2){toast('Debe quedar al menos una diapositiva');return}
  ask('¿Eliminar esta diapositiva? No se puede deshacer.','Eliminar').then(function(ok){
    if(!ok)return;P.slides.splice(cur,1);cur=Math.min(cur,P.slides.length-1);scheduleSave();renderAll(true)});
}
function addSlide(type){P.slides.splice(cur+1,0,newSlide(type));cur++;tab='slide';scheduleSave();renderAll(true)}
function saveProject(){saveFile(slug()+'.json',JSON.stringify({app:'taber-slides-studio',v:1,project:P}),'application/json')}
function openProject(){
  var inp=h('input',{type:'file',accept:'.json,application/json',id:'open-file'});
  inp.addEventListener('change',function(){
    var f=inp.files&&inp.files[0];if(!f)return;
    f.text().then(function(t){var j=JSON.parse(t),p=j.project||j;if(!p.slides)throw new Error('x');P=migrate(p);cur=0;tab='slide';$('#pname').value=P.name;saveNow();renderAll(true);toast('Proyecto abierto: '+P.name)})
      .catch(function(){toast('Ese archivo no es un proyecto de Taber Slides')});
  });
  inp.click();
}
function doExport(){
  saveFile(slug()+'.html',exportHTML(),'text/html');
}

/* ===== Ventanas ===== */
var dlgStack=[];
function dlg(title,content,acts,small){
  var back=h('div',{class:'u-modal',onclick:function(e){if(e.target===back)close()}});
  var box=h('div',{class:'u-dlg'+(small?' small':''),role:'dialog','aria-modal':'true','aria-label':title},h('h2',{},title),content,acts&&acts.length?h('div',{class:'acts'},acts):null);
  back.appendChild(box);document.body.appendChild(back);dlgStack.push(back);
  function close(){var i=dlgStack.indexOf(back);if(i>=0)dlgStack.splice(i,1);back.remove()}
  var first=$('button,input,select',box);if(first)first.focus();
  return close;
}
function ask(msg,okLabel){
  return new Promise(function(res){
    var close=dlg('Confirmar',h('p',{},msg),[
      h('button',{class:'u-btn',type:'button',onclick:function(){close();res(false)}},'Cancelar'),
      h('button',{class:'u-btn pri',type:'button',onclick:function(){close();res(true)}},okLabel||'Aceptar')],true);
  });
}
function openAdd(){
  var close=dlg('Nueva diapositiva',h('div',{class:'u-types'},Object.keys(TYPES).map(function(k){
    return h('button',{class:'u-type',type:'button',onclick:function(){close();addSlide(k)}},h('b',{},TYPES[k].name),h('span',{},TYPES[k].desc))})),
    [h('button',{class:'u-btn',type:'button',onclick:function(){close()}},'Cancelar')]);
}
function openNew(){
  var close=dlg('Nuevo proyecto',h('p',{},'Tu proyecto actual se guarda solo en este navegador, pero conviene descargarlo con "Guardar proyecto" antes de empezar otro.'),[
    h('button',{class:'u-btn',type:'button',onclick:function(){close()}},'Cancelar'),
    h('button',{class:'u-btn',type:'button',onclick:function(){close();P=example();cur=0;$('#pname').value=P.name;scheduleSave();renderAll(true)}},'Cargar ejemplo'),
    h('button',{class:'u-btn pri',type:'button',onclick:function(){close();P=blank();cur=0;$('#pname').value=P.name;scheduleSave();renderAll(true)}},'Empezar en blanco')]);
}

/* ===== Presentar ===== */
var presRt=null,presEl=null;
function onFs(){if(presEl&&presEl.classList.contains('on')&&!document.fullscreenElement&&!document.webkitFullscreenElement&&presRt&&presRt._fsWanted)closePresent()}
function present(){
  presEl=$('#present');presEl.innerHTML=deckHTML({fixed:false,hud:P.hud!==false});
  presEl.appendChild(h('button',{class:'u-btn sm u-x',type:'button',onclick:closePresent},'Cerrar'));
  presEl.classList.add('on');
  presRt=createRuntime($('.deck',presEl),{keys:true,click:true,swipe:true,idle:true,idleEl:presEl,wake:true,fsEl:presEl,onExit:closePresent,start:cur,autoSeconds:P.autoSeconds||12});
  presRt.fit();
  try{var r=(presEl.requestFullscreen||presEl.webkitRequestFullscreen);if(r){var p=r.call(presEl);if(p&&p.then)p.then(function(){presRt._fsWanted=true},function(){})}}catch(e){}
}
function closePresent(){
  if(!presEl)return;
  if(presRt){presRt.destroy();presRt=null}
  try{if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen()}catch(e){}
  presEl.classList.remove('on');presEl.innerHTML='';
}

/* ===== Arranque ===== */
function boot(){
  P=load();cur=0;
  $('#pname').value=P.name;
  $('#pname').addEventListener('input',function(e){P.name=e.target.value||'Mis diapositivas';scheduleSave()});
  $('#bAdd').addEventListener('click',openAdd);
  $('#bNew').addEventListener('click',openNew);
  $('#bOpen').addEventListener('click',openProject);
  $('#bSave').addEventListener('click',saveProject);
  $('#bExport').addEventListener('click',doExport);
  $('#bPresent').addEventListener('click',present);
  $('#bPrev').addEventListener('click',function(){if(cur>0){cur--;renderAll(true)}});
  $('#bNext').addEventListener('click',function(){if(cur<P.slides.length-1){cur++;renderAll(true)}});
  $('#bAnim').addEventListener('click',function(){renderPreview(true)});
  $$('.u-tab').forEach(function(t){t.addEventListener('click',function(){tab=t.dataset.t;renderPanel()})});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&dlgStack.length){var d=dlgStack.pop();d.remove()}});
  document.addEventListener('fullscreenchange',onFs);
  initPreview();renderAll(true);saveNow();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
