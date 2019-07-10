'use strict';

const BN = require('bn.js');

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {

    const { ctx, service } = this;

    const list = await service.block.getRecords();
    const total = list.length;
    const epoch = await service.block.getEpoch(0);
    const tip = await service.block.getTip();

    ctx.body = { total, list, epoch, ...tip };
  }

  async info() {
    const { ctx, service } = this;
    const what = ctx.params.what;
    if (what === 'epochs') {
      const epochs = await service.block.getEpochs();
      ctx.body = epochs;
    } else if (what === 'records') {
      let records = await service.block.getRecords();
      records = records.sort(sortBN);
      const total = records.length;

      const list = [];
      for (let i = 0; i < 100; i++) {
        list.push({ rank: i + 1, ...records[i] });
      }

      ctx.body = { total, list };
    } else if (what === 'tip') {
      const tip = await service.block.getTip();
      ctx.body = tip;
    }
  }

  async get() {
    const { ctx, service } = this;
    ctx.body = await service.tx.get(ctx.params.txhash);
  }

  async send() {
    const { ctx, service } = this;
    ctx.body = await service.tx.send();
  }

  async addr() {
    const { ctx, service } = this;
    const { blake160 } = ctx.params;
    ctx.body = service.block.blake160ToAddr(blake160);
  }
}

function sortBN(a, b) {
  const A = new BN(a.amount);
  const B = new BN(b.amount);
  return A.lt(B) ? 1 : A.gt(B) ? -1 : 0; 
}

module.exports = HomeController;
