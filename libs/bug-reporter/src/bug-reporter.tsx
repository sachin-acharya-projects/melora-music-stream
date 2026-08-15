import { useEffect, useRef, useState } from "react"
import type * as React from "react"
import { createPortal } from "react-dom"
import { ScreenshotAnnotator, type ScreenshotAnnotatorHandle } from "./annotator"
import { capturePage } from "./capture"
import { BugReporterClient } from "./client"
import type { BugReporterConfig, SeverityOption } from "./config"
import { DEFAULT_SEVERITY_OPTIONS } from "./config"
import { COLORS, RADIUS, Z_INDEX } from "./styles"
import type { BugReport, BugReportSeverity } from "./types"

interface BugReporterProps {
    config: BugReporterConfig
}

interface ScreenshotState {
    dataUrl: string
    blob: Blob
}

type Step = "capture" | "annotate" | "describe" | "done"

function BugIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M12 3a5 5 0 0 0-5 5v5a5 5 0 0 0 10 0V8a5 5 0 0 0-5-5Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
            />
            <path
                d="M7 10H4m16 0h-3M7 16l-2.5 2.5M17 16l2.5 2.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path d="M12 13v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

function Spinner() {
    return (
        <span
            className="br-spin"
            style={{
                display: "inline-block",
                width: 22,
                height: 22,
                borderRadius: 999,
                border: `3px solid ${COLORS.border}`,
                borderTopColor: COLORS.primary,
            }}
        />
    )
}

