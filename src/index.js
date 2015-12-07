'use strict';

var fs = require('fs');
var http = require('http');
var path = require('path');
var prompt = require('readline-sync').question;

var _actions = {
  configPath: process.env.HOME + '/.fieldmouse',
  marathonPath: './marathon.json',

  /**
   * Prompts user for the Marathon host address and writes the address to
   * ~/.fieldmouse
   */
  configure: function() {
    var host = prompt('What is your Marathon host? [127.0.0.1:8080] ') ||
      '127.0.0.1:8080';
    fs.writeFileSync(this.configPath, host);
    console.log('Marathon host set to:', host);
  },

  /**
   * Performs the retrieval of Marathon application environment variables and
   * populates the values in marathon.json
   */
  nibble: function(configPath) {
    if (typeof configPath !== 'undefined' && configPath !== '') {
      this.marathonPath = path.resolve(configPath);
    }

    // Retrieve the host address
    var host;
    try {
      host = fs.readFileSync(this.configPath);
    } catch (e) {
      console.log('Could not load Marathon host.  Run configure.');
      return;
    }

    // Load the current application configuration from marathon.json
    var configFile;
    try {
      configFile = fs.readFileSync(this.marathonPath);
    } catch (e) {
      console.log('Could not locate marathon.json at', this.marathonPath);
      return;
    }

    var config = JSON.parse(configFile);

    // Retrieve the configuration of applications from Marathon
    http.get('http://' + host + '/v2/apps', function(res) {
      var data = '';
      res.on('data', function(chunk) {
        data += chunk;
      });

      res.on('end', function() {
        this._processData(JSON.parse(data).apps, config);
      }.bind(this));
    }.bind(this)).on('error', function(e) {
      console.log('Error:', e);
    });
  },

  /**
   * Locates the current environment variables of the application in production
   * configuration and updates the application config with the environment
   * variable values
   */
  _processData: function(apps, config) {
    var appData;
    apps.forEach(function(app) {
      if (app.id === config.id) {
        appData = app;
      }
    });

    if (!appData) {
      console.log('Application', config.id, 'not found');
      return;
    }

    // Update configuration with production application environment variable
    // values
    Object.keys(appData.env).forEach(function(key) {
      config.env[key] = appData.env[key];
    });

    this._writeConfig(config);
  },

  /**
   * Writes the configuration to marathon.json
   */
  _writeConfig: function(config) {
    fs.writeFileSync(this.marathonPath, JSON.stringify(config, null, 2));
    console.log('Application', config.id, 'environment variables updated');
  },
};

module.exports.actions = {
  doAction: function(args) {
    var action = args.splice(0, 1);
    _actions[action].apply(_actions, args);
  },

  availableActions: ['configure', 'nibble'],
};
