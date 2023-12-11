#!/bin/bash

systemctl stop mergewall_TMDT.service
systemctl disable mergewall_TMDT.service
sudo rm /etc/systemd/system/mergewall_TMDT.service
systemctl daemon-reload
