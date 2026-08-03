import { useEffect, useState } from 'react';

export interface ReportSection {
  id: string;
  title: string;
}

export default function ReportNav({ sections }: { sections: ReportSection[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (sections.length === 0) return;

    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = elements.indexOf(entry.target as HTMLElement);
          if (index !== -1) setActiveIndex(index);
        });
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length === 0) return null;

  return (
    <nav className="sticky top-10 hidden h-[calc(100vh-5rem)] w-72 shrink-0 lg:block">
      <div className="relative flex h-full flex-col justify-around">
        <div className="absolute top-2 bottom-2 left-[15px] w-px bg-gray-200" />
        {sections.map((section, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() =>
                document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              className={`relative flex items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors ${
                isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
            >
              <span
                className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold transition-colors ${
                  isActive
                    ? 'border-black bg-black text-white'
                    : 'border-gray-300 bg-white text-gray-400'
                }`}
              >
                {i}
              </span>
              <span className={`text-lg font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                {section.title}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
