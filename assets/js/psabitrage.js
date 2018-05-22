define(function (require, exports) {
  var $ = require('vendor/jquery');
  var itemlist = require('itemstream');

  exports.init = function (pageSettings) {
    var pageSettings = pageSettings;

    /**
     * General functions
     */
    function selectItemsByAnchor(items) {
      var currentUrl = document.URL,
        urlParts = currentUrl.split('#page=');
      var page = (urlParts.length > 1) ? parseInt(urlParts[1]) : 1;
      if (pageSettings.pagerTotalItems < page || page < 1) {
        if (pageSettings.isMobile) {
          window.history.replaceState({}, '', items[0].page_url)
        } else {
          window.history.pushState({}, '', items[0].page_url)
        }
        window.location.reload(items[0].page_url);
        return;
      }
      var start = page - 1;
      var end = start + 20;
      var data = items.slice(start, end);
      pageSettings.initialPage = data[0].page;
      appendPrevBtn();
      return data;
    }

    var getTitleForPage = function (item) {
      var pageTitle = pageSettings.defaultPageTitle;
      if (item.page > 1) {
        pageTitle += '- ' + item.page + '/' + pageSettings.pagerTotalItems
      }
      return pageTitle;
    }

    /**
     * Set the Meta title on Page change
     */
    var changeMetaInfo = function (item) {
      document.title = getTitleForPage(item);
    }

    // callback for load more items
    var loadMore = function (callback, offset, limit) {
      limit = limit - 1;
      var data = pageSettings.items.slice(offset, limit);
      if (data) {
        callback(data);
      }
    };

    /**
     * Handling for change Page on Mobile
     * - ad loading, tracking
     */
    var availableMobileAds = ['galleryad', 'galleryad2', 'galleryad3', 'galleryad4', 'galleryad5'];
    var _mobilePageStore = [];
    var _mobilePageToAdStore = [];

    function appendPrevBtn() {
      if (pageSettings.initialPage > 1 && pageSettings.isMobile == 1) {
        var container = $('.stiPictureStream2Container');
        var button = '<div class="stiJsPrevLoad"><a class="btn btn-default btn-block btn-sm stiPictureStream2PrevImg" href="/bilderstrecke/' + pageSettings.listId + '/1/">vorherige Bilder anzeigen</a></div>';
        container.before(button);
      }
    }

    var rebuildMobileAds = function (params) {
      var data = nextAd(params)
      if (data.adName == null) {
        return;
      }

      if (data.destroySlotBeforeLoad) {
        adLoader('_removeAds', [data.adName]);
      }

      // clear old slot if needed
      var checkExisting = document.querySelector('[data-streamindex="' + data.removePage + '"] div.ads-container');
      if (checkExisting) {
        checkExisting.innerHTML = '';
      }

      var eledoc = document.createElement('DIV');
      eledoc.innerHTML = '<div data-sdg-ad="' + data.adName + '" data-device="mobile"></div>';
      var current = document.querySelector('[data-streamindex="' + data.page + '"] div.ads-container');
      if (current) {
        $(current).append(eledoc);
        var adNames = [data.adName];
        if (params.adNames.length > 0) {
          adNames = params.adNames;
        }
        if (params.loadAds) {
          adLoader('_loadAds', adNames);
        }
      }
    }

    var nextAd = function (data) {
      if (data.availableMobileAdsLoaded == false) {
        for (var i = 0; i < availableMobileAds.length; i++) {
          if (_mobilePageToAdStore.indexOf(availableMobileAds[i]) == -1) {
            data.adName = availableMobileAds[i];
            _mobilePageToAdStore[data.page] = data.adName;
            _mobilePageStore.push(data.page)
            break;
          }
        }
      }

      if (data.adName == null) {
        data.destroySlotBeforeLoad = true;

        var removePageIdx = 0;
        var pageBefore = data.page - 1;
        if (data.page < _mobilePageStore[0] || _mobilePageStore[0] >= pageBefore) {
          removePageIdx = _mobilePageStore.length - 1;
        }

        _mobilePageStore.push(data.page); // add new page in pageStore
        data.removePage = _mobilePageStore[removePageIdx];
        data.adName = _mobilePageToAdStore[data.removePage]; // select page for remove
        _mobilePageToAdStore[data.removePage] = undefined; // remove adname
        _mobilePageStore.splice(removePageIdx, 1); // remove first page from pageStore
        _mobilePageStore.sort(function (a, b) {
          return a - b
        });
        _mobilePageToAdStore[data.page] = data.adName; // set new page with ad in pageAdStore
      }
      return data;
    }

    var appendNextMobileAd = function (page, options) {
      var currentPageView = {
        page: page,
        removePage: null,
        adName: null,
        destroySlotBeforeLoad: false,
        availableMobileAdsLoaded: _mobilePageStore.length >= availableMobileAds.length,
        pageAlreadyExists: _mobilePageStore.indexOf(page) != -1,
        loadAds: options.loadAds,
        adNames: options.adNames,
      };

      // page is already defined
      if (currentPageView.pageAlreadyExists || pageSettings.initialPage > page) {
        return;
      }
      rebuildMobileAds(currentPageView);
    }

    var addItemMobileCallback = function (item) {
      return;
      changeMetaInfo(item);
      var firstPage = item.page;
      var options = {loadAds: true, adNames: []};

      if (item.content_type === 'endcard') {
        trackReferencesEmbed();
        window.addEventListener('scroll', trackScrollToReferencesOnMobile, false);
      } else {
        window.removeEventListener('scroll', trackScrollToReferencesOnMobile, false);
      }
      if (firstPage >= pageSettings.lastPageWithImage) {
        return;
      }

      var pageBefore = firstPage - 1;
      var pageAfter = firstPage + 1;
      var pageAfter2 = firstPage + 2;
      var pageAfter3 = firstPage + 3;

      appendNextMobileAd(firstPage, options);
      if (pageBefore >= 1) {
        appendNextMobileAd(pageBefore, options);
      }
      if (pageAfter < pageSettings.pagerTotalItems) {
        appendNextMobileAd(pageAfter, options);
      }
      if (_mobilePageStore[_mobilePageStore.length - 1] > firstPage) {
        if (pageAfter2 < pageSettings.pagerTotalItems) {
          appendNextMobileAd(pageAfter2, options);
        }
        if (pageAfter3 < pageSettings.pagerTotalItems) {
          appendNextMobileAd(pageAfter3, options);
        }
      }
    }

    var loadFirstAds = function () {
      var ele = $('div[data-item="container"]:first');
      var streamindex = ele.data('streamindex');
      if (streamindex >= pageSettings.lastPageWithImage) {
        return;
      }
      pageSettings.initialPage = streamindex;
      var options = {loadAds: false, adNames: []};
      appendNextMobileAd(streamindex, options);
      appendNextMobileAd(streamindex + 1, options);
      appendNextMobileAd(streamindex + 2, options);
      options.loadAds = true;
      options.adNames = [availableMobileAds[0], availableMobileAds[1], availableMobileAds[2], availableMobileAds[3]];
      appendNextMobileAd(streamindex + 3, options);
    };

    var addAdditionalClasses = function (item, mobile) {
      if (mobile) {
        var current = document.querySelector('[data-streamindex="' + item.page + '"]');
      } else {
        var current = document.querySelector('div.item-container[data-streamindex="' + item.page + '"]');
      }
      var currClassName = current.className;
      var additionalClassForEmbeds = 'item-has-embed';
      if (item.content_type === 'html') {
        if (currClassName.indexOf(additionalClassForEmbeds) == -1) {
          current.className = currClassName + ' ' + additionalClassForEmbeds;
          current.querySelector('.item-media').removeAttribute("style");
        }
      } else {
        if (currClassName.indexOf(additionalClassForEmbeds) !== -1) {
          currClassName = currClassName.replace(additionalClassForEmbeds, '');
          current.className = currClassName;
        }
      }
    };

    var itemChangeCallbackMobile = function (item) {
      pageSettings.activatePageTrack = true;
      addAdditionalClasses(item, true);
      window.history.replaceState({}, '', item.page_url);
    };

    var afterItemsLoaded = function (firstpage) {
      var ele = $('div[data-item="container"]:first');
      var streamindex = ele.data('streamindex');
      if (streamindex == firstpage) {
        window.scrollTo(0, 0);
      }
    }
    // nur zum testen , muss dann anders gelöst werden
    var getPageSettings = function() {
      return pageSettings;
    }

    // desktop
    var itemChangeDesktop = function (item) {
      addAdditionalClasses(item, false);

      if (pageSettings.activatePageTrack) {
        setTimeout(function () {
          window.history.pushState({}, '', item.page_url);
        }, 100);
      } else {
        pageSettings.activatePageTrack = true;
      }
      changeMetaInfo(item);
    };

    var loadAdOnChange = function (item) {
      return;
      var instance = $(document.querySelector('div.item-container[data-streamindex="' + item.page + '"]').parentNode);
      if (instance.length > 0) {
        adLoader('_removeAds', ['rectangle']);
        $('.ads-container').html('');
        if (pageSettings.lastPageWithImage >= item.page) {
          var adContainer = $('<div/>');
          adContainer.attr('id', 'rectangleRgt');
          adContainer.attr('class', 'stiRectangleRgt pull-right');
          adContainer.attr('style', 'display:none');
          adContainer.append('<div class="stiAdContainer" style="width: 300px; height: 250px;"><div data-sdg-ad="rectangle" data-detach="1" data-device="desktop"></div></div></div');
          $('.ads-container', instance).append(adContainer);
          if (pageSettings.initialPage == item.page) {
            window.adLoader('_loadAds');
          } else {
            window.adLoader('_reloadAds');
          }
        } else {
          $('.ads-container', instance).remove();
        }
      }
    }


    if (pageSettings.isMobile == 1) {
      itemlist.init({
        onItemChangeCallback: itemChangeCallbackMobile,
        renderAdCallback: addItemMobileCallback,
        fetchCallback: loadMore,
        afterInit: afterItemsLoaded,
        total: pageSettings.pagerTotalItems,
        containerId: 'picturestreamContainer',
        items: selectItemsByAnchor(pageSettings.items),
        isMobile: true
      });
      // loadFirstAds(); erstmal raus
    } else {
      itemlist.init({
        onItemChangeCallback: itemChangeDesktop,
        renderAdCallback: loadAdOnChange,
        fetchCallback: loadMore,
        afterInit: afterItemsLoaded,
        total: pageSettings.pagerTotalItems,
        containerId: 'picturestreamContainer',
        items: selectItemsByAnchor(pageSettings.items),
        isMobile: false,
        pageSettingsCallback: getPageSettings
      });

      $(window).on("popstate", function (e) {
        if (e.originalEvent.state !== null) {
          window.location.reload(location.href);
        }
      });
    }
  }
})
