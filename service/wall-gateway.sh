#!/bin/bash

mkfifo /tmp/user_cmd
chmod 777 /tmp/user_cmd
sudo echo '' > /var/log/wall-controller/gateway.log
sudo chmod 744 /var/log/wall-controller/gateway.log
node /home/ubuntu/wall-controller/index.js > /var/log/wall-controller/gateway.log