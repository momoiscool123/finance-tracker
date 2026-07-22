export default function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`ft-panel ${className}`}>
      <header className="ft-panel__head">
        <div>
          <h2 className="ft-panel__title">{title}</h2>
          <p className="ft-panel__subtitle">{subtitle}</p>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
