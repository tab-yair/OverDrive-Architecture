import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './SearchBar.css';

/**
 * CustomDropdown Component
 * A styled dropdown that mimics Google Drive's dropdown style
 */
function CustomDropdown({ value, options, onChange, placeholder }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);
    const displayText = selectedOption ? selectedOption.label : placeholder;

    return (
        <div className="custom-dropdown" ref={dropdownRef}>
            <button
                type="button"
                className={`custom-dropdown-trigger ${isOpen ? 'open' : ''} ${value ? 'has-value' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className="custom-dropdown-text">{displayText}</span>
                <span className="material-symbols-outlined custom-dropdown-arrow">
                    expand_more
                </span>
            </button>
            {isOpen && (
                <div className="custom-dropdown-menu">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={`custom-dropdown-option ${value === option.value ? 'selected' : ''}`}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            role="option"
                            aria-selected={value === option.value}
                        >
                            {value === option.value && (
                                <span className="material-symbols-outlined custom-dropdown-check">
                                    check
                                </span>
                            )}
                            <span className="custom-dropdown-option-text">{option.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * SearchBar Component
 * Search input styled like Google Drive's search bar
 * Includes advanced filter panel for filtering by type, date, owner, etc.
 */
function SearchBar() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        type: '',
        owner: '',
        dateModified: '',
        dateStart: '',
        dateEnd: '',
        hasWords: '',
        itemName: ''
    });
    const inputRef = useRef(null);
    const filterPanelRef = useRef(null);
    // eslint-disable-next-line no-unused-vars
    const { token } = useAuth(); // Token ready for future API integration

    // Dropdown options
    const typeOptions = [
        { value: '', label: 'Any type' },
        { value: 'folder', label: 'Folders' },
        { value: 'document', label: 'Documents' },
        { value: 'image', label: 'Images' },
        { value: 'video', label: 'Videos' },
        { value: 'pdf', label: 'PDFs' },
    ];

    const ownerOptions = [
        { value: '', label: 'Anyone' },
        { value: 'me', label: 'Owned by me' },
        { value: 'others', label: 'Not owned by me' }
    ];

    const dateOptions = [
        { value: '', label: 'Any time' },
        { value: 'today', label: 'Today' },
        { value: 'week', label: 'Last 7 days' },
        { value: 'month', label: 'Last 30 days' },
        { value: 'year', label: 'This year' },
        { value: 'custom', label: 'Custom...' }
    ];

    // Close filter panel when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (filterPanelRef.current && !filterPanelRef.current.contains(event.target)) {
                // Check if clicked on the filter toggle button
                const filterBtn = event.target.closest('.search-bar-filter-btn');
                if (!filterBtn) {
                    setShowFilters(false);
                }
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /**
     * Handle search submission
     * @param {Event} e - Form submit event
     */
    const handleSearch = (e) => {
        e.preventDefault();

        // Prevent empty searches when no filters
        const hasFilters = filters.type || filters.owner || filters.dateModified ||
                          filters.hasWords || filters.itemName;
        if (!searchQuery.trim() && !hasFilters) {
            return;
        }

        console.log('Searching for:', searchQuery);
        console.log('With filters:', filters);

        // Build URL params for search
        const params = new URLSearchParams();
        
        // Add search query
        if (searchQuery.trim()) {
            params.set('q', searchQuery.trim());
        } else if (filters.itemName) {
            // If no main query but has item name filter, use that as query
            params.set('q', filters.itemName);
        }

        // Add filters as URL params
        if (filters.type) {
            params.set('type', filters.type);
        }
        if (filters.owner) {
            params.set('owner', filters.owner === 'me' ? 'owned' : 'shared');
        }

        // Map date filter to API format
        if (filters.dateModified) {
            if (filters.dateModified === 'custom') {
                if (filters.dateStart) params.set('dateStart', filters.dateStart);
                if (filters.dateEnd) params.set('dateEnd', filters.dateEnd);
            } else {
                // Map UI date options to API date categories
                const dateMapping = {
                    'today': 'today',
                    'week': 'last7days',
                    'month': 'last30days',
                    'year': 'thisyear'
                };
                if (dateMapping[filters.dateModified]) {
                    params.set('dateCategory', dateMapping[filters.dateModified]);
                }
            }
        }

        // Determine search location
        if (filters.hasWords && !searchQuery.trim()) {
            // If only searching by content words
            params.set('searchIn', 'content');
            params.set('q', filters.hasWords);
        } else if (filters.hasWords) {
            // Search in both if we have both query and content words
            params.set('searchIn', 'both');
        }

        // Navigate to search page with params
        navigate(`/search?${params.toString()}`);
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

    /**
     * Handle filter change
     * @param {string} filterName - Name of the filter
     * @param {string} value - Filter value
     */
    const handleFilterChange = (filterName, value) => {
        setFilters(prev => {
            const newFilters = { ...prev, [filterName]: value };
            // Clear custom date fields if not using custom date
            if (filterName === 'dateModified' && value !== 'custom') {
                newFilters.dateStart = '';
                newFilters.dateEnd = '';
            }
            return newFilters;
        });
    };

    /**
     * Clear all filters
     */
    const clearFilters = () => {
        setFilters({
            type: '',
            owner: '',
            dateModified: '',
            dateStart: '',
            dateEnd: '',
            hasWords: '',
            itemName: ''
        });
    };

    /**
     * Check if any filters are active
     */
    const hasActiveFilters = filters.type || filters.owner || filters.dateModified ||
                            filters.hasWords || filters.itemName;

    /**
     * Toggle filter panel
     */
    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    /**
     * Format date for display
     */
    const formatDateDisplay = () => {
        if (filters.dateModified === 'custom' && (filters.dateStart || filters.dateEnd)) {
            const start = filters.dateStart || '...';
            const end = filters.dateEnd || '...';
            return `${start} to ${end}`;
        }
        return filters.dateModified;
    };

    return (
        <div className="search-bar-container">
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

                {/* Filter toggle button */}
                <button
                    type="button"
                    className={`search-bar-icon search-bar-filter-btn ${hasActiveFilters ? 'has-filters' : ''}`}
                    onClick={toggleFilters}
                    aria-label="Search options"
                    aria-expanded={showFilters}
                >
                    <span className="material-symbols-outlined">tune</span>
                    {hasActiveFilters && <span className="filter-indicator" />}
                </button>
            </form>

            {/* Advanced Filter Panel */}
            {showFilters && (
                <div ref={filterPanelRef} className="search-filter-panel">
                    <div className="search-filter-header">
                        <h3 className="search-filter-title">Search options</h3>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                className="search-filter-clear-btn"
                                onClick={clearFilters}
                            >
                                Clear all
                            </button>
                        )}
                    </div>

                    <div className="search-filter-grid">
                        {/* Type Filter */}
                        <div className="search-filter-group">
                            <label className="search-filter-label">
                                <span className="material-symbols-outlined">description</span>
                                Type
                            </label>
                            <CustomDropdown
                                value={filters.type}
                                options={typeOptions}
                                onChange={(value) => handleFilterChange('type', value)}
                                placeholder="Any type"
                            />
                        </div>

                        {/* Owner Filter */}
                        <div className="search-filter-group">
                            <label className="search-filter-label">
                                <span className="material-symbols-outlined">person</span>
                                Owner
                            </label>
                            <CustomDropdown
                                value={filters.owner}
                                options={ownerOptions}
                                onChange={(value) => handleFilterChange('owner', value)}
                                placeholder="Anyone"
                            />
                        </div>

                        {/* Date Modified Filter */}
                        <div className="search-filter-group">
                            <label className="search-filter-label">
                                <span className="material-symbols-outlined">calendar_today</span>
                                Modified
                            </label>
                            <CustomDropdown
                                value={filters.dateModified}
                                options={dateOptions}
                                onChange={(value) => handleFilterChange('dateModified', value)}
                                placeholder="Any time"
                            />
                        </div>

                        {/* Item Name Filter */}
                        <div className="search-filter-group">
                            <label className="search-filter-label">
                                <span className="material-symbols-outlined">label</span>
                                Item name
                            </label>
                            <input
                                type="text"
                                className="search-filter-input"
                                placeholder="Enter file name..."
                                value={filters.itemName}
                                onChange={(e) => handleFilterChange('itemName', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Custom Date Range */}
                    {filters.dateModified === 'custom' && (
                        <div className="search-filter-date-range">
                            <div className="search-filter-group">
                                <label className="search-filter-label">
                                    <span className="material-symbols-outlined">event</span>
                                    Start date
                                </label>
                                <input
                                    type="date"
                                    className="search-filter-input search-filter-date"
                                    value={filters.dateStart}
                                    onChange={(e) => handleFilterChange('dateStart', e.target.value)}
                                />
                            </div>
                            <div className="search-filter-group">
                                <label className="search-filter-label">
                                    <span className="material-symbols-outlined">event</span>
                                    End date
                                </label>
                                <input
                                    type="date"
                                    className="search-filter-input search-filter-date"
                                    value={filters.dateEnd}
                                    onChange={(e) => handleFilterChange('dateEnd', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Has Words Filter - Full Width */}
                    <div className="search-filter-group search-filter-full-width">
                        <label className="search-filter-label">
                            <span className="material-symbols-outlined">text_fields</span>
                            Has the words
                        </label>
                        <input
                            type="text"
                            className="search-filter-input"
                            placeholder="Enter words contained in the file..."
                            value={filters.hasWords}
                            onChange={(e) => handleFilterChange('hasWords', e.target.value)}
                        />
                    </div>

                    {/* Active filters display */}
                    {hasActiveFilters && (
                        <div className="search-filter-active">
                            <span className="search-filter-active-label">Active filters:</span>
                            <div className="search-filter-chips">
                                {filters.type && (
                                    <span className="search-filter-chip">
                                        Type: {filters.type}
                                        <button
                                            type="button"
                                            onClick={() => handleFilterChange('type', '')}
                                            aria-label="Remove type filter"
                                        >
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    </span>
                                )}
                                {filters.owner && (
                                    <span className="search-filter-chip">
                                        Owner: {filters.owner === 'me' ? 'Me' : 'Others'}
                                        <button
                                            type="button"
                                            onClick={() => handleFilterChange('owner', '')}
                                            aria-label="Remove owner filter"
                                        >
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    </span>
                                )}
                                {filters.dateModified && (
                                    <span className="search-filter-chip">
                                        Modified: {formatDateDisplay()}
                                        <button
                                            type="button"
                                            onClick={() => handleFilterChange('dateModified', '')}
                                            aria-label="Remove date filter"
                                        >
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    </span>
                                )}
                                {filters.itemName && (
                                    <span className="search-filter-chip">
                                        Name: {filters.itemName}
                                        <button
                                            type="button"
                                            onClick={() => handleFilterChange('itemName', '')}
                                            aria-label="Remove name filter"
                                        >
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    </span>
                                )}
                                {filters.hasWords && (
                                    <span className="search-filter-chip">
                                        Contains: {filters.hasWords}
                                        <button
                                            type="button"
                                            onClick={() => handleFilterChange('hasWords', '')}
                                            aria-label="Remove words filter"
                                        >
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="search-filter-actions">
                        <button
                            type="button"
                            className="search-filter-reset-btn"
                            onClick={clearFilters}
                            disabled={!hasActiveFilters}
                        >
                            <span className="material-symbols-outlined">restart_alt</span>
                            Reset
                        </button>
                        <div className="search-filter-actions-right">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowFilters(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={(e) => {
                                    handleSearch(e);
                                    setShowFilters(false);
                                }}
                            >
                                Search
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SearchBar;
