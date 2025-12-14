/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import AppLayout from '@/components/layout/AppLayout';
import { ProjectDetail } from '@/components/projects/ProjectDetail';

export function ProjectDetailPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-6">
        <ProjectDetail />
      </div>
    </AppLayout>
  );
}