import ArchivePage from "@/app/_components/archive-page";

type PageProps = {
  params: Promise<{ page: string }>;
};

export default async function PageArchive({ params }: PageProps) {
  const { page } = await params;
  const pageNumber = Number(page);
  return <ArchivePage pageNumber={pageNumber} />;
}
