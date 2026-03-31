import React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/* ---------------------------------- */
/* Shared props */
/* ---------------------------------- */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

type BaseProps = {
  children: React.ReactNode;
  className?: string;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

/* ---------------------------------- */
/* Button version */
/* ---------------------------------- */

type ButtonProps = BaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

/* ---------------------------------- */
/* Link version */
/* ---------------------------------- */

type LinkProps = BaseProps & {
  href: string;
  target?: string;
  rel?: string;
  onClick?: never;
  type?: never;
  disabled?: never;
};

/* ---------------------------------- */
/* Type guard */
/* ---------------------------------- */

function isLink(props: ButtonProps | LinkProps): props is LinkProps {
  return typeof (props as LinkProps).href === "string";
}

/* ---------------------------------- */
/* Component */
/* ---------------------------------- */

export function ActionButton(props: ButtonProps | LinkProps) {
  const {
    variant = "primary",
    size = "md",
    fullWidth,
    className,
    children,
    ...rest
  } = props;

  const classes = cn(
    "ui-btn",
    `ui-btn--${variant}`,
    `ui-btn--${size}`,
    fullWidth && "ui-btn--full",
    className
  );

  if (isLink(props)) {
    const { href, target, rel } = props;

    return (
      <Link href={href} className={classes} target={target} rel={rel}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
