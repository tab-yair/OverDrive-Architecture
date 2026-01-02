/**
 * Services Index - Central export for all services
 */

const { userService, UserService } = require('./userService.js');
const { fileService, FileService } = require('./fileService.js');
const { permissionService, PermissionService } = require('./permissionService.js');
const { storageClient, StorageServerClient } = require('./storageClient.js');

module.exports = {
    userService,
    UserService,
    fileService,
    FileService,
    permissionService,
    PermissionService,
    storageClient,
    StorageServerClient
};
