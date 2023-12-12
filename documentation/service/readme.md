# SERVICE
Create services at /etc/systemd/system  

```sh
#
cd /home/ubuntu/wall-controller/scripts
sudo chmod 744 create_server_service.sh
sudo chmod 744 delete_server_service.sh
sudo chmod 744 mergewall_TMDT.sh
# to create service
./create_server_service.sh
# to remove service
./delete_server_service.sh
# view service logs
cat /home/ubuntu/logs/mergewall_TMDT.log
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