#!/bin/bash

systemctl --user stop mergewall_TMDT.service
systemctl --user disable mergewall_TMDT.service
sudo rm /home/nhattm/.config/systemd/user/mergewall_TMDT.service
systemctl --user daemon-reload
