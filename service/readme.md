# SERVICE
```sh
$ sudo chmod 744 ~/wall-controller/service/gpio-process.sh
$ sudo chmod 744 ~/wall-controller/service/gateway-process.sh
$ sudo chmod 664 ~/wall-controller/service/wall-gpio.service
$ sudo chmod 664 ~/wall-controller/service/wall-gateway.service
# load service
$ systemctl daemon-reload
$ systemctl enable wall-gpio.service
$ systemctl enable wall-gateway.service
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
```