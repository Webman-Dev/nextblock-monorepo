// app/cms/navigation/components/NavigationMenuDnd.tsx
"use client";

import React, { useState, useTransition, useCallback, useMemo, JSX, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragMoveEvent,
  UniqueIdentifier,
  MeasuringStrategy,
  DropAnimation,
  defaultDropAnimationSideEffects,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@nextblock-cms/ui";
import { Button } from "@nextblock-cms/ui";
import { HierarchicalNavItem, SortableNavItem } from './SortableNavItem';
import type { Database } from "@nextblock-cms/db";
import { updateNavigationStructureBatch } from '../actions';
import { GripVertical, MoreHorizontal } from 'lucide-react';

type NavigationItem = Database['public']['Tables']['navigation_items']['Row'];
type MenuLocation = Database['public']['Enums']['menu_location'];
import { Badge } from "@nextblock-cms/ui";
import { createPortal } from 'react-dom';

const INDENTATION_WIDTH = 25;

interface FoundItemInfo {
  item: HierarchicalNavItem;
  parent: HierarchicalNavItem | null;
  siblings: HierarchicalNavItem[];
  index: number;
}

const buildTree = (
  items: NavigationItem[],
  parentId: number | null = null,
  depth = 0,
  languageCode: string
): HierarchicalNavItem[] => {
  return items
    .filter(item => item.parent_id === parentId)
    .sort((a, b) => a.order - b.order)
    .map(item => {
      const navItem = item as NavigationItem;
      return {
        ...navItem,
        id: Number(navItem.id),
        depth,
        children: buildTree(items, navItem.id, depth + 1, languageCode),
        languageCode: languageCode,
        parentLabel: items.find(p => p.id === navItem.parent_id)?.label || null,
        pageSlug: 'pages' in navItem && navItem.pages && typeof navItem.pages === 'object' && 'slug' in navItem.pages ? (navItem.pages as { slug: string }).slug : null,
      };
    });
};

const flattenTree = (nodes: HierarchicalNavItem[]): HierarchicalNavItem[] => {
  const result: HierarchicalNavItem[] = [];
  const stack = [...nodes];
  while (stack.length) {
    const node = stack.shift();
    if (node) {
      result.push(node);
      if (node.children && node.children.length) {
        stack.unshift(...node.children);
      }
    }
  }
  return result;
};

function findItemDeep(
  items: HierarchicalNavItem[],
  itemId: UniqueIdentifier,
  parent: HierarchicalNavItem | null = null
): FoundItemInfo | null {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.id === itemId) {
      return { item, parent, siblings: parent ? parent.children : items, index: i };
    }
    if (item.children && item.children.length > 0) {
      const found = findItemDeep(item.children, itemId, item);
      if (found) return found;
    }
  }
  return null;
}

function removeItemFromTree(
  tree: HierarchicalNavItem[],
  itemId: UniqueIdentifier
): { newTree: HierarchicalNavItem[]; removedItemBranch: HierarchicalNavItem | null } {
  let removedItemBranch: HierarchicalNavItem | null = null;
  function filterRecursive(items: HierarchicalNavItem[]): HierarchicalNavItem[] {
    return items.filter(item => {
      if (item.id === itemId) {
        removedItemBranch = item;
        return false;
      }
      if (item.children) {
        item.children = filterRecursive(item.children);
      }
      return true;
    });
  }
  const newTree = filterRecursive(structuredClone(tree));
  return { newTree, removedItemBranch };
}

function addItemToTree(
  tree: HierarchicalNavItem[],
  itemToAdd: HierarchicalNavItem,
  targetParentId: UniqueIdentifier | null,
  targetIndex: number
): HierarchicalNavItem[] {
  if (targetParentId === null) {
    const newTree = [...tree];
    newTree.splice(targetIndex, 0, itemToAdd);
    return newTree;
  }
  return tree.map(node => {
    if (node.id === targetParentId) {
      const newChildren = [...(node.children || [])];
      newChildren.splice(targetIndex, 0, itemToAdd);
      return { ...node, children: newChildren };
    }
    if (node.children && node.children.length > 0) {
      return { ...node, children: addItemToTree(node.children, itemToAdd, targetParentId, targetIndex) };
    }
    return node;
  });
}

