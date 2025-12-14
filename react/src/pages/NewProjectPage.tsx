/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import AppLayout from '@/components/layout/AppLayout';
import { ProjectForm } from '@/components/projects/ProjectForm';

export function NewProjectPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-6">
        <ProjectForm />
      </div>
    </AppLayout>
  );
}