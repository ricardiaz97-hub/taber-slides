/* ===== Resplandor: efecto de foto =====
   Se aplica UNA sola vez a cada foto (en el navegador, con canvas) y el resultado es un JPG normal.
   Así las diapositivas del proyector no cargan efectos pesados: solo muestran una imagen.
   Nada de esto usa IA generativa: son curvas de color, desenfoque, luces dibujadas y un recorte opcional de personas. */
var RS=(function(){
  var LOOK0={on:true,strength:.85,light:.7,blur:.5,bloom:.4,ca:.25,grain:.3};
  var cache={},order=[],MAXC=80,lastBy={},inflight={},ids=new Map(),masks={},listeners=[],pending=0,total=0,running=false,queue=[];

  /* ---------- utilidades ---------- */
  function lookOf(P){var l=(P&&P.look)||{},o={};Object.keys(LOOK0).forEach(function(k){o[k]=(l[k]===undefined?LOOK0[k]:l[k])});return o}
  function hash(str){var h=2166136261,n=str.length,step=n>6000?Math.floor(n/6000):1;for(var i=0;i<n;i+=step){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}h^=n;return (h>>>0).toString(36)}
  function idOf(src){var v=ids.get(src);if(!v){v=hash(src);ids.set(src,v)}return v}
  function r2(v){return Math.round(v*100)/100}
  function rng(s){s=s>>>0;return function(){s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
  function clamp(v,a,b){return v<a?a:v>b?b:v}
  function tick(){return new Promise(function(r){setTimeout(r,0)})}
  function mk(w,h){var c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c}
  function loadImg(src){return new Promise(function(res,rej){var im=new Image();im.onload=function(){res(im)};im.onerror=function(){rej(new Error('img'))};im.src=src})}

  /* ---------- curva de color (tonos cálidos en medios y luces, azul profundo en sombras) ---------- */
  var CR=[.012,.10,.275,.52,.765,.93,1],CG=[.02,.10,.265,.495,.735,.90,.98],CB=[.10,.17,.27,.45,.63,.79,.89];
  function lut(tab,contrast,bright){
    var o=new Uint8ClampedArray(256);
    for(var i=0;i<256;i++){var t=i/255*6,k=Math.min(5,Math.floor(t)),f=t-k,v=tab[k]*(1-f)+tab[k+1]*f;v=((v-.5)*contrast+.5)*bright;o[i]=v*255}
    return o;
  }
  function gradeCanvas(c){
    var x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height),a=d.data,LR=lut(CR,1.10,1.06),LG=lut(CG,1.10,1.06),LB=lut(CB,1.10,1.06),S=1.06;
    for(var i=0;i<a.length;i+=4){
      var r=a[i],g=a[i+1],b=a[i+2],l=.2126*r+.7152*g+.0722*b;
      r=l+(r-l)*S;g=l+(g-l)*S;b=l+(b-l)*S;
      a[i]=LR[r<0?0:r>255?255:r|0];a[i+1]=LG[g<0?0:g>255?255:g|0];a[i+2]=LB[b<0?0:b>255?255:b|0];
    }
    x.putImageData(d,0,0);
  }
  function meanLuma(c){
    var t=mk(32,32),x=t.getContext('2d');x.drawImage(c,0,0,32,32);var a=x.getImageData(0,0,32,32).data,s=0;
    for(var i=0;i<a.length;i+=4)s+=.2126*a[i]+.7152*a[i+1]+.0722*a[i+2];
    return s/(a.length/4)/255;
  }

  /* ---------- desenfoque (con ctx.filter si existe; si no, reduciendo y ampliando) ---------- */
  var FILTER_OK=(function(){try{var x=document.createElement('canvas').getContext('2d');x.filter='blur(2px)';return x.filter==='blur(2px)'}catch(e){return false}})();
  function blurTo(src,px,pad){
    var W=src.width,H=src.height,m=pad?Math.ceil(px*2):0,t=mk(W+2*m,H+2*m),x=t.getContext('2d');
    if(px<.5){x.drawImage(src,m,m,W,H);return crop(t,m,W,H)}
    if(FILTER_OK){x.filter='blur('+px+'px)';x.drawImage(src,0,0,W+2*m,H+2*m);x.filter='none';return crop(t,m,W,H)}
    var k=Math.max(2,px/1.6),s=mk((W+2*m)/k,(H+2*m)/k),sx=s.getContext('2d');sx.imageSmoothingQuality='high';sx.drawImage(src,0,0,s.width,s.height);
    var s2=mk(s.width/2,s.height/2);s2.getContext('2d').drawImage(s,0,0,s2.width,s2.height);
    x.imageSmoothingQuality='high';x.drawImage(s2,0,0,t.width,t.height);return crop(t,m,W,H);
  }
  function crop(t,m,W,H){if(!m)return t;var o=mk(W,H);o.getContext('2d').drawImage(t,m,m,W,H,0,0,W,H);return o}

  /* ---------- gradientes elípticos ---------- */
  function ellipse(x,cx,cy,rx,ry,stops,W,H){
    var g;x.save();x.translate(cx,cy);x.scale(rx,ry);g=x.createRadialGradient(0,0,0,0,0,1);
    stops.forEach(function(s){g.addColorStop(s[0],s[1])});x.fillStyle=g;x.fillRect(-cx/rx,-cy/ry,W/rx,H/ry);x.restore();
  }
  function mix(c1,c2,a){return c1+(c2-c1)*a}

  /* ---------- prismas de luz (una cuadrilla distinta por foto, siempre la misma para la misma foto) ---------- */
  var PAL=[[[120,200,255],[90,140,255],[255,190,90],[255,110,150]],[[255,190,90],[255,120,140],[150,110,255],[110,210,255]],[[90,150,255],[120,220,255],[255,230,160],[255,150,80]]];
  function prismLayer(W,H,fx,fy,seed,amt,behind){
    var r=rng(seed*7919+13),dir=r()<.5?-1:1,aS=Math.max(0,amt)/.7,out=mk(W,H),big=mk(W,H),sm=mk(W,H),bx=big.getContext('2d'),sx=sm.getContext('2d');
    var specs=behind?[[1,.20,1],[-1,.18,1],[1,.34,0],[-1,.30,0],[1,.46,1],[-1,.42,0]]:[[1,.46,1],[-1,.40,1],[1,.30,0],[-1,.34,0],[1,.52,0]];
    specs.forEach(function(sp){
      var side=sp[0],dist=sp[1],isBig=sp[2],x0=fx+side*(dist+r()*(behind?.10:.14))*W,y0=(behind?.06+r()*.8:.08+r()*.84)*H;
      var w=(isBig?(.16+r()*.12):(.04+r()*.05))*W,L=(isBig?(1.3+r()*.5):(.5+r()*.36))*W,rot=(dir*(9+r()*16)+(r()-.5)*8)*Math.PI/180;
      var p=PAL[Math.floor(r()*PAL.length)],al=Math.min(1,(isBig?(behind?.62:.46):(behind?.78:.62))*aS),c=isBig?bx:sx,g;
      c.save();c.translate(x0,y0);c.rotate(rot);g=c.createLinearGradient(-w/2,0,w/2,0);
      g.addColorStop(0,'rgba(0,0,0,0)');
      g.addColorStop(.22,'rgba('+p[1].join(',')+','+(al*.8)+')');g.addColorStop(.48,'rgba(255,255,255,'+Math.min(1,al*1.1)+')');
      g.addColorStop(.66,'rgba('+p[2].join(',')+','+al+')');g.addColorStop(.82,'rgba('+p[3].join(',')+','+(al*.7)+')');g.addColorStop(1,'rgba(0,0,0,0)');
      c.fillStyle=g;c.fillRect(-w/2,-L/2,w,L);c.restore();
    });
    var bb=blurTo(big,W*.025,true),sb=blurTo(sm,W*.008,true),ox=out.getContext('2d');
    ox.drawImage(bb,0,0);ox.drawImage(sb,0,0);
    /* destellos redondos pequeños */
    for(var k=0;k<3;k++){
      var side2=k%2?1:-1,x1=fx+side2*(.30+r()*.22)*W,y1=(.10+r()*.8)*H,s=(.025+r()*.06)*W;
      ox.globalAlpha=Math.min(1,(.35+r()*.4)*aS);
      ellipse(ox,x1,y1,s,s,[[0,'rgba(230,240,255,.85)'],[.45,'rgba(90,150,255,.3)'],[.7,'rgba(90,150,255,0)'],[1,'rgba(90,150,255,0)']],W,H);
    }
    ox.globalAlpha=1;
    return out;
  }

  /* ---------- aberración cromática y grano (un solo recorrido por los píxeles) ---------- */
  function finish(c,ca,grain,seed){
    if(ca<.02&&grain<.02)return;
    var W=c.width,H=c.height,x=c.getContext('2d'),d=x.getImageData(0,0,W,H),s=d.data,o=ca>=.02?new Uint8ClampedArray(s):null,rnd=rng(seed+99),amp=grain*20,i,px,py,nx,ny,q,off,sx_,sy_,p0;
    var hw=W/2,hh=H/2,K=ca*.010*W;
    function samp(ch,fx_,fy_){
      var x0=Math.floor(fx_),y0=Math.floor(fy_),tx=fx_-x0,ty=fy_-y0;
      x0=clamp(x0,0,W-2);y0=clamp(y0,0,H-2);var k=(y0*W+x0)*4+ch;
      return (o[k]*(1-tx)+o[k+4]*tx)*(1-ty)+(o[k+W*4]*(1-tx)+o[k+W*4+4]*tx)*ty;
    }
    for(py=0;py<H;py++){
      ny=(py-hh)/hh;
      for(px=0;px<W;px++){
        i=(py*W+px)*4;
        if(o){
          nx=(px-hw)/hw;q=nx*nx+ny*ny;
          if(q>.12){off=K*(q-.12)/1.0;sx_=nx*off;sy_=ny*off*(H/W);
            s[i]=samp(0,px-sx_,py-sy_);s[i+2]=samp(2,px+sx_,py+sy_)}
        }
        if(amp>0){p0=(rnd()-.5)*amp;s[i]+=p0;s[i+1]+=p0;s[i+2]+=p0}
      }
    }
    x.putImageData(d,0,0);
  }

  /* ---------- bloom: las luces fuertes se derraman un poco ---------- */
  function bloom(c,amt){
    if(amt<.02)return;
    var W=c.width,H=c.height,t=mk(W/3,H/3),tx=t.getContext('2d');tx.drawImage(c,0,0,t.width,t.height);
    var d=tx.getImageData(0,0,t.width,t.height),a=d.data,th=.62*255;
    for(var i=0;i<a.length;i+=4){a[i]=Math.max(0,a[i]-th)*2.6;a[i+1]=Math.max(0,a[i+1]-th)*2.6;a[i+2]=Math.max(0,a[i+2]-th)*2.6}
    tx.putImageData(d,0,0);
    var b=blurTo(t,Math.max(2,W*.012/3*2.2),true),x=c.getContext('2d');
    x.save();x.globalCompositeOperation='screen';x.globalAlpha=clamp(amt*.8,0,1);x.imageSmoothingQuality='high';x.drawImage(b,0,0,W,H);x.restore();
  }

  /* ---------- el efecto completo ---------- */
  /* opts: {look, fx, fy (0..1 sobre la foto original), aspect (ancho/alto de la diapositiva o 0 para respetar la foto), mask (canvas con alfa, mismo tamaño que la foto), maxSide} */
  function bake(src,opts){
    var look=opts.look,fx0=opts.fx,fy0=opts.fy,mask=opts.mask||null,maxSide=opts.maxSide||1280;
    return loadImg(src).then(function(im){
      var iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,asp=opts.aspect||iw/ih,cw,ch,cx0,cy0;
      /* recorte con foco: se queda con la zona que contiene a la persona */
      if(iw/ih>asp){ch=ih;cw=ih*asp}else{cw=iw;ch=iw/asp}
      cx0=clamp(fx0*iw-cw/2,0,iw-cw);cy0=clamp(fy0*ih-ch*.42,0,ih-ch);
      var k=Math.min(1,maxSide/Math.max(cw,ch)),W=Math.max(8,Math.round(cw*k)),H=Math.max(8,Math.round(ch*k));
      var fx=clamp((fx0*iw-cx0)/cw,.04,.96)*W,fy=clamp((fy0*ih-cy0)/ch,.04,.96)*H;
      var orig=mk(W,H),ox=orig.getContext('2d');ox.imageSmoothingQuality='high';ox.drawImage(im,cx0,cy0,cw,ch,0,0,W,H);
      var M=null;if(mask){M=mk(W,H);var mx=M.getContext('2d');mx.imageSmoothingQuality='high';mx.drawImage(mask,cx0*mask.width/iw,cy0*mask.height/ih,cw*mask.width/iw,ch*mask.height/ih,0,0,W,H)}
      var seed=parseInt(idOf(src),36)%100000;
      return tick().then(function(){
        var dk=clamp((meanLuma(orig)-.31)/.10,0,.9);                   /* cuarto muy claro: se oscurece solo */
        var G=mk(W,H);G.getContext('2d').drawImage(orig,0,0);gradeCanvas(G);
        var out=mk(W,H),x=out.getContext('2d'),bpx=look.blur*.065*W,hasBlur=bpx>=1;
        /* 1) fondo desenfocado y frío (o foto nítida si el desenfoque está en 0) */
        var BG=hasBlur?blurTo(G,bpx,true):G;
        x.drawImage(BG,0,0);
        if(hasBlur||true){
          x.save();x.globalCompositeOperation='multiply';x.fillStyle='rgb(209,209,209)';x.fillRect(0,0,W,H);
          var cg=x.createLinearGradient(0,0,0,H);cg.addColorStop(0,'rgb('+mix(255,80,.9)+','+mix(255,120,.9)+','+mix(255,215,.9)+')');cg.addColorStop(1,'rgb(18,34,120)');
          x.fillStyle=cg;
          if(M){x.fillRect(0,0,W,H)}else{x.globalAlpha=.9;x.fillRect(0,0,W,H)}
          x.restore();
        }
        if(dk>.02){ /* cuarto muy claro: oscurecer el fondo (nunca a la persona, que se pinta encima) */
          x.save();x.globalCompositeOperation='multiply';x.globalAlpha=dk;
          var dg=x.createLinearGradient(0,0,0,H);dg.addColorStop(0,'#0b2a9a');dg.addColorStop(.55,'#0a1c6e');dg.addColorStop(1,'#050c3c');x.fillStyle=dg;x.fillRect(0,0,W,H);x.restore();
        }
        return tick().then(function(){
          /* 2) prismas de luz */
          var P=prismLayer(W,H,fx,fy,seed,look.light,!!M);
          if(!M){var px=P.getContext('2d');px.save();px.globalCompositeOperation='destination-out';ellipse(px,fx,fy,.38*W,.40*H,[[0,'rgba(0,0,0,1)'],[.6,'rgba(0,0,0,1)'],[1,'rgba(0,0,0,0)']],W,H);px.restore()}
          x.save();x.globalCompositeOperation='screen';x.drawImage(P,0,0);x.restore();
          /* 3) la persona (nítida) encima */
          var S=mk(W,H),sx=S.getContext('2d');sx.drawImage(G,0,0);
          if(M){sx.save();sx.globalCompositeOperation='destination-in';sx.drawImage(M,0,0);sx.restore()}
          else{sx.save();sx.globalCompositeOperation='destination-in';
            ellipse(sx,fx,fy,.34*W,.42*H,[[0,'rgba(0,0,0,1)'],[.45,'rgba(0,0,0,1)'],[1,'rgba(0,0,0,0)']],W,H);sx.restore()}
          if(!hasBlur){/* sin desenfoque: la foto completa */ x.drawImage(G,0,0)}
          x.drawImage(S,0,0);
          if(dk>.02&&M){ /* con recorte: oscurecer solo el fondo ya está hecho por el frío; aquí un toque */ }
          /* 4) calidez suave sobre la persona, luz de borde y viñeta fría */
          x.save();x.globalCompositeOperation='soft-light';
          ellipse(x,fx,fy,.34*W,.30*H,[[0,'rgba(255,176,90,.30)'],[1,'rgba(255,176,90,0)']],W,H);
          ellipse(x,fx+.28*W,fy-.18*H,.5*W,.4*H,[[0,'rgba(255,150,60,.16)'],[1,'rgba(255,150,60,0)']],W,H);x.restore();
          x.save();x.globalCompositeOperation='screen';
          ellipse(x,fx+.30*W,fy-.20*H,.34*W,.26*H,[[0,'rgba(255,170,80,.14)'],[1,'rgba(255,170,80,0)']],W,H);
          ellipse(x,fx-.34*W,fy+.30*H,.40*W,.30*H,[[0,'rgba(60,130,255,.22)'],[1,'rgba(60,130,255,0)']],W,H);x.restore();
          x.save();x.globalCompositeOperation='multiply';
          ellipse(x,fx,fy,.66*W,.58*H,[[0,'rgb(255,255,255)'],[.38,'rgb(255,255,255)'],[.68,'rgb(120,150,225)'],[.88,'rgb(40,62,150)'],[1,'rgb(10,18,70)']],W,H);x.restore();
          return tick();
        }).then(function(){
          bloom(out,look.bloom);
          return tick();
        }).then(function(){
          /* 5) intensidad general: mezcla con la foto original */
          var fin=mk(W,H),fx_=fin.getContext('2d');
          if(look.strength<.995){fx_.drawImage(orig,0,0);fx_.globalAlpha=clamp(look.strength,0,1)}
          fx_.drawImage(out,0,0);fx_.globalAlpha=1;
          finish(fin,look.ca*look.strength,look.grain*.1*(look.strength>0?1:0),seed);
          return fin.toDataURL('image/jpeg',.84);
        });
      });
    });
  }

  /* ---------- recorte de personas (opcional, solo si hay internet; si falla se usa el desenfoque simple) ---------- */
  var seg=null;
  var MP_BASE='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1';
  var MP_MODEL='https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';
  function loadSeg(){
    if(seg)return seg;
    seg=new Function('u','return import(u)')(MP_BASE+'/vision_bundle.mjs').then(function(m){
      return m.FilesetResolver.forVisionTasks(MP_BASE+'/wasm').then(function(fs){
        return m.ImageSegmenter.createFromOptions(fs,{baseOptions:{modelAssetPath:MP_MODEL},runningMode:'IMAGE',outputConfidenceMasks:true,outputCategoryMask:false});
      });
    });
    seg.catch(function(){seg=null});
    return seg;
  }
  function personMask(src){
    var id=idOf(src);if(masks[id])return masks[id];
    var p=Promise.all([loadSeg(),loadImg(src)]).then(function(a){
      var sg=a[0],im=a[1],res=sg.segment(im),bgm=res.confidenceMasks&&res.confidenceMasks[0];
      if(!bgm)throw new Error('sin mascara');
      var mw=bgm.width,mh=bgm.height,f=bgm.getAsFloat32Array(),c=mk(mw,mh),cx=c.getContext('2d'),d=cx.createImageData(mw,mh),sum=0,i;
      for(i=0;i<f.length;i++){var pr=clamp(1-f[i],0,1);pr=pr<.25?0:pr>.75?1:(pr-.25)/.5;sum+=pr;var v=pr*255;d.data[i*4]=255;d.data[i*4+1]=255;d.data[i*4+2]=255;d.data[i*4+3]=v}
      cx.putImageData(d,0,0);try{res.close&&res.close()}catch(e){}
      var share=sum/f.length;if(share<.015||share>.9)throw new Error('mascara dudosa');
      /* se amplía a la foto y se suaviza el borde */
      var iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,big=mk(iw,ih),bx=big.getContext('2d');bx.imageSmoothingQuality='high';bx.drawImage(c,0,0,iw,ih);
      return blurTo(big,Math.max(1,iw*.0015),false);
    });
    masks[id]=p;p.catch(function(){delete masks[id]});
    return p;
  }

  /* ---------- cola de trabajo y caché ---------- */
  function keyOf(src,look,o){
    return idOf(src)+'|'+[look.strength,look.light,look.blur,look.bloom,look.ca,look.grain].map(r2).join(',')+'|'+r2(o.fx)+','+r2(o.fy)+'|'+(o.cut?1:0)+'|'+o.aspectName;
  }
  function remember(k,v){cache[k]=v;lastBy[k.split('|')[0]]=v;order.push(k);while(order.length>MAXC){delete cache[order.shift()]}}
  function notify(){listeners.forEach(function(f){try{f({pending:pending,total:total})}catch(e){}})}
  function pump(){
    if(running||!queue.length)return;
    running=true;var job=queue.shift();
    job().then(function(){},function(){}).then(function(){running=false;pending=Math.max(0,pending-1);if(!pending)total=0;notify();pump()});
  }
  /* Pide la versión con efecto; devuelve la imagen lista o null (y la prepara en segundo plano). */
  function get(src,look,o){
    var k=keyOf(src,look,o);
    if(cache[k])return cache[k];
    if(!inflight[k]){
      inflight[k]=true;pending++;total++;notify();
      queue.push(function(){
        var cutP=o.cut?personMask(src).catch(function(){return null}):Promise.resolve(null);
        return cutP.then(function(m){
          return bake(src,{look:look,fx:o.fx,fy:o.fy,aspect:o.aspect,mask:m,maxSide:o.maxSide}).then(function(u){remember(k,u);if(o.cut&&!m)RS.cutFailed=true})
        }).catch(function(){remember(k,src)}).then(function(){delete inflight[k]});
      });
      pump();
    }
    return null;
  }
  /* Espera a que estén listas todas las fotos que se pidieron. */
  function whenIdle(){return new Promise(function(res){if(!pending){res();return}var f=function(st){if(!st.pending){listeners.splice(listeners.indexOf(f),1);res()}};listeners.push(f)})}

  return {LOOK0:LOOK0,lookOf:lookOf,get:get,whenIdle:whenIdle,bake:bake,pending:function(){return pending},lastFor:function(src){return lastBy[idOf(src)]||null},onProgress:function(f){listeners.push(f)},personMask:personMask,cutFailed:false,
          isReady:function(src,look,o){return !!cache[keyOf(src,look,o)]},keyOf:keyOf,idOf:idOf};
})();
