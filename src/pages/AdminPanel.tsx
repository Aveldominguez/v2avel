import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { useAdmin, UserProfile } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, Shield, Users, CheckCircle, XCircle, Trash2, Eye,
  Loader2, ShieldCheck, Link, Plane, LogOut, UserPlus, KeyRound,
  Download, Upload,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ThemeToggle } from '@/components/ThemeToggle';

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { updateAvailable } = useAppUpdate();
  const {
    isAdmin, loading, users, usersLoading, fetchUsers,
    approveUser, blockUser, deleteUser, toggleAdminRole,
    assignManagedUser, removeManagedUser, getUserTurnarounds,
    exportUserTurnarounds, importUserTurnarounds,
    createUser,
    changePassword,
  } = useAdmin();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [turnaroundsDialog, setTurnaroundsDialog] = useState<{ userId: string; email: string } | null>(null);
  const [turnarounds, setTurnarounds] = useState<any[]>([]);
  const [turnaroundsLoading, setTurnaroundsLoading] = useState(false);
  const [manageDialog, setManageDialog] = useState<UserProfile | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState<{ userId: string; email: string } | null>(null);
  const [newUserPassword, setNewUserPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState<string | null>(null);
  const importFileRef = React.useRef<HTMLInputElement>(null);
  const [importTarget, setImportTarget] = useState<{ userId: string; email: string } | null>(null);

  useEffect(() => {
    if (!loading && isAdmin) {
      fetchUsers();
    }
  }, [loading, isAdmin]);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/');
    }
  }, [loading, isAdmin, navigate]);

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    try {
      await approveUser(userId);
      toast({ title: 'Usuario aprobado' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo aprobar el usuario', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlock = async (userId: string, blocked: boolean) => {
    setActionLoading(userId);
    try {
      await blockUser(userId, blocked);
      toast({ title: blocked ? 'Usuario bloqueado' : 'Usuario desbloqueado' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget);
    try {
      await deleteUser(deleteTarget);
      toast({ title: 'Usuario eliminado' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar el usuario', variant: 'destructive' });
    } finally {
      setActionLoading(null);
      setDeleteTarget(null);
    }
  };

  const handleToggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    setActionLoading(userId);
    try {
      await toggleAdminRole(userId, !isCurrentlyAdmin);
      toast({ title: !isCurrentlyAdmin ? 'Admin asignado' : 'Admin revocado' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewTurnarounds = async (userId: string, email: string) => {
    setTurnaroundsDialog({ userId, email });
    setTurnaroundsLoading(true);
    try {
      const data = await getUserTurnarounds(userId);
      setTurnarounds(data);
    } catch {
      toast({ title: 'Error cargando escalas', variant: 'destructive' });
    } finally {
      setTurnaroundsLoading(false);
    }
  };

  const handleExportBackup = async (userId: string, email: string) => {
    setBackupLoading(userId);
    try {
      const count = await exportUserTurnarounds(userId, email);
      toast({ title: `Backup exportado: ${count} escalas` });
    } catch {
      toast({ title: 'Error al exportar', variant: 'destructive' });
    } finally {
      setBackupLoading(null);
    }
  };

  const handleImportBackup = async (file: File) => {
    if (!importTarget) return;
    setBackupLoading(importTarget.userId);
    try {
      const count = await importUserTurnarounds(file, importTarget.userId);
      toast({ title: `Importadas ${count} escalas para ${importTarget.email}` });
      // Refresh turnarounds if dialog is open
      if (turnaroundsDialog?.userId === importTarget.userId) {
        const data = await getUserTurnarounds(importTarget.userId);
        setTurnarounds(data);
      }
    } catch (err: any) {
      toast({ title: 'Error al importar', description: err.message, variant: 'destructive' });
    } finally {
      setBackupLoading(null);
      setImportTarget(null);
    }
  };

  const handleManageManagedUsers = async (adminProfile: UserProfile) => {
    setManageDialog(adminProfile);
  };
  const handleToggleManagedUser = async (adminUserId: string, managedUserId: string, isManaged: boolean) => {
    try {
      if (isManaged) {
        await removeManagedUser(adminUserId, managedUserId);
      } else {
        await assignManagedUser(adminUserId, managedUserId);
      }
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) return;
    setCreateLoading(true);
    try {
      await createUser(newEmail, newPassword, newDisplayName);
      toast({ title: 'Usuario creado correctamente' });
      setCreateDialog(false);
      setNewEmail('');
      setNewPassword('');
      setNewDisplayName('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const adminUsers = users.filter(u => u.roles.includes('admin'));
  const pendingUsers = users.filter(u => !u.approved && !u.blocked);
  const activeUsers = users.filter(u => u.approved && !u.blocked);
  const blockedUsers = users.filter(u => u.blocked);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className={cn("sticky z-50 bg-card/95 backdrop-blur border-b-2 border-border", updateAvailable ? "top-[40px]" : "top-0")}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 justify-center w-full">
              <ThemeToggle />
              <Shield className="h-6 w-6 text-destructive" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Panel de Administración</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Administrador: {user?.email}
            </p>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Button onClick={() => setCreateDialog(true)} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Crear Usuario
                </Button>
                <Button variant="outline" onClick={() => navigate('/')}>
                  Mis Escalas
                </Button>
              </div>
              <Button variant="destructive" size="icon" onClick={() => { signOut(); navigate('/auth'); }}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-operational">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{users.length}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total usuarios</p>
            </CardContent>
          </Card>
          <Card className="card-operational">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="text-2xl font-bold">{activeUsers.length}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Activos</p>
            </CardContent>
          </Card>
          <Card className="card-operational">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 text-warning" />
                <span className="text-2xl font-bold">{pendingUsers.length}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Pendientes</p>
            </CardContent>
          </Card>
          <Card className="card-operational">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <span className="text-2xl font-bold">{blockedUsers.length}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Bloqueados</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending approvals */}
        {pendingUsers.length > 0 && (
          <Card className="card-operational border-warning/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <Loader2 className="h-5 w-5" />
                Usuarios Pendientes de Aprobación ({pendingUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-sm">{u.email}</TableCell>
                      <TableCell>{u.display_name || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(u.created_at), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(u.user_id)}
                            disabled={actionLoading === u.user_id}
                            className="bg-success hover:bg-success/90"
                          >
                            {actionLoading === u.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteTarget(u.user_id)}
                            disabled={actionLoading === u.user_id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* All Users */}
        <Card className="card-operational">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Todos los Usuarios ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {usersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Bloqueado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(u => {
                      const isSelf = u.user_id === user?.id;
                      const isUserAdmin = u.roles.includes('admin');

                      return (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div>
                              <span className="font-mono text-sm">{u.email}</span>
                              {u.display_name && (
                                <p className="text-xs text-muted-foreground">{u.display_name}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {u.approved ? (
                              <Badge className="bg-success/20 text-success border-success/30">Aprobado</Badge>
                            ) : (
                              <Badge variant="secondary">Pendiente</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isUserAdmin && (
                                <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                                  <ShieldCheck className="h-3 w-3 mr-1" />Admin
                                </Badge>
                              )}
                              {!isSelf && (
                                <Switch
                                  checked={isUserAdmin}
                                  onCheckedChange={() => handleToggleAdmin(u.user_id, isUserAdmin)}
                                  disabled={actionLoading === u.user_id}
                                />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {!isSelf && (
                              <Switch
                                checked={u.blocked}
                                onCheckedChange={(blocked) => handleBlock(u.user_id, blocked)}
                                disabled={actionLoading === u.user_id}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewTurnarounds(u.user_id, u.email)}
                                title="Ver escalas"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleExportBackup(u.user_id, u.email)}
                                disabled={backupLoading === u.user_id}
                                title="Exportar backup"
                              >
                                {backupLoading === u.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setImportTarget({ userId: u.user_id, email: u.email });
                                  importFileRef.current?.click();
                                }}
                                title="Importar backup"
                              >
                                <Upload className="h-4 w-4" />
                              </Button>
                              {isUserAdmin && !isSelf && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleManageManagedUsers(u)}
                                  title="Vincular usuarios"
                                >
                                  <Link className="h-4 w-4" />
                                </Button>
                              )}
                              {!isSelf && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setPasswordDialog({ userId: u.user_id, email: u.email })}
                                  title="Cambiar contraseña"
                                >
                                  <KeyRound className="h-4 w-4" />
                                </Button>
                              )}
                              {!isSelf && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteTarget(u.user_id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el perfil del usuario. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Turnarounds dialog */}
      <Dialog open={!!turnaroundsDialog} onOpenChange={() => setTurnaroundsDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Escalas de {turnaroundsDialog?.email}</DialogTitle>
            <DialogDescription>
              {turnarounds.length} escalas encontradas
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => turnaroundsDialog && handleExportBackup(turnaroundsDialog.userId, turnaroundsDialog.email)}
              disabled={backupLoading === turnaroundsDialog?.userId || turnarounds.length === 0}
            >
              {backupLoading === turnaroundsDialog?.userId ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
              Exportar Backup
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (turnaroundsDialog) {
                  setImportTarget({ userId: turnaroundsDialog.userId, email: turnaroundsDialog.email });
                  importFileRef.current?.click();
                }
              }}
            >
              <Upload className="h-4 w-4 mr-1" />
              Importar Backup
            </Button>
          </div>
          {turnaroundsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : turnarounds.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay escalas registradas</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vuelo</TableHead>
                  <TableHead>Aerolínea</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turnarounds.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono font-bold">{t.flight_number}</TableCell>
                    <TableCell>{t.airline}</TableCell>
                    <TableCell>{format(new Date(t.date), 'dd MMM yyyy', { locale: es })}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/turnaround/${t.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" /> Ver/Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage users dialog */}
      <Dialog open={!!manageDialog} onOpenChange={() => setManageDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular usuarios a {manageDialog?.email}</DialogTitle>
            <DialogDescription>
              Selecciona qué usuarios puede administrar este admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {users
              .filter(u => u.user_id !== manageDialog?.user_id)
              .map(u => {
                const isManaged = u.managed_by.includes(manageDialog?.user_id || '');
                return (
                  <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30">
                    <Checkbox
                      checked={isManaged}
                      onCheckedChange={() =>
                        manageDialog && handleToggleManagedUser(manageDialog.user_id, u.user_id, isManaged)
                      }
                    />
                    <div>
                      <p className="text-sm font-medium">{u.email}</p>
                      <p className="text-xs text-muted-foreground">{u.display_name || 'Sin nombre'}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create user dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo usuario</DialogTitle>
            <DialogDescription>
              El usuario se creará con email confirmado. Podrás aprobarlo después.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">Email *</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Contraseña *</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-name">Nombre (opcional)</Label>
              <Input
                id="new-name"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="Nombre del usuario"
              />
            </div>
            <Button
              onClick={handleCreateUser}
              disabled={createLoading || !newEmail || !newPassword}
              className="w-full"
            >
              {createLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Crear Usuario
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change password dialog */}
      <Dialog open={!!passwordDialog} onOpenChange={() => { setPasswordDialog(null); setNewUserPassword(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>
              Nueva contraseña para {passwordDialog?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="change-password">Nueva contraseña *</Label>
              <Input
                id="change-password"
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <Button
              onClick={async () => {
                if (!passwordDialog || !newUserPassword) return;
                setPasswordLoading(true);
                try {
                  await changePassword(passwordDialog.userId, newUserPassword);
                  toast({ title: 'Contraseña actualizada' });
                  setPasswordDialog(null);
                  setNewUserPassword('');
                } catch (err: any) {
                  toast({ title: 'Error', description: err.message, variant: 'destructive' });
                } finally {
                  setPasswordLoading(false);
                }
              }}
              disabled={passwordLoading || newUserPassword.length < 6}
              className="w-full"
            >
              {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
              Cambiar Contraseña
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file input for import */}
      <input
        type="file"
        ref={importFileRef}
        accept=".json,.zip"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportBackup(file);
          e.target.value = '';
        }}
      />
    </div>
  );
};

export default AdminPanel;
