/* The Last Signal — original, self-contained physical clue artwork. */
(function (root) {
  'use strict';
  const NS = root.LastSignal = root.LastSignal || {};
  const cache = new Map();
  const names = {
    photo:'낡은 책장 사진', tide:'조수 기록판', acetate:'구멍 뚫린 필름', tideOverlay:'기록판 위의 필름',
    weather:'기상 관측 기록', chronology:'시계가 그려진 쪽지', painting:'추상화', paintingUV:'자외선 아래의 그림',
    atlas:'해안 관측 구역도', starcard:'밤의 해안 사진', stamp:'원판 교정 인장', morse:'신호 부호표', beacon:'등대의 점멸 기록',
    radio:'수신된 문자열', chart:'해도', relations:'기호가 적힌 종이', stripA:'그림이 있는 띠', stripB:'잘라낸 띠',
    finale:'빛 위에 겹친 두 띠', cipher:'회전 문자판'
  };
  const ink = '#273b45', muted = '#7b8177', paper = '#e9dfc5', gold = '#bc9c58';
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])); }
  function txt(s,x,y,size=24,fill=ink,extra='') { return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${esc(s)}</text>`; }
  function line(x1,y1,x2,y2,color=ink,w=2,extra='') { return `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${w}" ${extra}/>`; }
  function dots(x,y,n,color=ink,r=3,gap=10) { let s=''; for(let i=0;i<n;i++)s+=`<circle cx="${x+(i-(n-1)/2)*gap}" cy="${y}" r="${r}" fill="${color}"/>`;return s; }
  function sym(id,x,y,size=48,color=ink) {
    let d='';
    if(id==='circle')d='<circle r="25"/>';
    else if(id==='triangle')d='<path d="M0-29L29 24H-29Z"/>';
    else if(id==='diamond')d='<path d="M0-31L27 0 0 31-27 0Z"/>';
    else if(id==='square')d='<path d="M-25-25H25V25H-25Z"/>';
    else if(id==='star')d='<path d="M0-32L8-11 30-10 13 4 18 27 0 14-18 27-13 4-30-10-8-11Z"/>';
    else if(id==='moon')d='<path d="M13-29A30 30 0 1 0 13 29A32 32 0 0 1 13-29Z"/>';
    else if(id==='sun')d='<circle r="17"/><path d="M0-31V-24M0 24V31M-31 0H-24M24 0H31M-22-22L-17-17M17 17L22 22M22-22L17-17M-17 17L-22 22" fill="none" stroke="currentColor" stroke-width="4"/>';
    else if(id==='anchor')d='<circle cy="-25" r="7" fill="none" stroke="currentColor" stroke-width="5"/><path d="M0-18V27M-17-7H17M-27 5Q-27 27 0 30Q27 27 27 5M-30 13L-27 3-17 9M30 13L27 3 17 9" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>';
    else if(id==='bird')d='<path d="M-33 1Q-17-20 0-2Q17-20 33 1Q17-7 0 12Q-17-7-33 1Z"/>';
    else if(id==='lighthouse')d='<path d="M-15 28L-10-13H10L15 28ZM-15-13V-24H15V-13ZM-18-24L0-34 18-24Z"/><path d="M-11 4H11M-12 17H12" stroke="#e9dfc5" stroke-width="6"/><path d="M-22-20L-36-27M22-20L36-27" fill="none" stroke="currentColor" stroke-width="3"/>';
    else if(id==='bell')d='<path d="M-24 14Q-16 6-16-9Q-16-24 0-24Q16-24 16-9Q16 6 24 14Z" fill="none" stroke="currentColor" stroke-width="4"/><path d="M-10 21Q0 31 10 21M0-30V-24" fill="none" stroke="currentColor" stroke-width="4"/>';
    else if(id==='cloud')d='<path d="M-21 18A13 13 0 0 1-24-8A18 18 0 0 1 9-16A15 15 0 0 1 26 5A9 9 0 0 1 22 18Z" fill="none" stroke="currentColor" stroke-width="3.5"/>';
    else if(id==='clock')d='<circle r="27" fill="none" stroke="currentColor" stroke-width="4"/><path d="M-7-34H7M0-34V-28M0-23V-19M23 0H19M0 23V19M-23 0H-19M16-16L14-14M16 16L14 14M-16 16L-14 14M-16-16L-14-14" stroke="currentColor" stroke-width="3" fill="none"/><circle r="2.8"/>';
    else if(id==='register')d='<path d="M-17-28H28V28H-28V-17Z" fill="none" stroke="currentColor" stroke-width="4"/><path d="M-28-17L-17-28M-16-14H13M-16-3H19M-16 8H19M-16 19H4" fill="none" stroke="currentColor" stroke-width="2"/>';
    else if(id==='locker')d='<path d="M-18-28H28V28H-28V-18Z" fill="none" stroke="currentColor" stroke-width="3"/><rect x="-20" y="-6" width="40" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M-10-4V9M0-4V9M10-4V9M-16-17H15M-16 18H15" stroke="currentColor" stroke-width="2" fill="none"/>';
    else if(id==='relay')d='<path d="M-18-29H29V29H-29V-18Z" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="20" cy="-21" r="2"/><circle cx="-21" cy="21" r="2"/><circle cx="21" cy="21" r="2"/>'+Array.from({length:9},(_,i)=>`<circle cx="${(i%3-1)*13}" cy="${(Math.floor(i/3)-1)*13}" r="4" fill="none" stroke="currentColor" stroke-width="2"/>`).join('');
    else if(id==='rotor')d='<circle r="27" fill="none" stroke="currentColor" stroke-width="3"/><circle r="17" fill="none" stroke="currentColor" stroke-width="2"/><circle r="4"/><path d="M-5-33V-24H5V-33M15-19A24 24 0 0 1 24 6M19 1L24 7 29 1" stroke="currentColor" stroke-width="3" fill="none"/>';
    else if(id==='compass')d='<path d="M0-29L7 0 0 29-7 0ZM-29 0L0-7 29 0 0 7Z" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M0-29L7 0H0Z"/>';
    else if(id==='wallclock')d='<path d="M-25-29H25V23H-25Z" fill="none" stroke="currentColor" stroke-width="3"/><circle cy="-7" r="19" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M0-22V-18M15-7H11M0 8V4M-15-7H-11M-18 17H18M-6 25H6V30H-6Z" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cy="-7" r="2"/>';
    else if(id==='disc')d='<circle r="28" fill="none" stroke="currentColor" stroke-width="3"/><circle r="16" fill="none" stroke="currentColor" stroke-width="2"/><circle r="3"/><path d="M0-32V-22M32 0H22M0 32V22M-32 0H-22" stroke="currentColor" stroke-width="3"/>';
    else if(id==='ray')d='<path d="M-23 19L-17-15H-4L2 19ZM-20-15L-10-25 0-15ZM9-18L32-28M9-10H35M9-2L32 8" fill="none" stroke="currentColor" stroke-width="3"/>';
    else if(id==='waves')d='<path d="M-30-13Q-20-23-10-13T10-13T30-13M-30 2Q-20-8-10 2T10 2T30 2M-30 17Q-20 7-10 17T10 17T30 17" fill="none" stroke="currentColor" stroke-width="4"/>';
    else if(id==='notch')d='<path d="M-28-17L-17-28H17L28-17V17L17 28H-17L-28 17Z" fill="none" stroke="currentColor" stroke-width="4"/><path d="M-28-7L-17 0-28 7" fill="none" stroke="currentColor" stroke-width="4"/>';
    else if(id==='shell')d='<path d="M-27 10Q-33-17-12-25Q0-33 12-25Q33-17 27 10L9 26H-9ZM0-25V24M-13-22L-5 23M13-22L5 23M-25-12L-8 23M25-12L8 23" fill="none" stroke="currentColor" stroke-width="3"/>';
    else if(id==='fish')d='<path d="M-26 0Q-4-28 23 0L34-15V15L23 0Q-4 28-26 0Z"/><circle cx="-13" cy="-3" r="3" fill="#e9dfc5"/>';
    return `<g transform="translate(${x} ${y}) scale(${size/64})" fill="${color}" color="${color}">${d}</g>`;
  }
  function icon(id,options={}) {
    const color=typeof options.color==='string'&&/^(?:#[0-9a-f]{3,8}|currentColor)$/i.test(options.color)?options.color:gold;
    const size=Number.isFinite(Number(options.size))?Math.max(16,Math.min(512,Number(options.size))):64;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 80 80" aria-hidden="true">${sym(id,40,40,64,color)}</svg>`;
  }
  function wStar(x,y,scale=1,color=ink,wide=false) {
    const p=[[-18,-10],[-9,10],[0,-4],[9,10],[18,-10]];
    return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="${p.map((q,i)=>(i?'L':'M')+q.join(' ')).join('')}" stroke="${color}" stroke-width="${wide?1.2:1}" fill="none" opacity=".8"/>${p.map((q,i)=>`<circle cx="${q[0]}" cy="${q[1]}" r="${i===2?2.6:2}" fill="${color}"/>`).join('')}</g>`;
  }
  function compass(x,y,size=38) {
    return `<g transform="translate(${x} ${y}) scale(${size/40})"><path d="M0-24L7 0 0 24-7 0ZM-24 0L0-7 24 0 0 7Z" fill="none" stroke="${ink}" stroke-width="1.6"/><path d="M0-24L7 0H0Z" fill="${ink}"/>${txt('N',0,-30,12,ink,'text-anchor="middle"')}${txt('E',32,4,10,ink,'text-anchor="middle"')}${txt('S',0,37,10,ink,'text-anchor="middle"')}${txt('W',-33,4,10,ink,'text-anchor="middle"')}</g>`;
  }
  function shell(body,title,bg=paper) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600" role="img" aria-label="${esc(title)}"><defs><linearGradient id="paper" x2="1" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="${bg==='#e9dfc5'?'#d6c9a8':bg}"/></linearGradient><pattern id="grain" width="27" height="29" patternUnits="userSpaceOnUse"><circle cx="3" cy="7" r=".6" fill="#493c27" opacity=".13"/><path d="M18 17h3M7 24h2" stroke="#493c27" stroke-width=".5" opacity=".1"/></pattern></defs><rect width="900" height="600" rx="10" fill="url(#paper)"/><rect x="20" y="20" width="860" height="560" rx="4" fill="none" stroke="${ink}" stroke-width="1" opacity=".19"/><rect width="900" height="600" fill="url(#grain)"/><g font-family="Segoe UI,Arial,sans-serif" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
  }
  function header(label,motif='') {
    return `${txt(label,64,71,17,muted,'letter-spacing="4"')}${line(64,88,836,88,ink,1,'opacity=".22"')}${motif?sym(motif,813,55,34,muted):''}`;
  }
  const tideValues=[[4,7,2,9],[1,8,5,3],[6,0,9,2],[3,5,4,8]];
  const holes=[[0,1],[1,3],[2,0],[3,2]];
  function tideGrid() {
    let s='';
    for(let r=0;r<4;r++)for(let c=0;c<4;c++)s+=`<rect x="${270+c*90}" y="${130+r*90}" width="90" height="90" fill="${(r+c)%2?'#e7dfca':'#ded3b7'}" stroke="${ink}" stroke-width="1.5"/>${txt(tideValues[r][c],315+c*90,190+r*90,43,ink,'text-anchor="middle"')}`;
    return `<path d="M250 110H274L250 134Z" fill="${ink}"/>${s}`;
  }
  function acetateGraphic(rotation,overlay=false) {
    const q=((Number(rotation)||0)%4+4)%4;
    const holesMarkup=holes.map(([r,c])=>`<circle cx="${315+c*90}" cy="${175+r*90}" r="27" fill="black"/>`).join('');
    return `<defs><mask id="acetate-cut"><rect x="250" y="110" width="400" height="400" fill="white"/><path d="M250 110H276L250 136Z" fill="black"/>${holesMarkup}</mask></defs><g transform="rotate(${q*90} 450 310)"><rect x="250" y="110" width="400" height="400" rx="2" fill="${overlay?'#374943':'#71847b'}" opacity="${overlay?'.98':'.76'}" mask="url(#acetate-cut)"/><path d="M276 110H650V510H250V136Z" fill="none" stroke="#acb6a7" stroke-width="2"/>${holes.map(([r,c],i)=>`<circle cx="${315+c*90}" cy="${175+r*90}" r="28" stroke="#a6b8a5" fill="none" stroke-width="2"/>${dots(315+c*90,137+r*90,i+1,'#e8e1bf',3,10)}`).join('')}</g>`;
  }
  function photoArt() {
    let s='<defs><linearGradient id="shelfshade" x2="0" y2="1"><stop stop-color="#554b38"/><stop offset="1" stop-color="#211f1a"/></linearGradient></defs><rect x="34" y="29" width="832" height="540" fill="#d3c5a3"/><rect x="53" y="48" width="794" height="498" fill="#66543b"/><rect x="97" y="84" width="706" height="425" fill="url(#shelfshade)"/><path d="M97 146Q310 111 514 137T803 118M98 202Q414 182 801 210M97 483Q393 463 803 477" fill="none" stroke="#8d7756" stroke-width="4" opacity=".36"/>';
    const books=[['anchor',179,142,338,'#75684a'],['moon',358,175,305,'#5f6b55'],['bird',537,128,352,'#8b6850'],['lighthouse',716,155,325,'#71634b']];
    books.forEach(([id,x,y,h,color],i)=>{s+=`<rect x="${x-61}" y="${y}" width="122" height="${h}" rx="5" fill="${color}" stroke="#b2a181" stroke-width="2"/><path d="M${x-49} ${y+8}V${y+h-4}" stroke="#372f24" stroke-width="9" opacity=".5"/><rect x="${x-50}" y="${y+37}" width="100" height="9" fill="#c4ae7d" opacity=".7"/><rect x="${x-50}" y="${y+h-40}" width="100" height="9" fill="#c4ae7d" opacity=".7"/>`+sym(id,x,y+h*.55,82,'#d2c29b');s+=line(x-36,y+61,x+29,y+55,'#c6b18a',1.3,'opacity=".3"');});
    s+='<rect x="78" y="480" width="746" height="29" fill="#9a7c52"/><path d="M78 486Q267 499 432 490T824 493M79 502Q371 505 824 499" fill="none" stroke="#5d4932" stroke-width="3"/><rect x="74" y="74" width="27" height="445" fill="#8d714b"/><rect x="800" y="74" width="27" height="445" fill="#8d714b"/><path d="M807 331L817 321 823 336 811 345Z" fill="#d6bd8c"/><circle cx="88" cy="106" r="5" fill="#3c3528"/><circle cx="814" cy="498" r="5" fill="#3c3528"/><path d="M60 90L79 76M841 538L823 548M35 34L141 29M866 551L755 570" fill="none" stroke="#b4a07c" stroke-width="3"/><path d="M42 312L858 286" stroke="#e9d9b5" stroke-width="2" opacity=".13"/>';
    return shell(s,names.photo,'#bcaf90');
  }
  function weatherArt() {
    let s=header('OBSERVATIONS','bell');
    s+=line(142,125,142,510,muted,1)+line(390,125,390,510,muted,1)+line(655,125,655,510,muted,1);
    const rows=[{time:'05:25',type:'wind',mark:'NE',val:'12°'},{time:'06:10',type:'bell',mark:'—',val:'—'},{time:'09:40',type:'wind',mark:'E',val:'17°'},{time:'18:25',type:'cloud',mark:'NW',val:'9°'}];
    rows.forEach((r,i)=>{const y=155+i*94;s+=line(92,y+55,810,y+55,muted,1,'opacity=".45"')+txt(r.time,270,y+23,35,ink,'text-anchor="middle"')+txt(r.mark,523,y+20,25,ink,'text-anchor="middle"')+txt(r.val,727,y+20,25,ink,'text-anchor="middle"');if(r.type==='wind')s+=`<path d="M81 ${y+4}H117L107 ${y-5}M81 ${y+18}H110" stroke="${ink}" stroke-width="3" fill="none"/>`;else s+=sym(r.type,103,y+6,44);});
    s+=`<path d="M690 530q16-12 23 0t25-1 22 0" stroke="${muted}" fill="none" stroke-width="2"/>`;
    return shell(s,names.weather);
  }
  function paintingArt(uv) {
    let s='<rect x="69" y="49" width="762" height="502" fill="#493d31"/><rect x="88" y="67" width="724" height="466" fill="#938c69"/><path d="M88 479L320 67H493L239 533H88Z" fill="#c3b58b"/><path d="M367 533L603 67H812V533Z" fill="#506c70"/><circle cx="641" cy="222" r="118" fill="#a27956"/><path d="M98 416Q340 235 500 411T812 336" stroke="#394f4e" stroke-width="61" fill="none"/><path d="M94 456Q340 275 500 451T812 376" stroke="#d0bd90" stroke-width="13" fill="none"/>';
    if(uv) {
      s+='<rect x="88" y="67" width="724" height="466" fill="#131c42" opacity=".8"/><path d="M310 132H600V464H284V158Z" fill="#192f3c" stroke="#a8d9b6" stroke-width="2"/><path d="M284 158L310 132M315 447H570" fill="none" stroke="#b7ffc8" stroke-width="2"/>'+sym('relay',697,157,64,'#a9edb6');
      for(let r=0;r<3;r++)s+=line(358,204+r*92,542,204+r*92,'#7aa995',2,'opacity=".5"');
      for(let c=0;c<3;c++)s+=line(358+c*92,204,358+c*92,388,'#7aa995',2,'opacity=".5"');
      const target=Array(9).fill(false);[0,2,4,6].forEach(i=>[i,i%3?i-1:-1,i%3<2?i+1:-1,i>2?i-3:-1,i<6?i+3:-1].forEach(j=>{if(j>=0)target[j]=!target[j];}));
      target.forEach((on,i)=>{const x=358+(i%3)*92,y=204+Math.floor(i/3)*92;s+=`<circle cx="${x}" cy="${y}" r="25" fill="${on?'#beffd0':'#213746'}" stroke="${on?'#e1ffe1':'#789390'}" stroke-width="2"/>${on?`<circle cx="${x}" cy="${y}" r="15" fill="#ddffe2"/>`:''}`;});
      s+='<rect x="410" y="437" width="80" height="19" rx="3" fill="none" stroke="#b7ffc8" stroke-width="2"/><path d="M420 437V456M480 437V456M601 278H664V184H686" fill="none" stroke="#92bea8" stroke-width="2"/>';
    } else s+='<path d="M301 143H321L301 163Z" fill="#d2bd8f" opacity=".45"/>';
    return shell(s,uv?names.paintingUV:names.painting,'#6f6651');
  }
  const starShapes=[[[0,-17],[-14,5],[14,9]], [[-16,0],[-5,-12],[9,-3],[15,15]], [[-15,-14],[14,-14],[0,15],[-15,-14]], [[-19,8],[-7,-14],[4,6],[18,-11]], [[-15,-15],[-12,12],[12,12],[16,-14]]];
  function coastSketch(x,y,scale=1,pattern=5,night=false) {
    const p=pattern===5?[[-18,-10],[-9,10],[0,-4],[9,10],[18,-10]]:starShapes[pattern];
    const land=night?'#253f40':'#849080',edge=night?'#69857b':'#b8c2a3',light=night?'#f3e2a4':'#f4df9b';
    return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-34 27L-28 15${p.map(q=>'L'+q[0]+' '+(q[1]+4)).join('')}L30 14 35 27Z" fill="${land}" stroke="${edge}" stroke-width=".8"/><path d="M-32 30H32M-26 34H-6M6 34H29" fill="none" stroke="${edge}" stroke-width=".7" opacity=".45"/>${p.map((q,i)=>`<path d="M${q[0]-1.2} ${q[1]+6}V${q[1]+1}H${q[0]+1.2}V${q[1]+6}" fill="#b6b692" stroke="${edge}" stroke-width=".6"/>${night?`<circle cx="${q[0]}" cy="${q[1]}" r="${i===2?3.1:2.6}" fill="${light}" opacity=".12"/>`:''}<circle cx="${q[0]}" cy="${q[1]}" r="${i===2?1.3:1}" fill="${light}"/>`).join('')}</g>`;
  }
  function nightPhotoArt() {
    let s='<rect x="67" y="54" width="768" height="492" fill="#c9b993"/><rect x="82" y="70" width="738" height="459" fill="#142a36"/><path d="M83 226Q263 201 404 219T820 201V279H83Z" fill="#213c46"/><path d="M83 308Q309 286 820 310V529H83Z" fill="#1c3842"/><path d="M83 173Q270 146 491 170T820 155" fill="none" stroke="#6f8586" stroke-width="19" opacity=".1"/>';
    s+=coastSketch(450,270,7.7,5,true);
    s+='<path d="M92 488H176M686 501H806M115 513H270M612 514H698" stroke="#879c8e" stroke-width="2" opacity=".24"/><path d="M69 64L177 55M834 537L731 551" fill="none" stroke="#ad9a75" stroke-width="3"/>';
    return shell(s,names.starcard,'#b7ac8b');
  }
  function atlasArt() {
    const gx=224,gy=91,cell=48;
    let s='<rect x="47" y="34" width="806" height="532" rx="3" fill="#203b42"/>'+txt('COASTAL OBSERVATION SECTORS',77,68,15,'#cbbd91','letter-spacing="2"');
    s+=`<rect x="${gx}" y="${gy}" width="432" height="432" fill="#29474d"/>`;
    for(let i=0;i<=9;i++)s+=line(gx+i*cell,gy,gx+i*cell,gy+cell*9,'#66858b',.8,'opacity=".55"')+line(gx,gy+i*cell,gx+cell*9,gy+i*cell,'#66858b',.8,'opacity=".55"');
    for(let i=1;i<=9;i++)s+=txt(i,gx+(i-.5)*cell,gy+cell*9+25,17,'#d4cba9','text-anchor="middle"')+txt(i,gx-20,gy+(9-i+.5)*cell+6,17,'#d4cba9','text-anchor="middle"');
    const coords=[[2,8],[5,7],[3,5],[8,8],[4,2]];
    coords.forEach(([x,y],n)=>{s+=coastSketch(gx+(x-.5)*cell,gy+(9-y+.5)*cell-5,.64,n);});
    s+=coastSketch(gx+6.5*cell,gy+6.5*cell-5,.64,5);
    s+=`<path d="M268 556H610M603 550L610 556 603 562M182 478V138M176 145L182 138 188 145" fill="none" stroke="#b4c0a0" stroke-width="1.5"/>`;
    return shell(s,names.atlas,'#897f62');
  }
  function morseGroup(code,x,y,scale=1,color=ink) {
    let s='',cursor=0;
    for(const ch of code) { if(ch==='.') {s+=`<circle cx="${x+cursor+5*scale}" cy="${y}" r="${5*scale}" fill="${color}"/>`;cursor+=23*scale;} else {s+=`<rect x="${x+cursor}" y="${y-4*scale}" width="${25*scale}" height="${8*scale}" rx="${2*scale}" fill="${color}"/>`;cursor+=39*scale;} }
    return s;
  }
  function morseArt() {
    let s=header('INTERNATIONAL SIGNALS','ray');
    const codes=['-----','.----','..---','...--','....-','.....','-....','--...','---..','----.'];
    codes.forEach((code,i)=>{const col=i<5?0:1,row=i%5,x=143+col*410,y=159+row*78;s+=txt(i,x,y+9,29,ink,'text-anchor="middle"')+morseGroup(code,x+48,y,.91)+line(x-30,y+35,x+285,y+35,muted,1,'opacity=".4"');});
    s+=sym('ray',106,552,35)+`<path d="M139 551H170M164 546L170 551 164 556" fill="none" stroke="${ink}" stroke-width="1.5"/>`;
    for(let i=0;i<4;i++)s+=`<rect x="${187+i*37}" y="536" width="28" height="31" rx="2" fill="none" stroke="${muted}" stroke-width="1.4"/>`;
    s+=`<path d="M348 551H387M380 546L387 551 380 556" fill="none" stroke="${ink}" stroke-width="1.5"/>`;
    for(let i=0;i<4;i++)s+=`<rect x="${411+i*40+(i===3?12:0)}" y="536" width="29" height="31" rx="2" fill="none" stroke="${muted}" stroke-width="1.4"/>`;
    s+=`<circle cx="529" cy="564" r="2.8" fill="${ink}"/>`+txt('MHz',604,560,22,ink);
    return shell(s,names.morse);
  }
  function beaconArt() {
    let s=header('','ray')+'<rect x="102" y="110" width="696" height="180" fill="#172f3a" stroke="#667c73" stroke-width="2"/>'+coastSketch(450,159,3.65,5,true);
    s+=`<path d="M450 133L450 120M437 137L428 130M463 137L472 130" fill="none" stroke="#e8d99b" stroke-width="2" opacity=".6"/>`;
    s+=['.----','-----','...--','--...'].map((c,i)=>morseGroup(c,327,342+i*60,1.08)).join('');
    return shell(s,names.beacon);
  }
  const routes={NORTH:['E','N','E','S','E'],EAST:['N','E','E','S','S'],SOUTH:['W','N','N','E','N'],WEST:['E','S','W','S','E']};
  function chartArt() {
    let s=header('COASTAL SURVEY','anchor');
    Object.entries(routes).forEach(([name,route],i)=>{
      const bx=66+(i%2)*422,by=113+Math.floor(i/2)*225,gx=bx+61,gy=by+42,cell=27;
      s+=txt(name,bx+12,by+20,18,ink,'letter-spacing="2"')+compass(bx+324,by+84,45);
      for(let j=0;j<=6;j++)s+=line(gx+j*cell,gy,gx+j*cell,gy+6*cell,muted,.7,'opacity=".5"')+line(gx,gy+j*cell,gx+6*cell,gy+j*cell,muted,.7,'opacity=".5"');
      let pos=name==='NORTH'?[1,3]:name==='EAST'?[2,3]:name==='SOUTH'?[3,4]:[2,2];
      const points=[pos.slice()];route.forEach(d=>{const v={N:[0,-1],E:[1,0],S:[0,1],W:[-1,0]}[d];pos=[pos[0]+v[0],pos[1]+v[1]];points.push(pos.slice());});
      s+=`<path d="${points.map((p,j)=>(j?'L':'M')+(gx+p[0]*cell)+' '+(gy+p[1]*cell)).join('')}" fill="none" stroke="#5b726c" stroke-width="4"/>`;
      s+=`<circle cx="${gx+points[0][0]*cell}" cy="${gy+points[0][1]*cell}" r="7" fill="${paper}" stroke="${ink}" stroke-width="2.6"/>`+sym('anchor',gx+pos[0]*cell,gy+pos[1]*cell,26,ink);
      s+=line(bx,by+211,bx+356,by+211,muted,1,'opacity=".35"');
    });
    return shell(s,names.chart);
  }
  const stripRows=[['diamond','circle','moon','star','sun','triangle'],['circle','star','sun','triangle','moon','circle']];
  function stripBase() {
    let s='<path d="M97 177H808V432H97V327L112 312 97 297Z" fill="#e4dabb" stroke="#677870" stroke-width="2"/>';
    for(let r=0;r<2;r++)for(let c=0;c<6;c++)s+=`<rect x="${124+c*108}" y="${203+r*102}" width="108" height="102" fill="none" stroke="#8d967e" stroke-width="1"/>`+sym(stripRows[r][c],178+c*108,254+r*102,59);
    return s;
  }
  function stripMask(combined=false) {
    let holes='';for(let c=0;c<6;c++)holes+=`<rect x="${140+c*108}" y="${219+(c%2)*102}" width="76" height="70" rx="2" fill="black"/>`;
    return `<defs><mask id="stripcut"><rect x="97" y="177" width="711" height="255" fill="white"/><path d="M97 297L112 312 97 327Z" fill="black"/>${holes}</mask></defs><rect x="97" y="177" width="711" height="255" fill="${combined?'#344942':'#586d62'}" opacity="${combined?'1':'.85'}" mask="url(#stripcut)"/><path d="M97 297V177H808V432H97V327L112 312Z" fill="none" stroke="#aab89e" stroke-width="2"/><path d="M128 193H778L771 188M778 193L771 198" stroke="#c4cdb2" stroke-width="1.7" fill="none"/><path d="M124 254H178L286 356 394 254 502 356 610 254 718 356H786L779 350M786 356L779 362" stroke="#c4cdb2" stroke-width="2" fill="none" mask="url(#stripcut)"/>${Array.from({length:6},(_,c)=>`<rect x="${140+c*108}" y="${219+(c%2)*102}" width="76" height="70" rx="2" fill="none" stroke="#bdc5a8" stroke-width="1"/>`).join('')}`;
  }
  function cipherArt(shift) {
    const n=((Math.trunc(Number(shift)||0)%26)+26)%26;
    let s='<circle cx="450" cy="310" r="247" fill="#bba97f" stroke="#6e6e58" stroke-width="2"/><circle cx="450" cy="310" r="207" fill="#d9ccaa" stroke="#6e6e58" stroke-width="2"/><circle cx="450" cy="310" r="169" fill="#ede3c7" stroke="#6e6e58" stroke-width="2"/><circle cx="450" cy="310" r="129" fill="#c4b693" stroke="#6e6e58" stroke-width="2"/>';
    const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for(let i=0;i<26;i++){
      const a=-i*Math.PI*2/26-Math.PI/2,x1=450+Math.cos(a)*226,y1=310+Math.sin(a)*226,x2=450+Math.cos(a)*149,y2=310+Math.sin(a)*149;
      s+=txt(alphabet[i],x1,y1+7,22,ink,'text-anchor="middle"')+txt(alphabet[(i+n)%26],x2,y2+7,22,ink,'text-anchor="middle"');
      const b=-(i-.5)*Math.PI*2/26-Math.PI/2;s+=line(450+Math.cos(b)*208,310+Math.sin(b)*208,450+Math.cos(b)*242,310+Math.sin(b)*242,'#8e886e',1)+line(450+Math.cos(b)*130,310+Math.sin(b)*130,450+Math.cos(b)*167,310+Math.sin(b)*167,'#8e886e',1);
    }
    s+='<path d="M450 142V104M442 112L450 104 458 112" stroke="#9b593d" stroke-width="2.5" fill="none"/><path d="M450 206V184M445 191L450 184 455 191" stroke="#9b593d" stroke-width="2" fill="none"/><path d="M441 56V70H459V56" stroke="#8d6447" stroke-width="3" fill="none"/><circle cx="450" cy="310" r="15" fill="#8b805f" stroke="#4e5b50" stroke-width="2"/><circle cx="450" cy="310" r="5" fill="#c7b789"/>';
    s+=sym('rotor',450,390,34,'#8a8266');
    return shell(s,names.cipher);
  }
  function svg(id,options={}) {
    switch(id){
      case 'photo':return photoArt();
      case 'tide':return shell(header('TIDAL REGISTER','register')+tideGrid(),names.tide);
      case 'acetate':return shell(header('','register')+acetateGraphic(0),names.acetate,'#c8c7af');
      case 'tideOverlay':return shell(header('TIDAL REGISTER','register')+tideGrid()+acetateGraphic(options.rotation,true),names.tideOverlay);
      case 'weather':return weatherArt();
      case 'chronology':return shell(sym('clock',204,300,126)+line(287,300,611,300,ink,3)+`<path d="M593 287L611 300 593 313" fill="none" stroke="${ink}" stroke-width="3"/>`+txt('+ 95 min',449,266,40,ink,'text-anchor="middle"')+sym('bell',711,300,122),names.chronology);
      case 'painting':return paintingArt(false);
      case 'paintingUV':return paintingArt(true);
      case 'atlas':return atlasArt();
      case 'starcard':return nightPhotoArt();
      case 'stamp':return shell(header('','rotor')+`<circle cx="450" cy="304" r="169" stroke="#8f5140" stroke-width="3" fill="none"/><circle cx="450" cy="304" r="126" stroke="#8f5140" stroke-width="1.5" fill="none"/><path d="M441 124V142H459V124M450 178A126 126 0 0 1 534 210M526 207L536 211 532 200" fill="none" stroke="#8f5140" stroke-width="3"/>${Array.from({length:4},(_,i)=>{const a=-Math.PI/2+i*Math.PI*2/26;return line(450+Math.cos(a)*145,304+Math.sin(a)*145,450+Math.cos(a)*160,304+Math.sin(a)*160,'#8f5140',3);}).join('')}${txt('III',450,341,92,'#8f5140','text-anchor="middle" font-family="Georgia,serif" letter-spacing="8"')}${sym('rotor',450,414,45,'#8f5140')}`,names.stamp);
      case 'morse':return morseArt();
      case 'beacon':return beaconArt();
      case 'radio':return shell(header('','rotor')+txt('QRUWK',450,340,105,ink,'text-anchor="middle" font-family="Consolas,monospace" letter-spacing="12"')+line(215,378,685,378,muted,1),names.radio);
      case 'chart':return chartArt();
      case 'relations':return shell(header('','waves')+sym('triangle',180,144,42)+sym('circle',360,144,42)+sym('diamond',540,144,42)+sym('square',720,144,42)+sym('diamond',307,251,53)+txt('= 2 ×',420,266,42,ink,'text-anchor="middle"')+sym('triangle',557,251,53)+sym('square',307,340,53)+txt('=',378,354,42,ink,'text-anchor="middle"')+sym('circle',445,340,49)+txt('+ 1',537,354,42,ink,'text-anchor="middle"')+sym('triangle',359,426,49)+txt('<',450,440,42,ink,'text-anchor="middle"')+sym('circle',541,426,49)+txt('Σ = 18',450,527,44,ink,'text-anchor="middle"')+line(320,551,580,551,muted,1.5)+Array.from({length:6},(_,i)=>line(320+i*52,547,320+i*52,557,muted,1.5)+txt(i+1,320+i*52,576,17,muted,'text-anchor="middle"')).join(''),names.relations);
      case 'stripA':return shell(header('','notch')+stripBase(),names.stripA);
      case 'stripB':return shell(header('','notch')+stripMask(),names.stripB,'#c9c7ad');
      case 'finale':return shell(header('','notch')+`<rect x="72" y="148" width="760" height="312" rx="9" fill="#f8efcf"/>`+stripBase()+stripMask(true),names.finale);
      case 'cipher':return cipherArt(options.shift);
      default:return shell(sym('notch',450,300,90,muted),names[id]||'기록');
    }
  }
  function url(id,options={}) {
    const opts=id==='cipher'?{shift:((Math.trunc(Number(options.shift)||0)%26)+26)%26}:id==='tideOverlay'?{rotation:((Math.trunc(Number(options.rotation)||0)%4)+4)%4}:{};
    const key=id+JSON.stringify(opts);
    if(!cache.has(key))cache.set(key,'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg(id,opts)));
    return cache.get(key);
  }
  NS.Art = {svg,url,icon,names,items:{key:'작은 열쇠',acetate:'구멍 뚫린 필름',cipher:'회전 문자판',uv:'자외선 램프',fuse:'퓨즈',lens:'렌즈',stripA:'그림이 있는 띠',stripB:'잘라낸 띠'}};
})(typeof window!=='undefined'?window:globalThis);
