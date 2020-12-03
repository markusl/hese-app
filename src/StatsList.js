import React, { useEffect, useState } from 'react';
import './StatsList.css';

const StatsList = (props) => {
  const [data, setData] = useState({
    brokenIceCreamTotal: undefined,
    iceCreamInSelection: undefined,
    iceCreamNotInSelection: undefined,
    cityStatuses: [[]],
    updated: 'NaN',
   });
 
  useEffect(() => {
    const fetchData = async () => {
      const result = await (await fetch(props.statusApi)).json();
      setData(result);
    };
 
    fetchData();
  });

  const restaurantCount = data.iceCreamInSelection + data.iceCreamNotInSelection;
  const brokenPercent = ((data.brokenIceCreamTotal / data.iceCreamInSelection) * 100).toFixed(2);
  const notInSelectionPercent = ((data.iceCreamNotInSelection / restaurantCount) * 100).toFixed(2);

  return (
    <div className="stats-list">
      <div className="stats-row">
        <p className="stats-row-broken">{data.brokenIceCreamTotal ? brokenPercent : '߷'} %</p>
        <p className="stats-row-city">Jäätelökoneista rikki</p>
      </div>
      <div className="stats-row">
        <p className="stats-row-broken">{data.iceCreamNotInSelection ? notInSelectionPercent : '߷'} %</p>
        <p className="stats-row-city">Ei tarjoile jäätelöä</p>
      </div>
      <div className="stats-row">
        <p className="stats-row-broken">{data.iceCreamInSelection && data.iceCreamNotInSelection ? restaurantCount : '߷'}</p>
        <p className="stats-row-city">Ravintolaa</p>
      </div>
      <div className="stats-row">
        <p className="stats-row-broken">{data.updated}</p>
        <p className="stats-row-city">Päivitetty</p>
      </div>
    </div>
  );
};

export default StatsList;
