#!/bin/bash

sudo cp mergewall_TMDT.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable mergewall_TMDT.service
systemctl start mergewall_TMDT.service
