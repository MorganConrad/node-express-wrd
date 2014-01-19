
var Request = require('request');

var pathCache = {};

function spaceToDash(inStr) {
    return inStr.replace(/\s/g, '-');
}

/* Remove extraneous spaces from a location */
function cleanupLocation(location) {
  location = location.replace(/\s+/g, ' ');  // multiple spaces -> single space
  location = location.replace(' ,', ',');    // extraneous space before a comma
  return location.trim();
};

function getPaths(location, appid, callback) {
    location = cleanupLocation(location);
    appid = appid || process.env.YAHOO_APPID;

    var cached = pathCache[location];
    if (cached)
        callback(null, cached);

    else {
        var url = "http://where.yahooapis.com/v1/places.q('" +
                  location + "')?format=json&appid=" + appid;
        Request.get(url, function (error, response, body) {
            if (error)
                callback(error);
            else {
                var fullResponse = JSON.parse(body);
                var paths = [];
                if (fullResponse.places.place) {
                    paths = fullResponse.places.place.map(function(place) {
                        var path = place.country + '/' + place.admin1 + '/' + place.locality1;
                        return spaceToDash(path) + '-' + place.woeid;
                    });
                }

                pathCache[location] = paths;
                callback(error, paths);
            }
        });
    }
}


function sendError(res, statusCode, message) {
   res.statusCode = statusCode;
   res.send(message || 'oops');
}


function ywRedirect(req, res) {
    var location = req.params.location;

    if (!location)
        sendError(res, 404, 'Please provide a location');
    else {
        getPaths(location, null, function(error, paths) {
            if (error)
                sendError(res, 500, error);
            else if (paths.length === 0)
                sendError(res, 404, 'Cannot find location: ' + location);
            else
                res.redirect(302, 'http://weather.yahoo.com/' + paths[0]);
        });
    }
}

exports.ywRedirect = ywRedirect;