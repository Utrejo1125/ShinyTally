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
  const [searchTerm, setSearchTerm] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState(null);  // To store stats

  const [sortDirection, setSortDirection] = useState({
    name: true,
    time: true,
    date: true,
    encounters: true,
    odds: true
  });
  

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

  const filteredArchivedHunts = archivedHunts.filter(hunt =>
    hunt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pokemonOptions.find(pokemon => pokemon.value === hunt.selectedPokemon)?.label.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const calculateShinyProbability = (encounters, odds) => {
    if (odds && encounters > 0) {
      return 1 - Math.pow((1 - 1 / odds), encounters);
    }
    return 0;
  };

  const handleSort = (criterion) => {
    let sortedHunts = [...archivedHunts];
    const isAscending = sortDirection[criterion];
  
    switch (criterion) {
      case 'name':
        sortedHunts.sort((a, b) => isAscending ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title));
        break;
      case 'time':
        sortedHunts.sort((a, b) => isAscending ? a.timer - b.timer : b.timer - a.timer);
        break;
      case 'date':
        sortedHunts.sort((a, b) => isAscending ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date));
        break;
      case 'encounters':
        sortedHunts.sort((a, b) => isAscending ? a.value - b.value : b.value - a.value);
        break;
      case 'odds':
        sortedHunts.sort((a, b) => isAscending ? a.odds - b.odds : b.odds - a.odds);
        break;
      default:
        break;
    }
  
    setArchivedHunts(sortedHunts);
    setSortDirection({
      ...sortDirection,
      [criterion]: !isAscending
    });
  };  

  //calculates different stats that will be shown to user
  const calculateStats = () => {
    if (archivedHunts.length === 0) return null;

    const validHuntsByEncounters = archivedHunts.filter(hunt => hunt.value > 0);
    const validHuntsByOdds = archivedHunts.filter(hunt => hunt.odds > 0);
    const validHuntsByTimer = archivedHunts.filter(hunt => hunt.timer > 0);
    const totalEncountersCompleted = validHuntsByEncounters.reduce((acc, hunt) => acc + hunt.value, 0);
    const totalTimeSpent = validHuntsByTimer.reduce((acc, hunt) => acc + hunt.timer, 0);

    const probabilities = validHuntsByOdds.map(hunt => ({
      title: hunt.title,
      selectedPokemon: hunt.selectedPokemon,
      probability: calculateShinyProbability(hunt.value, hunt.odds),
      encounters: hunt.value,
      timer: hunt.timer,
    }));

    const fastestByEncounters = validHuntsByEncounters.length > 0 ?
      validHuntsByEncounters.reduce((prev, current) => (prev.value < current.value ? prev : current)) : null;

    const longestByEncounters = validHuntsByEncounters.length > 0 ?
      validHuntsByEncounters.reduce((prev, current) => (prev.value > current.value ? prev : current)) : null;

    const fastestByTimer = validHuntsByTimer.length > 0 ?
      validHuntsByTimer.reduce((prev, current) => (prev.timer < current.timer ? prev : current)) : null;

    const longestByTimer = validHuntsByTimer.length > 0 ?
      validHuntsByTimer.reduce((prev, current) => (prev.timer > current.timer ? prev : current)) : null;

    const lowestProbabilityHunt = probabilities.length > 0 ?
      probabilities.reduce((prev, current) => (prev.probability < current.probability ? prev : current)) : null;

    const highestProbabilityHunt = probabilities.length > 0 ?
      probabilities.reduce((prev, current) => (prev.probability > current.probability ? prev : current)) : null;

    return {
      fastestByEncounters,
      longestByEncounters,
      fastestByTimer,
      longestByTimer,
      totalHunts: archivedHunts.length,
      totalEncountersCompleted,
      totalTimeSpent,
      lowestProbabilityHunt,
      highestProbabilityHunt,
    };
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

            <div className='search-container'>
              <button className='stats-button' onClick={() => {
                const calculatedStats = calculateStats();
                setStats(calculatedStats);
                setShowStats(true);
              }}>Show Stats</button>

              <div className="sort-buttons">
                <button onClick={() => handleSort('name')}>Sort by Name</button>
                <button onClick={() => handleSort('time')}>Sort by Time</button>
                <button onClick={() => handleSort('date')}>Sort by Date</button>
                <button onClick={() => handleSort('encounters')}>Sort by Encounters</button>
                <button onClick={() => handleSort('odds')}>Sort by Odds</button>
              </div>


              {/* Search Input */}
              <input
                type="text"
                placeholder="Search Archived Hunts"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Render Filtered Hunts */}
            {filteredArchivedHunts.length === 0 ? (
              <p>No matching archived hunts</p>
            ) : (
              <ul>
                {filteredArchivedHunts.map(hunt => (
                  <div key={hunt.id} className='archived-hunt'>
                    <button className="delete-hunt-button" onClick={() => confirmDelete(hunt.id)}>X</button>
                    <h4>{hunt.title}</h4>
                    <p>Pokémon: {pokemonOptions.find(pokemon => pokemon.value === hunt.selectedPokemon)?.label || 'Unknown Pokémon'}</p>
                    <p>Encounters: {hunt.value}</p>
                    <p>Odds: 1 in {hunt.odds}</p>
                    <p>Timer: {formatTime(hunt.timer)}</p>
                    <p>Date Archived: {new Date(hunt.date).toLocaleDateString()}</p>
                    <button className='restore-button' onClick={() => restoreHunt(hunt.id)}>Restore</button>
                  </div>
                ))}
              </ul>
            )}

          </div>
        </div>
      )}

      {showStats && stats && (
        <div className="stats-overlay" onClick={() => setShowStats(false)}>
          <div className="stats-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Shiny Hunt Stats</h4>
            <p>Total Hunts Completed: {stats.totalHunts}</p>
            <p>Total Encounters Completed: {stats.totalEncountersCompleted}</p>
            <p>Total Time Spent: {formatTime(stats?.totalTimeSpent)}</p>
            <p>Shortest Hunt by Encounters: {stats.fastestByEncounters?.title} ({stats.fastestByEncounters?.value} encounters)</p>
            <p>Longest Hunt by Encounters: {stats.longestByEncounters?.title} ({stats.longestByEncounters?.value} encounters)</p>
            <p>Shortest Time Spent on a Hunt: {stats.fastestByTimer?.title} ({formatTime(stats.fastestByTimer?.timer)})</p>
            <p>Longest Time Spent on a Hunt: {stats.longestByTimer?.title} ({formatTime(stats.longestByTimer?.timer)})</p>
            <p>Luckiest Hunt: {stats.lowestProbabilityHunt?.title} {pokemonOptions.find(p => p.value === stats.lowestProbabilityHunt?.selectedPokemon)?.label || 'Unknown Pokémon'} ({(stats.lowestProbabilityHunt?.probability * 100).toFixed(2)}% chance to shine)</p>
            <p>Unluckiest Hunt: {stats.highestProbabilityHunt?.title} {pokemonOptions.find(p => p.value === stats.highestProbabilityHunt?.selectedPokemon)?.label || 'Unknown Pokémon'} ({(stats.highestProbabilityHunt?.probability * 100).toFixed(2)}%)</p>
            <button onClick={() => setShowStats(false)}>Close</button>
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
