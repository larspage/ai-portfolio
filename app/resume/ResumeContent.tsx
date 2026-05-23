'use client';

export default function ResumeContent({ html }: { html: string }) {
  return (
    <div
      className="resume-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
