const APP_VERSION = "1.0.0";

function humanFileSize(bytes, si=false, dp=1) {
  const thresh = si ? 1000 : 1024;
  if (Math.abs(bytes) < thresh) {
    return bytes + ' Byte';
  }
  const units = si  ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = Math.pow(10, dp);
  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);
  return bytes.toFixed(dp) + ' ' + units[u];
}

const xhr = function(method, url, data={}, query={}, headers={}) {
  url = `https://kaios.tri1.workers.dev/?url=${encodeURIComponent(url)}`;
  return new Promise((resolve, reject) => {
    var xhttp = new XMLHttpRequest();
    var _url = new URL(url);
    for (var y in query) {
      _url.searchParams.set(y, query[y]);
    }
    url = _url.origin + _url.pathname + '?' + _url.searchParams.toString();
    xhttp.onreadystatechange = function() {
      if (this.readyState == 4) {
        if (this.status >= 200 && this.status <= 299) {
          try {
            const response = JSON.parse(xhttp.response);
            resolve({ raw: xhttp, response: response});
          } catch (e) {
            resolve({ raw: xhttp, response: xhttp.responseText});
          }
        } else {
          try {
            const response = JSON.parse(xhttp.response);
            reject({ raw: xhttp, response: response});
          } catch (e) {
            reject({ raw: xhttp, response: xhttp.responseText});
          }
        }
      }
    };
    xhttp.open(method, url, true);
    for (var x in headers) {
      xhttp.setRequestHeader(x, headers[x]);
    }
    if (Object.keys(data).length > 0) {
      xhttp.send(JSON.stringify(data));
    } else {
      xhttp.send();
    }
  });
}

function upload() {
    const client = new XMLHttpRequest({ mozSystem: true });
    const file = new Blob([JSON.stringify({time: new Date().toString()}, null, 2)], {type : 'application/json'});
    const fd = new FormData();
    fd.append("file", file);
    client.open("post", 'https://api.anonfiles.com/upload');
    // client.setRequestHeader("Content-Type", "multipart/form-data");
    client.send(fd);
    client.onreadystatechange = () => {
      if (client.readyState == 4 && client.status == 200) {
         console.log(client.statusText);
      }
    }
}

localforage.setDriver(localforage.INDEXEDDB);

