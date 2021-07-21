To configure netplan, save configuration files under /etc/netplan/ with a .yaml extension (e.g. /etc/netplan/config.yaml), then run sudo netplan apply. This command parses and applies the configuration to the system. Configuration written to disk under /etc/netplan/ will persist between reboots.(go https://netplan.io/examples/ for more information)
### Step by step
# 1. Go to /etc/netplan
$cd /etc/netplan
# 2. Edit *.yaml file
$sudo nano 50-cloud-init.yaml
Use Ctrl+S to save and Ctrl+X to exit
# 3. Generate netplan
$sudo netplan generate
# 4. Apply netplan
$sudo netplan apply
# 5. Check ip
$ip a
or
$ifconfig