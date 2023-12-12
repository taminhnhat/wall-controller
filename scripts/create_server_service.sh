#!/bin/bash

sudo cp mergewall_TMDT.service /etc/systemd/system/
sudo chmod 744 /home/ubuntu/wall-controller/scripts/mergewall_TMDT.sh
systemctl daemon-reload
systemctl enable mergewall_TMDT.service
systemctl start mergewall_TMDT.service
