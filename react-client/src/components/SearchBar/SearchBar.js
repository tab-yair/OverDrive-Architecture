import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import './SearchBar.css';

/**
 * SearchBar Component
 * Search input styled like Google Drive's search bar
 * Captures search queries for future server integration
 */
function SearchBar() {
    const [searchQuery, setSearchQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef(null);
    // eslint-disable-next-line no-unused-vars
    const { token } = useAuth(); // Token ready for future API integration

    /**
     * Handle search submission
     * @param {Event} e - Form submit event
     */
    const handleSearch = (e) => {
        e.preventDefault();

        // Prevent empty searches
        if (!searchQuery.trim()) {
            return;
        }

        console.log('Searching for:', searchQuery);

        // TODO: Implement server search integration
        // Example API call:
        // const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
        //     headers: {
        //         'Authorization': `Bearer ${token}`,
        //         'Content-Type': 'application/json'
        //     }
        // });
        // const results = await response.json();
        // Navigate to search results page or update state with results
    };

    /**
     * Handle input change
     * @param {Event} e - Input change event
     */
    const handleChange = (e) => {
        setSearchQuery(e.target.value);
    };

    /**
     * Clear search input
     */
    const handleClear = () => {
        setSearchQuery('');
        inputRef.current?.focus();
    };

    return (
        <form
            className={`search-bar ${isFocused ? 'search-bar-focused' : ''}`}
            onSubmit={handleSearch}
            role="search"
        >
            {/* Search icon */}
            <button
                type="submit"
                className="search-bar-icon search-bar-submit"
                aria-label="Search"
            >
                <span className="material-symbols-outlined">search</span>
            </button>

            {/* Search input */}
            <input
                ref={inputRef}
                type="text"
                className="search-bar-input"
                placeholder="Search in OverDrive"
                value={searchQuery}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                aria-label="Search in OverDrive"
            />

            {/* Clear button - only visible when there's text */}
            {searchQuery && (
                <button
                    type="button"
                    className="search-bar-icon search-bar-clear"
                    onClick={handleClear}
                    aria-label="Clear search"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>
            )}
        </form>
    );
}

export default SearchBar;
