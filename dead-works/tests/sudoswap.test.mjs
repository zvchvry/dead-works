import { test } from 'node:test';
import assert from 'node:assert/strict';
import { client, loadPool, COLLECTION, FACTORY, tradeLimit, parseTokenId } from '../lib/sudoswap.ts';

test('buy limits round upward; sell limits round downward in wei', () => {
  assert.equal(tradeLimit(101n, true, 50n), 102n);
  assert.equal(tradeLimit(101n, false, 50n), 100n);
  assert.equal(tradeLimit(10000n, true, 100n), 10100n);
  assert.equal(tradeLimit(10000n, false, 100n), 9900n);
});
test('token IDs accept zero and uint256 maximum, reject malformed and overflow', () => {
  assert.equal(parseTokenId('0'), 0n);
  assert.equal(parseTokenId(' 4027 '), 4027n);
  assert.equal(parseTokenId((2n ** 256n - 1n).toString()), 2n ** 256n - 1n);
  for (const value of ['', '-1', '1.5', '1e3', '0x10', (2n ** 256n).toString()]) assert.equal(parseTokenId(value), null);
});
test('pool validation rejects impostors and other collections before inventory access', async () => {
  const originalRead = client.readContract;
  const originalBalance = client.getBalance;
  const pool = '0x2E5800bc3474DFEE44da5C4FB0E55dD4dC1C58b0';
  try {
    client.readContract = async ({address, functionName}) => {
      assert.equal(address, FACTORY);
      assert.equal(functionName, 'isPair');
      return false;
    };
    await assert.rejects(loadPool(pool), /not a Sudoswap v1 ETH pool/);
    client.readContract = async ({functionName}) => {
      if (functionName === 'isPair') return true;
      if (functionName === 'nft') return FACTORY;
      throw new Error('Inventory must not be read for an unrelated collection');
    };
    await assert.rejects(loadPool(pool), /does not trade Based Ghouls/);
    client.readContract = async ({functionName, args}) => {
      if (functionName === 'isPair') return args[1] === 1;
      if (functionName === 'nft') return COLLECTION;
      if (functionName === 'poolType') return 2;
      if (functionName === 'getAllHeldIds') return [4027n];
      if (functionName === 'fee') return 10n ** 17n;
      throw new Error('Unexpected contract call');
    };
    client.getBalance = async () => 10n ** 18n;
    const result = await loadPool(pool);
    assert.equal(result.type, 2);
    assert.deepEqual(result.ids, [4027n]);
    assert.equal(result.balance, 10n ** 18n);
  } finally {
    client.readContract = originalRead;
    client.getBalance = originalBalance;
  }
});

test('discovery re-reads a truncated boundary block and deduplicates pool addresses', async () => {
  const { parseFactoryPage, mergePoolIndex, NEW_PAIR_TOPIC } = await import('../lib/sudoswap-discovery.ts');
  const makeLog = (block, address) => ({ address: FACTORY, blockNumber: `0x${block.toString(16)}`, data: `0x${address.slice(2).padStart(64,'0')}`, topics: [NEW_PAIR_TOPIC] });
  const address = '0x2e5800bc3474dfee44da5c4fb0e55dd4dc1c58b0';
  const logs = Array.from({ length: 1000 }, (_, i) => makeLog(i < 998 ? 100 : 101, address));
  const page = parseFactoryPage(logs, 100, 200);
  assert.equal(page.throughBlock, 100);
  assert.deepEqual(page.addresses, [address]);
  const pool = {address, variant:1, type:2};
  const merged = mergePoolIndex({throughBlock:100,pools:[pool]}, {throughBlock:200,pools:[{...pool,address:address.toUpperCase().replace('0X','0x')}]});
  assert.equal(merged.pools.length, 1);
  assert.equal(merged.throughBlock, 200);
  assert.equal(parseFactoryPage([], 100, 200).throughBlock, 200);
});
test('discovery rejects wrong-factory events and cannot skip an oversized boundary block', async () => {
  const {parseFactoryPage, NEW_PAIR_TOPIC} = await import('../lib/sudoswap-discovery.ts');
  const log = {address:FACTORY, blockNumber:'0x64', data:`0x${COLLECTION.slice(2).padStart(64,'0')}`, topics:[NEW_PAIR_TOPIC]};
  assert.throws(() => parseFactoryPage([{...log,address:COLLECTION}],100,200), /Invalid factory event/);
  assert.throws(() => parseFactoryPage([{...log,topics:['0x123']}],100,200), /Invalid factory event/);
  assert.throws(() => parseFactoryPage(Array.from({length:1000},()=>log),100,200), /cannot advance safely/);
});

test('pool visibility requires a confirmed positive Ghoul balance', async () => {
  const {hasGhouls} = await import('../lib/sudoswap.ts');
  for (const count of ['0','000',null,undefined,'','invalid','-1']) assert.equal(hasGhouls(count), false);
  for (const count of ['1','6','9007199254740993']) assert.equal(hasGhouls(count), true);
});

test('stocked pools sort by exact ETH buy price, with unavailable and ERC20 quotes last', async () => {
  const {comparePoolBuyPrices} = await import('../lib/sudoswap.ts');
  const pool = (address,variant=1,type=2) => ({address,variant,type});
  const pools = [pool('expensive'),pool('unavailable'),pool('cheap'),pool('erc20',3),pool('buy-only',1,0),pool('almost-cheap')];
  const prices = {expensive:'9007199254740995',cheap:'9007199254740993','almost-cheap':'9007199254740994',erc20:'1','buy-only':'1',unavailable:null};
  assert.deepEqual(pools.sort((a,b)=>comparePoolBuyPrices(a,b,prices)).map(p=>p.address), ['cheap','almost-cheap','expensive','buy-only','erc20','unavailable']);
});
