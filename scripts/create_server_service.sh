#!/bin/bash

sudo cp mergewall_TMDT.service /home/nhattm/.config/systemd/user
systemctl --user daemon-reload
systemctl --user enable mergewall_TMDT.service
systemctl --user start mergewall_TMDT.service
