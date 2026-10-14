import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const PlantContext = createContext();

export const PlantProvider = ({ children }) => {
  const { user } = useAuth();
  const [plants, setPlants] = useState([]);
  const [selectedPlantId, setSelectedPlantId] = useState(
    localStorage.getItem('solar_selected_plant_id') || 'PLANT-001'
  );
  const [loading, setLoading] = useState(false);

  const fetchPlants = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.get('/plants');
      const plantList = res.data.plants || [];
      setPlants(plantList);
      
      if (plantList.length > 0) {
        // If current selection is invalid, pick first plant
        const exists = plantList.some(p => p.id === selectedPlantId);
        if (!exists) {
          const firstId = plantList[0].id;
          setSelectedPlantId(firstId);
          localStorage.setItem('solar_selected_plant_id', firstId);
        }
      }
    } catch (err) {
      console.error('Failed to load plants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPlants();
    }
  }, [user]);

  const selectPlant = (id) => {
    setSelectedPlantId(id);
    localStorage.setItem('solar_selected_plant_id', id);
  };

  const currentPlant = plants.find(p => p.id === selectedPlantId) || plants[0] || null;

  return (
    <PlantContext.Provider value={{
      plants,
      selectedPlantId,
      selectPlant,
      currentPlant,
      refreshPlants: fetchPlants,
      loading
    }}>
      {children}
    </PlantContext.Provider>
  );
};

export const usePlant = () => useContext(PlantContext);
