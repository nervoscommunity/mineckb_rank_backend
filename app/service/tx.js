'use strict';

const CKBCore = require('@nervosnetwork/ckb-sdk-core').default;
const nodeRpcUrl = 'http://api.yamen.co:8114';
const ckb = new CKBCore(nodeRpcUrl);

const Service = require('egg').Service;

class TxService extends Service {

  async get(hash) {
    const { rpc } = ckb;
    const tx = await rpc.getTransaction(hash);
    console.log('TX: ', tx);
    return tx;
  }

  async send() {

    const { rpc } = ckb;

    const tx = {
      deps: [{
        cell: {
          txHash: '0xbfad4ae78c2f66c142decfbaa2336acdc39442a827b9c8599ff7f722ba3f50bc',
          index: '1',
        },
      }, {
        cell: {
          txHash: '0xec6140660b9c3b01f758c8ceffafbd522a4d7268d3856077e90e7b7aeeca8bf8',
          index: '1',
        },
      }],
      inputs: [{
        args: [],
        previousOutput: {
          cell: {
            index: '1',
            txHash: '0x395fc85dc84950ee394447418405e33413e3c0700e12d6e67c98452e797b0a3f',
          },
        },
        since: '0',
      }],
      outputs: [{
        capacity: '60000000000',
        data: '0x7a68697869616e',
        lock: {
          args: [ '0xdf11bbfd03acd1d5f5c98e7fac60a6ca0d316e1d' ],
          codeHash: '0x94334bdda40b69bae067d84937aa6bbccf8acd0df6626d4b9ac70d4612a11933',
        },
        type: null,
      }],
      version: '0',
      witnesses: [],
    };

    const res = await rpc.sendTransaction(tx);

    return res;
  }
}

module.exports = TxService;
