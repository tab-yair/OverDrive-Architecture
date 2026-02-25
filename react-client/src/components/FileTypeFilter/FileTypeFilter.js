import React from 'react';
import './FileTypeFilter.css';

/**
 * FileTypeFilter Component
 * Allows filtering files by type (All, Images, PDFs, Documents)
 * Also includes view mode toggle (List/Grid)
 * 
 * @param {Object} props
 * @param {string} props.selectedType - Currently selected filter type
 * @param {Function} props.onFilterChange - Callback when filter changes
 * @param {string} props.viewMode - Current view mode ('list' or 'grid')
 * @param {Function} props.onViewModeChange - Callback when view mode changes
 */
function FileTypeFilter({ selectedType = 'all', onFilterChange, viewMode = 'grid', onViewModeChange }) {
    const filterOptions = [
        { value: 'all', label: 'All Files', icon: 'filter_list' },
        { value: 'folder', label: 'Folders', icon: 'folder' },
        { value: 'image', label: 'Images', icon: 'image' },
        { value: 'pdf', label: 'PDFs', icon: 'picture_as_pdf' },
        { value: 'docs', label: 'Documents', icon: 'description' }
    ];

    return (
        <div className="file-type-filter">
            <div className="file-type-filter__label">
                <span className="material-symbols-outlined">filter_alt</span>
                <span>Filter by type:</span>
            </div>
            <div className="file-type-filter__options">
                {filterOptions.map(option => (
                    <button
                        key={option.value}
                        className={`file-type-filter__button ${
                            selectedType === option.value ? 'file-type-filter__button--active' : ''
                        }`}
                        onClick={() => onFilterChange(option.value)}
                        title={option.label}
                    >
                        <span className="material-symbols-outlined file-type-filter__icon">
                            {option.icon}
                        </span>
                        <span className="file-type-filter__text">{option.label}</span>
                    </button>
                ))}
            </div>
            
            {/* View Toggle */}
            <div className="file-type-filter__view-toggle">
                <button
                    className={`file-type-filter__view-button ${
                        viewMode === 'list' ? 'file-type-filter__view-button--active' : ''
                    }`}
                    onClick={() => onViewModeChange && onViewModeChange('list')}
                    title="List view"
                >
                    <span className="material-symbols-outlined">view_list</span>
                </button>
                <button
                    className={`file-type-filter__view-button ${
                        viewMode === 'grid' ? 'file-type-filter__view-button--active' : ''
                    }`}
                    onClick={() => onViewModeChange && onViewModeChange('grid')}
                    title="Grid view"
                >
                    <span className="material-symbols-outlined">grid_view</span>
                </button>
            </div>
        </div>
    );
}

export default FileTypeFilter;
