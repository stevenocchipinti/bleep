import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DndContextProps,
} from "@dnd-kit/core"
import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from "@dnd-kit/modifiers"
import {
  SortableContext,
  SortableContextProps,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"

type CustomDndContextProps = Pick<
  DndContextProps,
  "onDragStart" | "onDragEnd"
> &
  Pick<SortableContextProps, "items" | "children">

const CustomDndContext = ({
  onDragStart,
  onDragEnd,
  children,
  items,
}: CustomDndContextProps) => {
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  )

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

export default CustomDndContext
