# SERVICE
Create services at /etc/systemd/system  
'Wall-gateway.sh'
```
#!/bin/bash

mkfifo /tmp/emit_gpio
mkfifo /tmp/gpio_callback
sudo chmod 660 /tmp/emit_gpio
sudo chmod 660 /tmp/gpio_callback
sudo echo '' > /var/log/wall-controller/gpio.log
sudo echo '' > /var/log/wall-controller/gateway.log
sudo chmod 744 /var/log/wall-controller/gpio.log
sudo chmod 744 /var/log/wall-controller/gateway.log
sudo node /home/ubuntu/wall-controller/index.js > /var/log/wall-controller/gateway.log
```
Wall-gpio.sh
```
#!/bin/bash

sudo /home/ubuntu/wall-controller/gpio/main > /var/log/wall-controller/gpio.log
```

```sh
#
$ sudo chmod 744 ~/service/wall-gpio.sh
$ sudo chmod 744 ~/service/wall-gateway.sh
$ ls ~/service/ -al
#
$ sudo chmod 664 /etc/systemd/system/wall-gpio.service
$ sudo chmod 664 /etc/systemd/system/wall-gateway.service
$ ls /etc/systemd/system -al
#
$ sudo cp wall-controller/service/wall-gpio.service /etc/systemd/system
$ sudo cp wall-controller/service/wall-gateway.service /etc/systemd/system
# reload service
$ systemctl daemon-reload
#
$ systemctl enable wall-gpio.service
$ systemctl enable wall-gateway.service
# show pipes and logs
$ ls /tmp -al
$ ls /var/log/wall-controller/ -al
#
$ systemctl start wall-gpio.service
$ systemctl start wall-gateway.service
# Reboot
$ sudo reboot
```
Working with service
```sh
# start
$ systemctl start wall-gateway.service
# stop
$ systemctl stop wall-gateway.service
# restart
$ systemctl restart wall-gateway.service
# get status
$ systemctl status wall-gateway.service
# debug
$ sudo journalctl --unit=wall-gateway
$ sudo journalctl --unit=wall-gpio
```
View service logs
```sh
$ cat /var/log/wall-controller/gpio-process.log
$ cat /var/log/wall-controller/gateway-process.log
```

Chmod options
|#|rwx|
|-|-|
|7|rwx|
|6|rw-|
|5|r-x|
|4|r--|
|3|-wx|
|2|-w-|
|1|--x|
|0|---|

Remove service
```sh
$ systemctl stop [servicename]
$ systemctl disable [servicename]
$ rm /etc/systemd/system/[servicename]
rm /etc/systemd/system/[servicename] # and symlinks that might be related
rm /usr/lib/systemd/system/[servicename] 
rm /usr/lib/systemd/system/[servicename] # and symlinks that might be related
$ systemctl daemon-reload
$ systemctl reset-failed
```