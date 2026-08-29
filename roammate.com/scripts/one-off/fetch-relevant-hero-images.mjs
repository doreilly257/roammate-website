import sharp from 'sharp';
import fs from 'node:fs';
const OUT='public/images/guides';
const Q={
 'abu-simbel':'Abu Simbel temple Egypt colossal statues',
 'amboseli':'Amboseli National Park Kenya elephants Kilimanjaro',
 'amritsar':'Amritsar India street city Punjab',
 'arequipa':'Arequipa Peru white city cathedral Misti volcano',
 'aswan':'Aswan Egypt Nile felucca river',
 'banos':'Banos Ecuador waterfall green valley',
 'bariloche':'Bariloche Argentina Patagonia lake mountains',
 'bhaktapur':'Bhaktapur Durbar Square Nepal temple',
 'dahab':'Dahab Egypt Red Sea coast diving',
 'dana':'Dana Biosphere Reserve Jordan valley',
 'el-chalten':'El Chalten Fitz Roy Patagonia Argentina',
 'franz-josef':'Franz Josef Glacier New Zealand',
 'golden-temple':'Golden Temple Amritsar Harmandir Sahib',
 'jebel-shams':'Jebel Shams Oman grand canyon mountains',
 'jerash':'Jerash Jordan Roman ruins columns',
 'jodhpur':'Jodhpur blue city India Mehrangarh fort',
 'kamakura':'Kamakura Japan Great Buddha Daibutsu',
 'koh-lanta':'Koh Lanta Thailand beach island',
 'kolkata':'Kolkata India Victoria Memorial Howrah',
 'ksamil':'Ksamil Albania beach turquoise islands',
 'lake-manyara':'Lake Manyara Tanzania flamingos wildlife',
 'lake-naivasha':'Lake Naivasha Kenya hippo acacia',
 'luxor':'Luxor Egypt Karnak temple columns',
 'minca':'Minca Colombia jungle Sierra Nevada waterfall',
 'mount-cook':'Aoraki Mount Cook New Zealand peak',
 'mumbai':'Mumbai India Gateway of India Marine Drive',
 'nazca':'Nazca Lines Peru desert aerial',
 'nizwa':'Nizwa Fort Oman market',
 'otavalo':'Otavalo market Ecuador textiles indigenous',
 'paracas':'Paracas Peru Ballestas coast desert sea',
 'puerto-princesa':'Puerto Princesa Palawan underground river',
 'sur':'Sur Oman dhow harbour boats',
 'ta-prohm':'Ta Prohm temple tree roots Angkor Cambodia',
 'tangier':'Tangier Morocco medina coast',
 'tarangire':'Tarangire National Park Tanzania baobab elephants',
 'tsavo':'Tsavo National Park Kenya red elephants',
 'unawatuna':'Unawatuna beach Sri Lanka palm',
 'walvis-bay':'Walvis Bay Namibia flamingos lagoon',
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const report=[];
for (const [slug,q] of Object.entries(Q)) {
  const dest=`${OUT}/${slug}-hero.webp`;
  if (fs.existsSync(dest)) { report.push([slug,'SKIP file already exists','']); continue; }
  try {
    const r=await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(q)}&per_page=3&orientation=landscape`,{headers:{Accept:'application/json'}});
    if(!r.ok) throw new Error('search '+r.status);
    const d=await r.json();
    const hit=(d.results||[])[0];
    if(!hit) throw new Error('no results');
    const raw=hit.urls?.raw||hit.urls?.full;
    const ir=await fetch(`${raw}&w=1600&h=900&fit=crop&q=80&fm=jpg`);
    const buf=Buffer.from(await ir.arrayBuffer());
    if(buf.length<5000) throw new Error('tiny response '+buf.length);
    let qy=82,out=await sharp(buf).resize(1600,900,{fit:'cover'}).webp({quality:qy}).toBuffer();
    while(out.length>200*1024&&qy>35){qy-=8;out=await sharp(buf).resize(1600,900,{fit:'cover'}).webp({quality:qy}).toBuffer();}
    fs.writeFileSync(dest,out);
    report.push([slug,`OK ${(out.length/1024|0)}KB q${qy}`,(hit.alt_description||'').slice(0,72)]);
  } catch(e){ report.push([slug,'FAIL '+e.message,'']); }
  await sleep(400);
}
for(const [s,st,alt] of report) console.log(`${s.padEnd(18)} ${st.padEnd(22)} ${alt}`);
