import fs from 'node:fs/promises';
import {client} from '../lib/sudoswap.ts';
import {discoverPoolPage, mergePoolIndex} from '../lib/sudoswap-discovery.ts';
const path=new URL('../data/sudoswap-pools.json',import.meta.url);
let index=JSON.parse(await fs.readFile(path,'utf8'));
const target=Number((await client.getBlock({blockTag:'finalized'})).number);
console.log('Scanning factory through',target);
while(index.throughBlock<target){
  let page;
  for(let attempt=0;attempt<8;attempt++) {
    try {page=await discoverPoolPage(index.throughBlock+1,target);break;}
    catch(e){console.log('Retry',attempt+1,e.shortMessage??e.message);if(attempt===7)throw e;await new Promise(r=>setTimeout(r,Math.min(60000, 15000*(attempt+1))));}
  }
  index=mergePoolIndex(index,page);
  await fs.writeFile(path,JSON.stringify(index,null,2)+'\n');
  console.log('Indexed through',index.throughBlock,'Based Ghouls pools',index.pools.length);
  if(index.throughBlock<target) await new Promise(r=>setTimeout(r,1500));
}
