import {test} from 'node:test';
import assert from 'node:assert/strict';
import {client, COLLECTION} from '../lib/sudoswap.ts';
import {loadWalletGhouls} from '../lib/ghoul-wallet.ts';
import {isTainted} from '../lib/tainted-ghouls.ts';

const owner='0x1111111111111111111111111111111111111111';
const other='0x2222222222222222222222222222222222222222';

test('tainted labels match the supplied chain, collection and on-chain token ID',()=>{
  assert.equal(isTainted('ethereum',COLLECTION,1585n),true);
  assert.equal(isTainted('ETHEREUM',COLLECTION.toUpperCase(),2201n),true);
  assert.equal(isTainted('ethereum',COLLECTION,1978n),false);
  assert.equal(isTainted('base',COLLECTION,1585n),false);
  assert.equal(isTainted('ethereum',other,1585n),false);
});

test('wallet discovery paginates, deduplicates, excludes transferred NFTs, and proves completeness',async()=>{
  const originals={getBlockNumber:client.getBlockNumber,readContract:client.readContract,multicall:client.multicall,fetch:globalThis.fetch};
  try {
    client.getBlockNumber=async()=>100n;
    client.readContract=async ({args,blockNumber})=>{assert.equal(args[0],owner);assert.equal(blockNumber,100n);return 2n;};
    let requests=0;const checked=[];
    globalThis.fetch=async url=>{
      const parsed=new URL(url,'http://localhost');
      assert.equal(parsed.searchParams.get('owner'),owner);
      assert.equal(parsed.searchParams.get('end'),'100');
      const page=Number(parsed.searchParams.get('page'));requests++;
      return Response.json(page===1?{ids:['1','2'],hasMore:true}:{ids:['1','3'],hasMore:false});
    };
    client.multicall=async({contracts,blockNumber})=>{
      assert.equal(blockNumber,100n);
      return contracts.map(contract=>{assert.equal(contract.address,COLLECTION);const id=contract.args[0];checked.push(id);return {status:'success',result:id===2n?other:owner};});
    };
    assert.deepEqual(await loadWalletGhouls(owner,new AbortController().signal),[1n,3n]);
    assert.deepEqual(checked,[1n,2n,3n]);assert.equal(requests,2);
    client.readContract=async()=>0n;
    requests=0;
    assert.deepEqual(await loadWalletGhouls(owner,new AbortController().signal),[]);assert.equal(requests,0);
    client.readContract=async()=>2n;
    globalThis.fetch=async()=>Response.json({ids:['1'],hasMore:false});
    await assert.rejects(loadWalletGhouls(owner,new AbortController().signal),/index has not caught up/);
    const abort=new AbortController();abort.abort();
    await assert.rejects(loadWalletGhouls(owner,abort.signal),{name:'AbortError'});
  }finally{
    client.getBlockNumber=originals.getBlockNumber;client.readContract=originals.readContract;client.multicall=originals.multicall;globalThis.fetch=originals.fetch;
  }
});
