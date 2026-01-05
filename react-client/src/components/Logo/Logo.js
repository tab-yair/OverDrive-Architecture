import { Link } from 'react-router-dom';
import './Logo.css';

/**
 * Logo Component
 * Reusable OverDrive logo with wheel icon as the "O"
 *
 * @param {string} size - 'sm' (navbar), 'md' (auth pages), 'lg' (landing page)
 * @param {string} to - Optional link destination (if provided, logo is clickable)
 * @param {boolean} showText - Whether to show "verDrive" text (default: true)
 * @param {string} className - Additional CSS classes
 */
function Logo({ size = 'md', to, showText = true, className = '' }) {
    const sizeClass = `logo--${size}`;

    const logoContent = (
        <>
            <img
                src="/overdrive-icon.png"
                alt=""
                className="logo__icon"
            />
            {showText && <span className="logo__text">verDrive</span>}
        </>
    );

    // If 'to' prop is provided, wrap in Link
    if (to) {
        return (
            <Link to={to} className={`logo ${sizeClass} ${className}`.trim()}>
                {logoContent}
            </Link>
        );
    }

    // Otherwise, render as div
    return (
        <div className={`logo ${sizeClass} ${className}`.trim()}>
            {logoContent}
        </div>
    );
}

export default Logo;
