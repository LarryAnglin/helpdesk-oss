/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { createUser } from '@/lib/firebase/userClientService';
import { UserFormData } from '@/lib/types/user';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth/AuthContext';
// import { Company } from '@/lib/types/company';
// import { getAllCompanies } from '@/lib/firebase/companyService';

interface UserCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().min(1, 'Display name is required'),
  role: z.enum(['user', 'tech', 'company_admin', 'organization_admin', 'system_admin', 'super_admin'] as const),
  photoURL: z.union([z.string().url('Invalid URL'), z.literal('')]).optional(),
  disabled: z.boolean(),
  companyId: z.union([z.string(), z.literal('none')]).optional(),
});

export function UserCreateDialog({
  open,
  onOpenChange,
  onUserCreated,
}: UserCreateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  // const [companies, setCompanies] = useState<Company[]>([]);
  // const [loadingCompanies, setLoadingCompanies] = useState(false);
  const { toast } = useToast();
  const { userData } = useAuth();
  
  // Determine user's permission level
  const isSuperAdmin = userData?.role === 'super_admin';
  const isSystemAdmin = userData?.role === 'system_admin' || isSuperAdmin;
  const isOrgAdmin = userData?.role === 'organization_admin' || isSystemAdmin;
  const isCompanyAdmin = userData?.role === 'company_admin' || isOrgAdmin;
  

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      displayName: '',
      role: 'user',
      photoURL: '',
      disabled: false,
      companyId: isCompanyAdmin && !isOrgAdmin ? userData?.companyId : 'none',
    },
  });
  
  // Temporarily disable company loading due to permission issues
  // TODO: Fix company permissions and re-enable
  // useEffect(() => {
  //   if (open && isOrgAdmin && userData?.role === 'system_admin') {
  //     loadCompanies();
  //   }
  // }, [open, isOrgAdmin, userData?.role]);
  
  // const loadCompanies = async () => {
  //   setLoadingCompanies(true);
  //   try {
  //     const companyList = await getAllCompanies();
  //     setCompanies(companyList);
  //   } catch (error) {
  //     console.error('Error loading companies:', error);
  //     // Don't show error to user, just continue without companies
  //     setCompanies([]);
  //   } finally {
  //     setLoadingCompanies(false);
  //   }
  // };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    setGeneratedPassword(null);

    try {
      const userData: UserFormData = {
        ...values,
        photoURL: values.photoURL || undefined,
        companyId: values.companyId === 'none' ? undefined : values.companyId,
      };

      const result = await createUser(userData);
      
      // If the API returns a password, display it
      if ('password' in result) {
        setGeneratedPassword((result as any).password);
      } else {
        // Otherwise, show success and close dialog
        toast({
          title: 'Success',
          description: 'User created successfully',
        });
        onUserCreated();
        onOpenChange(false);
        form.reset({
          email: '',
          displayName: '',
          role: 'user',
          photoURL: '',
          disabled: false,
          companyId: isCompanyAdmin && !isOrgAdmin ? userData?.companyId : 'none',
        });
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogClose = () => {
    if (generatedPassword) {
      setGeneratedPassword(null);
      onUserCreated();
    }
    onOpenChange(false);
    form.reset({
      email: '',
      displayName: '',
      role: 'user',
      photoURL: '',
      disabled: false,
      companyId: isCompanyAdmin && !isOrgAdmin ? userData?.companyId : 'none',
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Add a new user to the system. A temporary password will be generated.
          </DialogDescription>
        </DialogHeader>
        {generatedPassword ? (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                User created successfully! The temporary password is:
                <div className="mt-2 font-mono text-lg font-bold select-all">
                  {generatedPassword}
                </div>
                <div className="mt-2 text-sm">
                  Please save this password. You won't be able to see it again.
                </div>
              </AlertDescription>
            </Alert>
            <Button onClick={handleDialogClose} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
              <FormField
                control={form.control as any}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="user@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John Doe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="tech">Tech</SelectItem>
                          {isCompanyAdmin && <SelectItem value="company_admin">Company Admin</SelectItem>}
                          {isOrgAdmin && <SelectItem value="organization_admin">Organization Admin</SelectItem>}
                          {isSystemAdmin && <SelectItem value="system_admin">System Admin</SelectItem>}
                          {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      {isCompanyAdmin && !isOrgAdmin ? 'Company admins can create users, techs, and other company admins' : 'Select the user\'s permission level'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Company selection disabled due to permission issues
              {false && (isOrgAdmin || (isCompanyAdmin && companies.length > 0)) && (
                <FormField
                  control={form.control as any}
                  name="companyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company {isCompanyAdmin ? '(Auto-assigned)' : ''}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || 'none'}
                        disabled={isCompanyAdmin || loadingCompanies}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingCompanies ? 'Loading...' : 'Select a company (optional)'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Company</SelectItem>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {isCompanyAdmin ? 'New users will be automatically assigned to your company' : 'Assign user to a company for branding'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              */}
              <FormField
                control={form.control as any}
                name="photoURL"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Photo URL (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com/photo.jpg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="disabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-medium">
                        Disable account
                      </FormLabel>
                      <FormDescription>
                        Create the account in a disabled state
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogClose()}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}