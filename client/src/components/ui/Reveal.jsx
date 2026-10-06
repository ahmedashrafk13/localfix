import { m, useReducedMotion } from 'motion/react';

/** Gentle fade-up when a section scrolls into view. Static when the user prefers reduced motion. */
export function Reveal({ children, delay = 0, className = '', as = 'div', y = 24 }) {
  const reduce = useReducedMotion();
  const Tag = m[as] || m.div;
  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  );
}
