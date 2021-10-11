#!/bin/bash

date > /root/report.txt
du -sh /home/ >> /root/report.txt

mkfifo /tmp/emit_gpio
mkfifo /tmp/gpio_callback