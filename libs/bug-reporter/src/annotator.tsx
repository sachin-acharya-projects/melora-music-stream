import { useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import type * as React from "react"
import { ANNOTATION_COLORS, COLORS, RADIUS } from "./styles"

type Tool = "rect" | "arrow" | "freehand" | "text"

interface Point {
    x: number
    y: number
}

interface RectShape {
    kind: "rect"
    x1: number
    y1: number
    x2: number
    y2: number
    color: string
}

interface ArrowShape {
    kind: "arrow"
    x1: number
    y1: number
    x2: number
    y2: number
    color: string
}

interface FreehandShape {
    kind: "freehand"
    points: Point[]
    color: string
}

interface TextShape {
    kind: "text"
    x: number
    y: number
    text: string
    color: string
}

type Shape = RectShape | ArrowShape | FreehandShape | TextShape

export interface ScreenshotAnnotatorHandle {
    exportAnnotated: () => Promise<string>
    hasAnnotations: boolean
}

interface AnnotatorProps {
    imageSrc: string
    ref: React.Ref<ScreenshotAnnotatorHandle>
}

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

function rectAttributes(s: RectShape): string {
    const x = Math.min(s.x1, s.x2)
    const y = Math.min(s.y1, s.y2)
    const width = Math.abs(s.x2 - s.x1)
    const height = Math.abs(s.y2 - s.y1)
    return ` x="${x}" y="${y}" width="${width}" height="${height}"`
}

function arrowHead(s: ArrowShape): string {
    const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1)
    const len = 20
    const p1x = s.x2 - len * Math.cos(angle - Math.PI / 6)
    const p1y = s.y2 - len * Math.sin(angle - Math.PI / 6)
    const p2x = s.x2 - len * Math.cos(angle + Math.PI / 6)
    const p2y = s.y2 - len * Math.sin(angle + Math.PI / 6)
    return `${s.x2},${s.y2} ${p1x},${p1y} ${p2x},${p2y}`
}

function pointsToSvg(points: Point[]): string {
    return points.map((p) => `${p.x},${p.y}`).join(" ")
}

function textSvg(s: TextShape, unit: number): string {
    const fontSize = 44 * unit
    const y = s.y + fontSize
    return (
        `<text x="${s.x}" y="${y}" fill="${s.color}" font-family="${FONT}" ` +
        `font-size="${fontSize}" font-weight="600" paint-order="stroke" stroke="#ffffff" stroke-width="${5 * unit}" ` +
        `stroke-linejoin="round">${escapeXml(s.text)}</text>`
    )
}

function shapeToSvg(s: Shape, unit: number): string {
    switch (s.kind) {
        case "rect":
            return (
                `<rect${rectAttributes(s)} fill="none" stroke="${s.color}" ` +
                `stroke-width="${3.5 * unit}" stroke-linejoin="round" />`
            )
        case "arrow":
            return (
                `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${s.color}" ` +
                `stroke-width="${3.5 * unit}" stroke-linecap="round" />` +
                `<polygon points="${arrowHead(s)}" fill="${s.color}" />`
            )
        case "freehand":
            return (
                `<polyline points="${pointsToSvg(s.points)}" fill="none" stroke="${s.color}" ` +
                `stroke-width="${3.5 * unit}" stroke-linecap="round" stroke-linejoin="round" />`
            )
        case "text":
            return textSvg(s, unit)
    }
}

