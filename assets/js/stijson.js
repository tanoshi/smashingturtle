define('stijson', ['vendor/jquery'], function (jQuery) {
  var jsData = function (url, jsonDATA) {
      jQuery.ajax({
        'async': false,
        'global': false,
        'url': url,
        'dataType': "json",
        'success': function (data) {
          jsonDATA = data;
        }
      });
    return jsonDATA
  };
  return {
    jsData: jsData,
  };
});
