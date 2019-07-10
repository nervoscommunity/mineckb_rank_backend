'use strict';

const Subscription = require('egg').Subscription;

class SyncBlock extends Subscription {
  static get schedule() {
    return {
      immediate: true,
      interval: '15s',
      type: 'all',
    };
  }

  async subscribe() {
    const { service } = this;
    !service.block.isSyncing() && await service.block.sync();
  }
}

module.exports = SyncBlock;
