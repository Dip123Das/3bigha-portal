import React from "react";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
};

export function SectionHeader({
  title,
  subtitle,
  eyebrow,
  right,
  children,
}: SectionHeaderProps) {
  return (
    <section className="ui-section-header">
      <div className="ui-section-header__copy">
        {eyebrow ? <div className="ui-section-header__eyebrow">{eyebrow}</div> : null}

        <h1 className="ui-section-header__title">{title}</h1>

        {subtitle ? <p className="ui-section-header__subtitle">{subtitle}</p> : null}

        {children ? <div className="ui-section-header__children">{children}</div> : null}
      </div>

      {right ? <div className="ui-section-header__actions">{right}</div> : null}
    </section>
  );
}
