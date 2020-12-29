/* eslint-disable */ //Turn off eslint for this file


export const displayMap = (locations) => {
  mapboxgl.accessToken =
    "pk.eyJ1IjoiY2FsdW1iMTMiLCJhIjoiY2tqOHhzOXd2MXRtNDJ5bnE4cjhsdmthYiJ9.dyBph-YzFlXuuG0rHgUpfw";

  var map = new mapboxgl.Map({
    container: "map", //section element with id=map uses this container
    style: "mapbox://styles/calumb13/ckj8xzvwtgvpt19qokadcctc7",
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    //Create marker
    const element = document.createElement("div");
    element.className = "marker";

    //add marker
    new mapboxgl.Marker({
      element: element,
      anchor: "bottom", //Bottom of the pin is at the exact gps location
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    //Add popup
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    //Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
