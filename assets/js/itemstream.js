/**
 * _currItemIdx - current idx of settings.items
 * _lastItem - last item idx of settings.items
 * _idxPositionMap - [idx : position]
 * _pageToIndex - [page : idx_items]
 * _lastBundleHeight - bundle height
 *
 * settings - contain the informations set by asses
 * options - define callbacks for pagechange/adload
 *
 * markup:
 *
 * <div id="{containerId}">
 *   <div data-ident="{bundelFirstPage-bundelLastPage}">
 *
 *    <div data-streamindex="{page}" class="item-container">
 *      <div class="item-headline"> {headline} </div>
 *      <div class="item-media">
 *
 *        <a href="{prevPageUrl}" class="item-prev" data-streamindex="{prevPage}">
 *          <span class="btn btn-default"><i class="fa fa-angle-left"></i></span> // kann asset definieren oder weglassen (Mobile nicht gebraucht)
 *        </a>
 *        <div class="item-content">
 *          <img src="$content" class="item-image" $contentStyle>
 *        </div>
 *        <a href="{nextPageUrl}" class="item-next" data-streamindex="{nextPage}">
 *          <span class="btn btn-default"><i class="fa fa-angle-right"></i></span> // kann asset definieren oder weglassen (Mobile nicht gebraucht)
 *        </a>
 *
 *      </div>
 *      <div class="item-description-container">
 *          <div class="item-description"> {caption}</div>
 *          <div class="item-nextpage">
 *            <a title="weiter" href="{nextPage}">Nächstes Bild</a>
 *          </div>
 *      </div>
 *      <div class="ads-container"></div>
 *    </div>
 *   </div>
 * </div>
 *
 *  desktop:
 *  renderAdCallback
 *  onItemChangeCallback
 *  container
 *
 * @param opt
 */
