#!/bin/bash

mkfifo /tmp/emit_gpio
mkfifo /tmp/gpio_callback
sudo chmod 777 /tmp/emit_gpio
sudo chmod 777 /tmp/gpio_callback
sudo echo '' > /var/log/wall-controller/gpio.log
sudo echo '' > /var/log/wall-controller/gateway.log
sudo chmod 777 /var/log/wall-controller/gpio.log
sudo chmod 777 /var/log/wall-controller/gateway.log
sudo node /home/ubuntu/wall-controller/index.js > /var/log/wall-controller/gateway.log
