/**
 * Noctisium Animation System
 * Framer Motion variants and utilities for fluid UI
 */

import { Variants, Transition } from 'framer-motion';

// === TRANSITIONS ===

export const transitions = {
  fast: { duration: 0.1 } as Transition,
  normal: { duration: 0.2 } as Transition,
  slow: { duration: 0.3 } as Transition,
  spring: { type: 'spring', stiffness: 300, damping: 30 } as Transition,
  springBouncy: { type: 'spring', stiffness: 400, damping: 25 } as Transition,
  springSmooth: { type: 'spring', stiffness: 200, damping: 30 } as Transition,
} as const;

// === PAGE TRANSITIONS ===

export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export const pageSlideVariants: Variants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

// === CONTAINER VARIANTS (for staggered children) ===

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
};

export const staggerContainerSlow: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

// === ITEM VARIANTS (children of stagger containers) ===

export const fadeInUp: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export const fadeInDown: Variants = {
  initial: {
    opacity: 0,
    y: -10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export const fadeInLeft: Variants = {
  initial: {
    opacity: 0,
    x: -10,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export const fadeInRight: Variants = {
  initial: {
    opacity: 0,
    x: 10,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export const scaleIn: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export const scaleInSpring: Variants = {
  initial: {
    opacity: 0,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
};

// === CARD VARIANTS ===

export const cardHover = {
  rest: {
    scale: 1,
    borderColor: 'var(--border-default)',
    transition: { duration: 0.2 },
  },
  hover: {
    scale: 1.01,
    borderColor: 'var(--color-primary)',
    transition: { duration: 0.2 },
  },
};

export const cardTap = {
  scale: 0.99,
  transition: { duration: 0.1 },
};

// === BUTTON VARIANTS ===

export const buttonPress = {
  rest: { scale: 1 },
  pressed: { scale: 0.97 },
  hover: { scale: 1.02 },
};

export const buttonGlow = {
  rest: {
    boxShadow: '0 0 0px rgba(0, 240, 255, 0)',
  },
  hover: {
    boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)',
  },
};

// === PROGRESS BAR VARIANTS ===

export const progressFill: Variants = {
  initial: { width: 0 },
  animate: (width: number) => ({
    width: `${width}%`,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1],
      delay: 0.2,
    },
  }),
};

export const progressFillSpring: Variants = {
  initial: { width: 0 },
  animate: (width: number) => ({
    width: `${width}%`,
    transition: {
      type: 'spring',
      stiffness: 50,
      damping: 15,
      delay: 0.1,
    },
  }),
};

// === NUMBER COUNTER ===

export const counterVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

// === MODAL / OVERLAY VARIANTS ===

export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {
      duration: 0.2,
    },
  },
};

// === SIDEBAR / DRAWER VARIANTS ===

export const sidebarVariants: Variants = {
  initial: { x: -280, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    x: -280,
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

// === NOTIFICATION / TOAST VARIANTS ===

export const toastVariants: Variants = {
  initial: {
    opacity: 0,
    y: -20,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: {
      duration: 0.15,
    },
  },
};

// === LIST ITEM VARIANTS ===

export const listItemVariants: Variants = {
  initial: { opacity: 0, x: -10 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.2,
    },
  },
  exit: {
    opacity: 0,
    x: 10,
    transition: {
      duration: 0.15,
    },
  },
};

// === TAB INDICATOR ===

export const tabIndicatorVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 30,
    },
  },
};

// === SKELETON SHIMMER ===

export const shimmerVariants: Variants = {
  initial: { backgroundPosition: '-200% 0' },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      repeat: Infinity,
      duration: 2,
      ease: 'linear',
    },
  },
};

// === GLOW PULSE ===

export const glowPulse: Variants = {
  initial: {
    boxShadow: '0 0 0 rgba(0, 240, 255, 0)',
  },
  animate: {
    boxShadow: [
      '0 0 0 rgba(0, 240, 255, 0)',
      '0 0 20px rgba(0, 240, 255, 0.4)',
      '0 0 0 rgba(0, 240, 255, 0)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// === UTILITY FUNCTIONS ===

/**
 * Creates a stagger delay for list items
 */
export const staggerDelay = (index: number, baseDelay = 0.05) => ({
  delay: index * baseDelay,
});

/**
 * Creates custom spring transition
 */
export const customSpring = (
  stiffness = 300,
  damping = 30,
  mass = 1
): Transition => ({
  type: 'spring',
  stiffness,
  damping,
  mass,
});

/**
 * Creates custom tween transition
 */
export const customTween = (
  duration = 0.3,
  ease: [number, number, number, number] = [0.25, 0.1, 0.25, 1]
): Transition => ({
  duration,
  ease,
});
