import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface DeletePhotoButtonProps {
  onConfirm: () => void;
  className?: string;
  iconClassName?: string;
}

export const DeletePhotoButton: React.FC<DeletePhotoButtonProps> = ({
  onConfirm,
  className = 'absolute top-1 right-1 h-6 w-6 opacity-80 group-hover:opacity-100',
  iconClassName = 'h-3 w-3',
}) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className={className}
          onClick={(e) => e.stopPropagation()}
        >
          <Trash2 className={iconClassName} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar fotografía?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. La fotografía se eliminará permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
