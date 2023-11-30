# Install openvpn
- [Install guide](https://openvpn.net/cloud-docs/owner/connectors/connector-user-guides/openvpn-3-client-for-linux.html)  
- Download vpn profile (*.ovpn)  
- Copy vpn profile to /etc/openvpn3/autoload/
```sh
# download or using scp to send profile to client
scp -P 22 *ovpn ubuntu@192.168.1.20:/home/ubuntu
# move profile to autooad folder
cd /home/ubuntu
sudo mv *ovpn /etc/openvpn3/autoload/
```
- Import vpn profile  
```sh
sudo openvpn3 config-import --config /etc/openvpn3/autoload/*.ovpn --name "fahasaopenvpn" --persistent
```
- Create autoload file [/etc/openvpn3/autoload/connector.autoload](./connector.autoload)  

**Note:** profile file (.ovpn) and auload file (.autoload) must have same name, **eg**: wall01-tmdt.ovpn, wall01-tmdt.autoload
```sh
sudo nano /etc/openvpn3/autoload/connector.autoload 
```
paste this and save in connector.autoload
```
{
   "autostart": true,
    "name": "fahasaopenvpn",
    "tunnel": {
        "persist": true
    }
}
```
Start openvpn autoload service
```sh
systemctl enable openvpn3-autoload
systemctl start openvpn3-autoload
systemctl status openvpn3-autoload
```