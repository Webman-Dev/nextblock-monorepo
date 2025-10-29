export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-12 items-start mb-4">{children}</div>
  );
}
