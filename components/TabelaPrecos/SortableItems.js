// components/TabelaPrecos/SortableItems.js
// Componentes de Drag & Drop (dnd-kit) para categorias e produtos

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ══════════════════════════════════════════════════════════════
// Item Arrastável de Categoria
// ══════════════════════════════════════════════════════════════
export function SortableCategory({ id, children, disabled }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="category-drag-area" {...listeners}>
        {children({ isDragging })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Item Arrastável de Produto
// ══════════════════════════════════════════════════════════════
export function SortableProduct({ id, children, disabled }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children({ listeners, isDragging })}
    </div>
  );
}