interface SkillBadgeProps {
  skill: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

export default function SkillBadge({ skill, variant = 'primary' }: SkillBadgeProps) {
  const variants = {
    primary: 'bg-gradient-to-r from-umber-700 to-umber-900 text-white hover:from-umber-800 hover:to-umber-950',
    secondary: 'bg-gradient-to-r from-umber-100 to-umber-200 text-umber-800 hover:from-umber-200 hover:to-umber-300',
    outline: 'bg-white text-umber-900 border-2 border-umber-300 hover:border-umber-400 hover:bg-umber-50',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-105 ${variants[variant]}`}
    >
      {skill}
    </span>
  );
}
