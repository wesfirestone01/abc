let GPS_GRANTED = false;
let GPS_options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
};

// Called directly by the button
function requestGPS() {
    console.log("requestGPS called"); // debug

    if (!navigator.geolocation) {
        console.log("Geolocation not supported.");
        alert("Geolocation is not supported by your browser.");
        return;
    }

    // Ask for current position
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            GPS_GRANTED = true;
            console.log("GPS ready:", pos.coords.latitude, pos.coords.longitude);

            // Send initial position to your map/game
            handleNewPosition(pos);

            // Start watching for continuous updates
            navigator.geolocation.watchPosition(
                handleNewPosition,
                (err) => console.log("GPS watch error:", err),
                GPS_options
            );
        },
        (err) => {
            console.log("Error getting GPS:", err);
            alert("GPS permission denied or unavailable.");
        },
        GPS_options
    );
}

// Handles GPS update and sends to map/game
function handleNewPosition(pos) {
    const [lng, lat] = fixForChineseMap(pos);

    currentLongitude = lng;
    currentLatitude = lat;

    if (typeof me !== "undefined") {
        me.lon = currentLongitude;
        me.lat = currentLatitude;
        me.recalculatePosition();

        // Emit to server
        if (typeof socket !== "undefined") {
            socket.emit("locationFromClient", {
                lat: currentLatitude,
                lon: currentLongitude,
                username: username,
                team: me.team,
            });
        }
    }

    if (typeof myMap !== "undefined" && mapInit) {
        updateMapContent();
    }
}

// Convert WGS-84 to GCJ-02 for Chinese maps
function fixForChineseMap(pos){
    let lat = pos.coords.latitude;
    let lon = pos.coords.longitude;
    return wgs84togcj02(lon, lat);
}

function wgs84togcj02(lng, lat){
    if (outOfChina(lng, lat)) return [lng, lat];
    const a = 6378245.0, ee = 0.00669342162296594323;
    let dLat = transformLat(lng-105.0, lat-35.0);
    let dLng = transformLng(lng-105.0, lat-35.0);
    const radLat = lat/180*Math.PI;
    let magic = 1 - ee*Math.sin(radLat)**2;
    const sqrtMagic = Math.sqrt(magic);
    dLat = (dLat*180)/((a*(1-ee))/(magic*sqrtMagic)*Math.PI);
    dLng = (dLng*180)/(a/ sqrtMagic * Math.cos(radLat)*Math.PI);
    return [lng + dLng, lat + dLat];
}

function outOfChina(lng, lat){
    return (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271);
}

function transformLat(x, y){
    let ret = -100.0+2.0*x+3.0*y+0.2*y*y+0.1*x*y+0.2*Math.sqrt(Math.abs(x));
    ret += (20.0*Math.sin(6.0*x*Math.PI)+20.0*Math.sin(2.0*x*Math.PI))*2.0/3.0;
    ret += (20.0*Math.sin(y*Math.PI)+40.0*Math.sin(y/3.0*Math.PI))*2.0/3.0;
    ret += (160.0*Math.sin(y/12.0*Math.PI)+320*Math.sin(y*Math.PI/30.0))*2.0/3.0;
    return ret;
}

function transformLng(x, y){
    let ret = 300.0+x+2.0*y+0.1*x*x+0.1*x*y+0.1*Math.sqrt(Math.abs(x));
    ret += (20.0*Math.sin(6.0*x*Math.PI)+20.0*Math.sin(2.0*x*Math.PI))*2.0/3.0;
    ret += (20.0*Math.sin(x*Math.PI)+40.0*Math.sin(x/3.0*Math.PI))*2.0/3.0;
    ret += (150.0*Math.sin(x/12.0*Math.PI)+300*Math.sin(x/30.0*Math.PI))*2.0/3.0;
    return ret;
}
