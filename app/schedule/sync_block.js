'use strict';

const Subscription = require('egg').Subscription;

class SyncBlock extends Subscription {
  static get schedule() {
    return {
      immediate: false,
      disable: true,
      interval: '10s',
      type: 'all',
    };
  }

  async subscribe() {
    const { service } = this;
    await service.block.sync();
  }
}

module.exports = SyncBlock;
