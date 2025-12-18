import crypto from 'crypto';

class User {
    constructor(id, username, password, displayName, profileImage) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.displayName = displayName;
        this.profileImage = profileImage; // Store image as base64 string
        this.createdAt = new Date();
    }
    
    static validate(data) {
        if (!data.username || data.username.length < 2) return "Username is too short";
        if (!data.password || data.password.length < 4) return "Password must be at least 4 characters";
        if (!data.displayName) return "Display name is required";
        if (data.profileImage && !data.profileImage.startsWith('data:image/')) {
            return "Invalid image format. Must be Base64 image string";
        }
        if (data.profileImage && data.profileImage.length > 2 * 1024 * 1024) {
            return "Profile image exceeds size limit of 2MB";
        }
        return null;
    }
}

// Main storage using Map
const usersById = new Map();        // id -> user
const usersByUsername = new Map();  // username -> user

const usersStore = {
    create: (username, password, displayName, profileImage) => {
        if (usersByUsername.has(username)) {
            throw new Error("Username already exists");
        }

        const id = crypto.randomUUID();
        const newUser = new User(id, username, password, displayName, profileImage);

        // Add to maps
        usersById.set(id, newUser);
        usersByUsername.set(username, newUser);

        return { ...newUser };
    },

    getByID: (id) => {
        const user = usersById.get(id);
        return user ? { ...user } : null;
    },

    getByUsername: (username) => {
        const user = usersByUsername.get(username);
        return user ? { ...user } : null;
    },

    getAll: () => Array.from(usersById.values()).map(u => ({ ...u })),

    authenticate: (username, password) => {
        const user = usersByUsername.get(username);
        if (user && user.password === password) {
            return { ...user };
        }
        return null;
    },

    update: (id, updates) => {
        const user = usersById.get(id);
        if (!user) return null;

        if (updates.username && updates.username !== user.username) {
            if (usersByUsername.has(updates.username)) {
                throw new Error("Username already exists");
            }
            usersByUsername.delete(user.username);
            usersByUsername.set(updates.username, user);
        }

        Object.assign(user, updates);
        return { ...user };
    },

    delete: (id) => {
        const user = usersById.get(id);
        if (!user) return [];

        // 1. Delete all files owned by this user and collect physical IDs
        const deletedFileIds = filesStore.deleteByOwnerId(id);

        // 2. Delete permissions granted TO this user on other people's files
        permissionStore.deleteByUserId(id);

        // 3. Remove the user from the storage maps
        usersById.delete(id);
        usersByUsername.delete(user.username);

        // 4. Return the list of all deleted file IDs
        return deletedFileIds;
    }
};

export { User, usersStore };
