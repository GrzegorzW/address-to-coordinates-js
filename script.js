<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Integration</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.0.0-rc.3/dist/leaflet.css"/>
</head>
<body>

<h3>Type street and city, then press Localize button.</h3>

<form name="my_form">
    <label for="street">Street</label>
    <input type="text" id="street"/>
    <label for="city">City</label>
    <input type="text" id="city"/>
    <input type="button" id="localize" onclick="myMap.localize()" value="Localize"/>
    <div style="padding-top: 20px">
        <label for="map_container" hidden>Localization</label>
        <div id="map_container" style="height: 300px;"></div>
    </div>
    <input type="hidden" id="hidden_lat"/>
    <input type="hidden" id="hidden_lng"/>
</form>

<p>
    This is a simple script which completes hidden address coordinates fields.
</p>

<h4>
    Used technologies:
</h4>
<ul>
    <li><a href="https://jquery.com/" target="_blank">jQuery</a></li>
    <li><a href="http://leafletjs.com/" target="_blank">Leaflet</a></li>
    <li><a href="https://www.mapbox.com/" target="_blank">Mapbox</a></li>
    <li><a href="https://www.openstreetmap.org/" target="_blank">Openstreetmap</a></li>
</ul>

<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js"></script>
<script src="https://unpkg.com/leaflet@1.0.0-rc.3/dist/leaflet.js"></script>
<script>
    var myMap = {
        map: null,
        marker: null,
        initZoom: 12,
        initLat: 52.4137642,
        initLng: 16.9136119,
        detailZoom: 18,
        mapboxUrl: 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}',
        mapboxId: 'mapbox.satellite',
        mapboxToken: 'pk.eyJ1IjoidGVzdGludGVncmF0aW9uIiwiYSI6ImNpdGRkN3hqajAwNnIydG05cnh3eGlhZjAifQ.3o67gRqy8znsqx1_W65zJg',
        nominatimSearchUrl: 'http://nominatim.openstreetmap.org/search',
        init: function () {
            myMap.map = L.map('map_container');

            L.tileLayer(myMap.mapboxUrl, {
                attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
                maxZoom: 18,
                id: myMap.mapboxId,
                accessToken: myMap.mapboxToken
            }).addTo(myMap.map);

            var currentLat = myMap.getHiddenLatElementValue();
            var currentLng = myMap.getHiddenLngElementValue();

            if (currentLat && currentLng) {
                myMap.setMarker(currentLat, currentLng);
                myMap.setView(currentLat, currentLng, myMap.detailZoom);
                myMap.setMarkerPopup(currentLat, currentLng);
                myMap.showMarkerPopup();
            } else {
                myMap.setDefaultView();
            }

            myMap.bindMapClick();
            myMap.bindFormSubmit();
        },
        setView: function (lat, lng, zoom) {
            myMap.map.setView([lat, lng], zoom)
        },
        setDefaultView: function () {
            myMap.setView(myMap.initLat, myMap.initLng, myMap.initZoom);
        },
        onMapClick: function (e) {
            myMap.updateMarker(e.latlng.lat.toFixed(7), e.latlng.lng.toFixed(7));
            myMap.removeFieldValidationErrorInformation(myMap.getMapContainer());
        },
        bindMapClick: function () {
            myMap.map.on('click', myMap.onMapClick);
        },
        bindFormSubmit: function () {
            $('form[name="my_form"]').submit(function (e) {
                if (false == myMap.isFormLatLngValid()) {
                    e.preventDefault();
                    myMap.handleMissingCoordinates();
                }
            })
        },
        addMarker: function (lat, lng) {
            myMap.marker = L.marker([lat, lng]).addTo(myMap.map);
        },
        setMarker: function (lat, lng) {
            if (myMap.marker == null) {
                myMap.addMarker(lat, lng);
            } else {
                myMap.marker.setLatLng([lat, lng]);
            }
        },
        updateMarker: function (lat, lng) {
            myMap.setMarker(lat, lng);
            myMap.setFormLatVal(lat);
            myMap.setFormLngVal(lng);
            myMap.marker.update();
            myMap.setMarkerPopup(lat, lng);
            myMap.showMarkerPopup();
        },
        removeMarker: function () {
            myMap.map.removeLayer(myMap.marker);
            myMap.marker = null;
        },
        setMarkerPopup: function (lat, lng) {
            text = '<b>Coordinates: </b><br>' + lat + ', ' + lng;
            myMap.marker.bindPopup(text);
        },
        showMarkerPopup: function () {
            myMap.marker.openPopup();
        },
        localize: function () {
            var isInputValid = true;
            var city = myMap.getCityElementValue();
            var street = myMap.getStreetElementValue();

            if (false == myMap.isCityValueValid(city)) {
                myMap.handleInvalidCity();
                isInputValid = false;
            }

            if (false == myMap.isStreetValueValid(street)) {
                myMap.handleInvalidStreet();
                isInputValid = false;
            }

            if (true == isInputValid) {
                if (null != myMap.marker) {
                    myMap.removeMarker();
                }
                myMap.removeFieldValidationErrorInformation(myMap.getCityElement());
                myMap.removeFieldValidationErrorInformation(myMap.getStreetElement());
                myMap.removeFieldValidationErrorInformation(myMap.getMapContainer());
                myMap.setDefaultView();

                $.ajax({
                    type: 'GET',
                    data: {
                        'format': 'json',
                        'city': city,
                        'street': street
                    },
                    url: myMap.nominatimSearchUrl,
                    success: function (data, status, xhr) {
                        if (xhr.status == 200) {
                            if (data.length > 0) {
                                var location = data[0];
                                myMap.updateMarker(location.lat, location.lon);
                                myMap.setView(location.lat, location.lon, myMap.detailZoom);
                            } else {
                                myMap.handleNoMatch();
                            }
                        }
                    },
                    error: function () {
                        myMap.handleAjaxError();
                    }
                });
            }
        },
        getHiddenLatElement: function () {
            return $('#hidden_lat');
        },
        getHiddenLngElement: function () {
            return $('#hidden_lng');
        },
        getHiddenLatElementValue: function () {
            return myMap.getHiddenLatElement().val();
        },
        getHiddenLngElementValue: function () {
            return myMap.getHiddenLngElement().val();
        },
        setFormLatVal: function (lat) {
            myMap.getHiddenLatElement().val(lat);
        },
        setFormLngVal: function (lng) {
            myMap.getHiddenLngElement().val(lng);
        },
        isFormLatLngValid: function () {
            return myMap.getHiddenLatElementValue() && myMap.getHiddenLngElementValue();
        },
        getCityElement: function () {
            return $('#city');
        },
        getCityElementValue: function () {
            return myMap.getCityElement().val();
        },
        isCityValueValid: function (city) {
            return city.length > 2;
        },
        handleInvalidCity: function () {
            var field = myMap.getCityElement();
            var errorText = 'Too short city, min 2 chars.';
            myMap.handleValidationError(field, errorText);
        },
        getStreetElement: function () {
            return $('#street');
        },
        getStreetElementValue: function () {
            return myMap.getStreetElement().val();
        },
        isStreetValueValid: function (street) {
            return street.length > 2;
        },
        handleInvalidStreet: function () {
            var field = myMap.getStreetElement();
            var errorText = 'Too short street, min 2 chars.';
            myMap.handleValidationError(field, errorText);
        },
        getMapContainer: function () {
            return $('#map_container');
        },
        handleNoMatch: function () {
            var field = myMap.getMapContainer();
            var errorText = 'Not matched. Set localization manually.';
            myMap.handleValidationError(field, errorText);
        },
        handleMissingCoordinates: function () {
            var field = myMap.getMapContainer();
            var errorText = 'Set localization.';
            myMap.handleValidationError(field, errorText);
        },
        handleAjaxError: function () {
            console.log('ajax error!');
        },
        handleValidationError: function (field, errorMessages) {
            myMap.removeFieldValidationErrorInformation(field);
            var errorList = '';

            if (typeof errorMessages === 'string') {
                errorList = myMap.getErrorMessageListElement(errorMessages);
            } else {
                $.each(errorMessages, function (index, message) {
                    errorList += myMap.getErrorMessageListElement(message);
                })
            }

            var errorBlock = myMap.getErrorBlock(errorList);

            field.parent().addClass('has-error');
            field.after(errorBlock);
        },
        getErrorMessageListElement: function (errorText) {
            return '<li>' + errorText + '</li>';
        },
        getErrorBlock: function (errorList) {
            return '<span class="help-block"><ul>' + errorList + '</ul></span>';
        },
        removeFieldValidationErrorInformation: function (field) {
            field.parent().removeClass('has-error');
            field.next('span.help-block').remove();
        }
    };

    myMap.init();

</script>
</body>
</html>
