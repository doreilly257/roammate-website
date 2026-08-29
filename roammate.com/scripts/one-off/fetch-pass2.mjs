import sharp from 'sharp'; import fs from 'node:fs';
const OUT='public/images/guides';
const Q={
 'dana':'Dana Jordan valley','jebel-shams':'Oman mountains canyon','ksamil':'Albanian riviera beach',
 'minca':'Colombia jungle waterfall','nizwa':'Nizwa Oman','paracas':'Peru coast desert ocean',
 'unawatuna':'Sri Lanka beach palm','walvis-bay':'Namibia flamingo lagoon',
 'puerto-princesa':'Palawan Philippines river cave','aswan':'Aswan Egypt','amritsar':'Amritsar Punjab street',
 'luxor':'Karnak temple Egypt','banos':'Ecuador waterfall cascade','kamakura':'Great Buddha Kamakura',
 'nazca':'Nazca lines Peru','tsavo':'Kenya elephants red dust','bariloche':'Patagonia Argentina lake town',
 'jerash':'Roman ruins Jordan columns','sur':'Oman dhow boat harbour','mumbai':'Mumbai Gateway of India',
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const rep=[];
for (const [slug,q] of Object.entries(Q)) {
  const dest=`${OUT}/${slug}-hero.webp`;
  try{
    const r=await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(q)}&per_page=5&orientation=landscape`,{headers:{Accept:'application/json'}});
    const d=await r.json(); const hit=(d.results||[])[0];
    if(!hit) throw new Error('no results');
    const ir=await fetch(`${(hit.urls?.raw||hit.urls?.full)}&w=1600&h=900&fit=crop&q=80&fm=jpg`);
    const buf=Buffer.from(await ir.arrayBuffer()); if(buf.length<5000) throw new Error('tiny');
    let qy=82,out=await sharp(buf).resize(1600,900,{fit:'cover'}).webp({quality:qy}).toBuffer();
    while(out.length>200*1024&&qy>30){qy-=6;out=await sharp(buf).resize(1600,900,{fit:'cover'}).webp({quality:qy}).toBuffer();}
    if(out.length>200*1024){out=await sharp(buf).resize(1280,720,{fit:'cover'}).webp({quality:70}).toBuffer();}
    fs.writeFileSync(dest,out);
    rep.push([slug,`OK ${(out.length/1024|0)}KB`,(hit.alt_description||'').slice(0,68)]);
  }catch(e){rep.push([slug,'FAIL '+e.message,'']);}
  await sleep(400);
}
for(const [s,st,a] of rep) console.log(`${s.padEnd(18)} ${st.padEnd(14)} ${a}`);
