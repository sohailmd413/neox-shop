import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, Layers, GripVertical, Power } from "lucide-react";

export default function CategoryTree({ categories, products, onSelect, selectedId, onEdit, onAddSub, onDelete, onToggleActive, onReorder }) {
  const [expanded, setExpanded] = useState(() => {
    const s = new Set();
    categories.filter((c) => !c.parent_id).forEach((c) => s.add(c.id));
    return s;
  });

  const childrenOf = (parentId) =>
    categories
      .filter((c) => (c.parent_id || null) === parentId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const count = (cat) => products.filter((p) => p.category === cat.name).length;

  const onDragEnd = (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const parentId = result.source.droppableId;
    const group = childrenOf(parentId === "root" ? null : parentId);
    const [moved] = group.splice(result.source.index, 1);
    group.splice(result.destination.index, 0, moved);
    onReorder(group.map((c, i) => ({ id: c.id, sort_order: i })));
  };

  const renderGroup = (parentId, depth = 0) => {
    const list = childrenOf(parentId);
    const droppableId = parentId === null ? "root" : parentId;
    return (
      <Droppable droppableId={droppableId}>
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {list.map((c, index) => {
              const subs = childrenOf(c.id);
              const isOpen = expanded.has(c.id);
              return (
                <div key={c.id}>
                  <Draggable draggableId={c.id} index={index}>
                    {(p) => (
                      <div
                        ref={p.innerRef}
                        {...p.draggableProps}
                        className={`group flex items-center gap-1.5 rounded-lg py-1.5 pr-2 ${selectedId === c.id ? "bg-foreground/5" : "hover:bg-muted/50"}`}
                        style={{ ...p.draggableProps.style, paddingLeft: depth * 14 + 4 }}
                      >
                        <span {...p.dragHandleProps} className="cursor-grab text-muted-foreground/40 hover:text-foreground">
                          <GripVertical className="h-4 w-4" />
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpanded((s) => { const n = new Set(s); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })}
                          className="text-muted-foreground"
                        >
                          {subs.length > 0 ? (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <span className="inline-block w-4" />}
                        </button>
                        {c.image_url ? (
                          <img src={c.image_url} alt="" className="h-6 w-6 rounded object-cover" />
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded bg-muted"><Layers className="h-3.5 w-3.5 text-muted-foreground" /></div>
                        )}
                        <button type="button" onClick={() => onSelect(c)} className="flex-1 text-left">
                          <span className="line-clamp-1 text-sm font-medium">{c.name}</span>
                        </button>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{count(c)}</span>
                        {c.featured && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Featured" />}
                        {c.active === false && <span className="text-[11px] text-muted-foreground">off</span>}
                        <div className="ml-1 hidden items-center gap-0.5 group-hover:flex">
                          <IconBtn title="Edit" onClick={() => onEdit(c)}><Pencil className="h-3.5 w-3.5" /></IconBtn>
                          <IconBtn title="Add sub-category" onClick={() => onAddSub(c)}><Plus className="h-3.5 w-3.5" /></IconBtn>
                          <IconBtn title={c.active === false ? "Activate" : "Deactivate"} onClick={() => onToggleActive(c)}><Power className="h-3.5 w-3.5" /></IconBtn>
                          <IconBtn title="Delete" onClick={() => onDelete(c)} danger><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                        </div>
                      </div>
                    )}
                  </Draggable>
                  {isOpen && subs.length > 0 && <div style={{ marginLeft: 4 }}>{renderGroup(c.id, depth + 1)}</div>}
                </div>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2 px-1">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Category tree</h3>
        <span className="ml-auto text-xs text-muted-foreground">{categories.length} total</span>
      </div>
      <div className="flex-1 overflow-y-auto pr-1">
        {categories.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No categories yet.</p>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>{renderGroup(null)}</DragDropContext>
        )}
      </div>
    </div>
  );
}

function IconBtn({ title, onClick, danger, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-md p-1.5 text-muted-foreground hover:bg-muted ${danger ? "hover:bg-destructive/10 hover:text-destructive" : "hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}