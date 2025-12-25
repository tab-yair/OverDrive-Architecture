/**
 * Email validation and normalization utility
 * Handles Gmail-specific rules and standard RFC 5321 validation
 */
class EmailValidator {

    /**
     * Main validation function
     */
    static validate(email) {
        // 1. Sanity checks
        if (!email || typeof email !== 'string') {
            return { valid: false, reason: "No email address provided" };
        }
        
        let rawEmail = email.trim();
        
        // Auto-append @gmail.com if no @ is present (user sent only prefix)
        if (!rawEmail.includes('@')) {
            rawEmail = rawEmail + '@gmail.com';
        }
        
        // Overall length (RFC 5321)
        if (rawEmail.length > 254) {
            return { valid: false, reason: "Email address too long (over 254 characters)" };
        }

        // Check for exactly one @ symbol
        const parts = rawEmail.split('@');
        if (parts.length !== 2) {
            return { valid: false, reason: "Invalid format (missing @ or multiple @)" };
        }

        let [localPart, domain] = parts;
        
        // Check for empty or invalid domain
        if (!domain || domain.startsWith('.') || domain.endsWith('.')) {
             return { valid: false, reason: "Invalid domain" };
        }

        domain = domain.toLowerCase();
        
        // Only accept Gmail addresses
        if (domain !== 'gmail.com' && domain !== 'googlemail.com') {
            return { valid: false, reason: "Only Gmail addresses are supported" };
        }

        // 2. Syntax validation
        const syntaxResult = this.checkSyntax(localPart, domain);
        
        if (!syntaxResult.valid) {
            return syntaxResult;
        }

        // 3. Create normalized email
        const normalizedEmail = this.normalize(localPart, domain);

        return { 
            valid: true, 
            originalEmail: rawEmail,
            normalizedEmail: normalizedEmail,
            isGmail: true
        };
    }

    /**
     * Syntax validation logic
     */
    static checkSyntax(localPart, domain) {
        // Check local part length (RFC 5321)
        if (localPart.length === 0 || localPart.length > 64) {
            return { valid: false, reason: "Username must be between 1 and 64 characters" };
        }

        // === Gmail-specific validation ===
        if (domain === 'gmail.com' || domain === 'googlemail.com') {
            const lowerLocalPart = localPart.toLowerCase();
            
            // Check username length (6-30 characters)
            if (localPart.length < 6 || localPart.length > 30) {
                 return { valid: false, reason: "Gmail username must be between 6 and 30 characters" };
            }

            // Check for reserved usernames
            if (lowerLocalPart === 'abuse' || lowerLocalPart === 'postmaster') {
                return { valid: false, reason: "This username is reserved and cannot be used" };
            }

            // Gmail allows: letters, numbers, and dots only (no plus sign)
            // No consecutive dots, no dots at start/end
            const gmailRegex = /^(?!\.)(?!.*\.\.)(?!.*\.$)[a-z0-9.]+$/;
            
            if (!gmailRegex.test(lowerLocalPart)) {
                return { 
                    valid: false, 
                    reason: "Gmail username can only contain letters, numbers, and dots (no consecutive dots or dots at edges)" 
                };
            }

        } 
        // === Standard RFC validation ===
        else {
            // Check for dots at start/end
            if (localPart.startsWith('.') || localPart.endsWith('.')) {
                return { valid: false, reason: "Username cannot start or end with a dot" };
            }
            
            // Standard allowed characters (RFC 5322)
            const standardRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
            
            if (!standardRegex.test(localPart)) {
                return { valid: false, reason: "Username contains invalid characters" };
            }
            
            // Domain structure validation: at least one dot and TLD of 2+ characters
            const domainRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;
            if (!domainRegex.test(domain)) {
                return { valid: false, reason: "Invalid domain structure" };
            }
        }

        return { valid: true };
    }

    /**
     * Normalization function (Critical for DB Uniqueness)
     * Ensures that emails like john.doe@gmail.com and johndoe@gmail.com are treated as identical
     */
    static normalize(localPart, domain) {
        let normalizedLocal = localPart.toLowerCase();
        let normalizedDomain = domain; // already lowercase

        // Gmail-specific normalization
        if (normalizedDomain === 'gmail.com' || normalizedDomain === 'googlemail.com') {
            normalizedDomain = 'gmail.com'; // unify googlemail -> gmail
            
            // Remove all dots (Gmail ignores them)
            normalizedLocal = normalizedLocal.replace(/\./g, '');
        }

        return `${normalizedLocal}@${normalizedDomain}`;
    }
    
    /**
     * Helper function: Compare two email addresses
     */
    static areSame(email1, email2) {
        const result1 = this.validate(email1);
        const result2 = this.validate(email2);
        
        if (!result1.valid || !result2.valid) {
            return false;
        }
        
        return result1.normalizedEmail === result2.normalizedEmail;
    }
}

module.exports = { EmailValidator };
