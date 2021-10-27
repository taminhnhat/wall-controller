#!/bin/bash

date > /root/report.txt
du -sh /home/ >> /root/report.txt

sudo /home/ubuntu/wall-controller/gpio/main > /var/log/wall-controller/gpio-process.log