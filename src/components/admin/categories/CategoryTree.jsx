import React, { useState, useEffect, useRef } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, Layers, GripVertical, Power, CornerDownRight } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export default function CategoryTree({
  categories,
  products,
  selectedId,
  onSelect,
  onEdit,
  onAddSub,
  onDelete,
  onToggleActive,
  onReorder,
  onMove,
}) {
  // Single-open-path accordion: at any moment there is exactly ONE open path
  // from the tree root down to the deepest expanded node — never two branches
  // expanded simultaneously anywhere in the tree. We track that path as an
  // ordered array of category ids (root → … → deepest open node) rather than a
  // per-node boolean set, which naturally enforces "one path only" without
  // manually collapsing every other node on each click.
  const chainOf = (id) => {
    const chain = [];
    let cur = categories.find((c) => c.id === id);
    const guard = new Set();
    while (cur && !guard.has(cur.id)) {
      chain.unshift(cur.id);
      guard.add(cur.id);
      cur = cur.parent_id ? categories.find((c) => c.id === cur.parent_id) : null;
    }
    return chain;
  };

  const computeInitialPath = () => {
    if (selectedId) {
      const ancestors = chainOf(selectedId).slice(0, -1);
      if (ancestors.length) return ancestors;
    }
    const firstTop = categories
      .filter((c) => !c.parent_id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))[0];
    return firstTop ? [firstTop.id] : [];
  };

  const [openPath, setOpenPath] = useState([]);
  const [activeId, setActiveId] = useState(null);

  // Categories load asynchronously (empty on first render), so seed the initial
  // open path the first time they arrive: reveal the selected category's
  // ancestor chain, or fall back to the first top-level category so the tree
  // isn't a wall of closed chevrons.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current || !categories.length) return;
    didInit.current = true;
    setOpenPath(computeInitialPath());
  }, [categories, selectedId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const childrenOf = (parentId) =>
    categories
      .filter((c) => (c.parent_id || null) === parentId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const count = (cat) => products.filter((p) => p.category === cat.name).length;

  // Full breadcrumb path for a category, e.g. "Electronics → Mobiles → Smartphones".
  const pathOf = (cat) => {
    const parts = [];
    let cur = cat;
    const guard = new Set();
    while (cur && !guard.has(cur.id)) {
      parts.unshift(cur.name);
      guard.add(cur.id);
      cur = cur.parent_id ? categories.find((c) => c.id === cur.parent_id) : null;
    }
    return parts.join(" → ");
  };

  // Replace the entire open path with the clicked node's root→node chain. If
  // the node is already on the open path, clicking it collapses it and
  // everything beneath it (truncating the path). This single replacement
  // naturally collapses any previously-open branch — unrelated top-levels,
  // siblings, and subtrees — because they simply fall off the new path. The
  // framer-motion height transition on each row animates the collapse/expand.
  const toggleExpand = (id) =>
    setOpenPath((path) => {
      if (path.includes(id)) return path.slice(0, path.indexOf(id));
      return chainOf(id);
    });

  const handleEnd = (e) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const overId = String(over.id);
    const activeCat = categories.find((c) => c.id === active.id);
    if (!activeCat) return;

    if (overId.startsWith("child:")) {
      const target = overId.slice(6);
      const newParent = target === "root" ? null : target;
      if (newParent === activeCat.id) return;
      onMove?.(active.id, newParent);
      return;
    }

    if (active.id === over.id) return;
    const overCat = categories.find((c) => c.id === over.id);
    if (!overCat) return;
    const overParent = overCat.parent_id || null;
    const activeParent = activeCat.parent_id || null;

    if (overParent === activeParent) {
      const group = childrenOf(activeParent);
      const oldIndex = group.findIndex((c) => c.id === active.id);
      const newIndex = group.findIndex((c) => c.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      const reordered = arrayMove(group, oldIndex, newIndex);
      onReorder?.(reordered.map((c, i) => ({ id: c.id, sort_order: i })));
    } else {
      onMove?.(active.id, overParent);
    }
  };

  const renderGroup = (parentId, depth = 0) => {
    const list = childrenOf(parentId);
    return (
      <SortableContext items={list.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        {list.map((c) => {
          const subs = childrenOf(c.id);
          const isOpen = openPath.includes(c.id);
          return (
            <TreeRow
              key={c.id}
              c={c}
              depth={depth}
              subs={subs}
              isOpen={isOpen}
              onToggleExpand={() => toggleExpand(c.id)}
              onSelect={() => onSelect(c)}
              selectedId={selectedId}
              path={pathOf(c)}
              onEdit={() => onEdit(c)}
              onAddSub={() => onAddSub(c)}
              onDelete={() => onDelete(c)}
              onToggleActive={() => onToggleActive(c)}
              count={count(c)}
              dragging={activeId != null}
            >
              {renderGroup(c.id, depth + 1)}
            </TreeRow>
          );
        })}
      </SortableContext>
    );
  };

  return (
    <TooltipProvider delayDuration={300}>
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={(e) => setActiveId(e.active.id)}
              onDragEnd={handleEnd}
              onDragCancel={() => setActiveId(null)}
            >
              {renderGroup(null)}
              {activeId != null && <TopLevelDrop />}
            </DndContext>
          )}
          {activeId != null && (
            <p className="mt-2 px-1 text-[11px] text-muted-foreground">
              Drag onto a row's <span className="font-medium">↳</span> tag to nest it as a sub-category.
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

function TreeRow({ c, depth, subs, isOpen, onToggleExpand, onSelect, selectedId, path, onEdit, onAddSub, onDelete, onToggleActive, count, dragging, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id });
  const { setNodeRef: setChildRef, isOver: childOver } = useDroppable({ id: `child:${c.id}` });
  const [hovered, setHovered] = useState(false);
  const style = { transform: CSS.Transform.toString(transform), transition };
  const selected = selectedId === c.id;

  return (
    <div>
      <div
        ref={setNodeRef}
        style={style}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`group flex items-center gap-1.5 rounded-lg py-1.5 pr-2 ${
          selected
            ? "bg-foreground/[0.07] ring-1 ring-inset ring-foreground/30"
            : "hover:bg-muted/50"
        } ${isDragging ? "opacity-40" : ""}`}
      >
        <span {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground/40 hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </span>
        <button type="button" onClick={onToggleExpand} className="text-muted-foreground">
          {subs.length > 0 ? (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <span className="inline-block w-4" />}
        </button>
        {c.image_url ? (
          <img src={c.image_url} alt="" className="h-6 w-6 rounded object-cover" />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded bg-muted"><Layers className="h-3.5 w-3.5 text-muted-foreground" /></div>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={onSelect} className="flex-1 text-left">
              <span className="line-clamp-1 text-sm font-medium">{c.name}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs normal-case">
            {path || c.name}
          </TooltipContent>
        </Tooltip>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{count}</span>
        {c.featured && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Featured" />}
        {c.active === false && <span className="text-[11px] text-muted-foreground">off</span>}
        <motion.div
          className="ml-1 flex items-center gap-0.5"
          initial={false}
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <IconBtn title="Edit" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn title="Add sub-category" onClick={onAddSub}><Plus className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn title={c.active === false ? "Activate" : "Archive"} onClick={onToggleActive}><Power className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn title="Delete" onClick={onDelete} danger><Trash2 className="h-3.5 w-3.5" /></IconBtn>
        </motion.div>
        {dragging && (
          <button
            type="button"
            ref={setChildRef}
            title={`Nest as sub-category of ${c.name}`}
            className={`ml-1 flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[11px] transition-colors ${childOver ? "bg-foreground text-background" : "border border-dashed border-border text-muted-foreground"}`}
          >
            <CornerDownRight className="h-3 w-3" />
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {isOpen && subs.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ marginLeft: 4, overflow: "hidden" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TopLevelDrop() {
  const { setNodeRef, isOver } = useDroppable({ id: "child:root" });
  return (
    <div
      ref={setNodeRef}
      className={`mt-2 flex items-center justify-center rounded-lg border-2 border-dashed py-2 text-xs transition-colors ${isOver ? "border-foreground bg-muted text-foreground" : "border-border text-muted-foreground"}`}
    >
      <CornerDownRight className="mr-1 h-3.5 w-3.5" /> Drop to move to top level
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