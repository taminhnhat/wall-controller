#!/bin/bash

date > /root/report.txt
du -sh /home/ >> /root/report.txt

mkfifo ../pipe/pipe_emit_light
mkfifo ../pipe/pipe_button_callback