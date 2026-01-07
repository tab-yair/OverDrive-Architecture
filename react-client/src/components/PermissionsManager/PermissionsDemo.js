import React, { useState } from 'react';
import PermissionsManager from './PermissionsManager';

export default function PermissionsDemo() {
  const [users, setUsers] = useState([
    { id: 'u1', name: 'You (Owner)', username: 'your.email@gmail.com', role: 'owner', isInherited: false, avatarUrl: '' },
    { id: 'u2', name: 'Sarah Johnson', username: 'sarah.johnson@gmail.com', role: 'editor', isInherited: false, avatarUrl: '' },
    { id: 'u3', name: 'Mike Chen', username: 'mike.chen@gmail.com', role: 'editor', isInherited: true, avatarUrl: '' },
    { id: 'u4', name: 'Emma Davis', username: 'emma.davis@gmail.com', role: 'viewer', isInherited: false, avatarUrl: '' },
    { id: 'u5', name: 'Alex Wilson', username: 'alex.wilson@gmail.com', role: 'viewer', isInherited: true, avatarUrl: '' },
  ]);

  const currentUserRole = 'owner';

  const setRole = (userId, newRole) => {
    setUsers((prev) => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };
  const removeAccess = (userId) => {
    setUsers((prev) => prev.filter(u => u.id !== userId));
  };
  const transferOwnership = (userId) => {
    setUsers((prev) => prev.map(u => {
      if (u.id === userId) return { ...u, role: 'owner' };
      if (u.role === 'owner') return { ...u, role: 'editor' };
      return u;
    }));
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Permissions Management (Demo)</h2>
      <PermissionsManager
        currentUserRole={currentUserRole}
        users={users}
        onChange={{ setRole, removeAccess, transferOwnership }}
      />
    </div>
  );
}
