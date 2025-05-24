// components/ui/typing-animation.tsx
"use client"

import { useEffect, useState } from "react"

interface TypingAnimationProps {
  dots?: number
  speed?: number
}

export function TypingAnimation({ 
  dots = 3, 
  speed = 500 
}: TypingAnimationProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => (prev + 1) % (dots + 1))
    }, speed)

    return () => clearInterval(interval)
  }, [dots, speed])

  return (
    <span className="inline-flex items-center text-blue-600">
      Thinking
      {Array(count).fill(".").map((dot, i) => (
        <span key={i} className="ml-0.5">{dot}</span>
      ))}
      <span className="inline-block w-4"></span>
    </span>
  )
}