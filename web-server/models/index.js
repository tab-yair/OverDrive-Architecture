/**
 * Models Index - Central export for all models and stores
 */

// Base model classes
const { User } = require('./User.js');
const { FileItem } = require('./FileItem.js');
const { Permission } = require('./Permission.js');

// Memory management stores
const { usersStore } = require('./usersStore.js');
const { filesStore } = require('./filesStore.js');
const { permissionStore } = require('./permissionStore.js');

module.exports = {
    User,
    FileItem,
    Permission,
    usersStore,
    filesStore,
    permissionStore
};
