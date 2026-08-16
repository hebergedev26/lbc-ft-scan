import { useState } from 'react';

export default function SearchBar({ onSearch, disabled }) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const q = name.trim();
    if (!q || disabled) return;
    onSearch(q, dob || null);
  };

  return (
    <form className="search-form" onSubmit={submit}>
      <div className="search-field">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom / prénom du client (ex : Mamadou Diallo)"
          autoFocus
        />
      </div>
      <div className="search-field dob">
        <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} title="Date de naissance (optionnel)" />
      </div>
      <button type="submit" className="btn-primary" disabled={disabled || !name.trim()}>
        {disabled ? 'Analyse…' : 'Scanner'}
      </button>
    </form>
  );
}
