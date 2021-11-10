#!/bin/bash

mkfifo /tmp/emit_gpio
mkfifo /tmp/gpio_callback
chmod 777 /tmp/emit_gpio
chmod 777 /tmp/gpio_callback
sudo node /home/ubuntu/wall-controller/index.js > ~/gateway.log
