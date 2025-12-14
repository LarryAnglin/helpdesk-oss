/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTenant } from '../../lib/context/TenantContext';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createProject, updateProject } from '@/lib/firebase/projectService';
import { Project, ProjectFormData } from '@/lib/types/project';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface ProjectFormProps {
  project?: Project | null;
  onSuccess?: () => void;
}

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  location: z.string().min(1, 'Location is required'),
  price: z.number().min(0, 'Price must be positive'),
  dueDate: z.string().min(1, 'Due date is required'),
});


export function ProjectForm({ project, onSuccess }: ProjectFormProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentTenant } = useTenant();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: project?.title || '',
      description: project?.description || '',
      location: project?.location || '',
      price: project?.price || 0,
      dueDate: project?.dueDate
        ? new Date(project.dueDate.toDate()).toISOString().split('T')[0]
        : '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const projectData: ProjectFormData = {
        ...values,
      };

      if (project) {
        await updateProject(project.id, projectData);
        toast({
          title: 'Success',
          description: 'Project updated successfully',
        });
      } else {
        if (!currentTenant?.id) {
          throw new Error('No tenant selected');
        }
        const newProject = await createProject(projectData, currentTenant.id);
        toast({
          title: 'Success',
          description: 'Project created successfully',
        });
        navigate(`/projects/${newProject.id}`);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save project',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{project ? 'Edit Project' : 'Create Project'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Project Title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describe the project..."
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Project Location" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/projects')}
              >
                Cancel
              </Button>
              <Button type="submit">
                {project ? 'Update Project' : 'Create Project'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}