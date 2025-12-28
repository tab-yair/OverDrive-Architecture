const { User } = require('./User.js');

// In-memory user storage with indexing for efficient lookups
// Can be replaced with MongoDB in future iterations

const usersById = new Map();
const usersByUsername = new Map();

const usersStore = {
    async create(id, username, password, displayName, profileImage = null) {
        const newUser = new User(id, username, password, displayName, profileImage);
        usersById.set(id, newUser);
        usersByUsername.set(username, newUser);
        return User.toSafeObject(newUser);
    },

    async getById(id) {
        const user = usersById.get(id);
        return User.toSafeObject(user);
    },

    async getByUsername(username) {
        const user = usersByUsername.get(username);
        return User.toSafeObject(user);
    },

    async getByUsernameWithPassword(username) {
        return usersByUsername.get(username) || null;
    },

    async exists(username) {
        return usersByUsername.has(username);
    },

    async getAll() {
        return Array.from(usersById.values()).map(u => User.toSafeObject(u));
    },

    async update(id, updates) {
        const user = usersById.get(id);
        if (!user) return null;

        // Update username index if changed
        if (updates.username && updates.username !== user.username) {
            usersByUsername.delete(user.username);
            usersByUsername.set(updates.username, user);
        }

        Object.assign(user, updates);
        return User.toSafeObject(user);
    },

    async delete(id) {
        const user = usersById.get(id);
        if (!user) return false;

        usersById.delete(id);
        usersByUsername.delete(user.username);
        return true;
    }
};

module.exports = { usersStore };
