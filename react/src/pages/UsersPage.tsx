/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState } from 'react';
import { Box } from '@mui/material';
import AppLayout from '@/components/layout/AppLayout';
import { UserList } from '@/components/users/UserList';
import { UserCreateDialog } from '@/components/users/UserCreateDialog';
import { UserEditDialog } from '@/components/users/UserEditDialog';
import { User } from '@/lib/types/user';

export function UsersPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreateUser = () => {
    setCreateDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleUserCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleUserUpdated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <AppLayout>
      <Box sx={{ px: { xs: 2, sm: 4 }, py: 4 }}>
        <UserList
          key={refreshTrigger}
          onCreateUser={handleCreateUser}
          onEditUser={handleEditUser}
        />
      </Box>
      <UserCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onUserCreated={handleUserCreated}
      />
      <UserEditDialog
        user={selectedUser}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUserUpdated={handleUserUpdated}
      />
    </AppLayout>
  );
}