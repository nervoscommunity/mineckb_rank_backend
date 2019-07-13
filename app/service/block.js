'use strict';

const CKBCore = require('@nervosnetwork/ckb-sdk-core').default;
const nodeRpcUrl = 'http://api.yamen.co:8114';
const ckb = new CKBCore(nodeRpcUrl);
const BN = require('bignumber.js');

const Service = require('egg').Service;

const thresholdBN = new BN(4000*10**8);

let syncing = false;

class BlockService extends Service {

  isSyncing() {
    return syncing;
  }

  async sync() {

    syncing = true;

    const { app } = this;
    const { rpc, utils } = ckb;

    let { height } = await this.getTip();

    console.log('from: ', height);

    const tip = await ckb.rpc.getTipBlockNumber();

    if (tip === height.toString()) {
      console.log('skipped');
      syncing = false;
      return;
    }

    let records = await app.mysql.select('records');


    for (let i = height + 1; i <= tip; i++) {

      const res = await rpc.getBlockByNumber(i);
      const coinbase = res.transactions[0].outputs[0];
      const { capacity: amount, lock: { args: blake160 } } = coinbase;
      const addr = utils.bech32Address(blake160.toString());
      const index = records.findIndex(r => r.addr === addr);

      const amountBN = new BN(amount);

      if (index === -1) {
        records.push({ rank: 0, addr, amount, blocks: 1 });
      } else {
        records[index].amount = amountBN.plus(new BN(records[index].amount)).toString();
        records[index].blocks += 1;
      }

      console.log('[ Height ]: ' + i);
    }

    records = records.sort(sortBN);
    const total = records.length;

    await app.mysql.delete('records');

    let rewardBN = new BN(0)
    for (let i = 0; i < total; i++) {
      records[i].rank = i + 1;
      const amountBN = new BN(records[i].amount)
      amountBN.gt(thresholdBN) && (rewardBN = amountBN.plus(rewardBN));
      await app.mysql.insert('records', records[i]);
    }
    const reward = rewardBN.toString()
    console.log('total valid reward: ', reward)

    height = tip;
    await this.setTip(height, reward);
    console.log('to: ', height);

    syncing = false;
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
    if (e.startNumber === "0") {
      return {...e, lucky: "pangu"}
    }
    const b = await ckb.rpc.getBlockByNumber(e.startNumber);
    const lucky = ckb.utils.bech32Address(b.transactions[0].witnesses[0].data[1]);
    return { ...e, lucky };
  }

  async getRecords() {
    const records = await this.app.mysql.select('records', { orders: [[ 'rank', 'asc' ]] });
    const { reward } = await this.getTip();
    const rewardBN = new BN(reward);
    const bonus = new BN(2000000);

    for (let i = 0; i < records.length; i++) {
      const amountBN = new BN(records[i].amount);
      records[i].exp = amountBN.lte(thresholdBN) ? '0' : amountBN.div(rewardBN).times(bonus).toFixed(4);
    }
    return records;
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

