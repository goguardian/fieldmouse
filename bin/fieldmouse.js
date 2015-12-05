#!/usr/bin/env node

'use strict';

var actions = require('../src/index').actions;
var args = process.argv.slice(2);

if (args.length === 0 || actions.availableActions.indexOf(args[0]) === -1) {
  console.log('Available actions are:');
  actions.availableActions.forEach(function(action) {
    console.log(' ', action);
  });

  process.exit(1);
}

actions.doAction(args);
