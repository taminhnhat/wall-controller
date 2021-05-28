#!/bin/bash

date > /root/report.txt
du -sh /home/ >> /root/report.txt

sudo /home/ubuntu/wall-controller/gpio/gpio > /home/ubuntu/wall-controller/log/gpio-process.log