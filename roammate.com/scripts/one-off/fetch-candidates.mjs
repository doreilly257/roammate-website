import sharp from 'sharp'; import fs from 'node:fs';
const Q={
 'franz-josef':'Franz Josef Glacier New Zealand ice',
 'mount-cook':'Aoraki Mount Cook Hooker Valley',
 'nazca':'Nazca desert Peru geoglyph',
 'nizwa':'Nizwa fort Oman',
 'aswan':'Aswan Nile Egypt felucca island',
 'jerash':'Jerash Jordan Roman colonnade',
 'luxor':'Karnak temple Luxor hypostyle columns',
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for (const [slug,q] of Object.entries(Q)) {
  try{
    const r=await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(q)}&per_page=4&orientation=landscape`,{headers:{Accept:'application/json'}});
    const d=await r.json();
    let i=0;
    for(const hit of (d.results||[]).slice(0,4)){
      i++;
      const ir=await fetch(`${(hit.urls?.raw||hit.urls?.full)}&w=1200&h=675&fit=crop&q=75&fm=jpg`);
      const buf=Buffer.from(await ir.arrayBuffer()); if(buf.length<5000) continue;
      await sharp(buf).resize(1200,675,{fit:'cover'}).webp({quality:75}).toFile(`/tmp/cand/${slug}__${i}.webp`);
      console.log(`${slug}#${i}  ${(hit.alt_description||'').slice(0,64)}`);
      await sleep(200);
    }
  }catch(e){console.log(slug,'FAIL',e.message);}
  await sleep(400);
}
