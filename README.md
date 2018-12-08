# Extend Device Add-in
Sample add-in that extends a device's properties using AddInData API

### Installation
Add the configuation below to the to the system setting -> addins section of the MyGeotab database
```
{
  "name": "extend device sample",
  "supportEmail": "support@geotab.com",
  "version": "0.0.1",
  "items": [{
    "url": "https://cdn.rawgit.com/Geotab/addin-extend-device/master/dist/addinExtendDevice.html",
    "path": "AdministrationLink/",
    "menuName": {
      "en": "Extend Device"
    },
    "icon": "https://cdn.jsdelivr.net/gh/Geotab/addin-extend-device@master/dist/images/icon.svg"
  }]
}
```
