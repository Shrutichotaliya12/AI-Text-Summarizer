import { Variants } from "framer-motion";

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

export const slideUp: Variants = {
  initial: { y: 15, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { y: 15, opacity: 0, transition: { duration: 0.2, ease: "easeIn" } }
};

export const sidebarTransition = {
  type: "spring",
  stiffness: 300,
  damping: 30
};
