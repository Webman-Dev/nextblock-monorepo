import React from 'react';

interface TiptapNode {
  type: string;
  content?: TiptapNode[];
  text?: string;
  marks?: { type: string; attrs?: any }[];
  attrs?: any;
}

interface SimpleTiptapRendererProps {
  content: any;
  className?: string;
}

const renderNode = (node: TiptapNode, index: number): React.ReactNode => {
  if (node.type === 'text') {
    let element: React.ReactNode = node.text;
    if (node.marks) {
      node.marks.forEach(mark => {
        if (mark.type === 'bold') element = <strong key={mark.type}>{element}</strong>;
        if (mark.type === 'italic') element = <em key={mark.type}>{element}</em>;
        if (mark.type === 'u') element = <u key={mark.type}>{element}</u>; // 'underline' sometimes 'u'
        if (mark.type === 'underline') element = <u key={mark.type}>{element}</u>;
      });
    }
    return <React.Fragment key={index}>{element}</React.Fragment>;
  }

  const children = node.content ? node.content.map((child, i) => renderNode(child, i)) : null;

  switch (node.type) {
    case 'doc':
      return <div key={index}>{children}</div>;
    case 'paragraph':
      return <p key={index} className="mb-4">{children}</p>;
    case 'heading': {
      const level = node.attrs?.level || 1;
      const Tag = `h${level}` as any; 
      // Using any for the Tag to bypass strict IntrinsicElement checks for dynamic tag
      return <Tag key={index} className="font-bold my-4">{children}</Tag>;
    }
    case 'bulletList':
      return <ul key={index} className="list-disc pl-5 mb-4">{children}</ul>;
    case 'orderedList':
      return <ol key={index} className="list-decimal pl-5 mb-4">{children}</ol>;
    case 'listItem':
      return <li key={index}>{children}</li>;
    case 'blockquote':
      return <blockquote key={index} className="border-l-4 pl-4 italic my-4">{children}</blockquote>;
    default:
      return <div key={index}>{children}</div>;
  }
};

export const SimpleTiptapRenderer: React.FC<SimpleTiptapRendererProps> = ({ content, className }) => {
  if (!content || !content.content) return null;
  return <div className={className}>{content.content.map((node: TiptapNode, i: number) => renderNode(node, i))}</div>;
};
