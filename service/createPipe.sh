#!/bin/bash

mkfifo /tmp/emit_gpio
mkfifo /tmp/gpio_callback
sudo chmod 777 /tmp/emit_gpio
sudo chmod 777 /tmp/gpio_callback