/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { TaskForm } from '@/components/projects/TaskForm';
import { Task } from '@/lib/types/task';
import { getTaskById } from '@/lib/firebase/taskService';
import { useToast } from '@/components/ui/use-toast';

export function EditTaskPage() {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (taskId) {
      loadTask();
    }
  }, [taskId]);

  const loadTask = async () => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      const taskData = await getTaskById(taskId);
      
      if (!taskData) {
        toast({
          title: 'Error',
          description: 'Task not found',
          variant: 'destructive',
        });
        navigate(`/projects/${projectId}`);
        return;
      }
      
      setTask(taskData);
    } catch (error) {
      console.error('Error loading task:', error);
      toast({
        title: 'Error',
        description: 'Failed to load task',
        variant: 'destructive',
      });
      navigate(`/projects/${projectId}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <div>Loading task...</div>
        </div>
      </AppLayout>
    );
  }

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
        <TaskForm projectId={projectId} task={task} />
      </div>
    </AppLayout>
  );
}