export function BugReporter({ config }: BugReporterProps) {
    const severityOptions: SeverityOption[] =
        config.severityOptions?.length ? config.severityOptions : DEFAULT_SEVERITY_OPTIONS

    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<Step>("capture")
    const [capturing, setCapturing] = useState(false)
    const [captureError, setCaptureError] = useState<string | null>(null)
    const [screenshot, setScreenshot] = useState<ScreenshotState | null>(null)
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [severity, setSeverity] = useState<BugReportSeverity>(severityOptions[0].value)
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [submittedReport, setSubmittedReport] = useState<BugReport | null>(null)
    const annotatorRef = useRef<ScreenshotAnnotatorHandle>(null)
    const clientRef = useRef<BugReporterClient | null>(null)

    if (!clientRef.current) {
        clientRef.current = new BugReporterClient(config)
    }

    const runCapture = async () => {
        setCapturing(true)
        setCaptureError(null)
        try {
            setScreenshot(await capturePage())
        } catch {
            setCaptureError(
                "Could not capture the screen. Try scrolling to the top of the page and reopening the reporter.",
            )
        } finally {
            setCapturing(false)
        }
    }

    const openReporter = () => {
        setOpen(true)
        setStep("capture")
        setTitle("")
        setDescription("")
        setSubmitError(null)
        setSubmittedReport(null)
        setSeverity(severityOptions[0].value)
        void runCapture()
    }

    const closeReporter = () => {
        setOpen(false)
        setStep("capture")
        setScreenshot(null)
    }

    useEffect(() => {
        if (!open) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") closeReporter()
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [open])

    const handleAnnotateNext = async () => {
        if (!screenshot) return
        const dataUrl = await annotatorRef.current!.exportAnnotated()
        const blob = await (await fetch(dataUrl)).blob()
        setScreenshot({ dataUrl, blob })
        setStep("describe")
    }

    const handleSubmit = async () => {
        if (!clientRef.current) return
        setSubmitting(true)
        setSubmitError(null)
        try {
            const report = await clientRef.current.createReport({
                title,
                description,
                severity,
                screenshot: screenshot?.blob ?? null,
            })
            setSubmittedReport(report)
            setStep("done")
            config.onSubmitted?.(report)
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : "Could not submit the bug report.")
        } finally {
            setSubmitting(false)
        }
    }

    const primaryDisabled = step === "describe" && (!title.trim() || title.trim().length < 3)

    return (
        <>
            <button
                type="button"
                onClick={openReporter}
                title="Report a bug"
                aria-label="Report a bug"
                data-br-widget=""
                style={{
                    position: "fixed",
                    left: 24,
                    right: "auto",
                    bottom: "calc(env(safe-area-inset-bottom) + 96px)",
                    zIndex: Z_INDEX,
                    width: 48,
                    height: 48,
                    borderRadius: 999,
                    border: "none",
                    background: COLORS.primary,
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 6px 20px rgba(239, 68, 68, 0.45)",
                }}
            >
                <BugIcon />
            </button>

            {open &&
                createPortal(
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Report a bug"
                        data-br-widget=""
                        onClick={(e) => {
                            if (e.target === e.currentTarget) closeReporter()
                        }}
                        style={{
                            position: "fixed",
                            inset: 0,
                            zIndex: Z_INDEX,
                            background: "rgba(0, 0, 0, 0.5)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 16,
                        }}
                    >
                        <style>{`.br-spin{animation:br-spin 0.8s linear infinite}@keyframes br-spin{to{transform:rotate(360deg)}}`}</style>
                        <div
                            style={{
                                width: "100%",
                                maxWidth: 720,
                                maxHeight: "92vh",
                                overflowY: "auto",
                                background: COLORS.bg,
                                color: COLORS.text,
                                borderRadius: 16,
                                boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
                                display: "flex",
                                flexDirection: "column",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: "16px 20px",
                                    borderBottom: `1px solid ${COLORS.border}`,
                                }}
                            >
                                <div
                                    style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 999,
                                        background: COLORS.primary,
                                        color: "#ffffff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <BugIcon />
                                </div>
                                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, flex: 1 }}>
                                    Report a bug
                                </h2>
                                <button
                                    type="button"
                                    onClick={closeReporter}
                                    aria-label="Close"
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 999,
                                        border: "none",
                                        background: COLORS.bgMuted,
                                        color: COLORS.textMuted,
                                        fontSize: 18,
                                        lineHeight: 1,
                                        cursor: "pointer",
                                    }}
                                >
                                    ×
                                </button>
                            </div>

                            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                                {step === "capture" && (
                                    <CaptureStep
                                        capturing={capturing}
                                        error={captureError}
                                        screenshot={screenshot}
                                        onRecapture={() => void runCapture()}
                                    />
                                )}

                                {step === "annotate" && screenshot && (
                                    <ScreenshotAnnotator ref={annotatorRef} imageSrc={screenshot.dataUrl} />
                                )}

                                {step === "describe" && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                        <Field label="Title">
                                            <input
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder="What went wrong?"
                                                maxLength={200}
                                                style={inputStyle}
                                            />
                                        </Field>
                                        <Field label="Description">
                                            <textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Steps to reproduce, expected vs actual behavior…"
                                                rows={5}
                                                maxLength={5000}
                                                style={{ ...inputStyle, resize: "vertical", minHeight: 110, fontFamily: "inherit" }}
                                            />
                                        </Field>
                                        <Field label="Severity">
                                            <select
                                                value={severity}
                                                onChange={(e) => setSeverity(e.target.value as BugReportSeverity)}
                                                style={inputStyle}
                                            >
                                                {severityOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>
                                        {screenshot && (
                                            <div
                                                style={{
                                                    maxHeight: 140,
                                                    overflow: "hidden",
                                                    borderRadius: RADIUS,
                                                    border: `1px solid ${COLORS.border}`,
                                                }}
                                            >
                                                <img
                                                    src={screenshot.dataUrl}
                                                    alt="Screenshot preview"
                                                    style={{ width: "100%", display: "block" }}
                                                />
                                            </div>
                                        )}
                                        {submitError && <ErrorBanner message={submitError} />}
                                    </div>
                                )}

                                {step === "done" && (
                                    <div style={{ textAlign: "center", padding: "12px 0" }}>
                                        <div
                                            style={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: 999,
                                                background: "#dcfce7",
                                                color: COLORS.success,
                                                fontSize: 28,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                margin: "0 auto 14px",
                                            }}
                                        >
                                            ✓
                                        </div>
                                        <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700 }}>
                                            Thanks for reporting!
                                        </h3>
                                        <p style={{ margin: 0, color: COLORS.textMuted, fontSize: 14 }}>
                                            {submittedReport?.title ?? "Your report"}
                                            {" was submitted and is now pending review."}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    gap: 10,
                                    padding: "14px 20px",
                                    borderTop: `1px solid ${COLORS.border}`,
                                }}
                            >
                                {step !== "done" && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (step === "capture") closeReporter()
                                            if (step === "annotate") setStep("capture")
                                            if (step === "describe") setStep("annotate")
                                        }}
                                        style={secondaryButtonStyle}
                                    >
                                        {step === "capture" ? "Cancel" : "Back"}
                                    </button>
                                )}
                                {step === "done" && (
                                    <button type="button" onClick={closeReporter} style={primaryButtonStyle}>
                                        Close
                                    </button>
                                )}
                                {step === "capture" && (
                                    <button
                                        type="button"
                                        onClick={() => setStep("annotate")}
                                        disabled={!screenshot}
                                        style={{ ...primaryButtonStyle, opacity: screenshot ? 1 : 0.5 }}
                                    >
                                        Next: Annotate
                                    </button>
                                )}
                                {step === "annotate" && (
                                    <button type="button" onClick={() => void handleAnnotateNext()} style={primaryButtonStyle}>
                                        Next: Describe
                                    </button>
                                )}
                                {step === "describe" && (
                                    <button
                                        type="button"
                                        onClick={() => void handleSubmit()}
                                        disabled={primaryDisabled || submitting}
                                        style={{
                                            ...primaryButtonStyle,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 8,
                                            opacity: primaryDisabled || submitting ? 0.5 : 1,
                                        }}
                                    >
                                        {submitting && <Spinner />}
                                        {submitting ? "Submitting…" : "Submit report"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    )
}

function CaptureStep({
    capturing,
    error,
    screenshot,
    onRecapture,
}: {
    capturing: boolean
    error: string | null
    screenshot: ScreenshotState | null
    onRecapture: () => void
}) {
    if (capturing) {
        return (
            <div
                style={{
                    height: 220,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    color: COLORS.textMuted,
                }}
            >
                <Spinner />
                Capturing your screen…
            </div>
        )
    }
    if (error) {
        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                    padding: "24px 0",
                    color: COLORS.textMuted,
                }}
            >
                <span>⚠️</span>
                <p style={{ margin: 0, textAlign: "center", fontSize: 14 }}>{error}</p>
                <button type="button" onClick={onRecapture} style={primaryButtonStyle}>
                    Try again
                </button>
            </div>
        )
    }
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <img
                src={screenshot?.dataUrl}
                alt="Screen capture"
                style={{
                    maxHeight: "52vh",
                    width: "100%",
                    objectFit: "contain",
                    borderRadius: RADIUS,
                    border: `1px solid ${COLORS.border}`,
                }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ margin: 0, color: COLORS.textMuted, fontSize: 13 }}>
                    Add arrows, boxes, text or freehand marks in the next step.
                </p>
                <button type="button" onClick={onRecapture} style={secondaryButtonStyle}>
                    Recapture
                </button>
            </div>
        </div>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
            {children}
        </label>
    )
}

function ErrorBanner({ message }: { message: string }) {
    return (
        <div
            style={{
                padding: "10px 12px",
                borderRadius: RADIUS,
                background: "#fef2f2",
                border: `1px solid #fecaca`,
                color: COLORS.danger,
                fontSize: 13,
            }}
        >
            {message}
        </div>
    )
}

const inputStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: RADIUS,
    border: `1px solid ${COLORS.border}`,
    background: COLORS.bg,
    color: COLORS.text,
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
}

const primaryButtonStyle: React.CSSProperties = {
    padding: "10px 18px",
    borderRadius: RADIUS,
    border: "none",
    background: COLORS.primary,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
}

const secondaryButtonStyle: React.CSSProperties = {
    padding: "10px 18px",
    borderRadius: RADIUS,
    border: `1px solid ${COLORS.border}`,
    background: COLORS.bg,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
}
