'use strict';

const CKBCore = require('@nervosnetwork/ckb-sdk-core').default;
const nodeRpcUrl = 'http://api.yamen.co:8114';
const ckb = new CKBCore(nodeRpcUrl);
const BN = require('bn.js');

const Service = require('egg').Service;

/*
const mineckb_addrs = [
  '',
  '',
  '',
]
*/

class BlockService extends Service {

  async sync() {

    const { app } = this;
    const { rpc, utils } = ckb;

    let { height, reward } = await this.getTip();

    console.log('from: ', height);

    const tip = await ckb.rpc.getTipBlockNumber();

    if (tip === height.toString()) {
      console.log('skipped');
      return;
    }

    let records = await app.mysql.select('records');

    for (let i = height + 1; i <= tip; i++) {

      const res = await rpc.getBlockByNumber(i);
      const coinbase = res.transactions[0].outputs[0];
      const { capacity: amount, lock: { args: blake160 } } = coinbase;
      const addr = utils.bech32Address(blake160.toString());
      const index = records.findIndex(r => r.addr === addr);

      if (index === -1) {
        records.push({ rank: 0, addr, amount, blocks: 1 });
      } else {
        records[index].amount = new BN(amount).add(new BN(records[index].amount)).toString();
        records[index].blocks += 1;
      }
      reward = new BN(amount).add(new BN(reward)).toString();

      console.log('[ Height ]: ' + i + ' [ Reward ]: ' + reward);
    }

    records = records.sort(sortBN);
    const total = records.length;

    await app.mysql.delete('records');

    for (let i = 0; i < total; i++) {
      records[i].rank = i + 1;
      await app.mysql.insert('records', records[i]);
    }

    /*
    if (height === 0) {
      await app.runSchedule('sync_blocks');
    }
    */

    height = tip;
    await this.setTip(height, reward);
    console.log('to: ', height);
  }

  async getEpochs() {
    const cur = await ckb.rpc.getCurrentEpoch();
    console.log('current epoch: ', cur);

    let i = 1;
    const res = [];
    while (i <= parseInt(cur.number)) {
      const e = await this.getEpoch(i);
      res.push(e);
      i++;
    }

    return res;
  }

  async getEpoch(which) {
    const e = which ? await ckb.rpc.getEpochByNumber(which) : await ckb.rpc.getCurrentEpoch();
    const b = await ckb.rpc.getBlockByNumber(e.startNumber);
    const lucky = ckb.utils.bech32Address(b.transactions[0].witnesses[0].data[1]);
    return { ...e, lucky };
  }

  async getRecords() {
    return await this.app.mysql.select('records', { orders: [[ 'rank', 'asc' ]] });
  }

  async getTip() {
    let tip = await this.app.mysql.get('tip', { id: 0 });
    if (!tip) {
      tip = { height: 0, reward: '0' };
      await this.app.mysql.insert('tip', tip);
      return tip;
    }
    return tip;
  }

  async setTip(height, reward) {
    await this.app.mysql.update('tip', { id: 0, height, reward });
  }

  async blake160ToAddr(blake160) {
    console.log('Blake160: ', blake160);
    const addr = ckb.utils.bech32Address(blake160.toString());
    console.log('Addr: ', addr);
    return addr;
  }
}

function sortBN(a, b) {
  const A = new BN(a.amount);
  const B = new BN(b.amount);
  return A.lt(B) ? 1 : A.gt(B) ? -1 : 0; 
}

module.exports = BlockService;