define(function (require, exports) {
  var _currItemIdx = 0
  var _lastItemIdx = 0
  var _currentPage = 0
  var _isDataLoadedFinish = true
  var _insertDataAfter = null

  var _pageToIndex = []
  var _eventHandler = {resize: null, scroll: null}

  var settings = {
    items: [],
    limit: 0,
    offset: 0,
    total: 0,
    container: null,
    containerId: null,
    isMobile: true,
    scrollUp: false,
    displayHeadline: false,
    disableBtnOnLastPage: false,
    scrollToContainer: true,
  }

  var options = {
    renderAdCallback: null,
    onItemChangeCallback: null,
    onItemRenderedCallback: null,
    fetchCallback: null,
    afterInit: null,
    pageSettingsCallback: null,
  }

  var shadowDiv = null
  var shadowImg = null
  var shadowA = null

  function createPageMapping() {
    settings.items.forEach(function (item, i) {
      _pageToIndex[parseInt(item.page, 10)] = i
    })
  }

  function placeholderCallback(item) {
  }

  function createMediaContentElementByItem(item) {
    var ele
    if (item.content_type === 'image') {
      ele = shadowImg.cloneNode()
      ele.setAttribute('class', 'item-image')
      ele.setAttribute('data-item', 'image')
      ele.src = item.content
    } else if (['video', 'html', 'endcard'].indexOf(item.content_type) !== -1) {
      ele = shadowDiv.cloneNode()
      ele.innerHTML = item.content
    } else {
      ele = shadowDiv.cloneNode()
    }

    return ele
  }

  function activateMobile() {
    var _idxOffsetTopMap = []
    var _idxElementMap = []
    var _containerOffsetTop = 0

    function caclulateTopPosition(ele) {
      var currentEle = ele
      var topOffset = parseInt(currentEle.offsetTop, 10)
      while (currentEle.tagName !== 'BODY') {
        currentEle = currentEle.offsetParent
        topOffset += parseInt(currentEle.offsetTop, 10)
      }
      _containerOffsetTop = topOffset
    }

    function createLink(currentPage, offset) {
      var page = currentPage + offset
      var link = null
      if (settings.total <= page || page === 1) {
        return link
      }

      var item = null
      if (_pageToIndex.hasOwnProperty(page)) {
        item = settings.items[_pageToIndex[page]]
      }

      if (item) {
        var classAttr = (offset > 0) ? 'item-next' : 'item-prev'
        link = shadowA.cloneNode()
        link.setAttribute('class', classAttr)
        link.setAttribute('data-action', classAttr)
        link.setAttribute('href', item.page_url)
      }
      return link
    }

    function createItem(item, displayFirstElement) {
      var wrapper = shadowDiv.cloneNode()
      wrapper.setAttribute('data-streamindex', item.page)
      wrapper.setAttribute('data-item', 'container')
      var className = 'item-container'
      if (item.page === settings.total) {
        className += ' item-last'
      }
      wrapper.setAttribute('class', className)

      var headline = shadowDiv.cloneNode()
      headline.setAttribute('class', 'item-headline')
      headline.setAttribute('data-item', 'headline')
      headline.innerHTML = item.headline || ''
      if (settings.isMobile) {
        headline.innerHTML = item.headline_mobile
      }

      var mediaPlaceholder = shadowDiv.cloneNode()
      mediaPlaceholder.setAttribute('class', 'item-media')
      mediaPlaceholder.setAttribute('data-item', 'media')
      var ratio = ((item.height / item.width) * 100)
      if (isNaN(ratio) === false) {
        mediaPlaceholder.setAttribute('style', 'padding-top:' + ratio + '%')
      }

      var adsPlaceholder = shadowDiv.cloneNode()
      adsPlaceholder.setAttribute('class', 'ads-container')
      adsPlaceholder.setAttribute('data-item', 'ads-container')

      var descriptionContainer = shadowDiv.cloneNode()
      descriptionContainer.setAttribute('class', 'item-description-container')
      descriptionContainer.setAttribute('data-item', 'description-container')

      var description = shadowDiv.cloneNode()
      description.setAttribute('class', 'item-description')
      description.setAttribute('data-item', 'description')
      description.innerHTML = item.caption
      if (settings.isMobile) {
        description.innerHTML = item.caption_mobile
      }
      descriptionContainer.appendChild(description)

      if (displayFirstElement) {
        var nextLink = createLink(item.page, +1)
        var prevLink = createLink(item.page, -1)

        if (prevLink) {
          mediaPlaceholder.appendChild(prevLink)
        }

        var contentContainer = shadowDiv.cloneNode()
        contentContainer.setAttribute('class', 'item-content')
        contentContainer.setAttribute('data-item', 'content')

        var mediaContent = createMediaContentElementByItem(item)
        contentContainer.appendChild(mediaContent)
        mediaPlaceholder.appendChild(contentContainer)

        if (nextLink) {
          mediaPlaceholder.appendChild(nextLink)
        }
      }

      wrapper.appendChild(headline)
      wrapper.appendChild(mediaPlaceholder)
      wrapper.appendChild(descriptionContainer)
      wrapper.appendChild(adsPlaceholder)
      return wrapper
    }

    function renderElements(data) {
      var wrapper = shadowDiv.cloneNode()
      var streamLength = data.length
      var idxBegin = 0
      var idxEnd = idxBegin
      if (streamLength > 1) {
        idxEnd = streamLength - 1
      }
      wrapper.setAttribute('data-ident', data[idxBegin].page + '-' + data[idxEnd].page)
      var displayFirstElement = true
      var renderedItem = null
      for (var i in data) {
        if (!data.hasOwnProperty(i)) {
          continue
        }
        wrapper.appendChild(createItem(data[i], displayFirstElement))
        if (displayFirstElement) {
          renderedItem = i
        }
        displayFirstElement = false
      }
      if (_insertDataAfter) {
        settings.container.appendChild(wrapper)
      } else {
        settings.container.insertBefore(wrapper, settings.container.firstChild)
      }
      if (renderedItem) {
        options.onItemRenderedCallback(data[renderedItem])
      }
    }

    function scrollToCurrentPage() {
      window.scrollTo(0, _idxOffsetTopMap[_pageToIndex[_currentPage]])
      options.afterInit(_currentPage);
    }
    /**
     * append/prepend data into defined container
     *
     * @param data
     * @param onlyRenderItems
     */
    function loadData(data, onlyRenderItems) {
      if (data.length === 0) return
      var activateCalculation = !(onlyRenderItems === false)
      renderElements(data)
      if (activateCalculation === true) {
        var items
        if (_insertDataAfter) {
          items = settings.items.concat(data)
        } else {
          items = data.concat(settings.items)
        }

        settings.items = items
        _lastItemIdx = settings.items.length - 1
        calculateHeight()
        createPageMapping()
        if (_insertDataAfter === false) {
          scrollToCurrentPage()
        }
      }
      _isDataLoadedFinish = true
      _insertDataAfter = null
    }

    function getElementByPage(page, index) {
      if (!_idxElementMap[index]) {
        _idxElementMap[index] = settings.container.querySelector('[data-streamindex="' + page + '"]')
      }
      return _idxElementMap[index]
    }

    function calculateHeight() {
      _idxOffsetTopMap = []
      _idxElementMap = []
      var prependElements = []
      var appendElements = []
      settings.items.forEach(function (item, i) {
        var el = getElementByPage(item.page, i)
        if (el) {
          _idxOffsetTopMap[i] = el.offsetTop + _containerOffsetTop
          if (_currentPage === 0) {
            _currentPage = item.page
          }
        } else if (_currentPage === 0 || item.page < _currentPage) {
          prependElements.push(item)
        } else {
          appendElements.push(item)
        }
      })

      // if an item is not added to dom yet but exists in settings.items
      if ((prependElements.length > 0 || appendElements.length > 0) && _isDataLoadedFinish === true) {
        if (appendElements.length > 0) {
          _isDataLoadedFinish = false
          _insertDataAfter = true
          loadData(appendElements, false)
        }
        if (prependElements.length > 0) {
          _isDataLoadedFinish = false
          _insertDataAfter = false
          loadData(prependElements, false)
        }
        calculateHeight()
        scrollToCurrentPage()
      }
    }

    function getItemsToAppend(idx) {
      var prev = settings.items[idx - 1] || null
      var current = settings.items[idx] || null
      var next = settings.items[idx + 1] || null
      var loadItems = [prev, current, next]
      if (next && settings.items[idx + 2] !== undefined) {
        loadItems.push(settings.items[idx + 2])
      }
      if (prev && settings.items[idx - 2] !== undefined) {
        loadItems.push(settings.items[idx - 2])
      }

      return loadItems.filter(function (item) {
        return !!item
      })
    }

    function load(scrollpos) {
      if (!_isDataLoadedFinish) {
        return
      }
      var offset = 0
      if (_currItemIdx >= _lastItemIdx && settings.total > settings.items[_lastItemIdx].page) {
        _insertDataAfter = true
        _isDataLoadedFinish = false
        offset = settings.items[_lastItemIdx].page
        options.fetchCallback(loadData, offset, settings.limit)
      } else if (scrollpos <= 0 && settings.items[0].page > 1 && settings.scrollUp === true) {
        _insertDataAfter = false
        _isDataLoadedFinish = false
        var limit = settings.limit
        if (settings.items[0].page < limit) {
          limit = settings.items[0].page
        } else {
          offset = parseInt(settings.items[0].page, 10) - settings.limit
        }
        options.fetchCallback(loadData, offset, (limit - 1))
      }
    }

    // make sure that 1 before and 1 after image is loaded
    function appendMediaItem(idx) {
      var items = getItemsToAppend(idx)
      items.forEach(function (item) {
        var el = getElementByPage(item.page, _pageToIndex[item.page])
        if (el) {
          var element = el.querySelector('[data-item="media"]')
          if (element.firstElementChild === null) {
            var nextLink = createLink(item.page, +1)
            var prevLink = createLink(item.page, -1)
            if (prevLink) {
              element.appendChild(prevLink)
            }

            var contentContainer = shadowDiv.cloneNode()
            contentContainer.setAttribute('class', 'item-content')
            contentContainer.setAttribute('data-item', 'content')

            var mediaContent = createMediaContentElementByItem(item)

            contentContainer.appendChild(mediaContent)

            if (nextLink) {
              element.appendChild(nextLink)
            }

            element.appendChild(contentContainer)
            options.onItemRenderedCallback(item)
            options.renderAdCallback(item)
          }
        }
      })
    }

    function exec() {
      calculateHeight()

      var scrollpos = window.scrollY
      var windowHeight = (window.screen.height / 2)
      var isScrollUp
      for (var i = (_idxOffsetTopMap.length - 1); i >= 0; i--) {
        if (scrollpos < (_idxOffsetTopMap[i] - windowHeight)) {
          continue
        }
        if (i !== _currItemIdx) {
          isScrollUp = (i < _currItemIdx)
          appendMediaItem(i) // hier wird das bild sichtbar
          options.onItemChangeCallback(settings.items[i], calculateHeight)
          _currItemIdx = i // item position in items array
        }
        break
      }
      load(scrollpos)
    }

    if (settings.scrollToContainer === true) {
      caclulateTopPosition(settings.container)
    }

    // initially scroll to top of container
    window.scrollTo(0, settings.container.offsetTop + 5)

    calculateHeight()
    if (settings.total > 1) {
      var _scrollEndTimeout = 30
      var _delayedExec = function (callback) {
        var timer
        return function () {
          timer && clearTimeout(timer)
          timer = setTimeout(callback, _scrollEndTimeout)
        }
      }
      _eventHandler.scroll = _delayedExec(exec)
      window.addEventListener('scroll', _eventHandler.scroll, false)

    }
    _eventHandler.resize = calculateHeight
    window.addEventListener('resize', _eventHandler.resize, false)

  }

  var activateDesktop = function () {
    var pageSettings = options.pageSettingsCallback();
    console.log(pageSettings);
    var shadowDiv = document.createElement('div');
    var shadowImg = document.createElement('img');
    var container = document.querySelector('.stiPictureStream2');
    var loadedItems = [];
    var currentItemPage = null;
    var itemListUrl = '/bilderstrecke/' + pageSettings.listId + '/1/';
    var pagesLoaded = [];
    var pageToItemIdx = [];
    var endcardPage = pageSettings.lastPageWithImage + 1;

    function createMediaContentElementByItem(item) {
      var ele
      if (item.content_type === 'image') {
        ele = shadowImg.cloneNode()
        ele.setAttribute('class', 'item-image')
        ele.setAttribute('data-item', 'image')
        ele.src = item.content
      } else if (['video', 'html', 'endcard'].indexOf(item.content_type) !== -1) {
        ele = shadowDiv.cloneNode()
        ele.innerHTML = item.content
      } else {
        ele = shadowDiv.cloneNode()
      }
      return ele
    }

    function addClickHandlerAndImage(item, instance) {
      if (pagesLoaded.indexOf(item.page) == -1 && currentItemPage == item.page) {
        var prevPage = item.page - 1;
        var itemContent = instance.querySelector('.item-content');

        itemContent.appendChild(createMediaContentElementByItem(item))

        var btnBottom = instance.querySelector('.item-nextpage a');
        var itemPrev = instance.querySelector('.item-prev');
        var itemNext = instance.querySelector('.item-next');

        setEventListener([itemNext, btnBottom], 1)
        if (prevPage > 0) {
          setEventListener([itemPrev], -1)
        }
        setDataClickOrigin(btnBottom, currentItemPage)
        pagesLoaded.push(item.page);
      }
    }

    function renderTpl(item) {
      var tpl = document.getElementById(pageSettings.tplId)
      var instance = shadowDiv.cloneNode()
      instance.setAttribute('class', 'stiPictureStream2Container')
      if (currentItemPage !== item.page) {
        instance.setAttribute('style', 'display:none');
      }
      instance.innerHTML = tpl.innerHTML;
      var prevPage = item.page - 1;
      var nextPage = item.page + 1;


      var itemContainer = instance.querySelector('.item-container');
      var itemDescription = instance.querySelector('.item-description');
      var itemHeadline = instance.querySelector('.item-headline');

      var itemNextpage = instance.querySelector('.item-nextpage a');
      var itemPrev = instance.querySelector('.item-prev');
      var itemNext = instance.querySelector('.item-next');

      if (endcardPage == item.page) {
        itemContainer.setAttribute('class', 'item-container item-last');
      }

      itemContainer.setAttribute('data-streamindex', item.page);
      itemDescription.innerHTML = item.caption;
      itemHeadline.innerHTML = item.headline;

      // next/prev nur anzeigen wenn nicht letzte seite
      var hiddeLinks = pageSettings.lastPageWithImage < item.page;
      itemNextpage.setAttribute('href', itemListUrl + '#page=' + nextPage);
      if (prevPage > 0 && !hiddeLinks) {
        itemPrev.setAttribute('href', itemListUrl + '#page=' + prevPage);
      } else {
        itemPrev.setAttribute('style', 'visibility:hidden');
      }

      itemNext.setAttribute('href', itemListUrl + '#page=' + nextPage);
      if (hiddeLinks) {
        itemNextpage.setAttribute('style', 'visibility:hidden');
        itemNext.setAttribute('style', 'visibility:hidden');
      }

      addClickHandlerAndImage(item, instance);
      container.appendChild(instance);
      if (currentItemPage == item.page) {
        options.onItemChangeCallback(item)
        options.renderAdCallback(item)
      }
    }

    function setDataClickOrigin(element, page) {
      if (pageSettings.lastPageWithImage >= page) {
        element.setAttribute('data-click-origin', 'image.gallery.button.' + page)
      }
    }

    var getMoreItems = function (currentItemPage) {
      var limit = 20;
      if (pageToItemIdx[currentItemPage + 1] == undefined) {
        if ((pageSettings.lastPageWithImage + 1) >= (currentItemPage + 1)) {
          options.fetchCallback(renderItems, currentItemPage, limit)
        }
      } else if (pageToItemIdx[currentItemPage - 1] == undefined) {
        var offset = currentItemPage - limit;
        if (offset < 0) {
          offset = 0;
          limit = currentItemPage;
        }
        if (limit > 0) {
          options.fetchCallback(renderItems, offset, limit)
        }
      }
    }

    var replaceDesktopContent = function (offset) {
      var selectedItemPage = currentItemPage + offset;
      var idx = pageToItemIdx[selectedItemPage];
      var currentItem = loadedItems[idx]
      if (currentItem == undefined) {
        var nextPage = (offset > 0) ? currentItemPage : selectedItemPage;
        getMoreItems(nextPage);
      } else {
        currentItemPage = selectedItemPage;

        if (offset > 0) {
          var nextPage = currentItemPage + 2;
          if (loadedItems[pageToItemIdx[nextPage]] == undefined) {
            getMoreItems(nextPage - 1);
          }
        }

        var elems = document.querySelectorAll('.stiPictureStream2Container');
        var index = 0, length = elems.length;
        for ( ; index < length; index++) {
          elems[index].setAttribute('style', 'display:none');
        }
        var instance = document.querySelector('[data-streamindex="' + currentItemPage + '"]');
        instance.parentNode.setAttribute('style', 'display:block');

        addClickHandlerAndImage(currentItem, instance)
        options.onItemChangeCallback(currentItem)
        options.renderAdCallback(currentItem)
      }
    }

    function setEventListener(elements, offset) {
      elements.forEach(function (element) {
        element.addEventListener('click', function (event) {
          event.preventDefault()
          replaceDesktopContent(offset)
          if (this.dataset['postAction'] === 'scrollToTop') {
            window.scrollTo(0, 0)
          }
          var btnNext = document.querySelector('[data-streamindex="' + currentItemPage + '"] .item-nextpage a');
          setDataClickOrigin(btnNext, currentItemPage)
        })
      })
    }

    var renderItems = function (items) {
      items.forEach(function (item, i) {
        loadedItems.push(item);
        renderTpl(item)
      });

      pageToItemIdx = [];
      loadedItems.forEach(function (item, i) {
        pageToItemIdx[item.page] = i;
      });
    }

    var itemSelection = settings.items;
    currentItemPage = pageSettings.initialPage;
    renderItems(itemSelection);
  }

  exports.removeEventHandler = function() {
    if (_eventHandler.scroll !== null) {
      window.removeEventListener('scroll', _eventHandler.scroll)
    }
    if (_eventHandler.resize !== null) {
      window.removeEventListener('resize', _eventHandler.resize)
    }
  }

  exports.init = function (opts) {
    if (settings.containerId !== null) {
      return
    }

    // prepare elements to be cloned later (performance)
    shadowDiv = document.createElement('div')
    shadowImg = document.createElement('img')
    shadowA = document.createElement('a')

    settings.container = document.getElementById(opts.containerId)
    settings.containerId = opts.containerId
    settings.items = opts.items || []
    settings.total = opts.total || 0
    settings.limit = opts.limit || 20
    settings.isMobile = opts.isMobile
    settings.disableBtnOnLastPage = opts.disableBtnOnLastPage || false
    settings.displayHeadline = opts.displayHeadline || false
    if (opts.scrollToContainer === false) {
      settings.scrollToContainer = false
    }

    options.renderAdCallback = opts.renderAdCallback || placeholderCallback
    options.onItemChangeCallback = opts.onItemChangeCallback || placeholderCallback
    options.onItemRenderedCallback = opts.onItemRenderedCallback || placeholderCallback
    options.fetchCallback = opts.fetchCallback || placeholderCallback
    options.afterInit = opts.afterInit || placeholderCallback
    options.pageSettingsCallback = opts.pageSettingsCallback || placeholderCallback

    _lastItemIdx = settings.items.length - 1// last idx in settings.items

    if (settings.containerId === null) {
      return
    }

    createPageMapping()
    if (settings.isMobile) {
      activateMobile()
    } else {
      activateDesktop()
    }
  }
})
