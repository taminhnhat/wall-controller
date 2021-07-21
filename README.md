### REQUIREMENTS
pc: raspberry pi 3/4
os: ubuntu server 20.04
mongodb
nodejs 24 or above
C++

### OPERATING
## 1. RUN PROJECT

# before run, find and kill pigoiod pid if exist
>cat /var/run/pigpio.pid
>sudo kill -9 <pid>

!!! Do not run 'sudo pigpiod'

# Run on Raspberry pi
>sudo node index.js > system.log




## 2. RUN TEST BY TERMINAL

# Start a socket client
>node
>io = require('socket.io-client');
>socket = io.connect('ws://localhost:3000');

# Add command from user
>socket.emit('user:command', 'lightOn.M.1.1.front');
>socket.emit('user:command', 'lightOff.M.2.1.back');
>socket.emit('user:command', 'lightTest.M.1.1.front');

# Delete from collection on database
>socket.emit('user:db:clear', 'buttons', '');




## 3. PI

# Shutdown
>sudo shutdown -h now

# Reboot
>sudo reboot

# View hardware
>hwinfo
>hwinfo --short

# View memmory
>free

# Set PS1
\[\e]0;\u@\h: \w\a\]${debian_chroot:+($debian_chroot)}\[\033[01;32m\]Wall-M3 \u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$


## 4. TRANSFER FILE TO PI

>scp index.js pi@172.16.0.89:~/wallController



## 5. KILL ALL PROCESS

# Replace pi with username
>killall -u pi




## 5. SET STATIC USB PATH FOR SCANNER AND LCD

# Get usb port infor
>udevadm info --name=/dev/ttyACM0 --attribute-walk

In raspberry terminal

# Rasberry pi 3 B+
-------------devpath-------------
|||||||||||||||||||||||||||||||||
||         ||  1.1.2 ||  1.3   ||
||   RJ45  ||________||________||
||         ||  1.1.3 ||  1.2   ||
||||\   /||||________||________||
|||||||||||||||||||||||||||||||||
---------------------------------

# Rasberry pi 4
-------------devpath-------------
|||||||||||||||||||||||||||||||||
||   1.3  ||  1.1   ||         ||
||________||________||   RJ45  ||
||   1.4  ||  1.2   ||         ||
||________||________||||\   /||||
|||||||||||||||||||||||||||||||||
---------------------------------

>cd /etc/udev/rules.d/
>sudo touch minhnhat.rules
>sudo nano minhnhat.rules

KERNEL=="ttyACM[0-9]*", SUBSYSTEM=="tty",ATTRS{idVendor}=="065a",ATTRS{idProduct}=="a002",ATTRS{devpath}=="1.1",SYMLINK="frontScanner"
KERNEL=="ttyACM[0-9]*", SUBSYSTEM=="tty",ATTRS{idVendor}=="065a",ATTRS{idProduct}=="a002",ATTRS{devpath}=="1.2",SYMLINK="backScanner"
KERNEL=="ttyUSB[0-9]*", SUBSYSTEM=="tty",ATTRS{idVendor}=="067b",ATTRS{idProduct}=="2303",ATTRS{devpath}=="1.4",SYMLINK="lcdScreen"

>sudo udevadm control --reload-rules
>sudo udevadm trigger

# Sometimes there's something wrong with devpath, just restart the pi




## 6. STARTUP SCRIPT IN PI

# Create a new servive
>sudo touch /etc/systemd/system/minhnhat.service
>sudo nano /etc/systemd/system/minhnhat.service

[Unit]
Description=Startup

[Service]
ExecStart=/home/ubuntu/startup/startup.sh

[Install]
WantedBy=default.target

# Create a shell script
>sudo nano /home/ubuntu/startup/startup.sh

#!/bin/bash

date > /root/report.txt
du -sh /home/ >> /root/report.txt

sudo node /home/ubuntu/startup/startup.js

# 
>sudo chmod 744 /home/ubuntu/startup/startup.sh
>sudo chmod 664 /etc/systemd/system/minhnhat.service
>systemctl daemon-reload
>systemctl enable minhnhat.service

# Test the script
>systemctl start minhnhat.service
>cat /root/report.txt

# Reboot
>sudo reboot

# Change password for user ubuntu
>sudo passwd ubuntu




## 7. WORKING WITH SERVICE

# Start
systemctl start minhnhat.service

# Stop
systemctl stop minhnhat.service

# Restart
systemctl restart minhnhat.service

# Get status
systemctl status minhnhat.service




## 8. Lock editting files

# Give the owner rx permissions, but not w 
chmod u=rx file
 
# Deny rwx permission for group and others 
chmod go-rwx file       

# Give write permission to the group
chmod g+w file

# Give execute permission to everybody
chmod a+x file1 file2

# OK to combine like this with a comma
chmod g+rx,o+x file  

## 9. View service log

journalctl -u minhnhat.service

journalctl