// 책 한 페이지 모양의 카드 (로그인/회원가입 등에서 공통 사용)
export default function BookCard({
  chapter,
  title,
  subtitle,
  children,
}: {
  chapter: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="book-page max-w-md mx-auto px-8 sm:px-12 py-12">
      <p className="text-center text-xs tracking-[0.4em] text-sepia">{chapter}</p>
      <h1 className="font-title text-3xl font-extrabold text-center mt-2">{title}</h1>
      {subtitle && (
        <p className="text-center text-sm text-ink-soft italic mt-2">{subtitle}</p>
      )}
      <div className="ornament my-6">❦</div>
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink-soft tracking-wider">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-soft/80 mt-1">{hint}</span>}
    </label>
  );
}

export function Notice({ kind, children }: { kind: "error" | "info"; children: React.ReactNode }) {
  const styles =
    kind === "error"
      ? "border-goguma text-goguma bg-goguma/5"
      : "border-sepia text-sepia bg-sepia/5";
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`border-l-4 px-3 py-2 text-sm ${styles}`}>
      {children}
    </p>
  );
}