const TOOLS: { id: Tool; label: string; icon: React.ReactNode }[] = [
    {
        id: "rect",
        label: "Rectangle",
        icon: (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1.5" y="1.5" width="11" height="11" stroke="currentColor" strokeWidth="2" />
            </svg>
        ),
    },
    {
        id: "arrow",
        label: "Arrow",
        icon: (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <line x1="2" y1="12" x2="11" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M11 3 H6.5 M11 3 V7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
    {
        id: "freehand",
        label: "Freehand",
        icon: (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 12 C4 3 9 2 12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        id: "text",
        label: "Text",
        icon: (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <text x="2" y="12" fill="currentColor" fontSize="12" fontFamily="sans-serif" fontWeight="700">
                    A
                </text>
            </svg>
        ),
    },
]

export function ScreenshotAnnotator({ imageSrc, ref }: AnnotatorProps) {
    const [dims, setDims] = useState<Point | null>(null)
    const [tool, setTool] = useState<Tool>("rect")
    const [color, setColor] = useState<string>(ANNOTATION_COLORS[0])
    const [shapes, setShapes] = useState<Shape[]>([])
    const [draft, setDraft] = useState<Shape | null>(null)
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [textDraft, setTextDraft] = useState("")
    const stageRef = useRef<HTMLDivElement>(null)
    const textAreaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        const image = new Image()
        image.onload = () => {
            setDims({ x: image.naturalWidth, y: image.naturalHeight })
        }
        image.src = imageSrc
    }, [imageSrc])

    const viewport = useMemo(
        () => ({
            width: Math.min(window.innerWidth - 64, 880),
            height: Math.min(window.innerHeight - 280, 560),
        }),
        [],
    )

    const scale = dims ? Math.min(viewport.width / dims.x, viewport.height / dims.y, 1) : 1
    const displayWidth = dims ? Math.round(dims.x * scale) : 0
    const displayHeight = dims ? Math.round(dims.y * scale) : 0
    // viewBox units map to 1/scale screen pixels, so multiply stroke/font
    // sizes by this to keep them visually constant at any zoom.
    const unit = 1 / scale

    const toShapePoint = (event: React.PointerEvent): Point => {
        const rect = stageRef.current!.getBoundingClientRect()
        return {
            x: ((event.clientX - rect.left) / rect.width) * dims!.x,
            y: ((event.clientY - rect.top) / rect.height) * dims!.y,
        }
    }

    const toDisplayPoint = (point: Point): Point => ({
        x: (point.x / dims!.x) * displayWidth,
        y: (point.y / dims!.y) * displayHeight,
    })

    const handlePointerDown = (event: React.PointerEvent) => {
        if (!dims) return
        const point = toShapePoint(event)
        if (tool === "text") {
            setShapes((prev) => [...prev, { kind: "text", x: point.x, y: point.y, text: "", color }])
            setEditingIndex(shapes.length)
            setTextDraft("")
            return
        }
        setDraft(
            tool === "freehand"
                ? { kind: "freehand", points: [point], color }
                : tool === "arrow"
                  ? { kind: "arrow", x1: point.x, y1: point.y, x2: point.x, y2: point.y, color }
                  : { kind: "rect", x1: point.x, y1: point.y, x2: point.x, y2: point.y, color },
        )
    }

    const handlePointerMove = (event: React.PointerEvent) => {
        if (!dims || !draft) return
        const point = toShapePoint(event)
        setDraft((current) => {
            if (!current) return current
            if (current.kind === "freehand") {
                return { ...current, points: [...current.points, point] }
            }
            if (current.kind === "rect" || current.kind === "arrow") {
                return { ...current, x2: point.x, y2: point.y }
            }
            return current
        })
    }

    const handlePointerUp = () => {
        if (!draft) return
        setShapes((prev) => (draft ? [...prev, draft] : prev))
        setDraft(null)
    }

    useEffect(() => {
        if (editingIndex !== null) {
            textAreaRef.current?.focus()
        }
    }, [editingIndex])

    const commitText = () => {
        if (editingIndex === null) return
        setShapes((prev) => {
            const next = [...prev]
            const current = next[editingIndex]
            if (current?.kind === "text" && textDraft.trim()) {
                next[editingIndex] = { ...current, text: textDraft }
            } else if (current?.kind === "text") {
                next.splice(editingIndex, 1)
            }
            return next
        })
        setEditingIndex(null)
    }

    const undo = () => setShapes((prev) => prev.slice(0, -1))
    const clear = () => setShapes([])

    useImperativeHandle(
        ref,
        () => ({
            async exportAnnotated(): Promise<string> {
                if (!dims) throw new Error("Screenshot not ready")
                const overlay =
                    `<svg xmlns="http://www.w3.org/2000/svg" width="${dims.x}" height="${dims.y}" ` +
                    `viewBox="0 0 ${dims.x} ${dims.y}">` +
                    shapes.map((s) => shapeToSvg(s, unit)).join("") +
                    "</svg>"
                const overlayImage = new Image()
                overlayImage.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(overlay)
                await overlayImage.decode()
                const baseImage = new Image()
                baseImage.src = imageSrc
                await baseImage.decode()
                const canvas = document.createElement("canvas")
                canvas.width = dims.x
                canvas.height = dims.y
                const context = canvas.getContext("2d")
                if (!context) throw new Error("Could not create a 2D canvas context")
                context.drawImage(baseImage, 0, 0)
                context.drawImage(overlayImage, 0, 0)
                return canvas.toDataURL("image/png")
            },
            hasAnnotations: shapes.length > 0,
        }),
        [dims, imageSrc, shapes, unit],
    )

    const editingShape =
        editingIndex !== null && shapes[editingIndex]?.kind === "text"
            ? (shapes[editingIndex] as TextShape)
            : null

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: 8,
                    background: COLORS.bgMuted,
                    borderRadius: RADIUS,
                    flexWrap: "wrap",
                }}
            >
                {TOOLS.map((t) => {
                    const active = tool === t.id
                    return (
                        <button
                            key={t.id}
                            type="button"
                            title={t.label}
                            aria-label={t.label}
                            onClick={() => setTool(t.id)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                border: `1px solid ${active ? COLORS.primary : COLORS.border}`,
                                background: active ? COLORS.primary : COLORS.bg,
                                color: active ? "#ffffff" : COLORS.text,
                                cursor: "pointer",
                            }}
                        >
                            {t.icon}
                        </button>
                    )
                })}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
                    {ANNOTATION_COLORS.map((c) => (
                        <button
                            key={c}
                            type="button"
                            aria-label={`Color ${c}`}
                            onClick={() => setColor(c)}
                            style={{
                                width: 22,
                                height: 22,
                                borderRadius: 999,
                                background: c,
                                border: color === c ? `3px solid ${COLORS.text}` : `1px solid ${COLORS.border}`,
                                cursor: "pointer",
                                padding: 0,
                            }}
                        />
                    ))}
                </div>
                <div style={{ flex: 1 }} />
                <button
                    type="button"
                    onClick={undo}
                    disabled={shapes.length === 0}
                    style={{
                        ...toolbarButtonStyle,
                        opacity: shapes.length === 0 ? 0.4 : 1,
                    }}
                >
                    Undo
                </button>
                <button
                    type="button"
                    onClick={clear}
                    disabled={shapes.length === 0}
                    style={{
                        ...toolbarButtonStyle,
                        opacity: shapes.length === 0 ? 0.4 : 1,
                    }}
                >
                    Clear
                </button>
            </div>

            {!dims ? (
                <div
                    style={{
                        height: 260,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: COLORS.textMuted,
                        background: COLORS.bgMuted,
                        borderRadius: RADIUS,
                    }}
                >
                    Preparing screenshot…
                </div>
            ) : (
                <div
                    ref={stageRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    style={{
                        position: "relative",
                        width: displayWidth,
                        height: displayHeight,
                        maxWidth: "100%",
                        overflow: "hidden",
                        borderRadius: RADIUS,
                        border: `1px solid ${COLORS.border}`,
                        touchAction: "none",
                        cursor: tool === "text" ? "text" : "crosshair",
                        alignSelf: "center",
                    }}
                >
                    <img
                        src={imageSrc}
                        alt="Screenshot"
                        draggable={false}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                    />
                    <svg
                        viewBox={`0 0 ${dims.x} ${dims.y}`}
                        width={displayWidth}
                        height={displayHeight}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                    >
                        {shapes.map((shape, index) => (
                            <g key={index} dangerouslySetInnerHTML={{ __html: shapeToSvg(shape, unit) }} />
                        ))}
                        {draft && <g dangerouslySetInnerHTML={{ __html: shapeToSvg(draft, unit) }} />}
                    </svg>
                    {editingShape && (
                        <textarea
                            ref={textAreaRef}
                            value={textDraft}
                            onChange={(e) => setTextDraft(e.target.value)}
                            onBlur={commitText}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault()
                                    commitText()
                                }
                                if (e.key === "Escape") {
                                    commitText()
                                }
                            }}
                            placeholder="Add text…"
                            style={{
                                position: "absolute",
                                left: toDisplayPoint({ x: editingShape.x, y: editingShape.y }).x,
                                top: toDisplayPoint({ x: editingShape.x, y: editingShape.y }).y,
                                width: 180,
                                minHeight: 40,
                                padding: "4px 8px",
                                fontFamily: FONT,
                                fontSize: 16,
                                color: editingShape.color,
                                background: "#ffffff",
                                border: `2px solid ${editingShape.color}`,
                                borderRadius: 6,
                                outline: "none",
                                resize: "none",
                                boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
                            }}
                        />
                    )}
                </div>
            )}
        </div>
    )
}

const toolbarButtonStyle: React.CSSProperties = {
    padding: "6px 12px",
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    background: COLORS.bg,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
}
