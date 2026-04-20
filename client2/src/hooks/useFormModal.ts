import { useState, useCallback } from 'react';

export const useFormModal = <T = unknown>() => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | undefined>(undefined);

  const openForCreate = useCallback(() => {
    setEditingItem(undefined);
    setIsOpen(true);
  }, []);

  const openForEdit = useCallback((item: T) => {
    setEditingItem(item);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setEditingItem(undefined);
  }, []);

  const isEditing = editingItem !== undefined;

  return {
    isOpen,
    editingItem,
    isEditing,
    openForCreate,
    openForEdit,
    close
  };
};
