import CmsClientLayout from "./CmsClientLayout";

export default function CmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CmsClientLayout>{children}</CmsClientLayout>;
}