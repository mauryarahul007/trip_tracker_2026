/* Design-kit helpers: inline icons + phone chrome. Mockup-only. */
(function () {
  const I = {
    home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    chat: 'M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.2A8 8 0 1 1 21 12z',
    receipt: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z M8.5 8h7 M8.5 12h7 M8.5 16h4',
    swap: 'M7 8h13 M16 4l4 4-4 4 M17 16H4 M8 12l-4 4 4 4',
    users: 'M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20 M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M21 20v-1.5a4 4 0 0 0-3-3.9 M16 3.6a3.5 3.5 0 0 1 0 6.8',
    note: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M9 8h6 M9 12h6 M9 16h3',
    plus: 'M12 5v14 M5 12h14',
    minus: 'M5 12h14',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M21 21l-4.3-4.3',
    bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.9 1.9 0 0 0 3.4 0',
    sliders: 'M4 6h9 M17 6h3 M4 12h3 M11 12h9 M4 18h11 M19 18h1 M15 4v4 M9 10v4 M17 16v4',
    cl: 'M15 18l-6-6 6-6', cr: 'M9 18l6-6-6-6', cd: 'M6 9l6 6 6-6', cu: 'M18 15l-6-6-6 6',
    share: 'M12 3v12 M7 8l5-5 5 5 M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5',
    plane: 'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z',
    pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    camera: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3',
    filter: 'M3 5h18l-7 8v6l-4 2v-8z',
    check: 'M20 6 9 17l-5-5',
    x: 'M18 6 6 18 M6 6l12 12',
    dots: 'M12 12h.01 M19 12h.01 M5 12h.01',
    cal: 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M2 12h20 M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20',
    lock: 'M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z M8 11V7a4 4 0 0 1 8 0v4',
    mail: 'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M22 7l-10 6L2 7',
    trash: 'M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6 M10 11v6 M14 11v6',
    flag: 'M4 22V4 M4 4h13l-2 4 2 4H4',
    download: 'M12 3v12 M7 10l5 5 5-5 M5 21h14',
    upload: 'M12 15V3 M7 8l5-5 5 5 M5 21h14',
    spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
    trophy: 'M8 21h8 M12 17v4 M7 4h10v5a5 5 0 0 1-10 0z M7 6H4a3 3 0 0 0 3 4 M17 6h3a3 3 0 0 1-3 4',
    qr: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h3v3h-3z M20 14v.01 M14 20h3 M20 17v4',
    sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 1v2 M12 21v2 M4.2 4.2l1.4 1.4 M18.4 18.4l1.4 1.4 M1 12h2 M21 12h2 M4.2 19.8l1.4-1.4 M18.4 5.6l1.4-1.4',
    moon: 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z',
    copy: 'M9 9h11v11H9z M5 15H4V4h11v1',
    link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7 M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3 M12 17h.01',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    uprt: 'M7 17 17 7 M8 7h9v9', dnlt: 'M17 7 7 17 M16 17H7V8',
    arrr: 'M5 12h14 M13 6l6 6-6 6', arrl: 'M19 12H5 M11 6l-6 6 6 6',
    train: 'M6 3h12a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2z M4 11h16 M8 15h.01 M16 15h.01 M8 21l2-3 M16 21l-2-3',
    bed: 'M2 18v-8 M2 14h20v4 M22 14v-2a3 3 0 0 0-3-3h-7v5 M6 12h.01',
    food: 'M7 3v8 M4 3v5a3 3 0 0 0 6 0V3 M7 11v10 M18 21V3c-3 1-4 5-4 8h4',
    car: 'M5 17h14 M3 13l2-6a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 6v4H3z M7 17v2 M17 17v2 M7 13.5h.01 M17 13.5h.01',
    ticket: 'M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z M14 7v10',
    bag: 'M5 7h14l1 14H4z M9 7a3 3 0 0 1 6 0',
    coffee: 'M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z M17 10h2a2 2 0 0 1 0 4h-2 M7 2v3 M11 2v3',
    bug: 'M8 8h8v8a4 4 0 0 1-8 0z M9 5l1.5 1.5 M15 5l-1.5 1.5 M4 12h4 M16 12h4 M5 19l3-2 M19 19l-3-2',
    bulb: 'M9 18h6 M10 21h4 M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z',
    wifioff: 'M2 8.8a15 15 0 0 1 4-2.3 M10.7 5.1A15 15 0 0 1 22 8.8 M5 12.9a10 10 0 0 1 5-2.7 M14 10.3a10 10 0 0 1 5 2.6 M8.5 16.4a5 5 0 0 1 7 0 M12 20h.01 M2 2l20 20',
    refresh: 'M21 12a9 9 0 0 1-15.5 6.2L3 16 M3 12A9 9 0 0 1 18.5 5.8L21 8 M21 3v5h-5 M3 21v-5h5',
    wallet: 'M3 7a2 2 0 0 1 2-2h13v4 M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z M16 14h.01',
    route: 'M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M9 16h5a4 4 0 0 0 0-8h-1',
    clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2',
    send: 'M22 2 11 13 M22 2l-7 20-4-9-9-4z',
    image: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M9 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 16l-5-5L5 21',
    tag: 'M3 12V3h9l9 9-9 9z M7.5 7.5h.01',
    book: 'M4 4h6a3 3 0 0 1 2 1 3 3 0 0 1 2-1h6v15h-6a3 3 0 0 0-2 1 3 3 0 0 0-2-1H4z M12 5v15',
    eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    cloud: 'M18 18a4 4 0 0 0 0-8 6 6 0 0 0-11.7 1.5A3.5 3.5 0 0 0 7 18z',
    edit: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
    archive: 'M3 4h18v4H3z M5 8v12h14V8 M10 12h4',
    layers: 'M12 2 2 7l10 5 10-5z M2 17l10 5 10-5 M2 12l10 5 10-5',
    star: 'M12 2l3 7 7 .6-5.3 4.7 1.7 7.2L12 17.8 5.6 21.5l1.7-7.2L2 9.6 9 9z',
    fire: 'M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 2-2 3-3 3 0-4-1-7-4-9 0 4-4 6-4 12a7 7 0 0 0 7 8z',
    gift: 'M3 8h18v4H3z M5 12v9h14v-9 M12 8v13 M12 8a3 3 0 1 1 3-3c0 2-3 3-3 3zM12 8a3 3 0 1 0-3-3c0 2 3 3 3 3z',
    heart: 'M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z',
    thermo: 'M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z',
    fx: 'M12 2v20 M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    menu: 'M4 7h16 M4 12h16 M4 17h16'
  };
  const FILL = {
    apple: 'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701',
    google: 'M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.700h5.500a4.700 4.700 0 0 1-2 3.100v2.600h3.300c1.900-1.800 3-4.400 3-7.500zM12 22c2.700 0 5-.9 6.700-2.400l-3.300-2.600c-.9.600-2 1-3.400 1-2.600 0-4.800-1.800-5.600-4.100H3v2.600A10 10 0 0 0 12 22zM6.400 13.900a6 6 0 0 1 0-3.800V7.500H3a10 10 0 0 0 0 9zM12 6c1.500 0 2.800.5 3.800 1.500l2.900-2.900A10 10 0 0 0 3 7.500l3.400 2.600C7.200 7.800 9.400 6 12 6z',
    battery: 'M2 8.5A2.500 2.500 0 0 1 4.500 6h14A2.500 2.500 0 0 1 21 8.500v7a2.500 2.500 0 0 1-2.500 2.500h-14A2.500 2.500 0 0 1 2 15.500zM22 10v4a2 2 0 0 0 0-4z',
    signal: 'M2 16h3v5H2zM7 12h3v9H7zM12 8h3v13h-3zM17 4h3v17h-3z',
    wifi: 'M12 18.5a1.5 1.5 0 1 0 0 .01zM12 4C7.500 4 4 5.800 1 8.600l2 2.200C5.500 8.600 8.500 7 12 7s6.500 1.600 9 3.800l2-2.200C20 5.800 16.500 4 12 4zM12 10c-2.800 0-5 1-7 2.800l2 2.200c1.400-1.200 3-2 5-2s3.600.8 5 2l2-2.200C17 11 14.800 10 12 10z'
  };
  const svg = (n, cls) => {
    if (FILL[n]) return `<svg class="ic fill ${cls || ''}" viewBox="0 0 24 24"><path d="${FILL[n]}"/></svg>`;
    const d = I[n] || I.dots;
    return `<svg class="ic ${cls || ''}" viewBox="0 0 24 24">${d.split(' M').map((p, i) => `<path d="${i ? 'M' : ''}${p}"/>`).join('')}</svg>`;
  };
  window.ico = svg;


  const T = {
    goa:{code:'GOI',col:'#2F6BFF',eb:'Goa · India',name:'Goa Weekend',dates:'12–16 Nov 2026',st:'<b class="prim">Day 3 of 5</b>',av:5,bal:'<span class="badge neg">You owe ₹2,450</span>'},
    bali:{code:'DPS',col:'#8B3CF7',eb:'Bali · Indonesia',name:'Bali Escape',dates:'8–19 Jan 2027',st:'<b style="color:var(--warn)">Starts in 92 days</b>',av:6,bal:'<span class="badge">No expenses yet</span>'},
    manali:{code:'KUU',col:'#16A34A',eb:'Manali · India',name:'Manali Winter',dates:'3–8 Feb 2026',st:'<b>Ended</b>',av:4,bal:'<span class="badge pos">All settled</span>'},
    jaipur:{code:'JAI',col:'#E5484D',eb:'Jaipur · India',name:'Jaipur Diwali',dates:'28 Oct–2 Nov 2025',st:'<b>Archived</b>',av:7,bal:'<span class="badge pos">All settled</span>'}
  };
  const AV=['a1','a2','a3','a4','a5','a6'],IN=['R','A','M','K','I','S'];
  function tripCards(root){
    (root||document).querySelectorAll('[data-trip]').forEach(el=>{
      const t=T[el.dataset.trip]; if(!t) return;
      const n=Math.min(t.av,4);
      const avs=Array.from({length:n},(_,i)=>`<span class="avatar sm ${AV[i]}">${IN[i]}</span>`).join('')+(t.av>4?`<span class="avatar sm" style="background:var(--card2);color:var(--ink2)">+${t.av-4}</span>`:'');
      el.innerHTML=`<div class="card" style="padding:16px 18px"><div class="hrow sp"><div><div class="eyebrow">${t.eb}</div><div class="h-md" style="margin-top:7px">${t.name}</div><div class="t-sm" style="margin-top:3px">${t.dates} · ${t.st}</div></div><span class="stamp" style="color:${t.col}">${t.code}</span></div><div class="dash"></div><div class="hrow sp"><div class="hrow gap10"><div class="avs">${avs}</div></div>${t.bal}</div></div>`;
    });
  }


  function heroTrip(root){
    (root||document).querySelectorAll('[data-hero]').forEach(el=>{
      el.innerHTML=`<div class="hero night" style="padding:20px 20px 24px;z-index:1"><div class="dots"></div>
 <div class="hrow sp"><span class="badge" style="gap:7px"><i style="width:7px;height:7px;border-radius:50%;background:#4ADE80;display:inline-block;box-shadow:0 0 8px #4ADE80"></i>In progress</span><span class="badge"><i data-i="sun" data-c="s14"></i>29° Goa</span></div>
 <div class="hrow sp" style="margin-top:22px"><div><div style="font:600 40px/1 var(--display);letter-spacing:-.03em">12</div><div style="font-size:12px;opacity:.6;margin-top:4px">Nov · Start</div></div><div style="text-align:center"><div class="eyebrow" style="color:rgba(255,255,255,.6)">Day 3 of 5</div></div><div style="text-align:right"><div style="font:600 40px/1 var(--display);letter-spacing:-.03em">16</div><div style="font-size:12px;opacity:.6;margin-top:4px">Nov · End</div></div></div>
 <div style="position:relative;height:64px;margin:-8px -6px 0"><svg viewBox="0 0 330 90" style="width:100%;height:100%;overflow:visible"><defs><linearGradient id="arcg" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#6FA8FF"/></linearGradient></defs><path d="M0 70 Q165 -10 330 60" pathLength="100" stroke="rgba(255,255,255,.2)" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M0 70 Q165 -10 330 60" pathLength="100" stroke="url(#arcg)" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-dasharray="58 100"/></svg>
 <div style="position:absolute;left:55%;top:2px;width:44px;height:44px;margin-left:-4px;border-radius:50%;background:radial-gradient(circle,rgba(80,150,255,.55),transparent 70%);display:flex;align-items:center;justify-content:center;color:#7FB2FF;transform:rotate(45deg)"><i data-i="plane" data-c="s24 fill"></i></div></div>
 <div class="dash" style="margin:6px -4px 14px"></div>
 <div class="hrow sp"><div><div style="font:700 21px var(--display);letter-spacing:-.015em">Goa Weekend</div><div class="eyebrow" style="color:rgba(255,255,255,.55);margin-top:7px">Goa · India</div></div><div class="avs"><span class="avatar sm a1">R</span><span class="avatar sm a2">A</span><span class="avatar sm a3">M</span><span class="avatar sm a4">K</span></div></div></div>
 <div class="card" style="margin-top:-18px;padding:16px 18px 16px;border-radius:0 0 28px 28px;position:relative;z-index:0;padding-top:30px"><div class="hrow sp"><div><div class="t-xs">Total spent</div><div class="amt" style="margin-top:4px;font-size:18px">₹84,320</div></div><div><div class="t-xs">Per person</div><div class="amt" style="margin-top:4px;font-size:18px">₹16,864</div></div><div style="text-align:right"><div class="t-xs">You owe</div><div class="amt neg" style="margin-top:4px;font-size:18px">₹2,450</div></div></div></div>`;
    });
  }


  function qrs(root){
    (root||document).querySelectorAll('[data-qr]').forEach(el=>{
      const n=25; let seed=7; const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff};
      const fin=(x,y)=>(x<8&&y<8)||(x>=n-8&&y<8)||(x<8&&y>=n-8);
      let r='';
      for(let y=0;y<n;y++)for(let x=0;x<n;x++){
        if(fin(x,y)) continue;
        if(rnd()>.52) r+=`<rect x="${x}" y="${y}" width="1.02" height="1.02" rx=".2"/>`;
      }
      const f=(x,y)=>`<rect x="${x}" y="${y}" width="7" height="7" rx="1.6" fill="#0B0F1A"/><rect x="${x+1}" y="${y+1}" width="5" height="5" rx="1" fill="#fff"/><rect x="${x+2}" y="${y+2}" width="3" height="3" rx=".7" fill="#0B0F1A"/>`;
      el.innerHTML=`<svg viewBox="0 0 ${n} ${n}" style="width:100%;height:100%" fill="#0B0F1A">${r}${f(0,0)}${f(n-7,0)}${f(0,n-7)}</svg>`;
    });
  }


  function tripChrome(root){
    (root||document).querySelectorAll('[data-thead]').forEach(el=>{
      const sub=el.dataset.sub||'Goa · Day 3 of 5', ttl=el.dataset.thead||'Goa Weekend';
      el.outerHTML=`<div class="hrow sp" style="height:58px"><div style="width:84px"><span class="icon-btn sm"><i data-i="cl"></i></span></div><div style="text-align:center"><div class="eyebrow">${sub}</div><div class="h-sm" style="margin-top:5px;font-size:17px">${ttl}</div></div><div class="hrow gap8" style="width:84px;justify-content:flex-end"><span class="icon-btn sm"><i data-i="bell"></i><i class="pip"></i></span><span class="icon-btn sm"><i data-i="dots"></i></span></div></div>`;
    });
    (root||document).querySelectorAll('[data-tdock]').forEach(el=>{
      const k=el.dataset.tdock, m3=el.dataset.os==='m3';
      const tabs=k==='chat'?[['chat','Chat','chat'],['exp','Expenses','receipt'],['bal','Balances','swap'],['mem','Members','users']]:[['exp','Expenses','receipt'],['bal','Balances','swap'],['mem','Members','users'],['note','Notes','note']];
      if(m3){
        el.outerHTML=`<div class="m3dock">${tabs.map(t=>`<div class="it${t[0]===k?' on':''}"><span class="pill"><i data-i="${t[2]}"></i></span>${t[1]}</div>`).join('')}</div>`;
        return;
      }
      const it=t=>`<div class="it${t[0]===k?' on':''}"><i data-i="${t[2]}"></i>${t[1]}</div>`;
      el.outerHTML=`<div class="dock">${tabs.slice(0,2).map(it).join('')}<div class="fab"><i data-i="plus" data-c="s28"></i></div>${tabs.slice(2).map(it).join('')}</div>`;
    });
  }


  function sides(root){
    (root||document).querySelectorAll('[data-side]').forEach(el=>{
      const k=el.dataset.side, kind=el.dataset.kind||'global';
      const logo=`<div class="logo"><span class="mk"><i data-i="plane" data-c="s18"></i></span>Trip Tracker</div>`;
      const nv=(key,ic,label,extra)=>`<div class="nv${k===key?' on':''}"><i data-i="${ic}" data-c="s20"></i>${label}${extra||''}</div>`;
      const me=`<div style="margin-top:auto" class="hrow gap10"><span class="avatar a1" style="border:0">R</span><div><div class="tt" style="font:600 13.5px var(--body)">Rahul Maurya</div><div class="t-xs">rahul@tripsquad.in</div></div></div>`;
      let h;
      if(kind==='global'){
        h=`${logo}${nv('trips','home','Trips')}${nv('bal','swap','Balances')}${nv('act','bell','Activity','<span class="bd">3</span>')}${nv('me','user','Me &amp; settings')}<div class="eyebrow" style="padding:22px 14px 8px">Recent</div><div class="nv" style="height:40px"><span class="stamp" style="width:26px;height:26px;font-size:7px;color:#2F6BFF;border-width:1.5px;transform:none">GOI</span>Goa Weekend</div><div class="nv" style="height:40px"><span class="stamp" style="width:26px;height:26px;font-size:7px;color:#8B3CF7;border-width:1.5px;transform:none">DPS</span>Bali Escape</div>${me}`;
      } else {
        h=`${logo}<div class="nv" style="height:40px;color:var(--ink3)"><i data-i="cl" data-c="s18"></i>All trips</div><div style="padding:10px 14px 14px"><div class="eyebrow">Goa · Day 3 of 5</div><div class="h-md" style="margin-top:8px">Goa Weekend</div><div class="avs" style="margin-top:12px"><span class="avatar sm a1">R</span><span class="avatar sm a2">A</span><span class="avatar sm a3">M</span><span class="avatar sm a4">K</span><span class="avatar sm a5">I</span></div></div>${nv('exp','receipt','Expenses')}${nv('bal','swap','Balances')}${nv('mem','users','Members')}${nv('note','note','Notes &amp; passes')}${nv('chat','chat','Chat','<span class="bd">2</span>')}${nv('ins','spark','Insights')}<div style="margin-top:auto" class="stack gap4"><div class="nv" style="height:42px"><i data-i="share" data-c="s20"></i>Invite travelers</div>${nv('set','sliders','Trip settings')}</div>`;
      }
      el.outerHTML=`<div class="side">${h}</div>`;
    });
  }

  function paint(root) {
    (root || document).querySelectorAll('i[data-i]').forEach(el => {
      const wrap = document.createElement('span');
      wrap.style.display = 'inline-flex';
      wrap.style.alignItems = 'center';
      wrap.innerHTML = svg(el.dataset.i, el.dataset.c || '');
      el.replaceWith(wrap.firstChild);
    });
  }

  function chrome() {
    document.querySelectorAll('.phone').forEach(p => {
      const ios = p.classList.contains('ios');
      const light = p.dataset.sb === 'light';
      const time = p.dataset.time || (ios ? '9:41' : '9:41');
      const scr = p.querySelector('.scr');
      const sb = document.createElement('div');
      sb.className = 'sb' + (light ? ' light' : '');
      sb.innerHTML = `<span>${time}</span><span class="r">${svg('signal')}${svg('wifi')}${svg('battery')}</span>`;
      sb.querySelectorAll('svg').forEach(s => (s.style.width = '17px'));
      p.appendChild(sb);
      const isl = document.createElement('div');
      isl.className = 'island';
      p.appendChild(isl);
      if (!p.hasAttribute('data-nohi')) {
        const hi = document.createElement('div');
        hi.className = 'hi';
        if (light) hi.style.background = '#fff';
        p.appendChild(hi);
      }
      if (p.dataset.dark) p.classList.add('dark');
    });
    document.querySelectorAll('.cell[data-cap]').forEach(c => {
      const cap = document.createElement('div');
      cap.className = 'cap';
      cap.innerHTML = `${c.dataset.n ? `<span class="n">${c.dataset.n}</span>` : ''}${c.dataset.cap}${c.dataset.sub ? `<small>${c.dataset.sub}</small>` : ''}`;
      c.prepend(cap);
    });
  }
  document.addEventListener('DOMContentLoaded', () => { tripCards(); heroTrip(); qrs(); tripChrome(); sides(); paint(); chrome(); });
})();