function normalizeTree(items: HierarchicalNavItem[], depth = 0, parentId: number | null = null): HierarchicalNavItem[] {
  return items.map((item, index) => {
    const normalizedItem: HierarchicalNavItem = {
      ...item,
      order: index,
      parent_id: parentId,
      depth,
    };
    if (normalizedItem.children && normalizedItem.children.length > 0) {
      normalizedItem.children = normalizeTree(normalizedItem.children, depth + 1, normalizedItem.id as number);
    } else {
      normalizedItem.children = [];
    }
    return normalizedItem;
  });
}

interface NavigationMenuDndProps {
  menuKey: MenuLocation;
  languageCode: string;
  initialItems: NavigationItem[];
}

export default function NavigationMenuDnd({ menuKey, languageCode, initialItems }: NavigationMenuDndProps) {
  void menuKey;
  // Prevent SSR/hydration mismatches from dnd-kit by rendering on client only
  // Keep hooks order stable; move early return after hooks
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  const [, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [hierarchicalItems, setHierarchicalItems] = useState<HierarchicalNavItem[]>(() => buildTree(initialItems, null, 0, languageCode));
  const [projected, setProjected] = useState<{ parentId: UniqueIdentifier | null; index: number; depth: number; overId: UniqueIdentifier | null } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const flatItemIds = useMemo(() => flattenTree(hierarchicalItems).map(item => item.id), [hierarchicalItems]);
  const activeItemDataForOverlay = activeId ? findItemDeep(hierarchicalItems, activeId) : null;

  const getDragDepth = (offset: number, initialDepth: number) => {
    const newDepth = initialDepth + Math.round(offset / INDENTATION_WIDTH);
    return Math.max(0, newDepth);
  };

  const getProjectedDropPosition = useCallback((
    activeItemLocal: HierarchicalNavItem,
    overItemLocal: HierarchicalNavItem | null, // This is the item we are hovering "over"
    dragDeltaX: number,
    currentTree: HierarchicalNavItem[],
    rawEvent: DragMoveEvent | DragOverEvent // Pass the raw event for pointer coordinates
  ): { parentId: UniqueIdentifier | null; index: number; depth: number; } => {
    
    const initialDepth = activeItemLocal.depth;
    const flatCurrentTree = flattenTree(currentTree);
    const activeItemFlatIndex = flatCurrentTree.findIndex(i => i.id === activeItemLocal.id);

    // Define thresholds for explicit horizontal gesture
    const HORIZONTAL_GESTURE_DRAG_X_THRESHOLD = INDENTATION_WIDTH * 0.4; // More sensitive: 10px
    const HORIZONTAL_GESTURE_MAX_Y_DRIFT = 12; // Slightly more forgiving Y drift

    let newProjectedDepth = getDragDepth(dragDeltaX, initialDepth); // Default calculation
    let isHorizontalGestureIntent = false;

    // --- Explicit Horizontal Gesture Detection (Highest Priority) ---
    if (Math.abs(rawEvent.delta.y) < HORIZONTAL_GESTURE_MAX_Y_DRIFT) {
      if (dragDeltaX > HORIZONTAL_GESTURE_DRAG_X_THRESHOLD) { // Intent to indent (drag right)
        newProjectedDepth = initialDepth + 1; // Set intended depth for this gesture
        isHorizontalGestureIntent = true;
        if (activeItemFlatIndex > 0) {
          const itemAbove = flatCurrentTree[activeItemFlatIndex - 1];
          if (itemAbove.depth === initialDepth) { // Item above is a potential parent
            const activeBranchIds = new Set(flattenTree([activeItemLocal]).map(i => i.id));
            if (!activeBranchIds.has(itemAbove.id as number)) { // Avoid self-nesting
              return { parentId: itemAbove.id, index: itemAbove.children.length, depth: newProjectedDepth };
            }
          }
        }
        // If not returned, newProjectedDepth (initialDepth + 1) is carried to fallback logic.
      } else if (dragDeltaX < -HORIZONTAL_GESTURE_DRAG_X_THRESHOLD) { // Intent to outdent (drag left)
        if (activeItemLocal.parent_id) { // Can only outdent if it has a parent
          const parentInfo = findItemDeep(currentTree, activeItemLocal.parent_id);
          if (parentInfo) {
            newProjectedDepth = Math.max(0, initialDepth - 1); // Set intended depth
            isHorizontalGestureIntent = true;
            const grandParentId = parentInfo.parent?.id ?? null;
            const newIndex = parentInfo.index + 1; // Place after original parent
            return { parentId: grandParentId, index: newIndex, depth: newProjectedDepth };
          }
        } else { // Already at root, but a clear left drag was made
            newProjectedDepth = 0; // Stay at root
            isHorizontalGestureIntent = true;
            // No immediate return, let fallback logic handle placing at root if needed,
            // but with depth 0 confirmed.
        }
      }
    }

    // --- Fallback Logic ---
    // `newProjectedDepth` now holds:
    // 1. The result of an explicit horizontal gesture's intended depth (if gesture occurred & didn't return).
    // 2. Or the default `getDragDepth` if no such gesture was detected.

    if (!overItemLocal) {
      // Dropping in empty space
      if (newProjectedDepth === 0) {
        return { parentId: null, index: currentTree.length, depth: 0 };
      }
      // Try to find a logical parent if indenting into empty space
      const activeItemOriginalParentInfo = activeItemLocal.parent_id ? findItemDeep(currentTree, activeItemLocal.parent_id) : null;
      if (activeItemOriginalParentInfo && activeItemOriginalParentInfo.item.depth + 1 === newProjectedDepth) {
         const activeBranchIds = new Set(flattenTree([activeItemLocal]).map(i => i.id));
         if (!activeBranchIds.has(activeItemOriginalParentInfo.item.id as number)) {
            return { parentId: activeItemOriginalParentInfo.item.id, index: activeItemOriginalParentInfo.item.children.length, depth: newProjectedDepth };
         }
      }
      const potentialParentsAtCorrectDepth = flatCurrentTree.filter(p => p.depth === newProjectedDepth - 1);
      if (potentialParentsAtCorrectDepth.length > 0) {
        const lastPotentialParent = potentialParentsAtCorrectDepth[potentialParentsAtCorrectDepth.length - 1];
        const activeBranchIds = new Set(flattenTree([activeItemLocal]).map(i => i.id));
        if (!activeBranchIds.has(lastPotentialParent.id as number)) {
          return { parentId: lastPotentialParent.id, index: lastPotentialParent.children.length, depth: newProjectedDepth };
        }
      }
      return { parentId: null, index: currentTree.length, depth: Math.max(0, newProjectedDepth) }; // Ensure depth is not negative
    }

    // Dropping over an existing item (`overItemLocal` is not null)
    const overItemInfo = findItemDeep(currentTree, overItemLocal.id);
    if (!overItemInfo) { // Should not happen if overItemLocal is valid
      return { parentId: null, index: currentTree.length, depth: newProjectedDepth };
    }

    // If an explicit horizontal gesture did not set the depth (i.e., isHorizontalGestureIntent is false),
    // then newProjectedDepth is still from the initial getDragDepth().
    // If isHorizontalGestureIntent is true, newProjectedDepth reflects that intent.
    // Now, cap this depth if we are dropping over an item.
    // If an explicit horizontal gesture was intended, newProjectedDepth already reflects that.
    // Only cap based on overItemInfo if it was NOT an explicit horizontal gesture that set the depth.
    if (overItemInfo && !isHorizontalGestureIntent) {
        newProjectedDepth = Math.min(newProjectedDepth, overItemInfo.item.depth + 1);
    } else if (overItemInfo && isHorizontalGestureIntent) {
        // If it WAS a horizontal gesture, we still might need to cap it if overItem is relevant
        // and would lead to an invalid depth (e.g., indenting too far under overItem).
        // However, the primary target of the gesture (itemAbove/originalParent) should have taken precedence.
        // If we are here, it means the gesture's primary target wasn't met, and we are now considering overItem.
        // In this specific case, capping is appropriate.
        newProjectedDepth = Math.min(newProjectedDepth, overItemInfo.item.depth + 1);
    }
    newProjectedDepth = Math.max(0, newProjectedDepth); // Ensure depth is not negative


    let targetParentId: UniqueIdentifier | null;
    let targetIndex: number;

    const overItemRect = rawEvent.over?.rect;
    const pointerY = rawEvent.delta.y + (rawEvent.active.rect.current.initial?.top || 0);
    const isDroppingBeforeOverItem = overItemRect ? pointerY < overItemRect.top + overItemRect.height / 2 : false;

    if (newProjectedDepth > overItemInfo.item.depth) {
      // Nesting: Make activeItem a child of overItemLocal
      targetParentId = overItemInfo.item.id;
      targetIndex = overItemInfo.item.children.length; // Default to last child
    } else if (newProjectedDepth === overItemInfo.item.depth) {
      // Reordering at the same level as overItemLocal
      targetParentId = overItemInfo.parent?.id ?? null;
      targetIndex = isDroppingBeforeOverItem ? overItemInfo.index : overItemInfo.index + 1;
    } else { // newProjectedDepth < overItemInfo.item.depth (Outdenting relative to overItemLocal)
      let ancestor = overItemInfo.parent; // Start with overItem's parent

      while (ancestor && ancestor.depth > newProjectedDepth) {
          const grandParentInfo = ancestor.parent_id ? findItemDeep(currentTree, ancestor.parent_id) : null;
          ancestor = grandParentInfo?.item ?? null; // This is the new potential parent
          ancestor = grandParentInfo?.item ?? null;
      }
      // ancestor is now the target parent (or null if root).
      // ancestorParentInfo.item (if ancestor is not null) is the item whose child list we are inserting into.
      // or currentTree if ancestor is null.
      // The item we are placing relative to is the one whose depth is newProjectedDepth + 1
      // which was the child of 'ancestor'. This is `overItemInfo.item` if it was already at that level,
      // or the parent of `overItemInfo.item` if `overItemInfo.item` was deeper.

      targetParentId = ancestor?.id ?? null;
      let referenceItemForSiblingPlacement: HierarchicalNavItem | undefined | null;

      if (targetParentId) { // Outdenting to a non-root level
          // We need to find which child of 'ancestor' was the block we outdented from.
          // This would be the item at depth `newProjectedDepth` that was an ancestor of `overItemLocal` or `overItemLocal` itself.
          let itemToPlaceAfter = overItemInfo.item;
          while(itemToPlaceAfter.parent_id !== targetParentId && typeof itemToPlaceAfter.parent_id === 'number') {
              const parent = findItemDeep(currentTree, itemToPlaceAfter.parent_id as number); // Cast as number after check
              if (!parent) break;
              itemToPlaceAfter = parent.item;
          }
          referenceItemForSiblingPlacement = itemToPlaceAfter;
          const siblings = ancestor?.children ?? [];
          const refIndex = siblings.findIndex(s => s.id === referenceItemForSiblingPlacement?.id);
          targetIndex = refIndex !== -1 ? refIndex + 1 : siblings.length;


      } else { // Outdenting to root
          // Find the root item that was the ancestor block of overItemLocal
          let rootAncestor = overItemInfo.item;
          while(typeof rootAncestor.parent_id === 'number') {
              const parent = findItemDeep(currentTree, rootAncestor.parent_id as number); // Cast as number after check
              if(!parent) break;
              rootAncestor = parent.item;
          }
          referenceItemForSiblingPlacement = rootAncestor;
          const rootItems = currentTree.filter(i => i.parent_id === null);
          const refIndex = rootItems.findIndex(s => s.id === referenceItemForSiblingPlacement?.id);
          targetIndex = refIndex !== -1 ? refIndex + 1 : rootItems.length;
      }
       // If dropping before the item that was the "parent block"
       if (isDroppingBeforeOverItem && overItemLocal.id === referenceItemForSiblingPlacement?.id) {
           targetIndex--;
       }
    }
    
    // Ensure index is not out of bounds
    const parentNodeForIndexCheck = targetParentId ? findItemDeep(currentTree, targetParentId)?.item : null;
    const siblingsForIndexCheck = parentNodeForIndexCheck ? parentNodeForIndexCheck.children : currentTree.filter(i => i.parent_id === null);
    targetIndex = Math.max(0, Math.min(targetIndex, siblingsForIndexCheck.length));

    // Special fix for dragging to be the very first item at root
    if (targetParentId === null && isDroppingBeforeOverItem && overItemInfo.parent === null && overItemInfo.index === 0) {
      targetIndex = 0;
    }
    
    return { parentId: targetParentId, index: targetIndex, depth: newProjectedDepth };
  }, []);


  const onDragMove = (event: DragMoveEvent) => {
    const { active, over, delta } = event;
    if (!active) {
      setProjected(null);
      return;
    }

    const activeItemSearchResult = findItemDeep(hierarchicalItems, active.id);
    if (!activeItemSearchResult) {
      setProjected(null);
      return;
    }
    const activeItem = activeItemSearchResult.item;

    // Pure horizontal drag detection
    const isPureHorizontalDrag = Math.abs(delta.x) > INDENTATION_WIDTH * 0.6 && Math.abs(delta.y) < 8;

    if (isPureHorizontalDrag) {
      const flatItems = flattenTree(hierarchicalItems);
      const activeItemIndexInFlatList = flatItems.findIndex(item => item.id === active.id);

      if (delta.x > 0) { // Right-drag (indent)
        if (activeItemIndexInFlatList > 0) {
          const itemAbove = flatItems[activeItemIndexInFlatList - 1];
          // Ensure itemAbove is a valid potential parent (e.g., not a child of activeItem, and at a suitable depth)
          // For simplicity here, we assume any item above can be a parent if it's not the active item itself or its descendant.
          // More robust checks might be needed depending on exact requirements (e.g. itemAbove.depth === activeItem.depth)
          // For now, we allow indenting under any item above it, if it's not part of the active branch.
          const activeBranchIds = new Set(flattenTree([activeItem]).map(i => i.id));
          if (!activeBranchIds.has(itemAbove.id as number) && itemAbove.depth >= activeItem.depth -1) { // Allow indenting under same level or one level up
            setProjected({
              parentId: itemAbove.id,
              index: itemAbove.children.length,
              depth: activeItem.depth + 1,
              overId: itemAbove.id, // Set overId to the new parent
            });
            return;
          }
        }
      } else { // Left-drag (outdent)
        const foundItem = findItemDeep(hierarchicalItems, active.id);
        if (!foundItem) return;
        const { parent: currentParent } = foundItem;
        const grandParentId = currentParent?.parent_id ?? null;
        
        let insertIndex;
        if (currentParent) {
          const parentInfo = findItemDeep(hierarchicalItems, currentParent.id);
          insertIndex = parentInfo ? parentInfo.index + 1 : hierarchicalItems.length;
        } else {
          // If no current parent, it's a root item. Outdenting means staying at root.
          // We need to find its index among root items to place it correctly if it were to be moved.
          // However, for a pure outdent, it just stays at its level.
          // The setProjected below handles depth. The index might need adjustment if we allow reordering at root via pure outdent.
          // For now, if it's a root item and outdenting, it effectively does nothing to its position, only confirms depth.
          const rootItems = hierarchicalItems.filter(item => item.parent_id === null);
          const currentRootIndex = rootItems.findIndex(item => item.id === active.id);
          insertIndex = currentRootIndex +1; // This might not be ideal, depends on desired behavior for outdenting root.
                                          // Let's assume it means placing it after itself if it's the last root, or after its original position.
                                          // A more robust way would be to find its original parent's siblings.
        }
        
        // If currentParent is null, it's a root item. grandParentId is null.
        // insertIndex calculation for root items:
        if (!currentParent) {
            const rootItems = hierarchicalItems.filter(i => i.parent_id === null);
            const activeRootIndex = rootItems.findIndex(i => i.id === active.id);
            // Place it after its current position among root items if outdenting from root
            // Or at the end if it's somehow not found (should not happen)
            insertIndex = activeRootIndex !== -1 ? activeRootIndex + 1 : rootItems.length;
        }


        setProjected({
          parentId: grandParentId,
          index: insertIndex,
          depth: Math.max(0, activeItem.depth - 1),
          overId: null, // No specific item is "over" in a pure outdent
        });
        return;
      }
    }

    // Fallback to existing logic if not a pure horizontal drag or if conditions for indent/outdent weren't met
    const overItemSearchResult = over ? findItemDeep(hierarchicalItems, over.id) : null;
    const overItem = overItemSearchResult?.item ?? null;

    if (over && activeItem) {
      const activeBranchIds = new Set(flattenTree([activeItem]).map(i => i.id));
      if (activeBranchIds.has(over.id as number)) {
        setProjected(null);
        return;
      }
    }

    const newProjection = getProjectedDropPosition(activeItem, overItem, delta.x, hierarchicalItems, event);
    setProjected({ ...newProjection, overId: over ? over.id : null });
  };

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active } = event;
    setActiveId(null);

    if (!projected || !active.id) {
        setProjected(null);
        return;
    }

    const originalTree = structuredClone(hierarchicalItems);

    const { newTree: treeWithoutActive, removedItemBranch } = removeItemFromTree(hierarchicalItems, active.id);
    if (!removedItemBranch) {
        setProjected(null);
        return;
    }
    
    let tempParentId = projected.parentId;
    let isSelfNesting = false;
    while(tempParentId !== null){
        if(tempParentId === active.id){
            isSelfNesting = true;
            break;
        }
        const parentNodeInfo = findItemDeep(treeWithoutActive, tempParentId);
        if (!parentNodeInfo) break;
        tempParentId = parentNodeInfo.item.parent_id ?? null;
    }

    if(isSelfNesting){
        setProjected(null);
        setHierarchicalItems(originalTree); 
        return;
    }

    function updateDepthRecursive(item: HierarchicalNavItem, newBaseDepth: number): HierarchicalNavItem {
        const updatedItem = { ...item, depth: newBaseDepth };
        if (updatedItem.children && updatedItem.children.length > 0) {
            updatedItem.children = updatedItem.children.map(child => updateDepthRecursive(child, newBaseDepth + 1));
        }
        return updatedItem;
    }
    const branchWithCorrectedDepth = updateDepthRecursive(removedItemBranch, projected.depth);

    const finalTreeWithAddedItem = addItemToTree(treeWithoutActive, branchWithCorrectedDepth, projected.parentId, projected.index);
    const normalizedFinalTree = normalizeTree(finalTreeWithAddedItem);

    setHierarchicalItems(normalizedFinalTree); 

    const itemsToUpdateDb = flattenTree(normalizedFinalTree).map(item => ({
      id: item.id,
      order: item.order,
      parent_id: item.parent_id ?? null, // Coalesce undefined to null
    }));

    startTransition(async () => {
      try {
        const result = await updateNavigationStructureBatch(itemsToUpdateDb);
        if (result?.error) {
          console.error("Failed to update navigation structure:", result.error);
          setHierarchicalItems(originalTree);
        }
      } catch (error) {
        console.error("Exception during navigation update:", error);
        setHierarchicalItems(originalTree);
      }
    });
    setProjected(null);
  }, [projected, hierarchicalItems, startTransition]);


  const _handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    setProjected(null);
  };


  const renderItemsRecursive = (itemsToRender: HierarchicalNavItem[]): (JSX.Element | null)[] => {
    return itemsToRender.map((item) => {
      if (!item) return null;
      
      const itemInfo = findItemDeep(hierarchicalItems, item.id); // Get fresh info for index calculation

      // Condition 1: Projected to be the SIBLING AFTER this item
      const isProjectedSiblingAfterThis = projected &&
        activeId && activeId !== item.id &&
        projected.overId === item.id && // 'item' is what we are hovering/dragging past
        projected.parentId === (item.parent_id ?? null) && // Target parent is this item's parent
        itemInfo && projected.index === itemInfo.index + 1; // Target index is right after this item

      // Condition 2: Projected to be the FIRST CHILD of this item
      // This is for non-indent specific drops (e.g. from getProjectedDropPosition)
      const isProjectedAsFirstChildOfThis = projected &&
        activeId && activeId !== item.id &&
        projected.parentId === item.id && // This item is the target parent
        projected.index === 0 &&
        // Ensure this isn't the pure indent case where item has no children (which is handled by LastChildIndent)
        !(projected.overId === item.id && item.children.length === 0 && projected.index === 0);


      // Condition 3: Projected to be the LAST CHILD of this item (specifically for pure horizontal indent)
      // This is when 'item' is the 'itemAbove' from the indent logic, which becomes the parent.
      const isProjectedAsLastChildOfThisIndent = projected &&
        activeId && activeId !== item.id &&
        projected.parentId === item.id && // This item is the target parent
        projected.overId === item.id &&    // Crucially, the 'overId' points to this item (from pure indent logic)
        projected.index === item.children.length; // Target index is at the end of current children

      return (
        <React.Fragment key={item.id}>
          <SortableNavItem item={item} />

          {/* Render projection line if it's a SIBLING AFTER this, OR if it's the FIRST CHILD of this (non-indent case) */}
          {/* This line appears directly under 'item', before its children are rendered. */}
          {(isProjectedSiblingAfterThis || isProjectedAsFirstChildOfThis) && (
             <TableRow style={{opacity: 0.5}} className="pointer-events-none !p-0 h-1">
                <TableCell style={{ paddingLeft: `${projected.depth * INDENTATION_WIDTH + 16}px`, height: '2px' }} className="py-0 border-none">
                    <div className="bg-primary h-0.5 w-full rounded-full"></div>
                </TableCell>
                <TableCell colSpan={5} className="py-0 border-none h-1"><div className="bg-primary h-0.5 w-full rounded-full"></div></TableCell>
             </TableRow>
          )}

          {item.children && item.children.length > 0 && renderItemsRecursive(item.children)}

          {/* Render projection line if it's the LAST CHILD of this (due to indent) */}
          {/* This line appears after all of 'item's children, effectively at the bottom of 'item's group. */}
          {isProjectedAsLastChildOfThisIndent && (
             <TableRow style={{opacity: 0.5}} className="pointer-events-none !p-0 h-1">
                <TableCell style={{ paddingLeft: `${projected.depth * INDENTATION_WIDTH + 16}px`, height: '2px' }} className="py-0 border-none">
                    <div className="bg-primary h-0.5 w-full rounded-full"></div>
                </TableCell>
                <TableCell colSpan={5} className="py-0 border-none h-1"><div className="bg-primary h-0.5 w-full rounded-full"></div></TableCell>
             </TableRow>
          )}
        </React.Fragment>
      );
    });
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: '0.4' } },
    }),
  };

  if (!isMounted) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter} // Consider other strategies if needed for precise boundary detection
      onDragStart={_handleDragStart}
      onDragEnd={handleDragEnd}
      onDragMove={onDragMove}
      onDragOver={onDragMove} // Use onDragOver as well if move isn't frequent enough
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
    >
      <SortableContext items={flatItemIds} strategy={verticalListSortingStrategy}>
        <div className="rounded-lg border overflow-hidden dark:border-slate-700">
          <Table>
            <TableHeader>
              <TableRow className="dark:border-slate-700">
                <TableHead className="w-[250px] sm:w-[350px] py-2.5">Label</TableHead>
                <TableHead className="py-2.5">URL</TableHead>
                <TableHead className="py-2.5">Order</TableHead>
                <TableHead className="py-2.5">Parent</TableHead>
                <TableHead className="py-2.5">Linked Page</TableHead>
                <TableHead className="text-right w-[80px] py-2.5">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderItemsRecursive(hierarchicalItems)}
               {projected && projected.parentId === null && activeId && projected.index === hierarchicalItems.filter(i=>i.parent_id === null).length && (
                 <TableRow style={{opacity: 0.5}} className="pointer-events-none !p-0 h-1">
                    <TableCell style={{ paddingLeft: `${projected.depth * INDENTATION_WIDTH + 16}px`, height: '2px' }} className="py-0 border-none">
                        <div className="bg-primary h-0.5 w-full rounded-full"></div>
                    </TableCell>
                    <TableCell colSpan={5} className="py-0 border-none h-1"><div className="bg-primary h-0.5 w-full rounded-full"></div></TableCell>
                 </TableRow>
               )}
            </TableBody>
          </Table>
        </div>
        {typeof document !== 'undefined' && createPortal(
            <DragOverlay dropAnimation={dropAnimation} zIndex={1000}>
            {activeId && activeItemDataForOverlay?.item ? (
                <Table className="shadow-xl opacity-100 bg-card w-full">
                <TableBody>
                    <TableRow className="bg-card hover:bg-card">
                    <TableCell style={{ paddingLeft: `${(projected?.depth ?? activeItemDataForOverlay.item.depth) * INDENTATION_WIDTH + 16}px` }} className="py-2">
                        <div className="flex items-center">
                        <Button variant="ghost" size="sm" className="cursor-grabbing mr-2 p-1 opacity-50"><GripVertical className="h-4 w-4 text-muted-foreground" /></Button>
                        <span className="font-medium">{activeItemDataForOverlay.item.label}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate py-2" title={activeItemDataForOverlay.item.url}>{activeItemDataForOverlay.item.url}</TableCell>
                    <TableCell className="py-2"><Badge variant="outline">{activeItemDataForOverlay.item.order}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2">{activeItemDataForOverlay.parent?.label || 'None'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2">{activeItemDataForOverlay.item.pageSlug ? `/${activeItemDataForOverlay.item.pageSlug}` : 'Manual URL'}</TableCell>
                    <TableCell className="text-right py-2"> <MoreHorizontal className="h-4 w-4 text-muted-foreground opacity-50" /> </TableCell>
                    </TableRow>
                </TableBody>
                </Table>
            ) : null}
            </DragOverlay>,
            document.body
        )}
      </SortableContext>
    </DndContext>
  );
}
