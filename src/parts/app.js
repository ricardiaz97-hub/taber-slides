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
  var bridged=false,slides=[],cur=0,auto=false,aT=0,rT=0,cT=0,iT=0,hT=0,offs=[],ro=null;
  var DUR=(o.autoSeconds||12)*1000;
  var TOUCH=('ontouchstart' in win)||(navigator.maxTouchPoints>0);
  function q(s){return deck.querySelector(s)}
  function qa(s){return [].slice.call(deck.querySelectorAll(s))}
  function pad(n){return (n<10?'0':'')+n}
  function on(t,ev,fn,opt){t.addEventListener(ev,fn,opt);offs.push(function(){t.removeEventListener(ev,fn,opt)})}
  function fit(){
    if(bridged)return;
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
  function act(a){
    if(a==='prev')prev();else if(a==='next')next();else if(a==='auto')toggleAuto();
    else if(a==='black')toggleBlack();else if(a==='lite')setLite(!deck.classList.contains('lite'));
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
    else if(o.plain){}
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
  if(o.autoplay){auto=true;restartAuto()}
  /* Dentro del proyector de Arpa: su puente muestra cada diapositiva con position:fixed y su propia escala.
     Aquí se quita la escala propia (si no, se aplica dos veces y sale chiquito) y se activa la diapositiva que el puente muestra. */
  if(o.bridge&&win.MutationObserver){
    var syn=function(){
      var i,sh=-1;
      for(i=0;i<slides.length;i++)if(slides[i].style.position==='fixed'&&slides[i].style.display!=='none')sh=i;
      if(sh<0)return;
      if(!bridged){bridged=true;auto=false;clearTimeout(aT);stage.style.transform='none';stage.style.left='0';stage.style.top='0'}
      if(sh!==cur||!slides[sh].classList.contains('active')){cur=sh;apply();auto=false;clearTimeout(aT)}
      if(slides[sh].style.display==='block')slides[sh].style.display=''; /* el puente fuerza display:block y rompe el centrado de la diapositiva */
    };
    var mob=new win.MutationObserver(syn);
    slides.forEach(function(x){mob.observe(x,{attributes:true,attributeFilter:['style']})});
    offs.push(function(){mob.disconnect()});syn();
  }

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

  horario:{name:'Horario de cultos',desc:'El horario fijo de la semana, ya lleno. Marca la casilla el último sábado del mes.',eyebrow:'Cultos de la semana',accent:'',cls:'',
    def:function(){return {title:'Nuestros *cultos*',mujeres:false,items:[
      {dia:'Martes',nombre:'Amaneciendo con Dios',hora:'6:00 a.m.'},
      {dia:'Miércoles',nombre:'Noche de amigos',hora:'6:00 p.m.'},
      {dia:'Viernes',nombre:'Noche de oración',hora:'6:00 p.m.'},
      {dia:'Sábado',nombre:'Jóvenes en victoria',hora:'5:00 p.m.'},
      {dia:'Domingo',nombre:'Devocional',hora:'9:00 a.m.'},
      {dia:'Domingo',nombre:'Familias en victoria',hora:'4:00 p.m.'}]}},
    fields:[{k:'title',t:'text',label:'Título',help:RICH},
      {k:'mujeres',t:'check',label:'Es el último sábado del mes (Mujeres de Fe en lugar de Jóvenes en victoria, y 5K / Pan y chocolate al terminar)'},
      {k:'items',t:'list',label:'Cultos',itemLabel:'Culto',blank:{dia:'',nombre:'',hora:''},cols:[{k:'dia',label:'Día',ph:'Domingo'},{k:'nombre',label:'Nombre',ph:'Familias en victoria'},{k:'hora',label:'Hora',ph:'4:00 p.m.'}]}],
    render:function(d){
      var items=(d.items||[]).map(function(x){return {dia:x.dia,nombre:x.nombre,hora:x.hora}});
      if(d.mujeres){
        var mf={dia:'Sábado',nombre:'Mujeres de fe',hora:'5:00 p.m.'},ck={dia:'Sábado',nombre:'5K · Pan y chocolate',hora:'6:30 p.m.'};
        var at=-1;items.forEach(function(x,i){if(at<0&&noAcc(x.dia)==='sabado')at=i});
        if(at<0){items.push(mf,ck)}else{items.splice(at,1,mf,ck)}
      }
      return TYPES.agenda.render({title:d.title,items:items})}},

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
  var T=TYPES[type],s={id:uid(),type:type,eyebrow:T.eyebrow,accent:T.accent||'',logo2:null,hideLogo:false,until:'',d:T.def()};
  over=over||{};
  Object.keys(over).forEach(function(k){if(k==='d')s.d=Object.assign(s.d,over.d);else s[k]=over[k]});
  return s;
}
function blank(){return {app:'taber-slides-studio',v:1,name:'Mis diapositivas',theme:'vidrio',accent:'naranja',logo:null,hud:true,autoSeconds:12,skipExpired:true,archive:[],slides:[newSlide('mensaje',{d:{title:'Tu mensaje\n*aquí*',sub:'Edita este texto en el panel de la derecha'}})]}}
function example(){
  return {app:'taber-slides-studio',v:1,name:'Anuncios de ejemplo',theme:'vidrio',accent:'naranja',logo:null,hud:true,autoSeconds:12,skipExpired:true,archive:[],slides:[
    newSlide('bienvenida'),
    newSlide('mensaje',{eyebrow:'Bienvenido a casa',d:{title:'¿Es tu primera vez\n*acompañándonos?*',sub:'',size:'m'}}),
    newSlide('mensaje'),
    newSlide('agenda',{d:{items:[{dia:'Martes',nombre:'Amaneciendo con Dios',hora:'6:00 a.m.'},{dia:'Miércoles',nombre:'Noche de amigos',hora:'6:00 p.m.'},{dia:'Viernes',nombre:'Noche de oración',hora:'6:00 p.m.'},{dia:'Sábado',nombre:'JEV · Ser como niños',hora:'5:00 p.m.'},{dia:'Domingo',nombre:'Devocional',hora:'9:00 a.m.'},{dia:'Domingo',nombre:'Familias en victoria',hora:'4:00 p.m.'}]}}),
    newSlide('menu'),
    newSlide('evento',{eyebrow:'Ministración de fe',until:'2026-10-30',d:{label:'Viernes 30 de octubre',title:'Ministración\nde fe',facts:'Taber Kids extiende su horario ese día',badge:'+15 minutos después del culto',size:'m'}}),
    newSlide('fecha',{eyebrow:'Día obrero',until:'2026-10-31'}),
    newSlide('cifra',{until:'2026-11-01'}),
    newSlide('cuenta',{until:'2026-11-07',d:{label:'Grabación en vivo',title:'A tu lado',sub:'Segunda producción de *Philly*',fecha:'7 de noviembre\n*5:00 p.m.* · en la iglesia',target:'2026-11-07T17:00'}}),
    newSlide('redes',{d:{rows:[{red:'Instagram',user:'@Olocuiltataber'},{red:'TikTok',user:'@Olocuiltataber'},{red:'Facebook',user:'Tabernáculo Bíblico Bautista · Olocuilta'},{red:'YouTube',user:'Taber Olocuilta'},{red:'WhatsApp',user:'7692-1044'}]}})
  ]};
}
function migrate(p){
  var out=Object.assign(blank(),p);
  out.slides=(p.slides||[]).filter(function(s){return s&&TYPES[s.type]}).map(function(s){
    var T=TYPES[s.type];return Object.assign({id:uid(),eyebrow:T.eyebrow,accent:'',logo2:null,hideLogo:false,until:''},s,{d:Object.assign(T.def(),s.d||{})})});
  out.archive=(Array.isArray(p.archive)?p.archive:[]).filter(function(s){return s&&TYPES[s.type]}).map(function(s){var T=TYPES[s.type];return Object.assign({id:uid(),eyebrow:T.eyebrow,accent:'',logo2:null,hideLogo:false,until:''},s,{d:Object.assign(T.def(),s.d||{})})});
  if(out.skipExpired!==false)out.skipExpired=true;
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
  return '<section class="slide'+(T.cls?' '+T.cls:'')+'" id="s'+(i+1)+'" data-title="'+E(s.eyebrow||T.name)+'" data-acc="'+E(s.accent||'')+'"'+(s.until?' data-until="'+E(s.until)+'"':'')+' aria-label="'+E(T.name)+'">'+(T.noChrome?'':chromeHTML(s))+T.render(s.d,s)+'</section>';
}
function skyHTML(){return '<div class="sky" aria-hidden="true"><div class="stars"></div><div class="ring"></div><div class="grain"></div></div>'}
function deckHTML(opt){
  return '<div class="deck'+(opt.fixed?' fixed':'')+'" data-base="'+E(P.accent)+'" data-acc="'+E(P.accent)+'">'+skyHTML()+'<div class="viewport"><div class="stage" role="region" aria-roledescription="presentación" aria-label="'+E(P.name)+'">'
    +(opt.slides||P.slides).map(slideHTML).join('\n')+'</div></div>'+'</div>';
}
var RUNTIME_CSS='html,body{margin:0;height:100%;overflow:hidden;background:#000}.slide{box-sizing:border-box}.sky,.viewport{position:fixed;inset:0}';
/* El HTML descargado va como las diapositivas del proyector: sin contenedor .deck, con #viewport y #stage a nivel de página */
function pageCss(css){
  return css.replace('position:absolute;inset:0;overflow:hidden;background:var(--bg)','background:var(--bg)')
    .replace(/\.deck\.fixed\{[^}]*\}/,'').replace(/\.deck\s+/g,'').replace(/\.deck(?![\w-])/g,'html');
}
function exportHTML(){
  var skip=P.skipExpired!==false;
  var css=$('#font-css').textContent+'\n'+pageCss($('#theme-css').textContent)+'\n'+RUNTIME_CSS;
  var boot='(function(){var r=document.documentElement;r.setAttribute("data-base","'+E(P.accent)+'");r.setAttribute("data-acc","'+E(P.accent)+'");var t=new Date(),k=t.getFullYear()+"-"+("0"+(t.getMonth()+1)).slice(-2)+"-"+("0"+t.getDate()).slice(-2);var all=[].slice.call(document.querySelectorAll(".stage>.slide")),keep=all.filter(function(s){var u=s.getAttribute("data-until");return !u||u>=k});if('+skip+'&&keep.length&&keep.length<all.length){all.forEach(function(s){if(keep.indexOf(s)<0)s.parentNode.removeChild(s)})}var st=parseInt((location.hash||"").slice(1),10)||1;createRuntime(r,{useWindow:true,keys:true,plain:true,bridge:true,idle:true,wake:true,hash:true,autoplay:'+(P.autoplay===true)+',autoSeconds:'+(P.autoSeconds||12)+',start:st-1});})();';
  return '<title>'+E(P.name)+'</title>\n<style>'+css+'</style>\n'+skyHTML()+'\n<main class="viewport" id="viewport">\n<div class="stage" id="stage" role="region" aria-roledescription="presentación" aria-label="'+E(P.name)+'">\n'
    +liveSlides().map(slideHTML).join('\n')+'\n</div>\n</main>\n<script>'+createRuntime.toString()+'\n'+boot+'<\/script>\n';
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

/* ===== Fotos temporales (para sortear en las diapositivas) ===== */
/* La carpeta de fotos vive solo en memoria: no se guarda en el navegador. Lo que se guarda es la foto que queda en cada diapositiva. */
var POOL=[],poolQ=[],MAXPOOL=40;
var PHOTO_FIELD={bienvenida:'bg',mensaje:'bg',fecha:'bg',versiculo:'bg',evento:'img',cuenta:'img',redes:'img1'};
var DIR_OK=('webkitdirectory' in document.createElement('input'));
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}
function readPhoto(file){
  return new Promise(function(res,rej){
    var url=URL.createObjectURL(file),im=new Image();
    im.onload=function(){
      try{
        var w=im.naturalWidth||im.width,hh=im.naturalHeight||im.height,k=Math.min(1,1280/Math.max(w,hh));
        w=Math.max(1,Math.round(w*k));hh=Math.max(1,Math.round(hh*k));
        var c=document.createElement('canvas');c.width=w;c.height=hh;var x=c.getContext('2d');
        x.fillStyle='#000';x.fillRect(0,0,w,hh);x.drawImage(im,0,0,w,hh);
        var u=c.toDataURL('image/jpeg',.72);c.width=c.height=0;res(u);
      }catch(e){rej(e)}finally{URL.revokeObjectURL(url)}
    };
    im.onerror=function(){URL.revokeObjectURL(url);rej(new Error('No se pudo leer la imagen'))};
    im.src=url;
  });
}
function addPhotos(files,progress){
  var list=[].slice.call(files).filter(function(f){return /^image\//.test(f.type)}),total=list.length,room=MAXPOOL-POOL.length,skipped=0,n=0;
  list=shuffle(list).slice(0,Math.max(0,room));
  return list.reduce(function(p,f){
    return p.then(function(){return readPhoto(f).then(function(u){POOL.push(u)},function(){skipped++}).then(function(){n++;if(progress)progress(n,list.length)})});
  },Promise.resolve()).then(function(){poolQ=[];return {added:list.length-skipped,found:total,full:room<=0||total>list.length}});
}
function nextPhoto(avoid){
  if(!POOL.length)return null;
  if(!poolQ.length)poolQ=shuffle(POOL);
  var i=poolQ.length-1;if(poolQ[i]===avoid&&poolQ.length>1)i=0;
  return poolQ.splice(i,1)[0];
}
function putPhoto(s,avoid){
  var k=PHOTO_FIELD[s.type];if(!k||!POOL.length)return false;
  s.d[k]=nextPhoto(avoid);if(k==='img')s.d.fit='cover';return true;
}
function pickPhotos(dir,progress,done){
  var inp=h('input',{type:'file',accept:'image/*',multiple:true});
  if(dir)inp.setAttribute('webkitdirectory','');
  inp.addEventListener('change',function(){var fs=inp.files;if(!fs||!fs.length)return;addPhotos(fs,progress).then(done)});
  inp.click();
}
function poolNote(r){
  if(!r.found)return 'No encontré fotos en esa selección.';
  if(r.full)return 'Ya hay '+POOL.length+' fotos, que es el máximo. Usé las que cupieron.';
  return '';
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
    var T=TYPES[s.type],st=status(s);
    var b=h('button',{class:'u-item'+(st?' '+st:''),type:'button','aria-current':i===cur?'true':'false',draggable:'true',onclick:function(){cur=i;renderAll(true)}},
      h('span',{class:'n'},String(i+1).padStart(2,'0')),
      h('span',{class:'t'},h('b',{},label(s)),h('small',{},T.name+(s.until?' · hasta '+niceDate(s.until):''),st?h('span',{class:'tag '+st},st==='expired'?'Ya pasó':'Último día'):null)),
      h('span',{class:'dot',style:'--c:'+(ACC[s.accent||P.accent]||'#FF7A1A')}));
    b.addEventListener('dragstart',function(e){dragFrom=i;b.classList.add('drag');try{e.dataTransfer.setData('text/plain',String(i));e.dataTransfer.effectAllowed='move'}catch(x){}});
    b.addEventListener('dragend',function(){b.classList.remove('drag');$$('.u-item.over').forEach(function(x){x.classList.remove('over')})});
    b.addEventListener('dragover',function(e){e.preventDefault();b.classList.add('over')});
    b.addEventListener('dragleave',function(){b.classList.remove('over')});
    b.addEventListener('drop',function(e){e.preventDefault();b.classList.remove('over');if(dragFrom>=0&&dragFrom!==i)moveTo(dragFrom,i);dragFrom=-1});
    ul.appendChild(h('li',{class:'u-li'},b,h('button',{class:'u-x2',type:'button','aria-label':'Eliminar esta diapositiva',title:'Eliminar',onclick:function(e){e.stopPropagation();cur=i;delSlide()}},'✕')));
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
function photoBar(s,ctx){
  var k=PHOTO_FIELD[s.type];
  var msg=h('p',{class:'u-help'},POOL.length?POOL.length+(POOL.length===1?' foto lista':' fotos listas')+' para sortear. Solo viven mientras la app está abierta.':'Elige varias fotos'+(DIR_OK?' o una carpeta':'')+' y la app sortea una para esta diapositiva.');
  function assign(){var u=nextPhoto(s.d[k]);if(!u)return;s.d[k]=u;if(k==='img')s.d.fit='cover';ctx.hard()}
  function prog(n,t){msg.textContent='Preparando fotos '+n+' de '+t+'…'}
  function done(r){var note=poolNote(r);if(note)toast(note);if(POOL.length)assign();else ctx.hard()}
  var bar=h('div',{class:'u-bar',style:'gap:8px'});
  if(POOL.length)bar.appendChild(h('button',{class:'u-btn sm',type:'button',onclick:assign},'🔀 Otra foto al azar'));
  bar.appendChild(h('button',{class:'u-btn sm',type:'button',onclick:function(){pickPhotos(false,prog,done)}},POOL.length?'Añadir fotos':'Elegir fotos para sortear'));
  if(DIR_OK)bar.appendChild(h('button',{class:'u-btn sm',type:'button',onclick:function(){pickPhotos(true,prog,done)}},'Elegir carpeta'));
  return h('div',{class:'u-field'},h('span',{class:'u-lab'},'Foto al azar'),bar,msg);
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
    var cont=T.fields.map(function(f){return fieldEl(f,s.d,ctx)});
    if(PHOTO_FIELD[s.type])cont.push(photoBar(s,ctx));
    body.appendChild(sec('Contenido',cont));
    var dctx={idp:'g-'+s.id,soft:softUpdate,hard:function(){scheduleSave();renderAll(false)}};
    var design=[];
    if(!T.noChrome)design.push(fieldEl({k:'eyebrow',t:'text',label:'Etiqueta de arriba a la izquierda'},s,dctx));
    design.push(h('div',{class:'u-field'},h('span',{class:'u-lab'},'Color de esta diapositiva'),accentPicker(s.accent||'',function(a){s.accent=a;scheduleSave();renderAll(false)},true)));
    if(!T.noChrome){
      design.push(fieldEl({k:'logo2',t:'image',logo:true,label:'Logo adicional (opcional)'},s,dctx));
      design.push(fieldEl({k:'hideLogo',t:'check',label:'Ocultar el logo de la iglesia aquí'},s,dctx));
    }
    body.appendChild(sec('Diseño',design));
    var guess=guessSlideDate(s),when=[h('div',{class:'u-field'},h('label',{for:'u-'+s.id},'Mostrar hasta (último día)'),
      h('input',{class:'u-in',id:'u-'+s.id,type:'date',value:s.until||'',onchange:function(e){s.until=e.target.value||'';scheduleSave();renderAll(false)}}),
      h('p',{class:'u-help'},'Después de esa fecha la diapositiva se omite sola al presentar y se marca para revisar. Déjalo vacío si no vence (por ejemplo, los cultos de cada semana).'))];
    if(!s.until&&guess)when.push(h('button',{class:'u-btn sm',type:'button',onclick:function(){s.until=guess;scheduleSave();renderAll(false)}},'Usar «'+niceDate(guess)+'»'));
    if(s.until)when.push(h('button',{class:'u-btn sm',type:'button',onclick:function(){s.until='';scheduleSave();renderAll(false)}},'Quitar fecha'));
    body.appendChild(sec('Cuándo mostrarla',when));
    body.appendChild(sec('Esta diapositiva',h('div',{class:'u-bar',style:'gap:8px'},
      h('button',{class:'u-btn sm',type:'button',disabled:cur===0,onclick:function(){moveTo(cur,cur-1)}},'↑ Subir'),
      h('button',{class:'u-btn sm',type:'button',disabled:cur===P.slides.length-1,onclick:function(){moveTo(cur,cur+1)}},'↓ Bajar'),
      h('button',{class:'u-btn sm',type:'button',onclick:dupSlide},'Duplicar'),
      h('button',{class:'u-btn sm',type:'button',onclick:function(){archiveSlide(cur);toast('Guardada en el archivo');scheduleSave();renderAll(true)}},'Archivar'),
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
      h('p',{class:'u-help'},'El HTML descargado no trae botones ni pantalla completa: solo las diapositivas con sus animaciones. El visor o proyector que uses las cambia con las flechas.'),
      fieldEl({k:'autoplay',t:'check',label:'Que las diapositivas avancen solas en el HTML descargado'},P,gctx),
      (function(){var sel=h('select',{class:'u-sel',id:'p-auto',onchange:function(e){P.autoSeconds=+e.target.value;scheduleSave()}},[8,12,15,20,30].map(function(n){return h('option',{value:n},n+' segundos')}));sel.value=String(P.autoSeconds||12);return h('div',{class:'u-field'},h('label',{for:'p-auto'},'Tiempo en cada diapositiva si avanzan solas'),sel,h('p',{class:'u-help'},'Solo cuenta si activas el avance automático de arriba.'))})()]));
    body.appendChild(sec('Anuncios que ya pasaron',[
      fieldEl({k:'skipExpired',t:'check',label:'Omitir al presentar y en el HTML descargado las diapositivas cuya fecha ya pasó'},P,gctx),
      h('button',{class:'u-btn sm',type:'button',onclick:openReview},'Revisar anuncios y archivo')]));
    body.appendChild(sec('Proyecto',h('div',{class:'u-bar'},
      h('button',{class:'u-btn sm',type:'button',onclick:openNew},'Nuevo o ejemplo…'),
      h('button',{class:'u-btn sm',type:'button',onclick:saveProject},'Guardar proyecto'),
      h('button',{class:'u-btn sm',type:'button',onclick:openProject},'Abrir proyecto'))));
  }
  panel.scrollTop=keep;
}
function softUpdate(){renderPreview(false);var b=$$('.u-item')[cur];if(b){$('.t b',b).textContent=label(P.slides[cur])}scheduleSave()}

/* ===== Acciones ===== */
function renderAll(anim){renderList();renderPanel();renderPreview(!!anim);updateAlert()}
function dupSlide(){var c=clone(P.slides[cur]);c.id=uid();P.slides.splice(cur+1,0,c);cur++;scheduleSave();renderAll(true);toast('Diapositiva duplicada')}
function delSlide(){
  var s=P.slides[cur];if(!s)return;
  ask('¿Eliminar «'+label(s)+'»? No se puede deshacer. Si solo ya pasó, mejor usa Archivar.','Eliminar').then(function(ok){
    if(!ok)return;P.slides.splice(cur,1);if(!P.slides.length)P.slides.push(newSlide('mensaje'));cur=Math.min(cur,P.slides.length-1);scheduleSave();renderAll(true);toast('Diapositiva eliminada')});
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
/* Foto de ejemplo para las miniaturas (se dibuja aquí mismo, no es un archivo) */
var SAMPLE=null;
function samplePhoto(){
  if(SAMPLE)return SAMPLE;
  var c=document.createElement('canvas');c.width=960;c.height=540;var x=c.getContext('2d');
  var g=x.createLinearGradient(0,0,960,540);g.addColorStop(0,'#3A2A22');g.addColorStop(.55,'#8A5A3C');g.addColorStop(1,'#1D2A44');
  x.fillStyle=g;x.fillRect(0,0,960,540);
  x.fillStyle='rgba(255,210,160,.35)';x.beginPath();x.arc(720,150,90,0,7);x.fill();
  x.fillStyle='rgba(15,10,10,.55)';
  [[230,330,90],[380,350,104],[540,340,96],[700,360,108]].forEach(function(p){x.beginPath();x.arc(p[0],p[1],p[2]*.28,0,7);x.fill();x.fillRect(p[0]-p[2]*.42,p[1]+p[2]*.3,p[2]*.84,300)});
  SAMPLE=c.toDataURL('image/jpeg',.7);return SAMPLE;
}
function thumbEl(type){
  var s=newSlide(type),T=TYPES[type];
  T.fields.forEach(function(f){if(f.t==='image'&&!f.logo)s.d[f.k]=samplePhoto()});
  var html=slideHTML(s,0).replace(/ id="s\d+"/,'').replace('class="slide','class="slide active');
  var el=h('div',{class:'u-thumb','aria-hidden':'true'});
  el.innerHTML='<div class="deck static lite" data-base="'+E(P.accent)+'" data-acc="'+E(P.accent)+'">'+skyHTML()+'<div class="viewport"><div class="stage">'+html+'</div></div></div>';
  $$('.rotor',el).forEach(function(r){if(r.children[0])r.children[0].className='on'});
  $$('.cd-d',el).forEach(function(x){x.textContent='7'});$$('.cd-h,.cd-m',el).forEach(function(x){x.textContent='00'});
  return el;
}
function fitThumbs(root){
  $$('.u-thumb',root).forEach(function(t){var k=t.clientWidth/1920;if(k>0)$('.stage',t).style.transform='scale('+k+')'});
}
function openAdd(){
  var list=h('div',{class:'u-types'},Object.keys(TYPES).map(function(k){
    return h('button',{class:'u-type',type:'button',onclick:function(){close();addSlide(k)}},thumbEl(k),h('b',{},TYPES[k].name),h('span',{},TYPES[k].desc))}));
  var close=dlg('Nueva diapositiva',list,[h('button',{class:'u-btn',type:'button',onclick:function(){close()}},'Cancelar')]);
  fitThumbs(list);
}
function openNew(){
  var close=dlg('Nuevo proyecto',h('p',{},'Tu proyecto actual se guarda solo en este navegador, pero conviene descargarlo con "Guardar proyecto" antes de empezar otro.'),[
    h('button',{class:'u-btn',type:'button',onclick:function(){close()}},'Cancelar'),
    h('button',{class:'u-btn',type:'button',onclick:function(){close();P=example();cur=0;$('#pname').value=P.name;scheduleSave();renderAll(true)}},'Cargar ejemplo'),
    h('button',{class:'u-btn pri',type:'button',onclick:function(){close();P=blank();cur=0;$('#pname').value=P.name;scheduleSave();renderAll(true)}},'Empezar en blanco')]);
}

/* ===== Presentar ===== */
var presRt=null,presEl=null;
function present(){
  presEl=$('#present');var live=liveSlides(),st0=Math.max(0,live.indexOf(P.slides[cur]));presEl.innerHTML=deckHTML({fixed:false,hud:false,slides:live});
  presEl.appendChild(h('button',{class:'u-btn sm u-x',type:'button',onclick:closePresent},'Cerrar'));
  presEl.classList.add('on');
  presRt=createRuntime($('.deck',presEl),{keys:true,plain:true,click:true,swipe:true,idle:true,idleEl:presEl,wake:true,onExit:closePresent,start:st0,autoSeconds:P.autoSeconds||12});
  presRt.fit();
}
function closePresent(){
  if(!presEl)return;
  if(presRt){presRt.destroy();presRt=null}
  presEl.classList.remove('on');presEl.innerHTML='';
}

/* ===== Fechas y vencimientos ===== */
var MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
var MONTHS={setiembre:9};MES.forEach(function(m,i){MONTHS[m]=i+1});
var DIAS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
var p2=function(n){return (n<10?'0':'')+n};
function isoOf(d){return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())}
function todayISO(){return isoOf(new Date())}
function noAcc(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function cap(s){s=String(s||'');return s.charAt(0).toUpperCase()+s.slice(1)}
function niceDate(s){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');return m?(+m[3])+' de '+MES[+m[2]-1]+(m[1]!==String(new Date().getFullYear())?' de '+m[1]:''):''}
function status(s){var u=s&&s.until;if(!u)return '';var t=todayISO();return u<t?'expired':u===t?'today':''}
function liveSlides(){
  if(P.skipExpired===false)return P.slides;
  var l=P.slides.filter(function(s){return status(s)!=='expired'});
  return l.length?l:P.slides;
}
function findDate(text){
  var re=/(?:(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s+)?(\d{1,2})\s+de\s+([a-záéíóúñ]+)(?:\s+(?:de|del)\s+(\d{4}))?/gi,m;
  while((m=re.exec(String(text||'')))){
    var mo=MONTHS[noAcc(m[3])],d=+m[2];if(!mo||d<1||d>31)continue;
    var now=new Date(),y=m[4]?+m[4]:now.getFullYear();
    if(!m[4]&&new Date(y,mo-1,d)<new Date(now.getFullYear(),now.getMonth(),now.getDate()-45))y++;
    return {iso:y+'-'+p2(mo)+'-'+p2(d),text:m[0]};
  }
  return null;
}
function findTime(text){
  var t=String(text||''),m=/(\d{1,2})(?:[:.](\d{2}))?\s*([ap])\.?\s?m\b\.?/i.exec(t);
  if(m){var h12=+m[1],mi=m[2]||'00',pm=/p/i.test(m[3]);return {h24:h12%12+(pm?12:0),min:mi,raw:m[0],text:h12+':'+mi+' '+(pm?'p.m.':'a.m.')}}
  m=/\b(\d{1,2}):(\d{2})\b/.exec(t);
  return m?{h24:+m[1],min:m[2],raw:m[0],text:(+m[1])+':'+m[2]}:null;
}
function findDay(text){
  var t=noAcc(text),m=/\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)s?\b/.exec(t);
  if(m){for(var i=0;i<7;i++)if(noAcc(DIAS[i])===m[1])return cap(DIAS[i])}
  return /dominical/.test(t)?'Domingo':'';
}
function guessSlideDate(s){
  var d=s.d,parts=[d.label,d.fact,d.facts,d.fecha,d.detalle,d.title,d.sub,d.badge];
  var f=null;parts.forEach(function(x){if(!f&&x)f=findDate(String(x).replace(/\*/g,''))});
  if(f)return f.iso;
  var m=/^(\d{4}-\d{2}-\d{2})T/.exec(d.target||'');return m?m[1]:'';
}
function archiveSlide(i){
  var s=P.slides.splice(i,1)[0];if(!s)return;
  s.archivedAt=todayISO();P.archive.unshift(s);
  if(!P.slides.length)P.slides.push(newSlide('mensaje'));
  cur=Math.min(cur,P.slides.length-1);
}
function dueList(){return P.slides.filter(function(s){return status(s)})}
function updateAlert(){
  var box=$('#alert'),ex=P.slides.filter(function(s){return status(s)==='expired'}),td=P.slides.filter(function(s){return status(s)==='today'});
  var rb=$('#bReview');if(rb)rb.textContent='Revisar anuncios'+(ex.length||td.length?' ('+(ex.length+td.length)+')':'')+(P.archive.length?' · archivo '+P.archive.length:'');
  box.innerHTML='';
  if(!ex.length&&!td.length){box.hidden=true;return}
  box.hidden=false;
  var msg=ex.length?(ex.length===1?'1 anuncio ya pasó: «'+label(ex[0])+'».':ex.length+' anuncios ya pasaron.'):'Hoy es el último día de «'+label(td[0])+'»'+(td.length>1?' y '+(td.length-1)+' más.':'.');
  box.appendChild(h('span',{},msg));
  box.appendChild(h('button',{class:'u-btn sm',type:'button',onclick:openReview},'Revisar'));
}
function openReview(){
  var box=h('div',{class:'u-rev'}),close;
  function draw(){
    box.innerHTML='';
    var due=P.slides.filter(function(s){return status(s)});
    box.appendChild(h('h3',{class:'u-h'},'Para revisar ('+due.length+')'));
    if(!due.length)box.appendChild(h('p',{class:'u-help'},'Todo al día: ningún anuncio tiene la fecha vencida.'));
    due.forEach(function(s){
      var st=status(s);
      box.appendChild(h('div',{class:'u-rrow rv'},
        h('div',{class:'rt'},h('b',{},label(s)),h('small',{class:st},(st==='expired'?'Venció el ':'Último día: ')+niceDate(s.until))),
        h('div',{class:'ra'},
          h('input',{class:'u-in',type:'date',value:s.until,'aria-label':'Nueva fecha',onchange:function(e){s.until=e.target.value||'';scheduleSave();renderAll(false);draw()}}),
          h('button',{class:'u-btn sm',type:'button',onclick:function(){close();cur=P.slides.indexOf(s);tab='slide';renderAll(true)}},'Ver'),
          h('button',{class:'u-btn sm',type:'button',onclick:function(){archiveSlide(P.slides.indexOf(s));scheduleSave();renderAll(true);draw()}},'Archivar'),
          h('button',{class:'u-btn sm danger',type:'button',onclick:function(){ask('¿Eliminar «'+label(s)+'» para siempre?','Eliminar').then(function(ok){if(!ok)return;P.slides.splice(P.slides.indexOf(s),1);if(!P.slides.length)P.slides.push(newSlide('mensaje'));cur=Math.min(cur,P.slides.length-1);scheduleSave();renderAll(true);draw()})}},'Eliminar'))));
    });
    var ex=P.slides.filter(function(s){return status(s)==='expired'});
    if(ex.length>1)box.appendChild(h('button',{class:'u-btn',type:'button',onclick:function(){ex.forEach(function(s){archiveSlide(P.slides.indexOf(s))});scheduleSave();renderAll(true);draw();toast('Anuncios vencidos archivados')}},'Archivar todos los vencidos'));
    box.appendChild(h('h3',{class:'u-h',style:'margin-top:18px'},'Archivo ('+P.archive.length+')'));
    if(!P.archive.length)box.appendChild(h('p',{class:'u-help'},'Aquí quedan los anuncios archivados. Puedes volver a usarlos cuando quieras.'));
    P.archive.forEach(function(s,i){
      box.appendChild(h('div',{class:'u-rrow rv'},
        h('div',{class:'rt'},h('b',{},label(s)),h('small',{},TYPES[s.type].name+(s.archivedAt?' · archivada el '+niceDate(s.archivedAt):''))),
        h('div',{class:'ra'},
          h('button',{class:'u-btn sm',type:'button',onclick:function(){var c=P.archive.splice(i,1)[0];delete c.archivedAt;c.until='';P.slides.push(c);cur=P.slides.length-1;scheduleSave();renderAll(true);draw();toast('Restaurada al final de la lista')}},'Restaurar'),
          h('button',{class:'u-btn sm danger',type:'button',onclick:function(){ask('¿Eliminar «'+label(s)+'» del archivo para siempre?','Eliminar').then(function(ok){if(!ok)return;P.archive.splice(i,1);scheduleSave();updateAlert();draw()})}},'Eliminar'))));
    });
  }
  close=dlg('Revisar anuncios',box,[h('button',{class:'u-btn pri',type:'button',onclick:function(){close()}},'Listo')]);
  draw();
}

/* ===== Pegar un mensaje de WhatsApp ===== */
var NETS=[['instagram','Instagram'],['tiktok','TikTok'],['tik tok','TikTok'],['facebook','Facebook'],['youtube','YouTube'],['whatsapp','WhatsApp'],['twitter','Twitter'],['spotify','Spotify'],['telegram','Telegram']];
function sentence(s){s=String(s||'').replace(/\*/g,'').replace(/[:\s]+$/,'').trim();var L=s.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g,'');if(L&&L===L.toUpperCase())s=s.toLowerCase();return cap(s)}
function glowLast(s){var w=s.split(' ');if(w.length<2)return s;w[w.length-1]='*'+w[w.length-1]+'*';return w.join(' ')}
function plain(l){return String(l||'').replace(/\*/g,'').trim()}
function isHeader(l){
  if(/^\*[^*\n]+\*:?$/.test(l))return true;
  var p=plain(l);if(/:\s*\S/.test(p)||/\d/.test(p))return false;
  var L=p.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g,'');return L.length>=3&&L===L.toUpperCase();
}
function splitTitle(l){
  if(isHeader(l))return [l];
  var p=plain(l),lab=/^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ .]*?)\s+([A-ZÁÉÍÓÚÑ]+):\s/.exec(p);
  if(lab)return findDay(lab[2])?[lab[1],p.slice(lab[1].length+1)]:[l];
  if(/^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ .]*:\s/.test(p))return [l];
  var m=/^((?:[A-ZÁÉÍÓÚÑÜ0-9'¡!¿?.,]+\s+)*[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ'¡!¿?.,]*)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ¿¡"«][^\n]*[a-záéíóúñ][^\n]*)$/.exec(p);
  if(!m||/:$/.test(m[1])||m[1].replace(/[^A-ZÁÉÍÓÚÑÜ]/g,'').length<4)return [l];
  return [m[1],m[2]];
}
function vref(text){
  var re=/((?:[123]\s?)?[A-ZÁÉÍÓÚ][a-záéíóúñ]+)\s+(\d{1,3}:\d{1,3}(?:[-–]\d{1,3})?)(?!\d)(?!\s*[apAP]\.?\s?[mM])/g,m;
  while((m=re.exec(String(text||'')))){if(!findDay(m[1])&&!/^(Hora|Desde|Las?)$/.test(m[1]))return m[0]}
  return '';
}
function parseWA(raw){
  var t=String(raw||'').replace(/\r/g,'')
    .replace(/^\s*\[?\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?[ap]\.?\s?m\.?)?\]?\s*[-–]?\s*[^:\n]{1,40}:\s?/gim,'')
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u20E3\u200B]/gu,'')
    .replace(/```/g,'').replace(/(^|\s)~([^~\n]+)~(?=\s|$)/g,'$1$2').replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,]|$)/g,'$1$2');
  var lines=[];
  t.split('\n').forEach(function(l){
    l=l.replace(/\s+/g,' ').trim().replace(/^(?:[•▪▫◦·●○■□▶►➤➔→>\-–—]+|\d{1,2}[.)])\s+/,'');
    if(!l||/^[-_=~*•.·\s]{3,}$/.test(l)){lines.push('');return}
    l=l.replace(/\.\s+(?=[A-ZÁÉÍÓÚÑ]{3,}(?:\s[A-ZÁÉÍÓÚÑ.]{2,})*:)/g,'.\n').replace(/(\d\s*(?:[ap]\.?\s?m\.?|[AP]\.?\s?M\.?))\s+(?=[A-ZÁÉÍÓÚ])/g,'$1\n');
    l.split('\n').forEach(function(p){splitTitle(p.trim()).forEach(function(x){lines.push(x)})});
  });
  var blocks=[],cu=[];
  function flush(){if(cu.length)blocks.push(cu);cu=[]}
  lines.forEach(function(l){
    if(!l){flush();return}
    if(isHeader(l)&&cu.length)flush();
    cu.push(l);
  });flush();
  return blocks.map(function(bl){
    var b={title:plain(bl[0]).replace(/[:\s]+$/,''),body:bl.slice(1).map(plain).filter(Boolean)};
    b.kind=kindOf(b);return b;
  });
}
function kindOf(b){
  var all=[b.title].concat(b.body).join('\n'),n=noAcc(all),tn=noAcc(b.title);
  if(/alabanza|bienvenida/.test(tn)&&!/casa/.test(tn))return 'bienvenida';
  var nets=b.body.filter(function(l){return /instagram|tik ?tok|facebook|youtube|whatsapp|twitter|spotify|telegram/.test(noAcc(l))}).length;
  if(nets>=2||/redes/.test(tn))return 'redes';
  if(/cafeter|menu|comida/.test(tn))return 'menu';
  if(/rifa|sorteo/.test(n)||(/\$/.test(all)&&/valor|precio|costo|boleto/.test(n)))return 'cifra';
  var d=findDate(all),tm=findTime(all);
  if(vref(all)&&!d)return 'versiculo';
  if(d&&tm&&/grabaci|lanzamiento|estreno|en vivo|concierto/.test(n)&&d.iso>=todayISO())return 'cuenta';
  if(!d&&tm&&(findDay(all)))return 'agenda';
  if(d)return others(b,d,tm).length>1?'evento':'fecha';
  return b.body.length<=1?'mensaje':'evento';
}
function others(b,d,tm){
  return b.body.map(function(l){
    if(d)l=l.replace(d.text,'');if(tm)l=l.replace(tm.raw,'');
    return l.replace(/\s*\b(?:a|de|desde|el|a partir de)\s+las?\s*$/i,'').replace(/^[\s,;:·\-–.]+|[\s,;:·\-–]+$/g,'').trim();
  }).filter(function(l){return l.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ0-9]/g,'').length>2});
}
function money(text){
  var m=/\$\s?(\d+(?:[.,]\d+)?)/.exec(text)||/(\d+(?:[.,]\d+)?)\s?\$/.exec(text);
  return m?'$'+m[1]:'';
}
function buildSlide(b,kind){
  var all=[b.title].concat(b.body).join('\n'),d=findDate(all),tm=findTime(all),ti=sentence(b.title),over={};
  var until=d?d.iso:'',dl=d?cap(d.text):'';
  var eb=ti.length<=30?ti:'';
  if(kind==='bienvenida'){
    var dd={};if(b.body.length)dd.frases=b.body.join('\n');
    return newSlide('bienvenida',{eyebrow:eb,d:dd});
  }
  if(kind==='redes'){
    var rows=b.body.map(function(l){
      var low=noAcc(l),net=null;NETS.forEach(function(x){if(!net&&low.indexOf(x[0])===0)net=x});
      if(net)return {red:net[1],user:l.slice(net[0].length).replace(/^[\s:\-–]+/,'').trim()};
      return {red:'',user:l};
    });
    return newSlide('redes',{d:{rows:rows.length?rows:[{red:'',user:''}]}});
  }
  if(kind==='menu'){
    var cols=[],loose=[];
    b.body.forEach(function(l){
      var m=/^([^:]{1,30}):\s*(.+)$/.exec(l);
      if(m)cols.push({titulo:sentence(m[1]),items:m[2].split(/,|;|\sy\s/).map(function(x){return cap(x.replace(/[.\s]+$/,'').trim())}).filter(Boolean).join('\n')});
      else loose.push(l);
    });
    if(!cols.length)cols.push({titulo:'',items:loose.join('\n')});
    return newSlide('menu',{eyebrow:eb,d:{title:glowLast(ti),cols:cols.slice(0,4)}});
  }
  if(kind==='agenda'){
    var items=[];
    var src=b.body.length?b.body:[b.title];
    src.forEach(function(l){
      var t2=findTime(l),dy=findDay(l)||findDay(b.title),name=l;
      if(t2)name=name.replace(t2.raw,'');
      name=name.replace(/\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)s?\b/ig,'').replace(/^[\s,;:·\-–.]+|[\s,;:·\-–]+$/g,'').trim();
      if(name.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ]/g,'').length<2)name=ti;
      items.push({dia:dy,nombre:sentence(name),hora:t2?t2.text:''});
    });
    return newSlide('agenda',{eyebrow:'Cultos de la semana',d:{title:'Nuestros *cultos*',items:items}});
  }
  if(kind==='cifra'){
    var m=/^(gran\s+)?(rifa|sorteo)\s+(?:de\s+|del\s+)?(.+)$/i.exec(b.title),lab='',tt=ti;
    if(m){lab=(m[1]?'Gran ':'')+(m[2].toLowerCase()==='rifa'?(m[1]?'rifa':'Rifa'):(m[1]?'sorteo':'Sorteo'));tt=sentence(m[3])}
    return newSlide('cifra',{eyebrow:lab||eb,until:until,d:{label:lab,title:glowLast(tt),fact:dl,valor:money(all)||'$1',caption:/n[uú]mero|boleto/i.test(all)?'el valor de cada número':''}});
  }
  if(kind==='versiculo'){
    var ref=vref(all),txt=b.body.filter(function(l){return l.indexOf(ref)<0||l.replace(ref,'').trim().length>8}).map(function(l){return l.replace(ref,'').trim()}).join('\n');
    if(txt&&!/^[«"“]/.test(txt))txt='«'+txt+'»';
    return newSlide('versiculo',{eyebrow:eb,d:{texto:txt||'«Escribe aquí el versículo»',ref:ref}});
  }
  if(kind==='cuenta'){
    var rest=others(b,d,tm),place=/,\s*(en\s+[^.,\n]+)/i.exec(all);
    var main=(rest[0]||ti).replace(/[«»“”"]/g,'');
    if(place)main=main.replace(place[0],'');
    main=main.replace(/\s*\b(?:a|de)\s+las?\b\s*/gi,' ').replace(/\s*,\s*$/,'').replace(/\s+/g,' ').trim();
    var by=/^(.*?)\s+(Por\s+.+)$/.exec(main);if(by){main=by[1];rest.splice(1,0,by[2])}
    return newSlide('cuenta',{eyebrow:eb,until:until,d:{label:ti,title:main,sub:rest.slice(1).join(' · '),fecha:dl+(tm?'\n*'+tm.text+'*':'')+(place?' · '+place[1]:''),target:d&&tm?d.iso+'T'+p2(tm.h24)+':'+tm.min:nextWeek()}});
  }
  if(kind==='fecha'&&d){
    var o=others(b,d,tm);
    return newSlide('fecha',{eyebrow:eb,until:until,d:{label:dl,title:glowLast(ti),hora:tm?tm.text:'',detalle:o.join(' · ')}});
  }
  if(kind==='evento'){
    var o2=others(b,d,tm);
    return newSlide('evento',{eyebrow:eb,until:until,d:{label:dl,title:glowLast(ti),facts:o2.join('\n'),badge:tm?'Hora · '+tm.text:'',size:'m'}});
  }
  var sub=b.body.join(' · ');
  if(/nuevos|primera vez|visita/.test(noAcc(all)))return newSlide('mensaje',{eyebrow:eb,d:{title:'¿Es tu primera vez\n*acompañándonos?*',sub:'',size:'m'}});
  return newSlide('mensaje',{eyebrow:eb,until:until,d:{title:glowLast(ti),sub:sub,size:ti.length>22?'m':'l'}});
}
var WA_KINDS=['bienvenida','mensaje','evento','agenda','menu','fecha','cifra','cuenta','versiculo','redes'];
function assemble(items){
  var out=[],lastAg=null;
  items.forEach(function(it){
    if(it.kind==='skip'){lastAg=null;return}
    var s=buildSlide(it.b,it.kind);
    if(s.type==='agenda'){
      if(lastAg){s.d.items.forEach(function(x){lastAg.d.items.push(x)});return}
      lastAg=s;out.push(s);return;
    }
    lastAg=null;out.push(s);
  });
  return out;
}
function openWA(){
  var ta=h('textarea',{class:'u-ta wa-ta',rows:9,placeholder:'Pega aquí el mensaje de WhatsApp con los anuncios…','aria-label':'Mensaje de WhatsApp'});
  var out=h('div',{class:'wa-out'}),items=[],mode=h('select',{class:'u-sel','aria-label':'Dónde agregar'},h('option',{value:'add'},'Agregar al final de mis diapositivas'),h('option',{value:'replace'},'Reemplazar las actuales (las actuales van al archivo)'));
  var go=h('button',{class:'u-btn pri',type:'button',disabled:true},'Crear diapositivas'),close;
  var useFotos=h('input',{type:'checkbox',id:'wa-fotos',checked:true}),poolMsg=h('span',{class:'u-help'});
  var bDir=DIR_OK?h('button',{class:'u-btn sm',type:'button',onclick:function(){pick(true)}},'Elegir carpeta'):null;
  var bFiles=h('button',{class:'u-btn sm',type:'button',onclick:function(){pick(false)}},'Elegir fotos');
  var bClear=h('button',{class:'u-btn sm',type:'button',onclick:function(){POOL=[];poolQ=[];updPool()}},'Quitar fotos');
  function updPool(msg){
    poolMsg.textContent=msg||(POOL.length?POOL.length+(POOL.length===1?' foto lista':' fotos listas')+'. Se reparten al azar y solo quedan las que uses.':'Sin fotos todavía. Es opcional.');
    bClear.disabled=!POOL.length;
  }
  function pick(dir){
    pickPhotos(dir,function(n,t){poolMsg.textContent='Preparando fotos '+n+' de '+t+'…'},function(r){var n=poolNote(r);updPool(n?(POOL.length?POOL.length+' fotos listas. ':'')+n:'')});
  }
  var photosField=h('div',{class:'u-field'},h('span',{class:'u-lab'},'Fotos (opcional)'),
    h('p',{class:'u-help'},'Elige una carpeta o varias fotos y la app pone una al azar en cada diapositiva que admite foto. Si una no va, la cambias en la edición de esa diapositiva. La carpeta no se guarda: la próxima vez la eliges de nuevo.'),
    h('div',{class:'u-bar',style:'gap:8px'},bDir,bFiles,bClear),poolMsg,
    h('label',{class:'u-chk',for:'wa-fotos'},useFotos,'Poner fotos al azar en las diapositivas que se puedan'));
  updPool();
  function draw(){
    out.innerHTML='';
    if(!items.length){out.appendChild(h('p',{class:'u-help'},'Cuando pegues el mensaje, aquí verás las diapositivas que encontré. Puedes cambiar el tipo de cada una o quitarla antes de crearlas.'));go.disabled=true;return}
    var n=assemble(items).length;go.disabled=!n;go.textContent=n?'Crear '+n+(n===1?' diapositiva':' diapositivas'):'Crear diapositivas';
    items.forEach(function(it,i){
      var sel=h('select',{class:'u-sel','aria-label':'Tipo de la diapositiva '+(i+1),onchange:function(e){it.kind=e.target.value;draw()}},
        WA_KINDS.map(function(k){return h('option',{value:k},TYPES[k].name)}),h('option',{value:'skip'},'No crear'));
      sel.value=it.kind;
      var prev=it.kind==='skip'?null:buildSlide(it.b,it.kind);
      out.appendChild(h('div',{class:'wa-row'+(it.kind==='skip'?' off':'')},h('div',{class:'rt'},h('b',{},it.kind==='skip'?sentence(it.b.title):label(prev)),
        h('small',{},it.kind==='skip'?'No se creará':(prev.until?'Se mostrará hasta el '+niceDate(prev.until):(it.kind==='agenda'?'Se unirá con los cultos vecinos':'Sin fecha de vencimiento')))),sel));
    });
  }
  var tm=0;
  ta.addEventListener('input',function(){clearTimeout(tm);tm=setTimeout(function(){items=parseWA(ta.value).map(function(b){return {b:b,kind:b.kind}});draw()},250)});
  go.addEventListener('click',function(){
    var slides=assemble(items);if(!slides.length)return;
    var withPhoto=0;
    if(useFotos.checked&&POOL.length){var last=null;slides.forEach(function(s){if(putPhoto(s,last)){withPhoto++;last=s.d[PHOTO_FIELD[s.type]]}})}
    if(mode.value==='replace'){var old=P.slides.splice(0,P.slides.length);old.forEach(function(s){s.archivedAt=todayISO();P.archive.unshift(s)});P.slides=slides;cur=0}
    else{cur=P.slides.length;slides.forEach(function(s){P.slides.push(s)})}
    tab='slide';close();scheduleSave();renderAll(true);toast(slides.length+(slides.length===1?' diapositiva creada':' diapositivas creadas')+(withPhoto?' ('+withPhoto+' con foto)':'')+'. Revisa cada una y ajusta lo que haga falta.');
  });
  close=dlg('Pegar anuncios de WhatsApp',h('div',{class:'wa'},h('p',{},'Copia el mensaje completo de WhatsApp y pégalo aquí. Separé cada anuncio por título o por línea en blanco y adiviné el tipo de diapositiva y la fecha de vencimiento.'),ta,h('div',{class:'u-field'},h('span',{class:'u-lab'},'Lo que encontré'),out),photosField,h('div',{class:'u-field'},h('span',{class:'u-lab'},'¿Dónde lo agrego?'),mode)),
    [h('button',{class:'u-btn',type:'button',onclick:function(){close()}},'Cancelar'),go]);
  draw();ta.focus();
}

/* ===== Arranque ===== */
function boot(){
  P=load();cur=0;
  $('#pname').value=P.name;
  $('#pname').addEventListener('input',function(e){P.name=e.target.value||'Mis diapositivas';scheduleSave()});
  $('#bAdd').addEventListener('click',openAdd);
  $('#bWa').addEventListener('click',openWA);
  $('#bReview').addEventListener('click',openReview);
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
  initPreview();renderAll(true);saveNow();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
