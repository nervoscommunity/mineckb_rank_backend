'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  router.get('/', controller.home.index);
  router.get('/info/:what', controller.home.info);
  router.get('/addr/:blake160', controller.home.addr);
  router.get('/send', controller.home.send);
  router.get('/get/:txhash', controller.home.get);
  router.get('/init', controller.home.init);
};
