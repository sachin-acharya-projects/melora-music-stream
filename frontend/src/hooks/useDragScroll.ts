import { useEffect, useRef, useState } from "react"
import type {
    DragEvent as ReactDragEvent,
    MouseEvent as ReactMouseEvent,
    PointerEvent as ReactPointerEvent,
} from "react"

interface DragState {
    isDragging: boolean
    pointerId: number
    startX: number
    startScrollLeft: number
    moved: boolean
    captured: boolean
    lastX: number
    lastTime: number
    velocity: number
    frameId: number | null
}

const DRAG_THRESHOLD = 4

export function useDragScroll<T extends HTMLElement>() {
    const ref = useRef<T>(null)
    const state = useRef<DragState>({
        isDragging: false,
        pointerId: -1,
        startX: 0,
        startScrollLeft: 0,
        moved: false,
        captured: false,
        lastX: 0,
        lastTime: 0,
        velocity: 0,
        frameId: null,
    })
    const [isDragging, setIsDragging] = useState(false)

    const stopMomentum = () => {
        const s = state.current
        if (s.frameId !== null) {
            cancelAnimationFrame(s.frameId)
            s.frameId = null
        }
    }

    const startMomentum = () => {
        const el = ref.current
        const s = state.current
        if (!el) return

        const step = () => {
            s.velocity *= 0.94
            el.scrollLeft += s.velocity * 16
            if (Math.abs(s.velocity * 16) > 0.4) {
                s.frameId = requestAnimationFrame(step)
            } else {
                s.frameId = null
            }
        }
        s.frameId = requestAnimationFrame(step)
    }

    const endDrag = () => {
        const el = ref.current
        const s = state.current
        if (!s.isDragging) return

        s.isDragging = false
        setIsDragging(false)
        if (el && s.captured) {
            try {
                el.releasePointerCapture(s.pointerId)
            } catch {
                // pointer may already be released
            }
            s.captured = false
        }
        if (Math.abs(s.velocity) > 0.1) startMomentum()
    }

    const onPointerDown = (e: ReactPointerEvent<T>) => {
        if (e.pointerType !== "mouse" || e.button !== 0) return
        const el = ref.current
        if (!el) return

        stopMomentum()
        const s = state.current
        s.isDragging = true
        s.pointerId = e.pointerId
        s.startX = e.clientX
        s.startScrollLeft = el.scrollLeft
        s.moved = false
        s.captured = false
        s.lastX = el.scrollLeft
        s.lastTime = performance.now()
        s.velocity = 0
    }

    const onPointerMove = (e: ReactPointerEvent<T>) => {
        const el = ref.current
        const s = state.current
        if (!el || !s.isDragging || e.pointerId !== s.pointerId) return

        const dx = e.clientX - s.startX
        if (Math.abs(dx) > DRAG_THRESHOLD) {
            s.moved = true
            if (!s.captured) {
                el.setPointerCapture(e.pointerId)
                s.captured = true
                setIsDragging(true)
            }
        }
        el.scrollLeft = s.startScrollLeft - dx

        const now = performance.now()
        const dt = now - s.lastTime
        if (dt > 0) {
            s.velocity = s.velocity * 0.85 + ((el.scrollLeft - s.lastX) / dt) * 0.15
            s.lastX = el.scrollLeft
            s.lastTime = now
        }
        e.preventDefault()
    }

    const onClickCapture = (e: ReactMouseEvent<T>) => {
        if (state.current.moved) {
            e.stopPropagation()
            e.preventDefault()
        }
    }

    useEffect(
        () => () => {
            stopMomentum()
        },
        [],
    )

    return {
        ref,
        isDragging,
        handlers: {
            onPointerDown,
            onPointerMove,
            onPointerUp: endDrag,
            onPointerCancel: endDrag,
            onClickCapture,
            onDragStart: (e: ReactDragEvent<T>) => {
                e.preventDefault()
            },
        },
    }
}
