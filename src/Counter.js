import React, { useEffect, useState, useRef } from 'react';
import Select from 'react-select';
import { db } from './db';
import { FaEdit, FaCog, FaTimes } from 'react-icons/fa'; // Importing an edit icon from react-icons

import { pokemonOptions, pokemonImages } from './PokemonData';  // Import Pokémon data

import './counter.css';
import { Input } from 'react-select/animated';

import shinysound from './public/sounds/pla_shiny.mp3';
import archivesound from './public/sounds/archive-sound.mp3';
import tallysound from './public/sounds/tally-click.mp3';
import deletesound from './public/sounds/delete.mp3';
import menusound from './public/sounds/open_menu.mp3';
import closemenusound from './public/sounds/close_menu.mp3';
import timersound from './public/sounds/timer_sound.mp3';

// Counter component
function Counter({ counter, onDelete }) {
  const [value, setValue] = useState(counter.value)
  const [incrementValue, setIncrementValue] = useState(counter.increment || 1);  // Load increment from database or default to 1
  const [odds, setOdds] = useState(counter.odds || 4096);
  const [customOdds, setCustomOdds] = useState('')
  const [inputValue, setInputValue] = useState('');
  const [oddsValue, setOddsValue] = useState('');
  const [title, setTitle] = useState(counter.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);  // Determines if user is currently editing the title
  const [selectedPokemon, setSelectedPokemon] = useState(counter.selectedPokemon || '');
  const [timer, setTimer] = useState(counter.timer || 0);  // Initialize with the timer from IndexedDB
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false); // State to toggle settings visibility
  const [isShiny, setIsShiny] = useState(false);
  const [archivedHunts, setArchivedHunts] = useState([]);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const shinySoundRef = useRef(null);
  const archiveSoundRef = useRef(null);
  const deleteSoundRef = useRef(null);
  const menuSoundRef = useRef(null);
  const closeMenuSoundRef = useRef(null);

  // Preset odds options
  const presetOddsOptions = [
    { value: 8192, label: '1 in 8192 (Base Odds in Gen V and Earlier)' },
    { value: 4096, label: '1 in 4096 (Base Odds in Gen VI and Later)' },
    { value: 2048.25, label: '1 in 2048.25 (Meal Power 1)' },
    { value: 2048, label: '1 in 2048 (Mass Outbreak 30+ [S/V])' },
    { value: 1638.4, label: '1 in 1638.4 (Masuda Method in Gen IV)' },
    { value: 1365.67, label: '1 in 1365.67 (Shiny Charm in Gen VI and Later, Mass Outbreak 60+ [S/V], Mass Outbreak 30+ [S/V] with Meal Power 1, Masuda Method in Gen V)' },
    { value: 1024.38, label: '1 in 1024.38 (Mass Outbreak 30+ [S/V] with Shiny Charm, Meal Power 1 with Shiny Charm, Mass Outbreak 60+ [S/V] with Meal Power 1, Meal Power 3)' },
    { value: 1024, label: '1 in 1024 (Masuda Method in Gen V with Shiny Charm)' },
    { value: 819.6, label: '1 in 819.6 (Mass Outbreak 60+ [S/V] with Shiny Charm, Mass Outbreak 30+ [S/V] with Shiny Charm and Meal Power 1, Mass Outbreak 30+ [S/V] with Meal Power 3, Mass Outbreak 60+ [S/V] with Meal Power 3)' },
    { value: 682.6, label: '1 in 682.6 (Masuda Method, Mass Outbreak 60+ [S/V] with Shiny Charm and Meal Power 1, Shiny Charm and Meal Power 3)' },
    { value: 587.57, label: '1 in 587.57 (Mass Outbreak 30+ [S/V] with Shiny Charm and Meal Power 3)' },
    { value: 512.44, label: '1 in 512.44 (Masuda Method with Shiny Charm, Mass Outbreak 60+ [S/V] with Shiny Charm and Meal Power 3)' },
    { value: 300, label: '1 in 300 (Dynamax Adventures)' },
    { value: 100, label: '1 in 100 (Dynamax Adventures with Shiny Charm)' },
  ];

  // Preload sounds
  useEffect(() => {
    shinySoundRef.current = new Audio(shinysound);
    archiveSoundRef.current = new Audio(archivesound);
    deleteSoundRef.current = new Audio(deletesound);
    menuSoundRef.current = new Audio(menusound);
    closeMenuSoundRef.current = new Audio(closemenusound);
  }, []);

  const handleDeleteCounter = () => {
    deleteSoundRef.current.play();
    onDelete();
  }

  const calculateShinyProbability = (encounters, odds) => {
    if (odds && encounters > 0) {
      return 1 - Math.pow((1 - 1 / odds), encounters);
    }
    return 0;
  };

  const toggleShiny = () => {
    setIsShiny(!isShiny);
    if (!isShiny) {
      shinySoundRef.current.play()
    }
  };

  const shinyProbability = calculateShinyProbability(value, odds);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now() - timer;  // Adjust start time based on the current timer
      timerRef.current = setInterval(() => {
        setTimer(Date.now() - startTimeRef.current);  // Update timer based on time elapsed
      }, 1);  // Update every 1ms
    } else if (!isRunning && timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  // Save counter state, including timer, to IndexedDB whenever any key field changes
  useEffect(() => {
    db.counters.update(counter.id, { value, title, selectedPokemon, odds, timer, increment: incrementValue });
  }, [value, title, selectedPokemon, odds, timer, incrementValue]);

  const handleIncrementChange = (e) => {
    const increment = parseInt(e.target.value, 10);
    if (!isNaN(increment)) {
      setIncrementValue(increment); //Update increment value
    }
  };

  const handleAdd = () => {
    setValue(prevValue => prevValue + incrementValue);  // Use the increment value to add to counter
    const tallySound = new Audio(tallysound);  // Create a new audio instance each time
    tallySound.play();
  };

  const handleReset = () => {
    setValue(0);
  };

  const handlePresetOddsChange = (selectedOption) => {
    if (selectedOption) {
      setOdds(selectedOption.value);
      setCustomOdds('') //Clear the custom odds input
    }
  };

  const handleOddsChange = (e) => {
    setOddsValue(e.target.value);
  };

  const handleOddsInput = (e) => {
    if (e.key === 'Enter') {
      const newOddsValue = parseFloat(oddsValue);
      if (!isNaN(newOddsValue) && newOddsValue > 0) {
        setOdds(newOddsValue);
      }
      setOddsValue('');
    }
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleTitleSubmit = (e) => {
    if (e.key === 'Enter') {
      setIsEditingTitle(false); // User is done editing title
    }
  };

  const handleStartPause = () => {
    const timerSound = new Audio(timersound);
    timerSound.play();
    setIsRunning(!isRunning);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setTimer(0);
  };

  const openSettings = () => {
    setShowSettings(!showSettings)
    menuSoundRef.current.play();
  }

  const closeSettingsMenu = () => {
    setShowSettings(false)
    closeMenuSoundRef.current.play();
  }

  const formatTime = (time) => {
    const milliseconds = time % 1000;
    const seconds = Math.floor((time / 1000) % 60);
    const minutes = Math.floor((time / (1000 * 60)) % 60);
    const hours = Math.floor((time / (1000 * 60 * 60)) % 24);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(milliseconds).padStart(3, '0')}`;
  };

  //Archiving things
  const handleArchive = async () => {
    archiveSoundRef.current.play();

    // Save the current hunt in an archive table or a "completed" state in your DB
    db.archivedHunts.add({
      title,
      selectedPokemon,
      value,
      odds,
      timer,
      date: new Date(), // Optional: Archive date
    });

    // Optionally delete or mark the current hunt as archived from the active counters
    await db.counters.delete(counter.id);
    onDelete();
  };

  useEffect(() => {
    db.archivedHunts.toArray().then(setArchivedHunts).catch(console.error);
  }, []);

  //Inline Styling for Select
  const customSelectStyles = {
    control: (provided) => ({
      ...provided,
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '5px',
      fontSize: '1.1rem',
      boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    }),
    menu: (provided) => ({
      ...provided,
      borderRadius: '8px',
      boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    }),
    option: (provided, state) => ({
      ...provided,
      padding: '10px',
      backgroundColor: state.isFocused ? '#3498db' : '#fff',
      color: state.isFocused ? '#fff' : '#34495e',
      cursor: 'pointer',
    }),
  };


  return (
    <div className="counter-container">

      <div className='counter-header'>

        {/* Counter Title */}
        <div className='title'>
          {isEditingTitle ? (
            <input
              type='text'
              value={title}
              onChange={handleTitleChange}
              onKeyDown={handleTitleSubmit}
              onBlur={() => setIsEditingTitle(false)} // Exit edit mode if input loses focus
              autoFocus
              style={{ fontSize: '1.8rem', fontWeight: 'bold', width: '${title.length + 1}ch', maxWidth: '80%', marginBottom: '5%' }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h2>{title || "My Shiny Hunt"}</h2>
              <FaEdit
                style={{
                  fontSize: '1.3rem',
                  marginLeft: '8px',
                  cursor: 'pointer',
                  marginTop: '-10%'
                }}
                onClick={() => setIsEditingTitle(true)} />
              <FaCog
                style={{
                  fontSize: '1.3rem',
                  marginLeft: '8px',
                  cursor: 'pointer',
                  marginTop: '-10%'
                }}
                onClick={openSettings} />
            </div>
          )}
        </div>

        {/* Timer Button */}
        <div className='timer'>
          <button className="timer-button" onClick={handleStartPause}>
            {formatTime(timer)}
          </button>
        </div>

      </div>

      {/* Image and Tally Container */}
      <div className='centered-content'>

        {/* Pokémon image*/}
        {selectedPokemon && (
          <div className="pokemon-image">
            <img src={pokemonImages[selectedPokemon]} alt="Selected Pokémon" />
            {isShiny && (
              <div class="shiny-container">
                {/* Multiple sparkles at different positions */}
                <div className="star large" style={{ top: '10px', left: '40px' }}></div>
                <div className="star medium" style={{ top: '30px', left: '80px' }}></div>
                <div className="star small" style={{ top: '50px', left: '20px' }}></div>
                <div className="star large" style={{ top: '70px', left: '60px' }}></div>
                <div className="star medium" style={{ top: '90px', left: '40px' }}></div>
              </div>
            )}
          </div>
        )}

        {/* Tally */}
        <div className="counter">
          <button className="add" onClick={handleAdd}>{value}</button> {/* Display the increment value */}
        </div>

      </div>

      {/* Odds and Probability */}
      <div className="odds-probability">
        <span className='odds-value'>Odds: 1 in {odds}</span>
        <p>Shiny Probability: {(shinyProbability * 100).toFixed(2)}%</p>
      </div>

      {/* Shiny Button */}
      <button className='shiny-button' onClick={toggleShiny}>
        {isShiny ? 'Undo Shiny...' : 'Shiny Found!'}
      </button>

      {/* Archive Button */}
      {isShiny && (
        <button className='archive-button' onClick={handleArchive}>
          Archive Hunt
        </button>
      )}

      {/* Display Settings Panel that will contain most options*/}
      {showSettings && (
        <div className='settings-overlay' onClick={() => setShowSettings(false)}>
          <div className='settings-panel' onClick={(e) => e.stopPropagation()}> {/* Prevent closing when clicking inside the panel */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Settings</h3>
              <FaTimes style={{ cursor: 'pointer' }} onClick={closeSettingsMenu} />
            </div>
            <hr />

            {/* Pokémon Selector in Settings */}
            <div className="pokemon-selector">
              <label>Select Pokémon:</label>
              <Select
                styles={customSelectStyles}
                options={pokemonOptions}
                value={pokemonOptions.find(p => p.value === selectedPokemon)}
                onChange={(selectedOption) => setSelectedPokemon(selectedOption ? selectedOption.value : '')}
                placeholder="Choose a Pokémon"
                isClearable
                maxMenuHeight={350}
              />
            </div>

            {/* Increment Input */}
            <div className="increment-input" style={{ marginTop: '10px' }}>
              <label>Increment Value:</label>
              <input
                className='input-style'
                type="number"
                value={incrementValue}
                onChange={handleIncrementChange}
                placeholder="Enter increment value"
              />
            </div>

            {/* Odds Input */}
            <div className="odds-field">
              <label>Select Preset Odds:</label>
              <Select
                styles={customSelectStyles}
                options={presetOddsOptions}
                onChange={(selectedOption) => {
                  if (selectedOption) {
                    handlePresetOddsChange(selectedOption);  // Handle selected odds
                  } else {
                    setOdds(4096);  // Reset to 4096 when the selection is cleared
                  }
                }}
                value={presetOddsOptions.find(option => option.value === odds)}
                placeholder='Choose Odds'
                isClearable
                maxMenuHeight={180}
              />

              <input
                className='input-style'
                type="text"
                value={oddsValue}
                onChange={handleOddsChange}
                onKeyDown={handleOddsInput}
                placeholder="Enter custom odds: 1 in ..."
              />
            </div>

            {/* Reset Counter button */}
            <div className="reset">
              <button style={{ marginTop: '5px' }} onClick={handleReset}>Reset Tally</button>
            </div>

            {/* Reset Timer button */}
            <button style={{ marginTop: '5px' }} onClick={handleResetTimer}>Reset Timer</button>

            {/* Remove Counter */}
            <div className="remove">
              <button style={{ marginTop: '5px', background: 'red', color: 'white' }} onClick={handleDeleteCounter}>Delete Counter</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Counter;