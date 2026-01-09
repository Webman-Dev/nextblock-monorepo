'use client';

import Link from 'next/link';

interface CtaWidgetRendererProps {
  text: string;
  url: string;
  style: 'primary' | 'secondary';
  size: 'fit-content' | 'full-width';
  textAlign: 'left' | 'center' | 'right';
}

const CtaWidgetRenderer = ({ text, url, style, size, textAlign }: CtaWidgetRendererProps) => {
  const buttonClasses: { [key: string]: string } = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  };

  const sizeClasses: { [key: string]: string } = {
    'fit-content': 'w-auto',
    'full-width': 'w-full',
  };


  const textAlignClasses: { [key: string]: string } = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className={`p-2 ${textAlignClasses[textAlign] || textAlignClasses.left}`}>
      <Link href={url} className={`inline-block px-4 py-2 rounded-md ${buttonClasses[style]} ${sizeClasses[size] || sizeClasses['fit-content']}`}>
        {text}
      </Link>
    </div>
  );
};

export default CtaWidgetRenderer;