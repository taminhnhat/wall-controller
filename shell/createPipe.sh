#!/bin/bash

date > /root/report.txt
du -sh /home/ >> /root/report.txt

mkfifo ../pipe/emit_gpio
mkfifo ../pipe/gpio_callback