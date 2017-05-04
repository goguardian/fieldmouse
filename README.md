Fieldmouse
==========

A command line tool for populating environment variables of a Marathon configuration file from current production values.


## Installation


```$ npm install -g fieldmouse```


## Usage


```$ fieldmouse configure``` - Configure fieldmouse for a Marathon installation


```$ fieldmouse nibble``` - Execute the population of environment variables


```$ fieldmouse nibble ../some/app/path/config.json``` - Execute the population of environment variables for a specified marathon configuration file


```$ fieldmouse shipit``` - Upload the configuration to Marathon


```$ fieldmouse shipit ../some/app/path/config.json``` - Upload the configuration to Marathon
