/*global $*/

// Global namespace for the app
var app = {};

// Expose it for introspection
window.app = app;

// Set up pointers to useful elements
app.hooks = {};

$('[data-hook]').each(function (i, el) {
  var dataHook = $(el).data('hook'),
      // Get _all_ elements for a data-hook value, not just the single element
      // in the current iteration. Supports multiple elements with the same
      // data-hook value.
      $el = $('[data-hook="' + dataHook + '"]');
  // Convert hyphen-names to camelCase in hooks
  var hook = dataHook.replace(/-([a-z])/g, function (m) {
    return m[1].toUpperCase();
  });
  app.hooks[hook] = $el;
});

// pushState on search submit
app.hooks.searchForm.on('submit', function (e) {
  if (e.ctrlKey || e.altKey || e.shiftKey) return;
  e.preventDefault();

  var params = app.util.serializeObject(this),
      queryStringParams = app.util.serializeQueryStringParams(params);

  if (params) {
    $(this).find('input').blur();
    history.pushState(null, params, '?' + queryStringParams);
    window.scroll(0, 0);
    app.hooks.results.addClass('hide');
    app.route();
  }
});

app.hooks.searchForm.find('input').on('input', function (e) {
  if (e.ctrlKey || e.altKey || e.shiftKey) return;
  e.preventDefault();

  if (!this.value) {
    app.hooks.results.addClass('hide');
  }
});

// global settings
app.settings = {
  ajaxType: $.support.cors ? 'json' : 'jsonp'
};

// global variables
app.globals = {};

// Routing
app.route = function () {
  var params = $.deparam(window.location.search.substr(1));

  if (params.a) {
    app.hooks.notices.text('Loading...');
    app.data.getStandardizedAddress(app.util.cleanPropertyQuery(params.a));
  } else {
    app.hooks.searchForm.get(0).reset();
    app.hooks.results.addClass('hide');
    app.hooks.notices.empty();
  }
};

// Route on page load and back button
$(app.route);
window.onpopstate = app.route;

// Shims to gracefully degrade pushState and replaceState for IE9
if (!history.pushState) {
  history.pushState = function (s, t, l) {window.location = l};
  history.replaceState = function (s, t, l) {
    if (l) window.location = l;
    else history.state = s;
  };
}

app.data = {};

app.data.getStandardizedAddress = function(address) {

  $.ajax('https://api.phila.gov/ulrs/v3/addresses/' + encodeURIComponent(address) + '?format=json',
    {dataType: app.settings.ajaxType})
    .done(function (data) {
      var standardizedAddress;
      if (data.addresses.length > 0) {
        standardizedAddress = data.addresses[0].standardizedAddress;
        app.data.getServiceAreas(standardizedAddress);
      } else {
        app.hooks.notices.text('No address was found.');
      }
    })
    .fail(function () {
      app.hooks.notices.text('No address was found.');
    });
};

app.data.getServiceAreas = function(standardizedAddress, success) {

  $.ajax('https://data.phila.gov/resource/bz79-67af.json?address_id=' + encodeURIComponent(standardizedAddress),
      {dataType: app.settings.ajaxType})
    .done(function (data) {
      var serviceAreas = data.length > 0 ? data[0] : null;
      var titleCaseAddress = app.util.toTitleCase(standardizedAddress);

      if (serviceAreas) {
        app.hooks.searchForm.find('input').val(titleCaseAddress);
        app.hooks.notices.empty();

        app.hooks.trashDay.text(app.util.abbrevToFullDay(serviceAreas.rubbish));
        app.hooks.address.text(titleCaseAddress);
        app.hooks.propertyLink.attr('href', 'https://alpha.phila.gov/property/?a=' +
          encodeURIComponent(standardizedAddress) + '&u=');

        app.hooks.results.removeClass('hide');
      } else {
        app.hooks.notices.text('The trash & recycling collection day was not found.');
      }
    })
    .fail(function () {
      app.hooks.notices.text('The trash & recycling collection day was not found.');
    });
};


// App utilties
app.util = {};

app.util.toTitleCase = function(str) {
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

app.util.cleanPropertyQuery = function(query) {
  if (!query) {
    return '';
  }

  // Trim, remove extra speces, and replace dots and hashes -- API can't handle them
  return query.replace(/\./g, ' ').replace(/ {2,}/g, ' ').replace(/#/g, '').trim().toUpperCase();
};

app.util.abbrevToFullDay = function(abbrev) {
  switch(abbrev) {
    case 'SUN': return 'Sundays';
    case 'MON': return 'Mondays';
    case 'TUE': return 'Tuesdays';
    case 'WED': return 'Wednesdays';
    case 'THU': return 'Thursdays';
    case 'FRI': return 'Fridays';
    case 'SAT': return 'Saturdays';
  }

  return abbrev;
};

// Serialize a form into an object, assuming only one level of depth
app.util.serializeObject = function (form) {
  var obj = {};
  $.each($(form).serializeArray(), function (i, element) {
      if (!obj[element.name]) {
        obj[element.name] = element.value;
      }
    });
  return obj;
};

// Serialize an object to query string params
app.util.serializeQueryStringParams = function(obj) {
  var str = [];
  for(var p in obj) {
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
    }
  }
  return str.join('&');
};

