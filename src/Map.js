import React, { useRef, useEffect, useState } from 'react';
// eslint-disable-next-line import/no-webpack-loader-syntax
import mapboxgl from '!mapbox-gl';
import './Map.css';

mapboxgl.accessToken = 'pk.eyJ1IjoibWFya3VzbGluZHF2aXN0IiwiYSI6ImNpbmN0MWxydDAwNGx2a2x4ZTRrMzN4YmQifQ.EXA-WHgOonA8p9CA25N5Rg';

const getIceCreamIcon = (id, isClosed, hasIceCream) => {
  const el = document.createElement('div');
  el.id = id;
  el.innerHTML = isClosed ? '⛔️' : hasIceCream ? '🥤' : '💣';
  el.style.cssText = 'cursor: pointer;' + (hasIceCream ? 'font-size: x-large' : 'font-size: large');
  return el;
}

const getIceCreamStatusHtml = (restaurant) => {
  if (restaurant.isClosed) {
    return `<h3>${restaurant.name} on suljettu</h3>`;
  }

  const hasIceCream = restaurant.hasIceCream.product;
  const hasShake = restaurant.hasShake.product;
  const iceCreamStatus = hasIceCream.isAvailable && hasIceCream.isInSelection ? `<span class="success"> Jäätelö saatavilla</span>` : `<span class="failure"> Jäätelö ei ${hasIceCream.isInSelection ? 'saatavilla' : 'valikoimassa'}</span>`;
  const shakeStatus = hasShake.isAvailable && hasShake.isInSelection ? `<span class="success"> Pirtelö saatavilla</span>` : `<span class="failure"> Pirtelö ei ${hasShake.isInSelection ? 'saatavilla' : 'valikoimassa'} </span>`;
  return `<h3>${restaurant.name}</h3>
          <p>
        ${iceCreamStatus}<br />
        ${shakeStatus}</p>`
}

const renderRestaurant = (restaurant, map, onlyBroken, onlyWorking) => {
  const popupHtml = getIceCreamStatusHtml(restaurant);
  const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml);

  const isWorking = restaurant.hasIceCream.product.isAvailable && restaurant.hasShake.product.isAvailable;
  const showItem = onlyBroken ? !isWorking : (onlyWorking ? isWorking : false);
  if (showItem || (!onlyBroken && !onlyWorking)) {
    new mapboxgl.Marker(getIceCreamIcon(restaurant.id, restaurant.isClosed, isWorking))
      .setLngLat([restaurant.address.longitude, restaurant.address.latitude])
      .setPopup(popup)
      .addTo(map);
  }
};

const Map = (props) => {
  const mapContainerRef = useRef(null);

  const [onlyBroken, setOnlyBroken] = useState(false);
  const [onlyWorking, setOnlyWorking] = useState(false);
  const [lng, setLng] = useState(23.88620300000000);
  const [lat, setLat] = useState(61.18085400000000);
  const [zoom, setZoom] = useState(5.5);
  const [data, setData] = useState({
    cityStatuses: [[]]
  });

  useEffect(() => {
    const fetchData = async () => {
      const result = await (await fetch(props.statusApi)).json();
      setData(result);
    };

    fetchData();
  }, [props]);

  // Initialize map when component mounts
  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [lng, lat],
      zoom: zoom
    });

    // Add navigation control (the +/- zoom buttons)
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('move', () => {
      setLng(map.getCenter().lng.toFixed(4));
      setLat(map.getCenter().lat.toFixed(4));
      setZoom(map.getZoom().toFixed(2));
    });

    data.cityStatuses.map((restaurants) =>
      restaurants.forEach((restaurant) => renderRestaurant(restaurant, map, onlyBroken, onlyWorking)));

    // Clean up on unmount
    return () => map.remove();
  }, [data, onlyBroken, onlyWorking]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div id='map' ref={mapContainerRef}>
      </div>
      <div className='sidebarStyle'>
        <input
          id="onlyBroken"
          type="checkbox"
          name="Vain rikkinäiset"
          value="false"
          checked={onlyBroken}
          onChange={e => {setOnlyBroken(e.target.checked); setOnlyWorking(false)}}
        />
        <label htmlFor="onlyBroken">Vain rikkinäiset</label>
        <input
          id="onlyWorking"
          type="checkbox"
          name="Vain toimivat"
          value="false"
          checked={onlyWorking}
          onChange={e => {setOnlyWorking(e.target.checked); setOnlyBroken(false)}}
        />
        <label htmlFor="onlyWorking">Vain toimivat</label>
      </div>
    </div>
  );
};

export default Map;
