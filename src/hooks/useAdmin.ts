import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  approved: boolean;
  blocked: boolean;
  created_at: string;
  updated_at: string;
  roles: string[];
  managed_by: string[]; // admin user_ids who manage this user
}

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!data);
      setLoading(false);
    };
    checkAdmin();
  }, [user]);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('*');

      const { data: managed } = await supabase
        .from('admin_managed_users')
        .select('*');

      const enriched: UserProfile[] = (profiles || []).map((p: any) => ({
        ...p,
        roles: (roles || []).filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role),
        managed_by: (managed || []).filter((m: any) => m.managed_user_id === p.user_id).map((m: any) => m.admin_user_id),
      }));

      setUsers(enriched);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const approveUser = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ approved: true })
      .eq('user_id', userId);
    if (error) throw error;
    await fetchUsers();
  };

  const blockUser = async (userId: string, blocked: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ blocked })
      .eq('user_id', userId);
    if (error) throw error;
    await fetchUsers();
  };

  const deleteUser = async (userId: string) => {
    // Delete profile (cascade will handle roles and managed users)
    // We can't delete from auth.users directly, but removing profile effectively blocks them
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
    await fetchUsers();
  };

  const toggleAdminRole = async (userId: string, makeAdmin: boolean) => {
    if (makeAdmin) {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' as any });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin' as any);
      if (error) throw error;
    }
    await fetchUsers();
  };

  const assignManagedUser = async (adminUserId: string, managedUserId: string) => {
    const { error } = await supabase
      .from('admin_managed_users')
      .insert({ admin_user_id: adminUserId, managed_user_id: managedUserId });
    if (error) throw error;
    await fetchUsers();
  };

  const removeManagedUser = async (adminUserId: string, managedUserId: string) => {
    const { error } = await supabase
      .from('admin_managed_users')
      .delete()
      .eq('admin_user_id', adminUserId)
      .eq('managed_user_id', managedUserId);
    if (error) throw error;
    await fetchUsers();
  };

  const getUserTurnarounds = async (userId: string) => {
    const { data, error } = await supabase
      .from('turnarounds')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const exportUserTurnarounds = async (userId: string, email: string) => {
    const data = await getUserTurnarounds(userId);
    const backup = {
      exportedAt: new Date().toISOString(),
      userEmail: email,
      userId,
      turnaroundsCount: data.length,
      turnarounds: data,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${email.replace('@', '_at_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return data.length;
  };

  const importUserTurnarounds = async (file: File, targetUserId: string): Promise<number> => {
    const text = await file.text();
    const backup = JSON.parse(text);
    
    if (!backup.turnarounds || !Array.isArray(backup.turnarounds)) {
      throw new Error('Formato de archivo inválido');
    }

    let imported = 0;
    for (const t of backup.turnarounds) {
      const { error } = await supabase
        .from('turnarounds')
        .insert({
          user_id: targetUserId,
          flight_number: t.flight_number,
          date: t.date,
          airline: t.airline,
          times: t.times,
          field_values: t.field_values,
          observations: t.observations || '',
        });
      if (!error) imported++;
    }
    return imported;
  };

  const createUser = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { email, password, display_name: displayName },
    });

    if (error) throw new Error(error.message || 'Error al crear usuario');
    if (data?.error) throw new Error(data.error);
    await fetchUsers();
    return data;
  };

  const changePassword = async (userId: string, newPassword: string) => {
    const { data, error } = await supabase.functions.invoke('change-password', {
      body: { user_id: userId, new_password: newPassword },
    });

    if (error) throw new Error(error.message || 'Error al cambiar contraseña');
    if (data?.error) throw new Error(data.error);
    return data;
  };

  return {
    isAdmin,
    loading,
    users,
    usersLoading,
    fetchUsers,
    approveUser,
    blockUser,
    deleteUser,
    toggleAdminRole,
    assignManagedUser,
    removeManagedUser,
    getUserTurnarounds,
    exportUserTurnarounds,
    importUserTurnarounds,
    createUser,
    changePassword,
  };
};
