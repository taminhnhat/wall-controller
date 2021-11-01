#!/bin/bash

date > /root/report.txt
du -sh /home/ >> /root/report.txt

node /home/ubuntu/wall-controller/index.js > /var/log/wall-controller/gateway-process.log