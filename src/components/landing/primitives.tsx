import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { useReveal } from '../../hooks/useReveal'

type SectionProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode
}

/** Consistent page gutter + max width. */
export function Container({ className = '', children, ...rest }: SectionProps) {
  return (
    <div
      className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

type RevealProps = {
  as?: ElementType
  className?: string
  delay?: number
  children: ReactNode
}

/** Fades + lifts its children into view once, respecting reduced-motion. */
export function Reveal({
  as: Tag = 'div',
  className = '',
  delay = 0,
  children,
}: RevealProps) {
  const { ref, visible } = useReveal()
  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'left',
}: {
  eyebrow?: string
  title: ReactNode
  intro?: ReactNode
  align?: 'left' | 'center'
}) {
  return (
    <div
      className={
        align === 'center'
          ? 'mx-auto max-w-2xl text-center'
          : 'max-w-2xl text-left'
      }
    >
      {eyebrow ? <p className="eyebrow mb-4">{eyebrow}</p> : null}
      <h2 className="text-3xl leading-[1.1] sm:text-4xl md:text-[2.75rem]">
        {title}
      </h2>
      {intro ? (
        <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
          {intro}
        </p>
      ) : null}
    </div>
  )
}
