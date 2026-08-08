import { useEffect, useRef } from "react"

const NOTE_CHARS = ["♪", "♫", "♬", "♩", "♭"]
const LAYERS = [
    { amp: 80, freq: 0.006, speed: 120, color: "rgba(239,68,68,0.10)", offset: 0, harmonic: 0.003 },
    { amp: 110, freq: 0.004, speed: 80, color: "rgba(239,68,68,0.07)", offset: 2, harmonic: 0.005 },
    {
        amp: 140,
        freq: 0.005,
        speed: 100,
        color: "rgba(239,68,68,0.05)",
        offset: 4,
        harmonic: 0.002,
    },
]

interface Note {
    x: number
    y: number
    vy: number
    vx: number
    char: string
    size: number
    opacity: number
    life: number
    rotation: number
    rotSpeed: number
}

function getWaveY(x: number, w: number, h: number, time: number): number {
    const cy = h * 0.55
    let total = 0
    for (const layer of LAYERS) {
        const primary = Math.sin((x + time * layer.speed) * layer.freq + layer.offset)
        const harmonic = Math.sin(
            (x + time * layer.speed * 0.7) * layer.harmonic + layer.offset * 1.5,
        )
        const wave = (primary * 0.7 + harmonic * 0.3) * layer.amp
        const influence = 0.5 + (1 - Math.abs(x - w / 2) / (w / 2)) * 0.5
        total += wave * influence
    }
    const avg = total / LAYERS.length
    return cy + avg
}

export function BackgroundWave() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let animId: number
        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resize()
        window.addEventListener("resize", resize)

        const notes: Note[] = []
        let nextSpawn = 0

        const loop = (rawTime: number) => {
            const time = rawTime / 1000
            const w = canvas.width
            const h = canvas.height
            const cy = h * 0.55

            ctx.clearRect(0, 0, w, h)

            // Draw wave layers
            for (const layer of LAYERS) {
                ctx.beginPath()
                for (let x = 0; x <= w; x += 2) {
                    const primary = Math.sin((x + time * layer.speed) * layer.freq + layer.offset)
                    const harmonic = Math.sin(
                        (x + time * layer.speed * 0.7) * layer.harmonic + layer.offset * 1.5,
                    )
                    const wave = (primary * 0.7 + harmonic * 0.3) * layer.amp
                    const influence = 0.5 + (1 - Math.abs(x - w / 2) / (w / 2)) * 0.5
                    const y = cy + wave * influence
                    if (x === 0) ctx.moveTo(x, y)
                    else ctx.lineTo(x, y)
                }
                ctx.strokeStyle = layer.color
                ctx.lineWidth = 2
                ctx.stroke()

                // Fill below
                ctx.beginPath()
                ctx.moveTo(0, h)
                for (let x = 0; x <= w; x += 2) {
                    const primary = Math.sin(
                        (x + time * layer.speed) * layer.freq + layer.offset + Math.PI,
                    )
                    const harmonic = Math.sin(
                        (x + time * layer.speed * 0.7) * layer.harmonic +
                            layer.offset * 1.5 +
                            Math.PI * 0.5,
                    )
                    const wave = (primary * 0.7 + harmonic * 0.3) * layer.amp
                    const influence = 0.5 + (1 - Math.abs(x - w / 2) / (w / 2)) * 0.5
                    const y = cy + wave * influence
                    ctx.lineTo(x, y)
                }
                ctx.lineTo(w, h)
                ctx.closePath()
                ctx.fillStyle = layer.color
                    .replace("0.10", "0.025")
                    .replace("0.07", "0.018")
                    .replace("0.05", "0.012")
                ctx.fill()
            }

            // Spawn notes
            if (time > nextSpawn) {
                nextSpawn = time + 0.3 + Math.random() * 0.4
                const x = 100 + Math.random() * (w - 200)
                const surfaceY = getWaveY(x, w, h, time)
                notes.push({
                    x,
                    y: surfaceY,
                    vy: -(250 + Math.random() * 200),
                    vx: -40 + Math.random() * 80,
                    char: NOTE_CHARS[Math.floor(Math.random() * NOTE_CHARS.length)],
                    size: 16 + Math.random() * 20,
                    opacity: 0.7 + Math.random() * 0.3,
                    life: 0,
                    rotation: -0.5 + Math.random(),
                    rotSpeed: -3 + Math.random() * 6,
                })
            }

            // Update and draw notes
            const dt = 1 / 60
            for (let i = notes.length - 1; i >= 0; i--) {
                const n = notes[i]
                n.life += dt
                n.x += n.vx * dt
                n.y += n.vy * dt
                n.vy += 600 * dt // gravity
                n.rotation += n.rotSpeed * dt

                const fadeOut = Math.max(0, 1 - n.life / 2.5)
                if (fadeOut <= 0 || n.y > h + 50) {
                    notes.splice(i, 1)
                    continue
                }

                ctx.save()
                ctx.translate(n.x, n.y)
                ctx.rotate(n.rotation)
                ctx.font = `${n.size}px serif`
                ctx.textAlign = "center"
                ctx.textBaseline = "middle"
                ctx.fillStyle = `rgba(239,68,68,${n.opacity * fadeOut * 0.7})`
                ctx.fillText(n.char, 0, 0)
                ctx.restore()
            }

            animId = requestAnimationFrame(loop)
        }
        animId = requestAnimationFrame(loop)

        return () => {
            cancelAnimationFrame(animId)
            window.removeEventListener("resize", resize)
        }
    }, [])

    return <canvas ref={canvasRef} className='pointer-events-none absolute inset-0' />
}
