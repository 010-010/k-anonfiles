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

function ufileUpload($router, blob) {
  $router.showLoading();
  const init = new XMLHttpRequest({ mozSystem: true });
  init.open("POST", "https://up.ufile.io/v1/upload/create_session");
  init.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  init.onreadystatechange = () => {
    if (init.readyState === 4 && init.status == 200) {
      const json = JSON.parse(init.responseText);
      const upload = new XMLHttpRequest({ mozSystem: true });
      const fd = new FormData();
      fd.append("chunk_index", 1);
      fd.append("fuid", json.fuid);
      fd.append("file", blob);
      upload.open("POST", 'https://up.ufile.io/v1/upload/chunk', true);
      upload.send(fd);
      upload.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          var percentComplete = evt.loaded / evt.total * 100;
          $router.showToast(`${percentComplete.toFixed(2)}%`);
        }
      };
      upload.onerror = () => {
        $router.hideLoading();
      }
      upload.onreadystatechange = () => {
        if (upload.readyState == 4 && upload.status == 200) {
          const response = JSON.parse(upload.responseText);
          var finalize = new XMLHttpRequest({ mozSystem: true });
          finalize.open("POST", "https://up.ufile.io/v1/upload/finalise");
          finalize.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
          finalize.onreadystatechange = () => {
            if (finalize.readyState === 4 && finalize.status == 200) {
              $router.hideLoading();
              const response = JSON.parse(finalize.responseText);
              localforage.getItem('ARCHIVE')
              .then((ARCHIVE) => {
                if (ARCHIVE == null) {
                  ARCHIVE = {};
                }
                response.uploaded_at = new Date().getTime();
                ARCHIVE[response.id] = response;
                $router.showToast('DONE');
                return localforage.setItem('ARCHIVE', ARCHIVE);
              });
            }
          };
          var paths = blob.name.split('/');
          var name = paths[paths.length - 1];
          var type = 'other';
          if (blob.type != '') {
            var segs = blob.type.split('/');
            type = segs[segs.length - 1];
          }
          var data = `fuid=${json.fuid}&file_name=${name}&file_type=${type}&total_chunks=1`;
          finalize.send(data);
          finalize.onerror = () => {
            $router.hideLoading();
          }
          finalize.onloadend = () => {
            $router.hideLoading();
          }
        }
      }
    }
  };
  var data = `file_size=${blob.size}`;
  init.send(data);
  init.onerror = () => {
    $router.hideLoading();
  }
}

