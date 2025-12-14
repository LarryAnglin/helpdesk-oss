/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { Project } from '@/lib/types/project';
import { getProjectById } from '@/lib/firebase/projectService';
import { useToast } from '@/components/ui/use-toast';

export function EditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  const loadProject = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const projectData = await getProjectById(id);
      
      if (!projectData) {
        toast({
          title: 'Error',
          description: 'Project not found',
          variant: 'destructive',
        });
        navigate('/projects');
        return;
      }
      
      setProject(projectData);
    } catch (error) {
      console.error('Error loading project:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project',
        variant: 'destructive',
      });
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <div>Loading project...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6">
        <ProjectForm project={project} />
      </div>
    </AppLayout>
  );
}