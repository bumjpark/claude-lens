export default function SectionHeader({
  id,
  index,
  title,
  subtitle,
}: {
  id?: string;
  index: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div id={id} className="mb-5 flex scroll-mt-24 items-center gap-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-lg font-bold text-white">
        {index}
      </span>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="text-base text-gray-400">{subtitle}</p>
      </div>
    </div>
  );
}