function anonUpload($router, blob) {
  return
  $router.showLoading();
  const client = new XMLHttpRequest({ mozSystem: true });
  const fd = new FormData();
  fd.append("file", blob);
  client.open("post", 'https://api.anonfiles.com/upload', true);
  client.upload.onprogress = (evt) => {
    if (evt.lengthComputable) {
      var percentComplete = evt.loaded / evt.total * 100;
      $router.showToast(`${percentComplete.toFixed(2)}%`);
    }
  };
  client.send(fd);
  client.onreadystatechange = () => {
    if (client.readyState == 4 && client.status == 200) {
      $router.hideLoading();
      const response = JSON.parse(client.responseText);
      localforage.getItem('ARCHIVE')
      .then((ARCHIVE) => {
        if (ARCHIVE == null) {
          ARCHIVE = {};
        }
        response.data.file.metadata.uploaded_at = new Date().getTime();
        ARCHIVE[response.data.file.metadata.id] = response.data.file;
        $router.showToast('DONE');
        return localforage.setItem('ARCHIVE', ARCHIVE);
      });
    }
  }
  client.onerror = () => {
    $router.hideLoading();
  }
  client.onloadstart = () => {
    $router.showLoading();
  }
  client.onloadend = () => {
    $router.hideLoading();
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

  const guide = new Kai({
    name: 'guide',
    data: {
      title: 'guide'
    },
    templateUrl: document.location.origin + '/templates/guide.html',
    mounted: function() {
      this.$router.setHeaderTitle('User Guide');
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
                      var Xtvt = navigator.b2g ? WebActivity : MozActivity;
                      const x = new Xtvt({
                        name: "open",
                        data: {
                          blob: properties,
                          type: properties.type
                        }
                      });
                      if (navigator.b2g)
                        x.start();
                      DS.destroy();
                    }, (_err) => {
                      DS.destroy();
                    });
                  } else if (selected.text === 'File Info') {
                    const DS = new DataStorage(() => {}, () => {}, false);
                    DS.getFile(f.path, (properties) => {
                      var content = `<div style="font-size:90%"><h5>Name</h5><p>${f.name}</p><h5 style="margin-top:3px;">Path</h5><p>${f.path}</p><h5 style="margin-top:3px;">Last Modified</h5><p>${new Date(properties.lastModifiedDate || properties.lastModified).toLocaleString()}</p><h5 style="margin-top:3px;">Size</h5><p>${humanFileSize(properties.size)}</p></div>`;
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
          center: function() {
            if (this.verticalNavIndex > -1 && this.data.files.length > 0) {
              const f = this.data.files[this.verticalNavIndex];
              if (f) {
                const DS = new DataStorage(() => {}, () => {}, false);
                DS.getFile(f.path, (blob) => {
                  this.$router.showDialog('Confirm', 'Are you sure to upload this file ?', null, 'YES', () => {
                    anonUpload(this.$router, blob);
                    ufileUpload(this.$router, blob);
                  }, 'Cancel', () => {}, ' ', () => {}, () => {});
                  DS.destroy();
                }, (_err) => {
                  DS.destroy();
                });
              }
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
                          SEARCH_INPUT.blur();
                        }, 100);
                      }
                      break
                    case 'SoftRight':
                      this.$router.hideBottomSheet();
                      setTimeout(() => {
                        SEARCH_INPUT.blur();
                        this.methods.search(SEARCH_INPUT.value);
                      }, 100);
                      break
                    case 'SoftLeft':
                      this.$router.hideBottomSheet();
                      setTimeout(() => {
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
      empty: true,
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
        this.setData({filtered: _filtered, archieve: GROUPS, empty: Object.keys(GROUPS).length == 0 });
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
      empty: true,
      archive: [],
      filtered: [],
    },
    verticalNavClass: '.homeNav',
    components: [],
    templateUrl: document.location.origin + '/templates/home.html',
    mounted: function() {
      this.$router.setHeaderTitle('Kloud Storage');
      const CURRENT_VERSION = window.localStorage.getItem('APP_VERSION');
      if (APP_VERSION != CURRENT_VERSION) {
        this.$router.showToast(`Updated to version ${APP_VERSION}`);
        this.$router.push('changelogs');
        window.localStorage.setItem('APP_VERSION', APP_VERSION);
        return;
      }
      this.methods.loadArchive();
    },
    unmounted: function() {},
    methods: {
      loadArchive: function() {
        localforage.getItem('ARCHIVE')
        .then((ARCHIVE) => {
          var _archive = [];
          for (var x in ARCHIVE) {
            ARCHIVE[x].expired_at = new Date(ARCHIVE[x].uploaded_at + 2592000000).getTime();
            if (new Date().getTime() < ARCHIVE[x].expired_at) {
              _archive.push({ name: ARCHIVE[x].name, metadata: ARCHIVE[x] });
            } else {
              delete ARCHIVE[x];
            }
          }
          _archive.sort((a, b) => {
            var dA = a.metadata.uploaded_at;
            var dB = b.metadata.uploaded_at;
            if (dA > dB)
              return -1;
            if (dA < dB)
              return 1;
            return 0;
          });
          if (this.verticalNavIndex + 1 > _archive.length)
            this.verticalNavIndex--;
          if (this.$router.stack.length === 1)
            this.setData({ archive: _archive, filtered: _archive, empty: _archive.length === 0 });
          localforage.setItem('ARCHIVE', ARCHIVE);
        });
      },
      search: function(keyword) {
        this.verticalNavIndex = -1;
        if (keyword == null || keyword == '' || keyword.length == 0) {
          this.setData({ filtered: this.data.archive });
          return;
        }
        const result = this.data.archive.filter(f => f.name.toLowerCase().indexOf(keyword.toLowerCase()) >= 0);
        this.setData({ filtered: result });
      },
      action: function(file) {
        var menu = [
          {'text': 'Open URL'},
          {'text': 'Share URL via SMS'},
          {'text': 'Share URL via E-Mail'},
          {'text': 'File Info'},
          {'text': 'Remove'},
        ]
        this.$router.showOptionMenu('More', menu, 'SELECT', (selected) => {
          if (selected.text === 'Open URL') {
            window.open(file.metadata.url)
          } else if (selected.text === 'File Info') {
            var content = `<div style="font-size:90%"><h5>ID</h5><p>${file.metadata.id}</p><h5 style="margin-top:3px;">Name</h5><p>${file.metadata.name}</p><h5 style="margin-top:3px;">URL</h5><p>${file.metadata.url}</p><h5 style="margin-top:3px;">Uploaded At</h5><p>${new Date(file.metadata.uploaded_at).toLocaleString()}</p><h5 style="margin-top:3px;">Size</h5><p>${file.metadata.size}</p><h5 style="margin-top:3px;">Expired</h5><p>${new Date(file.metadata.expired_at).toLocaleString()}</p></div>`;
            setTimeout(() => {
              this.$router.showDialog('File Info', content, null, 'Close', () => {}, ' ', () => {}, ' ', () => {}, () => {});
            }, 200);
          } else if (selected.text === 'Share URL via SMS' || selected.text === 'Share URL via E-Mail') {
            if (selected.text === 'Share URL via SMS') {
              const xtvt = document.getElementById('xtvt_sms');
              xtvt.href = `sms:?&body=${encodeURIComponent(file.metadata.url)}`;
              xtvt.click();
            } else {
              const xtvt = document.getElementById('xtvt_email');
              xtvt.href = `mailto:?to=&subject=${file.metadata.name}&body=${encodeURIComponent(file.metadata.url)}`;
              xtvt.click();
            }
          } else if (selected.text === 'Remove') {
            setTimeout(() => {
              this.$router.showDialog('Confirm', `Are you sure to remove ${file.metadata.name} ?`, null, 'YES', () => {
                localforage.getItem('ARCHIVE')
                .then((ARCHIVE) => {
                  if (ARCHIVE == null) {
                    ARCHIVE = {};
                  }
                  delete ARCHIVE[file.metadata.id];
                  return localforage.setItem('ARCHIVE', ARCHIVE);
                })
                .then(() => {
                  this.methods.loadArchive();
                })
              }, 'Cancel', () => {}, ' ', () => {}, () => {});
            }, 200);
          }
        }, () => {});
      },
    },
    softKeyText: { left: 'Menu', center: 'MORE', right: 'Search' },
    softKeyListener: {
      left: function() {
        var menu = [
          {'text': 'Refresh Archive'},
          {'text': 'Files Archive'},
          {'text': 'User Guide'},
          //{'text': 'AnonFiles FAQ'},
          //{'text': 'AnonFiles ToS'},
          {'text': 'Changelogs'},
          {'text': 'Exit'},
        ]
        this.$router.showOptionMenu('Menu', menu, 'SELECT', (selected) => {
          if (selected.text === 'Refresh Archive') {
            const DS = new DataStorage((fileRegistry, documentTree, groups) => {
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
          } else if (selected.text == 'User Guide') {
            this.$router.push('guide');
          } else if (selected.text == 'AnonFiles FAQ') {
            window.open('https://anonfiles.com/faq');
          } else if (selected.text == 'AnonFiles ToS') {
            window.open('https://anonfiles.com/terms');
          } else if (selected.text === 'Exit') {
            window.close();
          }
        }, () => {});
      },
      center: function() {
        if (this.verticalNavIndex > -1 && this.data.filtered.length > 0) {
          if (this.data.filtered[this.verticalNavIndex]) {
            this.methods.action(this.data.filtered[this.verticalNavIndex]);
          }
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
                      SEARCH_INPUT.blur();
                    }, 100);
                  }
                  break
                case 'SoftRight':
                  this.$router.hideBottomSheet();
                  setTimeout(() => {
                    SEARCH_INPUT.blur();
                    this.methods.search(SEARCH_INPUT.value);
                  }, 100);
                  break
                case 'SoftLeft':
                  this.$router.hideBottomSheet();
                  setTimeout(() => {
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
    title: 'Kloud Storage',
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
      },
      'guide' : {
        name: 'guide',
        component: guide
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
      app: 'kloud-storage',
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
