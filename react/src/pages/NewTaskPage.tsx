/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useParams } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { TaskForm } from '@/components/projects/TaskForm';

export function NewTaskPage() {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <div>Invalid project ID</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6">
        <TaskForm projectId={projectId} />
      </div>
    </AppLayout>
  );
}