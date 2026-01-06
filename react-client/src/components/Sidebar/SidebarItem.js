import React from 'react';
import { NavLink } from 'react-router-dom';
import './SidebarItem.css';

/**
 * SidebarItem Component
 * Individual navigation item in the sidebar
 *
 * @param {string} icon - Material icon name
 * @param {string} label - Display text
 * @param {string} to - Route path
 */
function SidebarItem({ icon, label, to }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`
            }
        >
            <span className="material-symbols-outlined sidebar-item-icon">
                {icon}
            </span>
            <span className="sidebar-item-label">{label}</span>
        </NavLink>
    );
}

export default SidebarItem;
