import { type ReactNode } from "react"

interface PageHeadingProps {
    title: ReactNode
    description: ReactNode
    className?: string
}

export function PageHeading({ title, description, className }: PageHeadingProps) {
    return (
        <div className={`flex items-center gap-3 ${className ?? ""}`.trim()}>
            <span aria-hidden='true' className='h-9 w-1 shrink-0 rounded-full bg-red-500' />
            <div className='min-w-0'>
                <h1 className='text-3xl font-bold tracking-tight text-gray-900 dark:text-white'>
                    {title}
                </h1>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>{description}</p>
            </div>
        </div>
    )
}
