#!/bin/bash

date > /root/report.txt
du -sh /home/ >> /root/report.txt

node /home/ubuntu/wall-controller/index.js > /home/ubuntu/wall-controller/log/wall-process.log