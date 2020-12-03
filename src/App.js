import React from 'react';
import './App.css';
import Map from './Map';
import CityStatusList from './CityStatusList';
import StatsList from './StatsList';

function App() {
  const statusApi = 'https://hese-status.s3-eu-west-1.amazonaws.com/status.json';
  return (
    <div className="container">
      <div className="sidebar">
        <CityStatusList statusApi={statusApi} />
      </div>
      <Map statusApi={statusApi} />
      <StatsList statusApi={statusApi} />
    </div>
  );
}

export default App;
