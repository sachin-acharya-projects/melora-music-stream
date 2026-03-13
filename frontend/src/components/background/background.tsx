import { cn } from "@/lib/utils"

export default function Background() {
    return (
        <div className='fixed inset-0 -z-5000 flex items-center justify-center bg-white dark:bg-black'>
            {/* grid */}
            <div
                className={cn(
                    "absolute inset-0 transition-colors",
                    "bg-size-[40px_40px]",
                    "bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)]",
                    "dark:bg-[linear-gradient(to_right,#2f2f2f_1px,transparent_1px),linear-gradient(to_bottom,#2f2f2f_1px,transparent_1px)]",
                )}
            />

            {/* radial fade */}
            <div className='pointer-events-none absolute inset-0 flex items-center justify-center bg-white/90 mask-[radial-gradient(ellipse_at_center,transparent_20%,black)] dark:bg-black/80'></div>
        </div>
    )
}
