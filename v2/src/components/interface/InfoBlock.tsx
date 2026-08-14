"use client";

import { AnimatePresence, motion, Variants } from "motion/react";
import { anim, physics } from "@/lib/transitions";

type InfoBlockVariant = "default" | "centered";

type InfoBlockProps = {
  title: string;
  number?: string | number;
  description: string;
  variant?: InfoBlockVariant;
  className?: string;
  onComplete?: () => void;
  children?: React.ReactNode;
};

export default function InfoBlock({
  title,
  number,
  description,
  variant = "default",
  className,
  onComplete,
  children,
}: InfoBlockProps) {
  const isCentered = variant === "centered";

  const mainContainerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.5,
      },
    },
  };

  const textContainerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03,
        when: "beforeChildren",
      },
    },
  };

  const animateText = (text: string) => {
    return text.split("").map((char, index) => (
      <motion.span
        key={`${char}-${index}`}
        variants={anim.upSnappy}
        style={{
          display: "inline-block",
          whiteSpace: char === " " ? "pre" : "normal",
        }}
      >
        {char}
      </motion.span>
    ));
  };

  return (
    <motion.div
      className={[
        "flex flex-col gap-6",
        isCentered
          ? "items-center text-center"
          : "items-center lg:items-start text-center lg:text-left",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      variants={mainContainerVariants}
      initial="hidden"
      animate="visible"
    >
      <div
        className={[
          "flex flex-col gap-2",
          isCentered
            ? "items-center text-center"
            : "items-center lg:items-start text-center lg:text-left",
        ].join(" ")}
      >
        <motion.div
          className={["h2 flex items-start", isCentered ? "gap-0" : "gap-2"].join(
            " ",
          )}
        >
          <motion.h1
            className={[
              "h2",
              !isCentered ? "whitespace-nowrap flex-shrink-0" : "",
            ].join(" ")}
            variants={textContainerVariants}
          >
            {animateText(title)}
          </motion.h1>

          {number !== undefined && (
            <motion.span
              className={[
                "h6 text-[var(--content-primary)]",
                !isCentered ? "whitespace-nowrap flex-shrink-0" : "",
              ].join(" ")}
              variants={anim.upSnappy}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={String(number)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={physics.snappy}
                  style={{ display: "inline-block" }}
                >
                  {number}
                </motion.span>
              </AnimatePresence>
            </motion.span>
          )}
        </motion.div>

        <motion.p
          className={[
            "text-[var(--content-secondary)]",
            isCentered
              ? "body-m-medium"
              : "body-m-medium max-w-[480px] lg:max-w-[335px]",
          ].join(" ")}
          variants={anim.upSnappy}
          onAnimationComplete={(definition) => {
            if (definition === "visible") {
              onComplete?.();
            }
          }}
        >
          {description}
        </motion.p>
      </div>

      {children && (
        <motion.div
          variants={anim.upSnappy}
          className="w-full flex justify-center lg:justify-start"
        >
          {children}
        </motion.div>
      )}
    </motion.div>
  );
}
