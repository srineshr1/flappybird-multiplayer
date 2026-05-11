import React, { useRef, useState, useCallback } from 'react'
import { useStore } from '../store'
import EditorGroup from './EditorGroup'

function GroupResizeHandle({
  leftId,
  rightId,
  containerRef,
  flexValues,
  setFlexValues,
}: {
  leftId: string
  rightId: string
  containerRef: React.RefObject<HTMLDivElement | null>
  flexValues: Record<string, number>
  setFlexValues: (v: Record<string, number>) => void
}) {
  const dragging = useRef(false)

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      const startX = e.clientX
      const startLeft = flexValues[leftId] ?? 1
      const startRight = flexValues[rightId] ?? 1
      const containerWidth = containerRef.current?.clientWidth ?? 800
      const totalFlex = Object.values(flexValues).reduce((s, v) => s + v, 0) || 2
      const flexPerPx = totalFlex / containerWidth

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return
        const flexDelta = (ev.clientX - startX) * flexPerPx
        setFlexValues({
          ...flexValues,
          [leftId]: Math.max(0.15, startLeft + flexDelta),
          [rightId]: Math.max(0.15, startRight - flexDelta),
        })
      }

      const onMouseUp = () => {
        dragging.current = false
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [leftId, rightId, flexValues, setFlexValues, containerRef]
  )

  return <div className="resize-handle resize-horizontal" onMouseDown={onMouseDown} />
}

export default function EditorArea() {
  const editorGroups = useStore((s) => s.editorGroups)
  const containerRef = useRef<HTMLDivElement>(null)
  const [flexValues, setFlexValues] = useState<Record<string, number>>({})

  const getFlex = (groupId: string) => flexValues[groupId] ?? 1

  const elements: React.ReactNode[] = []
  editorGroups.forEach((group, i) => {
    elements.push(
      <div key={group.id} className="editor-group-wrapper" style={{ flex: getFlex(group.id) }}>
        <EditorGroup groupId={group.id} />
      </div>
    )
    if (i < editorGroups.length - 1) {
      elements.push(
        <GroupResizeHandle
          key={`resize-${group.id}`}
          leftId={group.id}
          rightId={editorGroups[i + 1].id}
          containerRef={containerRef}
          flexValues={flexValues}
          setFlexValues={setFlexValues}
        />
      )
    }
  })

  return (
    <div ref={containerRef} className="editor-area">
      {elements}
    </div>
  )
}
