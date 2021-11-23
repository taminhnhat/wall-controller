Plug in the usb port, then get usb port infor
```sh
$ udevadm info --name=/dev/ttyACM0 --attribute-walk
```

```sh
$ cd /etc/udev/rules.d/
$ sudo touch minhnhat.rules
$ sudo nano minhnhat.rules
```
Use idVendor, idProduct, devpath with path found above
```
KERNEL=="ttyACM[0-9]*",SUBSYSTEM=="tty",ATTRS{idVendor}=="065a",ATTRS{idProduct}=="a002",ATTRS{devpath}=="1.2.1", SYMLINK="frontScanner"  
KERNEL=="ttyACM[0-9]*",SUBSYSTEM=="tty",ATTRS{idVendor}=="065a",ATTRS{idProduct}=="a002",ATTRS{devpath}=="1.2.3",SYMLINK="backScanner"  
KERNEL=="ttyUSB[0-9]*",SUBSYSTEM=="tty",ATTRS{idVendor}=="067b",ATTRS{idProduct}=="2303",ATTRS{devpath}=="1.2.2",SYMLINK="lcdScreen"
KERNEL=="ttyUSB[0-9]*",SUBSYSTEM=="tty",ATTRS{idVendor}=="067b",ATTRS{idProduct}=="2303",ATTRS{devpath}=="1.1.2",SYMLINK="rgbHub"
```
Reload new rules
```sh
$ sudo udevadm control --reload-rules
$ sudo udevadm trigger
```
Sometimes there's something wrong with devpath, just restart the pi

[HOME](../README.md)