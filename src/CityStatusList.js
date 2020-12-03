import React, { useEffect, useState } from 'react';
import fetch from 'node-fetch';
import './CityStatusList.css';

const CityStatusList = (props) => {
  const [data, setData] = useState({
    cityStatuses: [[]]
   });
 
  useEffect(() => {
    const fetchData = async () => {
      const result = await (await fetch(props.statusApi)).json();
      setData(result);
    };
 
    fetchData();
  });

  return (
      <div className="city-status-list city-status-list-active">
        {data.cityStatuses.map((restaurants) => restaurants.map((restaurant) => (
          <div className="city-status-row" id={restaurant.id}>
            <span className={restaurant.hasIceCream.product.isAvailable && restaurant.hasShake.product.isAvailable ? 'success' : 'failure'}></span>
            <div className="city-status-row-content">
              <p className="city-status-row-street">{restaurant.name}</p>
              <p className="city-status-row-city">{restaurant.address.city}</p>
            </div>
          </div>
        )))}
      </div>
  );
};

export default CityStatusList;
