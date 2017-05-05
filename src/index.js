'use strict';

var fs = require('fs');
var http = require('http');
var path = require('path');
var prompt = require('readline-sync').question;

var _actions = {
  configPath: process.env.HOME + '/.fieldmouse',
  marathonPath: './marathon.json',

  /**
   * Uploads the given Marathon configuration to Marathon, first checking that
   * the configuration has an image tag and non-empty environment variables
   */
  shipit: function (configPath) {
    if (typeof configPath !== 'undefined' && configPath !== '') {
      this.marathonPath = path.resolve(configPath);
    }

    var config = this._loadConfig();
    if (!config) {
      return;
    }

    // Verify availablity of image contiguration
    if (!config.container || !config.container.docker || !config.container.docker.image) {
      console.log('Invalid Docker image specification');
      return;
    }

    // Check for image tag
    var imageParts = config.container.docker.image.split(':');
    if (imageParts.length < 2 || imageParts[1] === '') {
      var response = prompt('Your Docker image does not have a tag, do you want to continue [N/y]?') || 'n';
      if (response !== 'y') {
        return;
      }
    }

    // Check environment variables
    for (var key of Object.keys(config.env)) {
      if (config.env[key] === '') {
        var response = prompt('Environment variable "' + key + '" is empty, do you want to continue [N/y]?') || 'n';
        if (response !== 'y') {
          return;
        }
      }
    }

    // Retrieve the host address
    var host = this._getHost();
    if (!host) {
      return;
    }

    var hostParts = host.split(':');
    if (hostParts.length < 2) {
      hostParts.push('8080');
    }

    var reqOptions = {
      host: hostParts[0],
      port: hostParts[1],
      path: '/v2/apps',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    // PUT configuration
    console.log('Starting upload');
    var req = http.request(reqOptions, function (response) {
      var str = '';
      response.on('data', function (chunk) {
        str += chunk;
      });
      response.on('end', function () {
        console.log('Upload complete:', str);
      });
    });
    req.write(JSON.stringify([config]));
    req.end();
  },

  /**
   * Prompts user for the Marathon host address and writes the address to
   * ~/.fieldmouse
   */
  configure: function () {
    var defaultHost = this._getHost() || '127.0.0.1:8080';
    var host = prompt('What is your Marathon host? [' + defaultHost + '] ') ||
      defaultHost;
    fs.writeFileSync(this.configPath, host);
    console.log('Marathon host set to:', host);
  },

  version: function () {
    console.log('1.1.1');
  },

  /**
   * Performs the retrieval of Marathon application environment variables and
   * populates the values in marathon.json
   */
  nibble: function (configPath) {
    if (typeof configPath !== 'undefined' && configPath !== '') {
      this.marathonPath = path.resolve(configPath);
    }

    // Retrieve the host address
    var host = this._getHost();
    if (!host) {
      return;
    }

    var config = this._loadConfig();
    if (!config) {
      return;
    }

    // Retrieve the configuration of applications from Marathon
    http.get('http://' + host + '/v2/apps', function (res) {
      var data = '';
      res.on('data', function (chunk) {
        data += chunk;
      });

      res.on('end', function () {
        this._processData(JSON.parse(data).apps, config);
      }.bind(this));
    }.bind(this)).on('error', function (e) {
      console.log('Error:', e);
    });
  },

  /**
   * Attempts to load the Marathon config from the config path
   *
   * @return {?Object} Object representing the Marathon configuration
   */
  _loadConfig: function () {
    // Load the current application configuration from marathon.json
    var configFile;
    try {
      configFile = fs.readFileSync(this.marathonPath);
    } catch (e) {
      console.log('Could not locate marathon.json at', this.marathonPath);
      return;
    }

    return JSON.parse(configFile);
  },

  /**
   * Attempts to load the host address from the config path
   *
   * @return {?string} host address or null if not found
   */
  _getHost: function () {
    var host;
    try {
      host = fs.readFileSync(this.configPath).toString('utf8');
    } catch (e) {
      host = '';
    }

    if (host === '') {
      console.log('Could not load Marathon host.  Run `fieldmouse configure`.');
      return;
    }

    return host;
  },

  /**
   * Locates the current environment variables of the application in production
   * configuration and updates the application config with the environment
   * variable values
   */
  _processData: function (apps, config) {
    var appData;
    apps.forEach(function (app) {
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
    Object.keys(appData.env).forEach(function (key) {
      config.env[key] = appData.env[key];
    });

    this._writeConfig(config);
  },

  /**
   * Writes the configuration to marathon.json
   */
  _writeConfig: function (config) {
    fs.writeFileSync(this.marathonPath, JSON.stringify(config, null, 2));
    console.log('Application', config.id, 'environment variables updated');
  },
};

module.exports.actions = {
  doAction: function (args) {
    var action = args.splice(0, 1);
    _actions[action].apply(_actions, args);
  },

  availableActions: ['configure', 'nibble', 'shipit', 'version'],
};
