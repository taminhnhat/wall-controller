#!/bin/bash

mkfifo /tmp/emit_gpio
mkfifo /tmp/gpio_callback
sudo /home/ubuntu/wall-controller/gpio/main > /var/log/wall-controller/gpio-process.log