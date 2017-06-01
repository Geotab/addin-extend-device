/**
 * @returns {{initialize: Function, focus: Function, blur: Function}}
 */
geotab.addin.addinExtendDevice = function () {
  'use strict';

  let addInId = 'a8sQ4W7bK5Uy6HOnUTAHlJw';
  let api;
  let state;

  let addin;

  let Property = class Property {
    constructor(key, value, isSaved) {
      this.key = key;
      this.value = value;
      this.isSaved = isSaved;
    }
  };

  let store = {
    fetch: devieId => {
      return new Promise((resolve, reject) => {
        api.call('Get', {
            typeName: 'AddInData',
            search: {
              addInId: addInId,
              whereClause: `device.id = "${devieId}"`
            }
          },
          results => {
            let propertiesId = null;
            let properties = [];

            if (results.length > 0) {
              let data = JSON.parse(results[0].data);
              properties = Object.keys(data.properties || {}).map(key => {
                return new Property(key, data.properties[key], true);
              });
              propertiesId = results[0].id;
            } else {
              propertiesId = null;
            }

            // empty property serves as empty row to add from
            properties.push(new Property('', '', false));

            resolve({
              propertiesId,
              properties
            });
          }, reject);
      });
    },
    save: (deviceId, dataId, props) => {
      let add = (id, properties) => {
        return new Promise((resolve, reject) => {
          let simpleProperties = {};

          properties.forEach(prop => {
            if (!prop.key) {
              return;
            }
            simpleProperties[prop.key] = prop.value;
          });

          api.call('Add', {
            typeName: 'AddInData',
            entity: {
              addInId,
              groups: [{
                id: 'GroupCompanyId' // TODO: should be user's groups
              }],
              data: JSON.stringify({
                device: {
                  id: id
                },
                properties: simpleProperties
              })
            }
          }, resolve, reject);
        });
      };

      let remove = id => {
        return new Promise((resolve, reject) => {
          if (!id) {
            return resolve();
          }

          api.call('Remove', {
            typeName: 'AddInData',
            entity: {
              id,
              addInId
            }
          }, resolve, reject);
        });
      };

      // in the current implementation set cannot remove properties, the data object will be extended with the data propert of the provided data
      // for that reason we will remove the existing data and replace with the updated data
      return remove(dataId).then(add(deviceId, props));
    }
  };

  let errorTimeout;
  let errorHandler = msg => {
    clearTimeout(errorTimeout);
    addin.error = {
      message: msg,
      isHidden: false
    };
    errorTimeout = setTimeout(() => {
      addin.error.isHidden = true;
    }, 5000);
  };

  return {
    /**
     * initialize() is called only once when the Add-In is first loaded. Use this function to initialize the
     * Add-In's state such as default values or make API requests (MyGeotab or external) to ensure interface
     * is ready for the user.
     * @param {object} freshApi - The GeotabApi object for making calls to MyGeotab.
     * @param {object} freshState - The page state object allows access to URL, page navigation and global group filter.
     * @param {function} initializeCallback - Call this when your initialize route is complete. Since your initialize routine
     *        might be doing asynchronous operations, you must call this method when the Add-In is ready
     *        for display to the user.
     */
    initialize: function (freshApi, freshState, initializeCallback) {

      addin = new Vue({
        el: '#addinExtendDevice',
        data: {
          error: {
            message: '',
            isHidden: true
          },
          selected: null,
          newProperty: {},
          devices: [],
          properties: [],
          propertiesId: null
        },
        methods: {
          remove: (val) => {
            var index = addin.properties.indexOf(val);
            addin.properties.splice(index, 1);
            store.save(addin.selected, addin.propertiesId, addin.properties).catch(errorHandler);
          },
          edit: (val) => {
            if (!val.isSaved || !val.key) {
              return;
            }
            store.save(addin.selected, addin.propertiesId, addin.properties).catch(errorHandler);
          },
          add: (val) => {
            if (!val.key) {
              return;
            }

            store.save(addin.selected, addin.propertiesId, addin.properties).then(result => {
              if (result) {
                addin.propertiesId = result;
              }

              addin.properties.forEach(prop => {
                prop.isSaved = true;
              });

              addin.properties.push({
                key: null,
                value: null,
                isSaved: false
              });
            }).catch(errorHandler);
          }
        },
        watch: {
          selected: (val, oldVal) => {

            if (!val || val === oldVal) {
              return;
            }

            state.setState({
              device: val
            });

            store.fetch(val).then(result => {
              addin.properties = result.properties;
              addin.propertiesId = result.propertiesId;
            }).catch(errorHandler);
          }
        }
      });

      // MUST call initializeCallback when done any setup
      initializeCallback();
    },

    /**
     * focus() is called whenever the Add-In receives focus.
     *
     * The first time the user clicks on the Add-In menu, initialize() will be called and when completed, focus().
     * focus() will be called again when the Add-In is revisited. Note that focus() will also be called whenever
     * the global state of the MyGeotab application changes, for example, if the user changes the global group
     * filter in the UI.
     *
     * @param {object} frashApi - The GeotabApi object for making calls to MyGeotab.
     * @param {object} freshState - The page state object allows access to URL, page navigation and global group filter.
     */
    focus: function (freshApi, freshState) {
      api = freshApi;
      state = freshState;

      api.call('Get', {
        typeName: 'Device',
        resultsLimit: 500,
        search: {
          fromDate: new Date().toISOString(),
          groups: state.getGroupFilter()
        }
      }, devices => {
        devices.sort((a, b) => {
          if (a.name < b.name) {
            return -1;
          }

          if (a.name > b.name) {
            return 1;
          }

          return 0;
        });

        addin.devices = devices;

        let args = state.getState();
        if (args.device) {
          addin.selected = args.device;
        }

      }, errorHandler);
    },

    /**
     * blur() is called whenever the user navigates away from the Add-In.
     *
     * Use this function to save the page state or commit changes to a data store or release memory.
     */
    blur: function () {}
  };
};
