import React, { useState, useEffect } from 'react';
import Counter from './Counter';
import { db } from './db';
import './App.css';
import { pokemonOptions, pokemonImages } from './PokemonData';  // Import Pokémon data

export default function CounterMaker() {
  const [counters, setCounters] = useState([]);
  const [showArchives, setShowArchives] = useState(false);
  const [archivedHunts, setArchivedHunts] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [huntToDelete, setHuntToDelete] = useState(null);

  // Load counters from IndexedDB when the component mounts
  useEffect(() => {
    const loadCounters = async () => {
      const allCounters = await db.counters.toArray();  // Fetch all counters, including the timer
      setCounters(allCounters);
    };
    loadCounters();
  }, []);

  useEffect(() => {
    const loadArchivedHunts = async () => {
      const allArchived = await db.archivedHunts.toArray();  // Fetch all archived hunts
      setArchivedHunts(allArchived);
    };
    loadArchivedHunts();
  }, [showArchives]);  // Reload archives when toggling

  const addCounter = async () => {
    const id = await db.counters.add({ value: 0, title: '', odds: 0, selectedPokemon: '', timer: 0 });  // Initialize timer as 0
    const newCounter = await db.counters.get(id); // Get the newly added counter
    setCounters([...counters, newCounter]); // Update state with the new counter
  };

  const removeCounter = (id) => {
    setCounters(counters.filter(counter => counter.id !== id)); // Remove from state
    db.counters.delete(id);  // Remove from IndexedDB
  };

  const confirmDelete = (id) => {
    setHuntToDelete(id);
    setShowConfirm(true);
  };

  const handleDelete = async () => {
    if (huntToDelete) {
      await db.archivedHunts.delete(huntToDelete);
      setArchivedHunts(archivedHunts.filter(hunt => hunt.id !== huntToDelete));
      setShowConfirm(false);
    }
  };

  const formatTime = (time) => {
    const milliseconds = String(time % 1000).padStart(3, '0');
    const seconds = String(Math.floor((time / 1000) % 60)).padStart(2, '0');
    const minutes = String(Math.floor((time / (1000 * 60)) % 60)).padStart(2, '0');
    const hours = String(Math.floor((time / (1000 * 60 * 60)) % 24)).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}:${milliseconds}`;
  };

  const restoreHunt = async (id) => {
    const huntToRestore = await db.archivedHunts.get(id);
  
    // Add the hunt back to counters table
    const restoredId = await db.counters.add({
      title: huntToRestore.title,
      selectedPokemon: huntToRestore.selectedPokemon,
      value: huntToRestore.value,
      odds: huntToRestore.odds,
      timer: huntToRestore.timer,
    });
  
    // Fetch the newly restored counter
    const restoredHunt = await db.counters.get(restoredId);
  
    // Update the counters state
    setCounters(prevCounters => [...prevCounters, restoredHunt]);
  
    // Remove from archivedHunts
    await db.archivedHunts.delete(id);
  
    // Update archived hunts state
    setArchivedHunts(prevArchivedHunts => prevArchivedHunts.filter(hunt => hunt.id !== id));
  };
  


  return (
    <div>
      <div className='button-container' style={{ position: 'relative' }}>

        <button className='new-counter-button' onClick={addCounter}>
          New Shiny Hunt
        </button>

        <button className='toggle-archive-button' onClick={() => setShowArchives(!showArchives)}>
          {showArchives ? 'Hide Archives' : 'Show Archives'}
        </button>
      </div>

      <div className="counters-container">
        {counters.map(counter => (
          <Counter
            key={counter.id}
            counter={counter}
            onDelete={() => removeCounter(counter.id)}
          />
        ))}
      </div>

      {showArchives && (
        <div className="archives-overlay" onClick={() => setShowArchives(false)}>
          <div className="archives-modal" onClick={(e) => e.stopPropagation()}> {/* Prevent modal close on content click */}
            <h3>Archived Hunts</h3>
            <button className="close-archive" onClick={() => setShowArchives(false)}>Close</button>
            {archivedHunts.length === 0 ? (
              <p>No archived hunts</p>
            ) : (
              <ul>
                {archivedHunts.map(hunt => (
                  <li key={hunt.id} className='archived-hunt'>
                    <button className="delete-hunt-button" onClick={() => confirmDelete(hunt.id)}>X</button>
                    <h4>{hunt.title}</h4>
                    <p>Pokémon: {pokemonOptions.find(pokemon => pokemon.value === hunt.selectedPokemon)?.label || 'Unknown Pokémon'}</p>
                    <p>Encounters: {hunt.value}</p>
                    <p>Odds: 1 in {hunt.odds}</p>
                    <p>Timer: {formatTime(hunt.timer)}</p>
                    <p>Date Archived: {new Date(hunt.date).toLocaleDateString()}</p>
                    <button onClick={() => restoreHunt(hunt.id)}>Restore</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="confirm-overlay" onClick={() => setShowConfirm(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Are you sure you want to delete this hunt?</h4>
            <button onClick={handleDelete}>Yes, Delete</button>
            <button onClick={() => setShowConfirm(false)}>Cancel</button>
          </div>
        </div>
      )}

    </div>
  );
}
