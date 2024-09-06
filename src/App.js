import React, { useState, useEffect } from 'react';
import Counter from './Counter';
import { db } from './db';
import './App.css';

export default function CounterMaker() {
  const [counters, setCounters] = useState([]);

  // Load counters from IndexedDB when the component mounts
  useEffect(() => {
    const loadCounters = async () => {
      const allCounters = await db.counters.toArray();  // Fetch all counters, including the timer
      setCounters(allCounters);
    };
    loadCounters();
  }, []);

  const addCounter = async () => {
    const id = await db.counters.add({ value: 0, title: '', odds: 0, selectedPokemon: '', timer: 0 });  // Initialize timer as 0
    const newCounter = await db.counters.get(id); // Get the newly added counter
    setCounters([...counters, newCounter]); // Update state with the new counter
  };

  const removeCounter = (id) => {
    setCounters(counters.filter(counter => counter.id !== id)); // Remove from state
    db.counters.delete(id);  // Remove from IndexedDB
  };

  return (
    <div>
      <button className='new-counter-button' onClick={addCounter}>
        New Shiny Hunt
      </button>

      <div className="counters-container">
        {counters.map(counter => (
          <Counter 
            key={counter.id} 
            counter={counter} 
            onDelete={() => removeCounter(counter.id)}
          />
        ))}
      </div>
    </div>
  );
}
