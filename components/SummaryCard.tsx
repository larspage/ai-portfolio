interface SummaryCardProps {
  title: string;
  description: string;
  impact?: string;
  technologies?: string[];
  metrics?: string;
}

export default function SummaryCard({
  title,
  description,
  impact,
  technologies,
  metrics,
}: SummaryCardProps) {
  return (
    <div className="card animate-fade-in">
      <h3 className="text-xl font-semibold text-umber-900 mb-3">{title}</h3>
      <p className="text-sm text-slate-600 mb-4">{description}</p>

      {technologies && technologies.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {technologies.map((tech) => (
            <span
              key={tech}
              className="px-3 py-1 bg-gradient-to-r from-umber-100 to-umber-200 text-umber-800 text-sm rounded-full font-medium
                         hover:from-umber-200 hover:to-umber-300 transition-all duration-200 transform hover:scale-105"
            >
              {tech}
            </span>
          ))}
        </div>
      )}

      {(impact || metrics) && (
        <div className="pt-4 border-t border-slate-100">
          {impact && (
            <p className="text-sm text-slate-500">
              <span className="font-medium text-umber-700">Impact:</span> {impact}
            </p>
          )}
          {metrics && (
            <p className="text-sm text-slate-500">
              <span className="font-medium text-umber-700">Metrics:</span> {metrics}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
