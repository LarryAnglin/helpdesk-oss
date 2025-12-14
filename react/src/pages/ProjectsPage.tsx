/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState } from 'react';
import { Box } from '@mui/material';
import AppLayout from '@/components/layout/AppLayout';
import { ProjectList } from '@/components/projects/ProjectList';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { Project } from '@/lib/types/project';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export function ProjectsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const handleCreateProject = () => {
    setIsCreateOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
  };

  const handleCloseDialogs = () => {
    setIsCreateOpen(false);
    setEditingProject(null);
  };

  return (
    <AppLayout>
      <Box sx={{ px: { xs: 0, sm: 0 }, py: 4 }}>
        <ProjectList
          onCreateProject={handleCreateProject}
          onEditProject={handleEditProject}
        />
      </Box>
        
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <ProjectForm onSuccess={handleCloseDialogs} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingProject} onOpenChange={(open) => !open && handleCloseDialogs()}>
        <DialogContent className="max-w-2xl">
          <ProjectForm project={editingProject} onSuccess={handleCloseDialogs} />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}