window.addEventListener("load", function() {

  (navigator.b2g ? navigator.b2g.getDeviceStorages('sdcard') : navigator.getDeviceStorages('sdcard'))[0].get('trigger_permission');

  const dummy = new Kai({
    name: '_dummy_',
    data: {
      title: '_dummy_'
    },
    verticalNavClass: '.dummyNav',
    templateUrl: document.location.origin + '/templates/dummy.html',
    mounted: function() {},
    unmounted: function() {},
    methods: {},
    softKeyText: { left: 'L2', center: 'C2', right: 'R2' },
    softKeyListener: {
      left: function() {},
      center: function() {},
      right: function() {}
    },
    dPadNavListener: {
      arrowUp: function() {
        this.navigateListNav(-1);
      },
      arrowDown: function() {
        this.navigateListNav(1);
      }
    }
  });

  const state = new KaiState({});

  const changelogs = new Kai({
    name: 'changelogs',
    data: {
      title: 'changelogs'
    },
    templateUrl: document.location.origin + '/templates/changelogs.html',
    mounted: function() {
      this.$router.setHeaderTitle('Changelogs');
    },
    unmounted: function() {},
    methods: {},
    softKeyText: { left: '', center: '', right: '' },
    softKeyListener: {
      left: function() {},
      center: function() {},
      right: function() {}
    }
  });

  const filesPage = function($router, title, files) {
    console.log(title, files);
    var _files = [];
    for (var x in files) {
      const path = files[x].split('/');
      const name = path[path.length - 1];
      _files.push({ name: name, path: files[x] });
    }
    $router.push(
      new Kai({
        name: '_filesPage_',
        data: {
          title: '_dummy_',
          files: _files
        },
        verticalNavClass: '.fileNav',
        templateUrl: document.location.origin + '/templates/files.html',
        mounted: function() {
          $router.setHeaderTitle(title.charAt(0).toUpperCase() + title.slice(1));
        },
        unmounted: function() {},
        methods: {
          search: function(keyword) {
            this.verticalNavIndex = -1;
            if (keyword == null || keyword == '' || keyword.length == 0) {
              this.setData({ files: _files });
              return;
            }
            const result = _files.filter(file => file.name.toLowerCase().indexOf(keyword.toLowerCase()) >= 0);
            this.setData({ files: result });
          },
        },
        softKeyText: { left: 'More', center: 'UPLOAD', right: 'Search' },
        softKeyListener: {
          left: function() {
            if (this.verticalNavIndex > -1 && this.data.files.length > 0) {
              const f = this.data.files[this.verticalNavIndex];
              if (f) {
                var menu = [
                  {'text': 'File Info'},
                ]
                if (['audio', 'video', 'image'].indexOf(title.toLowerCase()) > -1) {
                  menu = [{'text': 'Open'}, ...menu];
                }
                this.$router.showOptionMenu('More', menu, 'SELECT', (selected) => {
                  if (selected.text === 'Open') {
                    const DS = new DataStorage(() => {}, () => {}, false);
                    DS.getFile(f.path, (properties) => {
                      var _launcher = new MozActivity({
                        name: "open",
                        data: {
                          blob: properties,
                          type: properties.type
                        }
                      });
                    }, (_err) => {
                      console.log(_err);
                    });
                  } else if (selected.text === 'File Info') {
                    const DS = new DataStorage(() => {}, () => {}, false);
                    DS.getFile(f.path, (properties) => {
                      console.log(properties);
                      var content = `<div style="font-size:90%"><h5>Name</h5><p>${f.name}</p><h5 style="margin-top:3px;">Path</h5><p>${f.path}</p><h5 style="margin-top:3px;">Last Modified</h5><p>${new Date(properties.lastModifiedDate).toLocaleString()}</p><h5 style="margin-top:3px;">Size</h5><p>${humanFileSize(properties.size)}</p></div>`;
                      this.$router.showDialog('File Info', content, null, 'Close', () => {}, ' ', () => {}, ' ', () => {}, () => {});
                      DS.destroy();
                    }, () => {
                      DS.destroy();
                    })
                  }
                }, () => {});
              }
            }
          },
          center: function() {},
          right: function() {
            const searchDialog = Kai.createDialog('Search', '<div><input id="search-input" placeholder="Enter your keyword" class="kui-input" type="text" /></div>', null, '', undefined, '', undefined, '', undefined, undefined, this.$router);
            searchDialog.mounted = () => {
              setTimeout(() => {
                setTimeout(() => {
                  this.$router.setSoftKeyText('Cancel' , '', 'Go');
                }, 103);
                const SEARCH_INPUT = document.getElementById('search-input');
                if (!SEARCH_INPUT) {
                  return;
                }
                SEARCH_INPUT.focus();
                SEARCH_INPUT.addEventListener('keydown', (evt) => {
                  switch (evt.key) {
                    case 'Backspace':
                    case 'EndCall':
                      if (document.activeElement.value.length === 0) {
                        this.$router.hideBottomSheet();
                        setTimeout(() => {
                          //this.methods.renderSoftKeyLCR();
                          SEARCH_INPUT.blur();
                        }, 100);
                      }
                      break
                    case 'SoftRight':
                      this.$router.hideBottomSheet();
                      setTimeout(() => {
                        //this.methods.renderSoftKeyLCR();
                        SEARCH_INPUT.blur();
                        this.methods.search(SEARCH_INPUT.value);
                      }, 100);
                      break
                    case 'SoftLeft':
                      this.$router.hideBottomSheet();
                      setTimeout(() => {
                        //this.methods.renderSoftKeyLCR();
                        SEARCH_INPUT.blur();
                      }, 100);
                      break
                  }
                });
              });
            }
            searchDialog.dPadNavListener = {
              arrowUp: function() {
                const SEARCH_INPUT = document.getElementById('search-input');
                SEARCH_INPUT.focus();
              },
              arrowDown: function() {
                const SEARCH_INPUT = document.getElementById('search-input');
                SEARCH_INPUT.focus();
              }
            }
            this.$router.showBottomSheet(searchDialog);
          }
        },
        dPadNavListener: {
          arrowUp: function() {
            if (this.verticalNavIndex <= 0)
              return
            this.navigateListNav(-1);
          },
          arrowDown: function() {
            const listNav = document.querySelectorAll(this.verticalNavClass);
            if (this.verticalNavIndex === listNav.length - 1)
              return
            this.navigateListNav(1);
          },
        }
      })
    );
  }

  const archievePage = new Kai({
    name: 'archieve',
    data: {
      archieve: {},
      filtered: [],
    },
    verticalNavClass: '.archvNav',
    templateUrl: document.location.origin + '/templates/archieve.html',
    mounted: function() {
      this.$router.setHeaderTitle('Files Archive');
      localforage.getItem('GROUPS')
      .then((GROUPS) => {
        if (GROUPS == null) {
          GROUPS = {};
        }
        var _filtered = [];
        for (var x in GROUPS) {
          _filtered.push({name: x});
        }
        this.setData({filtered: _filtered, archieve: GROUPS });
      });
    },
    unmounted: function() {},
    methods: {},
    softKeyText: { left: '', center: 'OPEN', right: '' },
    softKeyListener: {
      left: function() {},
      center: function() {
        if (this.verticalNavIndex > -1 && this.data.filtered.length > 0) {
          if (this.data.filtered[this.verticalNavIndex]) {
            const title = this.data.filtered[this.verticalNavIndex].name;
            const temp = this.data.archieve[title];
            if (temp) {
              filesPage(this.$router, title, temp);
            }
          }
        }
      },
      right: function() {}
    },
    dPadNavListener: {
      arrowUp: function() {
        if (this.verticalNavIndex <= 0)
          return
        this.navigateListNav(-1);
      },
      arrowDown: function() {
        const listNav = document.querySelectorAll(this.verticalNavClass);
        if (this.verticalNavIndex === listNav.length - 1)
          return
        this.navigateListNav(1);
      },
    }
  });

  const Home = new Kai({
    name: 'home',
    data: {
      title: 'home',
      authors: [],
      filtered: [],
    },
    verticalNavClass: '.homeNav',
    components: [],
    templateUrl: document.location.origin + '/templates/home.html',
    mounted: function() {
      this.$router.setHeaderTitle('K-AnonFiles');
      const CURRENT_VERSION = window.localStorage.getItem('APP_VERSION');
      if (APP_VERSION != CURRENT_VERSION) {
        this.$router.showToast(`Updated to version ${APP_VERSION}`);
        this.$router.push('changelogs');
        window.localStorage.setItem('APP_VERSION', APP_VERSION);
        return;
      }
    },
    unmounted: function() {
      
    },
    methods: {
      search: function(keyword) {
        this.verticalNavIndex = -1;
        if (keyword == null || keyword == '' || keyword.length == 0) {
          this.setData({ filtered: this.data.authors });
          return;
        }
        const result = this.data.authors.filter(author => author.name.toLowerCase().indexOf(keyword.toLowerCase()) >= 0);
        this.setData({ filtered: result });
      },
      getAuthor: function(author) {},
    },
    softKeyText: { left: 'Menu', center: 'SELECT', right: 'Search' },
    softKeyListener: {
      left: function() {
        var menu = [
          {'text': 'Refresh Archive'},
          {'text': 'Files Archive'},
          {'text': 'Changelogs'},
          {'text': 'Exit'},
        ]
        this.$router.showOptionMenu('Menu', menu, 'SELECT', (selected) => {
          if (selected.text === 'Refresh Archive') {
            const DS = new DataStorage((fileRegistry, documentTree, groups) => {
              console.log(groups);
              localforage.setItem('GROUPS', groups)
            }, (status) => {
              if (status) {
                DS.destroy();
                this.$router.hideLoading();
              } else {
                this.$router.showLoading();
              }
            });
          } else if (selected.text === 'Files Archive') {
            this.$router.push('archievePage');
          } else if (selected.text === 'Changelogs') {
            this.$router.push('changelogs');
          } else if (selected.text == 'Text-to-Speech Setting') {
            this.$router.push('ttsSetting');
          } else if (selected.text === 'Exit') {
            window.close();
          }
        }, () => {});
      },
      center: function() {
        if (this.verticalNavIndex > -1 && this.data.filtered.length > 0) {
          this.methods.getAuthor(this.data.filtered[this.verticalNavIndex]);
        }
      },
      right: function() {
        const searchDialog = Kai.createDialog('Search', '<div><input id="search-input" placeholder="Enter your keyword" class="kui-input" type="text" /></div>', null, '', undefined, '', undefined, '', undefined, undefined, this.$router);
        searchDialog.mounted = () => {
          setTimeout(() => {
            setTimeout(() => {
              this.$router.setSoftKeyText('Cancel' , '', 'Go');
            }, 103);
            const SEARCH_INPUT = document.getElementById('search-input');
            if (!SEARCH_INPUT) {
              return;
            }
            SEARCH_INPUT.focus();
            SEARCH_INPUT.addEventListener('keydown', (evt) => {
              switch (evt.key) {
                case 'Backspace':
                case 'EndCall':
                  if (document.activeElement.value.length === 0) {
                    this.$router.hideBottomSheet();
                    setTimeout(() => {
                      //this.methods.renderSoftKeyLCR();
                      SEARCH_INPUT.blur();
                    }, 100);
                  }
                  break
                case 'SoftRight':
                  this.$router.hideBottomSheet();
                  setTimeout(() => {
                    //this.methods.renderSoftKeyLCR();
                    SEARCH_INPUT.blur();
                    this.methods.search(SEARCH_INPUT.value);
                  }, 100);
                  break
                case 'SoftLeft':
                  this.$router.hideBottomSheet();
                  setTimeout(() => {
                    //this.methods.renderSoftKeyLCR();
                    SEARCH_INPUT.blur();
                  }, 100);
                  break
              }
            });
          });
        }
        searchDialog.dPadNavListener = {
          arrowUp: function() {
            const SEARCH_INPUT = document.getElementById('search-input');
            SEARCH_INPUT.focus();
          },
          arrowDown: function() {
            const SEARCH_INPUT = document.getElementById('search-input');
            SEARCH_INPUT.focus();
          }
        }
        this.$router.showBottomSheet(searchDialog);
      }
    },
    dPadNavListener: {
      arrowUp: function() {
        if (this.verticalNavIndex <= 0)
          return
        this.navigateListNav(-1);
      },
      arrowDown: function() {
        const listNav = document.querySelectorAll(this.verticalNavClass);
        if (this.verticalNavIndex === listNav.length - 1)
          return
        this.navigateListNav(1);
      },
    }
  });

  const router = new KaiRouter({
    title: 'K-AnonFiles',
    routes: {
      'index' : {
        name: 'Home',
        component: Home
      },
      'archievePage' : {
        name: 'archieve',
        component: archievePage
      },
      'changelogs' : {
        name: 'changelogs',
        component: changelogs
      }
    }
  });

  const app = new Kai({
    name: '_APP_',
    data: {},
    templateUrl: document.location.origin + '/templates/template.html',
    mounted: function() {},
    unmounted: function() {},
    router,
    state
  });

  try {
    app.mount('app');
  } catch(e) {
    console.log(e);
  }

  function displayKaiAds() {
    var display = true;
    if (window['kaiadstimer'] == null) {
      window['kaiadstimer'] = new Date();
    } else {
      var now = new Date();
      if ((now - window['kaiadstimer']) < 300000) {
        display = false;
      } else {
        window['kaiadstimer'] = now;
      }
    }
    console.log('Display Ads:', display);
    if (!display)
      return;
    getKaiAd({
      publisher: 'ac3140f7-08d6-46d9-aa6f-d861720fba66',
      app: 'k-anonfiles',
      slot: 'kaios',
      onerror: err => console.error(err),
      onready: ad => {
        ad.call('display')
        ad.on('close', () => {
          app.$router.hideBottomSheet();
          document.body.style.position = '';
        });
        ad.on('display', () => {
          app.$router.hideBottomSheet();
          document.body.style.position = '';
        });
      }
    })
  }

  displayKaiAds();

  document.addEventListener('visibilitychange', function(ev) {
    if (document.visibilityState === 'visible') {
      displayKaiAds();
    }
  });
});
