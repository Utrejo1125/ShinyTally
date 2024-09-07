import Dexie from "dexie";

export const db = new Dexie("ShinyHuntDB")


//Define the schema for the counters table
db.version(1).stores({
    counters: '++id, title, selectedPokemon, value, odds, timer, incrementValue', // Auto-Increasing id, as well as rest of fields
    archivedHunts: '++id, title, selectedPokemon, value, odds, timer, date',      // Ensure this table is added
});